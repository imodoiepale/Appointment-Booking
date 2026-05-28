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
    upcoming: 'border-l-blue-500',
    rescheduled: 'border-l-indigo-500',
    pending: 'border-l-amber-500',
    canceled: 'border-l-red-500',
    completed: 'border-l-emerald-500',
  }[displayAppointment.status] || 'border-l-slate-300 dark:border-l-slate-700';

  return (
    <Card
      className={`group relative flex cursor-pointer flex-col overflow-hidden rounded-2xl border border-slate-200/80 dark:border-white/10 bg-white dark:bg-slate-950 transition-all duration-300 hover:shadow-xl hover:-translate-y-0.5 hover:border-blue-200 dark:hover:border-blue-500/30 border-l-[4px] ${accentColors}`}
      onClick={onClick}
    >
      <div className="p-5 space-y-4">
        {/* --- HEADER: Badges --- */}
        <div className="flex items-start justify-between gap-2">
          <div className="flex flex-wrap gap-2">
            <Badge className={`px-2.5 py-0.5 rounded-md border font-bold text-[9px] uppercase tracking-wider shadow-sm ${getStatusColor(displayAppointment.status)}`}>
              {displayAppointment.status}
            </Badge>
            {appointment.badge_status && (
              <Badge variant="outline" className={`px-2.5 py-0.5 rounded-md border font-bold text-[9px] uppercase tracking-wider shadow-sm ${getBadgeStatusColor(appointment.badge_status)}`}>
                {appointment.badge_status}
              </Badge>
            )}
          </div>
        </div>

        {/* --- CLIENT IDENTITY --- */}
        <div className="space-y-1.5">
          <h4 className="font-bold text-slate-950 dark:text-slate-50 leading-tight truncate text-base">
            {appointment.client_name}
          </h4>
          <div className="flex items-center gap-1.5 text-[11px] font-medium text-slate-500 dark:text-slate-400">
            <Globe className="h-3.5 w-3.5 shrink-0 text-slate-400" />
            <span className="truncate">{appointment.client_company || 'Independent Client'}</span>
          </div>
        </div>

        {/* --- LOGISTICS GRID --- */}
        <div className="grid grid-cols-1 gap-2.5">
          <div className="flex items-center justify-between bg-slate-50/80 dark:bg-white/[0.02] rounded-xl p-3 border border-slate-200/60 dark:border-white/5 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="h-8 w-8 rounded-lg bg-slate-200/60 dark:bg-white/10 flex items-center justify-center shadow-inner">
                <Calendar className="h-4 w-4 text-slate-700 dark:text-slate-300" />
              </div>
              <div>
                <p className="text-xs font-bold text-slate-900 dark:text-slate-100 leading-none">
                  {new Date(appointment.meeting_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                </p>
                <p className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-widest mt-1">
                  {new Date(appointment.meeting_date).toLocaleDateString('en-GB', { weekday: 'short' })}
                </p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-xs font-bold text-slate-900 dark:text-slate-100 leading-none">
                {formatTime(appointment.meeting_start_time)}
              </p>
              <p className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-widest mt-1">{appointment.meeting_duration}m</p>
            </div>
          </div>

          <div className="flex items-center gap-2 px-1 mt-1">
            {appointment.meeting_type === 'virtual' ? (
              <Video className="h-4 w-4 text-slate-400 dark:text-slate-500 shrink-0" />
            ) : (
              <MapPin className="h-4 w-4 text-slate-400 dark:text-slate-500 shrink-0" />
            )}
            <p className="text-xs font-medium text-slate-600 dark:text-slate-400 truncate">
              {appointment.meeting_venue_area || (appointment.meeting_type === 'virtual' ? 'Google Meet / Digital' : 'Venue not set')}
            </p>
          </div>
        </div>
      </div>

      {/* --- FOOTER --- */}
      <div className="mt-auto flex items-center justify-between px-5 py-3 bg-slate-50/80 dark:bg-white/[0.02] border-t border-slate-100 dark:border-white/5 group-hover:bg-blue-50/30 dark:group-hover:bg-blue-900/10 transition-colors">
        <div className="flex items-center gap-1.5 text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest">
          <Hash className="h-3.5 w-3.5" />
          {appointment.id_main}
        </div>
        <div className="flex items-center gap-1 text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest">
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
      title: <span className="flex items-center gap-2 font-semibold text-slate-900 dark:text-white"><CheckCircle className="h-4 w-4 text-emerald-500" />{title}</span>,
      description: desc,
      className: 'bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800 shadow-xl',
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
      case 'upcoming': return 'bg-slate-50 text-slate-700 border-slate-200 dark:bg-white/10 dark:text-slate-300 dark:border-white/10';
      case 'rescheduled': return 'bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-500/10 dark:text-indigo-400 dark:border-indigo-500/20';
      case 'pending': return 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-500/10 dark:text-amber-400 dark:border-amber-500/20';
      case 'canceled': return 'bg-red-50 text-red-700 border-red-200 dark:bg-red-500/10 dark:text-red-400 dark:border-red-500/20';
      case 'completed': return 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-500/20';
      default: return 'bg-slate-50 text-slate-700 border-slate-200 dark:bg-white/10 dark:text-slate-300 dark:border-white/10';
    }
  };

  const getBadgeStatusColor = (badgeStatus: string) => {
    switch (badgeStatus) {
      case 'Open': return 'bg-slate-50 text-slate-700 border-slate-200 dark:bg-white/10 dark:text-slate-300 dark:border-white/10';
      case 'Confirmed': return 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-500/20';
      case 'Tentative': return 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-500/10 dark:text-amber-400 dark:border-amber-500/20';
      case 'Rejected': return 'bg-red-50 text-red-700 border-red-200 dark:bg-red-500/10 dark:text-red-400 dark:border-red-500/20';
      default: return 'bg-slate-50 text-slate-700 border-slate-200 dark:bg-white/10 dark:text-slate-300 dark:border-white/10';
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
      <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
    </div>
  );

  return (
    <div className="min-h-screen p-4 lg:p-8 font-sans antialiased bg-transparent relative z-10">
      <Toaster />

      {/* --- Header --- */}
      <div className="mb-8 flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
        <div className="space-y-1.5">
          <h1 className="text-2xl font-bold tracking-tight text-slate-950 dark:text-slate-50">Meetings & Schedule</h1>
          <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Manage your client engagements and team schedule.</p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2 rounded-lg border border-slate-200/80 dark:border-white/10 bg-white/80 backdrop-blur-sm dark:bg-slate-900/80 px-3.5 py-2 shadow-sm">
            <span className={`h-2.5 w-2.5 rounded-full shadow-sm ${calendarConnectionStatus === 'connected' ? 'bg-emerald-500 shadow-emerald-500/50' : 'bg-red-500 shadow-red-500/50'}`} />
            <span className="text-xs font-bold text-slate-600 dark:text-slate-300">Calendar {calendarConnectionStatus}</span>
            <Button variant="ghost" size="icon" className="h-6 w-6 rounded-md p-0 ml-1 text-slate-400 hover:text-slate-900 hover:bg-slate-100 dark:hover:text-white dark:hover:bg-white/10">
              <RefreshCw className="h-3.5 w-3.5" />
            </Button>
          </div>
          <div className="h-8 w-[1px] bg-slate-200/80 dark:border-white/10 mx-1 hidden lg:block" />
          <Button variant="outline" className="h-10 rounded-lg border-slate-200/80 dark:border-white/10 bg-white/80 backdrop-blur-sm dark:bg-slate-900/80 px-4 text-xs font-bold shadow-sm hover:bg-slate-50 dark:hover:bg-white/5 dark:text-slate-100 transition-all">
            <Download className="mr-2 h-4 w-4 text-slate-400" />
            Export
          </Button>
          <Button className="h-10 rounded-lg bg-blue-600 px-4 text-sm font-bold text-white shadow-md shadow-blue-600/20 hover:bg-blue-700 hover:shadow-lg hover:shadow-blue-600/30 transition-all active:scale-[0.98]">
            <Plus className="mr-2 h-4 w-4" />
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
          <Card key={i} className="border border-slate-200/80 dark:border-white/10 bg-white/80 backdrop-blur-sm dark:bg-slate-900/80 shadow-sm rounded-2xl hover:shadow-md transition-shadow">
            <CardContent className="p-5">
              <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500">{stat.label}</p>
              <p className="mt-2 text-3xl font-bold text-slate-950 dark:text-slate-50">{stat.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* --- Main Content Area --- */}
      <div className="rounded-2xl border border-slate-200/80 dark:border-white/10 bg-white/95 backdrop-blur-xl dark:bg-slate-950/95 shadow-lg overflow-hidden flex flex-col">

        {/* Toolbar */}
        <div className="flex flex-col border-b border-slate-200/80 dark:border-white/10 bg-slate-50/50 dark:bg-white/[0.02] lg:flex-row lg:items-center">
          <div className="flex items-center p-3 overflow-x-auto scrollbar-hide">
            <div className="flex bg-slate-100/80 dark:bg-slate-900/80 p-1 rounded-xl border border-slate-200/80 dark:border-white/10 shadow-inner">
              {['upcoming', 'today', 'pending', 'completed', 'canceled'].map(tab => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`rounded-lg px-4 py-2 text-xs font-bold capitalize transition-all ${activeTab === tab
                    ? 'bg-white dark:bg-slate-800 text-blue-700 dark:text-blue-400 shadow-sm border border-slate-200/50 dark:border-slate-700/50'
                    : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 border border-transparent'
                    }`}
                >
                  {tab}
                </button>
              ))}
            </div>
          </div>

          <div className="flex flex-1 items-center gap-3 p-3 pt-0 lg:pt-3">
            <div className="relative flex-1 max-w-md ml-0 lg:ml-4">
              <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <Input
                placeholder="Search clients or ID..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="h-10 border-slate-200/80 dark:border-white/10 bg-white dark:bg-slate-900 pl-10 text-sm font-medium focus-visible:ring-blue-500/30 rounded-xl shadow-sm"
              />
            </div>

            <Button variant="outline" size="sm" className="h-10 border-slate-200/80 dark:border-white/10 text-slate-600 dark:text-slate-400 text-sm font-semibold hidden lg:flex bg-white dark:bg-slate-900 rounded-xl shadow-sm">
              <Filter className="mr-2 h-4 w-4" /> Filters
            </Button>

            <div className="ml-auto flex items-center rounded-xl bg-slate-100/80 dark:bg-slate-900/80 p-1 border border-slate-200/80 dark:border-white/10 shadow-inner">
              <button
                onClick={() => setViewMode('table')}
                className={`flex items-center h-8 px-3 rounded-lg text-xs font-bold transition-all ${viewMode === 'table' ? 'bg-white dark:bg-slate-800 shadow-sm text-blue-700 dark:text-blue-400 border border-slate-200/50 dark:border-slate-700/50' : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300 border border-transparent'}`}
              >
                <Table2 className="mr-2 h-3.5 w-3.5" /> Table
              </button>
              <button
                onClick={() => setViewMode('cards')}
                className={`flex items-center h-8 px-3 rounded-lg text-xs font-bold transition-all ${viewMode === 'cards' ? 'bg-white dark:bg-slate-800 shadow-sm text-blue-700 dark:text-blue-400 border border-slate-200/50 dark:border-slate-700/50' : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300 border border-transparent'}`}
              >
                <LayoutGrid className="mr-2 h-3.5 w-3.5" /> Grid
              </button>
            </div>
          </div>
        </div>

        {/* List View */}
        <div className="flex-1 min-h-[500px] overflow-hidden flex flex-col">
          {viewMode === 'table' ? (
            <div className="relative overflow-x-auto flex-1">
              <Table>
                <TableHeader className="bg-slate-50/80 dark:bg-white/[0.02] border-b border-slate-200/80 dark:border-white/10">
                  <TableRow className="hover:bg-transparent border-none">
                    <TableHead className="w-12 pl-6"></TableHead>
                    <TableHead className="text-[10px] font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500">Meeting & Client</TableHead>
                    <TableHead className="text-[10px] font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500">Date</TableHead>
                    <TableHead className="text-[10px] font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500">Time</TableHead>
                    <TableHead className="text-[10px] font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500">Related To</TableHead>
                    <TableHead className="text-[10px] font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500">Status</TableHead>
                    <TableHead className="w-20 pr-6 text-right"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginated.length > 0 ? paginated.map((app) => (
                    <TableRow
                      key={app.id_main}
                      className="group cursor-pointer border-b border-slate-100 dark:border-white/5 hover:bg-slate-50 dark:hover:bg-white/[0.02] transition-colors"
                      onClick={() => setSelectedAppointment(app)}
                    >
                      <TableCell className="pl-6">
                        <div className="h-4 w-4 rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 group-hover:border-blue-400 transition-colors shadow-sm" />
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-4">
                          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-100 dark:bg-white/10 text-slate-500 dark:text-slate-400 shadow-inner">
                            {app.meeting_type === 'virtual' ? <Video className="h-4 w-4" /> : <MapPin className="h-4 w-4" />}
                          </div>
                          <div className="min-w-0">
                            <p className="truncate text-sm font-bold text-slate-900 dark:text-slate-100">{app.meeting_agenda || `${app.client_name} Meeting`}</p>
                            <p className="text-[11px] font-medium text-slate-500 dark:text-slate-400 mt-0.5">#{app.id_main} • {app.client_name}</p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="text-sm text-slate-700 dark:text-slate-300 font-semibold">
                        {new Date(app.meeting_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                      </TableCell>
                      <TableCell className="text-sm text-slate-700 dark:text-slate-300">
                        <div className="flex items-center gap-2 font-semibold">
                          <Clock className="h-4 w-4 text-slate-400" />
                          {formatTime(app.meeting_start_time)}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2.5 text-sm text-slate-600 dark:text-slate-400 font-medium">
                          <Building className="h-4 w-4 text-slate-400" />
                          <span className="truncate max-w-[140px]">{app.client_company || 'Independent'}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className={`rounded-md border font-bold px-2.5 py-1 text-[9px] uppercase tracking-wider shadow-sm ${getStatusStyles(app.status)}`}>
                          {app.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="pr-6 text-right" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-end gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                          {app.google_meet_link && (
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-indigo-500 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-500/10 rounded-lg" onClick={() => window.open(app.google_meet_link, '_blank')}>
                              <Video className="h-4 w-4" />
                            </Button>
                          )}
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400 hover:text-slate-900 dark:hover:text-white rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  )) : (
                    <TableRow>
                      <TableCell colSpan={7} className="h-64 text-center text-slate-400 dark:text-slate-500 text-sm font-medium">
                        No meetings found in this view.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="p-6 flex-1 overflow-y-auto bg-slate-50/50 dark:bg-slate-950/30">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
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
        <div className="flex items-center justify-between border-t border-slate-200/80 dark:border-white/10 bg-white dark:bg-slate-950 px-6 py-4 shrink-0">
          <p className="text-sm font-semibold text-slate-500 dark:text-slate-400">
            Showing <span className="text-slate-900 dark:text-slate-100">{activeAppointments.length > 0 ? currentPage * itemsPerPage + 1 : 0}</span> to <span className="text-slate-900 dark:text-slate-100">{Math.min((currentPage + 1) * itemsPerPage, activeAppointments.length)}</span> of {activeAppointments.length}
          </p>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="icon" className="h-8 w-8 rounded-lg border-slate-200/80 dark:border-white/10 bg-white dark:bg-slate-900 text-slate-500 shadow-sm hover:bg-slate-50 dark:hover:bg-slate-800" onClick={() => setCurrentPage(p => p - 1)} disabled={currentPage === 0}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <div className="flex items-center gap-1.5">
              {Array.from({ length: totalPages }, (_, i) => (
                <Button
                  key={i}
                  variant={currentPage === i ? 'default' : 'outline'}
                  className={`h-8 w-8 p-0 text-sm font-bold rounded-lg border-slate-200/80 dark:border-white/10 shadow-sm transition-all ${currentPage === i ? 'bg-blue-600 text-white shadow-md shadow-blue-600/20 border-transparent hover:bg-blue-700' : 'bg-white dark:bg-slate-900 text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800'}`}
                  onClick={() => setCurrentPage(i)}
                >
                  {i + 1}
                </Button>
              ))}
            </div>
            <Button variant="outline" size="icon" className="h-8 w-8 rounded-lg border-slate-200/80 dark:border-white/10 bg-white dark:bg-slate-900 text-slate-500 shadow-sm hover:bg-slate-50 dark:hover:bg-slate-800" onClick={() => setCurrentPage(p => p + 1)} disabled={currentPage >= totalPages - 1}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* --- SELECTED APPOINTMENT DETAILS DIALOG --- */}
      <Dialog open={!!selectedAppointment} onOpenChange={(open) => !open && setSelectedAppointment(null)}>
        <DialogContent className="max-w-4xl p-0 overflow-hidden bg-white dark:bg-slate-950 border border-slate-200/80 dark:border-white/10 shadow-2xl rounded-2xl">
          <DialogHeader className="px-6 py-6 bg-slate-50/80 dark:bg-white/[0.02] border-b border-slate-200/80 dark:border-white/10">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="space-y-1.5">
                <div className="flex items-center gap-2.5">
                  <div className="flex h-6 w-6 items-center justify-center rounded-md bg-slate-200/60 dark:bg-white/10 text-slate-700 dark:text-slate-300 text-[10px] font-bold shadow-inner">
                    MTG
                  </div>
                  <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest">#{selectedAppointment?.id_main} • Details</span>
                </div>
                <DialogTitle className="text-2xl font-bold text-slate-950 dark:text-slate-50 tracking-tight">
                  {selectedAppointment?.client_name}
                </DialogTitle>
                <div className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400 font-medium">
                  <Building className="h-4 w-4 text-slate-400" />
                  <span>{selectedAppointment?.client_company || 'Independent Client'}</span>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Badge className={`px-3 py-1 rounded-md border font-bold text-[10px] uppercase tracking-wider shadow-sm ${getBadgeStatusColor(selectedAppointment?.badge_status || '')}`}>
                  {selectedAppointment?.badge_status}
                </Badge>
                <Badge className={`px-3 py-1 rounded-md border font-bold text-[10px] uppercase tracking-wider shadow-sm ${getStatusStyles(checkAppointmentStatus(selectedAppointment || {} as Appointment).status || '')}`}>
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
                  <h3 className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-3">Agenda & Notes</h3>
                  <div className="text-slate-700 dark:text-slate-300 text-sm font-medium bg-slate-50/80 dark:bg-white/[0.02] p-5 rounded-xl border border-slate-200/60 dark:border-white/5 shadow-sm whitespace-pre-wrap leading-relaxed">
                    {selectedAppointment.meeting_agenda || 'No specific agenda has been outlined for this discussion.'}
                  </div>
                </section>

                <section>
                  <h3 className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-4">Logistics</h3>
                  <div className="grid grid-cols-2 gap-y-6 gap-x-8">
                    <div className="space-y-1.5">
                      <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest">Date</p>
                      <p className="text-sm font-bold text-slate-900 dark:text-slate-100">
                        {new Date(selectedAppointment.meeting_date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}
                      </p>
                    </div>
                    <div className="space-y-1.5">
                      <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest">Time</p>
                      <p className="text-sm font-bold text-slate-900 dark:text-slate-100">
                        {formatTime(selectedAppointment.meeting_start_time)} — {formatTime(selectedAppointment.meeting_end_time)}
                      </p>
                    </div>
                    <div className="space-y-1.5">
                      <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest">Format</p>
                      <div className="flex items-center gap-2 mt-0.5">
                        {selectedAppointment.meeting_type === 'virtual' ? <Video className="h-4 w-4 text-slate-400" /> : <MapPin className="h-4 w-4 text-slate-400" />}
                        <span className="text-sm font-bold text-slate-900 dark:text-slate-100 capitalize">{selectedAppointment.meeting_type}</span>
                      </div>
                    </div>
                    <div className="space-y-1.5">
                      <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest">Venue / Link</p>
                      {selectedAppointment.google_meet_link ? (
                        <a href={selectedAppointment.google_meet_link} target="_blank" className="text-sm font-bold text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1.5 mt-0.5">
                          Join Meeting <Globe className="h-3.5 w-3.5" />
                        </a>
                      ) : (
                        <p className="text-sm font-bold text-slate-900 dark:text-slate-100 mt-0.5 truncate">{selectedAppointment.meeting_venue_area || 'Not provided'}</p>
                      )}
                    </div>
                  </div>
                </section>

                <section>
                  <h3 className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-4">Participants</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="flex items-center gap-3.5 p-4 rounded-xl bg-slate-50/80 dark:bg-white/[0.02] border border-slate-200/60 dark:border-white/5 shadow-sm">
                      <div className="h-10 w-10 rounded-full bg-slate-200/60 dark:bg-white/10 flex items-center justify-center text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase shadow-inner">
                        {selectedAppointment.bcl_attendee?.slice(0, 2)}
                      </div>
                      <div>
                        <p className="text-sm font-bold text-slate-900 dark:text-slate-100">{selectedAppointment.bcl_attendee}</p>
                        <p className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-widest mt-0.5">Internal</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3.5 p-4 rounded-xl bg-slate-50/80 dark:bg-white/[0.02] border border-slate-200/60 dark:border-white/5 shadow-sm">
                      <div className="h-10 w-10 rounded-full bg-slate-200/60 dark:bg-white/10 flex items-center justify-center text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase shadow-inner">
                        {selectedAppointment.client_name?.slice(0, 2)}
                      </div>
                      <div>
                        <p className="text-sm font-bold text-slate-900 dark:text-slate-100">{selectedAppointment.client_name}</p>
                        <p className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-widest mt-0.5">External</p>
                      </div>
                    </div>
                  </div>
                </section>
              </div>

              {/* --- RIGHT: SIDEBAR --- */}
              <div className="lg:col-span-5 bg-slate-50/50 dark:bg-white/[0.02] p-6 border-t lg:border-t-0 lg:border-l border-slate-200/80 dark:border-white/10 space-y-8 max-h-[60vh] overflow-y-auto">
                <section>
                  <h3 className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-4">Contact Info</h3>
                  <div className="space-y-4 bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200/60 dark:border-white/5 shadow-sm">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">Client Mobile</span>
                      <span className="text-xs font-bold text-slate-900 dark:text-slate-100">{selectedAppointment.client_mobile || '—'}</span>
                    </div>
                    <div className="h-px bg-slate-100 dark:bg-white/5 w-full" />
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">Staff Mobile</span>
                      <span className="text-xs font-bold text-slate-900 dark:text-slate-100">{selectedAppointment.bcl_attendee_mobile || '—'}</span>
                    </div>
                  </div>
                </section>

                <section>
                  <h3 className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-4">Sync Status</h3>
                  <div className={`p-4 rounded-xl border flex items-start gap-3.5 transition-all shadow-sm ${selectedAppointment.google_event_id ? 'bg-emerald-50/50 border-emerald-200 dark:bg-emerald-500/10 dark:border-emerald-500/20' : 'bg-white dark:bg-slate-900 border-slate-200/60 dark:border-white/5'}`}>
                    <div className={`mt-0.5 h-8 w-8 rounded-lg flex items-center justify-center shrink-0 shadow-inner ${selectedAppointment.google_event_id ? 'bg-emerald-100 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-400' : 'bg-slate-100 text-slate-400 dark:bg-white/10'}`}>
                      {selectedAppointment.google_event_id ? <Cloud className="h-4 w-4" /> : <CloudOff className="h-4 w-4" />}
                    </div>
                    <div className="min-w-0 pt-0.5">
                      <p className={`text-sm font-bold ${selectedAppointment.google_event_id ? 'text-emerald-900 dark:text-emerald-100' : 'text-slate-900 dark:text-slate-100'}`}>
                        {selectedAppointment.google_event_id ? 'Calendar Synced' : 'Offline'}
                      </p>
                      <p className={`text-xs font-medium mt-1 truncate ${selectedAppointment.google_event_id ? 'text-emerald-700/80 dark:text-emerald-400/80' : 'text-slate-500 dark:text-slate-400'}`}>
                        {selectedAppointment.google_event_id ? `ID: ${selectedAppointment.google_event_id.slice(0, 8)}...` : 'Not connected to Google'}
                      </p>
                    </div>
                  </div>
                </section>
              </div>
            </div>
          )}

          <DialogFooter className="px-6 py-4 bg-white dark:bg-slate-950 border-t border-slate-200/80 dark:border-white/10 flex flex-row items-center justify-between sm:justify-between">
            <div className="flex items-center gap-2.5">
              {selectedAppointment?.status === 'upcoming' && (
                <>
                  <Button size="sm" className="bg-blue-600 hover:bg-blue-700 text-white shadow-md shadow-blue-600/20 rounded-lg h-9 font-bold text-xs px-4 transition-all">
                    <CheckCircle className="mr-2 h-4 w-4" /> Complete
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => setRescheduleDialogOpen(true)} className="border-slate-200/80 dark:border-white/10 text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 shadow-sm rounded-lg h-9 font-bold text-xs px-4">
                    <RefreshCw className="mr-2 h-4 w-4" /> Reschedule
                  </Button>
                </>
              )}
            </div>
            <Button variant="ghost" size="sm" onClick={() => setSelectedAppointment(null)} className="h-9 px-4 text-xs font-bold text-slate-500 hover:text-slate-900 dark:hover:text-white rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800">
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

const Dashboard = () => (
  <React.Suspense fallback={<div className="flex h-screen items-center justify-center bg-transparent"><Loader2 className="h-8 w-8 animate-spin text-blue-600" /></div>}>
    <DashboardContent />
  </React.Suspense>
);

export default Dashboard;