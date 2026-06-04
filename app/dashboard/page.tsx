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
import {
  Calendar, Clock, Building, MapPin, CheckCircle, XCircle, Table2, LayoutGrid,
  Video, Trash2, Loader2, CloudOff, Cloud, ChevronLeft, ChevronRight, Search,
  MoreHorizontal, Plus, Download, Hash, Globe, CheckCircle2, CalendarClock,
  Edit2, Ban, UserCheck, AlertCircle, PartyPopper, Users,
  ClipboardList,
  Zap,
  LinkIcon,
  ArrowRight,
  ChevronUp, ChevronDown, ChevronsUpDown,
} from 'lucide-react';
import { getStatusColors, getBadgeStatusColor } from '@/utils/statusColors';
import { sortItems, SortConfig, MEETING_STATUS_COLORS } from '@/utils/appointmentStyles';
import { formatTime } from './format';
import { cn } from '@/lib/utils';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';

// ── REFINED DATIDIAN DESIGN SYSTEM ──────────────────────────────────
const DashboardStyles = () => (
  <style>{`
    .db-shell {
      font-family: 'Inter', sans-serif;
      background: #F8FAFC;
      min-height: 100vh;
      padding: 20px 24px;
    }

    /* ── HEADER ── */
    .db-header { margin-bottom: 28px; display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 16px; }
    .db-title { font-size: 24px; font-weight: 700; color: #0F172A; letter-spacing: -0.02em; }
    .db-subtitle { font-size: 13px; color: #64748B; margin-top: 4px; }

    /* ── BRAND BUTTONS ── */
    .db-btn-primary {
      display: inline-flex; align-items: center; gap: 8px;
      padding: 10px 20px; font-size: 13px; font-weight: 600;
      border-radius: 8px; border: none;
      background: #0057E7; color: white; cursor: pointer;
      box-shadow: 0 4px 12px rgba(0, 87, 231, 0.2);
      transition: all 0.2s ease;
    }
    .db-btn-primary:hover { background: #004bc7; transform: translateY(-1px); box-shadow: 0 6px 16px rgba(0, 87, 231, 0.3); }

    .db-btn-outline {
      display: inline-flex; align-items: center; gap: 8px;
      padding: 9px 18px; font-size: 13px; font-weight: 600;
      border-radius: 8px; border: 1px solid #E2E8F0;
      background: white; color: #475569;
      cursor: pointer; transition: all 0.2s ease;
    }
    .db-btn-outline:hover { background: #F8FAFC; border-color: #CBD5E1; color: #0F172A; }

    /* ── MAIN CONTAINER ── */
    .db-panel {
      background: #ffffff; border-radius: 12px;
      border: 1px solid #E2E8F0; overflow: hidden;
      box-shadow: 0 4px 20px rgba(0, 0, 0, 0.03);
    }

    /* ── SEGMENTED TABS (Matches "Sales Hub" style) ── */
    .db-toolbar {
      display: flex; align-items: center; justify-content: space-between;
      border-bottom: 1px solid #F1F5F9;
      padding: 12px 20px;
    }
    .db-tabs { display: flex; gap: 4px; background: #F1F5F9; padding: 4px; border-radius: 8px; }
    .db-tab {
      padding: 6px 16px; font-size: 12px; font-weight: 600;
      border-radius: 6px; border: none;
      background: transparent; color: #64748B; cursor: pointer;
      transition: all 0.2s ease; text-transform: capitalize;
    }
    .db-tab:hover { color: #0F172A; }
    .db-tab.active {
      background: white; color: #0057E7;
      box-shadow: 0 2px 6px rgba(0,0,0,0.05);
    }

    /* ── SEARCH ── */
    .db-search-wrap { position: relative; width: 300px; }
    .db-search-icon { position: absolute; left: 12px; top: 50%; transform: translateY(-50%); color: #94A3B8; pointer-events: none; }
    .db-search {
      width: 100%; height: 38px; padding: 0 12px 0 38px;
      font-size: 13px; border: 1px solid #E2E8F0; border-radius: 20px;
      background: #FFFFFF; color: #0F172A; transition: all 0.2s ease;
    }
    .db-search:focus { border-color: #0057E7; ring: 2px #0057E7/10; }

    /* ── TABLE ZEBRA ROWS ── */
    .db-table-zebra tbody tr:nth-child(even) td { background: #f8fafc; }
    .db-table-zebra tbody tr:hover td { background: #f0f4ff !important; }

    /* ── DIALOGS ── */
    .db-dialog { border-radius: 16px !important; border: none !important; box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25) !important; }
    .db-dialog-header { padding: 24px; border-bottom: 1px solid #F1F5F9; background: #061D43; color: white; }
    .db-dialog-name { font-size: 22px; font-weight: 700; color: white; }
    .db-dialog-company { color: #94A3B8; font-size: 14px; margin-top: 4px; display: flex; align-items: center; gap: 6px; }

    /* ── CONTENT SWITCHER (Top) ── */
    .db-content-switcher { display: flex; background: #F1F5F9; padding: 4px; border-radius: 10px; gap: 2px; }
    .db-content-btn { 
        padding: 8px 16px; font-size: 13px; font-weight: 600; color: #64748B; 
        border-radius: 8px; border: none; background: transparent; transition: all 0.2s;
    }
    .db-content-btn.active { background: #FFFFFF; color: #0057E7; shadow: 0 1px 3px rgba(0,0,0,0.1); }
  `}</style>
);

// ── HELPERS ──────────────────────────────────────────────────────
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
    try {
      const parsed = JSON.parse(value);
      return Array.isArray(parsed) ? parsed.filter(Boolean) : [];
    } catch { return []; }
  }
  return [];
}

function buildUserMap(users: any[]): Record<string, any> {
  return Object.fromEntries((users || []).map((u) => [String(u.id), u]));
}

function getAttendeeDetails(appointment: any, usersById: Record<string, any> = {}) {
  const info = parseAttendeeInfo(appointment?.bcl_attendees_info);
  const ids = [
    ...info.map((a) => a.id).filter(Boolean),
    ...parseBclAttendees(appointment?.bcl_attendee),
  ].map(String);
  const uniqueIds = Array.from(new Set(ids));
  const details = uniqueIds.map((id) => {
    const user = usersById[id];
    const fallback = info.find((a) => String(a.id) === id);
    return {
      id,
      name: user?.displayName || user?.name || fallback?.name || appointment?.bcl_attendee_name || id,
      email: user?.email || fallback?.email || null,
      username: user?.username || fallback?.username || null,
    };
  });

  if (details.length) return details;
  if (appointment?.bcl_attendee_name) return [{ id: '', name: appointment.bcl_attendee_name }];
  return [];
}

function parseLocalDate(dateStr?: string) {
  if (!dateStr) return null;
  if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
    const [year, month, day] = dateStr.split('-').map(Number);
    return new Date(year, month - 1, day);
  }
  const date = new Date(dateStr);
  return Number.isNaN(date.getTime()) ? null : date;
}

function parseLocalDateTime(dateStr?: string, timeStr?: string) {
  const date = parseLocalDate(dateStr);
  if (!date) return null;
  const [hours = 0, minutes = 0] = (timeStr || '00:00').split(':').map(Number);
  date.setHours(hours || 0, minutes || 0, 0, 0);
  return date;
}

function formatDate(dateStr?: string, options?: Intl.DateTimeFormatOptions, fallback = '—') {
  const date = parseLocalDate(dateStr);
  return date ? date.toLocaleDateString('en-GB', options) : fallback;
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
const initials = (n: string) => n?.split(' ').map(c => c[0]).join('').slice(0, 2).toUpperCase() ?? '??';

function StatusPill({ status }: { status?: string }) {
  const s = (status ?? 'upcoming').toLowerCase();
  const col = MEETING_STATUS_COLORS[s] ?? { hex: '#8ca4a8', bg: 'rgba(140,164,168,0.12)', text: '#64868c' };
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center',
      padding: '3px 9px', borderRadius: 5,
      fontSize: 10, fontWeight: 700, letterSpacing: '0.04em',
      textTransform: 'capitalize',
      background: col.bg, color: col.text,
      border: `1px solid ${col.hex}40`,
    }}>
      {status ?? 'upcoming'}
    </span>
  );
}

// ── APPOINTMENT CARD (Refined) ───────────────────────────────────
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
        <Hash size={14} className="text-slate-300" />
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
          <div className="w-6 h-6 rounded-full bg-slate-100 flex items-center justify-center text-[10px] font-bold text-slate-600 border border-slate-200">
            {initials(attendeeName)}
          </div>
          <span className="text-[11px] font-medium text-slate-600 truncate max-w-[100px]">{attendeeName}</span>
        </div>
        {appointment.meeting_type === 'virtual' ? <Video size={14} className="text-indigo-500" /> : <MapPin size={14} className="text-sky-500" />}
      </div>
    </div>
  );
};

function DateTile({ dateStr, dim = false }: { dateStr?: string; dim?: boolean }) {
  if (!dateStr) return null;
  const d = parseLocalDate(dateStr);
  if (!d) return null;

  return (
    <div className="flex flex-col items-center justify-center rounded-lg flex-shrink-0"
      style={{ width: 36, height: 36, background: dim ? '#94a3b8' : '#0057E7' }}>
      <span className="text-[14px] font-black text-white leading-none">{d.getDate()}</span>
      <span className="text-[8px] font-bold text-white/70 tracking-wide uppercase">
        {d.toLocaleDateString('en', { month: 'short' })}
      </span>
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
  const [activeTab, setActiveTab] = useState(statusParam ?? 'upcoming');
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

  // States for actions
  const [actionLoading, setActionLoading] = useState('');
  const [isDeleteOpen, setDeleteOpen] = useState(false);
  const [isRescheduleOpen, setRescheduleOpen] = useState(false);
  const [isEditOpen, setEditOpen] = useState(false);
  const [rescheduleData, setRescheduleData] = useState({ meeting_date: '', meeting_start_time: '', meeting_duration: '60' });
  const [editData, setEditData] = useState({ client_name: '', client_company: '', client_mobile: '', meeting_date: '', meeting_start_time: '', meeting_duration: '60', meeting_type: 'inPerson', meeting_venue_area: '', meeting_agenda: '' });

  const [sortConfig, setSortConfig] = useState<SortConfig | null>(null);

  const toggleSort = (key: string) => {
    setSortConfig(prev =>
      prev?.key === key
        ? { key, dir: prev.dir === 'asc' ? 'desc' : 'asc' }
        : { key, dir: 'asc' }
    );
  };

  const SortIcon = ({ colKey }: { colKey: string }) => {
    if (sortConfig?.key !== colKey) return <ChevronsUpDown size={10} className="ml-1 opacity-30 inline" />;
    return sortConfig.dir === 'asc'
      ? <ChevronUp size={10} className="ml-1 text-blue-600 inline" />
      : <ChevronDown size={10} className="ml-1 text-blue-600 inline" />;
  };

  const notify = {
    success: (title: string, desc?: string) => toast({ title, description: desc }),
    error: (title: string, desc?: string) => toast({ variant: 'destructive', title, description: desc }),
  };

  useEffect(() => { if (statusParam) setActiveTab(statusParam); }, [statusParam]);

  useEffect(() => {
    const init = async () => {
      setLoading(true);
      try {
        const [userRes, meetingsRes, eventsRes, calRes, bclUsersRes] = await Promise.all([
          fetch('/api/users/me'),
          fetch('/api/meetings'),
          fetch('/api/events'),
          fetch('/api/auth/google/status'),
          fetch('/api/users/bcl-attendees'),
        ]);
        if (userRes.ok) {
          const me = await userRes.json();
          setCurrentUserId(me.id);
          setIsAdmin(ADMIN_ROLES.has((me.role ?? '').toLowerCase()));
        }
        if (meetingsRes.ok) {
          const data = await meetingsRes.json();
          setAppointments(Array.isArray(data) ? data : []);
        }
        if (eventsRes.ok) {
          const data = await eventsRes.json();
          setAllEvents(Array.isArray(data) ? data : []);
        }
        if (bclUsersRes.ok) {
          const data = await bclUsersRes.json();
          setBclUsersById(buildUserMap(Array.isArray(data) ? data : []));
        }
        const calStatus = await calRes.json();
        setCalendarConnectionStatus(calStatus.connected ? 'connected' : 'disconnected');
      } catch (err) { console.error(err); }
      finally { setLoading(false); }
    };
    init();
  }, []);

  const checkAppointmentStatus = (app: any) => {
    const now = new Date();
    const mtgDate = parseLocalDateTime(app.meeting_date, app.meeting_start_time);
    if (!mtgDate) return app;
    if (['upcoming', 'rescheduled'].includes(app.status) && now > mtgDate) return { ...app, status: 'pending' };
    return app;
  };

  const patchMeeting = useCallback(async (id: number, payload: object) => {
    const res = await fetch(`/api/meetings/${id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
    if (!res.ok) throw new Error((await res.json()).error || 'Request failed');
    return res.json();
  }, []);

  const updateLocal = useCallback((id: number, patch: object) => {
    setAppointments(prev => prev.map(a => a.id_main === id ? { ...a, ...patch } : a));
    setSelectedAppointment(prev => prev && prev.id_main === id ? { ...prev, ...patch } : prev);
  }, []);

  // Action Handlers

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

  const handleSyncToCalendar = async () => {
    if (!selectedAppointment) return;
    setActionLoading('sync');
    try {
      const res = await fetch('/api/sync-to-calendar', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(selectedAppointment) });
      if (!res.ok) throw new Error((await res.json()).error || 'Sync failed');
      notify.success('Synced to Google Calendar');
    } catch (e: any) { notify.error('Sync failed', e.message); }
    finally { setActionLoading(''); }
  };

  const handleDeletePermanently = async () => {
    if (!selectedAppointment) return;
    setActionLoading('delete');
    try {
      await fetch(`/api/meetings/${selectedAppointment.id_main}`, { method: 'DELETE' });
      setAppointments(prev => prev.filter(a => a.id_main !== selectedAppointment.id_main));
      setSelectedAppointment(null); setDeleteOpen(false);
      notify.success('Meeting deleted permanently');
    } catch (e: any) { notify.error('Delete failed', e.message); }
    finally { setActionLoading(''); }
  };

  const handleReschedule = async () => {
    if (!selectedAppointment) return;
    setActionLoading('reschedule');
    try {
      const duration = parseInt(rescheduleData.meeting_duration) || 60;
      const endTime = addMinutesToTime(rescheduleData.meeting_start_time, duration);
      const patch = { status: 'rescheduled', meeting_date: rescheduleData.meeting_date, meeting_start_time: rescheduleData.meeting_start_time, meeting_end_time: endTime, meeting_duration: duration };
      await patchMeeting(selectedAppointment.id_main, patch); updateLocal(selectedAppointment.id_main, patch);
      setRescheduleOpen(false); notify.success('Meeting rescheduled');
    } catch (e: any) { notify.error('Reschedule failed', e.message); }
    finally { setActionLoading(''); }
  };

  const handleEdit = async () => {
    if (!selectedAppointment) return;
    setActionLoading('edit');
    try {
      const duration = parseInt(editData.meeting_duration) || 60;
      const endTime = addMinutesToTime(editData.meeting_start_time, duration);
      const patch = { ...editData, meeting_end_time: endTime, meeting_duration: duration };
      await patchMeeting(selectedAppointment.id_main, patch); updateLocal(selectedAppointment.id_main, patch);
      setEditOpen(false); notify.success('Meeting updated');
    } catch (e: any) { notify.error('Update failed', e.message); }
    finally { setActionLoading(''); }
  };

  const openEdit = () => {
    if (!selectedAppointment) return;
    setEditData({ client_name: selectedAppointment.client_name || '', client_company: selectedAppointment.client_company || '', client_mobile: selectedAppointment.client_mobile || '', meeting_date: selectedAppointment.meeting_date || '', meeting_start_time: selectedAppointment.meeting_start_time || '', meeting_duration: String(selectedAppointment.meeting_duration || 60), meeting_type: selectedAppointment.meeting_type || 'inPerson', meeting_venue_area: selectedAppointment.meeting_venue_area || '', meeting_agenda: selectedAppointment.meeting_agenda || '' });
    setEditOpen(true);
  };

  const openReschedule = () => {
    if (!selectedAppointment) return;
    setRescheduleData({ meeting_date: selectedAppointment.meeting_date || '', meeting_start_time: selectedAppointment.meeting_start_time || '', meeting_duration: String(selectedAppointment.meeting_duration || 60) });
    setRescheduleOpen(true);
  };

  // Filtering logic
  const filteredList = useMemo(() => {
    let list = contentType === 'events' ? allEvents : appointments;
    if (contentType === 'all') {
      const mtg = appointments.map(a => ({ ...a, _kind: 'meeting' }));
      const evs = allEvents.map(e => ({ ...e, _kind: 'event' }));
      list = [...mtg, ...evs];
    }

    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      list = list.filter(item =>
        (item.client_name || item.event_name)?.toLowerCase().includes(q) ||
        (item.client_company || item.organizer_name)?.toLowerCase().includes(q) ||
        String(item.id_main || item.id).includes(q)
      );
    }

    const todayStr = getTodayLocalDateString();
    switch (activeTab) {
      case 'today': return list.filter(a => (a.meeting_date || a.event_date) === todayStr);
      case 'pending': return list.filter(a => a.status === 'pending' || a.status === 'upcoming');
      case 'completed': return list.filter(a => a.status === 'completed');
      case 'canceled': return list.filter(a => a.status === 'canceled' || a.status === 'cancelled');
      default: return list.filter(a => ['upcoming', 'rescheduled', 'confirmed'].includes(a.status || 'upcoming'));
    }
  }, [appointments, allEvents, contentType, activeTab, searchQuery]);

  const sortedList = useMemo(() => sortItems(filteredList, sortConfig), [filteredList, sortConfig]);
  const paginated = sortedList.slice(currentPage * itemsPerPage, (currentPage + 1) * itemsPerPage);
  const totalPages = Math.ceil(sortedList.length / itemsPerPage);
  const selectedAttendees = useMemo(
    () => getAttendeeDetails(selectedAppointment, bclUsersById),
    [selectedAppointment, bclUsersById]
  );

  if (loading) return (
    <div className="flex items-center justify-center min-h-[80vh]">
      <Loader2 className="animate-spin text-[#0057E7]" size={40} />
    </div>
  );

  return (
    <div className="db-shell">
      <DashboardStyles />
      <Toaster />

      {/* HEADER */}
      <div className="db-header">
        <div>
          <div className="db-title">Most Recent Opportunities</div>
          <div className="db-subtitle">Track and manage your client meetings and corporate events</div>
        </div>

        <div className="flex items-center gap-4">
          <div className="db-content-switcher">
            <button className={`db-content-btn ${contentType === 'meetings' ? 'active' : ''}`} onClick={() => setContentType('meetings')}>Meetings</button>
            <button className={`db-content-btn ${contentType === 'events' ? 'active' : ''}`} onClick={() => setContentType('events')}>Events</button>
            <button className={`db-content-btn ${contentType === 'all' ? 'active' : ''}`} onClick={() => setContentType('all')}>All Hub</button>
          </div>

          {/* Calendar connection status */}
          <div className="flex items-center gap-2">
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 12px', borderRadius: 8, border: '1px solid #E2E8F0', background: '#fff', fontSize: 12, fontWeight: 600, color: '#64748B' }}>
              <span style={{
                width: 8, height: 8, borderRadius: '50%', flexShrink: 0,
                background: calendarConnectionStatus === 'connected' ? '#22c55e' : calendarConnectionStatus === 'checking' ? '#94a3b8' : '#ef4444',
                boxShadow: calendarConnectionStatus === 'connected' ? '0 0 0 3px rgba(34,197,94,.2)' : calendarConnectionStatus === 'disconnected' ? '0 0 0 3px rgba(239,68,68,.2)' : 'none',
              }} />
              {calendarConnectionStatus === 'checking' ? 'Checking…' : `Calendar ${calendarConnectionStatus}`}
            </div>
            {calendarConnectionStatus === 'connected' && (
              <Button
                variant="outline"
                size="sm"
                className="h-8 text-xs text-red-500 border-red-200 hover:bg-red-50"
                onClick={async () => {
                  try { await fetch('/api/auth/google/disconnect', { method: 'POST' }); setCalendarConnectionStatus('disconnected'); } catch {}
                }}
              >
                Disconnect
              </Button>
            )}
            {calendarConnectionStatus === 'disconnected' && (
              <Button
                variant="outline"
                size="sm"
                className="h-8 text-xs text-blue-600 border-blue-200 hover:bg-blue-50"
                onClick={() => { window.location.href = '/api/auth/google'; }}
              >
                Connect Calendar
              </Button>
            )}
          </div>

          <Button className="db-btn-primary" onClick={() => router.push(contentType === 'events' ? '/events' : '/schedule')}>
            <Plus size={16} /> Create New
          </Button>
        </div>
      </div>

      {/* PANEL */}
      <div className="db-panel">
        <div className="db-toolbar">
          <div className="db-tabs">
            {['upcoming', 'today', 'pending', 'completed', 'canceled'].map(tab => (
              <button key={tab} className={`db-tab ${activeTab === tab ? 'active' : ''}`} onClick={() => setActiveTab(tab)}>
                {tab}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-4">
            <div className="db-search-wrap">
              <Search size={14} className="db-search-icon" />
              <input
                className="db-search"
                placeholder="Search clients..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
              />
            </div>

            <div className="flex bg-slate-100 p-1 rounded-lg">
              <Button variant="ghost" size="sm" className={cn("h-7 px-2", viewMode === 'table' && "bg-white shadow-sm")} onClick={() => setViewMode('table')}>
                <Table2 size={14} />
              </Button>
              <Button variant="ghost" size="sm" className={cn("h-7 px-2", viewMode === 'cards' && "bg-white shadow-sm")} onClick={() => setViewMode('cards')}>
                <LayoutGrid size={14} />
              </Button>
            </div>
          </div>
        </div>

        {viewMode === 'table' ? (
          <div className="overflow-x-auto p-4">
            <Table className='border rounded-2xl db-table-zebra'>
              <TableHeader className="bg-slate-50/50">
                <TableRow>
                  <TableHead className="w-[50px] border-r">#</TableHead>
                  <TableHead className='border-r cursor-pointer select-none' onClick={() => toggleSort('client_name')}>
                    Client / Opportunity<SortIcon colKey="client_name" />
                  </TableHead>
                  <TableHead className='border-r'>Category</TableHead>
                  <TableHead className='border-r cursor-pointer select-none' onClick={() => toggleSort('meeting_date')}>
                    Date<SortIcon colKey="meeting_date" />
                  </TableHead>
                  <TableHead className='border-r cursor-pointer select-none' onClick={() => toggleSort('meeting_start_time')}>
                    Start Time<SortIcon colKey="meeting_start_time" />
                  </TableHead>
                  <TableHead className='border-r'>BCL Attendee</TableHead>
                  <TableHead className='border-r cursor-pointer select-none' onClick={() => toggleSort('status')}>
                    Status<SortIcon colKey="status" />
                  </TableHead>
                  <TableHead className="text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginated.map((row, index) => {
                  const isMtg = row._kind !== 'event' && !row.event_name;
                  const name = isMtg ? (getAttendeeDetails(row, bclUsersById)[0]?.name || '—') : row.organizer_name;

                  return (
                    <TableRow
                      key={row.id_main || row.id}
                      className="cursor-pointer"
                      onClick={() => isMtg ? setSelectedAppointment(row) : null}
                    >
                      <TableCell className="font-medium text-slate-500 border-r">
                        {index + 1}
                      </TableCell>

                      <TableCell className="border-r">
                        <div className="flex items-center gap-3">
                          <div className={cn(
                            "flex h-8 w-8 items-center justify-center rounded-full",
                            row.meeting_type === 'virtual' ? "bg-blue-50 text-blue-600" : "bg-orange-50 text-orange-600"
                          )}>
                            {row.meeting_type === 'virtual' ? <Video size={16} /> : <MapPin size={16} />}
                          </div>
                          <div>
                            <div className="font-semibold text-sm text-slate-900">{row.client_name || row.event_name}</div>
                            <div className="text-xs text-slate-500">{row.client_company || row.event_type}</div>
                          </div>
                        </div>
                      </TableCell>

                      <TableCell className="border-r text-xs font-medium text-slate-600">
                        {isMtg ? 'Client Meeting' : 'Corporate Event'}
                      </TableCell>

                      <TableCell className="border-r text-sm text-slate-600">
                        {formatDate(row.meeting_date || row.event_date, {
                          day: '2-digit',
                          month: '2-digit',
                          year: 'numeric'
                        })}
                      </TableCell>

                      <TableCell className="border-r font-bold text-[#0057E7] text-xs">
                        {formatTime(row.meeting_start_time || row.event_start_time)}
                      </TableCell>

                      <TableCell className="border-r">
                        <div className="flex items-center gap-2">
                          <Avatar className="h-7 w-7 rounded">
                            <AvatarFallback className="bg-slate-100 text-[10px] font-bold text-slate-500 rounded">
                              {initials(name)}
                            </AvatarFallback>
                          </Avatar>
                          <span className="text-xs text-slate-600">{name}</span>
                        </div>
                      </TableCell>

                      <TableCell className="border-r">
                        <StatusPill status={row.status || 'upcoming'} />
                      </TableCell>

                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full">
                              <MoreHorizontal size={14} />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => setSelectedAppointment(row)}>
                              View Details
                            </DropdownMenuItem>
                            <DropdownMenuItem className="text-red-600">
                              Cancel
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
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

      {/* DETAILS VIEW DIALOG */}
      <Dialog open={!!selectedAppointment} onOpenChange={o => !o && setSelectedAppointment(null)}>
        <DialogHeader className="sr-only">
          <DialogTitle>Meeting with {selectedAppointment?.client_name}</DialogTitle>
        </DialogHeader>
        <DialogContent className="max-w-4xl p-0 overflow-hidden border-slate-200 bg-white text-slate-900 shadow-2xl">
          {/* Header */}
          <div className="p-6 border-b border-slate-100 bg-white">
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-[10px] font-extrabold text-[#0057E7] uppercase tracking-widest">
                    Meeting · #{selectedAppointment?.id_main}
                  </span>
                  <StatusPill status={selectedAppointment?.status || 'upcoming'} />
                </div>
                <h2 className="text-2xl font-bold tracking-tight text-slate-900">{selectedAppointment?.client_name}</h2>
                <p className="flex items-center gap-1.5 mt-1 text-sm text-slate-500">
                  <Building size={14} /> {selectedAppointment?.client_company || 'Independent'}
                </p>
              </div>

              <Badge
                variant="secondary"
                className={cn(
                  "px-3 py-1 gap-1.5 text-xs font-bold border shadow-sm",
                  selectedAppointment?.meeting_type === 'virtual'
                    ? "bg-indigo-50 text-indigo-600 border-indigo-100"
                    : "bg-sky-50 text-sky-600 border-sky-100"
                )}
              >
                {selectedAppointment?.meeting_type === 'virtual' ? <Video size={13} /> : <MapPin size={13} />}
                {selectedAppointment?.meeting_type === 'virtual' ? 'Virtual' : 'In-person'}
              </Badge>
            </div>
          </div>

          {/* Body */}
          <div className="flex h-[70vh]">
            {/* Left Content */}
            <ScrollArea className="flex-1 p-6 border-r border-slate-100 bg-white">
              <div className="space-y-8">
                {/* Client Info */}
                <section>
                  <SectionHeader icon={<Hash size={12} />} label="Client Information" />
                  <div className="grid grid-cols-2 gap-3 mt-3">
                    <InfoBox label="Full Name" value={selectedAppointment?.client_name} />
                    <InfoBox label="Company" value={selectedAppointment?.client_company || 'Independent'} />
                    <InfoBox label="Mobile" value={selectedAppointment?.client_mobile} />
                    <InfoBox label="Email" value={selectedAppointment?.client_email} />
                  </div>
                </section>

                {/* Agenda */}
                <section>
                  <SectionHeader icon={<ClipboardList size={12} />} label="Agenda" />
                  <div className="mt-3 p-4 rounded-xl bg-slate-50 border border-slate-100">
                    <p className="text-sm text-slate-600 italic leading-relaxed">
                      "{selectedAppointment?.meeting_agenda || 'No agenda provided.'}"
                    </p>
                  </div>
                </section>

                {/* Schedule */}
                <section>
                  <SectionHeader icon={<Calendar size={12} />} label="Schedule" />
                  <div className="grid grid-cols-2 gap-3 mt-3">
                    <div className="flex items-center gap-4 p-3 rounded-xl bg-white border border-slate-200 shadow-sm">
                      <DateTile dateStr={selectedAppointment?.meeting_date} />
                      <div>
                        <p className="text-[9px] font-bold text-slate-400 uppercase tracking-tight">Date</p>
                        <p className="text-sm font-bold text-slate-900">
                          {formatDate(selectedAppointment?.meeting_date, { day: '2-digit', month: '2-digit', year: 'numeric' })}
                        </p>
                        <p className="text-xs text-slate-500">
                          {formatDate(selectedAppointment?.meeting_date, { weekday: 'long' }, '')}
                        </p>
                      </div>
                    </div>
                    <div className="p-3 rounded-xl bg-white border border-slate-200 shadow-sm">
                      <p className="text-[9px] font-bold text-slate-400 uppercase tracking-tight mb-1">Time</p>
                      <p className="text-xl font-black text-[#0057E7] leading-none">
                        {formatTime(selectedAppointment?.meeting_start_time)}
                      </p>
                      <p className="text-xs text-slate-500 mt-2 font-medium">
                        {selectedAppointment?.meeting_duration} min {selectedAppointment?.meeting_end_time && `· ends ${formatTime(selectedAppointment.meeting_end_time)}`}
                      </p>
                    </div>
                  </div>
                </section>

                {/* Attendees */}
                {selectedAttendees.length > 0 && (
                  <section>
                    <SectionHeader label="BCL Attendees" />
                    <div className="flex flex-wrap gap-2 mt-3">
                      {selectedAttendees.map((att, i) => (
                        <div key={att.id || i} className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-50 border border-slate-100">
                          <Avatar className="h-5 w-5">
                            <AvatarFallback className="text-[8px] bg-slate-200 text-slate-600 font-bold">
                              {initials(att.name)}
                            </AvatarFallback>
                          </Avatar>
                          <div className="min-w-0">
                            <span className="block text-xs font-semibold text-slate-700">{att.name}</span>
                            {att.email && <span className="block text-[10px] text-slate-400 truncate">{att.email}</span>}
                          </div>
                        </div>
                      ))}
                    </div>
                  </section>
                )}

                <section>
                  <SectionHeader icon={<CalendarClock size={12} />} label="Booking Details" />
                  <div className="grid grid-cols-2 gap-3 mt-3">
                    <InfoBox label="Booking Date" value={formatDate(selectedAppointment?.booking_date, { day: '2-digit', month: '2-digit', year: 'numeric' })} />
                    <InfoBox label="Booking Day" value={selectedAppointment?.booking_day} />
                    <InfoBox label="Meeting Day" value={selectedAppointment?.meeting_day || formatDate(selectedAppointment?.meeting_date, { weekday: 'long' })} />
                    <InfoBox label="Badge Status" value={selectedAppointment?.badge_status} />
                    <InfoBox label="Slot Start" value={formatTime(selectedAppointment?.meeting_slot_start_time)} />
                    <InfoBox label="Slot End" value={formatTime(selectedAppointment?.meeting_slot_end_time)} />
                    <InfoBox label="Distance" value={selectedAppointment?.venue_distance != null ? `${selectedAppointment.venue_distance} km` : undefined} />
                    <InfoBox label="Google Event" value={selectedAppointment?.google_event_id} />
                    <InfoBox label="Created By" value={selectedAppointment?.created_by} />
                    <InfoBox label="Updated By" value={selectedAppointment?.updated_by} />
                  </div>
                </section>

                {/* Notes */}
                {selectedAppointment?.meeting_notes && (
                  <section>
                    <SectionHeader label="Notes" />
                    <div className="mt-3 p-4 rounded-xl bg-amber-50 border border-amber-100">
                      <p className="text-sm text-amber-800">{selectedAppointment.meeting_notes}</p>
                    </div>
                  </section>
                )}
              </div>
            </ScrollArea>

            {/* Right Panel: Actions & Venue */}
            <div className="w-[280px] p-6 bg-slate-50 border-l border-slate-100 space-y-6">
              <div>
                <SectionHeader label="Venue" />
                <div className={cn(
                  "mt-3 p-4 rounded-xl border shadow-sm flex items-center gap-3 bg-white",
                  selectedAppointment?.meeting_type === 'virtual' ? "border-indigo-100" : "border-sky-100"
                )}>
                  <div className={cn(
                    "h-10 w-10 rounded-lg flex items-center justify-center shrink-0",
                    selectedAppointment?.meeting_type === 'virtual' ? "bg-indigo-100 text-indigo-600" : "bg-sky-100 text-sky-600"
                  )}>
                    {selectedAppointment?.meeting_type === 'virtual' ? <Video size={18} /> : <MapPin size={18} />}
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-bold text-slate-900 truncate">
                      {selectedAppointment?.meeting_type === 'virtual' ? 'Virtual' : 'In-person'}
                    </p>
                    <p className="text-[11px] text-slate-500 truncate font-medium">
                      {selectedAppointment?.meeting_venue_area || (selectedAppointment?.meeting_type === 'virtual' ? 'Online' : 'Venue TBC')}
                    </p>
                  </div>
                </div>
              </div>

              {(selectedAppointment?.google_meet_link || selectedAppointment?.meeting_link) && (
                <Button asChild variant="outline" className="w-full bg-[#0057E7] text-white hover:bg-[#004bc7] border-none shadow-md">
                  <a href={selectedAppointment.google_meet_link || selectedAppointment.meeting_link} target="_blank" rel="noreferrer">
                    <LinkIcon className="mr-2 h-3 w-3" /> Join Meeting <ArrowRight className="ml-auto h-3 w-3" />
                  </a>
                </Button>
              )}

              <div className="space-y-2 pt-4 border-t border-slate-200">
                <SectionHeader icon={<Zap size={12} />} label="Actions" />

                {['upcoming', 'pending', 'rescheduled'].includes(selectedAppointment?.status) && (
                  <ActionButton
                    onClick={handleConfirm}
                    loading={actionLoading === 'confirm'}
                    icon={<UserCheck size={14} />}
                    label="Confirm Meeting"
                    className="bg-[#0057E7] hover:bg-[#004bc7] text-white border-none shadow-sm"
                  />
                )}

                {selectedAppointment?.status !== 'completed' && (
                  <ActionButton
                    onClick={handleMarkDone}
                    loading={actionLoading === 'done'}
                    icon={<CheckCircle size={14} />}
                    label="Mark as Done"
                    className="bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border-emerald-200"
                  />
                )}

                <ActionButton onClick={openReschedule} icon={<CalendarClock size={14} />} label="Reschedule" />
                <ActionButton onClick={openEdit} icon={<Edit2 size={14} />} label="Edit Details" />

                {selectedAppointment?.status !== 'canceled' && (
                  <ActionButton
                    onClick={handleCancel}
                    loading={actionLoading === 'cancel'}
                    icon={<Ban size={14} />}
                    label="Cancel Meeting"
                    className="hover:bg-red-50 text-red-600 border-red-100"
                  />
                )}

                <Separator className="my-4" />

                <ActionButton
                  onClick={() => setDeleteOpen(true)}
                  icon={<Trash2 size={14} />}
                  label="Delete Permanently"
                  className="hover:bg-slate-100 text-slate-500 border-slate-200"
                />
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* EDIT DIALOG */}
      <Dialog open={isEditOpen} onOpenChange={setEditOpen}>
        <DialogContent className="max-w-lg bg-white border-slate-200 text-slate-900 shadow-xl rounded-xl">
          <DialogHeader>
            <DialogTitle className="text-[#0057E7] font-bold">Edit Meeting Details</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-4 py-4">
            <FormItem label="Client Name" className="col-span-2">
              <Input className="bg-slate-50 border-slate-200 focus:ring-[#0057E7]" value={editData.client_name} onChange={e => setEditData({ ...editData, client_name: e.target.value })} />
            </FormItem>
            <FormItem label="Company">
              <Input className="bg-slate-50 border-slate-200 focus:ring-[#0057E7]" value={editData.client_company} onChange={e => setEditData({ ...editData, client_company: e.target.value })} />
            </FormItem>
            <FormItem label="Mobile">
              <Input className="bg-slate-50 border-slate-200 focus:ring-[#0057E7]" value={editData.client_mobile} onChange={e => setEditData({ ...editData, client_mobile: e.target.value })} />
            </FormItem>
            <FormItem label="Date">
              <Input type="date" className="bg-slate-50 border-slate-200 focus:ring-[#0057E7]" value={editData.meeting_date} onChange={e => setEditData({ ...editData, meeting_date: e.target.value })} />
            </FormItem>
            <FormItem label="Start Time">
              <Input type="time" className="bg-slate-50 border-slate-200 focus:ring-[#0057E7]" value={editData.meeting_start_time} onChange={e => setEditData({ ...editData, meeting_start_time: e.target.value })} />
            </FormItem>
            <FormItem label="Type">
              <Select value={editData.meeting_type} onValueChange={v => setEditData({ ...editData, meeting_type: v })}>
                <SelectTrigger className="bg-slate-50 border-slate-200"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="inPerson">In-Person</SelectItem>
                  <SelectItem value="virtual">Virtual</SelectItem>
                </SelectContent>
              </Select>
            </FormItem>
            <FormItem label="Venue">
              <Input className="bg-slate-50 border-slate-200 focus:ring-[#0057E7]" value={editData.meeting_venue_area} onChange={e => setEditData({ ...editData, meeting_venue_area: e.target.value })} />
            </FormItem>
            <FormItem label="Agenda" className="col-span-2">
              <Textarea rows={3} className="bg-slate-50 border-slate-200 focus:ring-[#0057E7]" value={editData.meeting_agenda} onChange={e => setEditData({ ...editData, meeting_agenda: e.target.value })} />
            </FormItem>
          </div>
          <DialogFooter className="bg-slate-50 -m-6 mt-2 p-4 flex gap-2">
            <Button variant="ghost" className="text-slate-500 font-semibold" onClick={() => setEditOpen(false)}>Cancel</Button>
            <Button onClick={handleEdit} disabled={!!actionLoading} className="bg-[#0057E7] hover:bg-[#004bc7] text-white">
              {actionLoading === 'edit' && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* DELETE CONFIRM */}
      <AlertDialog open={isDeleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent className="bg-white border-slate-200 text-slate-900 rounded-xl shadow-xl">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-red-600 font-bold">Delete Meeting Permanently?</AlertDialogTitle>
            <AlertDialogDescription className="text-slate-500 font-medium">
              You are about to remove the meeting with <strong className="text-slate-900">{selectedAppointment?.client_name}</strong>. This action is irreversible.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="bg-slate-50 -m-6 mt-4 p-4">
            <AlertDialogCancel className="bg-white border-slate-200 text-slate-600 hover:bg-slate-50">Keep Meeting</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeletePermanently} className="bg-red-600 text-white hover:bg-red-700 border-none">
              {actionLoading === 'delete' && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Delete Forever
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

const Dashboard = () => (
  <React.Suspense fallback={<div className="flex h-screen items-center justify-center"><Loader2 className="animate-spin text-[#0057E7]" /></div>}>
    <DashboardContent />
  </React.Suspense>
);

const SectionHeader = ({ icon, label }: { icon?: React.ReactNode, label: string }) => (
  <p className="flex items-center gap-1.5 text-[10px] font-extrabold text-slate-400 uppercase tracking-widest">
    {icon} {label}
  </p>
);

const InfoBox = ({ label, value }: { label: string, value?: string }) => (
  <div className="p-3 rounded-lg bg-slate-50 border border-slate-100 shadow-sm">
    <p className="text-[9px] font-bold text-slate-400 uppercase tracking-tight">{label}</p>
    <p className="text-xs font-semibold text-slate-700 mt-0.5 truncate">{value || '—'}</p>
  </div>
);

const FormItem = ({ label, children, className }: { label: string, children: React.ReactNode, className?: string }) => (
  <div className={cn("space-y-1.5", className)}>
    <Label className="text-[10px] font-extrabold uppercase tracking-widest text-slate-400">{label}</Label>
    {children}
  </div>
);

const ActionButton = ({ onClick, loading, icon, label, className }: any) => (
  <Button
    onClick={onClick}
    disabled={loading}
    variant="outline"
    className={cn(
      "w-full justify-start gap-2 h-9 text-xs font-bold border-slate-200 bg-white hover:bg-slate-50 text-slate-600 transition-all", 
      className
    )}
  >
    {loading ? <Loader2 size={14} className="animate-spin" /> : icon}
    {label}
  </Button>
);

export default Dashboard;
