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

// ── REFINED DASHBOARD DESIGN SYSTEM ──────────────────────────────────
const DashboardStyles = () => (
  <style>{`
    .db-shell {
      font-family: 'Inter', sans-serif;
      background: #F8FAFC;
      min-height: 100vh;
      padding: 20px 24px;
    }

    .db-header { margin-bottom: 28px; display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 16px; }
    .db-title { font-size: 24px; font-weight: 700; color: #0F172A; letter-spacing: -0.02em; }
    .db-subtitle { font-size: 13px; color: #64748B; margin-top: 4px; }

    .db-btn-primary {
      display: inline-flex; align-items: center; gap: 8px;
      padding: 10px 20px; font-size: 13px; font-weight: 600;
      border-radius: 8px; border: none;
      background: #0057E7; color: white; cursor: pointer;
      box-shadow: 0 4px 12px rgba(0, 87, 231, 0.2); transition: all 0.2s ease;
    }
    .db-btn-primary:hover { background: #004bc7; transform: translateY(-1px); box-shadow: 0 6px 16px rgba(0, 87, 231, 0.3); }

    .db-btn-outline {
      display: inline-flex; align-items: center; gap: 8px;
      padding: 9px 18px; font-size: 13px; font-weight: 600;
      border-radius: 8px; border: 1px solid #E2E8F0;
      background: white; color: #475569; cursor: pointer; transition: all 0.2s ease;
    }
    .db-btn-outline:hover { background: #F8FAFC; border-color: #CBD5E1; color: #0F172A; }

    .db-panel {
      background: #ffffff; border-radius: 12px;
      border: 1px solid #E2E8F0; overflow: hidden;
      box-shadow: 0 4px 20px rgba(0, 0, 0, 0.03);
    }

    .db-toolbar {
      display: flex; align-items: center; justify-content: space-between;
      border-bottom: 1px solid #F1F5F9; padding: 12px 20px;
    }
    .db-tabs { display: flex; gap: 4px; background: #F1F5F9; padding: 4px; border-radius: 8px; }
    .db-tab {
      padding: 6px 16px; font-size: 12px; font-weight: 600;
      border-radius: 6px; border: none; background: transparent; color: #64748B;
      cursor: pointer; transition: all 0.2s ease; text-transform: capitalize;
    }
    .db-tab:hover { color: #0F172A; }
    .db-tab.active { background: white; color: #0057E7; box-shadow: 0 2px 6px rgba(0,0,0,0.05); }

    .db-search-wrap { position: relative; width: 300px; }
    .db-search-icon { position: absolute; left: 12px; top: 50%; transform: translateY(-50%); color: #94A3B8; pointer-events: none; }
    .db-search {
      width: 100%; height: 38px; padding: 0 12px 0 38px;
      font-size: 13px; border: 1px solid #E2E8F0; border-radius: 20px;
      background: #FFFFFF; color: #0F172A; transition: all 0.2s ease;
    }
    .db-search:focus { border-color: #0057E7; outline: none; }

    .db-dialog { border-radius: 16px !important; border: none !important; box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25) !important; }

    .db-content-switcher { display: flex; background: #F1F5F9; padding: 4px; border-radius: 10px; gap: 2px; }
    .db-content-btn { padding: 8px 16px; font-size: 13px; font-weight: 600; color: #64748B; border-radius: 8px; border: none; background: transparent; transition: all 0.2s; cursor: pointer; }
    .db-content-btn.active { background: #FFFFFF; color: #0057E7; }

    /* Sync badge */
    .db-sync-yes { display:inline-flex;align-items:center;gap:4px;padding:2px 7px;border-radius:5px;font-size:10px;font-weight:700;background:#dcfce7;color:#15803d;border:1px solid #bbf7d0; }
    .db-sync-no  { display:inline-flex;align-items:center;gap:4px;padding:2px 7px;border-radius:5px;font-size:10px;font-weight:700;background:#f1f5f9;color:#64748b;border:1px solid #e2e8f0; }
    .db-sync-btn { display:inline-flex;align-items:center;gap:3px;padding:2px 7px;border-radius:5px;font-size:10px;font-weight:700;border:1px solid;cursor:pointer;transition:all 0.15s ease;background:transparent; }
    .db-sync-btn-sync  { color:#0057E7;border-color:#bfdbfe; }
    .db-sync-btn-sync:hover  { background:#eff6ff; }
    .db-sync-btn-unsync { color:#dc2626;border-color:#fecaca; }
    .db-sync-btn-unsync:hover { background:#fef2f2; }

    /* Reschedule form helpers */
    .rsch-grid { display:grid;grid-template-columns:1fr 1fr;gap:12px; }
    .rsch-full { grid-column:1/-1; }
    .rsch-label { font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:0.06em;color:#94A3B8;display:block;margin-bottom:5px; }
    .rsch-read { background:#f8fafc;color:#64748b;cursor:not-allowed; }

    /* Conflict banner */
    .rsch-conflict { display:flex;align-items:center;gap:8px;padding:10px 14px;border-radius:8px;background:#fef2f2;border:1px solid #fecaca;color:#991b1b;font-size:12px;font-weight:600;margin-top:12px; }

    /* ── EDIT PANEL STYLES ── */
    .edit-panel-tabs {
      display: flex; gap: 0; border-bottom: 1px solid #E2E8F0;
      background: #F8FAFC; padding: 0 20px; flex-shrink: 0;
    }
    .edit-panel-tab {
      padding: 11px 16px; font-size: 11px; font-weight: 700;
      color: #94a3b8; border: none; background: transparent;
      border-bottom: 2px solid transparent; cursor: pointer; transition: all 0.2s;
      text-transform: uppercase; letter-spacing: 0.06em;
    }
    .edit-panel-tab.active { color: #0057E7; border-bottom-color: #0057E7; }
    .edit-panel-tab:hover:not(.active) { color: #475569; }

    .edit-panel-body { flex: 1; overflow-y: auto; padding: 24px 28px; }
    .edit-panel-footer {
      padding: 16px 28px; border-top: 1px solid #F1F5F9;
      background: #F8FAFC; display: flex; gap: 10px; flex-shrink: 0;
    }

    .edit-field-group { margin-bottom: 22px; }
    .edit-field-group-title {
      font-size: 9px; font-weight: 800; text-transform: uppercase;
      letter-spacing: 0.1em; color: #94a3b8; margin-bottom: 12px;
      display: flex; align-items: center; gap: 6px;
    }
    .edit-field-group-title::after { content: ''; flex: 1; height: 1px; background: #F1F5F9; }
    .edit-field-icon { color: #94a3b8; flex-shrink: 0; margin-top: 2px; }
    .edit-input-wrap { position: relative; }
    .edit-input-icon { position: absolute; left: 10px; top: 50%; transform: translateY(-50%); color: #94a3b8; pointer-events: none; }
    .edit-input {
      width: 100%; height: 40px; border: 1px solid #E2E8F0; border-radius: 8px;
      font-size: 13px; color: #0F172A; padding: 0 12px;
      background: #fff; transition: all 0.2s;
    }
    .edit-input.with-icon { padding-left: 34px; }
    .edit-input:focus { border-color: #0057E7; outline: none; box-shadow: 0 0 0 3px rgba(0,87,231,0.08); }
    .edit-input-label { font-size: 10px; font-weight: 700; color: #64748b; text-transform: uppercase; letter-spacing: 0.06em; display: block; margin-bottom: 5px; }
    .edit-textarea { width: 100%; border: 1px solid #E2E8F0; border-radius: 8px; font-size: 13px; color: #0F172A; padding: 10px 12px; background: #fff; transition: all 0.2s; resize: vertical; font-family: inherit; }
    .edit-textarea:focus { border-color: #0057E7; outline: none; box-shadow: 0 0 0 3px rgba(0,87,231,0.08); }
    .edit-read { background: #F8FAFC !important; color: #94a3b8 !important; cursor: not-allowed; }

    /* Detail dialog improvements */
    .detail-stat-chip {
      display: inline-flex; align-items: center; gap: 5px;
      padding: 4px 10px; border-radius: 6px; font-size: 11px; font-weight: 600;
      background: #F1F5F9; color: #475569; border: 1px solid #E2E8F0;
    }
    .detail-timeline-dot {
      width: 8px; height: 8px; border-radius: 50%;
      background: #0057E7; flex-shrink: 0; margin-top: 4px;
      box-shadow: 0 0 0 3px rgba(0,87,231,0.15);
    }
    .detail-info-card {
      background: #fff; border: 1px solid #E2E8F0; border-radius: 10px;
      padding: 12px 14px; box-shadow: 0 1px 4px rgba(0,0,0,0.03);
    }
    .detail-section-label {
      font-size: 9px; font-weight: 800; text-transform: uppercase;
      letter-spacing: 0.1em; color: #94a3b8; margin-bottom: 12px;
      display: flex; align-items: center; gap: 6px;
    }
    .detail-section-label::after { content: ''; flex: 1; height: 1px; background: #F1F5F9; }
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
    <span style={{ display: 'inline-flex', alignItems: 'center', padding: '3px 9px', borderRadius: 5, fontSize: 10, fontWeight: 700, letterSpacing: '0.04em', background: col.bg, color: col.text, border: `1px solid ${col.hex}40` }}>
      {getStatusLabel(status)}
    </span>
  );
}

function SyncBadge({ synced }: { synced: boolean }) {
  return synced
    ? <span className="db-sync-yes"><Cloud size={10} /> Synced</span>
    : <span className="db-sync-no"><CloudOff size={10} /> Not synced</span>;
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
    <div className="flex flex-col items-center justify-center rounded-lg flex-shrink-0" style={{ width: 42, height: 42, background: dim ? '#94a3b8' : 'linear-gradient(135deg, #0057E7, #1a78ff)' }}>
      <span className="text-[15px] font-black text-white leading-none">{d.getDate()}</span>
      <span className="text-[8px] font-bold text-white/70 tracking-wide uppercase">{d.toLocaleDateString('en', { month: 'short' })}</span>
    </div>
  );
}

// ── EDIT DETAILS FORM (rendered inline inside the detail dialog) ──
const EDIT_TABS = ['Client', 'Schedule', 'Details'] as const;

const EditDetailsForm = ({ appointment, onSave, onCancel, loading }: {
  appointment: any; onSave: (data: any) => void; onCancel: () => void; loading: boolean;
}) => {
  const [activeTab, setActiveTab] = useState<typeof EDIT_TABS[number]>('Client');
  const [data, setData] = useState<any>({});

  useEffect(() => {
    if (appointment) {
      const dur = String(appointment.meeting_duration || 60);
      const start = appointment.meeting_start_time || '';
      setData({
        client_name: appointment.client_name || '',
        client_company: appointment.client_company || '',
        client_mobile: appointment.client_mobile || '',
        client_email: appointment.client_email || '',
        meeting_date: appointment.meeting_date || '',
        meeting_start_time: start,
        meeting_duration: dur,
        meeting_end_time: start ? addMinutesToTime(start, parseInt(dur) || 60) : '',
        meeting_type: appointment.meeting_type || 'inPerson',
        meeting_venue_area: appointment.meeting_venue_area || '',
        meeting_agenda: appointment.meeting_agenda || '',
        meeting_notes: appointment.meeting_notes || '',
        badge_status: appointment.badge_status || '',
        venue_distance: String(appointment.venue_distance ?? 10),
        virtual_meeting_mode: appointment.virtual_meeting_mode || '',
        meeting_link: appointment.meeting_link || '',
        meeting_id: appointment.meeting_id || '',
      });
      setActiveTab('Client');
    }
  }, [appointment]);

  const set = (field: string, val: string) => {
    setData((prev: any) => {
      const next = { ...prev, [field]: val };
      if (field === 'meeting_start_time' || field === 'meeting_duration') {
        const s = field === 'meeting_start_time' ? val : prev.meeting_start_time;
        const d = field === 'meeting_duration' ? parseInt(val) || 60 : parseInt(prev.meeting_duration) || 60;
        if (s) next.meeting_end_time = addMinutesToTime(s, d);
      }
      if (field === 'meeting_type' && val !== 'virtual') {
        next.virtual_meeting_mode = '';
        next.meeting_link = '';
        next.meeting_id = '';
      }
      if (field === 'virtual_meeting_mode' && val !== 'external') {
        next.meeting_link = '';
        next.meeting_id = '';
      }
      return next;
    });
  };

  return (
    <div className="flex flex-col" style={{ height: '65vh' }}>
      {/* Tabs */}
      <div className="edit-panel-tabs">
        {EDIT_TABS.map(t => (
          <button key={t} className={`edit-panel-tab ${activeTab === t ? 'active' : ''}`} onClick={() => setActiveTab(t)}>{t}</button>
        ))}
      </div>

      {/* Body */}
      <ScrollArea className="flex-1 bg-white">
        <div className="edit-panel-body">

          {/* ── CLIENT TAB ── */}
          {activeTab === 'Client' && (
            <div>
              <div className="edit-field-group">
                <div className="edit-field-group-title"><User size={11} /> Client Identity</div>
                <div className="grid grid-cols-1 gap-4">
                  <EditField label="Full Name" icon={<User size={13} />}>
                    <input className="edit-input with-icon" value={data.client_name} onChange={e => set('client_name', e.target.value)} placeholder="Client full name" />
                  </EditField>
                  <EditField label="Company / Organisation" icon={<Briefcase size={13} />}>
                    <input className="edit-input with-icon" value={data.client_company} onChange={e => set('client_company', e.target.value)} placeholder="Company name" />
                  </EditField>
                </div>
              </div>
              <div className="edit-field-group">
                <div className="edit-field-group-title"><Phone size={11} /> Contact Details</div>
                <div className="grid grid-cols-2 gap-4">
                  <EditField label="Mobile" icon={<Phone size={13} />}>
                    <input className="edit-input with-icon" value={data.client_mobile} onChange={e => set('client_mobile', e.target.value)} placeholder="+254 7xx xxx xxx" />
                  </EditField>
                  <EditField label="Email" icon={<Mail size={13} />}>
                    <input className="edit-input with-icon" value={data.client_email} onChange={e => set('client_email', e.target.value)} placeholder="email@example.com" />
                  </EditField>
                </div>
              </div>
              <div className="edit-field-group">
                <div className="edit-field-group-title"><Tag size={11} /> Status</div>
                <EditField label="Badge Status">
                  <select className="edit-input" value={data.badge_status} onChange={e => set('badge_status', e.target.value)}>
                    <option value="">— None —</option>
                    <option value="Confirmed">Confirmed</option>
                    <option value="Tentative">Tentative</option>
                    <option value="VIP">VIP</option>
                    <option value="New Lead">New Lead</option>
                  </select>
                </EditField>
              </div>
            </div>
          )}

          {/* ── SCHEDULE TAB ── */}
          {activeTab === 'Schedule' && (
            <div>
              <div className="edit-field-group">
                <div className="edit-field-group-title"><Calendar size={11} /> Date & Time</div>
                <div className="grid grid-cols-2 gap-4">
                  <EditField label="Meeting Date">
                    <input type="date" className="edit-input" value={data.meeting_date} onChange={e => set('meeting_date', e.target.value)} />
                  </EditField>
                  <EditField label="Start Time" icon={<Clock size={13} />}>
                    <input type="time" className="edit-input with-icon" value={data.meeting_start_time} onChange={e => set('meeting_start_time', e.target.value)} />
                  </EditField>
                  <EditField label="Duration">
                    <select className="edit-input" value={data.meeting_duration} onChange={e => set('meeting_duration', e.target.value)}>
                      {[['15', '15 min'], ['30', '30 min'], ['45', '45 min'], ['60', '1 hour'], ['90', '1.5 hrs'], ['120', '2 hrs'], ['180', '3 hrs'], ['240', '4 hrs'], ['300', '5 hrs']].map(([v, l]) =>
                        <option key={v} value={v}>{l}</option>
                      )}
                    </select>
                  </EditField>
                  <EditField label="End Time (auto-calc)">
                    <input className="edit-input edit-read" readOnly value={data.meeting_end_time || '—'} />
                  </EditField>
                </div>
              </div>
              <div className="edit-field-group">
                <div className="edit-field-group-title"><MapPin size={11} /> Meeting Type & Venue</div>
                <div className="grid grid-cols-2 gap-4">
                  <EditField label="Meeting Type">
                    <select className="edit-input" value={data.meeting_type} onChange={e => set('meeting_type', e.target.value)}>
                      <option value="inPerson">In-Person</option>
                      <option value="virtual">Virtual</option>
                    </select>
                  </EditField>
                  {data.meeting_type === 'virtual' && (
                    <EditField label="How will this be joined?">
                      <select className="edit-input" value={data.virtual_meeting_mode} onChange={e => set('virtual_meeting_mode', e.target.value)}>
                        <option value="">— Select —</option>
                        <option value="hosted">We'll generate a Google Meet link</option>
                        <option value="external">Provide an existing link</option>
                      </select>
                    </EditField>
                  )}
                  {data.meeting_type === 'virtual' && data.virtual_meeting_mode === 'external' && (
                    <>
                      <EditField label="Meeting Link" icon={<LinkIcon size={13} />}>
                        <input className="edit-input with-icon" value={data.meeting_link} onChange={e => set('meeting_link', e.target.value)} placeholder="https://zoom.us/j/..." />
                      </EditField>
                      <EditField label="Meeting ID" icon={<Hash size={13} />}>
                        <input className="edit-input with-icon" value={data.meeting_id} onChange={e => set('meeting_id', e.target.value)} placeholder="e.g. 123 4567 8901" />
                      </EditField>
                    </>
                  )}
                  <EditField label="Travel Time (mins)">
                    <select className="edit-input" value={data.venue_distance} onChange={e => set('venue_distance', e.target.value)}>
                      {[['0', '0 (Virtual)'], ['10', '10 min'], ['15', '15 min'], ['30', '30 min'], ['45', '45 min'], ['60', '1 hour'], ['90', '1.5 hrs'], ['120', '2 hrs']].map(([v, l]) =>
                        <option key={v} value={v}>{l}</option>
                      )}
                    </select>
                  </EditField>
                  <div className="col-span-2">
                    <EditField label="Venue / Area" icon={<MapPin size={13} />}>
                      <input className="edit-input with-icon" value={data.meeting_venue_area} onChange={e => set('meeting_venue_area', e.target.value)} placeholder="e.g. BCL Boardroom, Westlands" />
                    </EditField>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ── DETAILS TAB ── */}
          {activeTab === 'Details' && (
            <div>
              <div className="edit-field-group">
                <div className="edit-field-group-title"><ClipboardList size={11} /> Meeting Agenda</div>
                <label className="edit-input-label">Agenda</label>
                <textarea
                  className="edit-textarea"
                  rows={4}
                  value={data.meeting_agenda}
                  onChange={e => set('meeting_agenda', e.target.value)}
                  placeholder="Describe the topics and objectives for this meeting…"
                />
              </div>
              <div className="edit-field-group">
                <div className="edit-field-group-title"><FileText size={11} /> Notes</div>
                <label className="edit-input-label">Internal Notes</label>
                <textarea
                  className="edit-textarea"
                  rows={4}
                  value={data.meeting_notes}
                  onChange={e => set('meeting_notes', e.target.value)}
                  placeholder="Add any internal notes, preparation items, or follow-ups…"
                />
              </div>
            </div>
          )}
        </div>
      </ScrollArea>

      {/* Footer */}
      <div className="edit-panel-footer">
        <button
          onClick={onCancel}
          style={{ flex: 1, padding: '10px', borderRadius: 8, border: '1px solid #E2E8F0', background: '#fff', fontSize: 13, fontWeight: 600, color: '#64748b', cursor: 'pointer' }}
        >
          Cancel
        </button>
        <button
          onClick={() => onSave(data)}
          disabled={loading}
          style={{ flex: 2, padding: '10px', borderRadius: 8, border: 'none', background: loading ? '#94a3b8' : '#0057E7', fontSize: 13, fontWeight: 700, color: '#fff', cursor: loading ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}
        >
          {loading ? <><Loader2 size={14} className="animate-spin" /> Saving…</> : <><CheckCircle size={14} /> Save Changes</>}
        </button>
      </div>
    </div>
  );
};

// Helper for edit field with icon
const EditField = ({ label, icon, children }: { label: string; icon?: React.ReactNode; children: React.ReactNode }) => (
  <div>
    <label className="edit-input-label">{label}</label>
    {icon ? (
      <div className="edit-input-wrap">
        <span className="edit-input-icon">{icon}</span>
        {children}
      </div>
    ) : children}
  </div>
);

// ── MAIN COMPONENT ────────────────────────────────────────────────
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

  const [rescheduleData, setRescheduleData] = useState({
    meeting_date: '', meeting_start_time: '', meeting_duration: '60',
    meeting_end_time: '', meeting_slot_start_time: '', meeting_slot_end_time: '',
    venue_distance: '10', meeting_type: 'inPerson', meeting_venue_area: '',
    meeting_agenda: '',
  });

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
          <div className="flex items-center gap-2">
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 12px', borderRadius: 8, border: '1px solid #E2E8F0', background: '#fff', fontSize: 12, fontWeight: 600, color: '#64748B' }}>
              <span style={{ width: 8, height: 8, borderRadius: '50%', flexShrink: 0, background: calendarConnectionStatus === 'connected' ? '#22c55e' : calendarConnectionStatus === 'checking' ? '#94a3b8' : '#ef4444', boxShadow: calendarConnectionStatus === 'connected' ? '0 0 0 3px rgba(34,197,94,.2)' : calendarConnectionStatus === 'disconnected' ? '0 0 0 3px rgba(239,68,68,.2)' : 'none' }} />
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
      <div className="db-panel">
        <div className="db-toolbar">
          <div className="db-tabs">
            {['upcoming', 'today', 'pending', 'completed', 'canceled'].map(tab => (
              <button key={tab} className={`db-tab ${activeTab === tab ? 'active' : ''}`} onClick={() => setActiveTab(tab)}>{tab}</button>
            ))}
          </div>
          <div className="flex items-center gap-4">
            <div className="db-search-wrap">
              <Search size={14} className="db-search-icon" />
              <input className="db-search" placeholder="Search clients..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} />
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
                              <button className={`db-sync-btn ${row.google_event_id ? 'db-sync-btn-unsync' : 'db-sync-btn-sync'}`} onClick={e => handleSyncRow(row, e)} disabled={isSyncing}>
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

      {/* ── DETAIL DIALOG (enhanced) ── */}
      <Dialog open={!!selectedAppointment} onOpenChange={o => !o && setSelectedAppointment(null)}>
        <DialogHeader className="sr-only">
          <DialogTitle>Meeting with {selectedAppointment?.client_name}</DialogTitle>
        </DialogHeader>
        <DialogContent className="max-w-4xl p-0 overflow-hidden border-slate-200 bg-white text-slate-900 shadow-2xl rounded-2xl">

          {/* ── HERO HEADER ── */}
          {(() => {
            const statusCol = getStatusHexColor(effectiveStatus(selectedAppointment, now));
            return (
              <div className="border-b border-slate-100" style={{ padding: '24px 28px 20px', position: 'relative', overflow: 'hidden' }}>
                {/* Decorative circles — tinted with the meeting's status color so it reads at a glance */}
                <div style={{ position: 'absolute', top: -30, right: -30, width: 140, height: 140, borderRadius: '50%', background: `${statusCol.hex}14` }} />
                <div style={{ position: 'absolute', bottom: -20, right: 60, width: 80, height: 80, borderRadius: '50%', background: `${statusCol.hex}0d` }} />

                <div className="flex items-start justify-between gap-4 relative">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-2">
                      <span style={{ fontSize: 10, fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Meeting · #{selectedAppointment?.id_main}</span>
                      <StatusPill status={effectiveStatus(selectedAppointment, now)} />
                    </div>
                    <h2 style={{ fontSize: 22, fontWeight: 800, color: '#0F172A', letterSpacing: '-0.02em', marginBottom: 4 }}>{selectedAppointment?.client_name}</h2>
                    <p style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: '#64748b' }}>
                      <Building size={13} /> {selectedAppointment?.client_company || 'Independent'}
                      {selectedAppointment?.client_mobile && <><span style={{ color: '#cbd5e1' }}>·</span><Phone size={12} />{selectedAppointment.client_mobile}</>}
                      {selectedAppointment?.client_email && <><span style={{ color: '#cbd5e1' }}>·</span><Mail size={12} />{selectedAppointment.client_email}</>}
                    </p>
                  </div>
                  <div className="flex flex-col items-end gap-2 flex-shrink-0">
                    <Badge variant="secondary" className={cn("px-3 py-1 gap-1.5 text-xs font-bold border shadow-sm", selectedAppointment?.meeting_type === 'virtual' ? "bg-indigo-50 text-indigo-700 border-indigo-200" : "bg-sky-50 text-sky-700 border-sky-200")}>
                      {selectedAppointment?.meeting_type === 'virtual' ? <Video size={13} /> : <MapPin size={13} />}
                      {selectedAppointment?.meeting_type === 'virtual' ? 'Virtual' : 'In-person'}
                    </Badge>
                    <SyncBadge synced={!!selectedAppointment?.google_event_id} />
                  </div>
                </div>

                {/* Quick stats strip */}
                <div className="flex items-center gap-3 mt-4 flex-wrap">
                  {selectedAppointment?.meeting_date && (
                    <span className="detail-stat-chip">
                      <Calendar size={11} />
                      {formatDate(selectedAppointment.meeting_date, { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })}
                    </span>
                  )}
                  {selectedAppointment?.meeting_start_time && (
                    <span className="detail-stat-chip">
                      <Clock size={11} />
                      {formatTime(selectedAppointment.meeting_start_time)}
                      {selectedAppointment?.meeting_end_time && ` – ${formatTime(selectedAppointment.meeting_end_time)}`}
                    </span>
                  )}
                  {selectedAppointment?.meeting_duration && (
                    <span className="detail-stat-chip">
                      <Timer size={11} />
                      {selectedAppointment.meeting_duration >= 60
                        ? `${Math.floor(selectedAppointment.meeting_duration / 60)}h${selectedAppointment.meeting_duration % 60 ? ` ${selectedAppointment.meeting_duration % 60}m` : ''}`
                        : `${selectedAppointment.meeting_duration}m`}
                    </span>
                  )}
                  {selectedAppointment?.meeting_venue_area && (
                    <span className="detail-stat-chip">
                      <MapPin size={11} /> {selectedAppointment.meeting_venue_area}
                    </span>
                  )}
                  {selectedAppointment?.badge_status && (
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '4px 10px', borderRadius: 6, fontSize: 11, fontWeight: 700, background: '#dcfce7', color: '#15803d', border: '1px solid #bbf7d0' }}>
                      <Star size={10} /> {selectedAppointment.badge_status}
                    </span>
                  )}
                </div>
              </div>
            );
          })()}

          {isEditOpen ? (
            <EditDetailsForm
              appointment={selectedAppointment}
              onSave={handleEdit}
              onCancel={() => setEditOpen(false)}
              loading={actionLoading === 'edit'}
            />
          ) : (
            <>
              {/* ── OVERDUE BANNER ── */}
              {effectiveStatus(selectedAppointment, now) === 'overdue' && (
                <div className="mx-6 mt-4 p-4 rounded-xl bg-yellow-50 border border-yellow-300 flex items-start gap-3">
                  <AlarmClock size={18} className="text-yellow-600 flex-shrink-0 mt-0.5" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-yellow-900">Scheduled to end at {formatTime(selectedAppointment?.meeting_end_time)}</p>
                    <p className="text-xs text-yellow-700 mt-0.5 mb-3">How would you like to proceed?</p>
                    <div className="flex flex-wrap gap-2">
                      <Button size="sm" variant="outline" className="h-8 text-xs bg-green-50 border-green-300 text-green-800 hover:bg-green-100 font-semibold" disabled={!!actionLoading} onClick={handleEndMeeting}>
                        {actionLoading === 'end' ? <Loader2 size={12} className="animate-spin mr-1" /> : <CheckCircle size={12} className="mr-1" />} End Meeting
                      </Button>
                      <Button size="sm" variant="outline" className="h-8 text-xs font-semibold" disabled={!!actionLoading} onClick={() => handleExtend(15)}><Timer size={12} className="mr-1" />+15 min</Button>
                      <Button size="sm" variant="outline" className="h-8 text-xs font-semibold" disabled={!!actionLoading} onClick={() => handleExtend(30)}><Timer size={12} className="mr-1" />+30 min</Button>
                      <Button size="sm" variant="outline" className="h-8 text-xs font-semibold" disabled={!!actionLoading} onClick={() => setExtendOpen(true)}><Clock size={12} className="mr-1" />Custom</Button>
                    </div>
                  </div>
                </div>
              )}

              {/* Body */}
              <div className="flex" style={{ height: '65vh' }}>
                {/* ── LEFT CONTENT ── */}
                <ScrollArea className="flex-1 border-r border-slate-100 bg-white">
                  <div className="p-6 space-y-7">

                    {/* Agenda */}
                    <section>
                      <div className="detail-section-label"><ClipboardList size={11} /> Agenda</div>
                      <div className="p-4 rounded-xl bg-gradient-to-br from-slate-50 to-blue-50/30 border border-slate-100">
                        <p className="text-sm text-slate-600 italic leading-relaxed">"{selectedAppointment?.meeting_agenda || 'No agenda provided.'}"</p>
                      </div>
                    </section>

                    {/* Schedule */}
                    <section>
                      <div className="detail-section-label"><Calendar size={11} /> Schedule</div>
                      <div className="grid grid-cols-3 gap-3">
                        {/* Date tile */}
                        <div className="detail-info-card flex items-center gap-3">
                          <DateTile dateStr={selectedAppointment?.meeting_date} />
                          <div>
                            <p className="text-[9px] font-bold text-slate-400 uppercase tracking-tight">Date</p>
                            <p className="text-sm font-bold text-slate-900">{formatDate(selectedAppointment?.meeting_date, { day: '2-digit', month: 'short', year: 'numeric' })}</p>
                            <p className="text-xs text-slate-500">{formatDate(selectedAppointment?.meeting_date, { weekday: 'long' }, '')}</p>
                          </div>
                        </div>
                        {/* Time */}
                        <div className="detail-info-card">
                          <p className="text-[9px] font-bold text-slate-400 uppercase tracking-tight mb-1">Start → End</p>
                          <p className="text-lg font-black text-[#0057E7] leading-none tabular-nums">{formatTime(selectedAppointment?.meeting_start_time)}</p>
                          {selectedAppointment?.meeting_end_time && (
                            <p className="text-xs text-slate-500 mt-1 font-semibold">→ {formatTime(selectedAppointment.meeting_end_time)}</p>
                          )}
                        </div>
                        {/* Duration */}
                        <div className="detail-info-card flex flex-col justify-center">
                          <p className="text-[9px] font-bold text-slate-400 uppercase tracking-tight mb-1">Duration</p>
                          <p className="text-lg font-black text-slate-800 leading-none">
                            {selectedAppointment?.meeting_duration >= 60
                              ? `${Math.floor(selectedAppointment.meeting_duration / 60)}h${selectedAppointment.meeting_duration % 60 ? ` ${selectedAppointment.meeting_duration % 60}m` : ''}`
                              : `${selectedAppointment?.meeting_duration || '—'}m`}
                          </p>
                          {selectedAppointment?.venue_distance > 0 && (
                            <p className="text-[10px] text-slate-400 mt-1">+{selectedAppointment.venue_distance}m travel</p>
                          )}
                        </div>
                      </div>
                    </section>

                    {/* Client Info */}
                    <section>
                      <div className="detail-section-label"><User size={11} /> Client Information</div>
                      <div className="grid grid-cols-2 gap-3">
                        <DetailBox label="Full Name" value={selectedAppointment?.client_name} icon={<User size={11} />} />
                        <DetailBox label="Company" value={selectedAppointment?.client_company || 'Independent'} icon={<Building size={11} />} />
                        <DetailBox label="Mobile" value={selectedAppointment?.client_mobile} icon={<Phone size={11} />} />
                        <DetailBox label="Email" value={selectedAppointment?.client_email} icon={<Mail size={11} />} />
                      </div>
                    </section>

                    {/* Attendees */}
                    {selectedAttendees.length > 0 && (
                      <section>
                        <div className="detail-section-label"><Users size={11} /> BCL Attendees</div>
                        <div className="flex flex-wrap gap-2">
                          {selectedAttendees.map((att, i) => (
                            <div key={att.id || i} className="flex items-center gap-2 px-3 py-2 rounded-lg bg-slate-50 border border-slate-100 hover:border-slate-200 transition-colors">
                              <Avatar className="h-6 w-6"><AvatarFallback className="text-[9px] bg-gradient-to-br from-blue-500 to-indigo-600 text-white font-bold">{initials(att.name)}</AvatarFallback></Avatar>
                              <div className="min-w-0">
                                <span className="block text-xs font-semibold text-slate-700">{att.name}</span>
                                {att.email && <span className="block text-[10px] text-slate-400 truncate">{att.email}</span>}
                              </div>
                            </div>
                          ))}
                        </div>
                      </section>
                    )}

                    {/* Booking details */}
                    <section>
                      <div className="detail-section-label"><CalendarClock size={11} /> Booking Details</div>
                      <div className="grid grid-cols-3 gap-3">
                        <DetailBox label="Booking Date" value={formatDate(selectedAppointment?.booking_date, { day: '2-digit', month: 'short', year: 'numeric' })} />
                        <DetailBox label="Meeting Day" value={selectedAppointment?.meeting_day || formatDate(selectedAppointment?.meeting_date, { weekday: 'long' })} />
                        <DetailBox label="Badge Status" value={selectedAppointment?.badge_status} />
                        <DetailBox label="Distance" value={selectedAppointment?.venue_distance != null ? `${selectedAppointment.venue_distance} km` : undefined} />
                        <DetailBox label="Created By" value={selectedAppointment?.created_by} />
                        <DetailBox label="Booking Day" value={selectedAppointment?.booking_day} />
                      </div>
                    </section>

                    {/* Google Calendar */}
                    <section className='p-2'>
                      <div className="detail-section-label"><Cloud size={11} /> Google Calendar</div>
                      {/* Slot times row */}
                      {(selectedAppointment?.meeting_slot_start_time || selectedAppointment?.meeting_slot_end_time) && (
                        <div className="flex items-center gap-3 p-3 rounded-xl bg-slate-50 border border-slate-100">
                          <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wide w-24 flex-shrink-0">Calendar Slot</div>
                          <div className="flex items-center gap-2 text-xs font-semibold text-slate-600 tabular-nums">
                            <Clock size={11} className="text-slate-400" />
                            {formatTime(selectedAppointment.meeting_slot_start_time)} → {formatTime(selectedAppointment.meeting_slot_end_time)}
                          </div>
                        </div>
                      )}

                      <div className={cn("p-4 rounded-xl border flex items-start gap-3", selectedAppointment?.google_event_id ? "bg-green-50 border-green-200" : "bg-slate-50 border-slate-200")}>
                        <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0", selectedAppointment?.google_event_id ? "bg-green-100 text-green-700" : "bg-slate-200 text-slate-500")}>
                          {selectedAppointment?.google_event_id ? <Cloud size={18} /> : <CloudOff size={18} />}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className={cn("text-sm font-bold", selectedAppointment?.google_event_id ? "text-green-800" : "text-slate-700")}>
                            {selectedAppointment?.google_event_id ? 'Synced to Google Calendar' : 'Not synced to calendar'}
                          </p>
                          {selectedAppointment?.google_event_id && <p className="text-[11px] text-green-600 font-medium mt-0.5 truncate">ID: {selectedAppointment.google_event_id}</p>}
                          {selectedAppointment?.google_meet_link && (
                            <a href={selectedAppointment.google_meet_link} target="_blank" rel="noreferrer" className="text-[11px] text-blue-600 underline mt-1 block truncate">Join Google Meet</a>
                          )}
                        </div>
                      </div>
                    </section>

                    {selectedAppointment?.meeting_notes && (
                      <section>
                        <div className="detail-section-label"><FileText size={11} /> Notes</div>
                        <div className="p-4 rounded-xl bg-amber-50 border border-amber-100">
                          <p className="text-sm text-amber-800 leading-relaxed">{selectedAppointment.meeting_notes}</p>
                        </div>
                      </section>
                    )}
                  </div>
                </ScrollArea>
                      
                {/* ── RIGHT ACTIONS PANEL ── */}
                <div className="w-[260px] p-5 bg-slate-50/80 border-l border-slate-100 flex flex-col gap-4 overflow-y-auto">

                  {/* Venue card */}
                  <div>
                    <p className="text-[9px] font-extrabold text-slate-400 uppercase tracking-widest mb-2">Venue</p>
                    <div className={cn("p-3 rounded-xl border shadow-sm flex items-center gap-3 bg-white", selectedAppointment?.meeting_type === 'virtual' ? "border-indigo-100" : "border-sky-100")}>
                      <div className={cn("h-9 w-9 rounded-lg flex items-center justify-center shrink-0", selectedAppointment?.meeting_type === 'virtual' ? "bg-indigo-100 text-indigo-600" : "bg-sky-100 text-sky-600")}>
                        {selectedAppointment?.meeting_type === 'virtual' ? <Video size={16} /> : <MapPin size={16} />}
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-bold text-slate-900">{selectedAppointment?.meeting_type === 'virtual' ? 'Virtual' : 'In-person'}</p>
                        <p className="text-[11px] text-slate-500 truncate">{selectedAppointment?.meeting_venue_area || (selectedAppointment?.meeting_type === 'virtual' ? 'Online' : 'Venue TBC')}</p>
                      </div>
                    </div>
                  </div>

                  {(selectedAppointment?.google_meet_link || selectedAppointment?.meeting_link) && (
                    <Button asChild className="w-full bg-[#0057E7] text-white hover:bg-[#004bc7] border-none shadow-md text-xs h-9">
                      <a href={selectedAppointment.google_meet_link || selectedAppointment.meeting_link} target="_blank" rel="noreferrer">
                        <LinkIcon className="mr-2 h-3 w-3" /> Join Meeting <ArrowRight className="ml-auto h-3 w-3" />
                      </a>
                    </Button>
                  )}

                  <div className="space-y-1.5 pt-2 border-t border-slate-200">
                    <p className="text-[9px] font-extrabold text-slate-400 uppercase tracking-widest mb-3 flex items-center gap-1.5"><Zap size={10} /> Actions</p>

                    {['upcoming', 'pending', 'rescheduled'].includes(selectedAppointment?.status) && (
                      <ActionButton onClick={handleConfirm} loading={actionLoading === 'confirm'} icon={<UserCheck size={13} />} label="Confirm Meeting" className="bg-[#0057E7] hover:bg-[#004bc7] text-white border-none shadow-sm" />
                    )}

                    {selectedAppointment?.status !== 'completed' && (
                      <ActionButton onClick={handleMarkDone} loading={actionLoading === 'done'} icon={<CheckCircle size={13} />} label="Mark as Done" className="bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border-emerald-200" />
                    )}

                    <ActionButton onClick={openReschedule} icon={<RefreshCw size={13} />} label="Reschedule" />
                    <ActionButton onClick={() => setEditOpen(true)} icon={<Edit2 size={13} />} label="Edit Details" />

                    {selectedAppointment?.status !== 'canceled' && (
                      <ActionButton onClick={handleCancel} loading={actionLoading === 'cancel'} icon={<Ban size={13} />} label="Cancel Meeting" className="hover:bg-red-50 text-red-600 border-red-100" />
                    )}

                    <Separator className="my-2" />

                    {calendarConnectionStatus === 'connected' && (
                      selectedAppointment?.google_event_id
                        ? <ActionButton onClick={handleUnsync} loading={actionLoading === 'unsync'} icon={<CloudOff size={13} />} label="Remove from Calendar" className="hover:bg-red-50 text-red-500 border-red-100" />
                        : <ActionButton onClick={handleSyncToCalendar} loading={actionLoading === 'sync'} icon={<Cloud size={13} />} label="Sync to Calendar" className="hover:bg-blue-50 text-blue-600 border-blue-100" />
                    )}

                    <Separator className="my-2" />
                    <ActionButton onClick={() => setDeleteOpen(true)} icon={<Trash2 size={13} />} label="Delete Permanently" className="hover:bg-slate-100 text-slate-400 border-slate-200" />
                  </div>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* ── RESCHEDULE DIALOG ── */}
      <Dialog open={isRescheduleOpen} onOpenChange={o => { if (!o) { setRescheduleOpen(false); setRescheduleConflict(''); } }}>
        <DialogContent className="max-w-lg bg-white border-slate-200 text-slate-900 shadow-xl rounded-xl">
          <DialogHeader>
            <DialogTitle className="text-[#0057E7] font-bold flex items-center gap-2">
              <RefreshCw size={16} /> Reschedule Meeting
            </DialogTitle>
            {selectedAppointment && (
              <p className="text-xs text-slate-500 font-medium mt-1">
                {selectedAppointment.client_name} · Currently {formatDate(selectedAppointment.meeting_date, { day: '2-digit', month: 'short', year: 'numeric' })} at {formatTime(selectedAppointment.meeting_start_time)}
              </p>
            )}
          </DialogHeader>
          <div className="rsch-grid py-2">
            <div className="rsch-full">
              <label className="rsch-label">New Meeting Date *</label>
              <Input type="date" className="bg-slate-50 border-slate-200" value={rescheduleData.meeting_date} onChange={e => { setRescheduleData(p => ({ ...p, meeting_date: e.target.value })); setRescheduleConflict(''); }} />
            </div>
            <div>
              <label className="rsch-label">Start Time *</label>
              <Input type="time" className="bg-slate-50 border-slate-200" value={rescheduleData.meeting_start_time} onChange={e => handleRschdStartTime(e.target.value)} />
            </div>
            <div>
              <label className="rsch-label">Duration</label>
              <Select value={rescheduleData.meeting_duration} onValueChange={handleRschdDuration}>
                <SelectTrigger className="bg-slate-50 border-slate-200"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {[['15', '15 min'], ['30', '30 min'], ['45', '45 min'], ['60', '1 hour'], ['90', '1.5 hrs'], ['120', '2 hrs'], ['180', '3 hrs'], ['240', '4 hrs'], ['300', '5 hrs']].map(([v, l]) => <SelectItem key={v} value={v}>{l}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="rsch-label">End Time (calc.)</label>
              <Input className="rsch-read bg-slate-50 border-slate-200" readOnly value={rescheduleData.meeting_end_time || '—'} />
            </div>
            <div>
              <label className="rsch-label">Travel Time</label>
              <Select value={rescheduleData.venue_distance} onValueChange={handleRschdTravel}>
                <SelectTrigger className="bg-slate-50 border-slate-200"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {[['0', '0 min (Virtual)'], ['10', '10 min'], ['15', '15 min'], ['30', '30 min'], ['45', '45 min'], ['60', '1 hour'], ['90', '1.5 hrs'], ['120', '2 hrs']].map(([v, l]) => <SelectItem key={v} value={v}>{l}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="rsch-label">Calendar Slot Start</label>
              <Input className="rsch-read bg-slate-50 border-slate-200" readOnly value={rescheduleData.meeting_slot_start_time || '—'} />
            </div>
            <div>
              <label className="rsch-label">Calendar Slot End</label>
              <Input className="rsch-read bg-slate-50 border-slate-200" readOnly value={rescheduleData.meeting_slot_end_time || '—'} />
            </div>
            <div>
              <label className="rsch-label">Meeting Type</label>
              <Select value={rescheduleData.meeting_type} onValueChange={v => setRescheduleData(p => ({ ...p, meeting_type: v }))}>
                <SelectTrigger className="bg-slate-50 border-slate-200"><SelectValue /></SelectTrigger>
                <SelectContent><SelectItem value="inPerson">In-Person</SelectItem><SelectItem value="virtual">Virtual</SelectItem></SelectContent>
              </Select>
            </div>
            <div>
              <label className="rsch-label">Venue / Area</label>
              <Input className="bg-slate-50 border-slate-200" placeholder="e.g. BCL Boardroom" value={rescheduleData.meeting_venue_area} onChange={e => setRescheduleData(p => ({ ...p, meeting_venue_area: e.target.value }))} />
            </div>
            <div className="rsch-full">
              <label className="rsch-label">Agenda</label>
              <Textarea rows={2} className="bg-slate-50 border-slate-200" value={rescheduleData.meeting_agenda} onChange={e => setRescheduleData(p => ({ ...p, meeting_agenda: e.target.value }))} />
            </div>
            {calendarConnectionStatus === 'connected' && (
              <div className="rsch-full text-[11px] font-semibold text-blue-700 bg-blue-50 border border-blue-100 rounded-lg px-3 py-2 flex items-center gap-2">
                <Cloud size={12} /> Calendar will be updated automatically.
              </div>
            )}
            {rescheduleConflict && (
              <div className="rsch-full rsch-conflict"><AlertCircle size={14} /> {rescheduleConflict}</div>
            )}
          </div>
          <DialogFooter className="bg-slate-50 -m-6 mt-2 p-4 flex gap-2">
            <Button variant="ghost" className="text-slate-500 font-semibold" onClick={() => { setRescheduleOpen(false); setRescheduleConflict(''); }}>Cancel</Button>
            <Button onClick={handleReschedule} disabled={!!actionLoading || !rescheduleData.meeting_date || !rescheduleData.meeting_start_time} className="bg-[#0057E7] hover:bg-[#004bc7] text-white">
              {actionLoading === 'reschedule' ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Rescheduling…</> : <><RefreshCw className="mr-2 h-4 w-4" /> Confirm Reschedule</>}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── EXTEND CUSTOM DURATION DIALOG ── */}
      <Dialog open={extendOpen} onOpenChange={o => { setExtendOpen(o); if (!o) setPendingExtension(null); }}>
        <DialogContent className="max-w-sm bg-white border-slate-200 text-slate-900 shadow-xl rounded-xl">
          <DialogHeader>
            <DialogTitle className="text-yellow-700 font-bold flex items-center gap-2"><Timer size={16} /> Extend Meeting</DialogTitle>
            {selectedAppointment && <p className="text-xs text-slate-500 mt-1">Current end: <strong>{formatTime(selectedAppointment.meeting_end_time)}</strong></p>}
          </DialogHeader>
          <div className="py-4 space-y-4">
            <div className="grid grid-cols-3 gap-2">
              {[15, 30, 45].map(m => (
                <Button key={m} variant="outline" className="h-10 text-sm font-bold" onClick={() => setCustomExtendMins(String(m))}>+{m} min</Button>
              ))}
            </div>
            <div className="space-y-1.5">
              <Label className="text-[10px] font-extrabold uppercase tracking-widest text-slate-400">Custom (minutes)</Label>
              <Input type="number" min="5" max="480" step="5" className="bg-slate-50 border-slate-200" value={customExtendMins} onChange={e => setCustomExtendMins(e.target.value)} />
            </div>
            {selectedAppointment?.meeting_end_time && customExtendMins && (
              <p className="text-xs text-slate-500 font-medium">New end time: <strong className="text-slate-900">{addMinutesToTime(selectedAppointment.meeting_end_time, Number(customExtendMins))}</strong></p>
            )}
          </div>
          <DialogFooter className="bg-slate-50 -m-6 mt-2 p-4 flex gap-2">
            <Button variant="ghost" className="text-slate-500" onClick={() => { setExtendOpen(false); setPendingExtension(null); }}>Cancel</Button>
            <Button disabled={!!actionLoading || !customExtendMins || Number(customExtendMins) < 1} className="bg-yellow-600 hover:bg-yellow-700 text-white" onClick={() => handleExtend(Number(customExtendMins))}>
              {actionLoading === 'extend' ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Timer className="mr-2 h-4 w-4" />} Extend
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── CONFLICT RESOLUTION MODAL ── */}
      <Dialog open={conflictModalOpen} onOpenChange={o => { if (!o) { setConflictModalOpen(false); setPendingExtension(null); } }}>
        <DialogContent className="max-w-lg bg-white border-slate-200 text-slate-900 shadow-xl rounded-xl">
          <DialogHeader>
            <DialogTitle className="text-orange-700 font-bold flex items-center gap-2"><AlertCircle size={16} /> Schedule Conflict Detected</DialogTitle>
            <p className="text-xs text-slate-500 mt-1 font-medium">Extending this meeting will overlap with {conflictingMeetings.length} other meeting{conflictingMeetings.length > 1 ? 's' : ''}.</p>
          </DialogHeader>
          <div className="space-y-2 py-2 max-h-[40vh] overflow-y-auto">
            {cascadeProposal.map(({ meeting, newStart, newEnd }) => (
              <div key={meeting.id_main} className="rounded-lg border border-orange-200 bg-orange-50 p-3">
                <div className="flex items-center justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-sm font-bold text-slate-900 truncate">{meeting.client_name}</p>
                    <p className="text-xs text-slate-500">{meeting.client_company || '—'}</p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="text-xs text-slate-500 line-through">{formatTime(meeting.meeting_start_time)} – {formatTime(meeting.meeting_end_time)}</p>
                    <div className="flex items-center gap-1 justify-end text-xs font-semibold text-orange-800"><MoveRight size={12} />{formatTime(newStart)} – {formatTime(newEnd)}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
          {pendingExtension && (
            <p className="text-xs text-slate-500 bg-slate-50 rounded-lg p-3 border border-slate-200">
              <strong>Auto-Move</strong> will extend the current meeting to <strong>{pendingExtension.newEndTime}</strong> and shift each conflicting meeting forward.
            </p>
          )}
          <DialogFooter className="bg-slate-50 -m-6 mt-2 p-4 flex flex-col gap-2">
            <div className="flex gap-2 w-full">
              <Button variant="outline" className="flex-1 text-xs" onClick={() => { setConflictModalOpen(false); setPendingExtension(null); }}>Cancel Extension</Button>
              <Button variant="outline" className="flex-1 text-xs bg-green-50 border-green-300 text-green-800 hover:bg-green-100 font-semibold" disabled={!!actionLoading} onClick={handleEndMeeting}>
                {actionLoading === 'end' ? <Loader2 size={12} className="animate-spin mr-1" /> : <CheckCircle size={12} className="mr-1" />} End Meeting Instead
              </Button>
            </div>
            <Button disabled={!!actionLoading} className="w-full bg-orange-600 hover:bg-orange-700 text-white font-bold" onClick={applyAutoMove}>
              {actionLoading === 'automove' ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <MoveRight className="mr-2 h-4 w-4" />}
              Auto-Move Conflicting Meeting{cascadeProposal.length > 1 ? 's' : ''}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── DELETE CONFIRM ── */}
      <AlertDialog open={isDeleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent className="bg-white border-slate-200 text-slate-900 rounded-xl shadow-xl">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-red-600 font-bold">Delete Meeting Permanently?</AlertDialogTitle>
            <AlertDialogDescription className="text-slate-500 font-medium">
              You are about to remove the meeting with <strong className="text-slate-900">{selectedAppointment?.client_name}</strong>. This action is irreversible.
              {selectedAppointment?.google_event_id && <span className="block mt-2 text-orange-600 font-semibold">This meeting is synced to Google Calendar and will be removed from it too.</span>}
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

// ── SHARED SUB-COMPONENTS ─────────────────────────────────────────

const SectionHeader = ({ icon, label }: { icon?: React.ReactNode; label: string }) => (
  <p className="flex items-center gap-1.5 text-[10px] font-extrabold text-slate-400 uppercase tracking-widest">{icon} {label}</p>
);

const DetailBox = ({ label, value, icon }: { label: string; value?: string; icon?: React.ReactNode }) => (
  <div className="detail-info-card">
    <p className="text-[9px] font-bold text-slate-400 uppercase tracking-tight flex items-center gap-1">{icon}{label}</p>
    <p className="text-xs font-semibold text-slate-700 mt-1 truncate">{value || '—'}</p>
  </div>
);

const FormItem = ({ label, children, className }: { label: string; children: React.ReactNode; className?: string }) => (
  <div className={cn("space-y-1.5", className)}>
    <Label className="text-[10px] font-extrabold uppercase tracking-widest text-slate-400">{label}</Label>
    {children}
  </div>
);

const ActionButton = ({ onClick, loading, icon, label, className }: any) => (
  <Button onClick={onClick} disabled={loading} variant="outline" className={cn("w-full justify-start gap-2 h-9 text-xs font-bold border-slate-200 bg-white hover:bg-slate-50 text-slate-600 transition-all", className)}>
    {loading ? <Loader2 size={13} className="animate-spin" /> : icon}
    {label}
  </Button>
);

export default Dashboard;