// @ts-nocheck
"use client"

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useSearchParams } from 'next/navigation';
import SpeechRecognition, { useSpeechRecognition } from 'react-speech-recognition';
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Toaster } from "@/components/ui/toaster";
import { useToast } from "@/hooks/use-toast";
import {
  Calendar, Clock, Mic, MicOff, UserPlus, Building, MapPin,
  CheckCircle, XCircle, RefreshCw, MessageSquare, Table2,
  LayoutGrid, Video, Trash2, Loader2, CloudOff, Cloud,
  ShieldCheck, ChevronsLeft, ChevronLeft, ChevronRight,
  ChevronsRight, Users, CalendarDays, AlertTriangle,
  User, BookOpen, Search, Send, History, SlidersHorizontal,
  MoreHorizontal, ArrowUpDown, Filter, Plus, Download,
  Bell,
  Phone
} from 'lucide-react';
import supabase from '@/utils/supabaseClient';
import type { Appointment, AuthUser, CalendarConnectionStatus } from '@/components/dashboard/types';
import AppointmentCard from './components/appointment-card';
import { formatTime } from './format';

const ADMIN_ROLES = new Set(['admin', 'super_admin', 'administrator']);

function parseBclAttendees(value: any): string[] {
  if (Array.isArray(value)) return value.map(String);
  if (typeof value === 'string' && value.trim()) {
    try { const p = JSON.parse(value); if (Array.isArray(p)) return p.map(String); } catch { }
    return [value.trim()];
  }
  return [];
}

const DashboardContent = () => {
  const searchParams = useSearchParams();
  const scope = searchParams.get('scope') ?? 'all';

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
  const getInitials = (name: any) => {
    if (!name || typeof name !== 'string') return "??";
    return name.slice(0, 2).toUpperCase();
  };
  
  const notify = {
    success: (title: string, desc?: string) => toast({
      title: <span className="flex items-center gap-2 font-semibold text-slate-900"><CheckCircle className="h-4 w-4 text-[#0DAA8A]" />{title}</span>,
      description: desc,
      className: 'bg-white border-slate-200 shadow-lg',
    }),
    error: (title: string, desc?: string) => toast({
      variant: 'destructive',
      title: <span className="flex items-center gap-2 font-semibold"><XCircle className="h-4 w-4" />{title}</span>,
      description: desc,
    }),
  };

  const [viewMode, setViewMode] = useState("table");
  const [rescheduleFormData, setRescheduleFormData] = useState({
    meetingStartTime: '', meetingDuration: '', meetingEndTime: '', meetingDate: '', dateTimeLocal: '',
  });
  const [editFormData, setEditFormData] = useState({
    client_name: '', client_company: '', client_mobile: '', meeting_date: '',
    meeting_start_time: '', meeting_duration: '60', meeting_end_time: '',
    meeting_type: 'inPerson', meeting_venue_area: '', meeting_agenda: '', bcl_attendee_mobile: '',
  });

  // --- Data Fetching ---
  useEffect(() => {
    const init = async () => {
      setLoading(true);
      try {
        const [sessionRes, userRes, meetingsRes, calRes] = await Promise.all([
          fetch('/api/auth/session'),
          fetch('/api/users/me'),
          supabase.from('bcl_meetings_meetings').select('*').order('meeting_date', { ascending: false }),
          fetch('/api/auth/google/status')
        ]);

        const session = await sessionRes.json();
        setCurrentUser(session.authenticated ? session.user : null);

        if (userRes.ok) {
          const me = await userRes.json();
          setCurrentUserId(me.id);
          setIsAdmin(ADMIN_ROLES.has((me.role ?? '').toLowerCase()));
        }

        if (meetingsRes.data) setAppointments(meetingsRes.data);

        const calStatus = await calRes.json();
        setCalendarConnectionStatus(calStatus.connected ? 'connected' : 'disconnected');
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    init();

    const handleResize = () => setViewMode(window.innerWidth < 1024 ? "cards" : "table");
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const canManageAppointment = useCallback((appointment: Appointment | null | undefined) => {
    if (!appointment) return false;
    if (isAdmin) return true;
    if (!currentUserId) return false;
    return appointment.created_by === currentUserId || parseBclAttendees(appointment.bcl_attendee).includes(currentUserId);
  }, [currentUserId, isAdmin]);

  // --- Logic Helpers ---
  const checkAppointmentStatus = (app: Appointment) => {
    const now = new Date();
    const mtgDate = new Date(`${app.meeting_date}T${app.meeting_start_time || '00:00'}`);
    if ((app.status === 'upcoming' || app.status === 'rescheduled') && now > mtgDate) {
      return { ...app, status: 'pending' };
    }
    return app;
  };

  const getStatusStyles = (status: string) => {
    switch (status) {
      case 'upcoming': return 'bg-blue-50 text-blue-700 border-blue-100';
      case 'rescheduled': return 'bg-purple-50 text-purple-700 border-purple-100';
      case 'pending': return 'bg-amber-50 text-amber-700 border-amber-100';
      case 'canceled': return 'bg-rose-50 text-rose-700 border-rose-100';
      case 'completed': return 'bg-emerald-50 text-emerald-700 border-emerald-100';
      default: return 'bg-slate-50 text-slate-700 border-slate-100';
    }
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

  const syncMeetingWithCalendar = async (appointment: Appointment, method: 'POST' | 'PUT' | 'DELETE') => {
    const url = method === 'DELETE' ? `/api/auto-sync-calendar?id=${appointment.id_main}` : '/api/auto-sync-calendar';
    const body = method !== 'DELETE' ? { ...appointment } : undefined;
    const res = await fetch(url, {
      method, headers: { 'Content-Type': 'application/json' },
      ...(body ? { body: JSON.stringify(body) } : {}),
    });
    if (!res.ok) throw new Error('Sync failed');
    return res.json();
  };

  const handleSyncMeeting = async (appointment: Appointment) => {
    setSyncingMeetingId(appointment.id_main);
    try {
      const result = await syncMeetingWithCalendar(appointment, 'POST');
      setAppointments(prev => prev.map(a => a.id_main === appointment.id_main ? { ...a, google_event_id: result.eventId, google_meet_link: result.hangoutLink } : a));
      notify.success('Synced with Google Calendar');
    } catch (e) {
      notify.error('Sync error', e.message);
    } finally {
      setSyncingMeetingId(null);
    }
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

  const scopedAppointments = useMemo(() => {
    let filtered = isAdmin || scope === 'all' ? appointments :
      scope === 'created' ? appointments.filter(a => a.created_by === currentUserId) :
        appointments.filter(a => parseBclAttendees(a.bcl_attendee).includes(currentUserId));

    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      filtered = filtered.filter(a =>
        a.client_name?.toLowerCase().includes(q) ||
        a.client_company?.toLowerCase().includes(q) ||
        a.id_main.toString().includes(q)
      );
    }
    return filtered;
  }, [appointments, scope, currentUserId, isAdmin, searchQuery]);

  const activeAppointments = useMemo(() => {
    const todayStr = new Date().toISOString().split('T')[0];
    const filtered = scopedAppointments.map(checkAppointmentStatus);

    switch (activeTab) {
      case 'today': return filtered.filter(a => a.meeting_date === todayStr);
      case 'pending': return filtered.filter(a => a.status === 'pending');
      case 'canceled': return filtered.filter(a => a.status === 'canceled');
      case 'completed': return filtered.filter(a => a.status === 'completed');
      default: return filtered.filter(a => ['upcoming', 'rescheduled'].includes(a.status));
    }
  }, [scopedAppointments, activeTab]);

  const paginated = activeAppointments.slice(currentPage * itemsPerPage, (currentPage + 1) * itemsPerPage);
  const totalPages = Math.ceil(activeAppointments.length / itemsPerPage);

  if (loading) return (
    <div className="flex h-[80vh] items-center justify-center">
      <Loader2 className="h-8 w-8 animate-spin text-[#0DAA8A]" />
    </div>
  );

  return (
    <div className="min-h-screen bg-[#F8FAFC] p-4 lg:p-8 font-sans antialiased text-slate-900">
      <Toaster />

      {/* --- Top Navbar Styled Header --- */}
      <div className="mb-8 flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#0DAA8A] text-white">
              <Calendar className="h-5 w-5" />
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">Meetings</h1>
          </div>
          <p className="text-sm text-slate-500">Manage your client engagements and team schedule.</p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <Button variant="outline" className="h-10 rounded-lg border-slate-200 bg-white px-4 text-sm font-medium shadow-sm hover:bg-slate-50">
            <Download className="mr-2 h-4 w-4 text-slate-400" />
            Export
          </Button>
          <Button className="h-10 rounded-lg bg-slate-900 px-4 text-sm font-medium text-white shadow-sm hover:bg-slate-800">
            <Plus className="mr-2 h-4 w-4" />
            New Meeting
          </Button>
          <div className="h-8 w-[1px] bg-slate-200 mx-2 hidden lg:block" />
          <div className="flex items-center gap-2 rounded-full border border-slate-200 bg-white pl-3 pr-1 py-1 shadow-sm">
            <span className={`h-2 w-2 rounded-full ${calendarConnectionStatus === 'connected' ? 'bg-[#0DAA8A]' : 'bg-rose-500'}`} />
            <span className="text-xs font-medium text-slate-600">Calendar {calendarConnectionStatus}</span>
            <Button variant="ghost" size="sm" className="h-7 w-7 rounded-full p-0">
              <RefreshCw className="h-3 w-3" />
            </Button>
          </div>
        </div>
      </div>

      {/* --- Stats Summary --- */}
      <div className="mb-8 grid grid-cols-2 gap-4 lg:grid-cols-4">
        {[
          { label: 'Total Scheduled', value: scopedAppointments.length, color: 'text-blue-600' },
          { label: 'Happening Today', value: activeAppointments.filter(a => a.status !== 'completed').length, color: 'text-[#0DAA8A]' },
          { label: 'Pending Action', value: appointments.filter(a => a.status === 'pending').length, color: 'text-amber-500' },
          { label: 'Synced', value: appointments.filter(a => a.google_event_id).length, color: 'text-indigo-600' },
        ].map((stat, i) => (
          <Card key={i} className="border-none bg-white shadow-sm ring-1 ring-slate-200/60">
            <CardContent className="p-4">
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">{stat.label}</p>
              <p className={`mt-2 text-3xl font-bold ${stat.color}`}>{stat.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* --- Main Content Area --- */}
      <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">

        {/* Toolbar */}
        <div className="flex flex-col border-b border-slate-100 bg-white lg:flex-row lg:items-center">
          <div className="flex items-center gap-1 border-b border-slate-100 p-2 lg:border-b-0 lg:border-r lg:p-3">
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              <TabsList className="bg-transparent h-9 gap-1">
                {['upcoming', 'today', 'pending', 'completed', 'canceled'].map(tab => (
                  <TabsTrigger
                    key={tab}
                    value={tab}
                    className="rounded-md px-3 text-xs font-semibold capitalize data-[state=active]:bg-slate-100 data-[state=active]:text-slate-900"
                  >
                    {tab}
                  </TabsTrigger>
                ))}
              </TabsList>
            </Tabs>
          </div>

          <div className="flex flex-1 items-center gap-3 p-3">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <Input
                placeholder="Search by client, company or ID..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="h-9 border-slate-200 bg-slate-50/50 pl-10 text-sm focus-visible:ring-[#0DAA8A]/20"
              />
              <div className="absolute right-2 top-1/2 -translate-y-1/2 rounded border border-slate-200 bg-white px-1.5 py-0.5 text-[10px] font-medium text-slate-400 shadow-sm">
                ⌘K
              </div>
            </div>

            <Button variant="outline" size="sm" className="h-9 border-slate-200 text-slate-600 lg:flex hidden">
              <Filter className="mr-2 h-4 w-4" />
              Filters
            </Button>

            <div className="ml-auto flex items-center rounded-lg bg-slate-100 p-1">
              <Button
                variant={viewMode === 'table' ? 'white' : 'ghost'}
                size="sm"
                onClick={() => setViewMode('table')}
                className={`h-7 px-3 text-xs ${viewMode === 'table' ? 'bg-white shadow-sm' : 'text-slate-500'}`}
              >
                <Table2 className="mr-1.5 h-3.5 w-3.5" />
                Table
              </Button>
              <Button
                variant={viewMode === 'cards' ? 'white' : 'ghost'}
                size="sm"
                onClick={() => setViewMode('cards')}
                className={`h-7 px-3 text-xs ${viewMode === 'cards' ? 'bg-white shadow-sm' : 'text-slate-500'}`}
              >
                <LayoutGrid className="mr-1.5 h-3.5 w-3.5" />
                Cards
              </Button>
            </div>
          </div>
        </div>

        {/* List View */}
        <div className="min-h-[400px]">
          {viewMode === 'table' ? (
            <div className="relative overflow-x-auto">
              <Table>
                <TableHeader className="bg-slate-50/50">
                  <TableRow className="hover:bg-transparent">
                    <TableHead className="w-12 pl-6"><input type="checkbox" className="rounded border-slate-300" /></TableHead>
                    <TableHead className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Meeting Title / Client</TableHead>
                    <TableHead className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Date</TableHead>
                    <TableHead className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Time</TableHead>
                    <TableHead className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Related To</TableHead>
                    <TableHead className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Status</TableHead>
                    <TableHead className="w-20 pr-6 text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginated.length > 0 ? paginated.map((app) => (
                    <TableRow
                      key={app.id_main}
                      className="group cursor-pointer border-slate-100 hover:bg-slate-50/80 transition-colors"
                      onClick={() => setSelectedAppointment(app)}
                    >
                      <TableCell className="pl-6" onClick={(e) => e.stopPropagation()}>
                        <input type="checkbox" className="rounded border-slate-300 text-[#0DAA8A]" />
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${app.meeting_type === 'virtual' ? 'bg-indigo-50 text-indigo-600' : 'bg-[#0DAA8A]/10 text-[#0DAA8A]'}`}>
                            {app.meeting_type === 'virtual' ? <Video className="h-4 w-4" /> : <MapPin className="h-4 w-4" />}
                          </div>
                          <div className="min-w-0">
                            <p className="truncate text-sm font-semibold text-slate-900">{app.meeting_agenda || `${app.client_name} Meeting`}</p>
                            <p className="text-[11px] text-slate-400">ID #{app.id_main} • {app.client_name}</p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="text-sm text-slate-600">
                        {new Date(app.meeting_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                      </TableCell>
                      <TableCell className="text-sm text-slate-600">
                        <div className="flex items-center gap-1.5 font-medium">
                          <Clock className="h-3.5 w-3.5 text-slate-400" />
                          {formatTime(app.meeting_start_time)}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2 text-sm text-slate-600">
                          <Building className="h-3.5 w-3.5 text-slate-400" />
                          <span className="truncate max-w-[120px]">{app.client_company || 'Independent'}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className={`rounded-md border font-semibold px-2 py-0.5 text-[10px] uppercase tracking-wide ${getStatusStyles(app.status)}`}>
                          {app.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="pr-6 text-right" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          {app.google_meet_link && (
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-indigo-600" onClick={() => window.open(app.google_meet_link, '_blank')}>
                              <Video className="h-4 w-4" />
                            </Button>
                          )}
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  )) : (
                    <TableRow>
                      <TableCell colSpan={7} className="h-40 text-center text-slate-400">
                        No meetings found in this view.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="p-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-4">
                {paginated.map(app => (
                  <AppointmentCard
                    key={app.id_main}
                    appointment={app}
                    onClick={() => setSelectedAppointment(app)}
                    getStatusColor={getStatusStyles}
                    getStatusIcon={() => null}
                    getBadgeStatusColor={() => 'bg-slate-50'}
                    checkAppointmentStatus={checkAppointmentStatus}
                    calendarConnectionStatus={calendarConnectionStatus}
                  />
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer / Pagination */}
        <div className="flex items-center justify-between border-t border-slate-100 bg-slate-50/50 px-6 py-4">
          <p className="text-xs font-medium text-slate-500">
            Showing <span className="text-slate-900">{activeAppointments.length > 0 ? currentPage * itemsPerPage + 1 : 0}</span> to <span className="text-slate-900">{Math.min((currentPage + 1) * itemsPerPage, activeAppointments.length)}</span> of {activeAppointments.length} meetings
          </p>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => setCurrentPage(p => p - 1)} disabled={currentPage === 0}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <div className="flex items-center gap-1">
              {Array.from({ length: totalPages }, (_, i) => (
                <Button
                  key={i}
                  variant={currentPage === i ? 'default' : 'outline'}
                  className={`h-8 w-8 p-0 text-xs ${currentPage === i ? 'bg-slate-900' : ''}`}
                  onClick={() => setCurrentPage(i)}
                >
                  {i + 1}
                </Button>
              ))}
            </div>
            <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => setCurrentPage(p => p + 1)} disabled={currentPage >= totalPages - 1}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* --- SELECTED APPOINTMENT DETAILS DIALOG --- */}
      <Dialog open={!!selectedAppointment} onOpenChange={(open) => !open && setSelectedAppointment(null)}>
        <DialogContent className="max-w-4xl p-0 overflow-hidden bg-white border-none shadow-2xl rounded-2xl">

          {/* --- HEADER: Unified & Refined --- */}
          <DialogHeader className="px-8 pt-8 pb-6 bg-white">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <div className="flex h-6 w-6 items-center justify-center rounded bg-slate-100 text-slate-500 text-[10px] font-bold">
                    MTG
                  </div>
                  <span className="text-xs font-medium text-slate-400 uppercase tracking-widest">Meeting Details • #{selectedAppointment?.id_main}</span>
                </div>
                <DialogTitle className="text-2xl font-bold text-slate-900 tracking-tight">
                  {selectedAppointment?.client_name}
                </DialogTitle>
                <div className="flex items-center gap-2 text-sm text-slate-500">
                  <Building className="h-3.5 w-3.5" />
                  <span className="font-medium">{selectedAppointment?.client_company || 'Independent Client'}</span>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Badge className={`px-3 py-1 rounded-full border-none font-semibold text-[11px] uppercase tracking-wider ${getBadgeStatusColor(selectedAppointment?.badge_status)}`}>
                  {selectedAppointment?.badge_status}
                </Badge>
                <Badge className={`px-3 py-1 rounded-full border-none font-semibold text-[11px] uppercase tracking-wider ${getStatusColor(checkAppointmentStatus(selectedAppointment || {}).status)}`}>
                  {checkAppointmentStatus(selectedAppointment || {}).status}
                </Badge>
              </div>
            </div>
          </DialogHeader>

          {selectedAppointment && (
            <div className="grid grid-cols-1 lg:grid-cols-12 border-t border-slate-100">

              {/* --- LEFT: PRIMARY CONTENT (7/12) --- */}
              <div className="lg:col-span-7 p-8 space-y-10 overflow-y-auto max-h-[65vh] scrollbar-hide">

                {/* Agenda - Focus on Typography */}
                <section>
                  <h3 className="text-[11px] font-bold text-slate-400 uppercase tracking-[0.2em] mb-4">Agenda & Notes</h3>
                  <div className="text-slate-700 leading-relaxed text-sm bg-slate-50/50 p-4 rounded-xl border border-slate-100/50 italic">
                    "{selectedAppointment.meeting_agenda || 'No specific agenda has been outlined for this discussion.'}"
                  </div>
                </section>

                {/* Logistics - Clean Property Grid */}
                <section>
                  <h3 className="text-[11px] font-bold text-slate-400 uppercase tracking-[0.2em] mb-6">Logistics</h3>
                  <div className="grid grid-cols-2 gap-y-8 gap-x-12">
                    <div className="space-y-1">
                      <p className="text-[10px] font-bold text-slate-400 uppercase">Schedule Date</p>
                      <p className="text-sm font-semibold text-slate-800">
                        {new Date(selectedAppointment.meeting_date).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
                      </p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-[10px] font-bold text-slate-400 uppercase">Time & Duration</p>
                      <p className="text-sm font-semibold text-slate-800">
                        {formatTime(selectedAppointment.meeting_start_time)} — {formatTime(selectedAppointment.meeting_end_time)}
                        <span className="ml-2 text-slate-400 font-normal">({selectedAppointment.meeting_duration}m)</span>
                      </p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-[10px] font-bold text-slate-400 uppercase">Meeting Format</p>
                      <div className="flex items-center gap-2 mt-1">
                        {selectedAppointment.meeting_type === 'virtual' ? <Video className="h-4 w-4 text-indigo-500" /> : <MapPin className="h-4 w-4 text-teal-500" />}
                        <span className="text-sm font-semibold text-slate-800 capitalize">{selectedAppointment.meeting_type} Engagement</span>
                      </div>
                    </div>
                    <div className="space-y-1">
                      <p className="text-[10px] font-bold text-slate-400 uppercase">Venue / Access</p>
                      {selectedAppointment.google_meet_link ? (
                        <a href={selectedAppointment.google_meet_link} target="_blank" className="text-sm font-bold text-blue-600 hover:underline flex items-center gap-1 mt-1">
                          Join Google Meet <LinkIcon className="h-3 w-3" />
                        </a>
                      ) : (
                        <p className="text-sm font-semibold text-slate-800 mt-1">{selectedAppointment.meeting_venue_area || 'Not provided'}</p>
                      )}
                    </div>
                  </div>
                </section>

                {/* Participants - Avatar Grouping */}
                <section>
                  <h3 className="text-[11px] font-bold text-slate-400 uppercase tracking-[0.2em] mb-6">Participants</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {/* Internal */}
                    <div className="flex items-center justify-between p-3 rounded-xl bg-white border border-slate-100 shadow-sm">
                      <div className="flex items-center gap-3">
                        <div className="h-8 w-8 rounded-full bg-slate-900 flex items-center justify-center text-[10px] font-bold text-white uppercase">
                          {selectedAppointment.bcl_attendee?.slice(0, 2)}
                        </div>
                        <div>
                          <p className="text-xs font-bold text-slate-900">{selectedAppointment.bcl_attendee}</p>
                          <p className="text-[10px] text-slate-400 font-medium">BCL Internal Team</p>
                        </div>
                      </div>
                    </div>
                    {/* External */}
                    <div className="flex items-center justify-between p-3 rounded-xl bg-white border border-slate-100 shadow-sm">
                      <div className="flex items-center gap-3">
                        <div className="h-8 w-8 rounded-full bg-blue-100 flex items-center justify-center text-[10px] font-bold text-blue-600 uppercase">
                          {selectedAppointment.client_name?.slice(0, 2)}
                        </div>
                        <div>
                          <p className="text-xs font-bold text-slate-900">{selectedAppointment.client_name}</p>
                          <p className="text-[10px] text-slate-400 font-medium">External Partner</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </section>
              </div>

              {/* --- RIGHT: SIDEBAR (5/12) --- */}
              <div className="lg:col-span-5 bg-slate-50/50 p-8 border-l border-slate-100 space-y-10 max-h-[65vh] overflow-y-auto">

                {/* Quick Contact Information */}
                <section>
                  <h3 className="text-[11px] font-bold text-slate-400 uppercase tracking-[0.2em] mb-6">Quick Contact</h3>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between group">
                      <span className="text-xs font-medium text-slate-500">Client Mobile</span>
                      <span className="text-xs font-bold text-slate-900 group-hover:text-blue-600 cursor-pointer">{selectedAppointment.client_mobile || '—'}</span>
                    </div>
                    <div className="flex items-center justify-between group">
                      <span className="text-xs font-medium text-slate-500">Staff Mobile</span>
                      <span className="text-xs font-bold text-slate-900 group-hover:text-blue-600 cursor-pointer">{selectedAppointment.bcl_attendee_mobile || '—'}</span>
                    </div>
                  </div>
                </section>

                {/* Activity Timeline - Modern Feed Style */}
                <section>
                  <h3 className="text-[11px] font-bold text-slate-400 uppercase tracking-[0.2em] mb-6">Activity Feed</h3>
                  <div className="space-y-6 relative before:absolute before:left-2 before:top-2 before:bottom-2 before:w-[1px] before:bg-slate-200">
                    <div className="relative pl-7">
                      <div className="absolute left-0 top-1 h-4 w-4 rounded-full bg-white border-2 border-[#0DAA8A] flex items-center justify-center">
                        <div className="h-1.5 w-1.5 rounded-full bg-[#0DAA8A]" />
                      </div>
                      <p className="text-xs font-bold text-slate-900">Meeting Created</p>
                      <p className="text-[10px] text-slate-400 mt-0.5">{selectedAppointment.booking_date} by System</p>
                    </div>
                    {selectedAppointment.updated_by && (
                      <div className="relative pl-7">
                        <div className="absolute left-0 top-1 h-4 w-4 rounded-full bg-white border-2 border-slate-300 flex items-center justify-center" />
                        <p className="text-xs font-bold text-slate-900">Meeting Updated</p>
                        <p className="text-[10px] text-slate-400 mt-0.5">By {selectedAppointment.updated_by}</p>
                      </div>
                    )}
                    <div className="relative pl-7">
                      <div className={`absolute left-0 top-1 h-4 w-4 rounded-full bg-white border-2 flex items-center justify-center ${selectedAppointment.status === 'canceled' ? 'border-rose-500' : 'border-blue-500'}`} />
                      <p className="text-xs font-bold text-slate-900 capitalize">{selectedAppointment.status}</p>
                      <p className="text-[10px] text-slate-400 mt-0.5">Current Status</p>
                    </div>
                  </div>
                </section>

                {/* Sync Status Card */}
                <section className="pt-4">
                  <div className={`p-4 rounded-2xl border transition-all ${selectedAppointment.google_event_id ? 'bg-[#0DAA8A]/5 border-[#0DAA8A]/20' : 'bg-slate-100/50 border-slate-200'}`}>
                    <div className="flex items-center gap-3">
                      <div className={`h-10 w-10 rounded-xl flex items-center justify-center shadow-sm ${selectedAppointment.google_event_id ? 'bg-white text-[#0DAA8A]' : 'bg-white text-slate-400'}`}>
                        {selectedAppointment.google_event_id ? <Cloud className="h-5 w-5" /> : <CloudOff className="h-5 w-5" />}
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-bold text-slate-900">{selectedAppointment.google_event_id ? 'Google Sync Active' : 'Calendar Offline'}</p>
                        <p className="text-[10px] text-slate-500 truncate">{selectedAppointment.google_event_id ? 'Event ID: ' + selectedAppointment.google_event_id.slice(0, 8) : 'Not synced to Google Calendar'}</p>
                      </div>
                    </div>
                  </div>
                </section>
              </div>
            </div>
          )}

          {/* --- FOOTER: Action Bar --- */}
          <DialogFooter className="px-8 py-5 bg-white border-t border-slate-100 flex items-center justify-between">
            <div className="flex flex-wrap gap-2">
              {/* Only Primary Action buttons visible, rest in a menu if needed */}
              {selectedAppointment?.status === 'upcoming' && (
                <>
                  <Button size="sm" onClick={handleComplete} className="bg-slate-900 hover:bg-slate-800 text-white rounded-lg px-4 h-9 font-semibold text-xs transition-all">
                    <CheckCircle className="mr-2 h-3.5 w-3.5" /> Complete
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => setRescheduleDialogOpen(true)} className="border-slate-200 text-slate-700 rounded-lg h-9 font-semibold text-xs shadow-sm">
                    <RefreshCw className="mr-2 h-3.5 w-3.5" /> Reschedule
                  </Button>
                </>
              )}

              {/* Overflow Menu for secondary actions to keep UI clean */}
              <Button variant="ghost" size="sm" className="h-9 w-9 p-0 text-slate-400 hover:text-slate-900 rounded-lg border border-transparent hover:border-slate-200">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </div>

            <Button variant="ghost" onClick={() => setSelectedAppointment(null)} className="text-xs font-bold text-slate-400 hover:text-slate-900 uppercase tracking-widest">
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
                      className={`rounded-lg px-2 py-2 text-xs font-medium ring-1 transition ${conflict
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
    </div>
  );
};

const Dashboard = () => (
  <React.Suspense fallback={<div className="flex h-screen items-center justify-center bg-slate-50"><Loader2 className="h-10 w-10 animate-spin text-[#0DAA8A]" /></div>}>
    <DashboardContent />
  </React.Suspense>
);

export default Dashboard;