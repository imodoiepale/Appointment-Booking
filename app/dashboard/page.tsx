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
} from 'lucide-react';
import { getStatusColors, getBadgeStatusColor } from '@/utils/statusColors';
import { formatTime } from './format';
import { cn } from '@/lib/utils';

// ── REFINED DATIDIAN DESIGN SYSTEM ──────────────────────────────────
const DashboardStyles = () => (
  <style>{`
    .db-shell {
      font-family: 'Inter', sans-serif;
      background: #F8FAFC;
      min-height: 100vh;
      padding: 32px;
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

    /* ── TABLE ── */
    .db-table-wrap { overflow-x: auto; }
    .db-table { width: 100%; border-collapse: collapse; }
    .db-table th {
      padding: 14px 20px; text-align: left;
      font-size: 11px; font-weight: 700; text-transform: uppercase;
      letter-spacing: 0.05em; color: #64748B;
      background: #F8FAFC; border-bottom: 1px solid #F1F5F9;
    }
    .db-table td { padding: 16px 20px; border-bottom: 1px solid #F1F5F9; vertical-align: middle; }
    .db-table tr { cursor: pointer; transition: background 0.1s ease; }
    .db-table tr:hover { background: #F8FAFC; }

    .db-cell-main { font-size: 14px; font-weight: 600; color: #0F172A; }
    .db-cell-sub { font-size: 12px; color: #94A3B8; margin-top: 2px; }
    
    .db-type-icon {
      width: 36px; height: 36px; border-radius: 8px;
      display: flex; align-items: center; justify-content: center; flex-shrink: 0;
    }
    .db-type-virtual { background: #EEF2FF; color: #4F46E5; }
    .db-type-physical { background: #F0F9FF; color: #0EA5E9; }

    /* ── STATUS PILLS ── */
    .pill {
      display: inline-flex; align-items: center; gap: 5px;
      padding: 4px 12px; border-radius: 20px;
      font-size: 11px; font-weight: 600; text-transform: capitalize;
    }
    .pill-upcoming  { background: #E0F2FE; color: #0369A1; }
    .pill-pending   { background: #FEF3C7; color: #92400E; }
    .pill-completed { background: #DCFCE7; color: #166534; }
    .pill-canceled  { background: #FEE2E2; color: #991B1B; }
    .pill-confirmed { background: #0057E7; color: #FFFFFF; }

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
function addMinutesToTime(time: string, minutes: number): string {
  const [h, m] = time.split(':').map(Number);
  const total = h * 60 + m + minutes;
  return `${String(Math.floor(total / 60) % 24).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`;
}
const initials = (n: string) => n?.split(' ').map(c => c[0]).join('').slice(0, 2).toUpperCase() ?? '??';

function getPillClass(status: string) {
  const s = status?.toLowerCase();
  if (s === 'upcoming') return 'pill pill-upcoming';
  if (s === 'pending') return 'pill pill-pending';
  if (s === 'completed') return 'pill pill-completed';
  if (s === 'canceled' || s === 'cancelled') return 'pill pill-canceled';
  if (s === 'confirmed') return 'pill pill-confirmed';
  return 'pill pill-upcoming';
}

// ── APPOINTMENT CARD (Refined) ───────────────────────────────────
const AppointmentCard = ({ appointment, onClick }) => {
  const displayStatus = (() => {
    const now = new Date();
    const mtgDate = new Date(`${appointment.meeting_date}T${appointment.meeting_start_time || '00:00'}`);
    if (['upcoming', 'rescheduled'].includes(appointment.status) && now > mtgDate) return 'pending';
    return appointment.status;
  })();
  const attendeeName = appointment.bcl_attendee_name || parseBclAttendees(appointment.bcl_attendee)[0] || '—';

  return (
    <div className="group relative bg-white rounded-xl border border-slate-200 p-5 shadow-sm hover:shadow-md transition-all cursor-pointer hover:-translate-y-1" onClick={onClick}>
      <div className="flex justify-between items-start mb-4">
        <div className={getPillClass(displayStatus)}>{displayStatus}</div>
        <Hash size={14} className="text-slate-300" />
      </div>
      <div className="text-[16px] font-bold text-slate-900 mb-1">{appointment.client_name}</div>
      <div className="text-xs text-slate-500 flex items-center gap-1.5 mb-4">
         <Building size={12} /> {appointment.client_company || 'Independent'}
      </div>
      
      <div className="bg-slate-50 rounded-lg p-3 flex justify-between items-center mb-4">
         <div>
            <div className="text-xs font-bold text-slate-900">{new Date(appointment.meeting_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}</div>
            <div className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">{new Date(appointment.meeting_date).toLocaleDateString('en-GB', { weekday: 'short' })}</div>
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

  const notify = {
    success: (title: string, desc?: string) => toast({ title, description: desc }),
    error: (title: string, desc?: string) => toast({ variant: 'destructive', title, description: desc }),
  };

  useEffect(() => { if (statusParam) setActiveTab(statusParam); }, [statusParam]);

  useEffect(() => {
    const init = async () => {
      setLoading(true);
      try {
        const [userRes, meetingsRes, eventsRes, calRes] = await Promise.all([
          fetch('/api/users/me'),
          fetch('/api/meetings'),
          fetch('/api/events'),
          fetch('/api/auth/google/status'),
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
        const calStatus = await calRes.json();
        setCalendarConnectionStatus(calStatus.connected ? 'connected' : 'disconnected');
      } catch (err) { console.error(err); }
      finally { setLoading(false); }
    };
    init();
  }, []);

  const checkAppointmentStatus = (app: any) => {
    const now = new Date();
    const mtgDate = new Date(`${app.meeting_date}T${app.meeting_start_time || '00:00'}`);
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

    const todayStr = new Date().toISOString().split('T')[0];
    switch (activeTab) {
      case 'today': return list.filter(a => (a.meeting_date || a.event_date) === todayStr);
      case 'pending': return list.filter(a => a.status === 'pending' || a.status === 'upcoming');
      case 'completed': return list.filter(a => a.status === 'completed');
      case 'canceled': return list.filter(a => a.status === 'canceled' || a.status === 'cancelled');
      default: return list.filter(a => ['upcoming', 'rescheduled', 'confirmed'].includes(a.status || 'upcoming'));
    }
  }, [appointments, allEvents, contentType, activeTab, searchQuery]);

  const paginated = filteredList.slice(currentPage * itemsPerPage, (currentPage + 1) * itemsPerPage);
  const totalPages = Math.ceil(filteredList.length / itemsPerPage);

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
          <div className="db-table-wrap">
            <table className="db-table">
              <thead>
                <tr>
                  <th>Client / Opportunity</th>
                  <th>Category</th>
                  <th>Date</th>
                  <th>Start Time</th>
                  <th>Attendee</th>
                  <th>Status</th>
                  <th className="text-right">Action</th>
                </tr>
              </thead>
              <tbody>
                {paginated.map((row) => {
                  const isMtg = row._kind !== 'event' && !row.event_name;
                  const name = isMtg ? (row.bcl_attendee_name || '—') : row.organizer_name;
                  return (
                    <tr key={row.id_main || row.id} onClick={() => isMtg ? setSelectedAppointment(row) : null}>
                      <td>
                        <div className="flex items-center gap-3">
                            <div className={cn("db-type-icon", row.meeting_type === 'virtual' ? "db-type-virtual" : "db-type-physical")}>
                                {row.meeting_type === 'virtual' ? <Video size={16} /> : <MapPin size={16} />}
                            </div>
                            <div>
                                <div className="db-cell-main">{row.client_name || row.event_name}</div>
                                <div className="db-cell-sub">{row.client_company || row.event_type}</div>
                            </div>
                        </div>
                      </td>
                      <td className="text-xs font-medium text-slate-600">{isMtg ? 'Client Meeting' : 'Corporate Event'}</td>
                      <td className="db-cell-main text-slate-600">{new Date(row.meeting_date || row.event_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</td>
                      <td className="font-bold text-[#0057E7] text-xs">{formatTime(row.meeting_start_time || row.event_start_time)}</td>
                      <td>
                        <div className="flex items-center gap-2">
                           <div className="w-6 h-6 rounded bg-slate-100 flex items-center justify-center text-[10px] font-bold text-slate-500">{initials(name)}</div>
                           <span className="text-xs text-slate-600">{name}</span>
                        </div>
                      </td>
                      <td><span className={getPillClass(row.status || 'upcoming')}>{row.status || 'upcoming'}</span></td>
                      <td className="text-right">
                        <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full">
                           <MoreHorizontal size={14} />
                        </Button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 p-6 bg-slate-50/50">
            {paginated.map(row => (
              <AppointmentCard key={row.id_main} appointment={row} onClick={() => setSelectedAppointment(row)} />
            ))}
          </div>
        )}

        <div className="flex items-center justify-between px-6 py-4 border-t border-slate-100">
           <div className="text-xs text-slate-500 font-medium">
             Showing <span className="text-slate-900 font-bold">{currentPage * itemsPerPage + 1}</span> to <span className="text-slate-900 font-bold">{Math.min((currentPage + 1) * itemsPerPage, filteredList.length)}</span> of {filteredList.length}
           </div>
           <div className="flex gap-1">
             <Button variant="outline" size="sm" className="h-8 w-8 p-0" onClick={() => setCurrentPage(p => p - 1)} disabled={currentPage === 0}><ChevronLeft size={14} /></Button>
             <Button variant="outline" size="sm" className="h-8 px-3 text-xs font-bold bg-[#0057E7] text-white border-none">{currentPage + 1}</Button>
             <Button variant="outline" size="sm" className="h-8 w-8 p-0" onClick={() => setCurrentPage(p => p + 1)} disabled={currentPage >= totalPages - 1}><ChevronRight size={14} /></Button>
           </div>
        </div>
      </div>

      {/* DETAIL DIALOG */}
      <Dialog open={!!selectedAppointment} onOpenChange={o => !o && setSelectedAppointment(null)}>
        <DialogContent className="db-dialog max-w-3xl p-0 overflow-hidden">
          <div className="db-dialog-header">
            <div className="flex justify-between items-start">
               <div>
                  <div className="text-[10px] font-bold text-blue-300 uppercase tracking-widest mb-1">Meeting Detail · #{selectedAppointment?.id_main}</div>
                  <div className="db-dialog-name">{selectedAppointment?.client_name}</div>
                  <div className="db-dialog-company"><Building size={14} /> {selectedAppointment?.client_company || 'Independent'}</div>
               </div>
               <div className={getPillClass(selectedAppointment?.status || 'upcoming')}>{selectedAppointment?.status}</div>
            </div>
          </div>
          
          <div className="p-8 grid grid-cols-1 md:grid-cols-3 gap-8 bg-white">
            <div className="md:col-span-2 space-y-6">
               <section>
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2 block">Meeting Agenda</label>
                  <div className="bg-slate-50 border border-slate-100 rounded-xl p-4 text-sm text-slate-600 leading-relaxed italic">
                    "{selectedAppointment?.meeting_agenda || 'No agenda provided.'}"
                  </div>
               </section>
               
               <div className="grid grid-cols-2 gap-6">
                  <div>
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1 block">Date</label>
                    <div className="text-sm font-bold text-slate-900 flex items-center gap-2">
                        <Calendar size={14} className="text-[#0057E7]" />
                        {new Date(selectedAppointment?.meeting_date).toLocaleDateString('en-US', { dateStyle: 'long' })}
                    </div>
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1 block">Time & Duration</label>
                    <div className="text-sm font-bold text-slate-900 flex items-center gap-2">
                        <Clock size={14} className="text-[#0057E7]" />
                        {formatTime(selectedAppointment?.meeting_start_time)} ({selectedAppointment?.meeting_duration} min)
                    </div>
                  </div>
               </div>
            </div>

            <div className="space-y-6 border-l border-slate-100 pl-8">
                <section>
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2 block">Format & Venue</label>
                    <div className="flex items-center gap-3 p-3 bg-blue-50 rounded-lg border border-blue-100">
                        {selectedAppointment?.meeting_type === 'virtual' ? <Video size={18} className="text-[#0057E7]" /> : <MapPin size={18} className="text-[#0057E7]" />}
                        <div>
                            <div className="text-xs font-bold text-[#0057E7] capitalize">{selectedAppointment?.meeting_type}</div>
                            <div className="text-[10px] text-blue-400 truncate w-32">{selectedAppointment?.meeting_venue_area || 'Online'}</div>
                        </div>
                    </div>
                </section>

                <div className="flex flex-col gap-2 pt-4">
                    <Button className="w-full bg-[#0057E7] hover:bg-[#004bc7] h-10 text-xs font-bold shadow-lg shadow-blue-200" onClick={handleConfirm}>
                        <UserCheck size={14} className="mr-2" /> Confirm Meeting
                    </Button>
                    <Button variant="outline" className="w-full border-slate-200 h-10 text-xs font-bold text-slate-600" onClick={openReschedule}>
                        <CalendarClock size={14} className="mr-2" /> Reschedule
                    </Button>
                    <Button variant="ghost" className="w-full text-red-500 hover:bg-red-50 text-xs font-bold" onClick={() => setDeleteOpen(true)}>
                        <Trash2 size={14} className="mr-2" /> Delete Booking
                    </Button>
                </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* RESCHEDULE DIALOG */}
      <Dialog open={isRescheduleOpen} onOpenChange={setRescheduleOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle className="text-[#0057E7]">Reschedule Meeting</DialogTitle></DialogHeader>
          <div className="space-y-4 py-4">
             <div className="space-y-2">
                <Label className="text-xs font-bold uppercase text-slate-400">New Date</Label>
                <Input type="date" value={rescheduleData.meeting_date} onChange={e => setRescheduleData(d => ({ ...d, meeting_date: e.target.value }))} />
             </div>
             <div className="space-y-2">
                <Label className="text-xs font-bold uppercase text-slate-400">New Time</Label>
                <Input type="time" value={rescheduleData.meeting_start_time} onChange={e => setRescheduleData(d => ({ ...d, meeting_start_time: e.target.value }))} />
             </div>
          </div>
          <DialogFooter>
             <Button variant="ghost" onClick={() => setRescheduleOpen(false)}>Cancel</Button>
             <Button className="bg-[#0057E7]" onClick={handleReschedule} disabled={!!actionLoading}>
                {actionLoading === 'reschedule' ? <Loader2 className="animate-spin" /> : 'Update Meeting'}
             </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* DELETE ALERT */}
      <AlertDialog open={isDeleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent className="rounded-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-red-600">Permanently Delete?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete the meeting with <b>{selectedAppointment?.client_name}</b>? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-xl">Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeletePermanently} className="bg-red-600 hover:bg-red-700 rounded-xl">Delete Forever</AlertDialogAction>
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

export default Dashboard;