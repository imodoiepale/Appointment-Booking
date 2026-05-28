// @ts-nocheck
"use client"

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useSearchParams } from 'next/navigation';
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Toaster } from "@/components/ui/toaster";
import { useToast } from "@/hooks/use-toast";
import {
  Calendar, Clock, Building, MapPin, CheckCircle, XCircle, RefreshCw, MessageSquare, Table2,
  LayoutGrid, Video, Trash2, Loader2, CloudOff, Cloud, ChevronLeft, ChevronRight, Search,
  MoreHorizontal, Filter, Plus, Download, Bell, Phone, Hash, Globe, CheckCircle2
} from 'lucide-react';
import supabase from '@/utils/supabaseClient';
import type { Appointment, AuthUser, CalendarConnectionStatus } from '@/components/dashboard/types';
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

// --- APPOINTMENT CARD COMPONENT ---
interface AppointmentCardProps {
  appointment: Appointment;
  onClick: () => void;
  getStatusColor: (status: string) => string;
  getBadgeStatusColor: (badgeStatus: string) => string;
  checkAppointmentStatus: (appointment: Appointment) => Appointment;
  calendarConnectionStatus: CalendarConnectionStatus;
  onSync?: (appointment: Appointment) => void;
  onUnsync?: (appointment: Appointment) => void;
  isSyncing?: boolean;
}

const AppointmentCard = ({ appointment, onClick, getStatusColor, getBadgeStatusColor, checkAppointmentStatus, calendarConnectionStatus, onSync, onUnsync, isSyncing }: AppointmentCardProps) => {
  const displayAppointment = checkAppointmentStatus(appointment);

  const accentColors = {
    upcoming: 'border-l-zinc-900 dark:border-l-white',
    rescheduled: 'border-l-indigo-500',
    pending: 'border-l-amber-500',
    canceled: 'border-l-red-500',
    completed: 'border-l-emerald-500',
  }[displayAppointment.status] || 'border-l-zinc-300 dark:border-l-zinc-700';

  return (
    <Card
      className={`group relative flex cursor-pointer flex-col overflow-hidden rounded-xl border border-zinc-200 dark:border-white/10 bg-white dark:bg-zinc-950 transition-all duration-200 hover:shadow-md hover:border-zinc-300 dark:hover:border-white/20 border-l-[3px] ${accentColors}`}
      onClick={onClick}
    >
      <div className="p-4 space-y-4">
        {/* --- HEADER: Badges --- */}
        <div className="flex items-start justify-between gap-2">
          <div className="flex flex-wrap gap-1.5">
            <Badge className={`px-2 py-0.5 rounded-md border font-medium text-[9px] uppercase tracking-wider ${getStatusColor(displayAppointment.status)}`}>
              {displayAppointment.status}
            </Badge>
            {appointment.badge_status && (
              <Badge variant="outline" className={`px-2 py-0.5 rounded-md border font-medium text-[9px] uppercase tracking-wider ${getBadgeStatusColor(appointment.badge_status)}`}>
                {appointment.badge_status}
              </Badge>
            )}
          </div>
        </div>

        {/* --- CLIENT IDENTITY --- */}
        <div className="space-y-1">
          <h4 className="font-semibold text-zinc-900 dark:text-zinc-100 leading-tight truncate text-sm">
            {appointment.client_name}
          </h4>
          <div className="flex items-center gap-1.5 text-[11px] font-medium text-zinc-500 dark:text-zinc-400">
            <Globe className="h-3 w-3 shrink-0" />
            <span className="truncate">{appointment.client_company || 'Independent Client'}</span>
          </div>
        </div>

        {/* --- LOGISTICS GRID --- */}
        <div className="grid grid-cols-1 gap-2">
          <div className="flex items-center justify-between bg-zinc-50 dark:bg-white/[0.02] rounded-lg p-2.5 border border-zinc-100 dark:border-white/5">
            <div className="flex items-center gap-2.5">
              <div className="h-7 w-7 rounded-md bg-zinc-200/50 dark:bg-white/10 flex items-center justify-center">
                <Calendar className="h-3.5 w-3.5 text-zinc-700 dark:text-zinc-300" />
              </div>
              <div>
                <p className="text-[10px] font-semibold text-zinc-900 dark:text-zinc-100 leading-none">
                  {new Date(appointment.meeting_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                </p>
                <p className="text-[9px] font-medium text-zinc-500 dark:text-zinc-400 uppercase mt-0.5">
                  {new Date(appointment.meeting_date).toLocaleDateString('en-GB', { weekday: 'short' })}
                </p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-[10px] font-semibold text-zinc-900 dark:text-zinc-100 leading-none">
                {formatTime(appointment.meeting_start_time)}
              </p>
              <p className="text-[9px] font-medium text-zinc-500 dark:text-zinc-400 uppercase mt-0.5">{appointment.meeting_duration}m</p>
            </div>
          </div>

          <div className="flex items-center gap-2 px-1">
            {appointment.meeting_type === 'virtual' ? (
              <Video className="h-3.5 w-3.5 text-zinc-400 dark:text-zinc-500 shrink-0" />
            ) : (
              <MapPin className="h-3.5 w-3.5 text-zinc-400 dark:text-zinc-500 shrink-0" />
            )}
            <p className="text-[11px] font-medium text-zinc-600 dark:text-zinc-400 truncate">
              {appointment.meeting_venue_area || (appointment.meeting_type === 'virtual' ? 'Google Meet / Digital' : 'Venue not set')}
            </p>
          </div>
        </div>
      </div>

      {/* --- FOOTER --- */}
      <div className="mt-auto flex items-center justify-between px-4 py-2.5 bg-zinc-50/50 dark:bg-white/[0.02] border-t border-zinc-100 dark:border-white/5">
        <div className="flex items-center gap-1 text-[10px] font-medium text-zinc-400 dark:text-zinc-500 uppercase tracking-wider">
          <Hash className="h-3 w-3" />
          {appointment.id_main}
        </div>
        <div className="flex items-center gap-1 text-[9px] font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
          {appointment.meeting_type}
        </div>
      </div>
    </Card>
  );
};


// --- DASHBOARD CONTENT COMPONENT ---
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
      title: <span className="flex items-center gap-2 font-semibold text-zinc-900 dark:text-white"><CheckCircle className="h-4 w-4 text-emerald-500" />{title}</span>,
      description: desc,
      className: 'bg-white dark:bg-zinc-950 border-zinc-200 dark:border-zinc-800 shadow-lg',
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
      } catch (err) { console.error(err); } finally { setLoading(false); }
    };
    init();
    const handleResize = () => setViewMode(window.innerWidth < 1024 ? "cards" : "table");
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

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
      case 'upcoming': return 'bg-zinc-100 text-zinc-700 border-zinc-200 dark:bg-white/10 dark:text-zinc-300 dark:border-white/10';
      case 'rescheduled': return 'bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-500/10 dark:text-indigo-400 dark:border-indigo-500/20';
      case 'pending': return 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-500/10 dark:text-amber-400 dark:border-amber-500/20';
      case 'canceled': return 'bg-red-50 text-red-700 border-red-200 dark:bg-red-500/10 dark:text-red-400 dark:border-red-500/20';
      case 'completed': return 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-500/20';
      default: return 'bg-zinc-100 text-zinc-700 border-zinc-200 dark:bg-white/10 dark:text-zinc-300 dark:border-white/10';
    }
  };

  const getBadgeStatusColor = (badgeStatus: string) => {
    switch (badgeStatus) {
      case 'Open': return 'bg-zinc-100 text-zinc-700 border-zinc-200 dark:bg-white/10 dark:text-zinc-300 dark:border-white/10';
      case 'Confirmed': return 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-500/20';
      case 'Tentative': return 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-500/10 dark:text-amber-400 dark:border-amber-500/20';
      case 'Rejected': return 'bg-red-50 text-red-700 border-red-200 dark:bg-red-500/10 dark:text-red-400 dark:border-red-500/20';
      default: return 'bg-zinc-100 text-zinc-700 border-zinc-200 dark:bg-white/10 dark:text-zinc-300 dark:border-white/10';
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
    <div className="flex h-full min-h-[80vh] items-center justify-center bg-transparent">
      <Loader2 className="h-6 w-6 animate-spin text-zinc-400" />
    </div>
  );

  return (
    <div className="min-h-screen p-4 lg:p-8 font-sans antialiased bg-transparent">
      <Toaster />

      {/* --- Header --- */}
      <div className="mb-8 flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
        <div className="space-y-1">
          <h1 className="text-xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-100">Meetings & Schedule</h1>
          <p className="text-sm text-zinc-500 dark:text-zinc-400">Manage your client engagements and team schedule.</p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2 rounded-md border border-zinc-200 dark:border-white/10 bg-white dark:bg-zinc-900 px-3 py-1.5 shadow-sm">
            <span className={`h-2 w-2 rounded-full ${calendarConnectionStatus === 'connected' ? 'bg-emerald-500' : 'bg-red-500'}`} />
            <span className="text-[11px] font-medium text-zinc-600 dark:text-zinc-400">Calendar {calendarConnectionStatus}</span>
            <Button variant="ghost" size="sm" className="h-6 w-6 rounded-md p-0 ml-1 text-zinc-400 hover:text-zinc-900 dark:hover:text-white">
              <RefreshCw className="h-3 w-3" />
            </Button>
          </div>
          <div className="h-6 w-[1px] bg-zinc-200 dark:bg-white/10 mx-1 hidden lg:block" />
          <Button variant="outline" className="h-9 rounded-md border-zinc-200 dark:border-white/10 bg-white dark:bg-zinc-900 px-4 text-xs font-medium shadow-sm hover:bg-zinc-50 dark:hover:bg-white/5 dark:text-zinc-100">
            <Download className="mr-2 h-3.5 w-3.5 text-zinc-400" />
            Export
          </Button>
          <Button className="h-9 rounded-md bg-zinc-900 dark:bg-white px-4 text-xs font-medium text-white dark:text-zinc-900 shadow-sm hover:bg-zinc-800 dark:hover:bg-zinc-200">
            <Plus className="mr-2 h-3.5 w-3.5" />
            New Meeting
          </Button>
        </div>
      </div>

      {/* --- Stats Summary --- */}
      <div className="mb-8 grid grid-cols-2 gap-4 lg:grid-cols-4">
        {[
          { label: 'Total Scheduled', value: scopedAppointments.length },
          { label: 'Happening Today', value: activeAppointments.filter(a => a.status !== 'completed').length },
          { label: 'Pending Action', value: appointments.filter(a => a.status === 'pending').length },
          { label: 'Calendar Synced', value: appointments.filter(a => a.google_event_id).length },
        ].map((stat, i) => (
          <Card key={i} className="border border-zinc-200 dark:border-white/10 bg-white dark:bg-zinc-900/50 shadow-sm rounded-xl">
            <CardContent className="p-4">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">{stat.label}</p>
              <p className="mt-1.5 text-2xl font-semibold text-zinc-900 dark:text-zinc-100">{stat.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* --- Main Content Area --- */}
      <div className="rounded-xl border border-zinc-200 dark:border-white/10 bg-white dark:bg-zinc-950 shadow-sm overflow-hidden flex flex-col">

        {/* Toolbar */}
        <div className="flex flex-col border-b border-zinc-200 dark:border-white/10 bg-zinc-50/50 dark:bg-white/[0.02] lg:flex-row lg:items-center">
          <div className="flex items-center p-2 lg:p-3 overflow-x-auto scrollbar-hide">
            <div className="flex bg-zinc-100 dark:bg-zinc-900/80 p-1 rounded-lg border border-zinc-200 dark:border-white/10">
              {['upcoming', 'today', 'pending', 'completed', 'canceled'].map(tab => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`rounded-md px-3 py-1.5 text-xs font-medium capitalize transition-all ${activeTab === tab
                      ? 'bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white shadow-sm'
                      : 'text-zinc-500 dark:text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200'
                    }`}
                >
                  {tab}
                </button>
              ))}
            </div>
          </div>

          <div className="flex flex-1 items-center gap-3 p-3 pt-0 lg:pt-3">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-zinc-400" />
              <Input
                placeholder="Search clients or ID..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="h-8 border-zinc-200 dark:border-white/10 bg-white dark:bg-zinc-900 pl-9 text-xs focus-visible:ring-zinc-200 dark:focus-visible:ring-zinc-800 rounded-md"
              />
            </div>

            <Button variant="outline" size="sm" className="h-8 border-zinc-200 dark:border-white/10 text-zinc-600 dark:text-zinc-400 text-xs hidden lg:flex bg-white dark:bg-zinc-900 rounded-md">
              <Filter className="mr-2 h-3.5 w-3.5" /> Filters
            </Button>

            <div className="ml-auto flex items-center rounded-lg bg-zinc-100 dark:bg-zinc-900/80 p-1 border border-zinc-200 dark:border-white/10">
              <button
                onClick={() => setViewMode('table')}
                className={`flex items-center h-6 px-2.5 rounded text-[11px] font-medium transition-all ${viewMode === 'table' ? 'bg-white dark:bg-zinc-800 shadow-sm text-zinc-900 dark:text-white' : 'text-zinc-500 dark:text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-300'}`}
              >
                <Table2 className="mr-1.5 h-3 w-3" /> Table
              </button>
              <button
                onClick={() => setViewMode('cards')}
                className={`flex items-center h-6 px-2.5 rounded text-[11px] font-medium transition-all ${viewMode === 'cards' ? 'bg-white dark:bg-zinc-800 shadow-sm text-zinc-900 dark:text-white' : 'text-zinc-500 dark:text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-300'}`}
              >
                <LayoutGrid className="mr-1.5 h-3 w-3" /> Grid
              </button>
            </div>
          </div>
        </div>

        {/* List View */}
        <div className="flex-1 min-h-[400px] overflow-hidden flex flex-col">
          {viewMode === 'table' ? (
            <div className="relative overflow-x-auto flex-1">
              <Table>
                <TableHeader className="bg-zinc-50 dark:bg-white/[0.02] border-b border-zinc-200 dark:border-white/10">
                  <TableRow className="hover:bg-transparent border-none">
                    <TableHead className="w-12 pl-6"></TableHead>
                    <TableHead className="text-[10px] font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">Meeting & Client</TableHead>
                    <TableHead className="text-[10px] font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">Date</TableHead>
                    <TableHead className="text-[10px] font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">Time</TableHead>
                    <TableHead className="text-[10px] font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">Related To</TableHead>
                    <TableHead className="text-[10px] font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">Status</TableHead>
                    <TableHead className="w-20 pr-6 text-right"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginated.length > 0 ? paginated.map((app) => (
                    <TableRow
                      key={app.id_main}
                      className="group cursor-pointer border-b border-zinc-100 dark:border-white/5 hover:bg-zinc-50 dark:hover:bg-white/[0.02] transition-colors"
                      onClick={() => setSelectedAppointment(app)}
                    >
                      <TableCell className="pl-6">
                        <div className="h-4 w-4 rounded border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 group-hover:border-zinc-400 transition-colors" />
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-zinc-100 dark:bg-white/10 text-zinc-500 dark:text-zinc-400">
                            {app.meeting_type === 'virtual' ? <Video className="h-4 w-4" /> : <MapPin className="h-4 w-4" />}
                          </div>
                          <div className="min-w-0">
                            <p className="truncate text-sm font-medium text-zinc-900 dark:text-zinc-100">{app.meeting_agenda || `${app.client_name} Meeting`}</p>
                            <p className="text-[11px] text-zinc-500 dark:text-zinc-400">#{app.id_main} • {app.client_name}</p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="text-xs text-zinc-600 dark:text-zinc-400 font-medium">
                        {new Date(app.meeting_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                      </TableCell>
                      <TableCell className="text-xs text-zinc-600 dark:text-zinc-400">
                        <div className="flex items-center gap-1.5 font-medium">
                          <Clock className="h-3.5 w-3.5 text-zinc-400" />
                          {formatTime(app.meeting_start_time)}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2 text-xs text-zinc-600 dark:text-zinc-400">
                          <Building className="h-3.5 w-3.5 text-zinc-400" />
                          <span className="truncate max-w-[120px]">{app.client_company || 'Independent'}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className={`rounded-md border font-medium px-2 py-0.5 text-[10px] uppercase tracking-wider ${getStatusStyles(app.status)}`}>
                          {app.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="pr-6 text-right" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          {app.google_meet_link && (
                            <Button variant="ghost" size="icon" className="h-7 w-7 text-indigo-500 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-500/10" onClick={() => window.open(app.google_meet_link, '_blank')}>
                              <Video className="h-3.5 w-3.5" />
                            </Button>
                          )}
                          <Button variant="ghost" size="icon" className="h-7 w-7 text-zinc-400 hover:text-zinc-900 dark:hover:text-white">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  )) : (
                    <TableRow>
                      <TableCell colSpan={7} className="h-40 text-center text-zinc-400 dark:text-zinc-500 text-sm">
                        No meetings found.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="p-5 flex-1 overflow-y-auto bg-zinc-50/30 dark:bg-zinc-950/30">
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-4">
                {paginated.map(app => (
                  <AppointmentCard
                    key={app.id_main}
                    appointment={app}
                    onClick={() => setSelectedAppointment(app)}
                    getStatusColor={getStatusStyles}
                    getBadgeStatusColor={getBadgeStatusColor}
                    checkAppointmentStatus={checkAppointmentStatus}
                    calendarConnectionStatus={calendarConnectionStatus}
                  />
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer / Pagination */}
        <div className="flex items-center justify-between border-t border-zinc-200 dark:border-white/10 bg-white dark:bg-zinc-950 px-5 py-3 shrink-0">
          <p className="text-xs font-medium text-zinc-500 dark:text-zinc-400">
            Showing <span className="text-zinc-900 dark:text-zinc-100">{activeAppointments.length > 0 ? currentPage * itemsPerPage + 1 : 0}</span> to <span className="text-zinc-900 dark:text-zinc-100">{Math.min((currentPage + 1) * itemsPerPage, activeAppointments.length)}</span> of {activeAppointments.length}
          </p>
          <div className="flex items-center gap-1.5">
            <Button variant="outline" size="icon" className="h-7 w-7 border-zinc-200 dark:border-white/10 bg-white dark:bg-zinc-900 text-zinc-500" onClick={() => setCurrentPage(p => p - 1)} disabled={currentPage === 0}>
              <ChevronLeft className="h-3 w-3" />
            </Button>
            <div className="flex items-center gap-1">
              {Array.from({ length: totalPages }, (_, i) => (
                <Button
                  key={i}
                  variant={currentPage === i ? 'default' : 'outline'}
                  className={`h-7 w-7 p-0 text-xs font-medium border-zinc-200 dark:border-white/10 ${currentPage === i ? 'bg-zinc-900 dark:bg-white text-white dark:text-zinc-900' : 'bg-white dark:bg-zinc-900 text-zinc-500 dark:text-zinc-400'}`}
                  onClick={() => setCurrentPage(i)}
                >
                  {i + 1}
                </Button>
              ))}
            </div>
            <Button variant="outline" size="icon" className="h-7 w-7 border-zinc-200 dark:border-white/10 bg-white dark:bg-zinc-900 text-zinc-500" onClick={() => setCurrentPage(p => p + 1)} disabled={currentPage >= totalPages - 1}>
              <ChevronRight className="h-3 w-3" />
            </Button>
          </div>
        </div>
      </div>

      {/* --- SELECTED APPOINTMENT DETAILS DIALOG --- */}
      <Dialog open={!!selectedAppointment} onOpenChange={(open) => !open && setSelectedAppointment(null)}>
        <DialogContent className="max-w-4xl p-0 overflow-hidden bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-white/10 shadow-xl rounded-xl">
          <DialogHeader className="px-6 py-5 bg-zinc-50/50 dark:bg-white/[0.02] border-b border-zinc-200 dark:border-white/10">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <div className="flex h-5 w-5 items-center justify-center rounded bg-zinc-200/50 dark:bg-white/10 text-zinc-600 dark:text-zinc-400 text-[9px] font-bold">
                    MTG
                  </div>
                  <span className="text-[10px] font-semibold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider">#{selectedAppointment?.id_main} • Details</span>
                </div>
                <DialogTitle className="text-xl font-semibold text-zinc-900 dark:text-zinc-100 tracking-tight">
                  {selectedAppointment?.client_name}
                </DialogTitle>
                <div className="flex items-center gap-1.5 text-xs text-zinc-500 dark:text-zinc-400 font-medium">
                  <Building className="h-3.5 w-3.5" />
                  <span>{selectedAppointment?.client_company || 'Independent Client'}</span>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Badge className={`px-2.5 py-1 rounded-md border font-medium text-[10px] uppercase tracking-wider ${getBadgeStatusColor(selectedAppointment?.badge_status || '')}`}>
                  {selectedAppointment?.badge_status}
                </Badge>
                <Badge className={`px-2.5 py-1 rounded-md border font-medium text-[10px] uppercase tracking-wider ${getStatusStyles(checkAppointmentStatus(selectedAppointment || {} as Appointment).status || '')}`}>
                  {checkAppointmentStatus(selectedAppointment || {} as Appointment).status}
                </Badge>
              </div>
            </div>
          </DialogHeader>

          {selectedAppointment && (
            <div className="grid grid-cols-1 lg:grid-cols-12">
              {/* --- LEFT: CONTENT --- */}
              <div className="lg:col-span-7 p-6 space-y-8 overflow-y-auto max-h-[60vh] scrollbar-hide">
                <section>
                  <h3 className="text-[10px] font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider mb-3">Agenda & Notes</h3>
                  <div className="text-zinc-700 dark:text-zinc-300 text-sm bg-zinc-50 dark:bg-white/[0.02] p-4 rounded-lg border border-zinc-200 dark:border-white/10 whitespace-pre-wrap leading-relaxed">
                    {selectedAppointment.meeting_agenda || 'No specific agenda has been outlined for this discussion.'}
                  </div>
                </section>

                <section>
                  <h3 className="text-[10px] font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider mb-4">Logistics</h3>
                  <div className="grid grid-cols-2 gap-y-6 gap-x-8">
                    <div className="space-y-1">
                      <p className="text-[9px] font-semibold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider">Date</p>
                      <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
                        {new Date(selectedAppointment.meeting_date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}
                      </p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-[9px] font-semibold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider">Time</p>
                      <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
                        {formatTime(selectedAppointment.meeting_start_time)} — {formatTime(selectedAppointment.meeting_end_time)}
                      </p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-[9px] font-semibold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider">Format</p>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        {selectedAppointment.meeting_type === 'virtual' ? <Video className="h-3.5 w-3.5 text-zinc-400" /> : <MapPin className="h-3.5 w-3.5 text-zinc-400" />}
                        <span className="text-sm font-medium text-zinc-900 dark:text-zinc-100 capitalize">{selectedAppointment.meeting_type}</span>
                      </div>
                    </div>
                    <div className="space-y-1">
                      <p className="text-[9px] font-semibold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider">Venue / Link</p>
                      {selectedAppointment.google_meet_link ? (
                        <a href={selectedAppointment.google_meet_link} target="_blank" className="text-sm font-medium text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1 mt-0.5">
                          Join Meeting <Globe className="h-3 w-3" />
                        </a>
                      ) : (
                        <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100 mt-0.5 truncate">{selectedAppointment.meeting_venue_area || 'Not provided'}</p>
                      )}
                    </div>
                  </div>
                </section>

                <section>
                  <h3 className="text-[10px] font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider mb-4">Participants</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="flex items-center gap-3 p-3 rounded-lg bg-zinc-50 dark:bg-white/[0.02] border border-zinc-200 dark:border-white/10">
                      <div className="h-8 w-8 rounded-full bg-zinc-200 dark:bg-white/10 flex items-center justify-center text-[10px] font-bold text-zinc-700 dark:text-zinc-300 uppercase">
                        {selectedAppointment.bcl_attendee?.slice(0, 2)}
                      </div>
                      <div>
                        <p className="text-xs font-semibold text-zinc-900 dark:text-zinc-100">{selectedAppointment.bcl_attendee}</p>
                        <p className="text-[10px] text-zinc-500 dark:text-zinc-400 font-medium">Internal</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 p-3 rounded-lg bg-zinc-50 dark:bg-white/[0.02] border border-zinc-200 dark:border-white/10">
                      <div className="h-8 w-8 rounded-full bg-zinc-200 dark:bg-white/10 flex items-center justify-center text-[10px] font-bold text-zinc-700 dark:text-zinc-300 uppercase">
                        {selectedAppointment.client_name?.slice(0, 2)}
                      </div>
                      <div>
                        <p className="text-xs font-semibold text-zinc-900 dark:text-zinc-100">{selectedAppointment.client_name}</p>
                        <p className="text-[10px] text-zinc-500 dark:text-zinc-400 font-medium">External</p>
                      </div>
                    </div>
                  </div>
                </section>
              </div>

              {/* --- RIGHT: SIDEBAR --- */}
              <div className="lg:col-span-5 bg-zinc-50/50 dark:bg-white/[0.02] p-6 border-t lg:border-t-0 lg:border-l border-zinc-200 dark:border-white/10 space-y-8 max-h-[60vh] overflow-y-auto">
                <section>
                  <h3 className="text-[10px] font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider mb-4">Contact Info</h3>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-medium text-zinc-500 dark:text-zinc-400">Client Mobile</span>
                      <span className="text-xs font-medium text-zinc-900 dark:text-zinc-100">{selectedAppointment.client_mobile || '—'}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-medium text-zinc-500 dark:text-zinc-400">Staff Mobile</span>
                      <span className="text-xs font-medium text-zinc-900 dark:text-zinc-100">{selectedAppointment.bcl_attendee_mobile || '—'}</span>
                    </div>
                  </div>
                </section>

                <section>
                  <h3 className="text-[10px] font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider mb-4">Sync Status</h3>
                  <div className={`p-3 rounded-lg border flex items-start gap-3 transition-all ${selectedAppointment.google_event_id ? 'bg-emerald-50/50 border-emerald-200 dark:bg-emerald-500/10 dark:border-emerald-500/20' : 'bg-white dark:bg-zinc-900 border-zinc-200 dark:border-white/10'}`}>
                    <div className={`mt-0.5 h-6 w-6 rounded flex items-center justify-center shrink-0 ${selectedAppointment.google_event_id ? 'text-emerald-600 dark:text-emerald-400' : 'text-zinc-400'}`}>
                      {selectedAppointment.google_event_id ? <Cloud className="h-4 w-4" /> : <CloudOff className="h-4 w-4" />}
                    </div>
                    <div className="min-w-0">
                      <p className={`text-xs font-medium ${selectedAppointment.google_event_id ? 'text-emerald-900 dark:text-emerald-100' : 'text-zinc-900 dark:text-zinc-100'}`}>
                        {selectedAppointment.google_event_id ? 'Calendar Synced' : 'Offline'}
                      </p>
                      <p className={`text-[10px] mt-0.5 truncate ${selectedAppointment.google_event_id ? 'text-emerald-700/70 dark:text-emerald-400/70' : 'text-zinc-500 dark:text-zinc-400'}`}>
                        {selectedAppointment.google_event_id ? `ID: ${selectedAppointment.google_event_id.slice(0, 8)}...` : 'Not connected to Google'}
                      </p>
                    </div>
                  </div>
                </section>
              </div>
            </div>
          )}

          <DialogFooter className="px-6 py-4 bg-white dark:bg-zinc-950 border-t border-zinc-200 dark:border-white/10 flex flex-row items-center justify-between sm:justify-between">
            <div className="flex items-center gap-2">
              {selectedAppointment?.status === 'upcoming' && (
                <>
                  <Button size="sm" className="bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 hover:bg-zinc-800 dark:hover:bg-zinc-200 rounded-md h-8 font-medium text-xs px-3">
                    <CheckCircle className="mr-1.5 h-3.5 w-3.5" /> Complete
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => setRescheduleDialogOpen(true)} className="border-zinc-200 dark:border-white/10 text-zinc-700 dark:text-zinc-300 bg-white dark:bg-zinc-900 hover:bg-zinc-50 dark:hover:bg-white/5 rounded-md h-8 font-medium text-xs px-3">
                    <RefreshCw className="mr-1.5 h-3.5 w-3.5" /> Reschedule
                  </Button>
                </>
              )}
            </div>
            <Button variant="ghost" size="sm" onClick={() => setSelectedAppointment(null)} className="h-8 px-3 text-xs font-medium text-zinc-500 hover:text-zinc-900 dark:hover:text-white">
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

const Dashboard = () => (
  <React.Suspense fallback={<div className="flex h-screen items-center justify-center bg-transparent"><Loader2 className="h-6 w-6 animate-spin text-zinc-400" /></div>}>
    <DashboardContent />
  </React.Suspense>
);

export default Dashboard;