// @ts-nocheck
"use client";

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { format, startOfMonth, startOfWeek, isSameDay, parseISO, addDays, addMonths, addWeeks } from 'date-fns';
import { ChevronLeft, ChevronRight, Clock, Trash2, Loader2, Video, MapPin, Phone, Mail, PlusCircle, Search, SlidersHorizontal, X, CalendarDays } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { useToast } from '@/hooks/use-toast';
import { cn } from "@/lib/utils";
import supabase from '@/utils/supabaseClient';

// ── TYPES ────────────────────────────────────────────────────────
interface Meeting {
  id_main: number;
  meeting_date: string;
  meeting_start_time: string;
  meeting_end_time: string;
  meeting_duration?: number;
  client_name: string;
  client_company: string;
  client_email?: string;
  client_mobile?: string;
  meeting_type: 'virtual' | 'physical';
  meeting_venue_area: string;
  meeting_venue?: string;
  meeting_agenda: string;
  bcl_attendee: string;
  bcl_attendee_mobile?: string;
  status?: string;
  badge_status?: string;
}

type ViewType = 'month' | 'week' | 'day';

// ── STATUS COLOR SYSTEM ──────────────────────────────────────────
const STATUS_STYLES: Record<string, { pill: string; dot: string; event: string }> = {
  confirmed: { pill: 'bg-green-50 text-green-700 border-green-200 dark:bg-green-500/10 dark:text-green-400 dark:border-green-500/20', dot: 'bg-green-500', event: 'bg-green-50 text-green-800 border-l-[3px] border-green-500 dark:bg-green-500/10 dark:text-green-300 dark:border-green-500/50' },
  scheduled: { pill: 'bg-zinc-100 text-zinc-700 border-zinc-200 dark:bg-white/10 dark:text-zinc-300 dark:border-white/10', dot: 'bg-zinc-500 dark:bg-zinc-400', event: 'bg-zinc-50 text-zinc-800 border-l-[3px] border-zinc-400 dark:bg-white/5 dark:text-zinc-300 dark:border-zinc-500' },
  pending: { pill: 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-500/10 dark:text-amber-400 dark:border-amber-500/20', dot: 'bg-amber-400', event: 'bg-amber-50 text-amber-800 border-l-[3px] border-amber-400 dark:bg-amber-500/10 dark:text-amber-300 dark:border-amber-500/50' },
  completed: { pill: 'bg-zinc-100 text-zinc-500 border-zinc-200 dark:bg-white/5 dark:text-zinc-400 dark:border-white/10', dot: 'bg-zinc-400', event: 'bg-zinc-50/50 text-zinc-500 border-l-[3px] border-zinc-300 dark:bg-white/5 dark:text-zinc-400 dark:border-zinc-700' },
  cancelled: { pill: 'bg-red-50 text-red-700 border-red-200 dark:bg-red-500/10 dark:text-red-400 dark:border-red-500/20', dot: 'bg-red-500', event: 'bg-red-50 text-red-800 border-l-[3px] border-red-500 dark:bg-red-500/10 dark:text-red-300 dark:border-red-500/50' },
  virtual: { pill: 'bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-500/10 dark:text-indigo-400 dark:border-indigo-500/20', dot: 'bg-indigo-500', event: 'bg-indigo-50 text-indigo-800 border-l-[3px] border-indigo-400 dark:bg-indigo-500/10 dark:text-indigo-300 dark:border-indigo-500/50' },
};

const getStatusStyle = (status?: string) => {
  const key = (status || 'scheduled').toLowerCase();
  return STATUS_STYLES[key] ?? STATUS_STYLES.scheduled;
};

const getMeetingEventStyle = (m: Meeting) => {
  if (m.status) {
    const s = getStatusStyle(m.status);
    if (s) return s.event;
  }
  return m.meeting_type === 'virtual'
    ? STATUS_STYLES.virtual.event
    : STATUS_STYLES.scheduled.event;
};

// ── CONSTANTS ────────────────────────────────────────────────────
const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const TIME_SLOTS = Array.from({ length: 14 }, (_, i) => `${(i + 7).toString().padStart(2, '0')}:00`);

// ── COMPONENT ────────────────────────────────────────────────────
const CalendarView = () => {
  const { toast } = useToast();
  const [currentDate, setCurrentDate] = useState<Date>(new Date());
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [allMeetings, setAllMeetings] = useState<Meeting[]>([]);
  const [meetingsForSelectedDate, setMeetingsForSelectedDate] = useState<Meeting[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedMeeting, setSelectedMeeting] = useState<Meeting | null>(null);
  const [deletingMeeting, setDeletingMeeting] = useState<Meeting | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [view, setView] = useState<ViewType>('month');
  const [filter, setFilter] = useState<'mine' | 'all'>('mine');

  const safeFormatDate = (dateStr: string, fmt: string) => {
    try { return format(parseISO(dateStr), fmt); } catch { return dateStr; }
  };

  const handlePrevious = () => {
    if (view === 'month') setCurrentDate(addMonths(currentDate, -1));
    else if (view === 'week') setCurrentDate(addWeeks(currentDate, -1));
    else setCurrentDate(addDays(currentDate, -1));
  };

  const handleNext = () => {
    if (view === 'month') setCurrentDate(addMonths(currentDate, 1));
    else if (view === 'week') setCurrentDate(addWeeks(currentDate, 1));
    else setCurrentDate(addDays(currentDate, 1));
  };

  const filterAndSortMeetingsForSelectedDate = useCallback((meetings: Meeting[], date: Date) => {
    const dateString = format(date, 'yyyy-MM-dd');
    const filtered = meetings
      .filter(m => m.meeting_date === dateString)
      .sort((a, b) => a.meeting_start_time.localeCompare(b.meeting_start_time));
    setMeetingsForSelectedDate(filtered);
  }, []);

  const fetchMeetings = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('bcl_meetings_meetings')
        .select('*')
        .order('meeting_date', { ascending: true })
        .order('meeting_start_time', { ascending: true });
      if (error) throw error;
      if (data) {
        setAllMeetings(data as Meeting[]);
        filterAndSortMeetingsForSelectedDate(data as Meeting[], selectedDate);
      }
    } catch (error: any) {
      toast({ title: "Error fetching meetings", description: error.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }, [toast, selectedDate, filterAndSortMeetingsForSelectedDate]);

  const deleteMeeting = async () => {
    if (!deletingMeeting) return;
    setIsDeleting(true);
    try {
      const { error } = await supabase.from('bcl_meetings_meetings').delete().eq('id_main', deletingMeeting.id_main);
      if (error) throw error;
      setAllMeetings(prev => prev.filter(m => m.id_main !== deletingMeeting.id_main));
      setMeetingsForSelectedDate(prev => prev.filter(m => m.id_main !== deletingMeeting.id_main));
      setSelectedMeeting(null);
      setDeletingMeeting(null);
      toast({ title: "Meeting Deleted", description: `Booking for ${deletingMeeting.client_name} removed.` });
    } catch (error: any) {
      toast({ title: "Error Deleting", description: error.message, variant: "destructive" });
    } finally {
      setIsDeleting(false);
    }
  };

  const todayMeetings = useMemo(() => {
    const today = format(new Date(), 'yyyy-MM-dd');
    return allMeetings.filter(m => m.meeting_date === today);
  }, [allMeetings]);

  const calendarDays = useMemo(() => {
    const monthStart = startOfMonth(currentDate);
    const calStart = startOfWeek(monthStart, { weekStartsOn: 0 });
    return Array.from({ length: 42 }, (_, i) => addDays(calStart, i));
  }, [currentDate]);

  const weekDays = useMemo(() => {
    const weekStart = startOfWeek(currentDate, { weekStartsOn: 0 });
    return Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
  }, [currentDate]);

  useEffect(() => {
    fetchMeetings();
    const channel = supabase
      .channel('meeting-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'bcl_meetings_meetings' }, () => fetchMeetings())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [fetchMeetings]);

  useEffect(() => {
    if (allMeetings.length > 0) filterAndSortMeetingsForSelectedDate(allMeetings, selectedDate);
    else setMeetingsForSelectedDate([]);
  }, [selectedDate, allMeetings, filterAndSortMeetingsForSelectedDate]);

  // ── MONTH VIEW ──────────────────────────────────────────────────
  const renderMonthView = () => (
    <div className="grid grid-cols-7 h-full" style={{ gridAutoRows: 'minmax(130px, 1fr)' }}>
      {calendarDays.map((day, idx) => {
        const dateStr = format(day, 'yyyy-MM-dd');
        const dayMeetings = allMeetings.filter(m => m.meeting_date === dateStr);
        const isCurrentMonth = day.getMonth() === currentDate.getMonth();
        const isToday = isSameDay(day, new Date());
        const isSelected = isSameDay(day, selectedDate);
        const isWeekend = idx % 7 === 0 || idx % 7 === 6;

        return (
          <div
            key={idx}
            onClick={() => setSelectedDate(day)}
            className={cn(
              "border-r border-b border-zinc-200 dark:border-white/10 p-2 sm:p-3 cursor-pointer transition-colors group relative",
              idx % 7 === 6 && "border-r-0",
              !isCurrentMonth && "bg-zinc-50/50 dark:bg-white/[0.02]",
              isWeekend && isCurrentMonth && "bg-zinc-50/30 dark:bg-white/[0.01]",
              isSelected && !isToday && "bg-zinc-100/50 dark:bg-white/5 ring-1 ring-inset ring-zinc-200 dark:ring-white/10",
              isToday && "bg-zinc-100/80 dark:bg-white/10",
              "hover:bg-zinc-50 dark:hover:bg-white/5"
            )}
          >
            {/* Date number */}
            <div className="flex items-start justify-between mb-2">
              <span className={cn(
                "h-7 w-7 flex items-center justify-center rounded-full text-xs font-semibold transition-colors",
                isToday && "bg-zinc-900 text-white dark:bg-white dark:text-zinc-900 shadow-sm",
                !isToday && isCurrentMonth && !isWeekend && "text-zinc-900 dark:text-zinc-100 group-hover:bg-zinc-200/50 dark:group-hover:bg-white/10",
                !isToday && isCurrentMonth && isWeekend && "text-zinc-500 dark:text-zinc-400 group-hover:bg-zinc-200/50 dark:group-hover:bg-white/10",
                !isCurrentMonth && "text-zinc-300 dark:text-zinc-600"
              )}>
                {format(day, 'd')}
              </span>
              {dayMeetings.length > 0 && isCurrentMonth && (
                <span className="text-[10px] font-medium text-zinc-400 dark:text-zinc-500 mt-1">{dayMeetings.length}</span>
              )}
            </div>

            {/* Meetings */}
            <div className="space-y-1">
              {dayMeetings.slice(0, 3).map(m => (
                <div
                  key={m.id_main}
                  onClick={(e) => { e.stopPropagation(); setSelectedMeeting(m); }}
                  className={cn(
                    "flex items-center gap-1.5 px-2 py-1 rounded-md text-[10px] font-medium cursor-pointer hover:opacity-80 transition-opacity truncate",
                    getMeetingEventStyle(m)
                  )}
                >
                  <span className="font-semibold shrink-0 opacity-80">{m.meeting_start_time}</span>
                  <span className="truncate">{m.client_name}</span>
                </div>
              ))}
              {dayMeetings.length > 3 && (
                <button
                  onClick={(e) => { e.stopPropagation(); setSelectedDate(day); }}
                  className="text-[10px] text-zinc-500 dark:text-zinc-400 font-medium px-2 hover:text-zinc-900 dark:hover:text-white transition-colors"
                >
                  +{dayMeetings.length - 3} more
                </button>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );

  // ── WEEK VIEW ───────────────────────────────────────────────────
  const renderWeekView = () => (
    <div className="flex h-full min-h-0">
      {/* Time axis */}
      <div className="w-16 shrink-0 border-r border-zinc-200 dark:border-white/10 bg-white dark:bg-zinc-950">
        <div className="h-12 border-b border-zinc-200 dark:border-white/10" />
        {TIME_SLOTS.map(time => (
          <div key={time} className="h-20 border-b border-zinc-200 dark:border-white/10 flex items-start justify-end pr-3 pt-1.5">
            <span className="text-[10px] font-medium text-zinc-400 dark:text-zinc-500">{time}</span>
          </div>
        ))}
      </div>

      {/* Day columns */}
      <div className="flex flex-1 overflow-x-auto relative">
        {weekDays.map(day => {
          const isToday = isSameDay(day, new Date());
          const dayMeetings = allMeetings.filter(m => m.meeting_date === format(day, 'yyyy-MM-dd'));
          return (
            <div key={day.toString()} className="flex-1 min-w-[120px] border-r border-zinc-200 dark:border-white/10 last:border-r-0 flex flex-col">
              {/* Day header */}
              <div className={cn(
                "h-12 px-3 flex flex-col items-center justify-center border-b border-zinc-200 dark:border-white/10 shrink-0 sticky top-0 z-10",
                isToday ? "bg-zinc-50 dark:bg-white/5" : "bg-white dark:bg-zinc-950"
              )}>
                <p className={cn("text-[10px] font-medium uppercase tracking-wider", isToday ? "text-zinc-900 dark:text-white" : "text-zinc-500 dark:text-zinc-400")}>
                  {format(day, 'EEE')}
                </p>
                <p className={cn("text-sm font-semibold leading-none mt-0.5", isToday ? "text-zinc-900 dark:text-white" : "text-zinc-700 dark:text-zinc-300")}>
                  {format(day, 'd')}
                </p>
              </div>

              {/* Time slots */}
              <div className="relative flex-1">
                {TIME_SLOTS.map((_, i) => (
                  <div key={i} className={cn("h-20 border-b border-zinc-200 dark:border-white/10", i % 2 === 0 ? "bg-white dark:bg-zinc-950" : "bg-zinc-50/50 dark:bg-white/[0.02]")} />
                ))}
                {/* Meetings */}
                {dayMeetings.map(m => {
                  const startHour = parseInt(m.meeting_start_time.split(':')[0]);
                  const startMin = parseInt(m.meeting_start_time.split(':')[1]);
                  const top = (startHour - 7) * 80 + (startMin / 60) * 80;
                  return (
                    <div
                      key={m.id_main}
                      onClick={() => setSelectedMeeting(m)}
                      className={cn("absolute left-1 right-1 p-2 rounded-md text-[10px] font-medium cursor-pointer hover:opacity-90 transition-opacity overflow-hidden", getMeetingEventStyle(m))}
                      style={{ top: `${top}px`, minHeight: '36px' }}
                    >
                      <p className="font-semibold truncate">{m.meeting_start_time} – {m.meeting_end_time}</p>
                      <p className="truncate mt-0.5 opacity-80">{m.client_name}</p>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );

  // ── DAY VIEW ────────────────────────────────────────────────────
  const renderDayView = () => {
    const dayMeetings = allMeetings.filter(m => m.meeting_date === format(currentDate, 'yyyy-MM-dd'));
    return (
      <div className="flex h-full min-h-0">
        {/* Time axis */}
        <div className="w-16 shrink-0 border-r border-zinc-200 dark:border-white/10 bg-white dark:bg-zinc-950">
          <div className="h-14 border-b border-zinc-200 dark:border-white/10" />
          {TIME_SLOTS.map(time => (
            <div key={time} className="h-20 border-b border-zinc-200 dark:border-white/10 flex items-start justify-end pr-3 pt-1.5">
              <span className="text-[10px] font-medium text-zinc-400 dark:text-zinc-500">{time}</span>
            </div>
          ))}
        </div>

        {/* Day column */}
        <div className="flex-1 flex flex-col min-w-0">
          {/* Header */}
          <div className="h-14 px-6 flex items-center gap-4 border-b border-zinc-200 dark:border-white/10 bg-white dark:bg-zinc-950 shrink-0">
            <div>
              <p className="text-xs font-medium text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">{format(currentDate, 'EEEE')}</p>
              <p className="text-base font-semibold text-zinc-900 dark:text-zinc-100 leading-none mt-0.5">{format(currentDate, 'MMMM d, yyyy')}</p>
            </div>
            {dayMeetings.length > 0 && (
              <span className="ml-auto px-2.5 py-1 rounded-full bg-zinc-100 dark:bg-white/10 text-zinc-600 dark:text-zinc-300 text-[11px] font-medium border border-zinc-200 dark:border-white/10">
                {dayMeetings.length} {dayMeetings.length === 1 ? 'meeting' : 'meetings'}
              </span>
            )}
          </div>

          {/* Time grid */}
          <div className="flex-1 overflow-y-auto relative">
            {TIME_SLOTS.map((_, i) => (
              <div key={i} className={cn("h-20 border-b border-zinc-200 dark:border-white/10", i % 2 === 0 ? "bg-white dark:bg-zinc-950" : "bg-zinc-50/50 dark:bg-white/[0.02]")} />
            ))}

            {/* Meeting cards */}
            {dayMeetings.map(m => {
              const startHour = parseInt(m.meeting_start_time.split(':')[0]);
              const startMin = parseInt(m.meeting_start_time.split(':')[1]);
              const endHour = parseInt(m.meeting_end_time.split(':')[0]);
              const endMin = parseInt(m.meeting_end_time.split(':')[1]);
              const top = (startHour - 7) * 80 + (startMin / 60) * 80;
              const height = Math.max(((endHour * 60 + endMin) - (startHour * 60 + startMin)) / 60 * 80, 44);
              const style = getStatusStyle(m.status);

              return (
                <div
                  key={m.id_main}
                  onClick={() => setSelectedMeeting(m)}
                  className={cn("absolute left-4 right-4 rounded-lg cursor-pointer hover:opacity-90 transition-opacity overflow-hidden flex gap-3 p-3 shadow-sm", getMeetingEventStyle(m))}
                  style={{ top: `${top}px`, height: `${height}px` }}
                >
                  <div className="flex flex-col justify-between flex-1 min-w-0">
                    <div>
                      <p className="text-xs font-semibold truncate">{m.client_name}</p>
                      <p className="text-[10px] opacity-70 truncate">{m.client_company}</p>
                    </div>
                    <div className="flex items-center gap-1.5 mt-1">
                      <Clock className="h-3 w-3 opacity-60 shrink-0" />
                      <span className="text-[10px] font-medium">{m.meeting_start_time} – {m.meeting_end_time}</span>
                    </div>
                  </div>
                  <div className="shrink-0 flex flex-col items-end justify-between">
                    <span className={cn("px-2 py-0.5 rounded-full text-[9px] font-medium border", style.pill)}>
                      {m.status || 'Scheduled'}
                    </span>
                    {m.meeting_type === 'virtual' && <Video className="h-3 w-3 opacity-50" />}
                  </div>
                </div>
              );
            })}

            {dayMeetings.length === 0 && (
              <div className="absolute inset-0 flex flex-col items-center justify-center text-zinc-400 dark:text-zinc-600 pointer-events-none">
                <CalendarDays className="h-10 w-10 mb-2 opacity-50" />
                <p className="text-sm font-medium">No meetings scheduled</p>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  // ── RENDER ──────────────────────────────────────────────────────
  return (
    <div className="flex flex-col h-[calc(100vh-64px)] bg-white dark:bg-zinc-950 overflow-hidden">

      {/* ── TOP BAR ── */}
      <div className="h-14 flex items-center px-4 sm:px-6 gap-3 shrink-0 z-10 border-b border-zinc-200 dark:border-white/10 bg-white/80 dark:bg-zinc-950/80 backdrop-blur-md">

        {/* Filter toggle */}
        <div className="hidden sm:flex items-center bg-zinc-100 dark:bg-zinc-900/50 rounded-lg p-0.5 border border-zinc-200 dark:border-white/10">
          {(['mine', 'all'] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={cn(
                "px-3 py-1.5 text-xs font-medium rounded-md transition-all capitalize",
                filter === f ? "bg-white dark:bg-zinc-800 shadow-sm text-zinc-900 dark:text-white" : "text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-200"
              )}
            >
              {f === 'mine' ? 'My Meetings' : 'All'}
            </button>
          ))}
        </div>

        {/* Date navigation */}
        <div className="flex items-center gap-1.5 ml-0 sm:ml-2">
          <Button
            variant="outline" size="sm"
            onClick={() => { setCurrentDate(new Date()); setSelectedDate(new Date()); }}
            className="h-8 px-3 text-xs font-medium rounded-md border-zinc-200 dark:border-white/10 text-zinc-700 dark:text-zinc-300"
          >Today</Button>
          <button onClick={handlePrevious} className="h-8 w-8 flex items-center justify-center rounded-md hover:bg-zinc-100 dark:hover:bg-white/10 text-zinc-500 dark:text-zinc-400 transition-colors border border-transparent">
            <ChevronLeft className="h-4 w-4" />
          </button>
          <button onClick={handleNext} className="h-8 w-8 flex items-center justify-center rounded-md hover:bg-zinc-100 dark:hover:bg-white/10 text-zinc-500 dark:text-zinc-400 transition-colors border border-transparent">
            <ChevronRight className="h-4 w-4" />
          </button>
          <span className="text-sm font-semibold text-zinc-900 dark:text-white ml-2 min-w-[120px]">
            {format(currentDate, view === 'month' ? 'MMMM yyyy' : view === 'week' ? "'Week of' MMM d" : 'MMMM d, yyyy')}
          </span>
        </div>

        <div className="flex-1" />

        {/* Actions */}
        <div className="flex items-center gap-1.5 sm:gap-2">
          <div className="hidden sm:flex items-center bg-zinc-100 dark:bg-zinc-900/50 rounded-lg p-0.5 border border-zinc-200 dark:border-white/10">
            {(['month', 'week', 'day'] as ViewType[]).map(v => (
              <button
                key={v}
                onClick={() => setView(v)}
                className={cn("px-3 py-1.5 text-[11px] font-medium rounded-md capitalize transition-all", view === v ? "bg-white dark:bg-zinc-800 shadow-sm text-zinc-900 dark:text-white" : "text-zinc-500 dark:text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200")}
              >{v}</button>
            ))}
          </div>
          <div className="hidden sm:block w-px h-5 bg-zinc-200 dark:bg-white/10 mx-1" />
          <Button className="h-8 px-3 text-xs font-medium rounded-md bg-zinc-900 dark:bg-white hover:bg-zinc-800 dark:hover:bg-zinc-200 text-white dark:text-zinc-900 gap-1.5 shadow-sm">
            <PlusCircle className="h-3.5 w-3.5" /> <span className="hidden sm:inline">Add Meeting</span>
          </Button>
        </div>
      </div>

      {/* ── BODY ── */}
      <div className="flex flex-1 min-h-0 overflow-hidden">

        {/* ── LEFT SIDEBAR ── */}
        <div className="hidden xl:flex w-[260px] shrink-0 bg-zinc-50/50 dark:bg-zinc-950/50 border-r border-zinc-200 dark:border-white/10 flex-col overflow-hidden">

          {/* Mini Calendar */}
          <div className="p-4 border-b border-zinc-200 dark:border-white/10">
            <Calendar
              mode="single"
              selected={selectedDate}
              onSelect={(date) => { if (date) { setSelectedDate(date); setCurrentDate(date); } }}
              month={currentDate}
              onMonthChange={setCurrentDate}
              className="p-0 border-0 shadow-none bg-transparent dark:bg-transparent"
              classNames={{
                months: "w-full",
                month: "w-full space-y-2",
                caption: "flex justify-between pt-1 relative items-center mb-2",
                caption_label: "text-xs font-semibold text-zinc-900 dark:text-zinc-100",
                nav: "space-x-1 flex items-center",
                nav_button: "h-6 w-6 bg-transparent p-0 flex items-center justify-center text-zinc-500 hover:text-zinc-900 hover:bg-zinc-200/50 dark:text-zinc-400 dark:hover:text-white dark:hover:bg-white/10 rounded-md transition-colors",
                nav_button_previous: "relative",
                nav_button_next: "relative",
                table: "w-full border-collapse",
                head_row: "grid grid-cols-7 w-full mb-1",
                head_cell: "text-[10px] font-medium text-zinc-400 dark:text-zinc-500 uppercase text-center",
                row: "grid grid-cols-7 w-full mt-0.5",
                cell: "flex items-center justify-center p-0",
                day: "h-7 w-7 p-0 text-xs font-medium text-zinc-700 dark:text-zinc-300 rounded-md hover:bg-zinc-200/50 dark:hover:bg-white/10 mx-auto transition-colors aria-selected:opacity-100",
                day_selected: "bg-zinc-900 text-white hover:bg-zinc-800 hover:text-white focus:bg-zinc-900 focus:text-white dark:bg-white dark:text-zinc-900 dark:hover:bg-zinc-200 shadow-sm",
                day_today: "bg-zinc-100 dark:bg-white/10 text-zinc-900 dark:text-white font-semibold",
                day_outside: "text-zinc-300 dark:text-zinc-700 opacity-50",
                day_disabled: "text-zinc-300 dark:text-zinc-700 opacity-40",
              }}
            />
          </div>

          {/* Meetings Today */}
          <div className="flex-1 overflow-y-auto">
            <div className="px-4 py-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-[10px] font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
                  Today's Schedule
                </h3>
                {todayMeetings.length > 0 && (
                  <span className="h-4 w-4 rounded-full bg-zinc-200 dark:bg-white/10 text-zinc-700 dark:text-zinc-300 text-[9px] font-semibold flex items-center justify-center">
                    {todayMeetings.length}
                  </span>
                )}
              </div>

              {loading ? (
                <div className="flex items-center gap-2 text-zinc-400 dark:text-zinc-500 mt-4 justify-center">
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  <span className="text-xs">Loading…</span>
                </div>
              ) : todayMeetings.length > 0 ? (
                <div className="space-y-1.5">
                  {todayMeetings.map(m => {
                    const style = getStatusStyle(m.status);
                    return (
                      <div
                        key={m.id_main}
                        onClick={() => setSelectedMeeting(m)}
                        className="group flex items-start gap-2.5 p-2.5 rounded-md border border-zinc-200 dark:border-white/10 bg-white dark:bg-zinc-900 hover:border-zinc-300 dark:hover:border-white/20 cursor-pointer transition-all shadow-sm"
                      >
                        <span className={cn("mt-1.5 h-1.5 w-1.5 rounded-full shrink-0", style.dot)} />
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-semibold text-zinc-900 dark:text-zinc-100 truncate leading-snug">{m.client_name}</p>
                          <div className="flex items-center gap-1.5 mt-0.5">
                            <Clock className="h-2.5 w-2.5 text-zinc-400 dark:text-zinc-500 shrink-0" />
                            <span className="text-[10px] text-zinc-500 dark:text-zinc-400 font-medium">{m.meeting_start_time} – {m.meeting_end_time}</span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-8 text-center border border-dashed border-zinc-200 dark:border-white/10 rounded-lg bg-zinc-50/50 dark:bg-white/[0.02]">
                  <p className="text-xs text-zinc-500 dark:text-zinc-400 font-medium">No meetings today</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* ── CALENDAR + DETAIL PANEL ── */}
        <div className="flex flex-1 min-w-0 overflow-hidden">

          {/* ── CALENDAR AREA ── */}
          <div className="flex-1 flex flex-col min-w-0 overflow-hidden bg-white dark:bg-zinc-950">

            {/* Day column headers — view-aware */}
            {view !== 'day' && (
              <div className="grid grid-cols-7 border-b border-zinc-200 dark:border-white/10 shrink-0 bg-white dark:bg-zinc-950">
                {view === 'month'
                  ? DAY_NAMES.map((name, i) => {
                    const isWeekend = i === 0 || i === 6;
                    return (
                      <div
                        key={name}
                        className={cn(
                          "py-2 px-2 border-r border-zinc-200 dark:border-white/10 last:border-r-0 text-center select-none",
                          isWeekend ? "bg-zinc-50/50 dark:bg-white/[0.02]" : "bg-white dark:bg-zinc-950"
                        )}
                      >
                        <p className={cn("text-[10px] font-semibold uppercase tracking-wider", isWeekend ? "text-zinc-400 dark:text-zinc-500" : "text-zinc-500 dark:text-zinc-400")}>
                          {name}
                        </p>
                      </div>
                    );
                  })
                  : weekDays.map((day, i) => {
                    const isToday = isSameDay(day, new Date());
                    const isWeekend = i === 0 || i === 6;
                    return (
                      <div
                        key={day.toString()}
                        className={cn(
                          "py-2.5 px-2 border-r border-zinc-200 dark:border-white/10 last:border-r-0 text-center select-none",
                          isToday ? "bg-zinc-50 dark:bg-white/5" : isWeekend ? "bg-zinc-50/50 dark:bg-white/[0.02]" : "bg-white dark:bg-zinc-950"
                        )}
                      >
                        <p className={cn("text-[10px] font-medium uppercase tracking-wider", isToday ? "text-zinc-900 dark:text-white" : "text-zinc-400 dark:text-zinc-500")}>
                          {format(day, 'EEE')}
                        </p>
                        <p className={cn("text-lg font-semibold mt-0.5 leading-none", isToday ? "text-zinc-900 dark:text-white" : isWeekend ? "text-zinc-400 dark:text-zinc-500" : "text-zinc-700 dark:text-zinc-300")}>
                          {format(day, 'd')}
                        </p>
                      </div>
                    );
                  })
                }
              </div>
            )}

            {/* View content */}
            <div className="flex-1 overflow-y-auto">
              {loading ? (
                <div className="h-full flex flex-col items-center justify-center gap-3 text-zinc-400 dark:text-zinc-500">
                  <Loader2 className="h-6 w-6 animate-spin" />
                </div>
              ) : (
                <>
                  {view === 'month' && renderMonthView()}
                  {view === 'week' && renderWeekView()}
                  {view === 'day' && renderDayView()}
                </>
              )}
            </div>
          </div>

          {/* ── DETAIL PANEL ── */}
          {selectedMeeting && (
            <div className="w-[320px] xl:w-[360px] shrink-0 bg-white dark:bg-zinc-950 border-l border-zinc-200 dark:border-white/10 flex flex-col overflow-hidden shadow-2xl xl:shadow-none z-20 absolute right-0 inset-y-0 xl:relative">

              {/* Panel header */}
              <div className="px-5 pt-5 pb-4 border-b border-zinc-200 dark:border-white/10 bg-zinc-50/50 dark:bg-white/[0.02]">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1 min-w-0 pr-3">
                    <p className="text-[10px] font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider mb-1.5 truncate">{selectedMeeting.client_company}</p>
                    <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 leading-snug line-clamp-2">
                      {selectedMeeting.client_name}
                      {selectedMeeting.meeting_agenda && (
                        <span className="text-zinc-500 dark:text-zinc-400 font-normal"> – {selectedMeeting.meeting_agenda.slice(0, 45)}{selectedMeeting.meeting_agenda.length > 45 ? '…' : ''}</span>
                      )}
                    </h2>
                  </div>
                  <div className="flex items-center gap-1 shrink-0 mt-0.5">
                    <button
                      onClick={() => { setDeletingMeeting(selectedMeeting); setSelectedMeeting(null); }}
                      className="h-7 w-7 flex items-center justify-center rounded-md text-zinc-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-500/10 dark:hover:text-red-400 transition-colors"
                    ><Trash2 className="h-3.5 w-3.5" /></button>
                    <button
                      onClick={() => setSelectedMeeting(null)}
                      className="h-7 w-7 flex items-center justify-center rounded-md text-zinc-400 hover:text-zinc-900 hover:bg-zinc-100 dark:hover:text-white dark:hover:bg-white/10 transition-colors"
                    ><X className="h-4 w-4" /></button>
                  </div>
                </div>

                {/* Badges row */}
                <div className="flex flex-wrap gap-1.5">
                  <span className={cn("px-2 py-0.5 rounded-md text-[10px] font-medium border", getStatusStyle(selectedMeeting.status).pill)}>
                    {selectedMeeting.status || 'Scheduled'}
                  </span>
                  <span className={cn(
                    "px-2 py-0.5 rounded-md text-[10px] font-medium flex items-center gap-1 border",
                    selectedMeeting.meeting_type === 'virtual'
                      ? "bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-500/10 dark:text-indigo-400 dark:border-indigo-500/20"
                      : "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-500/20"
                  )}>
                    {selectedMeeting.meeting_type === 'virtual'
                      ? <><Video className="h-2.5 w-2.5" /> Virtual</>
                      : <><MapPin className="h-2.5 w-2.5" /> In Person</>}
                  </span>
                </div>
              </div>

              {/* Tabs */}
              <Tabs defaultValue="details" className="flex flex-col flex-1 overflow-hidden">
                <TabsList className="grid grid-cols-3 mx-4 mt-4 mb-0 bg-zinc-100 dark:bg-zinc-900/50 rounded-lg h-8 p-0.5 shrink-0">
                  <TabsTrigger value="details" className="text-[11px] font-medium rounded-md data-[state=active]:bg-white dark:data-[state=active]:bg-zinc-800 data-[state=active]:shadow-sm data-[state=active]:text-zinc-900 dark:data-[state=active]:text-zinc-100 text-zinc-500 dark:text-zinc-400">Details</TabsTrigger>
                  <TabsTrigger value="contacts" className="text-[11px] font-medium rounded-md data-[state=active]:bg-white dark:data-[state=active]:bg-zinc-800 data-[state=active]:shadow-sm data-[state=active]:text-zinc-900 dark:data-[state=active]:text-zinc-100 text-zinc-500 dark:text-zinc-400">Contacts</TabsTrigger>
                  <TabsTrigger value="agenda" className="text-[11px] font-medium rounded-md data-[state=active]:bg-white dark:data-[state=active]:bg-zinc-800 data-[state=active]:shadow-sm data-[state=active]:text-zinc-900 dark:data-[state=active]:text-zinc-100 text-zinc-500 dark:text-zinc-400">Agenda</TabsTrigger>
                </TabsList>

                {/* ── DETAILS ── */}
                <TabsContent value="details" className="flex-1 overflow-y-auto px-5 py-4 space-y-5 mt-0">
                  {/* Key info grid */}
                  <div className="grid grid-cols-2 gap-3">
                    {[
                      { label: 'Date', value: safeFormatDate(selectedMeeting.meeting_date, 'dd MMM yyyy') },
                      { label: 'Time', value: `${selectedMeeting.meeting_start_time} – ${selectedMeeting.meeting_end_time}` },
                      { label: 'Duration', value: selectedMeeting.meeting_duration ? `${selectedMeeting.meeting_duration} min` : '—' },
                      { label: 'Status', value: null },
                    ].map(({ label, value }) => (
                      <div key={label} className="bg-zinc-50 dark:bg-white/[0.02] rounded-lg p-3 border border-zinc-100 dark:border-white/5">
                        <p className="text-[9px] font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider mb-1.5">{label}</p>
                        {label === 'Status' ? (
                          <span className={cn("px-2 py-0.5 rounded-md text-[10px] font-medium border", getStatusStyle(selectedMeeting.status).pill)}>
                            {selectedMeeting.status || 'Scheduled'}
                          </span>
                        ) : (
                          <p className="text-xs font-semibold text-zinc-900 dark:text-zinc-100">{value}</p>
                        )}
                      </div>
                    ))}
                  </div>

                  {/* Assigned consultant */}
                  <div>
                    <p className="text-[9px] font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider mb-2">Assigned To</p>
                    <div className="flex items-center gap-3 p-3 bg-zinc-50 dark:bg-white/[0.02] border border-zinc-100 dark:border-white/5 rounded-lg">
                      <div className="h-8 w-8 rounded-full bg-zinc-200 dark:bg-white/10 flex items-center justify-center text-xs font-semibold text-zinc-700 dark:text-zinc-300 shrink-0">
                        {String(selectedMeeting.bcl_attendee || 'BC').slice(0, 2).toUpperCase()}
                      </div>
                      <div>
                        <p className="text-xs font-semibold text-zinc-900 dark:text-zinc-100 leading-tight">{selectedMeeting.bcl_attendee || '—'}</p>
                        <p className="text-[10px] text-zinc-500 dark:text-zinc-400 mt-0.5">BCL Consultant</p>
                      </div>
                    </div>
                  </div>

                  {/* Location */}
                  <div className="bg-zinc-50 dark:bg-white/[0.02] border border-zinc-100 dark:border-white/5 rounded-lg p-3">
                    <p className="text-[9px] font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider mb-2">Location / Link</p>
                    <div className="flex items-start gap-2.5">
                      <MapPin className="h-3.5 w-3.5 text-zinc-400 dark:text-zinc-500 mt-0.5 shrink-0" />
                      <p className="text-xs font-medium text-zinc-700 dark:text-zinc-300 leading-snug break-all">
                        {selectedMeeting.meeting_venue || selectedMeeting.meeting_venue_area || '—'}
                      </p>
                    </div>
                  </div>

                  {/* Join button */}
                  {selectedMeeting.meeting_type === 'virtual' && selectedMeeting.meeting_venue && (
                    <a href={selectedMeeting.meeting_venue} target="_blank" rel="noopener noreferrer">
                      <Button className="w-full rounded-md bg-zinc-900 dark:bg-white hover:bg-zinc-800 dark:hover:bg-zinc-200 text-white dark:text-zinc-900 font-medium text-xs h-9 gap-2 shadow-sm mt-2">
                        <Video className="h-3.5 w-3.5" /> Join Virtual Meeting
                      </Button>
                    </a>
                  )}
                </TabsContent>

                {/* ── CONTACTS ── */}
                <TabsContent value="contacts" className="flex-1 overflow-y-auto px-5 py-4 space-y-5 mt-0">
                  {/* Client */}
                  <div>
                    <p className="text-[9px] font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider mb-2">Client Details</p>
                    <div className="flex items-center gap-3 p-3 bg-zinc-50 dark:bg-white/[0.02] border border-zinc-100 dark:border-white/5 rounded-lg mb-2">
                      <div className="h-9 w-9 rounded-full bg-zinc-200 dark:bg-white/10 flex items-center justify-center text-xs font-semibold text-zinc-700 dark:text-zinc-300 shrink-0">
                        {String(selectedMeeting.client_name || 'CL').slice(0, 2).toUpperCase()}
                      </div>
                      <div>
                        <p className="text-xs font-semibold text-zinc-900 dark:text-zinc-100">{selectedMeeting.client_name}</p>
                        <p className="text-[10px] text-zinc-500 dark:text-zinc-400 mt-0.5">{selectedMeeting.client_company}</p>
                      </div>
                    </div>
                    <div className="space-y-1.5">
                      {selectedMeeting.client_email && (
                        <a href={`mailto:${selectedMeeting.client_email}`} className="flex items-center gap-2.5 px-3 py-2.5 bg-zinc-50 dark:bg-white/[0.02] border border-zinc-100 dark:border-white/5 rounded-lg hover:border-zinc-300 dark:hover:border-white/20 transition-all">
                          <Mail className="h-3.5 w-3.5 text-zinc-400 shrink-0" />
                          <span className="text-xs font-medium text-zinc-700 dark:text-zinc-300 truncate">{selectedMeeting.client_email}</span>
                        </a>
                      )}
                      {selectedMeeting.client_mobile && (
                        <a href={`tel:${selectedMeeting.client_mobile}`} className="flex items-center gap-2.5 px-3 py-2.5 bg-zinc-50 dark:bg-white/[0.02] border border-zinc-100 dark:border-white/5 rounded-lg hover:border-zinc-300 dark:hover:border-white/20 transition-all">
                          <Phone className="h-3.5 w-3.5 text-zinc-400 shrink-0" />
                          <span className="text-xs font-medium text-zinc-700 dark:text-zinc-300">{selectedMeeting.client_mobile}</span>
                        </a>
                      )}
                    </div>
                  </div>
                </TabsContent>

                {/* ── AGENDA ── */}
                <TabsContent value="agenda" className="flex-1 overflow-y-auto px-5 py-4 mt-0">
                  <p className="text-[9px] font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider mb-2">Meeting Agenda</p>
                  <div className="bg-zinc-50 dark:bg-white/[0.02] border border-zinc-100 dark:border-white/5 rounded-lg p-4">
                    <p className="text-xs text-zinc-700 dark:text-zinc-300 font-medium leading-relaxed whitespace-pre-wrap">
                      {selectedMeeting.meeting_agenda || 'No agenda specified for this meeting.'}
                    </p>
                  </div>
                </TabsContent>
              </Tabs>
            </div>
          )}
        </div>
      </div>

      {/* ── DELETE CONFIRMATION ── */}
      <AlertDialog open={!!deletingMeeting} onOpenChange={(open) => !open && setDeletingMeeting(null)}>
        <AlertDialogContent className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 shadow-2xl max-w-sm p-6 gap-6">
          <AlertDialogHeader className="items-start text-left space-y-3">
            <div className="h-10 w-10 bg-red-50 dark:bg-red-500/10 rounded-full flex items-center justify-center border border-red-100 dark:border-red-500/20">
              <Trash2 className="h-5 w-5 text-red-600 dark:text-red-500" />
            </div>
            <div>
              <AlertDialogTitle className="text-base font-semibold text-zinc-900 dark:text-zinc-100">Delete Meeting</AlertDialogTitle>
              <AlertDialogDescription className="text-zinc-500 dark:text-zinc-400 text-sm mt-1">
                Remove the booking for <span className="font-semibold text-zinc-900 dark:text-zinc-100">{deletingMeeting?.client_name}</span>? This action cannot be undone.
              </AlertDialogDescription>
            </div>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex gap-2 sm:gap-2">
            <AlertDialogCancel className="flex-1 rounded-md border-zinc-200 dark:border-white/10 font-medium text-xs h-9 hover:bg-zinc-50 dark:hover:bg-white/5 dark:text-zinc-300">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={deleteMeeting}
              disabled={isDeleting}
              className="flex-1 rounded-md bg-red-600 hover:bg-red-700 text-white font-medium text-xs h-9 dark:bg-red-600 dark:hover:bg-red-700"
            >
              {isDeleting ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Delete Meeting'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default CalendarView;