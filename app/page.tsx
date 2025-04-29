/* eslint-disable react/no-unescaped-entities */
// @ts-nocheck
"use client"

import React, { useState, useEffect, useRef } from 'react';
import { createClient } from '@supabase/supabase-js';
import { updateEvent } from './schedule/reshedule';
import { cancelEvent } from './schedule/cancel';
import { ChangeEvent } from 'react';
import SpeechRecognition, { useSpeechRecognition } from 'react-speech-recognition';

// ShadCN UI components
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Toaster } from "@/components/ui/toaster";
import { useToast } from "@/hooks/use-toast"; // Corrected import path

// Icons
import { Calendar, Clock, Mic, MicOff, UserPlus, Building, MapPin, CheckCircle, XCircle, RefreshCw, MessageSquare, Table2, LayoutGrid, Link as LinkIcon, Phone, Video } from 'lucide-react'; // Added Phone icon

const supabaseUrl = 'https://zyszsqgdlrpnunkegipk.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inp5c3pzcWdkbHJwbnVua2VnaXBrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MDgzMjc4OTQsImV4cCI6MjAyMzkwMzg5NH0.fK_zR8wR6Lg8HeK7KBTTnyF0zoyYBqjkeWeTKqi32ws';
const supabase = createClient(supabaseUrl, supabaseKey);

// --- Helper Function for Formatting ---
const formatTime = (timeString) => {
  if (!timeString || typeof timeString !== 'string') return 'N/A';
  const parts = timeString.split(':');
  if (parts.length < 2) return timeString; // Return original if format is unexpected
  return `${parts[0]}:${parts[1]}`; // Format as HH:MM
};

const Dashboard = () => {
  // Interface remains the same
  interface Appointment {
    id_main: number;
    meeting_start_time: string;
    meeting_duration: number;
    meeting_end_time: string;
    meeting_date: string;
    meeting_day: string;
    status: string;
    booking_date: string;
    booking_day: string;
    client_name: string;
    client_company: string;
    client_mobile: string;
    meeting_venue_area: string;
    meeting_type: string;
    meeting_agenda: string;
    bcl_attendee: string;
    bcl_attendee_mobile: string;
    venue_distance: string;
    meeting_slot_start_time: string;
    meeting_slot_end_time: string;
    badge_status: string;
    google_event_id: string;
    google_meet_link: string;
  }

  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedAppointment, setSelectedAppointment] = useState<Appointment | null>(null);
  const [activeTab, setActiveTab] = useState("upcoming");
  const [isRescheduleDialogOpen, setRescheduleDialogOpen] = useState(false);
  const { toast } = useToast();
  const [isListening, setIsListening] = useState(false);
  const [viewMode, setViewMode] = useState("cards"); // Default to cards

  const [rescheduleFormData, setRescheduleFormData] = useState({
    meetingStartTime: '',
    meetingDuration: '',
    meetingEndTime: '',
    meetingDate: '',
    dateTimeLocal: '',
  });

  // --- Voice Recognition Setup (Unchanged) ---
  const commands = [
    {
      command: ['open appointment *', 'show appointment *', 'select appointment *'],
      callback: (appointmentId) => {
        const id = parseInt(appointmentId);
        if (!isNaN(id)) {
          const appointment = appointments.find(app => app.id_main === id);
          if (appointment) {
            setSelectedAppointment(appointment);
            toast({
              title: "Appointment Selected",
              description: `Opened appointment ID ${appointment.id_main} for ${appointment.client_name}`,
            });
          } else {
            toast({
              variant: "destructive",
              title: "Not Found",
              description: `Appointment ID ${id} not found in the current view.`,
            });
          }
        } else {
          toast({
            variant: "destructive",
            title: "Invalid ID",
            description: `"${appointmentId}" is not a valid appointment ID.`,
          });
        }
      }
    },
    {
      command: ['close dialog', 'close appointment', 'exit'],
      callback: () => {
        if (selectedAppointment || isRescheduleDialogOpen) {
          setSelectedAppointment(null);
          setRescheduleDialogOpen(false);
          toast({
            title: "Dialog Closed",
            description: "Dialog has been closed",
          });
        }
      }
    },
    {
      command: ['reschedule', 'reschedule appointment', 'reschedule meeting'],
      callback: () => {
        if (selectedAppointment && !isRescheduleDialogOpen) {
          setRescheduleDialogOpen(true);
          const startDateTime = `${selectedAppointment.meeting_date}T${selectedAppointment.meeting_start_time}`;
          setRescheduleFormData({
            dateTimeLocal: startDateTime,
            meetingStartTime: selectedAppointment.meeting_start_time,
            meetingDuration: selectedAppointment.meeting_duration.toString(),
            meetingEndTime: selectedAppointment.meeting_end_time,
            meetingDate: selectedAppointment.meeting_date,
          });
          toast({
            title: "Reschedule Mode",
            description: "Reschedule dialog opened",
          });
        } else if (!selectedAppointment) {
          toast({
            variant: "destructive",
            title: "No Appointment Selected",
            description: "Please select an appointment first using 'open appointment [ID]'.",
          });
        }
      }
    },
    {
      command: ['cancel', 'cancel appointment', 'cancel meeting'],
      callback: () => {
        if (selectedAppointment) {
          handleCancel();
        } else {
          toast({
            variant: "destructive",
            title: "No Appointment Selected",
            description: "Please select an appointment first using 'open appointment [ID]'.",
          });
        }
      }
    },
    {
      command: ['complete', 'complete appointment', 'mark as complete', 'finish meeting'],
      callback: () => {
        if (selectedAppointment) {
          handleComplete();
        } else {
          toast({
            variant: "destructive",
            title: "No Appointment Selected",
            description: "Please select an appointment first using 'open appointment [ID]'.",
          });
        }
      }
    },
    {
      command: ['confirm', 'confirm appointment', 'confirm meeting'],
      callback: () => {
        if (selectedAppointment) {
          confirmMeetingClick();
        } else {
          toast({
            variant: "destructive",
            title: "No Appointment Selected",
            description: "Please select an appointment first using 'open appointment [ID]'.",
          });
        }
      }
    },
    {
      command: ['show upcoming', 'view upcoming', 'open upcoming'],
      callback: () => setActiveTab("upcoming")
    },
    {
      command: ['show pending', 'view pending', 'open pending'],
      callback: () => setActiveTab("pending")
    },
    {
      command: ['show canceled', 'view canceled', 'open canceled'],
      callback: () => setActiveTab("canceled")
    },
    {
      command: ['show completed', 'view completed', 'open completed'],
      callback: () => setActiveTab("completed")
    },
    {
      command: ['switch to table view', 'show table view', 'table view'],
      callback: () => {
        setViewMode("table");
        toast({ title: "View Changed", description: "Switched to table view" });
      }
    },
    {
      command: ['switch to card view', 'show card view', 'card view'],
      callback: () => {
        setViewMode("cards");
        toast({ title: "View Changed", description: "Switched to card view" });
      }
    }
  ];

  const { transcript, listening, resetTranscript, browserSupportsSpeechRecognition } = useSpeechRecognition({ commands });

  // --- Fetch Data & Set Initial View Mode ---
  useEffect(() => {
    const fetchEvents = async () => {
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from('meetings')
          .select('*');

        if (error) throw error;

        // Sort by meeting date (newest first) initially
        setAppointments((data ?? []).sort((a, b) => {
          const dateA = new Date(a.meeting_date + 'T' + a.meeting_start_time);
          const dateB = new Date(b.meeting_date + 'T' + b.meeting_start_time);
          // Handle potential invalid dates during sort
          if (isNaN(dateA.getTime())) return 1;
          if (isNaN(dateB.getTime())) return -1;
          return dateB.getTime() - dateA.getTime();
        }));
      } catch (error) {
        console.error('Error fetching events:', error.message);
        toast({
          variant: "destructive",
          title: "Error Loading Data",
          description: "Failed to load appointments from the database.",
        });
      } finally {
        setLoading(false);
      }
    };

    fetchEvents();

    // Set initial view mode based on screen size
    const handleResize = () => {
      if (window.innerWidth >= 768) { // Use md breakpoint (768px)
        // Optionally switch to table on larger screens, or keep user's choice
        // setViewMode("table"); // Uncomment to force table on large screens
      } else {
        setViewMode("cards"); // Default to cards on smaller screens
      }
    };
    handleResize(); // Call on initial load
    window.addEventListener('resize', handleResize);

    // Cleanup listener on component unmount
    return () => window.removeEventListener('resize', handleResize);
  }, [toast]); // Added toast to dependency array

  // --- Event Handlers (Mostly Unchanged, added formatting/parsing checks) ---

  const toggleListening = () => {
    if (!browserSupportsSpeechRecognition) {
      toast({
        variant: "destructive",
        title: "Browser Not Supported",
        description: "Speech recognition is not supported by your browser.",
      });
      return;
    }
    if (listening) {
      SpeechRecognition.stopListening();
      setIsListening(false);
    } else {
      resetTranscript();
      SpeechRecognition.startListening({ continuous: true });
      setIsListening(true);
      toast({
        title: "Voice Control Activated",
        description: "Listening for commands...",
      });
    }
  };

  const handleRescheduleInputChange = (e: ChangeEvent<HTMLInputElement | HTMLSelectElement> | { target: { name: string; value: string } }) => {
    const { name, value } = e.target;
    let updatedData = { ...rescheduleFormData };

    if (name === 'dateTimeLocal') {
      updatedData.dateTimeLocal = value;
      if (value) {
        const [datePart, timePart] = value.split('T');
        updatedData.meetingDate = datePart;
        updatedData.meetingStartTime = timePart ? formatTime(timePart) : ''; // Format HH:MM
      } else {
        updatedData.meetingDate = '';
        updatedData.meetingStartTime = '';
      }
    } else if (name === 'meetingDuration') {
      updatedData.meetingDuration = value;
    }

    // Recalculate end time
    if (updatedData.meetingStartTime && updatedData.meetingDuration && updatedData.meetingDate) {
      try {
        const startDateTime = new Date(`${updatedData.meetingDate}T${updatedData.meetingStartTime}`);
        if (!isNaN(startDateTime.getTime())) {
          const durationMinutes = parseInt(updatedData.meetingDuration, 10);
          if (!isNaN(durationMinutes)) {
            const meetingEndTime = new Date(startDateTime.getTime() + durationMinutes * 60 * 1000);
            // Format end time as HH:MM using en-GB locale which defaults to 24hr clock
            updatedData.meetingEndTime = meetingEndTime.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
          } else {
            updatedData.meetingEndTime = '';
          }
        } else {
          updatedData.meetingEndTime = '';
        }
      } catch (error) {
        console.error("Error calculating end time:", error);
        updatedData.meetingEndTime = '';
      }
    } else {
      updatedData.meetingEndTime = '';
    }

    setRescheduleFormData(updatedData);
  };


  const handleFinalReschedule = async () => {
    if (!selectedAppointment) {
      toast({ variant: "destructive", title: "Error", description: 'No appointment selected.' });
      return;
    }
    // Ensure all required fields for reschedule are present and valid
    const duration = parseInt(rescheduleFormData.meetingDuration, 10);
    if (!rescheduleFormData.meetingDate || !rescheduleFormData.meetingStartTime || isNaN(duration) || !rescheduleFormData.meetingEndTime) {
      toast({ variant: "destructive", title: "Missing Information", description: 'Please provide a valid date, start time, and duration.' });
      return;
    }

    try {
      const updates = {
        meeting_start_time: formatTime(rescheduleFormData.meetingStartTime), // Ensure HH:MM format
        meeting_duration: duration,
        meeting_end_time: formatTime(rescheduleFormData.meetingEndTime), // Ensure HH:MM format
        meeting_date: rescheduleFormData.meetingDate,
        status: 'rescheduled',
        badge_status: 'Tentative',
      };

      const { data, error } = await supabase
        .from('meetings')
        .update(updates)
        .eq('id_main', selectedAppointment.id_main)
        .select()
        .single();

      if (error) throw error;
      if (!data) throw new Error("Update failed, no data returned.");

      // Update Google Calendar Event (if exists)
      if (selectedAppointment.google_event_id) {
        try {
          await updateEvent({
            eventId: selectedAppointment.google_event_id,
            // Pass the updated data to the Google Calendar function
            meetingStartTime: updates.meeting_start_time,
            meetingDuration: updates.meeting_duration.toString(), // Pass as string if required by updateEvent
            meetingEndTime: updates.meeting_end_time,
            meetingDate: updates.meeting_date,
          });
          toast({ title: "Google Calendar Updated", description: "Event updated in Google Calendar." });
        } catch (googleError) {
          console.error("Google Calendar update failed:", googleError);
          toast({ variant: "destructive", title: "Warning", description: "Database updated, but failed to update Google Calendar event." });
        }
      }

      // Update local state
      setAppointments(prev =>
        prev.map(app =>
          app.id_main === selectedAppointment.id_main ? { ...app, ...updates } : app
        )
      );

      toast({ title: "Success", description: "Appointment rescheduled successfully." });

    } catch (error) {
      console.error('Error rescheduling appointment:', error.message);
      toast({ variant: "destructive", title: "Error", description: `Failed to reschedule: ${error.message}` });
    } finally {
      setRescheduleDialogOpen(false);
      setRescheduleFormData({ meetingStartTime: '', meetingDuration: '', meetingEndTime: '', meetingDate: '', dateTimeLocal: '' });
      setSelectedAppointment(null); // Close the main dialog too
    }
  };

  const handleCancel = async () => {
    if (!selectedAppointment) {
      toast({ variant: "destructive", title: "Error", description: 'No appointment selected.' });
      return;
    }
    try {
      // Cancel Google Calendar Event first (if exists)
      if (selectedAppointment.google_event_id) {
        try {
          await cancelEvent(selectedAppointment); // Pass necessary details or the whole object
          toast({ title: "Google Calendar Updated", description: "Event canceled in Google Calendar." });
        } catch (googleError) {
          console.error("Google Calendar cancellation failed:", googleError);
          toast({ variant: "destructive", title: "Warning", description: "Failed to cancel Google Calendar event, proceeding with DB update." });
        }
      }

      // Update Supabase
      const { error } = await supabase
        .from('meetings')
        .update({ status: 'canceled', badge_status: 'Rejected' })
        .eq('id_main', selectedAppointment.id_main);

      if (error) throw error;

      // Update local state
      setAppointments(prev =>
        prev.map(app =>
          app.id_main === selectedAppointment.id_main
            ? { ...app, status: 'canceled', badge_status: 'Rejected' }
            : app
        )
      );

      toast({ title: "Success", description: "Appointment canceled." });
    } catch (error) {
      console.error('Error canceling appointment:', error.message);
      toast({ variant: "destructive", title: "Error", description: `Failed to cancel: ${error.message}` });
    } finally {
      setSelectedAppointment(null);
    }
  };

  const handleComplete = async () => {
    if (!selectedAppointment) {
      toast({ variant: "destructive", title: "Error", description: 'No appointment selected.' });
      return;
    }
    try {
      const id = selectedAppointment.id_main;
      if (typeof id !== 'number' || isNaN(id)) throw new Error('Invalid ID');

      // Update Supabase
      const { error } = await supabase
        .from('meetings')
        .update({ status: 'completed', badge_status: 'Confirmed' }) // Confirm when completing
        .eq('id_main', id);

      if (error) throw error;

      // Update local state
      setAppointments(prev =>
        prev.map(app =>
          app.id_main === id ? { ...app, status: 'completed', badge_status: 'Confirmed' } : app
        )
      );

      toast({ title: "Success", description: "Appointment marked as completed." });
    } catch (error) {
      console.error('Error completing appointment:', error.message);
      toast({ variant: "destructive", title: "Error", description: `Failed to complete: ${error.message}` });
    } finally {
      setSelectedAppointment(null);
    }
  };

  const confirmMeetingClick = async () => {
    if (!selectedAppointment) {
      toast({ variant: "destructive", title: "Error", description: 'No appointment selected.' });
      return;
    }
    if (selectedAppointment.status === 'canceled' || selectedAppointment.status === 'completed') {
      toast({ variant: "destructive", title: "Invalid Action", description: `Cannot confirm a ${selectedAppointment.status} meeting.` });
      return;
    }
    try {
      // Update Supabase
      const { error } = await supabase
        .from('meetings')
        .update({ badge_status: 'Confirmed' })
        .eq('id_main', selectedAppointment.id_main);

      if (error) throw error;

      // Update local state
      setAppointments(prev =>
        prev.map(app =>
          app.id_main === selectedAppointment.id_main
            ? { ...app, badge_status: 'Confirmed' }
            : app
        )
      );

      toast({ title: "Success", description: "Meeting confirmed." });
    } catch (error) {
      console.error('Error confirming meeting:', error.message);
      toast({ variant: "destructive", title: "Error", description: `Failed to confirm: ${error.message}` });
    } finally {
      setSelectedAppointment(null);
    }
  };

  // --- Status Check & Styling (Refined) ---
  const checkAppointmentStatus = (appointment: Appointment): Appointment => {
    const { status, meeting_start_time, meeting_date } = appointment;
    if (status === 'upcoming' || status === 'rescheduled') {
      try {
        const currentDate = new Date();
        const timeString = meeting_start_time || "00:00"; // Default time if null/undefined
        const dateTimeString = `${meeting_date}T${timeString}`;
        const meetingStartDateTime = new Date(dateTimeString);

        // Check if the constructed date is valid
        if (!isNaN(meetingStartDateTime.getTime())) {
          // Check if the meeting time has passed
          if (currentDate > meetingStartDateTime) {
            return { ...appointment, status: 'pending' }; // Return modified object
          }
        } else {
          console.warn(`Invalid date/time string constructed for ID ${appointment.id_main}: ${dateTimeString}`);
        }
      } catch (e) {
        console.error(`Error parsing date/time for appointment ID ${appointment.id_main}:`, e);
      }
    }
    return appointment; // Return original if no change needed or error occurred
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'upcoming': return 'bg-blue-100 text-blue-700 border-blue-300';
      case 'rescheduled': return 'bg-purple-100 text-purple-700 border-purple-300';
      case 'pending': return 'bg-yellow-100 text-yellow-700 border-yellow-300';
      case 'canceled': return 'bg-red-100 text-red-700 border-red-300';
      case 'completed': return 'bg-green-100 text-green-700 border-green-300';
      default: return 'bg-gray-100 text-gray-700 border-gray-300';
    }
  };

  const getStatusIcon = (status: string) => {
    const commonClass = "h-3 w-3 mr-1"; // Slightly smaller icon
    switch (status) {
      case 'upcoming': return <Calendar className={commonClass} />;
      case 'rescheduled': return <RefreshCw className={commonClass} />;
      case 'pending': return <Clock className={commonClass} />;
      case 'canceled': return <XCircle className={commonClass} />;
      case 'completed': return <CheckCircle className={commonClass} />;
      default: return null;
    }
  };

  const getBadgeStatusColor = (badgeStatus: string) => {
    switch (badgeStatus) {
      case 'Open': return 'bg-blue-100 text-blue-700 border-blue-300';
      case 'Confirmed': return 'bg-green-100 text-green-700 border-green-300';
      case 'Tentative': return 'bg-yellow-100 text-yellow-700 border-yellow-300';
      case 'Rejected': return 'bg-red-100 text-red-700 border-red-300';
      default: return 'bg-gray-100 text-gray-700 border-gray-300';
    }
  };

  const getTableRowColor = (status: string) => {
    switch (status) {
      case 'upcoming': return 'bg-blue-50/30 hover:bg-blue-50/60'; // More subtle hover
      case 'rescheduled': return 'bg-purple-50/30 hover:bg-purple-50/60';
      case 'pending': return 'bg-yellow-50/30 hover:bg-yellow-50/60';
      case 'canceled': return 'bg-red-50/30 hover:bg-red-50/60';
      case 'completed': return 'bg-green-50/30 hover:bg-green-50/60';
      default: return 'bg-white hover:bg-gray-50/60';
    }
  };

  const today = new Date().toISOString().split('T')[0];
  const totalAppointmentsToday = appointments.filter(
    (appointment) =>
      appointment.meeting_date === today &&
      (appointment.status === 'upcoming' || appointment.status === 'rescheduled' || checkAppointmentStatus(appointment).status === 'pending')
  ).length;

  // --- Loading State (Unchanged) ---
  if (loading) {
    return (
      <div className="flex justify-center items-center h-screen bg-gray-100">
        <div className="text-center">
          <div className="flex items-center justify-center space-x-2">
            <div className="w-5 h-5 bg-blue-500 rounded-full animate-bounce delay-75"></div>
            <div className="w-5 h-5 bg-blue-600 rounded-full animate-bounce delay-150"></div>
            <div className="w-5 h-5 bg-blue-700 rounded-full animate-bounce delay-225"></div>
          </div>
          <p className="text-base font-medium text-gray-600 mt-3">Loading Schedules...</p>
        </div>
      </div>
    );
  }

  // --- Detail Item Renderer for Dialog (Mobile Optimized) ---
  const renderAppointmentDetailItem = (label: string, value: string | number | undefined | null, icon = null, isLink = false) => (
    <div className="flex flex-col space-y-0"> {/* Reduced spacing */}
      <p className="text-xs text-gray-500 flex items-center">
        {icon && React.cloneElement(icon, { className: "h-3.5 w-3.5 mr-1.5 text-gray-400 flex-shrink-0" })}
        {label}
      </p>
      {isLink && typeof value === 'string' ? (
        <a href={value} target="_blank" rel="noopener noreferrer" className="text-sm font-medium text-blue-600 hover:text-blue-800 break-words">
          {value}
        </a>
      ) : (
        <p className="text-sm font-medium text-gray-800 break-words">{value || 'N/A'}</p>
      )}
    </div>
  );

  // --- TABLE VIEW (Mobile Adjustments) ---
  const renderTableView = (filteredAppointments) => (
    <div className="overflow-x-auto border border-gray-200 rounded-lg shadow-sm bg-white">
      <Table className="w-full min-w-[900px]"> {/* Slightly reduced min-width */}
        <TableHeader className="sticky top-0 z-10 bg-gray-100 border-b border-gray-300">
          <TableRow>
            {/* Adjusted padding and font size */}
            <TableHead className="w-[40px] px-2 py-2 text-xs font-semibold text-gray-600">#</TableHead>
            <TableHead className="w-[80px] px-2 py-2 text-xs font-semibold text-gray-600">ID</TableHead>
            <TableHead className="w-[120px] px-2 py-2 text-xs font-semibold text-gray-600">Meeting Status</TableHead>
            <TableHead className="w-[120px] px-2 py-2 text-xs font-semibold text-gray-600"> Confirmation Status</TableHead>
            <TableHead className="px-3 py-2 text-xs font-semibold text-gray-600">Client</TableHead>
            <TableHead className="px-3 py-2 text-xs font-semibold text-gray-600">Company</TableHead>
            <TableHead className="w-[100px] px-2 py-2 text-xs font-semibold text-gray-600">Date</TableHead>
            <TableHead className="w-[80px] px-2 py-2 text-xs font-semibold text-gray-600">Day</TableHead>
            <TableHead className="px-3 py-2 text-xs font-semibold text-gray-600">Venue</TableHead>
            <TableHead className="w-[130px] px-2 py-2 text-xs font-semibold text-gray-600">Time</TableHead>
            <TableHead className="px-3 py-2 text-xs font-semibold text-gray-600">Type</TableHead>
            <TableHead className="px-3 py-2 text-xs font-semibold text-gray-600">Agenda</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {filteredAppointments.length === 0 ? (
            <TableRow>
              <TableCell colSpan={11} className="h-24 text-center text-sm text-gray-500">
                No appointments found.
              </TableCell>
            </TableRow>
          ) : (
            filteredAppointments.map((appointment, index) => {
              const displayAppointment = checkAppointmentStatus(appointment);
              return (
                <TableRow
                  key={appointment.id_main}
                  className={`cursor-pointer ${getTableRowColor(displayAppointment.status)}`}
                  onClick={() => setSelectedAppointment(appointment)}
                >
                  {/* Adjusted padding and font size */}
                  <TableCell className="px-2 py-1.5 text-xs font-medium text-gray-500">{index + 1}</TableCell>
                  <TableCell className="px-2 py-1.5 text-xs font-medium text-gray-800">{appointment.id_main}</TableCell>
                  <TableCell className="px-2 py-1.5">
                    <div className="flex items-center">
                      <Badge variant="outline" className={`text-[10px] ${getStatusColor(displayAppointment.status)}`}>
                        <span className="flex items-center">
                          {getStatusIcon(displayAppointment.status)}
                          <span className="ml-1">{displayAppointment.status.charAt(0).toUpperCase() + displayAppointment.status.slice(1)}</span>
                        </span>
                      </Badge>
                    </div>
                  </TableCell>
                  <TableCell className="px-2 py-1.5">
                    <div className="flex items-center">
                      <Badge variant="outline" className={`text-[10px]${getBadgeStatusColor(appointment.badge_status)}`}>
                        <span className="flex items-center">
                          {appointment.badge_status}
                        </span>
                      </Badge>
                    </div>
                  </TableCell>
                  <TableCell className="px-3 py-1.5 text-xs text-gray-700">{appointment.client_name}</TableCell>
                  <TableCell className="px-3 py-1.5 text-xs text-gray-600">{appointment.client_company}</TableCell>
                  <TableCell className="px-2 py-1.5 text-xs text-gray-600">{new Date(appointment.meeting_date).toLocaleDateString('en-GB')}</TableCell>
                  <TableCell className="px-2 py-1.5 text-xs text-gray-600">{appointment.meeting_day}</TableCell>
                  <TableCell className="px-3 py-1.5 text-xs text-gray-600">
                    <div className="flex items-center">
                      <span className="truncate max-w-[100px]" title={appointment.meeting_venue_area}>
                        {appointment.meeting_venue_area}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell className="px-2 py-1.5 text-xs text-gray-700">
                    <div className="flex items-center whitespace-nowrap">
                      <Clock className="h-3 w-3 mr-1 text-blue-500" />
                      {formatTime(appointment.meeting_start_time)} - {formatTime(appointment.meeting_end_time)}
                    </div>
                  </TableCell>
                  <TableCell className="px-3 py-1.5 text-xs text-gray-600">
                    <div className="flex items-center">
                      {appointment.meeting_type === 'virtual' ? (
                        <span className="flex items-center">
                          <Video className="h-3 w-3 mr-1 text-blue-500" />
                          Virtual
                        </span>
                      ) : (
                        <span className="flex items-center">
                          <MapPin className="h-3 w-3 mr-1 text-gray-400" />
                          In Person
                        </span>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="px-3 py-1.5 text-xs text-gray-600">
                    <div className="flex items-center">
                      <span className="truncate max-w-[150px]" title={appointment.meeting_agenda}>
                        {appointment.meeting_agenda}
                      </span>
                    </div>
                  </TableCell>
                </TableRow>
              );
            })
          )}
        </TableBody>
      </Table>
    </div>
  );

  // --- CARD VIEW (Mobile Optimized) ---
  const renderCardView = (filteredAppointments) => (
    filteredAppointments.length === 0 ? (
      <div className="py-10 text-center text-gray-500 text-sm">
        No appointments found for this category.
      </div>
    ) : (
      // Responsive grid layout
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-4">
        {filteredAppointments.map((appointment) => (
          <AppointmentCard
            key={appointment.id_main}
            appointment={appointment}
            onClick={() => setSelectedAppointment(appointment)}
            getStatusColor={getStatusColor}
            getStatusIcon={getStatusIcon}
            getBadgeStatusColor={getBadgeStatusColor}
            checkAppointmentStatus={checkAppointmentStatus}
          />
        ))}
      </div>
    )
  );


  // --- MAIN RETURN (Responsive Layout) ---
  return (
    // Added responsive padding
    <div className="min-h-screen bg-gray-100 p-2 sm:p-4">
      <Toaster />

      {/* Voice control indicator (Unchanged position) */}
      {/* <div className="fixed top-3 right-3 sm:top-4 sm:right-4 z-50">
        <TooltipProvider delayDuration={100}>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant={isListening ? "destructive" : "secondary"}
                size="icon"
                onClick={toggleListening}
                className="rounded-full shadow-lg h-9 w-9 sm:h-10 sm:w-10" // Slightly smaller on mobile
              >
                {isListening ? <MicOff className="h-4 w-4 sm:h-5 sm:w-5" /> : <Mic className="h-4 w-4 sm:h-5 sm:w-5" />}
              </Button>
            </TooltipTrigger>
            <TooltipContent side="left">
              {!browserSupportsSpeechRecognition ? <p className="text-red-600">Browser not supported</p> :
                <p>{isListening ? "Stop Voice Control" : "Start Voice Control"}</p>
              }
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div> */}

      {/* Header (Responsive) */}
      <div className="mb-3 sm:mb-4">
        {/* Stack elements vertically on small screens */}
        <div className="flex flex-col sm:flex-row justify-between items-center mb-3 gap-2 sm:gap-4">
          {/* Responsive Title */}
          <h1 className="text-lg sm:text-xl md:text-2xl font-bold text-gray-800">
            Meeting Dashboard
          </h1>

          {/* Container for controls/stats, allows wrapping */}
          <div className="flex flex-wrap items-center justify-center sm:justify-end gap-2 sm:space-x-4">
            {/* View toggle */}
            <div className="bg-white border border-gray-200 rounded-lg p-0.5 flex shadow-sm">
              <Button
                variant="ghost"
                size="sm" // Keep size sm, looks okay on mobile too
                onClick={() => setViewMode("cards")}
                className={`rounded-l-md px-2.5 py-1 ${viewMode === "cards" ? "bg-blue-500 text-white hover:bg-blue-600" : "text-gray-600 hover:bg-gray-100"}`}
              >
                <LayoutGrid className="h-4 w-4 mr-1" /> {/* Slightly smaller icon/margin */}
                Cards
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setViewMode("table")}
                className={`rounded-r-md px-2.5 py-1 ${viewMode === "table" ? "bg-blue-500 text-white hover:bg-blue-600" : "text-gray-600 hover:bg-gray-100"}`}
              >
                <Table2 className="h-4 w-4 mr-1" /> {/* Slightly smaller icon/margin */}
                Table
              </Button>
            </div>
            {/* Stats Card (Smaller on mobile) */}
            <Card className="border-gray-200 shadow-sm">
              <CardContent className="p-2 sm:p-3 flex items-center">
                <div className="mr-2 sm:mr-3 text-blue-500">
                  <Calendar className="h-5 w-5 sm:h-6 sm:w-6" />
                </div>
                <div>
                  <p className="text-[11px] sm:text-xs text-gray-500">Today's Meetings</p>
                  <p className="text-base sm:text-xl font-bold text-gray-800">{totalAppointmentsToday}</p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Voice transcript display (Responsive) */}
        {/* {isListening && (
          <div className="bg-white border border-blue-200 text-gray-700 p-2 sm:p-3 rounded-lg mb-3 shadow-sm">
            <div className="flex items-center space-x-2 mb-1">
              <div className="w-2 h-2 sm:w-2.5 sm:h-2.5 bg-red-500 rounded-full animate-pulse"></div>
              <p className="text-xs sm:text-sm font-medium text-blue-600">Listening...</p>
            </div>
            <p className="text-xs sm:text-sm italic ml-3 sm:ml-4">"{transcript || 'Say a command...'}"</p>
          </div>
        )} */}

        {/* Main content Tabs (Responsive) */}
        <Tabs defaultValue="upcoming" value={activeTab} onValueChange={setActiveTab} className="bg-white p-2 sm:p-4 rounded-lg shadow border border-gray-200">
          {/* Responsive Tab Triggers */}
          <TabsList className="grid grid-cols-2 sm:grid-cols-4 mb-4 sm:mb-6 bg-gray-100 p-1 rounded-md flex-wrap">
            {["upcoming", "pending", "canceled", "completed"].map((tabValue) => (
              <TabsTrigger
                key={tabValue}
                value={tabValue}
                className={`text-xs sm:text-sm px-2 py-1 sm:py-1.5 data-[state=active]:shadow data-[state=active]:text-white text-gray-600
                  ${tabValue === 'upcoming' ? 'data-[state=active]:bg-blue-500' : ''}
                  ${tabValue === 'pending' ? 'data-[state=active]:bg-yellow-500' : ''}
                  ${tabValue === 'canceled' ? 'data-[state=active]:bg-red-500' : ''}
                  ${tabValue === 'completed' ? 'data-[state=active]:bg-green-500' : ''}
                `}
              >
                {tabValue.charAt(0).toUpperCase() + tabValue.slice(1)}
              </TabsTrigger>
            ))}
          </TabsList>

          {/* Tab Content Panes */}
          <TabsContent value="upcoming" className="mt-0">
            {viewMode === "cards" ? renderCardView(appointments.filter(app => ['upcoming', 'rescheduled'].includes(checkAppointmentStatus(app).status)).sort((a, b) => new Date(a.meeting_date + 'T' + a.meeting_start_time).getTime() - new Date(b.meeting_date + 'T' + b.meeting_start_time).getTime())) : renderTableView(appointments.filter(app => ['upcoming', 'rescheduled'].includes(checkAppointmentStatus(app).status)).sort((a, b) => new Date(a.meeting_date + 'T' + a.meeting_start_time).getTime() - new Date(b.meeting_date + 'T' + b.meeting_start_time).getTime()))}
          </TabsContent>
          <TabsContent value="pending" className="mt-0">
            {viewMode === "cards" ? renderCardView(appointments.filter(app => checkAppointmentStatus(app).status === 'pending').sort((a, b) => new Date(a.meeting_date + 'T' + a.meeting_start_time).getTime() - new Date(b.meeting_date + 'T' + b.meeting_start_time).getTime())) : renderTableView(appointments.filter(app => checkAppointmentStatus(app).status === 'pending').sort((a, b) => new Date(a.meeting_date + 'T' + a.meeting_start_time).getTime() - new Date(b.meeting_date + 'T' + b.meeting_start_time).getTime()))}
          </TabsContent>
          <TabsContent value="canceled" className="mt-0">
            {viewMode === "cards" ? renderCardView(appointments.filter(app => app.status === 'canceled').sort((a, b) => new Date(b.booking_date || 0).getTime() - new Date(a.booking_date || 0).getTime())) : renderTableView(appointments.filter(app => app.status === 'canceled').sort((a, b) => new Date(b.booking_date || 0).getTime() - new Date(a.booking_date || 0).getTime()))}
          </TabsContent>
          <TabsContent value="completed" className="mt-0">
            {viewMode === "cards" ? renderCardView(appointments.filter(app => app.status === 'completed').sort((a, b) => new Date(b.meeting_date).getTime() - new Date(a.meeting_date).getTime())) : renderTableView(appointments.filter(app => app.status === 'completed').sort((a, b) => new Date(b.meeting_date).getTime() - new Date(a.meeting_date).getTime()))}
          </TabsContent>
        </Tabs>

        {/* --- SELECTED APPOINTMENT DETAILS DIALOG (Responsive) --- */}
        <Dialog open={!!selectedAppointment} onOpenChange={(open) => !open && setSelectedAppointment(null)}>
          {/* Responsive max-width and padding */}
          <DialogContent className="max-w-sm sm:max-w-lg md:max-w-3xl bg-white sm:rounded-lg p-4 sm:p-5">
            <DialogHeader className="border-b pb-2 mb-3 sm:pb-3 sm:mb-4">
              <DialogTitle className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-1 sm:gap-2">
                {/* Responsive Text Size */}
                <span className="text-base sm:text-lg md:text-xl text-gray-800 font-semibold truncate">
                  Mtg: {selectedAppointment?.client_name}
                </span>
                {selectedAppointment && (
                  <Badge variant="outline" className={`${getBadgeStatusColor(selectedAppointment.badge_status)} px-2 py-0.5 text-[10px] sm:text-xs self-start sm:self-center`}>
                    {selectedAppointment.badge_status}
                  </Badge>
                )}
              </DialogTitle>
              <DialogDescription className="text-xs sm:text-sm text-gray-500 mt-0.5">
                {selectedAppointment?.id_main && `ID: ${selectedAppointment.id_main} | ${selectedAppointment?.client_company}`}
              </DialogDescription>
            </DialogHeader>

            {selectedAppointment && (
              // Stack columns on mobile
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-x-6 sm:gap-y-4 max-h-[70vh] sm:max-h-[65vh] overflow-y-auto pr-1 sm:pr-2">
                {/* Column 1 */}
                <div className="space-y-3 sm:space-y-4">
                  {/* Client Details Card (Responsive Padding) */}
                  <Card className="border-gray-200 shadow-sm">
                    <CardHeader className="pb-1 pt-2 px-3 sm:pb-2 sm:pt-3 sm:px-4">
                      <CardTitle className="text-sm sm:text-base font-semibold text-gray-700 flex items-center">
                        <UserPlus className="h-3.5 w-3.5 mr-1.5 sm:h-4 sm:w-4 sm:mr-2 text-blue-600" />
                        Client Details
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2 px-3 pb-2 sm:space-y-2.5 sm:px-4 sm:pb-3">
                      {renderAppointmentDetailItem('Name', selectedAppointment.client_name)}
                      {renderAppointmentDetailItem('Company', selectedAppointment.client_company, <Building />)}
                      {renderAppointmentDetailItem('Mobile', selectedAppointment.client_mobile, <Phone />)}
                    </CardContent>
                  </Card>

                  {/* Meeting Details Card (Responsive Padding) */}
                  <Card className="border-gray-200 shadow-sm">
                    <CardHeader className="pb-1 pt-2 px-3 sm:pb-2 sm:pt-3 sm:px-4">
                      <CardTitle className="text-sm sm:text-base font-semibold text-gray-700 flex items-center">
                        <Calendar className="h-3.5 w-3.5 mr-1.5 sm:h-4 sm:w-4 sm:mr-2 text-green-600" />
                        Meeting Details
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="px-3 pb-2 sm:px-4 sm:pb-3">
                      {/* Use finer grid for smaller screens */}
                      <div className="grid grid-cols-2 gap-x-3 gap-y-2 sm:gap-x-4 sm:gap-y-2.5">
                        {renderAppointmentDetailItem('Date', selectedAppointment.meeting_date ? new Date(selectedAppointment.meeting_date).toLocaleDateString('en-GB', { year: 'numeric', month: 'short', day: 'numeric' }) : 'N/A')}
                        {renderAppointmentDetailItem('Day', selectedAppointment.meeting_day)}
                        {renderAppointmentDetailItem('Start', formatTime(selectedAppointment.meeting_start_time), <Clock />)}
                        {renderAppointmentDetailItem('End', formatTime(selectedAppointment.meeting_end_time))}
                        {renderAppointmentDetailItem('Duration', `${selectedAppointment.meeting_duration || '?'} min`)}
                        {renderAppointmentDetailItem('Status', checkAppointmentStatus(selectedAppointment).status.charAt(0).toUpperCase() + checkAppointmentStatus(selectedAppointment).status.slice(1), getStatusIcon(checkAppointmentStatus(selectedAppointment).status))}
                        {/* Span venue across columns for better fit */}
                        <div className="col-span-2">
                          {renderAppointmentDetailItem('Venue', selectedAppointment.meeting_venue_area, <MapPin />)}
                        </div>
                        <div className="col-span-2">
                          {renderAppointmentDetailItem('Type', selectedAppointment.meeting_type)}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* Column 2 */}
                <div className="space-y-3 sm:space-y-4">
                  {/* Agenda Card (Responsive Padding) */}
                  <Card className="border-gray-200 shadow-sm">
                    <CardHeader className="pb-1 pt-2 px-3 sm:pb-2 sm:pt-3 sm:px-4">
                      <CardTitle className="text-sm sm:text-base font-semibold text-gray-700 flex items-center">
                        <MessageSquare className="h-3.5 w-3.5 mr-1.5 sm:h-4 sm:w-4 sm:mr-2 text-purple-600" />
                        Agenda
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="px-3 pb-2 sm:px-4 sm:pb-3">
                      <div className="bg-gray-50 p-2 rounded-md border border-gray-200 text-xs sm:text-sm text-gray-700 max-h-24 overflow-y-auto">
                        <p>{selectedAppointment.meeting_agenda || 'No agenda provided.'}</p>
                      </div>
                    </CardContent>
                  </Card>

                  {/* BCL Attendee Card (Responsive Padding) */}
                  <Card className="border-gray-200 shadow-sm">
                    <CardHeader className="pb-1 pt-2 px-3 sm:pb-2 sm:pt-3 sm:px-4">
                      <CardTitle className="text-sm sm:text-base font-semibold text-gray-700 flex items-center">
                        <UserPlus className="h-3.5 w-3.5 mr-1.5 sm:h-4 sm:w-4 sm:mr-2 text-orange-600" />
                        BCL Attendee
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2 px-3 pb-2 sm:space-y-2.5 sm:px-4 sm:pb-3">
                      {renderAppointmentDetailItem('Name', selectedAppointment.bcl_attendee)}
                      {renderAppointmentDetailItem('Mobile', selectedAppointment.bcl_attendee_mobile, <Phone />)}
                    </CardContent>
                  </Card>

                  {/* Google Meet Link Card (Responsive Padding) */}
                  {selectedAppointment.google_meet_link && (
                    <Card className="border-gray-200 shadow-sm">
                      <CardHeader className="pb-1 pt-2 px-3 sm:pb-2 sm:pt-3 sm:px-4">
                        <CardTitle className="text-sm sm:text-base font-semibold text-gray-700 flex items-center">
                          <LinkIcon className="h-3.5 w-3.5 mr-1.5 sm:h-4 sm:w-4 sm:mr-2 text-cyan-600" />
                          Meeting Link
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="px-3 pb-2 sm:px-4 sm:pb-3">
                        {renderAppointmentDetailItem('Link', selectedAppointment.google_meet_link, null, true)}
                      </CardContent>
                    </Card>
                  )}
                </div>
              </div>
            )}

            {/* Footer Actions (Responsive Button Sizes, Flex Wrap) */}
            <DialogFooter className="flex flex-col sm:flex-row gap-2 sm:justify-between items-center mt-4 pt-3 sm:mt-5 sm:pt-4 border-t">
              {/* Wrap action buttons for smaller screens */}
              <div className="flex flex-wrap gap-2 justify-center sm:justify-start w-full sm:w-auto">
                {selectedAppointment?.status !== 'canceled' && selectedAppointment?.status !== 'completed' && (
                  <Button
                    variant="outline"
                    size="sm" // Use sm size consistently
                    onClick={() => {
                      const startDateTime = selectedAppointment ? `${selectedAppointment.meeting_date}T${formatTime(selectedAppointment.meeting_start_time)}` : '';
                      setRescheduleFormData({
                        dateTimeLocal: startDateTime,
                        meetingStartTime: formatTime(selectedAppointment?.meeting_start_time) || '',
                        meetingDuration: selectedAppointment?.meeting_duration?.toString() || '',
                        meetingEndTime: formatTime(selectedAppointment?.meeting_end_time) || '',
                        meetingDate: selectedAppointment?.meeting_date || '',
                      });
                      setRescheduleDialogOpen(true);
                    }}
                    className="border-blue-300 text-blue-700 hover:bg-blue-50 px-3 py-1.5 text-xs sm:text-sm" // Adjusted padding/text size
                  >
                    <RefreshCw className="h-3.5 w-3.5 mr-1 sm:mr-1.5" />
                    Reschedule
                  </Button>
                )}
                {selectedAppointment?.badge_status !== 'Confirmed' && selectedAppointment?.status !== 'canceled' && selectedAppointment?.status !== 'completed' && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={confirmMeetingClick}
                    className="border-green-300 text-green-700 hover:bg-green-50 px-3 py-1.5 text-xs sm:text-sm"
                  >
                    <CheckCircle className="h-3.5 w-3.5 mr-1 sm:mr-1.5" />
                    Confirm
                  </Button>
                )}
                {selectedAppointment?.status !== 'canceled' && selectedAppointment?.status !== 'completed' && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleCancel}
                    className="border-red-300 text-red-700 hover:bg-red-50 px-3 py-1.5 text-xs sm:text-sm"
                  >
                    <XCircle className="h-3.5 w-3.5 mr-1 sm:mr-1.5" />
                    Cancel Mtg
                  </Button>
                )}
                {selectedAppointment?.status !== 'completed' && selectedAppointment?.status !== 'canceled' && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleComplete}
                    className="border-purple-300 text-purple-700 hover:bg-purple-50 px-3 py-1.5 text-xs sm:text-sm"
                  >
                    <CheckCircle className="h-3.5 w-3.5 mr-1 sm:mr-1.5" />
                    Mark Done
                  </Button>
                )}
                {(selectedAppointment?.status === 'completed' || selectedAppointment?.status === 'canceled') && (
                  <span className="text-xs sm:text-sm text-gray-500 italic px-3 py-1.5">
                    This meeting is {selectedAppointment.status}.
                  </span>
                )}
              </div>
              {/* Close button full width on small screens */}
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setSelectedAppointment(null)}
                className="w-full sm:w-auto mt-2 sm:mt-0 px-3 py-1.5 text-xs sm:text-sm"
              >
                Close
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* --- RESCHEDULE DIALOG (Responsive) --- */}
        <Dialog open={isRescheduleDialogOpen} onOpenChange={setRescheduleDialogOpen}>
          {/* Responsive width and padding */}
          <DialogContent className="max-w-xs sm:max-w-sm bg-white sm:rounded-lg p-4 sm:p-5">
            <DialogHeader className="border-b pb-2 mb-3 sm:pb-3 sm:mb-4">
              {/* Responsive text size */}
              <DialogTitle className="text-base sm:text-lg font-semibold text-gray-800">
                Reschedule Meeting
              </DialogTitle>
              <DialogDescription className="text-xs sm:text-sm">
                Update details for {selectedAppointment?.client_name}.
              </DialogDescription>
            </DialogHeader>

            <div className="grid grid-cols-1 gap-3 sm:gap-4 py-3 sm:py-4">
              {/* Date & Time Input (Responsive Label/Input) */}
              <div className="space-y-1">
                <Label htmlFor="dateTimeLocal" className="text-xs sm:text-sm font-medium text-gray-700">New Date & Start Time</Label>
                <div className="relative">
                  <Calendar className="absolute left-2.5 sm:left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 sm:h-4 sm:w-4 text-gray-400" />
                  <Input
                    id="dateTimeLocal"
                    name="dateTimeLocal"
                    type="datetime-local"
                    value={rescheduleFormData.dateTimeLocal}
                    onChange={handleRescheduleInputChange}
                    min={new Date().toISOString().slice(0, 16)}
                    className="w-full pl-8 sm:pl-9 border-gray-300 focus:border-blue-500 focus:ring-blue-500 text-xs sm:text-sm h-9 sm:h-10" // Adjusted padding/height
                  />
                </div>
              </div>

              {/* Duration Select (Responsive Label/Select) */}
              <div className="space-y-1">
                <Label htmlFor="meetingDuration" className="text-xs sm:text-sm font-medium text-gray-700">Duration</Label>
                <div className="relative">
                  <Clock className="absolute left-2.5 sm:left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 sm:h-4 sm:w-4 text-gray-400" />
                  <Select
                    value={rescheduleFormData.meetingDuration}
                    onValueChange={(value) => handleRescheduleInputChange({ target: { name: 'meetingDuration', value } })}
                  >
                    <SelectTrigger className="w-full pl-8 sm:pl-9 border-gray-300 text-xs sm:text-sm h-9 sm:h-10">
                      <SelectValue placeholder="Select duration" />
                    </SelectTrigger>
                    <SelectContent>
                      {/* Smaller text in select items */}
                      <SelectItem value="15" className="text-xs sm:text-sm">15 minutes</SelectItem>
                      <SelectItem value="30" className="text-xs sm:text-sm">30 minutes</SelectItem>
                      <SelectItem value="45" className="text-xs sm:text-sm">45 minutes</SelectItem>
                      <SelectItem value="60" className="text-xs sm:text-sm">1 hour</SelectItem>
                      <SelectItem value="90" className="text-xs sm:text-sm">1.5 hours</SelectItem>
                      <SelectItem value="120" className="text-xs sm:text-sm">2 hours</SelectItem>
                      <SelectItem value="180" className="text-xs sm:text-sm">3 hours</SelectItem>
                      <SelectItem value="240" className="text-xs sm:text-sm">4 hours</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Calculated End Time (Responsive Label/Input) */}
              <div className="space-y-1">
                <Label htmlFor="meetingEndTime" className="text-xs sm:text-sm font-medium text-gray-700">Calculated End Time</Label>
                <Input
                  id="meetingEndTime"
                  name="meetingEndTime"
                  value={rescheduleFormData.meetingEndTime || '--:--'}
                  readOnly
                  className="w-full bg-gray-100 border-gray-300 text-xs sm:text-sm text-gray-500 h-9 sm:h-10" // Adjusted height
                />
              </div>
            </div>

            {/* Footer Buttons (Responsive Size) */}
            <DialogFooter className="mt-3 sm:mt-4 pt-3 sm:pt-4 border-t flex flex-col sm:flex-row gap-2"> {/* Force row layout */}
              <Button
                variant="outline"
                size="sm" // Consistent sm size
                onClick={() => setRescheduleDialogOpen(false)}
                className="flex-1 text-xs sm:text-sm" // Allow button to grow
              >
                Cancel
              </Button>
              <Button
                onClick={handleFinalReschedule}
                size="sm" // Consistent sm size
                className="flex-1 bg-blue-600 hover:bg-blue-700 text-white text-xs sm:text-sm" // Allow button to grow
                disabled={!rescheduleFormData.meetingEndTime}
              >
                Confirm Reschedule
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div> {/* End Container */}
    </div> // End Main Div
  );
};


// --- APPOINTMENT CARD COMPONENT (Mobile Optimized Styling) ---
const AppointmentCard = ({ appointment, onClick, getStatusColor, getStatusIcon, getBadgeStatusColor, checkAppointmentStatus }) => {
  const displayAppointment = checkAppointmentStatus(appointment);

  const getBorderColorClass = (status: string) => {
    switch (status) {
      case 'upcoming': return 'border-l-blue-500';
      case 'rescheduled': return 'border-l-purple-500';
      case 'pending': return 'border-l-yellow-500';
      case 'canceled': return 'border-l-red-500';
      case 'completed': return 'border-l-green-500';
      default: return 'border-l-gray-300';
    }
  };

  return (
    <Card
      // Reduced border-l width for subtlety
      className={`overflow-hidden hover:shadow-lg transition-shadow duration-200 cursor-pointer bg-white border ${getBorderColorClass(displayAppointment.status)} border-l-[3px] shadow-sm`}
      onClick={onClick}
    >
      {/* Reduced padding, adjusted flex behavior for smaller screens */}
      <CardHeader className="p-2.5 pb-1.5 flex flex-row items-start justify-between bg-gray-50/50 border-b">
        <div className="flex-1 mr-2 overflow-hidden"> {/* Added overflow-hidden */}
          {/* Smaller title, truncate */}
          <CardTitle className="text-sm font-semibold text-gray-800 leading-tight truncate" title={appointment.client_name}>
            {appointment.client_name}
          </CardTitle>
          {/* Smaller company text, truncate */}
          <p className="text-[11px] text-gray-500 truncate" title={appointment.client_company}>
            {appointment.client_company || 'No Company'}
          </p>
        </div>
        {/* Ensure badges don't push content too much */}
        <div className="flex flex-col items-end space-y-1 flex-shrink-0 ml-1">
          {/* Smaller badges */}
          <Badge variant="outline" className={`text-[10px] px-1.5 py-0.5 ${getStatusColor(displayAppointment.status)} flex items-center`}>
            {getStatusIcon(displayAppointment.status)}
            {displayAppointment.status.charAt(0).toUpperCase() + displayAppointment.status.slice(1)}
          </Badge>
          <Badge variant="outline" className={`text-[10px] px-1.5 py-0.5 ${getBadgeStatusColor(appointment.badge_status)}`}>
            {appointment.badge_status}
          </Badge>
        </div>
      </CardHeader>
      {/* Reduced padding */}
      <CardContent className="p-2.5 pt-2">
        {/* Reduced spacing and text size */}
        <div className="space-y-1.5 text-[11px] sm:text-xs">
          <div className="flex items-center text-gray-600">
            <Calendar className="h-3 w-3 mr-1.5 text-gray-400 flex-shrink-0" />
            <span className="font-medium">
              {new Date(appointment.meeting_date).toLocaleDateString('en-GB', { weekday: 'short', month: 'short', day: 'numeric' })}
            </span>
          </div>
          <div className="flex items-center text-gray-600">
            <Clock className="h-3 w-3 mr-1.5 text-gray-400 flex-shrink-0" />
            <span className="font-medium">
              {formatTime(appointment.meeting_start_time)} - {formatTime(appointment.meeting_end_time)}
            </span>
            <span className="ml-auto text-gray-500 text-[10px] sm:text-[11px]">({appointment.meeting_duration} min)</span>
          </div>
          <div className="flex items-center text-gray-600">
            <MapPin className="h-3 w-3 mr-1.5 text-gray-400 flex-shrink-0" />
            <span className="font-medium truncate" title={appointment.meeting_venue_area}>
              {appointment.meeting_venue_area || 'N/A'}
            </span>
          </div>
          {/* Improved agenda display with truncation */}
          <div className="flex items-start text-gray-600">
            <MessageSquare className="h-3 w-3 mr-1.5 text-gray-400 mt-[1px] flex-shrink-0" />
            <span className="line-clamp-2" title={appointment.meeting_agenda}> {/* Show 2 lines max */}
              {appointment.meeting_agenda || 'No agenda'}
            </span>
          </div>
        </div>
      </CardContent>
      {/* Smaller footer */}
      <div className="bg-gray-50/70 px-2.5 py-1 text-[10px] text-gray-400 border-t">
        ID: {appointment.id_main}
      </div>
    </Card>
  );
};


export default Dashboard;