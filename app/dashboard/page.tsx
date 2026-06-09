// @ts-nocheck
"use client"

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Toaster } from "@/components/ui/toaster";
import { useToast } from "@/hooks/use-toast";
import { Calendar, Clock, Building, MapPin, CheckCircle, XCircle, Table2, LayoutGrid, Video, Trash2, Loader2, CloudOff, Cloud, ChevronLeft, ChevronRight, Search, MoreHorizontal, Plus, Download, Hash, Globe, CheckCircle2, CalendarClock, Edit2, Ban, UserCheck, AlertCircle, PartyPopper, Users, ClipboardList, Zap, LinkIcon, ArrowRight, RefreshCw, Timer, MoveRight, AlarmClock, PlusCircle, Phone, Mail, User, Briefcase, FileText, Clock3, ChevronDown, ChevronUp, Star, Tag, Info } from 'lucide-react';
import { getStatusHexColor, getStatusLabel } from '@/utils/appointmentStatuses';
import { formatTime, formatDate, parseLocalDate } from '../../utils/format';
import { cn } from '@/lib/utils';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { ScheduleDialog } from '../schedule/page';
import { DashboardDialogs } from './components/DashboardDialogs';

const ADMIN_ROLES = new Set(['admin', 'super_admin', 'administrator']);

function parseBclAttendees(value: any): string[] {
  if (Array.isArray(value)) return value.map(String);
  if (typeof value === 'string' && value.trim()) {
    try { const p = JSON.parse(value); if (Array.isArray(p)) return p.map(String); } catch { }
    return [value.trim()];
  }
  return [];
}

function parseAttendeeInfo(value: any): Array<{ id?: string; name?: string }> {
  if (Array.isArray(value)) return value.filter(Boolean);
  if (typeof value === 'string' && value.trim()) {
    try { const parsed = JSON.parse(value); return Array.isArray(parsed) ? parsed.filter(Boolean) : []; } catch { return []; }
  }
  return [];
}

function buildUserMap(users: any[]): Record<string, any> {
  return Object.fromEntries((users || []).map((u) => [String(u.id), u]));
}

function getAttendeeDetails(appointment: any, usersById: Record<string, any> = {}) {
  const info = parseAttendeeInfo(appointment?.bcl_attendees_info);
  const ids = [...info.map((a) => a.id).filter(Boolean), ...parseBclAttendees(appointment?.bcl_attendee)].map(String);
  const uniqueIds = Array.from(new Set(ids));
  const details = uniqueIds.map((id) => {
    const user = usersById[id];
    const fallback = info.find((a) => String(a.id) === id);
    return { id, name: user?.displayName || user?.name || fallback?.name || appointment?.bcl_attendee_name || id, email: user?.email || fallback?.email || null, username: user?.username || fallback?.username || null };
  });
  if (details.length) return details;
  if (appointment?.bcl_attendee_name) return [{ id: '', name: appointment.bcl_attendee_name }];
  return [];
}

function parseLocalDateTime(dateStr?: string, timeStr?: string) {
  const date = parseLocalDate(dateStr); if (!date) return null;
  const [hours = 0, minutes = 0] = (timeStr || '00:00').split(':').map(Number);
  date.setHours(hours || 0, minutes || 0, 0, 0); return date;
}

function getTodayLocalDateString() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
}

function addMinutesToTime(time: string, minutes: number): string {
  const [h, m] = time.split(':').map(Number);
  const total = h * 60 + m + minutes;
  return `${String(Math.floor(total / 60) % 24).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`;
}

function calcSlot(base: string, offsetMins: number): string {
  if (!base) return '';
  const [h, m] = base.split(':').map(Number);
  if (isNaN(h) || isNaN(m)) return '';
  const d = new Date(); d.setHours(h, m + offsetMins, 0, 0);
  return d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
}

function timeToMins(t: string) { const [h, m] = t.split(':').map(Number); return h * 60 + m; }

const TERMINAL_STATUSES = new Set(['cancelled', 'canceled', 'completed', 'no_show']);

function effectiveStatus(meeting: any, now: Date): string {
  const base = (meeting?.status || 'upcoming').toLowerCase();
  if (TERMINAL_STATUSES.has(base) || base === 'overdue') return base;
  if (!meeting?.meeting_date || !meeting?.meeting_start_time || !meeting?.meeting_end_time) return base;
  const start = parseLocalDateTime(meeting.meeting_date, meeting.meeting_start_time);
  const end = parseLocalDateTime(meeting.meeting_date, meeting.meeting_end_time);
  if (!start || !end) return base;
  if (now >= end) return 'overdue';
  if (now >= start) return 'in_progress';
  return base;
}

function detectExtensionConflicts(meeting: any, newEndTime: string, allMeetings: any[]): any[] {
  const newEndMins = timeToMins(newEndTime);
  const meetingStartMins = timeToMins(meeting.meeting_start_time);
  return allMeetings.filter(m => {
    if (m.id_main === meeting.id_main) return false;
    if (m.meeting_date !== meeting.meeting_date) return false;
    if (TERMINAL_STATUSES.has((m.status || '').toLowerCase())) return false;
    if (!m.meeting_start_time || !m.meeting_end_time) return false;
    const mStart = timeToMins(m.meeting_start_time);
    const mEnd = timeToMins(m.meeting_end_time);
    return mStart < newEndMins && mEnd > meetingStartMins;
  });
}

function calculateCascade(newEndTime: string, conflicts: any[]): Array<{ meeting: any; newStart: string; newEnd: string }> {
  const sorted = [...conflicts].sort((a, b) => timeToMins(a.meeting_start_time) - timeToMins(b.meeting_start_time));
  const result: Array<{ meeting: any; newStart: string; newEnd: string }> = [];
  let cursor = newEndTime;
  for (const m of sorted) {
    const dur = m.meeting_duration
      ? Number(m.meeting_duration)
      : timeToMins(m.meeting_end_time) - timeToMins(m.meeting_start_time);
    const newStart = cursor;
    const newEnd = addMinutesToTime(newStart, Math.max(dur, 15));
    result.push({ meeting: m, newStart, newEnd });
    cursor = newEnd;
  }
  return result;
}

function todayGroup(item: any, now: Date): { rank: number; label: string; emoji: string } {
  const effStatus = effectiveStatus(item, now);
  if (effStatus === 'in_progress' || effStatus === 'overdue')
    return { rank: 0, label: 'In Progress', emoji: '🔥' };
  const dateStr = item.meeting_date || item.event_date;
  const timeStr = item.meeting_start_time || item.event_start_time;
  const start = parseLocalDateTime(dateStr, timeStr);
  if (start) {
    const minsUntil = (start.getTime() - now.getTime()) / 60000;
    if (minsUntil >= 0 && minsUntil <= 30)
      return { rank: 1, label: 'Starting Soon', emoji: '⏰' };
  }
  return { rank: 2, label: 'Later Today', emoji: '📅' };
}

const initials = (n: string) => n?.split(' ').map(c => c[0]).join('').slice(0, 2).toUpperCase() ?? '??';

function StatusPill({ status }: { status?: string }) {
  const col = getStatusHexColor(status);
  return (
    <span style={{ background: col.bg, color: col.text, borderColor: `${col.hex}40` }} className="inline-flex items-center rounded border px-2.5 py-1 text-[10px] font-bold tracking-wide">
      {getStatusLabel(status)}
    </span>
  );
}

function SyncBadge({ synced }: { synced: boolean }) {
  return synced
    ? <span className="inline-flex items-center gap-1 rounded border border-green-200 bg-green-100 px-2 py-0.5 text-[10px] font-bold text-green-700"><Cloud size={10} /> Synced</span>
    : <span className="inline-flex items-center gap-1 rounded border border-slate-200 bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-500"><CloudOff size={10} /> Not synced</span>;
}

const AppointmentCard = ({ appointment, onClick, usersById = {} }) => {
  const displayStatus = (() => {
    const now = new Date();
    const mtgDate = parseLocalDateTime(appointment.meeting_date, appointment.meeting_start_time);
    if (!mtgDate) return appointment.status;
    if (['upcoming', 'rescheduled'].includes(appointment.status) && now > mtgDate) return 'pending';
    return appointment.status;
  })();
  const attendeeName = getAttendeeDetails(appointment, usersById)[0]?.name || '—';
  return (
    <div className="group relative bg-white rounded-xl border border-slate-200 p-5 shadow-sm hover:shadow-md transition-all cursor-pointer hover:-translate-y-1" onClick={onClick}>
      <div className="flex justify-between items-start mb-4">
        <StatusPill status={displayStatus} />
        <SyncBadge synced={!!appointment.google_event_id} />
      </div>
      <div className="text-[16px] font-bold text-slate-900 mb-1">{appointment.client_name}</div>
      <div className="text-xs text-slate-500 flex items-center gap-1.5 mb-4">
        <Building size={12} /> {appointment.client_company || 'Independent'}
      </div>
      <div className="bg-slate-50 rounded-lg p-3 flex justify-between items-center mb-4">
        <div>
          <div className="text-xs font-bold text-slate-900">{formatDate(appointment.meeting_date, { day: '2-digit', month: '2-digit' })}</div>
          <div className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">{formatDate(appointment.meeting_date, { weekday: 'short' })}</div>
        </div>
        <div className="text-right">
          <div className="text-xs font-bold text-[#0057E7]">{formatTime(appointment.meeting_start_time)}</div>
          <div className="text-[10px] text-slate-400 font-bold">{appointment.meeting_duration}m</div>
        </div>
      </div>
      <div className="flex items-center justify-between mt-auto pt-4 border-t border-slate-100">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-full bg-slate-100 flex items-center justify-center text-[10px] font-bold text-slate-600 border border-slate-200">{initials(attendeeName)}</div>
          <span className="text-[11px] font-medium text-slate-600 truncate max-w-[100px]">{attendeeName}</span>
        </div>
        {appointment.meeting_type === 'virtual' ? <Video size={14} className="text-indigo-500" /> : <MapPin size={14} className="text-sky-500" />}
      </div>
    </div>
  );
};

function DateTile({ dateStr, dim = false }: { dateStr?: string; dim?: boolean }) {
  if (!dateStr) return null;
  const d = parseLocalDate(dateStr); if (!d) return null;
  return (
    <div className={cn("flex h-[42px] w-[42px] flex-shrink-0 flex-col items-center justify-center rounded-lg", dim ? "bg-slate-400" : "bg-blue-600")}>
      <span className="text-[15px] font-black text-white leading-none">{d.getDate()}</span>
      <span className="text-[8px] font-bold text-white/70 tracking-wide uppercase">{d.toLocaleDateString('en', { month: 'short' })}</span>
    </div>
  );
}

const DashboardContent = () => {
  const searchParams = useSearchParams();
  const router = useRouter();
  const scope = searchParams.get('scope') ?? 'all';
  const statusParam = searchParams.get('status');
  const [appointments, setAppointments] = useState([]);
  const [allEvents, setAllEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedAppointment, setSelectedAppointment] = useState(null);
  const [activeTab, setActiveTab] = useState(statusParam ?? 'today');
  const [contentType, setContentType] = useState<'meetings' | 'events' | 'all'>('meetings');
  const [calendarConnectionStatus, setCalendarConnectionStatus] = useState('checking');
  const [currentUserId, setCurrentUserId] = useState(null);
  const [bclUsersById, setBclUsersById] = useState<Record<string, any>>({});
  const [isAdmin, setIsAdmin] = useState(false);
  const [currentPage, setCurrentPage] = useState(0);
  const [itemsPerPage] = useState(12);
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState('table');
  const { toast } = useToast();
  const [actionLoading, setActionLoading] = useState('');
  const [syncingRow, setSyncingRow] = useState<number | null>(null);
  const [isDeleteOpen, setDeleteOpen] = useState(false);
  const [isRescheduleOpen, setRescheduleOpen] = useState(false);
  const [isEditOpen, setEditOpen] = useState(false);
  const [rescheduleConflict, setRescheduleConflict] = useState('');
  const [scheduleOpen, setScheduleOpen] = useState(false);
  const [detailTab, setDetailTab] = useState<'overview' | 'schedule' | 'sync'>('overview');
  const [now, setNow] = useState(() => new Date());
  const [extendOpen, setExtendOpen] = useState(false);
  const [customExtendMins, setCustomExtendMins] = useState('30');
  const [pendingExtension, setPendingExtension] = useState<{ newEndTime: string; extraMinutes: number } | null>(null);
  const [conflictModalOpen, setConflictModalOpen] = useState(false);
  const [conflictingMeetings, setConflictingMeetings] = useState<any[]>([]);
  const [cascadeProposal, setCascadeProposal] = useState<Array<{ meeting: any; newStart: string; newEnd: string }>>([]);
  const [rescheduleData, setRescheduleData] = useState({ meeting_date: '', meeting_start_time: '', meeting_duration: '60', meeting_end_time: '', meeting_slot_start_time: '', meeting_slot_end_time: '', venue_distance: '10', meeting_type: 'inPerson', meeting_venue_area: '', meeting_agenda: '' });
  const notify = {
    success: (title: string, desc?: string) => toast({ title, description: desc }),
    error: (title: string, desc?: string) => toast({ variant: 'destructive', title, description: desc }),
  };

  useEffect(() => { if (statusParam) setActiveTab(statusParam); }, [statusParam]);

  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 60_000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    const init = async () => {
      setLoading(true);
      try {
        const [userRes, meetingsRes, eventsRes, calRes, bclUsersRes] = await Promise.all([
          fetch('/api/users/me'), fetch('/api/meetings'), fetch('/api/events'),
          fetch('/api/auth/google/status'), fetch('/api/users/bcl-attendees'),
        ]);
        if (userRes.ok) { const me = await userRes.json(); setCurrentUserId(me.id); setIsAdmin(ADMIN_ROLES.has((me.role ?? '').toLowerCase())); }
        if (meetingsRes.ok) { const data = await meetingsRes.json(); setAppointments(Array.isArray(data) ? data : []); }
        if (eventsRes.ok) { const data = await eventsRes.json(); setAllEvents(Array.isArray(data) ? data : []); }
        if (bclUsersRes.ok) { const data = await bclUsersRes.json(); setBclUsersById(buildUserMap(Array.isArray(data) ? data : [])); }
        const calStatus = await calRes.json();
        setCalendarConnectionStatus(calStatus.connected ? 'connected' : 'disconnected');
      } catch (err) { console.error(err); }
      finally { setLoading(false); }
    };
    init();
  }, []);

  const patchMeeting = useCallback(async (id: number, payload: object) => {
    const res = await fetch(`/api/meetings/${id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
    if (!res.ok) throw new Error((await res.json()).error || 'Request failed');
    return res.json();
  }, []);

  const updateLocal = useCallback((id: number, patch: object) => {
    setAppointments(prev => prev.map(a => a.id_main === id ? { ...a, ...patch } : a));
    setSelectedAppointment(prev => prev && prev.id_main === id ? { ...prev, ...patch } : prev);
  }, []);

  const syncMeeting = async (meeting: any): Promise<string | null> => {
    const res = await fetch('/api/sync-to-calendar', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(meeting),
    });
    if (!res.ok) throw new Error((await res.json()).error || 'Sync failed');
    const { eventId } = await res.json();
    if (eventId) {
      await patchMeeting(meeting.id_main, { google_event_id: eventId });
      updateLocal(meeting.id_main, { google_event_id: eventId });
    }
    return eventId ?? null;
  };

  const updateCalendarEvent = async (meeting: any) => {
    const res = await fetch('/api/auto-sync-calendar', {
      method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(meeting),
    });
    if (!res.ok) throw new Error((await res.json()).error || 'Calendar update failed');
    const { eventId } = await res.json();
    if (eventId) {
      await patchMeeting(meeting.id_main, { google_event_id: eventId });
      updateLocal(meeting.id_main, { google_event_id: eventId });
    }
  };

  const unsyncMeeting = async (meeting: any) => {
    await fetch(`/api/auto-sync-calendar?id=${meeting.id_main}`, { method: 'DELETE' });
    await patchMeeting(meeting.id_main, { google_event_id: null, google_meet_link: null });
    updateLocal(meeting.id_main, { google_event_id: null, google_meet_link: null });
  };

  const handleCancel = async () => {
    if (!selectedAppointment) return;
    setActionLoading('cancel');
    try { await patchMeeting(selectedAppointment.id_main, { status: 'canceled' }); updateLocal(selectedAppointment.id_main, { status: 'canceled' }); notify.success('Meeting Cancelled'); setSelectedAppointment(null); }
    catch (e: any) { notify.error('Failed to cancel', e.message); }
    finally { setActionLoading(''); }
  };

  const handleConfirm = async () => {
    if (!selectedAppointment) return;
    setActionLoading('confirm');
    try { await patchMeeting(selectedAppointment.id_main, { badge_status: 'Confirmed' }); updateLocal(selectedAppointment.id_main, { badge_status: 'Confirmed' }); notify.success('Meeting Confirmed'); }
    catch (e: any) { notify.error('Failed to confirm', e.message); }
    finally { setActionLoading(''); }
  };

  const handleMarkDone = async () => {
    if (!selectedAppointment) return;
    setActionLoading('done');
    try { await patchMeeting(selectedAppointment.id_main, { status: 'completed' }); updateLocal(selectedAppointment.id_main, { status: 'completed' }); notify.success('Marked as done'); setSelectedAppointment(null); }
    catch (e: any) { notify.error('Failed', e.message); }
    finally { setActionLoading(''); }
  };

  const handleEndMeeting = async () => {
    if (!selectedAppointment) return;
    setActionLoading('end');
    try {
      await patchMeeting(selectedAppointment.id_main, { status: 'completed' });
      updateLocal(selectedAppointment.id_main, { status: 'completed' });
      notify.success('Meeting ended', 'Status set to Completed');
    } catch (e: any) { notify.error('Failed', e.message); }
    finally { setActionLoading(''); }
  };

  const handleExtend = (minutes: number) => {
    if (!selectedAppointment?.meeting_end_time) return;
    const newEndTime = addMinutesToTime(selectedAppointment.meeting_end_time, minutes);
    const conflicts = detectExtensionConflicts(selectedAppointment, newEndTime, appointments);
    const ext = { newEndTime, extraMinutes: minutes };
    setPendingExtension(ext);
    if (conflicts.length === 0) {
      applyExtension(ext);
    } else {
      setConflictingMeetings(conflicts);
      setCascadeProposal(calculateCascade(newEndTime, conflicts));
      setConflictModalOpen(true);
    }
  };

  const applyExtension = async ({ newEndTime, extraMinutes }: { newEndTime: string; extraMinutes: number }) => {
    if (!selectedAppointment) return;
    setActionLoading('extend');
    try {
      const newDuration = (Number(selectedAppointment.meeting_duration) || 60) + extraMinutes;
      const patch = { meeting_end_time: newEndTime, meeting_duration: newDuration, status: 'in_progress' };
      await patchMeeting(selectedAppointment.id_main, patch);
      updateLocal(selectedAppointment.id_main, patch);
      if (calendarConnectionStatus === 'connected' && selectedAppointment.google_event_id) {
        try { await updateCalendarEvent({ ...selectedAppointment, ...patch }); } catch { }
      }
      notify.success('Meeting extended', `New end time: ${newEndTime}`);
      setExtendOpen(false);
      setConflictModalOpen(false);
      setPendingExtension(null);
    } catch (e: any) { notify.error('Failed to extend', e.message); }
    finally { setActionLoading(''); }
  };

  const applyAutoMove = async () => {
    if (!selectedAppointment || !pendingExtension) return;
    setActionLoading('automove');
    try {
      const newDuration = (Number(selectedAppointment.meeting_duration) || 60) + pendingExtension.extraMinutes;
      const extPatch = { meeting_end_time: pendingExtension.newEndTime, meeting_duration: newDuration, status: 'in_progress' };
      await patchMeeting(selectedAppointment.id_main, extPatch);
      updateLocal(selectedAppointment.id_main, extPatch);
      if (calendarConnectionStatus === 'connected' && selectedAppointment.google_event_id) {
        try { await updateCalendarEvent({ ...selectedAppointment, ...extPatch }); } catch { }
      }
      for (const { meeting, newStart, newEnd } of cascadeProposal) {
        const dur = meeting.meeting_duration
          ? Number(meeting.meeting_duration)
          : timeToMins(meeting.meeting_end_time) - timeToMins(meeting.meeting_start_time);
        const movePatch = { meeting_start_time: newStart, meeting_end_time: newEnd, meeting_duration: dur, status: 'rescheduled' };
        await patchMeeting(meeting.id_main, movePatch);
        updateLocal(meeting.id_main, movePatch);
        if (calendarConnectionStatus === 'connected' && meeting.google_event_id) {
          try { await updateCalendarEvent({ ...meeting, ...movePatch }); } catch { }
        }
      }
      notify.success('Done', `Meeting extended; ${cascadeProposal.length} meeting(s) moved forward`);
      setConflictModalOpen(false);
      setPendingExtension(null);
    } catch (e: any) { notify.error('Failed', e.message); }
    finally { setActionLoading(''); }
  };

  const handleSyncToCalendar = async () => {
    if (!selectedAppointment) return;
    setActionLoading('sync');
    try { await syncMeeting(selectedAppointment); notify.success('Synced to Google Calendar'); }
    catch (e: any) { notify.error('Sync failed', e.message); }
    finally { setActionLoading(''); }
  };

  const handleUnsync = async () => {
    if (!selectedAppointment) return;
    setActionLoading('unsync');
    try { await unsyncMeeting(selectedAppointment); notify.success('Removed from Google Calendar'); }
    catch (e: any) { notify.error('Unsync failed', e.message); }
    finally { setActionLoading(''); }
  };

  const handleSyncRow = async (meeting: any, e: React.MouseEvent) => {
    e.stopPropagation();
    if (calendarConnectionStatus !== 'connected') { notify.error('Calendar not connected'); return; }
    setSyncingRow(meeting.id_main);
    try {
      if (meeting.google_event_id) { await unsyncMeeting(meeting); notify.success('Removed from Google Calendar'); }
      else { await syncMeeting(meeting); notify.success('Synced to Google Calendar'); }
    } catch (e: any) { notify.error('Calendar action failed', e.message); }
    finally { setSyncingRow(null); }
  };

  const handleDeletePermanently = async () => {
    if (!selectedAppointment) return;
    setActionLoading('delete');
    try {
      if (selectedAppointment.google_event_id) {
        try { await fetch(`/api/auto-sync-calendar?id=${selectedAppointment.id_main}`, { method: 'DELETE' }); } catch { }
      }
      await fetch(`/api/meetings/${selectedAppointment.id_main}`, { method: 'DELETE' });
      setAppointments(prev => prev.filter(a => a.id_main !== selectedAppointment.id_main));
      setSelectedAppointment(null); setDeleteOpen(false);
      notify.success('Meeting deleted permanently');
    } catch (e: any) { notify.error('Delete failed', e.message); }
    finally { setActionLoading(''); }
  };

  const handleReschedule = async () => {
    if (!selectedAppointment) return;
    setRescheduleConflict('');
    setActionLoading('reschedule');
    try {
      const duration = parseInt(rescheduleData.meeting_duration) || 60;
      const travel = parseInt(rescheduleData.venue_distance) || 0;
      const endTime = addMinutesToTime(rescheduleData.meeting_start_time, duration);
      const slotStart = calcSlot(rescheduleData.meeting_start_time, -travel);
      const slotEnd = calcSlot(endTime, travel);
      if (rescheduleData.meeting_date && rescheduleData.meeting_start_time) {
        const conflictRes = await fetch(`/api/meetings?date=${rescheduleData.meeting_date}`);
        if (conflictRes.ok) {
          const existing: any[] = await conflictRes.json();
          const nsStart = timeToMins(slotStart || rescheduleData.meeting_start_time);
          const nsEnd = timeToMins(slotEnd || endTime);
          for (const m of existing) {
            if (m.id_main === selectedAppointment.id_main) continue;
            if (['canceled', 'cancelled', 'completed'].includes(m.status)) continue;
            const esStart = timeToMins(m.meeting_slot_start_time || m.meeting_start_time);
            const esEnd = timeToMins(m.meeting_slot_end_time || m.meeting_end_time);
            if (nsStart < esEnd && esStart < nsEnd) {
              setRescheduleConflict(`Conflicts with ${m.client_name} (${m.meeting_start_time}–${m.meeting_end_time})`);
              setActionLoading(''); return;
            }
          }
        }
      }
      const patch = {
        status: 'rescheduled', meeting_date: rescheduleData.meeting_date,
        meeting_start_time: rescheduleData.meeting_start_time, meeting_end_time: endTime,
        meeting_duration: duration, meeting_slot_start_time: slotStart, meeting_slot_end_time: slotEnd,
        venue_distance: travel, meeting_type: rescheduleData.meeting_type,
        meeting_venue_area: rescheduleData.meeting_venue_area, meeting_agenda: rescheduleData.meeting_agenda,
      };
      await patchMeeting(selectedAppointment.id_main, patch);
      updateLocal(selectedAppointment.id_main, patch);
      if (calendarConnectionStatus === 'connected') {
        const updatedMeeting = { ...selectedAppointment, ...patch };
        try {
          if (selectedAppointment.google_event_id) await updateCalendarEvent(updatedMeeting);
          else await syncMeeting(updatedMeeting);
        } catch { }
      }
      setRescheduleOpen(false);
      notify.success('Meeting rescheduled', calendarConnectionStatus === 'connected' ? 'Calendar updated automatically.' : '');
    } catch (e: any) { notify.error('Reschedule failed', e.message); }
    finally { setActionLoading(''); }
  };

  // Updated handleEdit uses EditDetailsForm data shape
  const handleEdit = async (editData: any) => {
    if (!selectedAppointment) return;
    setActionLoading('edit');
    try {
      const duration = parseInt(editData.meeting_duration) || 60;
      const endTime = editData.meeting_start_time ? addMinutesToTime(editData.meeting_start_time, duration) : selectedAppointment.meeting_end_time;
      const patch = { ...editData, meeting_end_time: endTime, meeting_duration: duration };
      await patchMeeting(selectedAppointment.id_main, patch);
      updateLocal(selectedAppointment.id_main, patch);
      setEditOpen(false);
      notify.success('Meeting updated');
    } catch (e: any) { notify.error('Update failed', e.message); }
    finally { setActionLoading(''); }
  };

  const openReschedule = () => {
    if (!selectedAppointment) return;
    setRescheduleConflict('');
    const travel = String(selectedAppointment.venue_distance ?? 10);
    const start = selectedAppointment.meeting_start_time || '';
    const dur = String(selectedAppointment.meeting_duration || 60);
    const end = start ? addMinutesToTime(start, parseInt(dur)) : '';
    setRescheduleData({
      meeting_date: selectedAppointment.meeting_date || '', meeting_start_time: start,
      meeting_duration: dur, meeting_end_time: end,
      meeting_slot_start_time: selectedAppointment.meeting_slot_start_time || '',
      meeting_slot_end_time: selectedAppointment.meeting_slot_end_time || '',
      venue_distance: travel, meeting_type: selectedAppointment.meeting_type || 'inPerson',
      meeting_venue_area: selectedAppointment.meeting_venue_area || '',
      meeting_agenda: selectedAppointment.meeting_agenda || '',
    });
    setRescheduleOpen(true);
  };

  const handleRschdStartTime = (val: string) => {
    const dur = parseInt(rescheduleData.meeting_duration) || 60;
    const travel = parseInt(rescheduleData.venue_distance) || 0;
    const end = addMinutesToTime(val, dur);
    setRescheduleData(p => ({ ...p, meeting_start_time: val, meeting_end_time: end, meeting_slot_start_time: calcSlot(val, -travel), meeting_slot_end_time: calcSlot(end, travel) }));
    setRescheduleConflict('');
  };
  const handleRschdDuration = (val: string) => {
    const dur = parseInt(val) || 60;
    const travel = parseInt(rescheduleData.venue_distance) || 0;
    const end = addMinutesToTime(rescheduleData.meeting_start_time, dur);
    setRescheduleData(p => ({ ...p, meeting_duration: val, meeting_end_time: end, meeting_slot_end_time: calcSlot(end, travel) }));
    setRescheduleConflict('');
  };
  const handleRschdTravel = (val: string) => {
    const travel = parseInt(val) || 0;
    setRescheduleData(p => ({ ...p, venue_distance: val, meeting_slot_start_time: calcSlot(p.meeting_start_time, -travel), meeting_slot_end_time: calcSlot(p.meeting_end_time, travel) }));
  };

  const filteredList = useMemo(() => {
    let list = contentType === 'events' ? allEvents : appointments;
    if (contentType === 'all') {
      const mtg = appointments.map(a => ({ ...a, _kind: 'meeting' }));
      const evs = allEvents.map(e => ({ ...e, _kind: 'event' }));
      list = [...mtg, ...evs];
    }
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      list = list.filter(item => (item.client_name || item.event_name)?.toLowerCase().includes(q) || (item.client_company || item.organizer_name)?.toLowerCase().includes(q));
    }
    const todayStr = getTodayLocalDateString();
    switch (activeTab) {
      case 'today': return list.filter(a => (a.meeting_date || a.event_date) === todayStr);
      case 'pending': return list.filter(a => ['pending', 'pending_confirmation', 'draft'].includes(a.status || ''));
      case 'completed': return list.filter(a => a.status === 'completed');
      case 'canceled': return list.filter(a => a.status === 'canceled' || a.status === 'cancelled');
      default: return list.filter(a => !TERMINAL_STATUSES.has((a.status || 'upcoming').toLowerCase()));
    }
  }, [appointments, allEvents, contentType, activeTab, searchQuery]);

  const sortedList = useMemo(() => {
    const list = [...filteredList];
    const byDateTime = (a: any, b: any, dir: 1 | -1 = 1) => {
      const da = a.meeting_date || a.event_date || '';
      const db = b.meeting_date || b.event_date || '';
      if (da !== db) return da.localeCompare(db) * dir;
      const ta = a.meeting_start_time || a.event_start_time || '';
      const tb = b.meeting_start_time || b.event_start_time || '';
      return ta.localeCompare(tb) * dir;
    };
    switch (activeTab) {
      case 'today':
        return list.sort((a, b) => {
          const ra = todayGroup(a, now).rank;
          const rb = todayGroup(b, now).rank;
          if (ra !== rb) return ra - rb;
          const ta = a.meeting_start_time || a.event_start_time || '';
          const tb = b.meeting_start_time || b.event_start_time || '';
          return ta.localeCompare(tb);
        });
      case 'upcoming': return list.sort((a, b) => byDateTime(a, b, 1));
      case 'pending':
        return list.sort((a, b) => {
          const da = a.booking_date || a.meeting_date || a.event_date || '';
          const db = b.booking_date || b.meeting_date || b.event_date || '';
          return da.localeCompare(db);
        });
      case 'completed': case 'canceled': return list.sort((a, b) => byDateTime(a, b, -1));
      default: return list.sort((a, b) => byDateTime(a, b, 1));
    }
  }, [filteredList, activeTab, now]);

  const paginated = sortedList.slice(currentPage * itemsPerPage, (currentPage + 1) * itemsPerPage);
  const totalPages = Math.ceil(sortedList.length / itemsPerPage);
  const selectedAttendees = useMemo(() => getAttendeeDetails(selectedAppointment, bclUsersById), [selectedAppointment, bclUsersById]);

  if (loading) return (
    <div className="flex items-center justify-center min-h-[80vh]">
      <Loader2 className="animate-spin text-[#0057E7]" size={40} />
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-50 px-6 py-5 font-sans">
      <Toaster />

      {/* HEADER */}
      <div className="mb-7 flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="text-2xl font-bold text-slate-900">Most Recent Opportunities</div>
          <div className="mt-1 text-[13px] text-slate-500">Track and manage your client meetings and corporate events</div>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex gap-0.5 rounded-lg bg-slate-100 p-1">
            <button className={cn("rounded-md px-4 py-2 text-[13px] font-semibold text-slate-500 transition-colors hover:text-slate-900", contentType === 'meetings' && "bg-white text-blue-600 shadow-sm")} onClick={() => setContentType('meetings')}>Meetings</button>
            <button className={cn("rounded-md px-4 py-2 text-[13px] font-semibold text-slate-500 transition-colors hover:text-slate-900", contentType === 'events' && "bg-white text-blue-600 shadow-sm")} onClick={() => setContentType('events')}>Events</button>
            <button className={cn("rounded-md px-4 py-2 text-[13px] font-semibold text-slate-500 transition-colors hover:text-slate-900", contentType === 'all' && "bg-white text-blue-600 shadow-sm")} onClick={() => setContentType('all')}>All Hub</button>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-500">
              <span className={cn("h-2 w-2 flex-shrink-0 rounded-full", calendarConnectionStatus === 'connected' ? "bg-green-500 shadow-[0_0_0_3px_rgba(34,197,94,.2)]" : calendarConnectionStatus === 'checking' ? "bg-slate-400" : "bg-red-500 shadow-[0_0_0_3px_rgba(239,68,68,.2)]")} />
              {calendarConnectionStatus === 'checking' ? 'Checking…' : `Calendar ${calendarConnectionStatus}`}
            </div>
            {calendarConnectionStatus === 'connected' && (
              <Button variant="outline" size="sm" className="h-8 text-xs text-red-500 border-red-200 hover:bg-red-50" onClick={async () => { try { await fetch('/api/auth/google/disconnect', { method: 'POST' }); setCalendarConnectionStatus('disconnected'); } catch { } }}>Disconnect</Button>
            )}
            {calendarConnectionStatus === 'disconnected' && (
              <Button variant="outline" size="sm" className="h-8 text-xs text-blue-600 border-blue-200 hover:bg-blue-50" onClick={() => { window.location.href = '/api/auth/google'; }}>Connect Calendar</Button>
            )}
          </div>
          <div>
            <Button className="h-9 text-xs bg-blue-600 hover:bg-blue-700 text-white gap-2 px-4 shadow-sm shadow-blue-100" onClick={() => setScheduleOpen(true)}>
              <PlusCircle size={15} /><span>Create New Meeting</span>
            </Button>
            <ScheduleDialog open={scheduleOpen} onOpenChange={setScheduleOpen} />
          </div>
        </div>
      </div>

      {/* PANEL */}
      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-3">
          <div className="flex gap-1 rounded-lg bg-slate-100 p-1">
            {['upcoming', 'today', 'pending', 'completed', 'canceled'].map(tab => (
              <button key={tab} className={cn("rounded-md px-4 py-1.5 text-xs font-semibold capitalize text-slate-500 transition-colors hover:text-slate-900", activeTab === tab && "bg-white text-blue-600 shadow-sm")} onClick={() => setActiveTab(tab)}>{tab}</button>
            ))}
          </div>
          <div className="flex items-center gap-4">
            <div className="relative w-[300px]">
              <Search size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <Input className="h-9 rounded-full border-slate-200 bg-white pl-9 text-[13px] focus-visible:ring-blue-100" placeholder="Search clients..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} />
            </div>
            <div className="flex bg-slate-100 p-1 rounded-lg">
              <Button variant="ghost" size="sm" className={cn("h-7 px-2", viewMode === 'table' && "bg-white shadow-sm")} onClick={() => setViewMode('table')}><Table2 size={14} /></Button>
              <Button variant="ghost" size="sm" className={cn("h-7 px-2", viewMode === 'cards' && "bg-white shadow-sm")} onClick={() => setViewMode('cards')}><LayoutGrid size={14} /></Button>
            </div>
          </div>
        </div>

        {viewMode === 'table' ? (
          <div className="overflow-x-auto p-4 border">
            <Table className='border rounded-2xl overflow-hidden'>
              <TableHeader className='bg-slate-50 border'>
                <TableRow className="hover:bg-transparent border-0">
                  <TableHead className="w-[44px] border-r">#</TableHead>
                  <TableHead className="border-r">
                    <div className="flex items-center justify-between">
                      <span>Client Name</span>
                      <span className="text-[9px] font-normal text-slate-400 italic hidden sm:inline">
                        {activeTab === 'today' ? 'by urgency' : activeTab === 'pending' ? 'oldest first' : activeTab === 'completed' || activeTab === 'canceled' ? 'newest first' : 'earliest first'}
                      </span>
                    </div>
                  </TableHead>
                  <TableHead className="border-r">Category</TableHead>
                  <TableHead className="border-r">Date</TableHead>
                  <TableHead className="border-r">Start</TableHead>
                  <TableHead className="border-r">End</TableHead>
                  <TableHead className="border-r">Duration</TableHead>
                  <TableHead className="border-r">BCL Attendee</TableHead>
                  <TableHead className="border-r">Status</TableHead>
                  <TableHead className="border-r">Synced</TableHead>
                  <TableHead className="text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginated.map((row, index) => {
                  const isMtg = row._kind !== 'event' && !row.event_name;
                  const name = isMtg ? (getAttendeeDetails(row, bclUsersById)[0]?.name || '—') : row.organizer_name;
                  const isSyncing = syncingRow === (row.id_main || row.id);
                  const rowStatus = isMtg ? effectiveStatus(row, now) : (row.status || 'upcoming');
                  const isOverdue = rowStatus === 'overdue';

                  const group = activeTab === 'today' ? todayGroup(row, now) : null;
                  const prevGroup = activeTab === 'today' && index > 0 ? todayGroup(paginated[index - 1], now) : null;
                  const showGroupHeader = group && (index === 0 || group.rank !== prevGroup?.rank);

                  const sectionColors: Record<number, string> = {
                    0: 'bg-red-50 text-red-700 border-red-100',
                    1: 'bg-amber-50 text-amber-700 border-amber-100',
                    2: 'bg-slate-50 text-slate-500 border-slate-100',
                  };

                  // Duration display
                  const durMins = row.meeting_duration || row.event_duration;
                  const durLabel = durMins
                    ? durMins >= 60
                      ? `${Math.floor(durMins / 60)}h${durMins % 60 ? ` ${durMins % 60}m` : ''}`
                      : `${durMins}m`
                    : '—';

                  return (
                    <React.Fragment key={row.id_main || row.id}>
                      {showGroupHeader && (
                        <TableRow className="hover:bg-transparent pointer-events-none">
                          <TableCell colSpan={11} className={cn("py-2 px-5 border-y", sectionColors[group.rank])}>
                            <span className="text-[10px] font-extrabold uppercase tracking-widest">{group.emoji} {group.label}</span>
                          </TableCell>
                        </TableRow>
                      )}
                      <TableRow className={cn("cursor-pointer", isOverdue && "bg-yellow-50/60 hover:bg-yellow-50")} onClick={() => isMtg ? setSelectedAppointment(row) : null}>
                        <TableCell className="font-medium text-slate-500 border-r text-center">{index + 1}</TableCell>
                        <TableCell className="border-r">
                          <div className="flex items-center gap-3">
                            <div className={cn("flex h-8 w-8 items-center justify-center rounded-full flex-shrink-0", row.meeting_type === 'virtual' ? "bg-blue-50 text-blue-600" : "bg-orange-50 text-orange-600")}>
                              {row.meeting_type === 'virtual' ? <Video size={16} /> : <MapPin size={16} />}
                            </div>
                            <div>
                              <div className="font-semibold text-sm text-slate-900">{row.client_name || row.event_name}</div>
                              <div className="text-xs text-slate-500">{row.client_company || row.event_type}</div>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="border-r text-xs font-medium text-slate-600">{isMtg ? 'Client Meeting' : 'Corporate Event'}</TableCell>
                        <TableCell className="border-r text-sm text-slate-600">
                          {formatDate(row.meeting_date || row.event_date, { day: '2-digit', month: '2-digit', year: 'numeric' })}
                        </TableCell>
                        {/* Start time */}
                        <TableCell className="border-r">
                          <span className="font-bold text-[#0057E7] text-xs tabular-nums">{formatTime(row.meeting_start_time || row.event_start_time)}</span>
                        </TableCell>
                        {/* End time — NEW */}
                        <TableCell className="border-r">
                          <span className="font-semibold text-slate-600 text-xs tabular-nums">{formatTime(row.meeting_end_time || row.event_end_time) || <span className="text-slate-300">—</span>}</span>
                        </TableCell>
                        {/* Duration — NEW */}
                        <TableCell className="border-r">
                          <span className="inline-flex items-center gap-1 text-xs font-bold text-slate-600 bg-slate-100 px-2 py-0.5 rounded-full">
                            <Clock3 size={10} className="text-slate-400" />{durLabel}
                          </span>
                        </TableCell>
                        <TableCell className="border-r">
                          <div className="flex items-center gap-2">
                            <Avatar className="h-7 w-7 rounded">
                              <AvatarFallback className="bg-slate-100 text-[10px] font-bold text-slate-500 rounded">{initials(name)}</AvatarFallback>
                            </Avatar>
                            <span className="text-xs text-slate-600">{name}</span>
                          </div>
                        </TableCell>
                        <TableCell className="border-r">
                          <div className="flex items-center gap-1.5">
                            <StatusPill status={rowStatus} />
                            {isOverdue && <AlarmClock size={12} className="text-yellow-600 flex-shrink-0" />}
                          </div>
                        </TableCell>
                        <TableCell className="border-r" onClick={e => e.stopPropagation()}>
                          <div className="flex items-center gap-2">
                            <SyncBadge synced={!!row.google_event_id} />
                            {isMtg && calendarConnectionStatus === 'connected' && (
                              <button className={cn("inline-flex items-center gap-1 rounded border px-2 py-0.5 text-[10px] font-bold transition-colors disabled:opacity-60", row.google_event_id ? "border-red-200 text-red-600 hover:bg-red-50" : "border-blue-200 text-blue-600 hover:bg-blue-50")} onClick={e => handleSyncRow(row, e)} disabled={isSyncing}>
                                {isSyncing ? <Loader2 size={9} className="animate-spin" /> : row.google_event_id ? <CloudOff size={9} /> : <Cloud size={9} />}
                                {isSyncing ? '…' : row.google_event_id ? 'Unsync' : 'Sync'}
                              </button>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full"><MoreHorizontal size={14} /></Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => setSelectedAppointment(row)}>View Details</DropdownMenuItem>
                              {isMtg && <DropdownMenuItem onClick={(e) => { e.stopPropagation(); setSelectedAppointment(row); setTimeout(() => setEditOpen(true), 50); }}>Edit</DropdownMenuItem>}
                              {isMtg && <DropdownMenuItem onClick={(e) => { e.stopPropagation(); setSelectedAppointment(row); setTimeout(openReschedule, 50); }}>Reschedule</DropdownMenuItem>}
                              <DropdownMenuItem className="text-red-600" onClick={(e) => { e.stopPropagation(); setSelectedAppointment(row); setTimeout(handleCancel, 50); }}>Cancel</DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    </React.Fragment>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 p-6 bg-slate-50/50">
            {paginated.map(row => (
              <AppointmentCard key={row.id_main} appointment={row} usersById={bclUsersById} onClick={() => setSelectedAppointment(row)} />
            ))}
          </div>
        )}

        <div className="flex items-center justify-between px-6 py-4 border-t border-slate-100">
          <div className="text-xs text-slate-500 font-medium">
            Showing <span className="text-slate-900 font-bold">{currentPage * itemsPerPage + 1}</span> to <span className="text-slate-900 font-bold">{Math.min((currentPage + 1) * itemsPerPage, sortedList.length)}</span> of {sortedList.length}
          </div>
          <div className="flex gap-1">
            <Button variant="outline" size="sm" className="h-8 w-8 p-0" onClick={() => setCurrentPage(p => p - 1)} disabled={currentPage === 0}><ChevronLeft size={14} /></Button>
            <Button variant="outline" size="sm" className="h-8 px-3 text-xs font-bold bg-[#0057E7] text-white border-none">{currentPage + 1}</Button>
            <Button variant="outline" size="sm" className="h-8 w-8 p-0" onClick={() => setCurrentPage(p => p + 1)} disabled={currentPage >= totalPages - 1}><ChevronRight size={14} /></Button>
          </div>
        </div>
      </div>

      <DashboardDialogs
        selectedAppointment={selectedAppointment}
        setSelectedAppointment={setSelectedAppointment}
        now={now}
        selectedAttendees={selectedAttendees}
        isEditOpen={isEditOpen}
        setEditOpen={setEditOpen}
        actionLoading={actionLoading}
        handleEdit={handleEdit}
        handleEndMeeting={handleEndMeeting}
        handleExtend={handleExtend}
        setExtendOpen={setExtendOpen}
        openReschedule={openReschedule}
        handleConfirm={handleConfirm}
        handleMarkDone={handleMarkDone}
        handleCancel={handleCancel}
        calendarConnectionStatus={calendarConnectionStatus}
        handleUnsync={handleUnsync}
        handleSyncToCalendar={handleSyncToCalendar}
        setDeleteOpen={setDeleteOpen}
        isRescheduleOpen={isRescheduleOpen}
        setRescheduleOpen={setRescheduleOpen}
        setRescheduleConflict={setRescheduleConflict}
        rescheduleData={rescheduleData}
        setRescheduleData={setRescheduleData}
        handleRschdStartTime={handleRschdStartTime}
        handleRschdDuration={handleRschdDuration}
        handleRschdTravel={handleRschdTravel}
        rescheduleConflict={rescheduleConflict}
        handleReschedule={handleReschedule}
        extendOpen={extendOpen}
        setPendingExtension={setPendingExtension}
        customExtendMins={customExtendMins}
        setCustomExtendMins={setCustomExtendMins}
        conflictModalOpen={conflictModalOpen}
        setConflictModalOpen={setConflictModalOpen}
        conflictingMeetings={conflictingMeetings}
        cascadeProposal={cascadeProposal}
        pendingExtension={pendingExtension}
        applyAutoMove={applyAutoMove}
        isDeleteOpen={isDeleteOpen}
        handleDeletePermanently={handleDeletePermanently}
      />
    </div>
  );
};

const Dashboard = () => (
  <React.Suspense fallback={<div className="flex h-screen items-center justify-center"><Loader2 className="animate-spin text-[#0057E7]" /></div>}>
    <DashboardContent />
  </React.Suspense>
);

export default Dashboard;