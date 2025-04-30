// @ts-nocheck
"use client"; // Ensures this component runs on the client side

import React, { useState, useEffect, useCallback } from 'react';
// Remove direct Supabase import as we'll use the client
import { format, startOfMonth, endOfMonth, eachDayOfInterval, getDay, add, isSameDay, isBefore, parseISO, getHours, getMinutes, isWithinInterval, format as formatDate } from 'date-fns';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, Clock, Trash2, Info, Loader2, Check, Video, MapPin, Building, User, Phone, Mail, PlusCircle, ExternalLink, MoreHorizontal, MessageSquare, UserPlus, CheckCircle, XCircle, LinkIcon, RefreshCw } from 'lucide-react';
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
  const [activeTab, setActiveTab] = useState<string>("table"); // Default view

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
        .from('meetings')
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
        .from('meetings')
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
        table: 'meetings'
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

  return (
    // Use TooltipProvider at the root for any tooltips within
    <TooltipProvider>
      <div className="flex flex-col lg:flex-row gap-6 p-4 md:p-6">

        {/* Sidebar: Calendar and Upcoming Meetings */}
        <div className="w-full lg:w-80 xl:w-96 flex-shrink-0 space-y-6">
          <Card className="overflow-hidden shadow-sm border-gray-200">
            <CardHeader className="bg-gradient-to-r from-blue-50 to-teal-50 px-4 py-3 border-b">
              <CardTitle className="text-lg text-blue-700">Calendar</CardTitle>
            </CardHeader>
            <CardContent className="p-3">
              {/* Shadcn Calendar Component */}
              <Calendar
                mode="single"
                selected={selectedDate}
                onSelect={handleDateSelect} // Use the safe handler
                month={currentDate}       // Control the displayed month
                onMonthChange={setCurrentDate} // Allow user to navigate months
                className="rounded-md border"
                components={{
                  DayContent: DayContent // Use custom DayContent
                }}
              />
            </CardContent>
          </Card>

          <Card className="overflow-hidden shadow-sm border-gray-200">
            <CardHeader className="bg-gradient-to-r from-green-50 to-cyan-50 px-4 py-3 border-b">
              <CardTitle className="text-lg text-green-700">Upcoming Meetings</CardTitle>
              <CardDescription>Next 7 days</CardDescription>
            </CardHeader>
            <CardContent className="p-3 max-h-[300px] overflow-y-auto">
              {upcomingMeetings.length > 0 ? (
                <div className="space-y-2">
                  {upcomingMeetings.slice(0, 10).map(meeting => ( // Show max 10 upcoming
                    <div
                      key={meeting.id_main}
                      onClick={() => {
                        handleDateSelect(parseISO(meeting.meeting_date)); // Navigate to meeting date
                        // Optionally open details directly: setSelectedMeeting(meeting);
                      }}
                      className="p-2 text-xs border rounded-md cursor-pointer hover:bg-gray-100 transition-colors"
                    >
                      <p className="font-medium truncate text-gray-800">{meeting.client_name}</p>
                      <div className="flex justify-between items-center mt-1 text-gray-600">
                        <p>{formatDateSafe(meeting.meeting_date, 'EEE, dd MMM')}</p>
                        <Badge variant="outline" className="text-[10px] px-1.5 py-0.5">
                          {formatTime(meeting.meeting_start_time)}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-gray-500 text-center py-4">No upcoming meetings found.</p>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Main Content Area: Header, Tabs (Timeline/Table) */}
        <div className="flex-1 space-y-6 min-w-0"> {/* min-w-0 prevents flex item overflow */}
          {/* Header and Date Navigation */}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pb-4 border-b">
            <div>
              <h1 className="text-2xl font-bold text-gray-800">
                Schedule for: {format(selectedDate, 'EEEE, dd MMMM yyyy')}
              </h1>
              {hasMeetingConflicts(meetingsForSelectedDate) && (
                <Badge variant="destructive" className="mt-1">
                  <Info className="h-3 w-3 mr-1" /> Potential Conflicts
                </Badge>
              )}
            </div>
            <div className="flex items-center space-x-2 flex-shrink-0">
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="outline" size="icon" onClick={() => changeDay(-1)}>
                    <ChevronLeft className="h-4 w-4" />
                    <span className="sr-only">Previous Day</span>
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Previous Day</TooltipContent>
              </Tooltip>
              <Button variant="outline" size="sm" onClick={goToToday}>
                Today
              </Button>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="outline" size="icon" onClick={() => changeDay(1)}>
                    <ChevronRight className="h-4 w-4" />
                    <span className="sr-only">Next Day</span>
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Next Day</TooltipContent>
              </Tooltip>
            </div>
          </div>

          {/* Tabs for switching between Timeline and Table view */}
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="mb-4 grid w-full grid-cols-2 md:w-auto md:inline-flex">
              <TabsTrigger value="timeline" className="flex items-center justify-center gap-2">
                <Clock className="h-4 w-4" />
                <span className="hidden sm:inline">Timeline View</span>
                <span className="sm:hidden">Timeline</span>
              </TabsTrigger>
              <TabsTrigger value="table" className="flex items-center justify-center gap-2">
                <CalendarIcon className="h-4 w-4" />
                <span className="hidden sm:inline">Meetings on {format(selectedDate, 'dd/MM/yyyy')}</span>
                <span className="sm:hidden">List View</span>
              </TabsTrigger>
            </TabsList>

            {/* Timeline View Content */}
            <TabsContent value="timeline">
              <Card className="border border-gray-200 shadow-sm overflow-hidden">
                {/* Use CardHeader for consistency if needed, or just dive into content */}
                {/* Removed header as title is now above tabs */}
                <CardContent className="p-0">
                  {/* Fixed height container for scrolling */}
                  <div className="h-[60vh] md:h-[70vh] overflow-y-auto relative">
                    {loading ? (
                      <div className="absolute inset-0 flex items-center justify-center bg-white/80 z-50">
                        <Loader2 className="h-8 w-8 animate-spin text-blue-500 mx-auto mb-2" />
                        <span className="text-blue-600 font-medium">Loading schedule...</span>
                      </div>
                    ) : (
                      <div className="grid grid-cols-[55px_1fr] sm:grid-cols-[60px_1fr]"> 
                        {/* Time Labels Column (Sticky) */}
                        <div className="border-r bg-gray-50/70 sticky top-0 z-20 h-full"> 
                          {timeSlots.map((slot, index) => (
                            <div
                              key={slot}
                              className={cn(
                                "h-16 px-3 flex items-center justify-end text-xs font-medium text-gray-500",
                                index !== 0 ? 'border-t border-gray-200' : '',
                                "whitespace-nowrap" // Prevent wrapping
                              )}
                            >
                              <span className="truncate">{formatTime(slot)}</span>
                            </div>
                          ))}
                        </div>

                        {/* Meeting Slots Area */}
                        <div className="relative">
                          {/* Background Grid Lines */}
                          {timeSlots.map((slot, index) => (
                            <div
                              key={slot}
                              className={cn(
                                "h-16", // Height matches time slot labels
                                index !== 0 ? 'border-t border-gray-100' : '', // Horizontal lines
                                index % 2 === 0 ? 'bg-gray-50/30' : '' // Alternate row shading
                              )}
                            />
                          ))}

                          {/* Current Time Indicator */}
                          {isSameDay(selectedDate, new Date()) && (
                            <div
                              className="absolute left-[-2px] right-0 border-t-2 border-red-500 z-30 pointer-events-none" // Ensure above meetings
                              style={{
                                // Calculate position based on current time (7am = 0)
                                top: `${Math.max(0, (getHours(new Date()) - 7) * 2 + getMinutes(new Date()) / 30) * 4}rem`,
                              }}
                            >
                              <div className="absolute -left-1.5 -top-[5px] w-3 h-3 rounded-full bg-red-500 border-2 border-white"></div>
                              {/* Optionally add text label */}
                              {/* <span className="absolute right-2 -top-2.5 text-xs text-red-600 bg-white px-1 rounded">Now</span> */}
                            </div>
                          )}

                          {/* Render Meetings */}
                          {meetingsForSelectedDate.map((meeting, meetingIndex) => {
                            // Instead of finding exact match, find closest time slot
                            const startSlotIndex = findClosestTimeSlot(meeting.meeting_start_time);
                            
                            const durationSlots = getMeetingDurationInSlots(meeting);
                            const heightInRem = durationSlots * 4; // 4rem per 30-min slot (16 * 4 = 64px)

                            // --- Overlap Calculation ---
                            // Find meetings that visually overlap with this one
                            const overlappingMeetings = meetingsForSelectedDate.filter(m =>
                              m.id_main !== meeting.id_main && meetingsOverlap(m, meeting)
                            );
                            const overlapGroup: Meeting[] = [meeting, ...overlappingMeetings].sort((a, b) => a.meeting_start_time.localeCompare(b.meeting_start_time) || a.id_main - b.id_main);
                            const totalInGroup = overlapGroup.length;
                            const positionIndex = overlapGroup.findIndex(m => m.id_main === meeting.id_main); // 0-based index within the overlap group

                            const widthPercentage = totalInGroup > 1 ? (100 / totalInGroup) - 1 : 98; // Leave small gap (1% each side approx)
                            const leftPercentage = totalInGroup > 1 ? positionIndex * (100 / totalInGroup) + 1 : 1; // Start slightly indented

                            const isVirtual = meeting.meeting_type === 'virtual';
                            const bgColor = isVirtual ? 'bg-blue-100/80 hover:bg-blue-200/80 border-blue-400' : 'bg-teal-100/70 hover:bg-teal-200/70 border-teal-400';
                            const textColor = isVirtual ? 'text-blue-800' : 'text-teal-900';

                            return (
                              <div
                                key={meeting.id_main}
                                className={cn(
                                  `absolute rounded-md overflow-hidden border-l-4 shadow-sm cursor-pointer transition-all duration-150 ease-in-out z-10`, // Base styles, z-10 for meetings
                                  bgColor, textColor
                                )}
                                style={{
                                  top: `${startSlotIndex * 4}rem`, // 4rem = 64px = h-16
                                  height: `${heightInRem}rem`,
                                  left: `${leftPercentage}%`,
                                  width: `${widthPercentage}%`,
                                }}
                                onClick={() => setSelectedMeeting(meeting)}
                              >
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <div className="flex flex-col h-full p-0.5 xs:p-1 sm:p-2">
                                      <p className="font-semibold text-[10px] xs:text-xs sm:text-sm truncate leading-tight">{meeting.client_name}</p>
                                      <p className="text-[8px] xs:text-[10px] sm:text-xs opacity-80 truncate leading-tight">{meeting.client_company}</p>
                                      {durationSlots > 1 && ( // Only show time if more than 1 slot high
                                        <p className="text-[8px] xs:text-[10px] sm:text-xs mt-0.5 sm:mt-1 font-medium opacity-90 leading-tight">
                                          {formatTime(meeting.meeting_start_time)} - {formatTime(meeting.meeting_end_time)}
                                        </p>
                                      )}
                                      {durationSlots > 2 && ( // Show location/type if tall enough
                                        <div className="text-[8px] xs:text-[10px] sm:text-xs mt-auto pt-0.5 sm:pt-1 opacity-80 truncate flex items-center gap-0.5 sm:gap-1">
                                          {isVirtual ? <Video className="h-2 w-2 xs:h-2.5 xs:w-2.5 sm:h-3 sm:w-3 flex-shrink-0" /> : <MapPin className="h-2 w-2 xs:h-2.5 xs:w-2.5 sm:h-3 sm:w-3 flex-shrink-0" />}
                                          <span className="truncate">{isVirtual ? 'Virtual Meeting' : meeting.meeting_venue || meeting.meeting_venue_area}</span>
                                          
                                          {/* Add Join Button for virtual meetings */}
                                          {isVirtual && meeting.meeting_venue && meeting.meeting_venue.startsWith('http') && (
                                            <Button 
                                              variant="ghost" 
                                              size="icon" 
                                              className="h-4 w-4 xs:h-5 xs:w-5 ml-auto p-0 text-blue-600 hover:text-blue-800 hover:bg-blue-100"
                                              onClick={(e) => {
                                                e.stopPropagation(); // Prevent opening the details dialog
                                                window.open(meeting.meeting_venue, '_blank', 'noopener,noreferrer');
                                              }}
                                            >
                                              <ExternalLink className="h-2.5 w-2.5 xs:h-3 xs:w-3 sm:h-3.5 sm:w-3.5" />
                                              <span className="sr-only">Join Meeting</span>
                                            </Button>
                                          )}
                                        </div>
                                      )}
                                    </div>
                                  </TooltipTrigger>
                                  <TooltipContent side="right" align="start">
                                    <p className="font-medium">{meeting.client_name} ({meeting.client_company})</p>
                                    <p>{formatTime(meeting.meeting_start_time)} - {formatTime(meeting.meeting_end_time)}</p>
                                    <p>{meeting.meeting_venue}</p>
                                  </TooltipContent>
                                </Tooltip>
                              </div>
                            );
                          })}
                          {/* Render message if no meetings */}
                          {meetingsForSelectedDate.length === 0 && !loading && (
                            <div className="absolute inset-0 flex items-center justify-center text-gray-500">
                              <p>No meetings scheduled for this day.</p>
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Table View Content */}
            <TabsContent value="table">
              <Card className="border border-gray-200 shadow-sm">
                <CardHeader className="px-6 py-4 border-b">
                  <CardTitle className="text-lg">
                    <span className="hidden sm:inline">Meetings on {format(selectedDate, 'dd/MM/yyyy')}</span>
                    <span className="sm:hidden">Meetings Today</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-10 text-center">#</TableHead>
                          <TableHead className="hidden md:table-cell">Date</TableHead>
                          <TableHead>Time</TableHead>
                          <TableHead>Client</TableHead>
                          <TableHead className="hidden sm:table-cell">Company</TableHead>
                          <TableHead className="hidden lg:table-cell">Venue</TableHead>
                          <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {loading ? (
                          <TableRow>
                            <TableCell colSpan={7} className="h-24 text-center">
                              <Loader2 className="h-6 w-6 animate-spin text-blue-500 mx-auto mb-2" />
                              <span className="text-blue-600 font-medium">Loading meetings...</span>
                            </TableCell>
                          </TableRow>
                        ) : meetingsForSelectedDate.length === 0 ? (
                          <TableRow>
                            <TableCell colSpan={7} className="h-24 text-center">
                              <p className="text-gray-500">No meetings scheduled for {format(selectedDate, 'EEEE, dd MMMM yyyy')}</p>
                            </TableCell>
                          </TableRow>
                        ) : (
                          meetingsForSelectedDate.map((meeting, index) => (
                            <TableRow key={meeting.id_main} className="cursor-pointer hover:bg-gray-50 h-10" onClick={() => setSelectedMeeting(meeting)}>
                              <TableCell className="font-medium text-center text-gray-500 py-1">{index + 1}</TableCell>
                              <TableCell className="font-medium py-1 hidden md:table-cell">{formatDateSafe(meeting.meeting_date, 'dd/MM/yyyy')}</TableCell>
                              <TableCell className="py-1">
                                <div className="flex flex-col">
                                  <span className="font-medium">{formatTime(meeting.meeting_start_time)}</span>
                                  <span className="text-xs text-gray-500">{formatTime(meeting.meeting_end_time)}</span>
                                </div>
                              </TableCell>
                              <TableCell className="py-1">
                                <div className="flex flex-col">
                                  <span className="font-medium">{meeting.client_name}</span>
                                  <span className="text-xs text-gray-500 sm:hidden">{meeting.client_company}</span>
                                </div>
                              </TableCell>
                              <TableCell className="py-1 hidden sm:table-cell">{meeting.client_company}</TableCell>
                              <TableCell className="py-1 hidden lg:table-cell">
                                <div className="flex items-center gap-1">
                                  {meeting.meeting_type === 'virtual' ? 
                                    <Video className="h-3.5 w-3.5 text-blue-600 shrink-0" /> : 
                                    <MapPin className="h-3.5 w-3.5 text-teal-600 shrink-0" />
                                  }
                                  <span className="truncate max-w-[150px]">
                                    {meeting.meeting_type === 'virtual' ? 'Virtual Meeting' : meeting.meeting_venue || meeting.meeting_venue_area}
                                  </span>
                                </div>
                              </TableCell>
                              <TableCell className="text-right">
                                <div className="flex items-center justify-end space-x-1">
                                  {meeting.meeting_type === 'virtual' && meeting.meeting_venue && meeting.meeting_venue.startsWith('http') && (
                                    <Button 
                                      variant="ghost" 
                                      size="icon" 
                                      className="h-8 w-8 text-blue-600 hover:bg-blue-50"
                                      onClick={(e) => {
                                        e.stopPropagation(); // Prevent opening the details dialog
                                        window.open(meeting.meeting_venue, '_blank');
                                      }}
                                    >
                                      <ExternalLink className="h-4 w-4" />
                                      <span className="sr-only">Join Meeting</span>
                                    </Button>
                                  )}
                                  <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                      <Button variant="ghost" size="icon" className="h-8 w-8">
                                        <MoreHorizontal className="h-4 w-4" />
                                        <span className="sr-only">Open menu</span>
                                      </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="end">
                                      <DropdownMenuItem onClick={(e) => {
                                        e.stopPropagation();
                                        setSelectedMeeting(meeting);
                                      }}>
                                        View Details
                                      </DropdownMenuItem>
                                      <DropdownMenuSeparator />
                                      <DropdownMenuItem onClick={(e) => {
                                        e.stopPropagation();
                                        setDeletingMeeting(meeting);
                                      }} className="text-red-600">
                                        Delete Meeting
                                      </DropdownMenuItem>
                                    </DropdownMenuContent>
                                  </DropdownMenu>
                                </div>
                              </TableCell>
                            </TableRow>
                          ))
                        )}
                      </TableBody>
                    </Table>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>

        {/* Meeting Details Dialog */}
        {selectedMeeting && (
          <Dialog open={!!selectedMeeting} onOpenChange={(open) => !open && setSelectedMeeting(null)}>
            <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
              <DialogHeader className="pb-2 border-b">
                <DialogTitle className="text-lg font-semibold flex items-center gap-2">
                  {selectedMeeting.meeting_type === 'virtual' ? 
                    <Video className="h-5 w-5 text-blue-600" /> : 
                    <MapPin className="h-5 w-5 text-teal-600" />
                  }
                  Meeting Details
                </DialogTitle>
                <DialogDescription className="text-sm">
                  {selectedMeeting.meeting_type === 'virtual' ? 'Virtual Meeting' : 'In-Person Meeting'} with {selectedMeeting.client_name}
                </DialogDescription>
              </DialogHeader>

              {/* Two-column layout for details, similar to dashboard */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 py-4">
                {/* Column 1 */}
                <div className="space-y-3 sm:space-y-4">
                  {/* Client Info Card */}
                  <Card className="border-gray-200 shadow-sm">
                    <CardHeader className="pb-1 pt-2 px-3 sm:pb-2 sm:pt-3 sm:px-4">
                      <CardTitle className="text-sm sm:text-base font-semibold text-gray-700 flex items-center">
                        <User className="h-3.5 w-3.5 mr-1.5 sm:h-4 sm:w-4 sm:mr-2 text-blue-600" />
                        Client Information
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="px-3 pb-2 sm:px-4 sm:pb-3">
                      <div className="grid grid-cols-1 gap-y-2 sm:gap-y-2.5">
                        <div className="space-y-0.5">
                          <h4 className="text-xs font-medium text-gray-500">Name</h4>
                          <p className="text-sm font-medium">{selectedMeeting.client_name}</p>
                        </div>
                        <div className="space-y-0.5">
                          <h4 className="text-xs font-medium text-gray-500">Company</h4>
                          <p className="text-sm">{selectedMeeting.client_company || 'N/A'}</p>
                        </div>
                        {selectedMeeting.client_email && (
                          <div className="space-y-0.5">
                            <h4 className="text-xs font-medium text-gray-500">Email</h4>
                            <p className="text-sm flex items-center">
                              <Mail className="h-3.5 w-3.5 mr-1.5 text-gray-400" />
                              <a href={`mailto:${selectedMeeting.client_email}`} className="text-blue-600 hover:underline">
                                {selectedMeeting.client_email}
                              </a>
                            </p>
                          </div>
                        )}
                        {selectedMeeting.client_mobile && (
                          <div className="space-y-0.5">
                            <h4 className="text-xs font-medium text-gray-500">Mobile</h4>
                            <p className="text-sm flex items-center">
                              <Phone className="h-3.5 w-3.5 mr-1.5 text-gray-400" />
                              <a href={`tel:${selectedMeeting.client_mobile}`} className="text-blue-600 hover:underline">
                                {selectedMeeting.client_mobile}
                              </a>
                            </p>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>

                  {/* Meeting Details Card */}
                  <Card className="border-gray-200 shadow-sm">
                    <CardHeader className="pb-1 pt-2 px-3 sm:pb-2 sm:pt-3 sm:px-4">
                      <CardTitle className="text-sm sm:text-base font-semibold text-gray-700 flex items-center">
                        <CalendarIcon className="h-3.5 w-3.5 mr-1.5 sm:h-4 sm:w-4 sm:mr-2 text-green-600" />
                        Meeting Details
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="px-3 pb-2 sm:px-4 sm:pb-3">
                      <div className="grid grid-cols-2 gap-x-3 gap-y-2 sm:gap-x-4 sm:gap-y-2.5">
                        <div className="space-y-0.5">
                          <h4 className="text-xs font-medium text-gray-500">Date</h4>
                          <p className="text-sm">{formatDateSafe(selectedMeeting.meeting_date, 'EEE, dd MMM yyyy')}</p>
                        </div>
                        <div className="space-y-0.5">
                          <h4 className="text-xs font-medium text-gray-500">Day</h4>
                          <p className="text-sm">{formatDateSafe(selectedMeeting.meeting_date, 'EEEE')}</p>
                        </div>
                        <div className="space-y-0.5">
                          <h4 className="text-xs font-medium text-gray-500">Start</h4>
                          <p className="text-sm flex items-center">
                            <Clock className="h-3.5 w-3.5 mr-1.5 text-gray-400" />
                            {formatTime(selectedMeeting.meeting_start_time)}
                          </p>
                        </div>
                        <div className="space-y-0.5">
                          <h4 className="text-xs font-medium text-gray-500">End</h4>
                          <p className="text-sm">{formatTime(selectedMeeting.meeting_end_time)}</p>
                        </div>
                        <div className="space-y-0.5">
                          <h4 className="text-xs font-medium text-gray-500">Duration</h4>
                          <p className="text-sm">{selectedMeeting.meeting_duration || '?'} min</p>
                        </div>
                        <div className="space-y-0.5">
                          <h4 className="text-xs font-medium text-gray-500">Status</h4>
                          <div className="flex items-center">
                            <Badge className={`text-xs ${getBadgeStatusColor(selectedMeeting.status || 'pending')}`}>
                              {selectedMeeting.status ? selectedMeeting.status.charAt(0).toUpperCase() + selectedMeeting.status.slice(1) : 'Pending'}
                            </Badge>
                          </div>
                        </div>
                        {/* Span venue across columns for better fit */}
                        <div className="col-span-2">
                          <h4 className="text-xs font-medium text-gray-500">Type</h4>
                          <p className="text-sm">{selectedMeeting.meeting_type === 'virtual' ? 'Virtual Meeting' : 'In-Person Meeting'}</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* Column 2 */}
                <div className="space-y-3 sm:space-y-4">
                  {/* Agenda Card */}
                  <Card className="border-gray-200 shadow-sm">
                    <CardHeader className="pb-1 pt-2 px-3 sm:pb-2 sm:pt-3 sm:px-4">
                      <CardTitle className="text-sm sm:text-base font-semibold text-gray-700 flex items-center">
                        <MessageSquare className="h-3.5 w-3.5 mr-1.5 sm:h-4 sm:w-4 sm:mr-2 text-purple-600" />
                        Agenda
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="px-3 pb-2 sm:px-4 sm:pb-3">
                      <div className="bg-gray-50 p-2 rounded-md border border-gray-200 text-xs sm:text-sm text-gray-700 max-h-24 overflow-y-auto">
                        <p>{selectedMeeting.meeting_agenda || 'No agenda provided.'}</p>
                      </div>
                    </CardContent>
                  </Card>

                  {/* BCL Attendee Card */}
                  {selectedMeeting.bcl_attendee && (
                    <Card className="border-gray-200 shadow-sm">
                      <CardHeader className="pb-1 pt-2 px-3 sm:pb-2 sm:pt-3 sm:px-4">
                        <CardTitle className="text-sm sm:text-base font-semibold text-gray-700 flex items-center">
                          <UserPlus className="h-3.5 w-3.5 mr-1.5 sm:h-4 sm:w-4 sm:mr-2 text-orange-600" />
                          BCL Attendee
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-2 px-3 pb-2 sm:space-y-2.5 sm:px-4 sm:pb-3">
                        <div className="space-y-0.5">
                          <h4 className="text-xs font-medium text-gray-500">Name</h4>
                          <p className="text-sm">{selectedMeeting.bcl_attendee}</p>
                        </div>
                        {selectedMeeting.bcl_attendee_mobile && (
                          <div className="space-y-0.5">
                            <h4 className="text-xs font-medium text-gray-500">Mobile</h4>
                            <p className="text-sm flex items-center">
                              <Phone className="h-3.5 w-3.5 mr-1.5 text-gray-400" />
                              <a href={`tel:${selectedMeeting.bcl_attendee_mobile}`} className="text-blue-600 hover:underline">
                                {selectedMeeting.bcl_attendee_mobile}
                              </a>
                            </p>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  )}

                  {/* Meeting Link Card */}
                  {selectedMeeting.meeting_type === 'virtual' && selectedMeeting.meeting_venue && (
                    <Card className="border-gray-200 shadow-sm">
                      <CardHeader className="pb-1 pt-2 px-3 sm:pb-2 sm:pt-3 sm:px-4">
                        <CardTitle className="text-sm sm:text-base font-semibold text-gray-700 flex items-center">
                          <LinkIcon className="h-3.5 w-3.5 mr-1.5 sm:h-4 sm:w-4 sm:mr-2 text-cyan-600" />
                          Meeting Link
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="px-3 pb-2 sm:px-4 sm:pb-3">
                        <div className="flex items-center flex-wrap gap-2">
                          {selectedMeeting.meeting_venue.startsWith('http') ? (
                            <>
                              <a 
                                href={selectedMeeting.meeting_venue} 
                                target="_blank" 
                                rel="noopener noreferrer"
                                className="text-sm text-blue-600 hover:underline break-all" // Changed from truncate to break-all
                                onClick={(e) => {
                                  // This allows the link to be clicked directly
                                  e.stopPropagation();
                                }}
                              >
                                {selectedMeeting.meeting_venue}
                              </a>
                              <Button 
                                variant="outline" 
                                size="sm" 
                                className="bg-blue-50 text-blue-700 hover:text-blue-800 hover:bg-blue-100 border-blue-200"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  window.open(selectedMeeting.meeting_venue, '_blank', 'noopener,noreferrer');
                                }}
                              >
                                <ExternalLink className="h-3.5 w-3.5 mr-1.5" />
                                Join Meeting
                              </Button>
                            </>
                          ) : (
                            <p className="text-sm text-gray-600 truncate flex-1">
                              {selectedMeeting.meeting_venue || 'No meeting link provided'}
                            </p>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  )}
                </div>
              </div>

              {/* Footer Actions */}
              <DialogFooter className="flex flex-col sm:flex-row gap-2 sm:justify-between items-center mt-4 pt-3 sm:mt-5 sm:pt-4 border-t">
                {/* Action buttons */}
                <div className="flex flex-wrap gap-2 justify-center sm:justify-start w-full sm:w-auto">
                  {selectedMeeting.status !== 'canceled' && selectedMeeting.status !== 'completed' && (
                    <>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          // Reschedule logic would go here
                          // setRescheduleDialogOpen(true);
                        }}
                        className="border-blue-300 text-blue-700 hover:bg-blue-50 px-3 py-1.5 text-xs sm:text-sm"
                      >
                        <RefreshCw className="h-3.5 w-3.5 mr-1 sm:mr-1.5" />
                        Reschedule
                      </Button>
                      
                      {selectedMeeting.status !== 'confirmed' && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            // Confirm meeting logic would go here
                          }}
                          className="border-green-300 text-green-700 hover:bg-green-50 px-3 py-1.5 text-xs sm:text-sm"
                        >
                          <CheckCircle className="h-3.5 w-3.5 mr-1 sm:mr-1.5" />
                          Confirm
                        </Button>
                      )}
                      
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          // Cancel meeting logic would go here
                        }}
                        className="border-red-300 text-red-700 hover:bg-red-50 px-3 py-1.5 text-xs sm:text-sm"
                      >
                        <XCircle className="h-3.5 w-3.5 mr-1 sm:mr-1.5" />
                        Cancel Mtg
                      </Button>
                      
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          // Mark as completed logic would go here
                        }}
                        className="border-purple-300 text-purple-700 hover:bg-purple-50 px-3 py-1.5 text-xs sm:text-sm"
                      >
                        <CheckCircle className="h-3.5 w-3.5 mr-1 sm:mr-1.5" />
                        Mark Done
                      </Button>
                    </>
                  )}
                  
                  {(selectedMeeting.status === 'completed' || selectedMeeting.status === 'canceled') && (
                    <span className="text-xs sm:text-sm text-gray-500 italic px-3 py-1.5">
                      This meeting is {selectedMeeting.status}.
                    </span>
                  )}
                  
                  {/* Delete Meeting Button with AlertDialog */}
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button
                        variant="outline"
                        size="sm"
                        className="border-red-300 bg-red-50 text-red-700 hover:bg-red-100 px-3 py-1.5 text-xs sm:text-sm"
                      >
                        <Trash2 className="h-3.5 w-3.5 mr-1 sm:mr-1.5" />
                        Delete
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent onClick={(e) => e.stopPropagation()}>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Delete Meeting</AlertDialogTitle>
                        <AlertDialogDescription>
                          Are you sure you want to delete this meeting with <span className="font-semibold">{selectedMeeting.client_name}</span> on {format(new Date(selectedMeeting.meeting_date), 'MMMM d, yyyy')} at {selectedMeeting.meeting_start_time}?
                          <br />
                          <br />
                          This action cannot be undone.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={() => {
                            setDeletingMeeting(selectedMeeting);
                            deleteMeeting();
                          }}
                          className="bg-red-600 hover:bg-red-700 text-white"
                          disabled={isDeleting}
                        >
                          {isDeleting ? (
                            <>
                              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                              Deleting...
                            </>
                          ) : (
                            "Delete Meeting"
                          )}
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
                
                {/* Close button */}
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => setSelectedMeeting(null)}
                  className="w-full sm:w-auto mt-2 sm:mt-0 px-3 py-1.5 text-xs sm:text-sm"
                >
                  Close
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )}
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