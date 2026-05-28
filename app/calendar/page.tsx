// @ts-nocheck
"use client"; // Ensures this component runs on the client side

import React, { useState, useEffect, useCallback } from 'react';
// Remove direct Supabase import as we'll use the client
import { format, startOfMonth, endOfMonth, eachDayOfInterval, getDay, add, startOfWeek, isSameDay, isBefore, parseISO, getHours, getMinutes, isWithinInterval, format as formatDate } from 'date-fns';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, Clock, Trash2, Info, Loader2, Check, Video, MapPin, Building, User, Phone, Mail, PlusCircle, ExternalLink, MoreHorizontal, MessageSquare, UserPlus, CheckCircle, XCircle, LinkIcon, RefreshCw, Building2, FileText, Quote, Menu, Settings, Search, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger, DialogClose } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { Toast } from '@/components/ui/toast'; // Import Toast component if needed
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Separator } from '@/components/ui/separator';
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCaption, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils"; // Utility for conditional class names
import supabase from '@/utils/supabaseClient'; // Import from utils

import { checkAppointmentStatus, getBadgeStatusColor } from '@/utils/appointmentUtils'; // Added utils

// Type definitions
interface Meeting {
  id_main: number; // Changed from meeting_id to id_main to match database
  meeting_date: string; // Keep as YYYY-MM-DD string from Supabase
  meeting_start_time: string; // HH:mm format
  meeting_end_time: string; // HH:mm format
  meeting_duration?: number;
  client_name: string;
  client_company: string;
  client_email?: string;
  client_mobile?: string;
  meeting_type: 'virtual' | 'physical'; // Use specific types
  meeting_venue_area: string;
  meeting_venue?: string;
  meeting_agenda: string;
  bcl_attendee: string;
  bcl_attendee_mobile?: string;
  status?: string;
  badge_status?: string;
}

// Helper: Check if two meetings overlap
const meetingsOverlap = (meeting1: Meeting, meeting2: Meeting) => {
  if (meeting1.meeting_date !== meeting2.meeting_date) return false;

  const [startHour1, startMin1] = meeting1.meeting_start_time.split(':').map(Number);
  const [endHour1, endMin1] = meeting1.meeting_end_time.split(':').map(Number);
  const [startHour2, startMin2] = meeting2.meeting_start_time.split(':').map(Number);
  const [endHour2, endMin2] = meeting2.meeting_end_time.split(':').map(Number);

  const start1 = startHour1 * 60 + startMin1;
  const end1 = endHour1 * 60 + endMin1;
  const start2 = startHour2 * 60 + startMin2;
  const end2 = endHour2 * 60 + endMin2;

  // Overlap if one starts before the other ends, and vice-versa
  // Does not include touching boundaries (e.g., 10:00-11:00 and 11:00-12:00)
  return start1 < end2 && start2 < end1;
};

const CalendarView = () => {
  const { toast } = useToast(); // Initialize toast
  const [currentDate, setCurrentDate] = useState<Date>(new Date()); // Date controlling the calendar month view
  const [selectedDate, setSelectedDate] = useState<Date>(new Date()); // Specific date selected for viewing details
  const [allMeetings, setAllMeetings] = useState<Meeting[]>([]); // Changed from meetings to allMeetings
  const [meetingsForSelectedDate, setMeetingsForSelectedDate] = useState<Meeting[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedMeeting, setSelectedMeeting] = useState<Meeting | null>(null);
  const [deletingMeeting, setDeletingMeeting] = useState<Meeting | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [activeTab, setActiveTab] = useState<string>("timeline"); // Default view

  // Time slots for the day view (7 AM to 9 PM, 30-minute intervals)
  const timeSlots = React.useMemo(() => Array.from({ length: (21 - 7) * 2 }, (_, i) => {
    const hour = Math.floor(i / 2) + 7;
    const minute = (i % 2) * 30;
    return `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
  }), []); // Memoize to avoid recalculation

  // Format time to 12-hour format with AM/PM
  const formatTime = (time: string): string => {
    if (!time || !time.includes(':')) return 'Invalid time';
    try {
      const [hours, minutes] = time.split(':').map(Number);
      const date = new Date();
      date.setHours(hours, minutes, 0, 0);
      return formatDate(date, 'h:mm a');
    } catch (e) {
      console.error("Error formatting time:", time, e);
      return 'Invalid time';
    }
  };

  // Format date safely, handles invalid input
  const formatDateSafe = (dateInput: string | Date | undefined, formatStr: string = 'dd/MM/yyyy'): string => {
    if (!dateInput) return 'N/A';
    try {
      const date = typeof dateInput === 'string' ? parseISO(dateInput) : dateInput;
      if (isNaN(date.getTime())) {
        // Handle cases where date string might be DD/MM/YYYY or other formats not directly parsed by parseISO
        // Basic attempt for YYYY-MM-DD which is expected from DB
        if (typeof dateInput === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(dateInput)) {
          const [year, month, day] = dateInput.split('-').map(Number);
          const parsed = new Date(year, month - 1, day);
          if (!isNaN(parsed.getTime())) return formatDate(parsed, formatStr);
        }
        console.error('Invalid date encountered:', dateInput);
        return 'Invalid date';
      }
      return format(date, formatStr);
    } catch (error) {
      console.error('Error formatting date:', dateInput, error);
      return 'Invalid date';
    }
  };

  // Filter meetings for the selected date
  const filterAndSortMeetingsForSelectedDate = useCallback((allMeetings: Meeting[], date: Date) => {
    const dateString = format(date, 'yyyy-MM-dd');
    const filtered = allMeetings
      .filter(meeting => meeting.meeting_date === dateString)
      .sort((a, b) => {
        // Sort primarily by start time
        const startTimeA = a.meeting_start_time.localeCompare(b.meeting_start_time);
        if (startTimeA !== 0) return startTimeA;
        // If start times are the same, sort by end time (shorter meetings first?) or ID
        return a.id_main - b.id_main;
      });
    setMeetingsForSelectedDate(filtered);
  }, []);

  // Fetch meetings from Supabase
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
      console.error('Error fetching meetings:', error);
      toast({
        title: "Error fetching meetings",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  }, [toast, selectedDate, filterAndSortMeetingsForSelectedDate]); // Now filterAndSortMeetingsForSelectedDate is defined before use

  // Handle date selection from Calendar or buttons
  const handleDateSelect = useCallback((newDate: Date | undefined) => {
    if (newDate) {
      setSelectedDate(newDate);
      // Keep calendar view consistent unless month changes significantly
      if (newDate.getMonth() !== currentDate.getMonth() || newDate.getFullYear() !== currentDate.getFullYear()) {
        setCurrentDate(newDate);
      }
    }
  }, [currentDate]);

  // Go to Previous/Next day
  const changeDay = (increment: number) => {
    setSelectedDate(prevDate => add(prevDate, { days: increment }));
  };

  // Go to Today
  const goToToday = () => {
    const today = new Date();
    setSelectedDate(today);
    setCurrentDate(today); // Also reset calendar month view to today
  };

  // Delete meeting function
  const deleteMeeting = async () => {
    if (!deletingMeeting) return;

    setIsDeleting(true);
    try {
      const { error } = await supabase
        .from('bcl_meetings_meetings')
        .delete()
        .eq('id_main', deletingMeeting.id_main); // Changed from meeting_id to id_main

      if (error) throw error;

      // Update UI after successful deletion
      setAllMeetings(prev => prev.filter(m => m.id_main !== deletingMeeting.id_main)); // Changed from meeting_id to id_main
      setMeetingsForSelectedDate(prev => prev.filter(m => m.id_main !== deletingMeeting.id_main)); // Changed from meeting_id to id_main

      // Close dialogs and show success message
      setSelectedMeeting(null);
      setDeletingMeeting(null);

      toast({
        title: "Meeting Deleted",
        description: `Meeting with ${deletingMeeting.client_name} has been deleted.`,
      });
    } catch (error: any) {
      console.error('Error deleting meeting:', error);
      toast({
        title: "Error Deleting Meeting",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setIsDeleting(false);
    }
  };

  // Get meeting duration in 30-minute slots
  const getMeetingDurationInSlots = (meeting: Meeting): number => {
    try {
      const [startHour, startMinute] = meeting.meeting_start_time.split(':').map(Number);
      const [endHour, endMinute] = meeting.meeting_end_time.split(':').map(Number);
      const startTimeInMinutes = startHour * 60 + startMinute;
      const endTimeInMinutes = endHour * 60 + endMinute;
      const durationMinutes = endTimeInMinutes - startTimeInMinutes;
      return Math.max(1, Math.ceil(durationMinutes / 30)); // Ensure at least 1 slot
    } catch (e) {
      console.error("Error calculating duration for meeting:", meeting.id_main, e);
      return 1; // Default to 1 slot on error
    }
  };

  // Find the closest time slot for a given time
  const findClosestTimeSlot = (time: string): number => {
    try {
      const [hour, minute] = time.split(':').map(Number);
      const timeInMinutes = hour * 60 + minute;

      // Find the closest slot index
      return timeSlots.reduce((closest, slot, index) => {
        const [slotHour, slotMinute] = slot.split(':').map(Number);
        const slotInMinutes = slotHour * 60 + slotMinute;

        // If the time is before the first slot, return the first slot
        if (index === 0 && timeInMinutes < slotInMinutes) return 0;

        // If time matches exactly or is after this slot but before next slot, use this index
        if (timeInMinutes >= slotInMinutes &&
          (index === timeSlots.length - 1 || timeInMinutes < (slotHour + (slotMinute === 30 ? 1 : 0)) * 60 + (slotMinute === 30 ? 0 : 30))) {
          return index;
        }

        return closest;
      }, 0);
    } catch (e) {
      console.error("Error finding closest time slot:", time, e);
      return 0; // Default to first slot on error
    }
  };

  // Get upcoming meetings (within next 7 days, for example)
  const upcomingMeetings = React.useMemo(() => {
    const today = format(new Date(), 'yyyy-MM-dd');
    const nextWeek = format(add(new Date(), { days: 7 }), 'yyyy-MM-dd');
    return allMeetings
      .filter(m => m.meeting_date >= today && m.meeting_date <= nextWeek)
      .sort((a, b) => {
        const dateCompare = a.meeting_date.localeCompare(b.meeting_date);
        if (dateCompare !== 0) return dateCompare;
        return a.meeting_start_time.localeCompare(b.meeting_start_time);
      });
  }, [allMeetings]);

  // Sort all meetings by date (most recent first) for the Table view
  const sortedMeetingsForTable = React.useMemo(() => {
    return [...allMeetings].sort((a, b) => {
      try {
        const dateA = parseISO(`${a.meeting_date}T${a.meeting_start_time}`);
        const dateB = parseISO(`${b.meeting_date}T${b.meeting_start_time}`);
        if (isNaN(dateA.getTime()) || isNaN(dateB.getTime())) return 0; // Handle invalid dates
        return dateB.getTime() - dateA.getTime(); // Descending (newest first)
      } catch (error) {
        console.error('Error sorting meetings by date:', error);
        return 0;
      }
    });
  }, [allMeetings]);


  // Initial fetch and real-time subscription setup
  useEffect(() => {
    fetchMeetings();

    const channel = supabase
      .channel('meeting-changes')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'bcl_meetings_meetings'
      }, (payload) => {
        console.log('Change received!', payload);
        fetchMeetings(); // Re-fetch data on any change
      })
      .subscribe();

    // Cleanup subscription on component unmount
    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchMeetings]); // fetchMeetings is memoized with useCallback


  // Filter meetings whenever the selected date or the full meeting list changes
  useEffect(() => {
    if (allMeetings.length > 0) {
      filterAndSortMeetingsForSelectedDate(allMeetings, selectedDate);
    } else {
      setMeetingsForSelectedDate([]); // Clear if no meetings
    }
  }, [selectedDate, allMeetings, filterAndSortMeetingsForSelectedDate]);

  // Custom Day Content for Shadcn Calendar to show meeting indicators
  const DayContent = ({ date: dayDate, displayMonth }: { date: Date, displayMonth: Date }) => {
    const dateString = format(dayDate, 'yyyy-MM-dd');
    // Check if this day has any meetings
    const hasMeetings = allMeetings.some(meeting => meeting.meeting_date === dateString);
    // Check if the day is outside the currently displayed month
    const isOutsideMonth = dayDate.getMonth() !== displayMonth.getMonth();

    return (
      <div className={cn("relative flex items-center justify-center h-full w-full",
        isOutsideMonth ? "text-muted-foreground opacity-50" : "" // Dim days outside month
      )}>
        <span>{format(dayDate, 'd')}</span>
        {hasMeetings && !isOutsideMonth && (
          <span className="absolute bottom-1 right-1 block h-2 w-2 rounded-full bg-blue-500" />
        )}
      </div>
    );
  };

  const calendarDays = React.useMemo(() => {
    const monthStart = startOfMonth(currentDate);
    const calStart = startOfWeek(monthStart, { weekStartsOn: 1 });
    return Array.from({ length: 42 }, (_, i) => add(calStart, { days: i }));
  }, [currentDate]);

  return (
    <TooltipProvider>
      <div className="flex h-screen bg-white font-sans antialiased text-slate-900 overflow-hidden">

        {/* ── LEFT ICON NAV ── */}
        <nav className="w-[68px] shrink-0 bg-white border-r border-slate-100 flex flex-col items-center pt-5 pb-4 gap-1 z-10">
          <div className="h-9 w-9 rounded-xl bg-orange-500 flex items-center justify-center mb-5 shadow-md shadow-orange-200">
            <CalendarIcon className="h-[18px] w-[18px] text-white" />
          </div>
          {([
            { icon: Building2, label: 'Dashboard' },
            { icon: FileText, label: 'Documents' },
            { icon: Building, label: 'Projects' },
            { icon: CalendarIcon, label: 'Calendar', active: true },
            { icon: Menu, label: 'More' },
          ] as const).map(({ icon: Icon, label, active }: { icon: any, label: string, active?: boolean }) => (
            <Tooltip key={label}>
              <TooltipTrigger asChild>
                <button className={cn(
                  "h-10 w-10 rounded-xl flex items-center justify-center transition-colors",
                  active ? "bg-orange-50 text-orange-500" : "text-slate-400 hover:bg-slate-50 hover:text-slate-700"
                )}>
                  <Icon className="h-5 w-5" />
                </button>
              </TooltipTrigger>
              <TooltipContent side="right" className="text-xs">{label}</TooltipContent>
            </Tooltip>
          ))}
          <div className="flex-1" />
          <Tooltip>
            <TooltipTrigger asChild>
              <button className="h-10 w-10 rounded-xl flex items-center justify-center text-slate-400 hover:bg-slate-50 hover:text-slate-700 transition-colors">
                <Settings className="h-5 w-5" />
              </button>
            </TooltipTrigger>
            <TooltipContent side="right" className="text-xs">Settings</TooltipContent>
          </Tooltip>
          <Avatar className="h-8 w-8 mt-2">
            <AvatarFallback className="bg-slate-200 text-slate-600 text-xs font-bold">U</AvatarFallback>
          </Avatar>
        </nav>

        {/* ── MAIN CALENDAR CONTENT ── */}
        <div className="flex-1 flex flex-col overflow-hidden bg-white min-w-0">

          {/* Top Bar */}
          <div className="flex items-center justify-between px-6 h-[60px] border-b border-slate-100 shrink-0">
            <div className="flex items-center gap-1">
              <Button
                variant="ghost" size="icon"
                onClick={() => setCurrentDate(prev => add(prev, { months: -1 }))}
                className="h-8 w-8 rounded-lg text-slate-500 hover:text-slate-900"
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <h2 className="text-sm font-bold text-slate-900 w-[148px] text-center select-none">
                {format(currentDate, 'MMMM  yyyy')}
              </h2>
              <Button
                variant="ghost" size="icon"
                onClick={() => setCurrentDate(prev => add(prev, { months: 1 }))}
                className="h-8 w-8 rounded-lg text-slate-500 hover:text-slate-900"
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                onClick={goToToday}
                className="h-9 px-4 text-xs font-semibold rounded-lg border-slate-200 text-slate-600 hover:bg-slate-50"
              >
                Today
              </Button>
              <Button
                variant="outline"
                className="h-9 px-4 text-xs font-semibold rounded-lg border-slate-200 text-slate-600 hover:bg-slate-50"
              >
                Request Approval
              </Button>
              <Button className="h-9 px-4 text-xs font-semibold rounded-lg bg-orange-500 hover:bg-orange-600 text-white shadow-sm">
                <PlusCircle className="mr-1.5 h-3.5 w-3.5" /> Add event
              </Button>
            </div>
          </div>

          {/* Day-of-week header */}
          <div className="grid grid-cols-7 border-b border-slate-100 shrink-0">
            {['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'].map((d) => (
              <div key={d} className="py-3 text-center text-[11px] font-bold text-slate-400 tracking-widest">
                {d}
              </div>
            ))}
          </div>

          {/* Monthly grid */}
          <div className="flex-1 overflow-y-auto">
            {loading ? (
              <div className="flex items-center justify-center h-full">
                <Loader2 className="h-8 w-8 animate-spin text-orange-500" />
              </div>
            ) : (
              <div className="grid grid-cols-7" style={{ gridAutoRows: 'minmax(108px, auto)' }}>
                {calendarDays.map((day, idx) => {
                  const dateStr = format(day, 'yyyy-MM-dd');
                  const dayMeetings = allMeetings.filter(m => m.meeting_date === dateStr);
                  const isCurrentMonth = day.getMonth() === currentDate.getMonth();
                  const isToday = isSameDay(day, new Date());
                  const isSelected = isSameDay(day, selectedDate);
                  return (
                    <div
                      key={idx}
                      onClick={() => handleDateSelect(day)}
                      className={cn(
                        "p-2 border-b border-r border-slate-100 cursor-pointer transition-colors hover:bg-slate-50/70",
                        !isCurrentMonth && "bg-slate-50/40",
                        isSelected && !isToday && "bg-indigo-50/30",
                        idx % 7 === 6 && "border-r-0"
                      )}
                    >
                      <div className="flex items-center justify-between mb-1.5">
                        <span className={cn(
                          "h-7 w-7 flex items-center justify-center rounded-full text-sm font-bold transition-colors",
                          !isCurrentMonth && "text-slate-300",
                          isCurrentMonth && !isToday && !isSelected && "text-slate-700",
                          isToday && "bg-orange-500 text-white shadow-sm",
                          isSelected && !isToday && "bg-indigo-600 text-white"
                        )}>
                          {format(day, 'd')}
                        </span>
                        {dayMeetings.length > 0 && isCurrentMonth && (
                          <span className="text-[9px] font-bold text-slate-300 tabular-nums">{dayMeetings.length}</span>
                        )}
                      </div>
                      <div className="space-y-0.5">
                        {dayMeetings.slice(0, 2).map((meeting) => (
                          <div
                            key={meeting.id_main}
                            onClick={(e) => { e.stopPropagation(); setSelectedMeeting(meeting); }}
                            className={cn(
                              "flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold truncate hover:opacity-80 transition-opacity",
                              meeting.meeting_type === 'virtual'
                                ? "bg-blue-100 text-blue-700"
                                : "bg-teal-100 text-teal-700"
                            )}
                          >
                            <span className="font-bold shrink-0 text-[9px] tabular-nums">{meeting.meeting_start_time}</span>
                            <span className="truncate">{meeting.client_name}</span>
                          </div>
                        ))}
                        {dayMeetings.length > 2 && (
                          <p className="text-[10px] text-slate-400 font-semibold px-1 pt-0.5">
                            {dayMeetings.length - 2} more
                          </p>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* ── RIGHT PANEL ── */}
        <div className="w-[280px] shrink-0 bg-white border-l border-slate-100 flex flex-col overflow-hidden">
          <div className="flex-1 overflow-y-auto">

            {/* Task List */}
            <div className="p-5 border-b border-slate-100">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-bold text-slate-900">Task List</h3>
                <button className="text-xs text-orange-500 font-semibold hover:text-orange-600 transition-colors">View all</button>
              </div>
              <div className="space-y-4">
                {upcomingMeetings.slice(0, 3).map((meeting) => (
                  <div
                    key={meeting.id_main}
                    className="flex items-center gap-3 cursor-pointer group"
                    onClick={() => setSelectedMeeting(meeting)}
                  >
                    <span className="text-xs font-bold text-slate-500 tabular-nums shrink-0 w-12">{formatTime(meeting.meeting_start_time)}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-bold text-slate-900 group-hover:text-orange-500 transition-colors truncate">{meeting.client_name}</p>
                      <p className="text-[10px] text-slate-400 truncate">{meeting.client_company || meeting.meeting_venue_area}</p>
                    </div>
                    <Badge className={cn(
                      "text-[8px] font-black uppercase px-2 py-0.5 rounded border-0 shrink-0",
                      meeting.meeting_type === 'virtual' ? "bg-orange-100 text-orange-700" : "bg-emerald-100 text-emerald-700"
                    )}>
                      {meeting.meeting_type === 'virtual' ? 'TEAM' : 'SITE'}
                    </Badge>
                  </div>
                ))}
                {upcomingMeetings.length === 0 && (
                  <p className="text-xs text-slate-400 italic text-center py-2">No upcoming meetings</p>
                )}
              </div>
            </div>

            {/* Contracts */}
            <div className="p-5 border-b border-slate-100">
              <h3 className="text-sm font-bold text-slate-900 mb-4">Contracts</h3>
              <div className="space-y-3">
                {sortedMeetingsForTable.slice(0, 4).map((meeting) => (
                  <div key={meeting.id_main} className="flex items-center gap-3">
                    <div className="h-9 w-9 rounded-lg bg-orange-50 border border-orange-100 flex items-center justify-center shrink-0">
                      <FileText className="h-4 w-4 text-orange-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-bold text-slate-900 truncate">{meeting.meeting_agenda || `Meeting – ${meeting.client_name}`}</p>
                      <p className="text-[10px] text-slate-400 truncate">{meeting.client_company || 'Client'} • {formatDateSafe(meeting.meeting_date, 'dd.MM.yyyy')}</p>
                    </div>
                    <button
                      onClick={() => setSelectedMeeting(meeting)}
                      className="text-[10px] font-bold text-slate-600 border border-slate-200 rounded px-2.5 py-1 hover:bg-slate-50 transition-colors shrink-0"
                    >
                      Open
                    </button>
                  </div>
                ))}
                {sortedMeetingsForTable.length === 0 && (
                  <p className="text-xs text-slate-400 italic text-center py-2">No records</p>
                )}
              </div>
            </div>

            {/* Pinned Message */}
            <div className="p-5">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-bold text-slate-900">Pinned message</h3>
                <button className="text-xs text-orange-500 font-semibold hover:text-orange-600 transition-colors">View all</button>
              </div>
              <div className="space-y-5">
                {upcomingMeetings.slice(0, 2).map((meeting) => (
                  <div key={meeting.id_main} className="flex gap-3">
                    <Avatar className="h-8 w-8 shrink-0">
                      <AvatarFallback className="bg-slate-200 text-slate-600 text-[10px] font-black">
                        {String(meeting.bcl_attendee || 'BC').slice(0, 2).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs font-bold text-slate-900">{meeting.bcl_attendee || 'BCL Team'}</span>
                        <span className="text-[10px] text-slate-400">{formatDateSafe(meeting.meeting_date, 'dd.MM.yyyy')}</span>
                      </div>
                      <p className="text-[11px] text-slate-500 leading-relaxed">
                        {meeting.meeting_agenda || `Upcoming meeting with ${meeting.client_name}.`}
                      </p>
                    </div>
                  </div>
                ))}
                {upcomingMeetings.length === 0 && (
                  <p className="text-xs text-slate-400 italic text-center py-2">No pinned messages</p>
                )}
              </div>
            </div>

          </div>
        </div>

        {/* ── MEETING DETAILS DIALOG ── */}
        <Dialog open={!!selectedMeeting} onOpenChange={(open) => !open && setSelectedMeeting(null)}>
          <DialogContent className="max-w-4xl p-0 overflow-hidden bg-white border-none shadow-2xl rounded-[2.5rem]">
            {selectedMeeting && (
              <>
                {/* HEADER HERO */}
                <div className="relative border-b border-slate-100 bg-white px-10 pt-10 pb-8">
                  <div className="flex flex-col md:flex-row md:items-start justify-between gap-6">
                    <div className="space-y-4">
                      <div className="flex items-center gap-3">
                        <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600 text-[11px] font-black ring-1 ring-indigo-100">MTG</span>
                        <span className="text-[11px] font-black text-slate-400 uppercase tracking-[0.2em]">Record • #{selectedMeeting.id_main}</span>
                      </div>
                      <DialogTitle className="text-4xl font-black text-slate-900 tracking-tight leading-none">
                        {selectedMeeting.client_name}
                      </DialogTitle>
                      <div className="flex flex-wrap items-center gap-5 text-sm font-bold text-slate-500">
                        <div className="flex items-center gap-2"><Building className="h-4 w-4" />{selectedMeeting.client_company || 'Independent Client'}</div>
                        <div className="h-1 w-1 rounded-full bg-slate-300" />
                        <div className="flex items-center gap-2 text-indigo-600">
                          {selectedMeeting.meeting_type === 'virtual' ? <Video className="h-4 w-4" /> : <MapPin className="h-4 w-4" />}
                          <span className="capitalize tracking-tight font-black">{selectedMeeting.meeting_type} Engagement</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <Badge className={cn("px-4 py-1.5 rounded-lg border-none font-black text-[10px] uppercase tracking-widest shadow-sm", getBadgeStatusColor(selectedMeeting.status || 'pending'))}>
                        {selectedMeeting.status || 'Scheduled'}
                      </Badge>
                    </div>
                  </div>
                </div>

                {/* CONTENT GRID */}
                <div className="grid grid-cols-1 lg:grid-cols-12 bg-white">
                  <div className="lg:col-span-7 p-10 space-y-10 overflow-y-auto max-h-[60vh] scrollbar-hide">

                    {/* LOGISTICS HERO */}
                    <div className="grid grid-cols-3 gap-5 p-1.5 bg-slate-50/80 rounded-3xl border border-slate-100 shadow-inner">
                      <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100">
                        <p className="text-[10px] font-black text-slate-400 uppercase mb-2 tracking-widest">Date</p>
                        <p className="text-sm font-black text-slate-900">{formatDateSafe(selectedMeeting.meeting_date, 'MMM dd, yyyy')}</p>
                      </div>
                      <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100">
                        <p className="text-[10px] font-black text-slate-400 uppercase mb-2 tracking-widest">Time</p>
                        <p className="text-sm font-black text-slate-900">{formatTime(selectedMeeting.meeting_start_time)}</p>
                      </div>
                      <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100">
                        <p className="text-[10px] font-black text-slate-400 uppercase mb-2 tracking-widest">Duration</p>
                        <p className="text-sm font-black text-slate-900">{selectedMeeting.meeting_duration || '?'}m</p>
                      </div>
                    </div>

                    <section className="space-y-4">
                      <h3 className="flex items-center gap-2 text-[11px] font-black text-slate-900 uppercase tracking-[0.2em]"><FileText className="h-4 w-4 text-slate-400" /> Agenda & Context</h3>
                      <div className="relative p-6 rounded-3xl bg-indigo-50/40 border border-indigo-100/50">
                        <Quote className="absolute top-6 right-6 h-10 w-10 text-indigo-100/40" />
                        <p className="text-slate-700 leading-relaxed text-sm italic font-medium relative z-10 pr-10">
                          {selectedMeeting.meeting_agenda || 'No specific agenda has been outlined for this discussion.'}
                        </p>
                      </div>
                    </section>

                    <section className="space-y-4">
                      <h3 className="text-[11px] font-black text-slate-900 uppercase tracking-[0.2em]">Stakeholders</h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {[
                          { name: selectedMeeting.bcl_attendee, role: 'Lead Consultant', type: 'internal' },
                          { name: selectedMeeting.client_name, role: 'Client Executive', type: 'external' }
                        ].map((person, i) => (
                          <div key={i} className="flex items-center gap-4 p-5 rounded-2xl bg-white border border-slate-100 hover:shadow-md transition-all group">
                            <div className={cn("h-12 w-12 rounded-2xl flex items-center justify-center text-xs font-black ring-2 ring-inset transition-transform group-hover:scale-110",
                              person.type === 'internal' ? 'bg-slate-900 text-white ring-slate-800' : 'bg-indigo-100 text-indigo-600 ring-indigo-200')}>
                              {String(person.name || "??").slice(0, 2).toUpperCase()}
                            </div>
                            <div>
                              <p className="text-sm font-black text-slate-900 tracking-tight">{person.name || 'Team Member'}</p>
                              <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest">{person.role}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </section>
                  </div>

                  {/* DIALOG SIDEBAR */}
                  <div className="lg:col-span-5 bg-slate-50/50 p-10 border-l border-slate-100 space-y-8 overflow-y-auto max-h-[60vh] scrollbar-hide">
                    <section className="space-y-4">
                      <h3 className="text-[11px] font-black text-slate-400 uppercase tracking-widest">Connectivity</h3>
                      {selectedMeeting.meeting_type === 'virtual' && selectedMeeting.meeting_venue ? (
                        <a
                          href={selectedMeeting.meeting_venue}
                          target="_blank"
                          className="flex flex-col items-center justify-center gap-4 p-8 rounded-3xl bg-white border-2 border-dashed border-indigo-200 hover:border-indigo-500 hover:bg-indigo-50/50 transition-all group shadow-sm"
                        >
                          <div className="h-14 w-14 rounded-2xl bg-indigo-100 flex items-center justify-center group-hover:scale-110 transition-all shadow-sm">
                            <Video className="h-7 w-7 text-indigo-600" />
                          </div>
                          <div className="text-center">
                            <p className="text-sm font-black text-indigo-600">Join Video Session</p>
                            <p className="text-[10px] font-bold text-slate-400 mt-1 uppercase tracking-tighter">Google Meet Encrypted Link</p>
                          </div>
                        </a>
                      ) : (
                        <div className="p-6 rounded-2xl bg-white border border-slate-200 shadow-sm">
                          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Location</p>
                          <div className="flex items-start gap-3">
                            <MapPin className="h-4 w-4 text-emerald-500 mt-0.5" />
                            <p className="text-sm font-bold text-slate-800 leading-tight">{selectedMeeting.meeting_venue || selectedMeeting.meeting_venue_area || 'Venue details pending'}</p>
                          </div>
                        </div>
                      )}
                    </section>

                    <section className="space-y-4">
                      <h3 className="text-[11px] font-black text-slate-400 uppercase tracking-widest">Quick Contacts</h3>
                      <div className="space-y-2">
                        {[
                          { label: 'Client', value: selectedMeeting.client_mobile },
                          { label: 'Consultant', value: selectedMeeting.bcl_attendee_mobile }
                        ].map((contact, i) => (
                          <div key={i} className="flex items-center justify-between p-4 bg-white rounded-xl border border-slate-100 shadow-sm hover:shadow-md transition-all">
                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{contact.label}</span>
                            <a href={`tel:${contact.value}`} className="text-xs font-black text-slate-900 hover:text-indigo-600 transition-colors tabular-nums">{contact.value || 'N/A'}</a>
                          </div>
                        ))}
                      </div>
                    </section>
                  </div>
                </div>

                {/* FOOTER ACTION BAR */}
                <DialogFooter className="px-10 py-6 bg-white border-t border-slate-100 flex items-center justify-between gap-4">
                  <div className="flex flex-wrap items-center gap-3">
                    <Button variant="outline" className="h-12 rounded-2xl px-6 text-[11px] font-black uppercase tracking-widest border-slate-200 hover:bg-slate-50 transition-all">
                      <RefreshCw className="mr-2 h-4 w-4" /> Reschedule
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => { setDeletingMeeting(selectedMeeting); }}
                      className="h-12 rounded-2xl px-6 text-[11px] font-black uppercase tracking-widest border-rose-100 text-rose-600 hover:bg-rose-50 hover:border-rose-200 transition-all"
                    >
                      <Trash2 className="mr-2 h-4 w-4" /> Delete Meeting
                    </Button>
                  </div>
                  <Button variant="ghost" onClick={() => setSelectedMeeting(null)} className="text-[11px] font-black text-slate-400 hover:text-slate-900 uppercase tracking-[0.2em] transition-colors">
                    Close Details
                  </Button>
                </DialogFooter>
              </>
            )}
          </DialogContent>
        </Dialog>

        {/* --- 4. ALERT DIALOGS --- */}
        <AlertDialog open={!!deletingMeeting} onOpenChange={(open) => !open && setDeletingMeeting(null)}>
          <AlertDialogContent className="rounded-[2rem] border-none shadow-2xl p-10 max-w-md">
            <AlertDialogHeader>
              <div className="h-16 w-16 bg-rose-50 text-rose-600 rounded-3xl flex items-center justify-center mb-6 mx-auto">
                <Trash2 className="h-8 w-8" />
              </div>
              <AlertDialogTitle className="text-2xl font-black text-center text-slate-900 tracking-tight">Confirm Deletion</AlertDialogTitle>
              <AlertDialogDescription className="text-center text-slate-500 font-medium pt-2">
                Are you sure you want to remove the booking for <span className="font-black text-slate-900 underline decoration-rose-200 underline-offset-4">{deletingMeeting?.client_name}</span>?
                <br /><br />
                This action is irreversible and will remove all associated notes.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter className="flex-col sm:flex-row gap-3 mt-8">
              <AlertDialogCancel className="h-12 rounded-2xl font-black text-[11px] uppercase tracking-widest border-slate-200 hover:bg-slate-50 m-0 flex-1">Keep Record</AlertDialogCancel>
              <AlertDialogAction
                onClick={deleteMeeting}
                disabled={isDeleting}
                className="h-12 rounded-2xl font-black text-[11px] uppercase tracking-widest bg-rose-600 text-white hover:bg-rose-700 m-0 flex-1 shadow-lg shadow-rose-100"
              >
                {isDeleting ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Yes, Delete Permanently'}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

      </div>
    </TooltipProvider>
  );
};

// Helper component for consistent detail items in the dialog
const DetailItem = ({ icon: Icon, label, value, href }: { icon: React.ElementType, label: string, value: string | undefined, href?: string }) => {
  if (!value) return null;

  const content = href ? (
    <a href={href} className="text-blue-600 hover:underline break-all" target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()}>
      {value}
    </a>
  ) : (
    <span className="text-gray-800 break-words">{value}</span>
  );

  return (
    <div className="flex items-start">
      <Icon className="h-4 w-4 text-gray-400 mr-2 mt-0.5 flex-shrink-0" />
      <div className="flex-1">
        <p className="text-xs font-medium text-gray-500">{label}</p>
        {content}
      </div>
    </div>
  );
};

// Helper function to check for conflicts on the selected date
const hasMeetingConflicts = (meetingsOnDate: Meeting[]): boolean => {
  for (let i = 0; i < meetingsOnDate.length; i++) {
    for (let j = i + 1; j < meetingsOnDate.length; j++) {
      if (meetingsOverlap(meetingsOnDate[i], meetingsOnDate[j])) {
        return true; // Found an overlap
      }
    }
  }
  return false; // No overlaps found
};


export default CalendarView;
