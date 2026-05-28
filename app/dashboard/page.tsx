// @ts-nocheck
"use client"

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { ChangeEvent } from 'react';
import { useSearchParams } from 'next/navigation';
import SpeechRecognition, { useSpeechRecognition } from 'react-speech-recognition';
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCaption, TableCell, TableFooter, TableHead, TableHeader, TableRow,} from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, } from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Toaster } from "@/components/ui/toaster";
import { useToast } from "@/hooks/use-toast";
import { Calendar, Clock, Mic, MicOff, UserPlus, Building, MapPin, CheckCircle, XCircle, RefreshCw, MessageSquare, Table2, LayoutGrid, Link as LinkIcon, Phone, Video, Trash2, Loader2, CloudOff, Cloud, ShieldCheck, ChevronsLeft, ChevronLeft, ChevronRight, ChevronsRight, Users, CalendarDays, AlertTriangle, User, BookOpen, Search, Send, History, Bell } from 'lucide-react';
import supabase from '@/utils/supabaseClient';
import type { Appointment, AuthUser, CalendarConnectionStatus } from '@/components/dashboard/types';
import AppointmentCard from './components/appointment-card';
import { formatTime } from './format';

const ADMIN_ROLES = new Set(['admin', 'super_admin', 'administrator']);

/** Return the ids from a bcl_attendee value that may be a JSON array or legacy string. */
function parseBclAttendees(value: any): string[] {
  if (Array.isArray(value)) return value.map(String);
  if (typeof value === 'string' && value.trim()) {
    try { const p = JSON.parse(value); if (Array.isArray(p)) return p.map(String); } catch {}
    return [value.trim()];
  }
  return [];
}

const DashboardContent = () => {
  const searchParams = useSearchParams();
  const scope = searchParams.get('scope') ?? 'all'; // 'all' | 'assigned' | 'created'

  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedAppointment, setSelectedAppointment] = useState<Appointment | null>(null);
  const [isEditDialogOpen, setEditDialogOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("upcoming");
  const [isRescheduleDialogOpen, setRescheduleDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [calendarConnectionStatus, setCalendarConnectionStatus] = useState<CalendarConnectionStatus>('checking');
  const [isDisconnecting, setIsDisconnecting] = useState(false);
  const [syncingMeetingId, setSyncingMeetingId] = useState<number | null>(null);
  const [currentUser, setCurrentUser] = useState<AuthUser | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [currentPage, setCurrentPage] = useState(0);
  const [itemsPerPage, setItemsPerPage] = useState(12);
  const [searchQuery, setSearchQuery] = useState('');
  const { toast } = useToast();

  const notify = {
    success: (title: string, desc?: string) => toast({
      title: <span className="flex items-center gap-2"><CheckCircle className="h-4 w-4 text-blue-500 flex-shrink-0" /><span className="font-semibold text-blue-800">{title}</span></span>,
      description: desc,
      className: 'border-l-4 border-teal-500 bg-white',
    }),
    warning: (title: string, desc?: string) => toast({
      title: <span className="flex items-center gap-2"><AlertTriangle className="h-4 w-4 text-amber-500 flex-shrink-0" /><span className="font-semibold text-amber-800">{title}</span></span>,
      description: desc,
      className: 'border-l-4 border-amber-400 bg-white',
    }),
    error: (title: string, desc?: string) => toast({
      variant: 'destructive',
      title: <span className="flex items-center gap-2"><XCircle className="h-4 w-4 flex-shrink-0" /><span className="font-semibold">{title}</span></span>,
      description: desc,
    }),
    info: (title: string, desc?: string) => toast({
      title: <span className="flex items-center gap-2"><MessageSquare className="h-4 w-4 text-blue-500 flex-shrink-0" /><span className="font-semibold text-blue-800">{title}</span></span>,
      description: desc,
      className: 'border-l-4 border-blue-400 bg-white',
    }),
  };

  const [isListening, setIsListening] = useState(false);
  const [viewMode, setViewMode] = useState("cards"); // Default to cards
  const [rescheduleFormData, setRescheduleFormData] = useState({
    meetingStartTime: '',
    meetingDuration: '',
    meetingEndTime: '',
    meetingDate: '',
    dateTimeLocal: '',
  });
  const [editFormData, setEditFormData] = useState({
    client_name: '',
    client_company: '',
    client_mobile: '',
    meeting_date: '',
    meeting_start_time: '',
    meeting_duration: '60',
    meeting_end_time: '',
    meeting_type: 'inPerson',
    meeting_venue_area: '',
    meeting_agenda: '',
    bcl_attendee_mobile: '',
  });

  const syncMeetingWithCalendar = async (appointment: Appointment, method: 'POST' | 'PUT' | 'DELETE') => {
    const url = method === 'DELETE'
      ? `/api/auto-sync-calendar?id=${appointment.id_main}`
      : '/api/auto-sync-calendar';

    const currentUserIdentifier = currentUser?.displayName || currentUser?.email || currentUser?.username || null;
    const body = method !== 'DELETE' ? {
      ...appointment,
      created_by: appointment.created_by || currentUserIdentifier,
      updated_by: method === 'PUT' ? currentUserIdentifier : (appointment.updated_by || null),
    } : undefined;

    const response = await fetch(url, {
      method,
      headers: {
        'Content-Type': 'application/json',
      },
      ...(body ? { body: JSON.stringify(body) } : {}),
    });

    if (!response.ok) {
      let errorMessage = `Calendar sync failed with status ${response.status}`;
      const rawText = await response.text();

      if (rawText) {
        try {
          const payload = JSON.parse(rawText);
          errorMessage = payload?.error || rawText;
        } catch {
          errorMessage = rawText;
        }
      }

      throw new Error(errorMessage);
    }

    return response.json().catch(() => null);
  };

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
            notify.info("Appointment Selected", `Opened appointment ID ${appointment.id_main} for ${appointment.client_name}`);
          } else {
            notify.error("Not Found", `Appointment ID ${id} not found in the current view.`);
          }
        } else {
          notify.error("Invalid ID", `"${appointmentId}" is not a valid appointment ID.`);
        }
      }
    },
    {
      command: ['close dialog', 'close appointment', 'exit'],
      callback: () => {
        if (selectedAppointment || isRescheduleDialogOpen) {
          setSelectedAppointment(null);
          setRescheduleDialogOpen(false);
          notify.info("Dialog Closed", "Dialog has been closed");
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
          notify.info("Reschedule Mode", "Reschedule dialog opened");
        } else if (!selectedAppointment) {
          notify.error("No Appointment Selected", "Please select an appointment first using 'open appointment [ID]'.");
        }
      }
    },
    {
      command: ['cancel', 'cancel appointment', 'cancel meeting'],
      callback: () => {
        if (selectedAppointment) {
          handleCancel();
        } else {
          notify.error("No Appointment Selected", "Please select an appointment first using 'open appointment [ID]'.");
        }
      }
    },
    {
      command: ['complete', 'complete appointment', 'mark as complete', 'finish meeting'],
      callback: () => {
        if (selectedAppointment) {
          handleComplete();
        } else {
          notify.error("No Appointment Selected", "Please select an appointment first using 'open appointment [ID]'.");
        }
      }
    },
    {
      command: ['confirm', 'confirm appointment', 'confirm meeting'],
      callback: () => {
        if (selectedAppointment) {
          confirmMeetingClick();
        } else {
          notify.error("No Appointment Selected", "Please select an appointment first using 'open appointment [ID]'.");
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
        notify.info("View Changed", "Switched to table view");
      }
    },
    {
      command: ['switch to card view', 'show card view', 'card view'],
      callback: () => {
        setViewMode("cards");
        notify.info("View Changed", "Switched to card view");
      }
    }
  ];

  const { transcript, listening, resetTranscript, browserSupportsSpeechRecognition } = useSpeechRecognition({ commands });

  // --- Fetch Data & Set Initial View Mode ---
  useEffect(() => {
    const fetchCalendarStatus = async () => {
      try {
        const response = await fetch('/api/auth/google/status');
        if (!response.ok) throw new Error('Failed to load Google Calendar status');
        const result = await response.json();
        setCalendarConnectionStatus(result.connected ? 'connected' : 'disconnected');
      } catch (error) {
        console.error('Error fetching Google Calendar status:', error);
        setCalendarConnectionStatus('disconnected');
      }
    };

    const fetchEvents = async () => {
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from('bcl_meetings_meetings')
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
        notify.error("Error Loading Data", "Failed to load appointments from the database.");
      } finally {
        setLoading(false);
      }
    };

    const fetchUser = async () => {
      try {
        const res = await fetch('/api/auth/session');
        const json = await res.json();
        setCurrentUser(json.authenticated && json.user ? json.user : null);
      } catch {
        setCurrentUser(null);
      }
      try {
        const meRes = await fetch('/api/users/me');
        if (meRes.ok) {
          const me = await meRes.json();
          setCurrentUserId(me.id ?? null);
          setIsAdmin(ADMIN_ROLES.has((me.role ?? '').toLowerCase()));
        }
      } catch {
        // non-critical
      }
    };

    fetchEvents();
    fetchCalendarStatus();
    fetchUser();

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
    window.addEventListener('focus', fetchCalendarStatus);

    // Cleanup listener on component unmount
    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('focus', fetchCalendarStatus);
    };
  }, [toast]); // Added toast to dependency array

  // --- Event Handlers (Mostly Unchanged, added formatting/parsing checks) ---

  const handleSyncMeeting = async (appointment: Appointment) => {
    if (calendarConnectionStatus !== 'connected') {
      notify.error('Not Connected', 'Please connect Google Calendar first.');
      return;
    }
    setSyncingMeetingId(appointment.id_main);
    try {
      const result = await syncMeetingWithCalendar(appointment, 'POST');
      const updated = { google_event_id: result?.eventId || appointment.google_event_id, google_meet_link: result?.hangoutLink || appointment.google_meet_link };
      setAppointments(prev => prev.map(a => a.id_main === appointment.id_main ? { ...a, ...updated } : a));
      setSelectedAppointment(prev => prev?.id_main === appointment.id_main ? { ...prev, ...updated } : prev);
      notify.success('Synced', 'Meeting added to Google Calendar.');
    } catch (error: any) {
      notify.error('Sync Failed', error.message);
    } finally {
      setSyncingMeetingId(null);
    }
  };

  const handleUnsyncMeeting = async (appointment: Appointment) => {
    if (calendarConnectionStatus !== 'connected') {
      notify.error('Not Connected', 'Please connect Google Calendar first.');
      return;
    }
    setSyncingMeetingId(appointment.id_main);
    try {
      await syncMeetingWithCalendar(appointment, 'DELETE');
      const cleared = { google_event_id: null, google_meet_link: null };
      setAppointments(prev => prev.map(a => a.id_main === appointment.id_main ? { ...a, ...cleared } : a));
      setSelectedAppointment(prev => prev?.id_main === appointment.id_main ? { ...prev, ...cleared } : prev);
      notify.success('Removed from Calendar', 'Meeting removed from Google Calendar.');
    } catch (error: any) {
      notify.error('Unsync Failed', error.message);
    } finally {
      setSyncingMeetingId(null);
    }
  };

  const disconnectCalendar = async () => {
    setIsDisconnecting(true);
    try {
      const response = await fetch('/api/auth/google/disconnect', { method: 'POST' });
      if (!response.ok) throw new Error('Disconnect failed');
      setCalendarConnectionStatus('disconnected');
      notify.success('Disconnected', 'Google Calendar has been disconnected.');
    } catch (error: any) {
      notify.error('Disconnect Failed', error.message);
    } finally {
      setIsDisconnecting(false);
    }
  };

  const toggleListening = () => {
    if (!browserSupportsSpeechRecognition) {
      notify.error("Browser Not Supported", "Speech recognition is not supported by your browser.");
      return;
    }
    if (listening) {
      SpeechRecognition.stopListening();
      setIsListening(false);
    } else {
      resetTranscript();
      SpeechRecognition.startListening({ continuous: true });
      setIsListening(true);
      notify.info("Voice Control Activated", "Listening for commands...");
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
      notify.error("Error", 'No appointment selected.');
      return;
    }
    const duration = parseInt(rescheduleFormData.meetingDuration, 10);
    if (!rescheduleFormData.meetingDate || !rescheduleFormData.meetingStartTime || isNaN(duration) || !rescheduleFormData.meetingEndTime) {
      notify.error("Missing Information", 'Please provide a valid date, start time, and duration.');
      return;
    }

    try {
      const updates = {
        meeting_start_time: formatTime(rescheduleFormData.meetingStartTime),
        meeting_duration: duration,
        meeting_end_time: formatTime(rescheduleFormData.meetingEndTime),
        meeting_date: rescheduleFormData.meetingDate,
        status: 'rescheduled',
        badge_status: 'Tentative',
      };

      const response = await fetch(`/api/meetings/${selectedAppointment.id_main}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      });
      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error || 'Reschedule failed');
      }
      const data = await response.json();

      try {
        await syncMeetingWithCalendar(data, 'PUT');
      } catch (googleError) {
        console.error("Google Calendar update failed:", googleError);
        notify.warning("Calendar Sync", "Meeting was rescheduled, but calendar sync failed.");
      }

      setAppointments(prev =>
        prev.map(app =>
          app.id_main === selectedAppointment.id_main ? { ...app, ...data } : app
        )
      );

      notify.success("Rescheduled", "Appointment rescheduled successfully.");

    } catch (error) {
      console.error('Error rescheduling appointment:', error.message);
      notify.error("Reschedule Failed", `Failed to reschedule: ${error.message}`);
    } finally {
      setRescheduleDialogOpen(false);
      setRescheduleFormData({ meetingStartTime: '', meetingDuration: '', meetingEndTime: '', meetingDate: '', dateTimeLocal: '' });
      setSelectedAppointment(null);
    }
  };

  const openEditDialog = (appointment: Appointment) => {
    setEditFormData({
      client_name: appointment.client_name || '',
      client_company: appointment.client_company || '',
      client_mobile: appointment.client_mobile || '',
      meeting_date: appointment.meeting_date || '',
      meeting_start_time: formatTime(appointment.meeting_start_time) || '',
      meeting_duration: String(appointment.meeting_duration || 60),
      meeting_end_time: formatTime(appointment.meeting_end_time) || '',
      meeting_type: appointment.meeting_type || 'inPerson',
      meeting_venue_area: appointment.meeting_venue_area || '',
      meeting_agenda: appointment.meeting_agenda || '',
      bcl_attendee_mobile: appointment.bcl_attendee_mobile || '',
    });
    setEditDialogOpen(true);
  };

  const handleEditInputChange = (event: ChangeEvent<HTMLInputElement | HTMLSelectElement> | { target: { name: string; value: string } }) => {
    const { name, value } = event.target;
    setEditFormData((prev) => {
      const next = { ...prev, [name]: value };
      if ((name === 'meeting_start_time' || name === 'meeting_duration') && next.meeting_start_time && next.meeting_duration) {
        const duration = parseInt(next.meeting_duration, 10);
        if (!isNaN(duration)) {
          const [hours, minutes] = next.meeting_start_time.split(':').map(Number);
          if (Number.isFinite(hours) && Number.isFinite(minutes)) {
            const end = new Date();
            end.setHours(hours, minutes + duration, 0, 0);
            next.meeting_end_time = `${String(end.getHours()).padStart(2, '0')}:${String(end.getMinutes()).padStart(2, '0')}`;
          }
        }
      }
      return next;
    });
  };

  const handleFinalEdit = async () => {
    if (!selectedAppointment) return;
    const duration = parseInt(editFormData.meeting_duration, 10);
    if (!editFormData.client_name.trim() || !editFormData.meeting_date || !editFormData.meeting_start_time || !editFormData.meeting_end_time || isNaN(duration)) {
      notify.error('Missing Details', 'Name, date, start time, end time, and duration are required.');
      return;
    }

    try {
      const payload = {
        client_name: editFormData.client_name.trim(),
        client_company: editFormData.client_company.trim(),
        client_mobile: editFormData.client_mobile.trim(),
        meeting_date: editFormData.meeting_date,
        meeting_day: new Date(editFormData.meeting_date).toLocaleDateString('en-US', { weekday: 'long' }),
        meeting_start_time: editFormData.meeting_start_time,
        meeting_end_time: editFormData.meeting_end_time,
        meeting_duration: duration,
        meeting_type: editFormData.meeting_type,
        meeting_venue_area: editFormData.meeting_venue_area.trim(),
        meeting_agenda: editFormData.meeting_agenda.trim(),
        bcl_attendee_mobile: editFormData.bcl_attendee_mobile.trim(),
      };

      const response = await fetch(`/api/meetings/${selectedAppointment.id_main}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Update failed');

      if (calendarConnectionStatus === 'connected' && data.google_event_id) {
        try {
          await syncMeetingWithCalendar(data, 'PUT');
        } catch (googleError) {
          console.error('Google Calendar update failed:', googleError);
          notify.warning('Calendar Sync', 'Meeting was updated, but calendar sync failed.');
        }
      }

      setAppointments((prev) => prev.map((app) => app.id_main === selectedAppointment.id_main ? { ...app, ...data } : app));
      setSelectedAppointment((prev) => prev ? { ...prev, ...data } : prev);
      setEditDialogOpen(false);
      notify.success('Updated', 'Meeting updated successfully.');
    } catch (error: any) {
      notify.error('Update Failed', error.message);
    }
  };

  const handleCancel = async () => {
    if (!selectedAppointment) {
      notify.error("Error", 'No appointment selected.');
      return;
    }
    try {
      const cancelResponse = await fetch(`/api/meetings/${selectedAppointment.id_main}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'canceled', badge_status: 'Rejected' }),
      });
      if (!cancelResponse.ok) {
        const err = await cancelResponse.json();
        throw new Error(err.error || 'Cancel failed');
      }
      const data = await cancelResponse.json();

      try {
        await syncMeetingWithCalendar(data, 'DELETE');
      } catch (googleError) {
        console.error("Google Calendar cancellation failed:", googleError);
        notify.warning("Calendar Sync", "Meeting was canceled, but calendar removal failed.");
      }

      setAppointments(prev =>
        prev.map(app =>
          app.id_main === selectedAppointment.id_main
            ? { ...app, ...data }
            : app
        )
      );

      notify.success("Canceled", "Appointment canceled.");
    } catch (error) {
      console.error('Error canceling appointment:', error.message);
      notify.error("Cancel Failed", `Failed to cancel: ${error.message}`);
    } finally {
      setSelectedAppointment(null);
    }
  };

  const handleComplete = async () => {
    if (!selectedAppointment) {
      notify.error("Error", 'No appointment selected.');
      return;
    }
    try {
      const id = selectedAppointment.id_main;
      if (typeof id !== 'number' || isNaN(id)) throw new Error('Invalid ID');

      const completeResponse = await fetch(`/api/meetings/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'completed', badge_status: 'Confirmed' }),
      });
      if (!completeResponse.ok) {
        const err = await completeResponse.json();
        throw new Error(err.error || 'Complete failed');
      }
      const data = await completeResponse.json();

      try {
        await syncMeetingWithCalendar(data, 'PUT');
      } catch (googleError) {
        console.error("Google Calendar completion sync failed:", googleError);
        notify.warning("Calendar Sync", "Meeting was completed, but calendar sync failed.");
      }

      setAppointments(prev =>
        prev.map(app =>
          app.id_main === id ? { ...app, ...data } : app
        )
      );

      notify.success("Completed", "Appointment marked as completed.");
    } catch (error) {
      console.error('Error completing appointment:', error.message);
      notify.error("Complete Failed", `Failed to complete: ${error.message}`);
    } finally {
      setSelectedAppointment(null);
    }
  };

  const handleDelete = async () => {
    if (!selectedAppointment) {
      notify.error("Error", 'No appointment selected.');
      return;
    }

    const meetingToDelete = selectedAppointment;

    try {
      if (meetingToDelete.google_event_id) {
        await syncMeetingWithCalendar(meetingToDelete, 'DELETE');
      }
      if (meetingToDelete.google_event_id) {
        const { data: refreshedMeeting, error: refreshError } = await supabase
          .from('bcl_meetings_meetings')
          .select('google_event_id, google_meet_link')
          .eq('id_main', meetingToDelete.id_main)
          .single();

        if (refreshError) throw refreshError;
        if (refreshedMeeting?.google_event_id) {
          throw new Error('Calendar event still exists. Reconnect Google Calendar and try again.');
        }
      }

      const deleteResponse = await fetch(`/api/meetings/${meetingToDelete.id_main}`, { method: 'DELETE' });
      if (!deleteResponse.ok) {
        const err = await deleteResponse.json();
        throw new Error(err.error || 'Delete failed');
      }

      setAppointments(prev => prev.filter(app => app.id_main !== meetingToDelete.id_main));
      notify.success("Deleted", "Meeting permanently deleted.");
      setSelectedAppointment(null);
    } catch (error) {
      console.error('Error deleting appointment:', error.message);
      notify.error("Delete Failed", `Failed to delete: ${error.message}`);
    } finally {
      setDeleteDialogOpen(false);
    }
  };

  const confirmMeetingClick = async () => {
    if (!selectedAppointment) {
      notify.error("Error", 'No appointment selected.');
      return;
    }
    if (selectedAppointment.status === 'canceled' || selectedAppointment.status === 'completed') {
      notify.error("Invalid Action", `Cannot confirm a ${selectedAppointment.status} meeting.`);
      return;
    }
    try {
      const confirmResponse = await fetch(`/api/meetings/${selectedAppointment.id_main}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ badge_status: 'Confirmed' }),
      });
      if (!confirmResponse.ok) {
        const err = await confirmResponse.json();
        throw new Error(err.error || 'Confirm failed');
      }
      const data = await confirmResponse.json();

      try {
        await syncMeetingWithCalendar(data, 'PUT');
      } catch (googleError) {
        console.error("Google Calendar confirmation sync failed:", googleError);
        notify.warning("Calendar Sync", "Meeting was confirmed, but calendar sync failed.");
      }

      setAppointments(prev =>
        prev.map(app =>
          app.id_main === selectedAppointment.id_main
            ? { ...app, ...data }
            : app
        )
      );

      notify.success("Confirmed", "Meeting confirmed.");
    } catch (error) {
      console.error('Error confirming meeting:', error.message);
      notify.error("Confirm Failed", `Failed to confirm: ${error.message}`);
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
      case 'upcoming': return 'bg-blue-600/10 text-blue-700 border-blue-600/20';
      case 'rescheduled': return 'bg-purple-100 text-purple-700 border-purple-300';
      case 'pending': return 'bg-yellow-100 text-yellow-700 border-yellow-300';
      case 'canceled': return 'bg-red-100 text-red-700 border-red-300';
      case 'completed': return 'bg-blue-100 text-blue-700 border-blue-300';
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
      case 'Open': return 'bg-blue-600/10 text-blue-700 border-blue-600/20';
      case 'Confirmed': return 'bg-blue-100 text-blue-700 border-blue-300';
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
      case 'completed': return 'bg-blue-50/30 hover:bg-blue-50/60';
      default: return 'bg-white hover:bg-gray-50/60';
    }
  };

  const today = new Date().toISOString().split('T')[0];
  const totalAppointmentsToday = appointments.filter(
    (appointment) =>
      appointment.meeting_date === today &&
      (appointment.status === 'upcoming' || appointment.status === 'rescheduled' || checkAppointmentStatus(appointment).status === 'pending')
  ).length;

  /** Filter the full appointments list according to the current scope. */
  const scopedAppointments = useMemo(() => {
    // Admins always see everything; 'all' scope also shows everything
    if (isAdmin || scope === 'all' || !currentUserId) return appointments;
    if (scope === 'created') return appointments.filter((a) => a.created_by === currentUserId);
    if (scope === 'assigned') return appointments.filter((a) => parseBclAttendees(a.bcl_attendee).includes(currentUserId));
    return appointments;
  }, [appointments, scope, currentUserId, isAdmin]);

  const visibleAppointments = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return scopedAppointments;
    return scopedAppointments.filter((app) => [
      app.id_main,
      app.client_name,
      app.client_company,
      app.client_mobile,
      app.meeting_agenda,
      app.meeting_venue_area,
      app.bcl_attendee,
      app.status,
      app.badge_status,
    ].some((value) => String(value ?? '').toLowerCase().includes(query)));
  }, [scopedAppointments, searchQuery]);

  const canManageAppointment = useCallback((appointment: Appointment | null | undefined) => {
    if (!appointment) return false;
    if (isAdmin) return true;
    if (!currentUserId) return false;
    return appointment.created_by === currentUserId || parseBclAttendees(appointment.bcl_attendee).includes(currentUserId);
  }, [currentUserId, isAdmin]);

  const appointmentBuckets = useMemo(() => {
    const byStartAsc = (a: Appointment, b: Appointment) =>
      new Date(`${a.meeting_date}T${a.meeting_start_time || '00:00'}`).getTime() -
      new Date(`${b.meeting_date}T${b.meeting_start_time || '00:00'}`).getTime();
    const byMeetingDesc = (a: Appointment, b: Appointment) =>
      new Date(b.meeting_date || 0).getTime() - new Date(a.meeting_date || 0).getTime();
    const byBookingDesc = (a: Appointment, b: Appointment) =>
      new Date(b.booking_date || 0).getTime() - new Date(a.booking_date || 0).getTime();

    return {
      today: visibleAppointments
        .filter((app) => app.meeting_date === today)
        .sort(byStartAsc),
      upcoming: visibleAppointments
        .filter((app) => ['upcoming', 'rescheduled'].includes(checkAppointmentStatus(app).status))
        .sort(byStartAsc),
      pending: visibleAppointments
        .filter((app) => checkAppointmentStatus(app).status === 'pending')
        .sort(byStartAsc),
      recurring: visibleAppointments
        .filter((app) => app.status === 'recurring' || app.meeting_agenda?.toLowerCase().includes('weekly') || app.meeting_agenda?.toLowerCase().includes('recurring'))
        .sort(byStartAsc),
      canceled: visibleAppointments
        .filter((app) => app.status === 'canceled')
        .sort(byBookingDesc),
      completed: visibleAppointments
        .filter((app) => app.status === 'completed')
        .sort(byMeetingDesc),
    };
  }, [visibleAppointments, today]);

  const activeAppointments = appointmentBuckets[activeTab] || [];
  const totalPages = Math.max(1, Math.ceil(activeAppointments.length / itemsPerPage));
  const paginatedAppointments = activeAppointments.slice(currentPage * itemsPerPage, currentPage * itemsPerPage + itemsPerPage);
  const startItem = activeAppointments.length ? currentPage * itemsPerPage + 1 : 0;
  const endItem = Math.min((currentPage + 1) * itemsPerPage, activeAppointments.length);

  useEffect(() => {
    setCurrentPage(0);
  }, [activeTab, viewMode, itemsPerPage, scope, searchQuery]);

  useEffect(() => {
    setCurrentPage((page) => Math.min(page, totalPages - 1));
  }, [totalPages]);

  // --- Loading State (Unchanged) ---
  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center bg-slate-50">
        <div className="rounded-lg border border-slate-200 bg-white px-6 py-5 text-center shadow-sm">
          <div className="flex items-center justify-center gap-2">
            <Loader2 className="h-5 w-5 animate-spin text-blue-600" />
            <div className="h-2 w-2 rounded-full bg-blue-500" />
            <div className="h-2 w-2 rounded-full bg-blue-500" />
          </div>
          <p className="mt-3 text-sm font-medium text-slate-600">Loading schedules...</p>
        </div>
      </div>
    );
  }

  const calendarStatusBadgeClass = calendarConnectionStatus === 'connected'
    ? 'bg-blue-600/10 text-blue-700 border-blue-600/30'
    : calendarConnectionStatus === 'disconnected'
      ? 'bg-red-100 text-red-700 border-red-300'
      : 'bg-yellow-100 text-yellow-700 border-yellow-300';

  const calendarStatusLabel = calendarConnectionStatus === 'connected'
    ? 'Google Calendar Connected'
    : calendarConnectionStatus === 'disconnected'
      ? 'Google Calendar Disconnected'
      : 'Checking Google Calendar';

  const currentUserDisplay = currentUser?.displayName || currentUser?.email || currentUser?.username || 'Authenticated user';
  const currentUserRole = currentUser?.role?.replace(/_/g, ' ') || 'User';
  const syncedCount = scopedAppointments.filter((appointment) => appointment.google_event_id).length;

  const scopeLabel = scope === 'assigned' ? 'Assigned to Me'
    : scope === 'created' ? 'Created by Me'
    : 'All Meetings';

  const statCards = [
    { label: scopeLabel, value: visibleAppointments.length, icon: <CalendarDays className="h-4 w-4" />, accent: 'bg-blue-600', iconClass: 'bg-blue-600/10 text-blue-700' },
    { label: 'Today', value: totalAppointmentsToday, icon: <Clock className="h-4 w-4" />, accent: 'bg-blue-500', iconClass: 'bg-blue-50 text-blue-600' },
    { label: 'Pending', value: appointmentBuckets.pending.length, icon: <MessageSquare className="h-4 w-4" />, accent: 'bg-amber-500', iconClass: 'bg-amber-50 text-amber-600' },
    { label: 'Synced', value: syncedCount, icon: <Cloud className="h-4 w-4" />, accent: 'bg-blue-500', iconClass: 'bg-blue-50 text-blue-600' },
  ];

  const Pager = () => (
    <div className="flex flex-col gap-3 border-t border-slate-100 bg-white px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
      <p className="text-xs text-slate-500">
        Showing <span className="font-semibold text-slate-900">{startItem}</span> to{' '}
        <span className="font-semibold text-slate-900">{endItem}</span> of{' '}
        <span className="font-semibold text-slate-900">{activeAppointments.length}</span>
      </p>
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2">
          <span className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">Rows</span>
          <Select value={String(itemsPerPage)} onValueChange={(value) => setItemsPerPage(Number(value))}>
            <SelectTrigger className="h-8 w-20 rounded-lg border-slate-200 text-xs focus:ring-blue-600/20">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {[8, 12, 24, 48].map((size) => (
                <SelectItem key={size} value={String(size)}>{size}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex items-center gap-1">
          <Button variant="outline" size="icon" className="h-8 w-8 rounded-lg border-slate-200 hover:bg-slate-50" onClick={() => setCurrentPage(0)} disabled={currentPage === 0}>
            <ChevronsLeft className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="icon" className="h-8 w-8 rounded-lg border-slate-200 hover:bg-slate-50" onClick={() => setCurrentPage((page) => Math.max(0, page - 1))} disabled={currentPage === 0}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="min-w-20 text-center text-xs font-semibold text-slate-600">
            {currentPage + 1} / {totalPages}
          </span>
          <Button variant="outline" size="icon" className="h-8 w-8 rounded-lg border-slate-200 hover:bg-slate-50" onClick={() => setCurrentPage((page) => Math.min(totalPages - 1, page + 1))} disabled={currentPage >= totalPages - 1}>
            <ChevronRight className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="icon" className="h-8 w-8 rounded-lg border-slate-200 hover:bg-slate-50" onClick={() => setCurrentPage(totalPages - 1)} disabled={currentPage >= totalPages - 1}>
            <ChevronsRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );

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

  const TimelineEntry = ({ dot, label, detail, isLast }: { dot: string; label: string; detail: string; isLast?: boolean }) => (
    <div className="flex gap-3">
      <div className="flex flex-col items-center">
        <div className={`h-2 w-2 rounded-full ${dot} mt-1 ring-2 ring-white flex-shrink-0`} />
        {!isLast && <div className="mt-1 w-px flex-1 bg-slate-200 min-h-[20px]" />}
      </div>
      <div className={`pb-3 min-w-0 ${isLast ? '' : ''}`}>
        <p className="text-xs font-medium text-slate-800">{label}</p>
        {detail && <p className="mt-0.5 text-[11px] text-slate-500">{detail}</p>}
      </div>
    </div>
  );

  // --- TABLE VIEW (Mobile Adjustments) ---
  const renderTableView = (filteredAppointments) => (
    <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white shadow-sm">
      <Table className="w-full min-w-[900px]">
        <TableHeader className="sticky top-0 z-10 border-b border-slate-200 bg-slate-50">
          <TableRow>
            <TableHead className="w-[40px] px-3 py-2 text-[11px] font-semibold uppercase tracking-wide text-slate-500">#</TableHead>
            <TableHead className="w-[80px] px-3 py-2 text-[11px] font-semibold uppercase tracking-wide text-slate-500">ID</TableHead>
            <TableHead className="w-[120px] px-3 py-2 text-[11px] font-semibold uppercase tracking-wide text-slate-500">Status</TableHead>
            <TableHead className="w-[120px] px-3 py-2 text-[11px] font-semibold uppercase tracking-wide text-slate-500">Confirm</TableHead>
            <TableHead className="px-3 py-2 text-[11px] font-semibold uppercase tracking-wide text-slate-500">Client</TableHead>
            <TableHead className="px-3 py-2 text-[11px] font-semibold uppercase tracking-wide text-slate-500">Company</TableHead>
            <TableHead className="w-[100px] px-3 py-2 text-[11px] font-semibold uppercase tracking-wide text-slate-500">Date</TableHead>
            <TableHead className="w-[80px] px-3 py-2 text-[11px] font-semibold uppercase tracking-wide text-slate-500">Day</TableHead>
            <TableHead className="px-3 py-2 text-[11px] font-semibold uppercase tracking-wide text-slate-500">Venue</TableHead>
            <TableHead className="w-[130px] px-3 py-2 text-[11px] font-semibold uppercase tracking-wide text-slate-500">Time</TableHead>
            <TableHead className="px-3 py-2 text-[11px] font-semibold uppercase tracking-wide text-slate-500">Type</TableHead>
            <TableHead className="px-3 py-2 text-[11px] font-semibold uppercase tracking-wide text-slate-500">Agenda</TableHead>
            <TableHead className="px-3 py-2 text-[11px] font-semibold uppercase tracking-wide text-slate-500">Sync</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {filteredAppointments.length === 0 ? (
            <TableRow>
              <TableCell colSpan={13} className="h-24 text-center text-sm text-slate-500">
                No appointments found.
              </TableCell>
            </TableRow>
          ) : (
            filteredAppointments.map((appointment, index) => {
              const displayAppointment = checkAppointmentStatus(appointment);
              return (
                <TableRow
                  key={appointment.id_main}
                  className="cursor-pointer border-slate-100 hover:bg-blue-600/5"
                  onClick={() => setSelectedAppointment(appointment)}
                >
                  <TableCell className="px-3 py-2 text-xs font-medium text-slate-400">{currentPage * itemsPerPage + index + 1}</TableCell>
                  <TableCell className="px-3 py-2 text-xs font-semibold text-slate-700">{appointment.id_main}</TableCell>
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
                      <Badge variant="outline" className={`text-[10px] ${getBadgeStatusColor(appointment.badge_status)}`}>
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
                  <TableCell className="px-2 py-1.5">
                    {appointment.google_event_id ? (
                      <Badge className="text-[10px] bg-blue-100 text-blue-700 border-blue-200 flex items-center gap-0.5 w-fit">
                        <Calendar className="h-2.5 w-2.5" />Synced
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="text-[10px] text-gray-400 flex items-center gap-0.5 w-fit">
                        <Calendar className="h-2.5 w-2.5" />Not Synced
                      </Badge>
                    )}
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
            calendarConnectionStatus={calendarConnectionStatus}
            onSync={handleSyncMeeting}
            onUnsync={handleUnsyncMeeting}
            isSyncing={syncingMeetingId === appointment.id_main}
          />
        ))}
      </div>
    )
  );


  // --- MAIN RETURN ---
  return (
    <div className="min-h-screen space-y-5 bg-slate-50 p-4 md:p-6 lg:p-8">
      <Toaster />

      {/* ── Page Header ── */}
      <Card className="overflow-hidden rounded-lg border-slate-200 bg-white shadow-sm">
        <div className="h-1 w-full bg-blue-600" />
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 p-5 sm:p-6">
          <div>
            <Badge className="mb-3 rounded-lg bg-blue-600/10 text-blue-700 hover:bg-blue-600/10">BCL Meetings</Badge>
            <h1 className="text-3xl font-bold text-slate-950 tracking-tight md:text-4xl">Meeting Dashboard</h1>
            <div className="flex items-center gap-2 mt-1 flex-wrap">
              <p className="text-sm text-slate-500">Review appointments, pending actions, and calendar sync.</p>
              {currentUser && (
                <span className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600/10 px-2.5 py-1 text-xs font-medium text-blue-700 ring-1 ring-blue-600/15">
                  <ShieldCheck className="h-3.5 w-3.5" />
                  {currentUserDisplay}
                  <span className="hidden sm:inline text-[#0DAA8A]">({currentUserRole})</span>
                </span>
              )}
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto justify-start sm:justify-end">
            <Badge
              variant="outline"
              className={`px-2.5 py-1 text-xs font-medium rounded-lg ${calendarStatusBadgeClass}`}
            >
              {calendarStatusLabel}
            </Badge>
            {calendarConnectionStatus === 'connected' ? (
              <>
                <Button
                  onClick={() => window.open('/api/auth/google', '_blank')}
                  variant="outline"
                  size="sm"
                  className="h-9 gap-1.5 rounded-lg border-slate-200 text-slate-600 hover:bg-slate-50 text-xs"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  Reconnect
                </Button>
                <Button
                  onClick={disconnectCalendar}
                  disabled={isDisconnecting}
                  variant="outline"
                  size="sm"
                  className="h-9 gap-1.5 rounded-lg border-red-200 text-red-600 hover:bg-red-50 text-xs"
                >
                  <XCircle className="w-3.5 h-3.5" />
                  {isDisconnecting ? 'Disconnecting...' : 'Disconnect'}
                </Button>
              </>
            ) : (
              <Button
                onClick={() => window.open('/api/auth/google', '_blank')}
                size="sm"
                className="h-9 gap-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs"
              >
                <Calendar className="w-3.5 h-3.5" />
                Connect Google Calendar
              </Button>
            )}
          </div>
        </div>
      </Card>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {statCards.map((card) => (
          <Card key={card.label} className="relative overflow-hidden rounded-lg border-slate-200 bg-white shadow-sm">
            <div className={`absolute inset-x-0 top-0 h-0.5 ${card.accent}`} />
            <div className="p-4">
              <div className={`mb-3 flex h-9 w-9 items-center justify-center rounded-lg ${card.iconClass}`}>
                {card.icon}
              </div>
              <p className="text-2xl font-bold text-slate-950">{card.value}</p>
              <p className="mt-1 text-xs font-medium text-slate-500">{card.label}</p>
            </div>
          </Card>
        ))}
      </div>

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

      {/* ── Scope selector ── */}
      <div className="flex flex-wrap items-center gap-2">
        {[
          { value: 'all', label: 'All Meetings', icon: <CalendarDays className="h-3.5 w-3.5" />, show: isAdmin },
          { value: 'assigned', label: 'Assigned to Me', icon: <User className="h-3.5 w-3.5" />, show: true },
          { value: 'created', label: 'Created by Me', icon: <BookOpen className="h-3.5 w-3.5" />, show: true },
        ]
          .filter((s) => s.show)
          .map((s) => (
            <a
              key={s.value}
              href={s.value === 'all' ? '/' : `/?scope=${s.value}`}
              className={`flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-semibold transition-all ring-1 ${
                scope === s.value || (s.value === 'all' && scope === 'all')
                  ? 'bg-blue-600 text-white ring-blue-600 shadow-sm shadow-blue-600/20'
                  : 'bg-white text-slate-600 ring-slate-200 hover:bg-slate-50'
              }`}
            >
              {s.icon}
              {s.label}
              <span className={`ml-0.5 rounded-full px-1.5 py-0.5 text-[10px] font-bold ${
                scope === s.value ? 'bg-white/25 text-white' : 'bg-slate-100 text-slate-500'
              }`}>
                {s.value === 'all' ? appointments.length
                  : s.value === 'created' ? appointments.filter(a => a.created_by === currentUserId).length
                  : appointments.filter(a => parseBclAttendees(a.bcl_attendee).includes(currentUserId)).length}
              </span>
            </a>
          ))}
      </div>

      {/* ── Controls bar ── */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative min-w-[240px] flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
          <Input
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
            placeholder="Search client, agenda, attendee, venue..."
            className="h-10 rounded-lg border-slate-200 bg-white pl-9 text-sm shadow-sm focus:border-blue-600 focus:ring-blue-600/20"
          />
        </div>
        {/* View toggle */}
        <div className="flex items-center rounded-lg bg-white p-1 shadow-sm ring-1 ring-slate-200">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setViewMode("cards")}
            className={`h-8 rounded-md px-3 text-xs gap-1.5 ${viewMode === "cards" ? "bg-blue-600 text-white hover:bg-blue-700" : "text-slate-500 hover:bg-slate-50"}`}
          >
            <LayoutGrid className="h-3.5 w-3.5" />
            Cards
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setViewMode("table")}
            className={`h-8 rounded-md px-3 text-xs gap-1.5 ${viewMode === "table" ? "bg-blue-600 text-white hover:bg-blue-700" : "text-slate-500 hover:bg-slate-50"}`}
          >
            <Table2 className="h-3.5 w-3.5" />
            Table
          </Button>
        </div>

        {/* Today's meetings stat */}
        <div className="flex items-center gap-2 rounded-lg bg-white px-3 py-1.5 shadow-sm ring-1 ring-slate-200">
          <div className="w-6 h-6 rounded-md bg-blue-600/10 flex items-center justify-center">
            <Calendar className="h-3.5 w-3.5 text-blue-700" />
          </div>
          <div>
            <p className="text-[10px] text-slate-400 leading-none">Today</p>
            <p className="text-sm font-bold text-slate-800 leading-tight">{totalAppointmentsToday} meeting{totalAppointmentsToday !== 1 ? 's' : ''}</p>
          </div>
        </div>
      </div>

      <div>

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

        {/* ── Tabs ── */}
        <Tabs defaultValue="upcoming" value={activeTab} onValueChange={setActiveTab} className="overflow-hidden rounded-lg bg-white shadow-sm ring-1 ring-slate-200">
          <div className="px-4 pt-4 pb-3 border-b border-slate-100">
            <TabsList className="grid h-auto grid-cols-2 gap-1 rounded-lg bg-slate-100 p-1 sm:grid-cols-3 lg:grid-cols-6">
              {[
                { value: 'today', active: 'bg-blue-600 text-white shadow-sm', counts: appointmentBuckets.today.length },
                { value: 'upcoming', active: 'bg-blue-600 text-white shadow-sm', counts: appointmentBuckets.upcoming.length },
                { value: 'pending', active: 'bg-amber-500 text-white shadow-sm', counts: appointmentBuckets.pending.length },
                { value: 'recurring', active: 'bg-purple-500 text-white shadow-sm', counts: appointmentBuckets.recurring.length },
                { value: 'canceled', active: 'bg-red-500 text-white shadow-sm', counts: appointmentBuckets.canceled.length },
                { value: 'completed', active: 'bg-blue-600 text-white shadow-sm', counts: appointmentBuckets.completed.length },
              ].map(({ value, active, counts }) => (
                <TabsTrigger
                  key={value}
                  value={value}
                  className={`text-xs font-medium py-1.5 rounded-md data-[state=active]:shadow-none text-slate-500 data-[state=active]:text-white ${active.includes('#0DAA8A') ? 'data-[state=active]:bg-blue-600' : active.includes('amber') ? 'data-[state=active]:bg-amber-500' : active.includes('purple') ? 'data-[state=active]:bg-purple-500' : active.includes('red') ? 'data-[state=active]:bg-red-500' : 'data-[state=active]:bg-blue-600'}`}
                >
                  <span className="flex items-center gap-1.5">
                    {value.charAt(0).toUpperCase() + value.slice(1)}
                    <span className="hidden sm:inline-flex items-center justify-center w-4 h-4 rounded-full text-[10px] bg-white/25 font-bold">{counts}</span>
                  </span>
                </TabsTrigger>
              ))}
            </TabsList>
          </div>
          <div className="p-4">

            {/* Tab Content Panes */}
            {(['today', 'upcoming', 'pending', 'recurring', 'canceled', 'completed'] as const).map((value) => (
              <TabsContent key={value} value={value} className="mt-0">
                {viewMode === "cards" ? renderCardView(paginatedAppointments) : renderTableView(paginatedAppointments)}
                {activeAppointments.length > 0 && <Pager />}
              </TabsContent>
            ))}
          </div>{/* /p-4 */}
        </Tabs>

        {/* --- SELECTED APPOINTMENT DETAILS DIALOG --- */}
        <Dialog open={!!selectedAppointment} onOpenChange={(open) => !open && setSelectedAppointment(null)}>
          <DialogContent className="max-w-sm sm:max-w-xl md:max-w-3xl rounded-lg p-0 overflow-hidden bg-white">
            {/* Dialog Header */}
            <DialogHeader className="px-5 pt-5 pb-4 border-b border-slate-100">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <DialogTitle className="text-lg font-bold text-slate-900 truncate">
                    {selectedAppointment?.client_name}
                  </DialogTitle>
                  <DialogDescription className="text-xs text-slate-500 mt-0.5">
                    {selectedAppointment?.client_company && (
                      <span className="flex items-center gap-1">
                        <Building className="h-3 w-3" />
                        {selectedAppointment.client_company}
                        <span className="text-slate-300">·</span>
                        ID {selectedAppointment?.id_main}
                      </span>
                    )}
                  </DialogDescription>
                </div>
                {selectedAppointment && (
                  <div className="flex gap-1.5 flex-shrink-0 flex-wrap justify-end">
                    <Badge variant="outline" className={`${getBadgeStatusColor(selectedAppointment.badge_status)} text-xs px-2 py-0.5`}>
                      {selectedAppointment.badge_status}
                    </Badge>
                    <Badge variant="outline" className={`${getStatusColor(checkAppointmentStatus(selectedAppointment).status)} text-xs px-2 py-0.5`}>
                      {checkAppointmentStatus(selectedAppointment).status}
                    </Badge>
                  </div>
                )}
              </div>
            </DialogHeader>

            {selectedAppointment && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-[60vh] overflow-y-auto p-5 pt-4">
                {/* Column 1 */}
                <div className="space-y-3">
                  <div className="rounded-lg ring-1 ring-slate-100 overflow-hidden">
                    <div className="flex items-center gap-2 px-3 py-2 bg-slate-50 border-b border-slate-100">
                      <div className="w-5 h-5 rounded-md bg-blue-50 flex items-center justify-center">
                        <UserPlus className="h-3 w-3 text-blue-600" />
                      </div>
                      <span className="text-xs font-semibold text-slate-600 uppercase tracking-wide">Client</span>
                    </div>
                    <div className="p-3 space-y-2">
                      {renderAppointmentDetailItem('Name', selectedAppointment.client_name)}
                      {renderAppointmentDetailItem('Company', selectedAppointment.client_company, <Building />)}
                      {renderAppointmentDetailItem('Mobile', selectedAppointment.client_mobile, <Phone />)}
                    </div>
                  </div>

                  <div className="rounded-lg ring-1 ring-slate-100 overflow-hidden">
                    <div className="flex items-center gap-2 px-3 py-2 bg-slate-50 border-b border-slate-100">
                      <div className="w-5 h-5 rounded-md bg-blue-50 flex items-center justify-center">
                        <Calendar className="h-3 w-3 text-blue-600" />
                      </div>
                      <span className="text-xs font-semibold text-slate-600 uppercase tracking-wide">Meeting Details</span>
                    </div>
                    <div className="p-3 grid grid-cols-2 gap-x-4 gap-y-2">
                      {renderAppointmentDetailItem('Date', selectedAppointment.meeting_date ? new Date(selectedAppointment.meeting_date).toLocaleDateString('en-GB', { year: 'numeric', month: 'short', day: 'numeric' }) : 'N/A')}
                      {renderAppointmentDetailItem('Day', selectedAppointment.meeting_day)}
                      {renderAppointmentDetailItem('Start', formatTime(selectedAppointment.meeting_start_time), <Clock />)}
                      {renderAppointmentDetailItem('End', formatTime(selectedAppointment.meeting_end_time))}
                      {renderAppointmentDetailItem('Duration', `${selectedAppointment.meeting_duration || '?'} min`)}
                      {renderAppointmentDetailItem('Type', selectedAppointment.meeting_type)}
                      <div className="col-span-2">{renderAppointmentDetailItem('Venue', selectedAppointment.meeting_venue_area, <MapPin />)}</div>
                    </div>
                  </div>
                </div>

                {/* Column 2 */}
                <div className="space-y-3">
                  <div className="rounded-lg ring-1 ring-slate-100 overflow-hidden">
                    <div className="flex items-center gap-2 px-3 py-2 bg-slate-50 border-b border-slate-100">
                      <div className="w-5 h-5 rounded-md bg-purple-50 flex items-center justify-center">
                        <MessageSquare className="h-3 w-3 text-purple-600" />
                      </div>
                      <span className="text-xs font-semibold text-slate-600 uppercase tracking-wide">Agenda</span>
                    </div>
                    <div className="p-3">
                      <p className="text-xs text-slate-600 bg-slate-50 rounded-lg p-2.5 border border-slate-100 max-h-24 overflow-y-auto leading-relaxed">
                        {selectedAppointment.meeting_agenda || 'No agenda provided.'}
                      </p>
                    </div>
                  </div>

                  <div className="rounded-lg ring-1 ring-slate-100 overflow-hidden">
                    <div className="flex items-center gap-2 px-3 py-2 bg-slate-50 border-b border-slate-100">
                      <div className="w-5 h-5 rounded-md bg-orange-50 flex items-center justify-center">
                        <UserPlus className="h-3 w-3 text-orange-600" />
                      </div>
                      <span className="text-xs font-semibold text-slate-600 uppercase tracking-wide">BCL Attendee</span>
                    </div>
                    <div className="p-3 space-y-2">
                      {renderAppointmentDetailItem('Name', selectedAppointment.bcl_attendee)}
                      {renderAppointmentDetailItem('Mobile', selectedAppointment.bcl_attendee_mobile, <Phone />)}
                    </div>
                  </div>

                  <div className="rounded-lg ring-1 ring-slate-100 overflow-hidden">
                    <div className="flex items-center gap-2 px-3 py-2 bg-slate-50 border-b border-slate-100">
                      <div className="w-5 h-5 rounded-md bg-blue-50 flex items-center justify-center">
                        <Users className="h-3 w-3 text-blue-600" />
                      </div>
                      <span className="text-xs font-semibold text-slate-600 uppercase tracking-wide">Participants</span>
                    </div>
                    <div className="p-3 space-y-1.5">
                      {/* Client */}
                      {selectedAppointment.client_name && (
                        <div className="flex items-center justify-between rounded-lg bg-slate-50 px-2.5 py-1.5 ring-1 ring-slate-100">
                          <div className="flex items-center gap-2">
                            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-blue-600/10 text-[10px] font-bold text-blue-700">
                              {String(selectedAppointment.client_name).slice(0, 2).toUpperCase()}
                            </span>
                            <span className="text-xs font-medium text-slate-700">{selectedAppointment.client_name}</span>
                          </div>
                          <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-semibold text-amber-700">Client</span>
                        </div>
                      )}
                      {/* BCL attendees */}
                      {parseBclAttendees(selectedAppointment.bcl_attendee).filter(Boolean).map((name, index) => (
                        <div key={`${name}-${index}`} className="flex items-center justify-between rounded-lg bg-slate-50 px-2.5 py-1.5 ring-1 ring-slate-100">
                          <div className="flex items-center gap-2">
                            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-blue-600/10 text-[10px] font-bold text-blue-700">
                              {String(name).slice(0, 2).toUpperCase()}
                            </span>
                            <span className="text-xs font-medium text-slate-700">{name}</span>
                          </div>
                          <span className="rounded-full bg-blue-100 px-2 py-0.5 text-[10px] font-semibold text-blue-700">BCL Staff</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="rounded-lg ring-1 ring-slate-100 overflow-hidden">
                    <div className="flex items-center gap-2 px-3 py-2 bg-slate-50 border-b border-slate-100">
                      <div className="w-5 h-5 rounded-md bg-slate-100 flex items-center justify-center">
                        <History className="h-3 w-3 text-slate-600" />
                      </div>
                      <span className="text-xs font-semibold text-slate-600 uppercase tracking-wide">Activity Timeline</span>
                    </div>
                    <div className="p-3">
                      <div className="relative space-y-0">
                        {/* Created */}
                        <TimelineEntry
                          dot="bg-blue-600"
                          label="Meeting created"
                          detail={`Booked on ${selectedAppointment.booking_date || 'N/A'}${selectedAppointment.created_by ? ` by ${selectedAppointment.created_by}` : ''}`}
                          isLast={!selectedAppointment.updated_by && checkAppointmentStatus(selectedAppointment).status === 'upcoming'}
                        />
                        {/* Status entries */}
                        {selectedAppointment.badge_status && selectedAppointment.badge_status !== 'Pending' && (
                          <TimelineEntry
                            dot="bg-blue-400"
                            label={`Marked as ${selectedAppointment.badge_status}`}
                            detail="Status updated"
                            isLast={!selectedAppointment.updated_by}
                          />
                        )}
                        {/* Rescheduled */}
                        {selectedAppointment.status === 'rescheduled' && (
                          <TimelineEntry
                            dot="bg-amber-500"
                            label="Rescheduled"
                            detail={`New date: ${selectedAppointment.meeting_date || 'N/A'}`}
                            isLast={!selectedAppointment.updated_by}
                          />
                        )}
                        {/* Cancelled */}
                        {selectedAppointment.status === 'canceled' && (
                          <TimelineEntry
                            dot="bg-red-500"
                            label="Meeting cancelled"
                            detail={selectedAppointment.updated_by ? `By ${selectedAppointment.updated_by}` : ''}
                            isLast
                          />
                        )}
                        {/* Completed */}
                        {selectedAppointment.status === 'completed' && (
                          <TimelineEntry
                            dot="bg-green-500"
                            label="Meeting completed"
                            detail={selectedAppointment.updated_by ? `Marked by ${selectedAppointment.updated_by}` : ''}
                            isLast
                          />
                        )}
                        {/* Last updated (only for non-terminal states) */}
                        {selectedAppointment.updated_by && selectedAppointment.status !== 'canceled' && selectedAppointment.status !== 'completed' && (
                          <TimelineEntry
                            dot="bg-slate-400"
                            label="Last updated"
                            detail={`By ${selectedAppointment.updated_by}`}
                            isLast
                          />
                        )}
                      </div>
                    </div>
                  </div>

                  {selectedAppointment.google_meet_link && (
                    <div className="rounded-lg ring-1 ring-blue-100 overflow-hidden">
                      <div className="flex items-center gap-2 px-3 py-2 bg-blue-50 border-b border-blue-100">
                        <div className="w-5 h-5 rounded-md bg-blue-100 flex items-center justify-center">
                          <Video className="h-3 w-3 text-blue-600" />
                        </div>
                        <span className="text-xs font-semibold text-blue-700 uppercase tracking-wide">Google Meet</span>
                      </div>
                      <div className="p-3">
                        {renderAppointmentDetailItem('Link', selectedAppointment.google_meet_link, null, true)}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Footer Actions */}
            <DialogFooter className="flex flex-col sm:flex-row gap-2 sm:justify-between items-center px-5 py-4 border-t border-slate-100 bg-slate-50/50">
              {/* Wrap action buttons for smaller screens */}
              <div className="flex flex-wrap gap-2 justify-center sm:justify-start w-full sm:w-auto">
                {canManageAppointment(selectedAppointment) && selectedAppointment?.status !== 'canceled' && selectedAppointment?.status !== 'completed' && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => selectedAppointment && openEditDialog(selectedAppointment)}
                    className="rounded-lg border-slate-300 text-slate-700 hover:bg-slate-50 px-3 py-1.5 text-xs sm:text-sm"
                  >
                    <BookOpen className="h-3.5 w-3.5 mr-1 sm:mr-1.5" />
                    Edit
                  </Button>
                )}
                {canManageAppointment(selectedAppointment) && selectedAppointment?.status !== 'canceled' && selectedAppointment?.status !== 'completed' && (
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
                    className="rounded-lg border-blue-200 text-blue-700 hover:bg-blue-50 px-3 py-1.5 text-xs sm:text-sm"
                  >
                    <RefreshCw className="h-3.5 w-3.5 mr-1 sm:mr-1.5" />
                    Reschedule
                  </Button>
                )}
                {canManageAppointment(selectedAppointment) && selectedAppointment?.badge_status !== 'Confirmed' && selectedAppointment?.status !== 'canceled' && selectedAppointment?.status !== 'completed' && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={confirmMeetingClick}
                    className="border-blue-300 text-blue-700 hover:bg-blue-50 px-3 py-1.5 text-xs sm:text-sm"
                  >
                    <CheckCircle className="h-3.5 w-3.5 mr-1 sm:mr-1.5" />
                    Confirm
                  </Button>
                )}
                {canManageAppointment(selectedAppointment) && selectedAppointment?.status !== 'canceled' && selectedAppointment?.status !== 'completed' && (
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
                {canManageAppointment(selectedAppointment) && selectedAppointment?.status !== 'completed' && selectedAppointment?.status !== 'canceled' && (
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
                {canManageAppointment(selectedAppointment) && selectedAppointment?.status !== 'completed' && selectedAppointment?.status !== 'canceled' && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => notify.info('Reminder queued', 'Email, SMS, WhatsApp, and push reminders are represented as UI placeholders.')}
                    className="border-emerald-300 text-emerald-700 hover:bg-emerald-50 px-3 py-1.5 text-xs sm:text-sm"
                  >
                    <Send className="h-3.5 w-3.5 mr-1 sm:mr-1.5" />
                    Send Reminder
                  </Button>
                )}
                {canManageAppointment(selectedAppointment) && calendarConnectionStatus === 'connected' && selectedAppointment?.status !== 'canceled' && (
                  selectedAppointment?.google_event_id ? (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleUnsyncMeeting(selectedAppointment)}
                      disabled={syncingMeetingId === selectedAppointment?.id_main}
                      className="border-orange-300 text-orange-700 hover:bg-orange-50 px-3 py-1.5 text-xs sm:text-sm"
                    >
                      {syncingMeetingId === selectedAppointment?.id_main
                        ? <><Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" />Unsyncing...</>
                        : <><CloudOff className="h-3.5 w-3.5 mr-1" />Unsync Calendar</>
                      }
                    </Button>
                  ) : (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleSyncMeeting(selectedAppointment)}
                      disabled={syncingMeetingId === selectedAppointment?.id_main}
                      className="border-blue-300 text-blue-700 hover:bg-blue-50 px-3 py-1.5 text-xs sm:text-sm"
                    >
                      {syncingMeetingId === selectedAppointment?.id_main
                        ? <><Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" />Syncing...</>
                        : <><Cloud className="h-3.5 w-3.5 mr-1" />Sync to Calendar</>
                      }
                    </Button>
                  )
                )}
                {canManageAppointment(selectedAppointment) && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setDeleteDialogOpen(true)}
                    className="border-red-400 text-red-800 hover:bg-red-50 px-3 py-1.5 text-xs sm:text-sm"
                  >
                    <Trash2 className="h-3.5 w-3.5 mr-1 sm:mr-1.5" />
                    Delete Permanently
                  </Button>
                )}
                {!canManageAppointment(selectedAppointment) && (
                  <span className="rounded-lg bg-slate-100 px-3 py-1.5 text-xs font-medium text-slate-500">
                    View only for your role
                  </span>
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

        <Dialog open={isEditDialogOpen} onOpenChange={setEditDialogOpen}>
          <DialogContent className="max-w-sm sm:max-w-2xl rounded-lg p-0 overflow-hidden bg-white">
            <DialogHeader className="px-5 pt-5 pb-4 border-b border-slate-100">
              <DialogTitle className="text-base font-bold text-slate-900">Edit Meeting</DialogTitle>
              <DialogDescription className="text-xs text-slate-500">
                Update the meeting details and save them to the booking database.
              </DialogDescription>
            </DialogHeader>
            <div className="grid max-h-[65vh] grid-cols-1 gap-4 overflow-y-auto p-5 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label className="text-xs">Client Name</Label>
                <Input name="client_name" value={editFormData.client_name} onChange={handleEditInputChange} className="h-9 rounded-lg text-xs" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Company</Label>
                <Input name="client_company" value={editFormData.client_company} onChange={handleEditInputChange} className="h-9 rounded-lg text-xs" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Mobile</Label>
                <Input name="client_mobile" value={editFormData.client_mobile} onChange={handleEditInputChange} className="h-9 rounded-lg text-xs" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Date</Label>
                <Input name="meeting_date" type="date" value={editFormData.meeting_date} onChange={handleEditInputChange} className="h-9 rounded-lg text-xs" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Start Time</Label>
                <Input name="meeting_start_time" type="time" value={editFormData.meeting_start_time} onChange={handleEditInputChange} className="h-9 rounded-lg text-xs" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Duration</Label>
                <Select value={editFormData.meeting_duration} onValueChange={(value) => handleEditInputChange({ target: { name: 'meeting_duration', value } })}>
                  <SelectTrigger className="h-9 rounded-lg text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {[15, 30, 45, 60, 90, 120, 180, 240].map((minutes) => (
                      <SelectItem key={minutes} value={String(minutes)}>{minutes} minutes</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">End Time</Label>
                <Input name="meeting_end_time" type="time" value={editFormData.meeting_end_time} onChange={handleEditInputChange} className="h-9 rounded-lg text-xs" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Type</Label>
                <Select value={editFormData.meeting_type} onValueChange={(value) => handleEditInputChange({ target: { name: 'meeting_type', value } })}>
                  <SelectTrigger className="h-9 rounded-lg text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="virtual">Virtual</SelectItem>
                    <SelectItem value="inPerson">Physical</SelectItem>
                    <SelectItem value="physical">Physical</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5 sm:col-span-2">
                <Label className="text-xs">Venue</Label>
                <Input name="meeting_venue_area" value={editFormData.meeting_venue_area} onChange={handleEditInputChange} className="h-9 rounded-lg text-xs" />
              </div>
              <div className="space-y-1.5 sm:col-span-2">
                <Label className="text-xs">Agenda / Notes</Label>
                <Input name="meeting_agenda" value={editFormData.meeting_agenda} onChange={handleEditInputChange} className="h-9 rounded-lg text-xs" />
              </div>
              <div className="space-y-1.5 sm:col-span-2">
                <Label className="text-xs">BCL Attendee Mobile</Label>
                <Input name="bcl_attendee_mobile" value={editFormData.bcl_attendee_mobile} onChange={handleEditInputChange} className="h-9 rounded-lg text-xs" />
              </div>

              {/* Reminder settings */}
              <div className="sm:col-span-2 rounded-xl border border-slate-200 bg-slate-50 p-3 space-y-2">
                <p className="text-xs font-semibold text-slate-600 flex items-center gap-1.5">
                  <Bell className="h-3.5 w-3.5 text-blue-600" />
                  Reminder Settings
                </p>
                <p className="text-[11px] text-slate-400">Choose how participants should be notified about this meeting.</p>
                <div className="grid grid-cols-3 gap-2 pt-1">
                  {[
                    { key: 'whatsapp', label: 'WhatsApp', color: 'text-green-700 bg-green-50 border-green-200' },
                    { key: 'email', label: 'Email', color: 'text-blue-700 bg-blue-50 border-blue-200' },
                    { key: 'sms', label: 'SMS', color: 'text-slate-700 bg-slate-100 border-slate-200' },
                  ].map(({ key, label, color }) => (
                    <label key={key} className={`flex cursor-pointer items-center justify-center gap-1.5 rounded-lg border px-2 py-1.5 text-[11px] font-medium transition-all ${color}`}>
                      <input type="checkbox" className="h-3 w-3 accent-blue-600" defaultChecked={key === 'email'} />
                      {label}
                    </label>
                  ))}
                </div>
                <div className="flex items-center gap-2 pt-1">
                  <p className="text-[11px] text-slate-500 flex-1">Reminder timing</p>
                  <Select defaultValue="30">
                    <SelectTrigger className="h-7 w-32 rounded-lg text-[11px]"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="5">5 min before</SelectItem>
                      <SelectItem value="15">15 min before</SelectItem>
                      <SelectItem value="30">30 min before</SelectItem>
                      <SelectItem value="60">1 hour before</SelectItem>
                      <SelectItem value="1440">1 day before</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
            <DialogFooter className="px-5 py-4 border-t border-slate-100 bg-slate-50/50 flex gap-2">
              <Button variant="outline" size="sm" onClick={() => setEditDialogOpen(false)} className="flex-1 rounded-lg border-slate-200 text-xs h-8">Cancel</Button>
              <Button size="sm" onClick={handleFinalEdit} className="flex-1 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs h-8">Save Changes</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* --- RESCHEDULE DIALOG --- */}
        <Dialog open={isRescheduleDialogOpen} onOpenChange={setRescheduleDialogOpen}>
          <DialogContent className="max-w-xs sm:max-w-sm rounded-lg p-0 overflow-hidden bg-white">
            <DialogHeader className="px-5 pt-5 pb-4 border-b border-slate-100">
              <DialogTitle className="text-base font-bold text-slate-900 flex items-center gap-2">
                <div className="w-6 h-6 rounded-md bg-blue-50 flex items-center justify-center">
                  <RefreshCw className="h-3.5 w-3.5 text-blue-600" />
                </div>
                Reschedule Meeting
              </DialogTitle>
              <DialogDescription className="text-xs text-slate-500 mt-0.5">
                {selectedAppointment?.client_name}
              </DialogDescription>
            </DialogHeader>

            <div className="p-5 space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="dateTimeLocal" className="text-xs font-medium text-slate-700">New Date &amp; Start Time</Label>
                <div className="relative">
                  <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                  <Input
                    id="dateTimeLocal"
                    name="dateTimeLocal"
                    type="datetime-local"
                    value={rescheduleFormData.dateTimeLocal}
                    onChange={handleRescheduleInputChange}
                    min={new Date().toISOString().slice(0, 16)}
                    className="pl-9 h-9 rounded-lg border-slate-200 text-xs focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="meetingDuration" className="text-xs font-medium text-slate-700">Duration</Label>
                <div className="relative">
                  <Clock className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400 z-10" />
                  <Select
                    value={rescheduleFormData.meetingDuration}
                    onValueChange={(value) => handleRescheduleInputChange({ target: { name: 'meetingDuration', value } })}
                  >
                    <SelectTrigger className="pl-9 h-9 rounded-lg border-slate-200 text-xs">
                      <SelectValue placeholder="Select duration" />
                    </SelectTrigger>
                    <SelectContent className="rounded-lg">
                      {[['15', '15 minutes'], ['30', '30 minutes'], ['45', '45 minutes'], ['60', '1 hour'], ['90', '1.5 hours'], ['120', '2 hours'], ['180', '3 hours'], ['240', '4 hours']].map(([v, l]) => (
                        <SelectItem key={v} value={v} className="text-xs">{l}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="meetingEndTime" className="text-xs font-medium text-slate-700">Calculated End Time</Label>
                <Input
                  id="meetingEndTime"
                  value={rescheduleFormData.meetingEndTime || '--:--'}
                  readOnly
                  className="h-9 rounded-lg bg-slate-50 border-slate-200 text-xs text-slate-500 cursor-default"
                />
              </div>

              <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                <div className="mb-2 flex items-center justify-between">
                  <span className="text-xs font-semibold text-slate-700">Availability</span>
                  <Badge variant="outline" className="border-amber-200 bg-amber-50 text-[10px] text-amber-700">Conflict scan UI</Badge>
                </div>
                <div className="grid grid-cols-3 gap-1.5">
                  {['09:00', '11:00', '14:00', '15:30', '16:00', '17:00'].map((slot) => {
                    const conflict = slot === '11:00';
                    return (
                      <button
                        key={slot}
                        type="button"
                        onClick={() => !conflict && handleRescheduleInputChange({ target: { name: 'dateTimeLocal', value: `${rescheduleFormData.meetingDate || today}T${slot}` } })}
                        className={`rounded-lg px-2 py-2 text-xs font-medium ring-1 transition ${
                          conflict
                            ? 'cursor-not-allowed bg-red-50 text-red-500 ring-red-100'
                            : 'bg-white text-slate-700 ring-slate-200 hover:bg-blue-600/10 hover:text-blue-700'
                        }`}
                      >
                        {slot}
                      </button>
                    );
                  })}
                </div>
                <p className="mt-2 text-[11px] text-slate-500">Suggested open slots are selectable; red slots show detected conflicts.</p>
              </div>
            </div>

            <DialogFooter className="px-5 py-4 border-t border-slate-100 bg-slate-50/50 flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setRescheduleDialogOpen(false)}
                className="flex-1 rounded-lg border-slate-200 text-xs h-8"
              >
                Cancel
              </Button>
              <Button
                onClick={handleFinalReschedule}
                size="sm"
                className="flex-1 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs h-8"
                disabled={!rescheduleFormData.meetingEndTime}
              >
                Confirm Reschedule
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <AlertDialog open={isDeleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
          <AlertDialogContent className="rounded-lg max-w-sm">
            <AlertDialogHeader>
              <AlertDialogTitle className="text-slate-900 font-bold">Delete Meeting Permanently?</AlertDialogTitle>
              <AlertDialogDescription className="text-slate-500 text-sm">
                {selectedAppointment
                  ? `This will permanently delete meeting ID ${selectedAppointment.id_main} for ${selectedAppointment.client_name}. If a Google Calendar event exists, it must be removed first.`
                  : 'This action cannot be undone.'}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter className="gap-2">
              <AlertDialogCancel className="rounded-lg border-slate-200 text-sm">Keep Meeting</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleDelete}
                className="rounded-lg bg-red-600 hover:bg-red-700 text-sm"
              >
                Delete Permanently
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div> {/* End Container */}
    </div> // End Main Div
  );
};

const Dashboard = () => {
  return (
    <React.Suspense fallback={
      <div className="flex min-h-[60vh] items-center justify-center bg-slate-50">
        <div className="rounded-lg border border-slate-200 bg-white px-6 py-5 text-center shadow-sm">
          <div className="flex items-center justify-center gap-2">
            <span className="h-4 w-4 animate-spin rounded-full border-2 border-slate-300 border-t-slate-800" />
            <span className="text-sm text-slate-600">Loading Dashboard...</span>
          </div>
        </div>
      </div>
    }>
      <DashboardContent />
    </React.Suspense>
  );
};

export default Dashboard;
