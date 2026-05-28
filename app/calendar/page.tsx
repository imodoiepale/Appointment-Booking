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
  confirmed: { pill: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-500/20', dot: 'bg-emerald-500', event: 'bg-emerald-50 text-emerald-800 border-l-[3px] border-emerald-500 dark:bg-emerald-500/10 dark:text-emerald-300 dark:border-emerald-500/50' },
  scheduled: { pill: 'bg-slate-50 text-slate-700 border-slate-200 dark:bg-white/10 dark:text-slate-300 dark:border-white/10', dot: 'bg-slate-500 dark:bg-slate-400', event: 'bg-slate-50 text-slate-800 border-l-[3px] border-slate-400 dark:bg-white/5 dark:text-slate-300 dark:border-slate-500' },
  pending: { pill: 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-500/10 dark:text-amber-400 dark:border-amber-500/20', dot: 'bg-amber-400', event: 'bg-amber-50 text-amber-800 border-l-[3px] border-amber-400 dark:bg-amber-500/10 dark:text-amber-300 dark:border-amber-500/50' },
  completed: { pill: 'bg-slate-100 text-slate-500 border-slate-200 dark:bg-white/5 dark:text-slate-400 dark:border-white/10', dot: 'bg-slate-400', event: 'bg-slate-50/50 text-slate-500 border-l-[3px] border-slate-300 dark:bg-white/5 dark:text-slate-400 dark:border-slate-700' },
  cancelled: { pill: 'bg-red-50 text-red-700 border-red-200 dark:bg-red-500/10 dark:text-red-400 dark:border-red-500/20', dot: 'bg-red-500', event: 'bg-red-50 text-red-800 border-l-[3px] border-red-500 dark:bg-red-500/10 dark:text-red-300 dark:border-red-500/50' },
  virtual: { pill: 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-500/10 dark:text-blue-400 dark:border-blue-500/20', dot: 'bg-blue-500', event: 'bg-blue-50 text-blue-800 border-l-[3px] border-blue-400 dark:bg-blue-500/10 dark:text-blue-300 dark:border-blue-500/50' },
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
              "border-r border-b border-slate-200/80 dark:border-white/10 p-2 sm:p-3 cursor-pointer transition-colors group relative",
              idx % 7 === 6 && "border-r-0",
              !isCurrentMonth && "bg-slate-50/50 dark:bg-white/[0.02]",
              isWeekend && isCurrentMonth && "bg-slate-50/30 dark:bg-white/[0.01]",
              isSelected && !isToday && "bg-blue-50/50 dark:bg-blue-500/5 ring-1 ring-inset ring-blue-200 dark:ring-blue-500/20",
              isToday && "bg-slate-100/80 dark:bg-white/10",
              "hover:bg-slate-50 dark:hover:bg-white/5"
            )}
          >
            {/* Date number */}
            <div className="flex items-start justify-between mb-2">
              <span className={cn(
                "h-7 w-7 flex items-center justify-center rounded-full text-xs font-semibold transition-colors",
                isToday && "bg-blue-600 text-white shadow-md shadow-blue-600/20",
                !isToday && isCurrentMonth && !isWeekend && "text-slate-900 dark:text-slate-100 group-hover:bg-slate-200/50 dark:group-hover:bg-white/10",
                !isToday && isCurrentMonth && isWeekend && "text-slate-500 dark:text-slate-400 group-hover:bg-slate-200/50 dark:group-hover:bg-white/10",
                !isCurrentMonth && "text-slate-300 dark:text-slate-600"
              )}>
                {format(day, 'd')}
              </span>
              {dayMeetings.length > 0 && isCurrentMonth && (
                <span className="text-[10px] font-medium text-slate-400 dark:text-slate-500 mt-1">{dayMeetings.length}</span>
              )}
            </div>

            {/* Meetings */}
            <div className="space-y-1">
              {dayMeetings.slice(0, 3).map(m => (
                <div
                  key={m.id_main}
                  onClick={(e) => { e.stopPropagation(); setSelectedMeeting(m); }}
                  className={cn(
                    "flex items-center gap-1.5 px-2 py-1 rounded-md text-[10px] font-medium cursor-pointer hover:opacity-80 transition-opacity truncate shadow-sm",
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
                  className="text-[10px] text-slate-500 dark:text-slate-400 font-medium px-2 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
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
      <div className="w-16 shrink-0 border-r border-slate-200/80 dark:border-white/10 bg-white dark:bg-slate-950">
        <div className="h-12 border-b border-slate-200/80 dark:border-white/10" />
        {TIME_SLOTS.map(time => (
          <div key={time} className="h-20 border-b border-slate-200/80 dark:border-white/10 flex items-start justify-end pr-3 pt-1.5">
            <span className="text-[10px] font-medium text-slate-400 dark:text-slate-500">{time}</span>
          </div>
        ))}
      </div>

      {/* Day columns */}
      <div className="flex flex-1 overflow-x-auto relative">
        {weekDays.map(day => {
          const isToday = isSameDay(day, new Date());
          const dayMeetings = allMeetings.filter(m => m.meeting_date === format(day, 'yyyy-MM-dd'));
          return (
            <div key={day.toString()} className="flex-1 min-w-[120px] border-r border-slate-200/80 dark:border-white/10 last:border-r-0 flex flex-col">
              {/* Day header */}
              <div className={cn(
                "h-12 px-3 flex flex-col items-center justify-center border-b border-slate-200/80 dark:border-white/10 shrink-0 sticky top-0 z-10",
                isToday ? "bg-blue-50/50 dark:bg-blue-500/5" : "bg-white dark:bg-slate-950"
              )}>
                <p className={cn("text-[10px] font-semibold uppercase tracking-wider", isToday ? "text-blue-600 dark:text-blue-400" : "text-slate-500 dark:text-slate-400")}>
                  {format(day, 'EEE')}
                </p>
                <p className={cn("text-sm font-bold leading-none mt-0.5", isToday ? "text-blue-700 dark:text-blue-300" : "text-slate-700 dark:text-slate-300")}>
                  {format(day, 'd')}
                </p>
              </div>

              {/* Time slots */}
              <div className="relative flex-1">
                {TIME_SLOTS.map((_, i) => (
                  <div key={i} className={cn("h-20 border-b border-slate-200/80 dark:border-white/10", i % 2 === 0 ? "bg-white dark:bg-slate-950" : "bg-slate-50/50 dark:bg-white/[0.02]")} />
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
                      className={cn("absolute left-1 right-1 p-2 rounded-lg text-[10px] font-medium cursor-pointer hover:opacity-90 transition-opacity overflow-hidden shadow-sm", getMeetingEventStyle(m))}
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
        <div className="w-16 shrink-0 border-r border-slate-200/80 dark:border-white/10 bg-white dark:bg-slate-950">
          <div className="h-14 border-b border-slate-200/80 dark:border-white/10" />
          {TIME_SLOTS.map(time => (
            <div key={time} className="h-20 border-b border-slate-200/80 dark:border-white/10 flex items-start justify-end pr-3 pt-1.5">
              <span className="text-[10px] font-medium text-slate-400 dark:text-slate-500">{time}</span>
            </div>
          ))}
        </div>

        {/* Day column */}
        <div className="flex-1 flex flex-col min-w-0">
          {/* Header */}
          <div className="h-14 px-6 flex items-center gap-4 border-b border-slate-200/80 dark:border-white/10 bg-white dark:bg-slate-950 shrink-0">
            <div>
              <p className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">{format(currentDate, 'EEEE')}</p>
              <p className="text-base font-bold text-slate-950 dark:text-slate-50 leading-none mt-0.5">{format(currentDate, 'MMMM d, yyyy')}</p>
            </div>
            {dayMeetings.length > 0 && (
              <span className="ml-auto px-3 py-1 rounded-full bg-slate-100 dark:bg-white/10 text-slate-700 dark:text-slate-300 text-[11px] font-semibold border border-slate-200/80 dark:border-white/10 shadow-sm">
                {dayMeetings.length} {dayMeetings.length === 1 ? 'meeting' : 'meetings'}
              </span>
            )}
          </div>

          {/* Time grid */}
          <div className="flex-1 overflow-y-auto relative">
            {TIME_SLOTS.map((_, i) => (
              <div key={i} className={cn("h-20 border-b border-slate-200/80 dark:border-white/10", i % 2 === 0 ? "bg-white dark:bg-slate-950" : "bg-slate-50/50 dark:bg-white/[0.02]")} />
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
                  className={cn("absolute left-4 right-4 rounded-xl cursor-pointer hover:opacity-90 transition-opacity overflow-hidden flex gap-3 p-3 shadow-md", getMeetingEventStyle(m))}
                  style={{ top: `${top}px`, height: `${height}px` }}
                >
                  <div className="flex flex-col justify-between flex-1 min-w-0">
                    <div>
                      <p className="text-sm font-bold truncate">{m.client_name}</p>
                      <p className="text-xs font-medium opacity-80 truncate mt-0.5">{m.client_company}</p>
                    </div>
                    <div className="flex items-center gap-1.5 mt-1">
                      <Clock className="h-3.5 w-3.5 opacity-70 shrink-0" />
                      <span className="text-xs font-semibold">{m.meeting_start_time} – {m.meeting_end_time}</span>
                    </div>
                  </div>
                  <div className="shrink-0 flex flex-col items-end justify-between">
                    <span className={cn("px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider border bg-white/50 backdrop-blur-sm dark:bg-slate-900/50", style.pill)}>
                      {m.status || 'Scheduled'}
                    </span>
                    {m.meeting_type === 'virtual' && <Video className="h-4 w-4 opacity-70" />}
                  </div>
                </div>
              );
            })}

            {dayMeetings.length === 0 && (
              <div className="absolute inset-0 flex flex-col items-center justify-center text-slate-400 dark:text-slate-600 pointer-events-none">
                <CalendarDays className="h-12 w-12 mb-3 opacity-40 text-slate-300" />
                <p className="text-sm font-semibold text-slate-500">No meetings scheduled</p>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  // ── RENDER ──────────────────────────────────────────────────────
  return (
    <div className="flex flex-col h-[calc(100vh-64px)] bg-transparent overflow-hidden">

      {/* ── TOP BAR ── */}
      <div className="h-16 flex items-center px-4 sm:px-6 gap-3 shrink-0 z-10 border-b border-slate-200/80 dark:border-white/10 bg-white/80 dark:bg-slate-950/80 backdrop-blur-xl">

        {/* Filter toggle */}
        <div className="hidden sm:flex items-center bg-slate-100/80 dark:bg-slate-900/50 rounded-lg p-1 border border-slate-200/80 dark:border-white/10 shadow-inner">
          {(['mine', 'all'] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={cn(
                "px-4 py-1.5 text-xs font-semibold rounded-md transition-all capitalize",
                filter === f ? "bg-white dark:bg-slate-800 shadow-sm text-blue-600 dark:text-blue-400 border border-slate-200/50 dark:border-slate-700/50" : "text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 border border-transparent"
              )}
            >
              {f === 'mine' ? 'My Meetings' : 'All'}
            </button>
          ))}
        </div>

        {/* Date navigation */}
        <div className="flex items-center gap-1.5 ml-0 sm:ml-4">
          <Button
            variant="outline" size="sm"
            onClick={() => { setCurrentDate(new Date()); setSelectedDate(new Date()); }}
            className="h-9 px-4 text-xs font-semibold rounded-lg border-slate-200/80 dark:border-white/10 text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-900 shadow-sm hover:bg-slate-50 dark:hover:bg-slate-800"
          >Today</Button>
          <div className="flex gap-1 ml-2">
            <button onClick={handlePrevious} className="h-9 w-9 flex items-center justify-center rounded-lg bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-white/10 shadow-sm hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400 transition-colors">
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button onClick={handleNext} className="h-9 w-9 flex items-center justify-center rounded-lg bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-white/10 shadow-sm hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400 transition-colors">
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
          <span className="text-base font-bold text-slate-950 dark:text-slate-50 ml-3 min-w-[140px]">
            {format(currentDate, view === 'month' ? 'MMMM yyyy' : view === 'week' ? "'Week of' MMM d" : 'MMMM d, yyyy')}
          </span>
        </div>

        <div className="flex-1" />

        {/* Actions */}
        <div className="flex items-center gap-2 sm:gap-3">
          <div className="hidden sm:flex items-center bg-slate-100/80 dark:bg-slate-900/50 rounded-lg p-1 border border-slate-200/80 dark:border-white/10 shadow-inner">
            {(['month', 'week', 'day'] as ViewType[]).map(v => (
              <button
                key={v}
                onClick={() => setView(v)}
                className={cn("px-3 py-1.5 text-[11px] font-semibold rounded-md capitalize transition-all", view === v ? "bg-white dark:bg-slate-800 shadow-sm text-blue-600 dark:text-blue-400 border border-slate-200/50 dark:border-slate-700/50" : "text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 border border-transparent")}
              >{v}</button>
            ))}
          </div>
          <div className="hidden sm:block w-px h-6 bg-slate-200/80 dark:bg-white/10 mx-2" />
          <Button className="h-9 px-4 text-xs font-semibold rounded-lg bg-blue-600 hover:bg-blue-700 text-white shadow-md shadow-blue-600/20 gap-2 transition-all active:scale-[0.98]">
            <PlusCircle className="h-4 w-4" /> <span className="hidden sm:inline">Add Meeting</span>
          </Button>
        </div>
      </div>

      {/* ── BODY ── */}
      <div className="flex flex-1 min-h-0 overflow-hidden m-4 mt-0 bg-white dark:bg-slate-950 rounded-xl border border-slate-200/80 dark:border-white/10 shadow-sm">

        {/* ── LEFT SIDEBAR ── */}
        <div className="hidden xl:flex w-[280px] shrink-0 bg-slate-50/50 dark:bg-slate-950/50 border-r border-slate-200/80 dark:border-white/10 flex-col overflow-hidden">

          {/* Mini Calendar */}
          <div className="p-4 border-b border-slate-200/80 dark:border-white/10">
            <Calendar
              mode="single"
              selected={selectedDate}
              onSelect={(date) => { if (date) { setSelectedDate(date); setCurrentDate(date); } }}
              month={currentDate}
              onMonthChange={setCurrentDate}
              className="p-0 border-0 shadow-none bg-transparent dark:bg-transparent"
              classNames={{
                months: "w-full",
                month: "w-full space-y-3",
                caption: "flex justify-between pt-1 relative items-center mb-3 px-1",
                caption_label: "text-sm font-bold text-slate-950 dark:text-slate-100",
                nav: "space-x-1 flex items-center",
                nav_button: "h-7 w-7 bg-transparent p-0 flex items-center justify-center text-slate-500 hover:text-slate-900 hover:bg-slate-200/50 dark:text-slate-400 dark:hover:text-white dark:hover:bg-white/10 rounded-md transition-colors",
                nav_button_previous: "relative",
                nav_button_next: "relative",
                table: "w-full border-collapse",
                head_row: "grid grid-cols-7 w-full mb-2",
                head_cell: "text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase text-center",
                row: "grid grid-cols-7 w-full mt-0.5",
                cell: "flex items-center justify-center p-0",
                day: "h-8 w-8 p-0 text-xs font-medium text-slate-700 dark:text-slate-300 rounded-lg hover:bg-slate-200/50 dark:hover:bg-white/10 mx-auto transition-colors aria-selected:opacity-100",
                day_selected: "bg-blue-600 text-white hover:bg-blue-700 hover:text-white focus:bg-blue-600 focus:text-white dark:bg-blue-600 dark:text-white shadow-md shadow-blue-600/20 font-semibold",
                day_today: "text-blue-600 dark:text-blue-400 font-bold bg-blue-50 dark:bg-blue-500/10",
                day_outside: "text-slate-300 dark:text-slate-700 opacity-50",
                day_disabled: "text-slate-300 dark:text-slate-700 opacity-40",
              }}
            />
          </div>

          {/* Meetings Today */}
          <div className="flex-1 overflow-y-auto">
            <div className="px-5 py-5">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest">
                  Today's Schedule
                </h3>
                {todayMeetings.length > 0 && (
                  <span className="h-5 w-5 rounded-md bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400 text-[10px] font-bold flex items-center justify-center">
                    {todayMeetings.length}
                  </span>
                )}
              </div>

              {loading ? (
                <div className="flex items-center gap-2 text-slate-400 dark:text-slate-500 mt-4 justify-center">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span className="text-xs font-medium">Loading…</span>
                </div>
              ) : todayMeetings.length > 0 ? (
                <div className="space-y-2">
                  {todayMeetings.map(m => {
                    const style = getStatusStyle(m.status);
                    return (
                      <div
                        key={m.id_main}
                        onClick={() => setSelectedMeeting(m)}
                        className="group flex items-start gap-3 p-3 rounded-xl border border-slate-200/80 dark:border-white/10 bg-white dark:bg-slate-900 hover:border-blue-300 dark:hover:border-blue-500/30 cursor-pointer transition-all shadow-sm hover:shadow-md"
                      >
                        <span className={cn("mt-1.5 h-2 w-2 rounded-full shrink-0", style.dot)} />
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-bold text-slate-900 dark:text-slate-100 truncate leading-snug">{m.client_name}</p>
                          <div className="flex items-center gap-1.5 mt-1">
                            <Clock className="h-3 w-3 text-slate-400 dark:text-slate-500 shrink-0" />
                            <span className="text-[10px] text-slate-500 dark:text-slate-400 font-medium">{m.meeting_start_time} – {m.meeting_end_time}</span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-10 text-center border border-dashed border-slate-200/80 dark:border-white/10 rounded-xl bg-slate-50/50 dark:bg-white/[0.02]">
                  <CalendarDays className="h-8 w-8 text-slate-300 mb-2" />
                  <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">No meetings today</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* ── CALENDAR + DETAIL PANEL ── */}
        <div className="flex flex-1 min-w-0 overflow-hidden">

          {/* ── CALENDAR AREA ── */}
          <div className="flex-1 flex flex-col min-w-0 overflow-hidden bg-white dark:bg-slate-950">

            {/* Day column headers — view-aware */}
            {view !== 'day' && (
              <div className="grid grid-cols-7 border-b border-slate-200/80 dark:border-white/10 shrink-0 bg-white dark:bg-slate-950">
                {view === 'month'
                  ? DAY_NAMES.map((name, i) => {
                    const isWeekend = i === 0 || i === 6;
                    return (
                      <div
                        key={name}
                        className={cn(
                          "py-3 px-2 border-r border-slate-200/80 dark:border-white/10 last:border-r-0 text-center select-none",
                          isWeekend ? "bg-slate-50/50 dark:bg-white/[0.02]" : "bg-white dark:bg-slate-950"
                        )}
                      >
                        <p className={cn("text-[11px] font-bold uppercase tracking-widest", isWeekend ? "text-slate-400 dark:text-slate-500" : "text-slate-500 dark:text-slate-400")}>
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
                          "py-3 px-2 border-r border-slate-200/80 dark:border-white/10 last:border-r-0 text-center select-none",
                          isToday ? "bg-blue-50/30 dark:bg-blue-500/5" : isWeekend ? "bg-slate-50/50 dark:bg-white/[0.02]" : "bg-white dark:bg-slate-950"
                        )}
                      >
                        <p className={cn("text-[10px] font-bold uppercase tracking-wider", isToday ? "text-blue-600 dark:text-blue-400" : "text-slate-400 dark:text-slate-500")}>
                          {format(day, 'EEE')}
                        </p>
                        <p className={cn("text-lg font-bold mt-0.5 leading-none", isToday ? "text-blue-700 dark:text-blue-300" : isWeekend ? "text-slate-400 dark:text-slate-500" : "text-slate-800 dark:text-slate-200")}>
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
                <div className="h-full flex flex-col items-center justify-center gap-3 text-slate-400 dark:text-slate-500">
                  <Loader2 className="h-8 w-8 animate-spin" />
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
            <div className="w-[340px] xl:w-[380px] shrink-0 bg-white dark:bg-slate-950 border-l border-slate-200/80 dark:border-white/10 flex flex-col overflow-hidden shadow-2xl xl:shadow-none z-20 absolute right-0 inset-y-0 xl:relative">

              {/* Panel header */}
              <div className="px-6 pt-6 pb-5 border-b border-slate-200/80 dark:border-white/10 bg-slate-50/50 dark:bg-white/[0.02]">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1 min-w-0 pr-3">
                    <p className="text-[10px] font-bold text-blue-600 dark:text-blue-400 uppercase tracking-widest mb-2 truncate">{selectedMeeting.client_company || 'Independent Client'}</p>
                    <h2 className="text-base font-bold text-slate-950 dark:text-slate-50 leading-tight line-clamp-2">
                      {selectedMeeting.client_name}
                      {selectedMeeting.meeting_agenda && (
                        <span className="text-slate-500 dark:text-slate-400 font-medium"> – {selectedMeeting.meeting_agenda.slice(0, 45)}{selectedMeeting.meeting_agenda.length > 45 ? '…' : ''}</span>
                      )}
                    </h2>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0 mt-0.5">
                    <button
                      onClick={() => { setDeletingMeeting(selectedMeeting); setSelectedMeeting(null); }}
                      className="h-8 w-8 flex items-center justify-center rounded-lg text-slate-400 border border-transparent hover:border-red-200 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-500/10 dark:hover:text-red-400 transition-colors shadow-sm"
                    ><Trash2 className="h-4 w-4" /></button>
                    <button
                      onClick={() => setSelectedMeeting(null)}
                      className="h-8 w-8 flex items-center justify-center rounded-lg text-slate-400 border border-slate-200/80 hover:text-slate-900 hover:bg-slate-50 dark:hover:text-white dark:border-white/10 dark:hover:bg-white/10 transition-colors shadow-sm"
                    ><X className="h-4 w-4" /></button>
                  </div>
                </div>

                {/* Badges row */}
                <div className="flex flex-wrap gap-2">
                  <span className={cn("px-2.5 py-1 rounded-md text-[10px] font-bold tracking-wide uppercase border shadow-sm", getStatusStyle(selectedMeeting.status).pill)}>
                    {selectedMeeting.status || 'Scheduled'}
                  </span>
                  <span className={cn(
                    "px-2.5 py-1 rounded-md text-[10px] font-bold tracking-wide uppercase flex items-center gap-1.5 border shadow-sm",
                    selectedMeeting.meeting_type === 'virtual'
                      ? "bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-500/10 dark:text-indigo-400 dark:border-indigo-500/20"
                      : "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-500/20"
                  )}>
                    {selectedMeeting.meeting_type === 'virtual'
                      ? <><Video className="h-3 w-3" /> Virtual</>
                      : <><MapPin className="h-3 w-3" /> In Person</>}
                  </span>
                </div>
              </div>

              {/* Tabs */}
              <Tabs defaultValue="details" className="flex flex-col flex-1 overflow-hidden">
                <TabsList className="grid grid-cols-3 mx-5 mt-5 mb-0 bg-slate-100/80 dark:bg-slate-900/50 rounded-lg h-9 p-1 shrink-0 shadow-inner">
                  <TabsTrigger value="details" className="text-xs font-semibold rounded-md data-[state=active]:bg-white dark:data-[state=active]:bg-slate-800 data-[state=active]:shadow-sm data-[state=active]:text-blue-700 dark:data-[state=active]:text-blue-400 text-slate-500 dark:text-slate-400 transition-all border border-transparent data-[state=active]:border-slate-200/50 dark:data-[state=active]:border-slate-700/50">Details</TabsTrigger>
                  <TabsTrigger value="contacts" className="text-xs font-semibold rounded-md data-[state=active]:bg-white dark:data-[state=active]:bg-slate-800 data-[state=active]:shadow-sm data-[state=active]:text-blue-700 dark:data-[state=active]:text-blue-400 text-slate-500 dark:text-slate-400 transition-all border border-transparent data-[state=active]:border-slate-200/50 dark:data-[state=active]:border-slate-700/50">Contacts</TabsTrigger>
                  <TabsTrigger value="agenda" className="text-xs font-semibold rounded-md data-[state=active]:bg-white dark:data-[state=active]:bg-slate-800 data-[state=active]:shadow-sm data-[state=active]:text-blue-700 dark:data-[state=active]:text-blue-400 text-slate-500 dark:text-slate-400 transition-all border border-transparent data-[state=active]:border-slate-200/50 dark:data-[state=active]:border-slate-700/50">Agenda</TabsTrigger>
                </TabsList>

                {/* ── DETAILS ── */}
                <TabsContent value="details" className="flex-1 overflow-y-auto px-5 py-5 space-y-6 mt-0">
                  {/* Key info grid */}
                  <div className="grid grid-cols-2 gap-3">
                    {[
                      { label: 'Date', value: safeFormatDate(selectedMeeting.meeting_date, 'dd MMM yyyy') },
                      { label: 'Time', value: `${selectedMeeting.meeting_start_time} – ${selectedMeeting.meeting_end_time}` },
                      { label: 'Duration', value: selectedMeeting.meeting_duration ? `${selectedMeeting.meeting_duration} min` : '—' },
                      { label: 'Status', value: null },
                    ].map(({ label, value }) => (
                      <div key={label} className="bg-slate-50/80 dark:bg-white/[0.02] rounded-xl p-3.5 border border-slate-200/60 dark:border-white/5 shadow-sm">
                        <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-1.5">{label}</p>
                        {label === 'Status' ? (
                          <span className={cn("px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider border", getStatusStyle(selectedMeeting.status).pill)}>
                            {selectedMeeting.status || 'Scheduled'}
                          </span>
                        ) : (
                          <p className="text-sm font-bold text-slate-900 dark:text-slate-100">{value}</p>
                        )}
                      </div>
                    ))}
                  </div>

                  {/* Assigned consultant */}
                  <div>
                    <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-2.5 px-1">Assigned To</p>
                    <div className="flex items-center gap-3.5 p-3.5 bg-slate-50/80 dark:bg-white/[0.02] border border-slate-200/60 dark:border-white/5 rounded-xl shadow-sm">
                      <div className="h-10 w-10 rounded-full bg-slate-200 dark:bg-white/10 flex items-center justify-center text-sm font-bold text-slate-700 dark:text-slate-300 shrink-0 shadow-inner">
                        {String(selectedMeeting.bcl_attendee || 'BC').slice(0, 2).toUpperCase()}
                      </div>
                      <div>
                        <p className="text-sm font-bold text-slate-900 dark:text-slate-100 leading-tight">{selectedMeeting.bcl_attendee || '—'}</p>
                        <p className="text-[11px] font-medium text-slate-500 dark:text-slate-400 mt-0.5">BCL Consultant</p>
                      </div>
                    </div>
                  </div>

                  {/* Location */}
                  <div className="bg-slate-50/80 dark:bg-white/[0.02] border border-slate-200/60 dark:border-white/5 rounded-xl p-4 shadow-sm">
                    <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-2.5">Location / Link</p>
                    <div className="flex items-start gap-2.5">
                      <MapPin className="h-4 w-4 text-slate-400 dark:text-slate-500 mt-0.5 shrink-0" />
                      <p className="text-sm font-medium text-slate-700 dark:text-slate-300 leading-relaxed break-all">
                        {selectedMeeting.meeting_venue || selectedMeeting.meeting_venue_area || '—'}
                      </p>
                    </div>
                  </div>

                  {/* Join button */}
                  {selectedMeeting.meeting_type === 'virtual' && selectedMeeting.meeting_venue && (
                    <a href={selectedMeeting.meeting_venue} target="_blank" rel="noopener noreferrer" className="block pt-2">
                      <Button className="w-full rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm h-11 gap-2 shadow-md shadow-blue-600/20 transition-all">
                        <Video className="h-4 w-4" /> Join Virtual Meeting
                      </Button>
                    </a>
                  )}
                </TabsContent>

                {/* ── CONTACTS ── */}
                <TabsContent value="contacts" className="flex-1 overflow-y-auto px-5 py-5 space-y-6 mt-0">
                  {/* Client */}
                  <div>
                    <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-2.5 px-1">Client Details</p>
                    <div className="flex items-center gap-3.5 p-4 bg-slate-50/80 dark:bg-white/[0.02] border border-slate-200/60 dark:border-white/5 rounded-xl mb-3 shadow-sm">
                      <div className="h-10 w-10 rounded-full bg-blue-100 dark:bg-blue-500/20 border border-blue-200 dark:border-blue-500/30 flex items-center justify-center text-sm font-bold text-blue-700 dark:text-blue-400 shrink-0">
                        {String(selectedMeeting.client_name || 'CL').slice(0, 2).toUpperCase()}
                      </div>
                      <div>
                        <p className="text-sm font-bold text-slate-900 dark:text-slate-100">{selectedMeeting.client_name}</p>
                        <p className="text-xs font-medium text-slate-500 dark:text-slate-400 mt-0.5">{selectedMeeting.client_company}</p>
                      </div>
                    </div>
                    <div className="space-y-2">
                      {selectedMeeting.client_email && (
                        <a href={`mailto:${selectedMeeting.client_email}`} className="flex items-center gap-3 px-4 py-3 bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-white/10 rounded-xl hover:border-blue-300 dark:hover:border-blue-500/30 hover:shadow-md transition-all">
                          <div className="h-8 w-8 rounded-lg bg-slate-50 dark:bg-white/5 flex items-center justify-center shrink-0">
                            <Mail className="h-4 w-4 text-slate-500" />
                          </div>
                          <span className="text-sm font-medium text-slate-700 dark:text-slate-300 truncate">{selectedMeeting.client_email}</span>
                        </a>
                      )}
                      {selectedMeeting.client_mobile && (
                        <a href={`tel:${selectedMeeting.client_mobile}`} className="flex items-center gap-3 px-4 py-3 bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-white/10 rounded-xl hover:border-blue-300 dark:hover:border-blue-500/30 hover:shadow-md transition-all">
                          <div className="h-8 w-8 rounded-lg bg-slate-50 dark:bg-white/5 flex items-center justify-center shrink-0">
                            <Phone className="h-4 w-4 text-slate-500" />
                          </div>
                          <span className="text-sm font-medium text-slate-700 dark:text-slate-300">{selectedMeeting.client_mobile}</span>
                        </a>
                      )}
                    </div>
                  </div>
                </TabsContent>

                {/* ── AGENDA ── */}
                <TabsContent value="agenda" className="flex-1 overflow-y-auto px-5 py-5 mt-0">
                  <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-2.5 px-1">Meeting Agenda</p>
                  <div className="bg-slate-50/80 dark:bg-white/[0.02] border border-slate-200/60 dark:border-white/5 rounded-xl p-5 shadow-sm">
                    <p className="text-sm text-slate-700 dark:text-slate-300 font-medium leading-relaxed whitespace-pre-wrap">
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
        <AlertDialogContent className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 shadow-2xl max-w-sm p-6 gap-6">
          <AlertDialogHeader className="items-start text-left space-y-4">
            <div className="h-12 w-12 bg-red-50 dark:bg-red-500/10 rounded-xl flex items-center justify-center border border-red-100 dark:border-red-500/20 shadow-sm">
              <Trash2 className="h-6 w-6 text-red-600 dark:text-red-500" />
            </div>
            <div>
              <AlertDialogTitle className="text-lg font-bold text-slate-900 dark:text-slate-100">Delete Meeting</AlertDialogTitle>
              <AlertDialogDescription className="text-slate-500 dark:text-slate-400 text-sm mt-1.5 leading-relaxed">
                Remove the booking for <span className="font-bold text-slate-900 dark:text-slate-100">{deletingMeeting?.client_name}</span>? This action cannot be undone.
              </AlertDialogDescription>
            </div>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex gap-3 sm:gap-3">
            <AlertDialogCancel className="flex-1 rounded-xl border-slate-200 dark:border-white/10 font-semibold text-sm h-11 hover:bg-slate-50 dark:hover:bg-white/5 dark:text-slate-300 mt-0">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={deleteMeeting}
              disabled={isDeleting}
              className="flex-1 rounded-xl bg-red-600 hover:bg-red-700 text-white shadow-md shadow-red-600/20 font-semibold text-sm h-11 transition-all"
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