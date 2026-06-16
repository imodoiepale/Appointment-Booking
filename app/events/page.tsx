// @ts-nocheck
'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Toaster } from '@/components/ui/toaster';
import { useToast } from '@/hooks/use-toast';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import {
  Calendar, Clock, MapPin, Loader2,
  ChevronLeft, ChevronRight, Search, MoreHorizontal, Plus, Download,
  Table2, LayoutGrid, Building, Cloud, CloudOff,
  ChevronUp, ChevronDown, ChevronsUpDown,
  Hash, RefreshCw, AlertCircle,
} from 'lucide-react';
import { DataTable } from '@/components/shared/DataTable';
import type { ColumnDef } from '@/components/shared/DataTable';
import { cn } from '@/lib/utils';
import {
  getEventTypeConfig, EventTypeIcon, EVENT_TYPE_CONFIG,
  sortItems, SortConfig,
  EVENT_TYPES,
} from '@/utils/appointmentStyles';
import { MEETING_STATUSES } from '@/utils/appointmentStatuses';
import { formatDate } from '../../utils/format';
import { formatTime, safeInitials, StatusPill, resolveAttendeeNames } from './components/eventShared';
import { EventDetailDialog } from './components/EventDetailDialog';
import { DeleteEventDialog } from './components/DeleteEventDialog';
import { BLANK_FORM } from './components/EventFormFields';
import { EventFormDialog } from './components/EventFormDialog';

// ── TYPES ────────────────────────────────────────────────────────────────────
interface BclEvent {
  id: number;
  event_name: string;
  event_type: string;
  event_date: string;
  event_day?: string;
  event_start_time: string;
  event_end_time: string;
  event_duration?: number;
  event_slot_start_time?: string;
  event_slot_end_time?: string;
  venue_distance?: number;
  event_format?: 'virtual' | 'physical';
  virtual_meeting_mode?: 'hosted' | 'external' | null;
  meeting_link?: string;
  meeting_id?: string;
  google_meet_link?: string;
  event_venue?: string;
  event_venue_area?: string;
  event_description?: string;
  organizer_name?: string;
  organizer_company?: string;
  organizer_email?: string;
  organizer_mobile?: string;
  bcl_attendee?: string[];
  bcl_attendee_names?: string[];
  expected_attendees?: number;
  status?: string;
  badge_status?: string;
  google_event_id?: string;
  created_by?: string;
}

const STATUSES = MEETING_STATUSES.map(s => s.value);

function addMins(time: string, mins: number): string {
  if (!time) return '';
  const [h, m] = time.split(':').map(Number);
  const t = h * 60 + m + mins;
  return `${String(Math.floor(t / 60) % 24).padStart(2, '0')}:${String(t % 60).padStart(2, '0')}`;
}

function calcSlot(base: string, offset: number): string {
  if (!base) return '';
  const [h, m] = base.split(':').map(Number);
  const d = new Date(); d.setHours(h, m + offset, 0, 0);
  return d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
}

// ── STYLES ───────────────────────────────────────────────────────────────────
const EventsStyles = () => (
  <style>{`
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');
    .ev-shell { font-family:'Inter',sans-serif; background:#f4f7f8; min-height:100vh; padding:16px 20px; }
    .ev-header { margin-bottom:16px; display:flex; align-items:center; justify-content:space-between; flex-wrap:wrap; gap:12px; }
    .ev-title { font-size:18px; font-weight:800; color:#1d4ed8; letter-spacing:-0.02em; }
    .ev-subtitle { font-size:12px; color:#64868c; margin-top:2px; }
    .ev-btn-primary { display:inline-flex;align-items:center;gap:6px;padding:8px 16px;font-size:13px;font-weight:700;border-radius:8px;border:none;background:hsl(var(--primary));color:hsl(var(--primary-foreground));cursor:pointer;box-shadow:0 4px 14px hsl(var(--primary) / .22);transition:all .2s ease; }
    .ev-btn-primary:hover { transform:translateY(-1px);background:hsl(var(--primary) / .92);box-shadow:0 6px 18px hsl(var(--primary) / .3); }
    .ev-btn-outline { display:inline-flex;align-items:center;gap:6px;padding:7px 14px;font-size:12px;font-weight:600;border-radius:8px;border:1px solid hsl(var(--border));background:hsl(var(--card));color:hsl(var(--foreground));cursor:pointer;transition:all .15s ease; }
    .ev-btn-outline:hover { background:hsl(var(--secondary));border-color:hsl(var(--ring) / .35); }
    .ev-panel { background:#fff;border-radius:12px;border:1px solid #eef2f3;overflow:hidden;box-shadow:0 18px 45px rgba(0,48,56,.08); }
    .ev-toolbar { display:flex;align-items:center;flex-wrap:wrap;gap:0;border-bottom:1px solid #eef2f3;background:#f7fafa; }
    .ev-tabs { display:flex;padding:10px 12px;gap:2px; }
    .ev-tab { padding:7px 14px;font-size:12px;font-weight:700;border-radius:7px;border:1px solid transparent;background:transparent;color:hsl(var(--muted-foreground));cursor:pointer;transition:all .15s ease;text-transform:capitalize; }
    .ev-tab:hover { color:hsl(var(--foreground));background:hsl(var(--secondary)); }
    .ev-tab.active { background:hsl(var(--card));color:hsl(var(--primary));border-color:hsl(var(--border));box-shadow:0 1px 4px rgba(0,0,0,.06); }
    .ev-tab.active.tab-upcoming,
    .ev-tab.active.tab-confirmed,
    .ev-tab.active.tab-completed,
    .ev-tab.active.tab-cancelled { color:hsl(var(--primary)); }
    .ev-toolbar-right { flex:1;display:flex;align-items:center;gap:10px;padding:10px 12px;justify-content:flex-end; }
    .ev-search-wrap { position:relative;flex:1;max-width:320px; }
    .ev-search-icon { position:absolute;left:11px;top:50%;transform:translateY(-50%);color:#8ca4a8;pointer-events:none; }
    .ev-search { width:100%;height:36px;padding:0 12px 0 34px;font-size:13px;font-weight:500;font-family:'Inter',sans-serif;border:1px solid #e2e8e9;border-radius:8px;background:#fff;color:#1d4ed8;outline:none;transition:all .15s ease; }
    .ev-search:focus { border-color:#00d1d1;box-shadow:0 0 0 3px rgba(0,209,209,.12); }
    .ev-search::placeholder { color:#8ca4a8; }
    .ev-view-toggle { display:flex;background:hsl(var(--secondary));border-radius:8px;padding:3px;gap:2px; }
    .ev-view-btn { display:flex;align-items:center;gap:5px;padding:5px 10px;font-size:11px;font-weight:700;border-radius:5px;border:none;cursor:pointer;color:hsl(var(--muted-foreground));background:transparent;transition:all .15s ease; }
    .ev-view-btn:hover { color:hsl(var(--foreground)); }
    .ev-view-btn.active { background:hsl(var(--card));color:hsl(var(--primary));box-shadow:0 1px 3px rgba(0,0,0,.08); }
    /* table */
    .ev-table-wrap { overflow-x:auto;padding:12px;background:#fff; }
    .ev-table { width:100%;border-collapse:collapse; }
    .ev-table th { padding:8px 14px;text-align:left;font-size:9px;font-weight:700;text-transform:uppercase;letter-spacing:.07em;color:#8ca4a8;background:#f7fafa;border:1px solid #e2e8e9;white-space:nowrap; }
    .ev-table td { padding:10px 14px;border:1px solid #e8eef0;vertical-align:middle; }
    .ev-table tr:last-child td { border-bottom:1px solid #e8eef0; }
    .ev-table tr { cursor:pointer;transition:background .12s ease; }
    .ev-table tbody tr:nth-child(even) td { background:#f7fafb; }
    .ev-table tr:hover td { background:#eef5f6 !important; }
    .ev-cell-main { font-size:13px;font-weight:700;color:#1d4ed8;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:200px; }
    .ev-cell-sub { font-size:11px;color:#8ca4a8;margin-top:2px; }
    .ev-cell-date { font-size:12px;font-weight:700;color:#1d4ed8;white-space:nowrap; }
    .ev-cell-time { font-size:12px;font-weight:600;color:#64868c;display:flex;align-items:center;gap:5px;white-space:nowrap; }
    .ev-type-icon { width:36px;height:36px;border-radius:9px;display:flex;align-items:center;justify-content:center;flex-shrink:0; }
    .ev-row-actions { display:flex;align-items:center;gap:4px;opacity:0;transition:opacity .15s ease; }
    .ev-table tr:hover .ev-row-actions { opacity:1; }
    .ev-row-btn { width:28px;height:28px;border-radius:7px;border:none;display:flex;align-items:center;justify-content:center;cursor:pointer;transition:all .12s ease;background:transparent;color:hsl(var(--muted-foreground)); }
    .ev-row-btn:hover { background:hsl(var(--secondary));color:hsl(var(--foreground)); }
    /* cards */
    .ev-cards-grid { display:grid;grid-template-columns:repeat(auto-fill,minmax(260px,1fr));gap:14px;padding:16px;background:#f7fafa; }
    .ev-card { background:#fff;border-radius:12px;border:1px solid #eef2f3;cursor:pointer;transition:all .2s ease;overflow:hidden;border-left:3px solid transparent; }
    .ev-card:hover { box-shadow:0 6px 20px rgba(0,48,56,.1);transform:translateY(-2px);border-color:#d0dfe1; }
    .ev-card-body { padding:14px 16px; }
    .ev-card-type-badge { display:inline-flex;align-items:center;gap:5px;padding:3px 9px;border-radius:5px;font-size:10px;font-weight:700;margin-bottom:10px; }
    .ev-card-name { font-size:14px;font-weight:800;color:#1d4ed8;margin-bottom:3px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap; }
    .ev-card-organizer { font-size:11px;color:#8ca4a8;display:flex;align-items:center;gap:4px;margin-bottom:12px; }
    .ev-card-info-row { display:flex;align-items:center;justify-content:space-between;background:#f7fafa;border-radius:8px;border:1px solid #eef2f3;padding:10px 12px;margin-bottom:8px; }
    .ev-card-footer { display:flex;align-items:center;justify-content:space-between;padding:9px 16px;background:#f7fafa;border-top:1px solid #eef2f3; }
    /* pagination */
    .ev-pagination { display:flex;align-items:center;justify-content:space-between;padding:12px 16px;border-top:1px solid #eef2f3; }
    .ev-pagination-info { font-size:12px;font-weight:600;color:#8ca4a8; }
    .ev-pagination-info b { color:#1d4ed8;font-weight:700; }
    .ev-page-btns { display:flex;align-items:center;gap:4px; }
    .ev-page-btn { width:30px;height:30px;border-radius:7px;border:1px solid hsl(var(--border));background:hsl(var(--card));color:hsl(var(--muted-foreground));display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:700;cursor:pointer;transition:all .12s ease; }
    .ev-page-btn:hover:not(:disabled) { background:hsl(var(--primary));color:hsl(var(--primary-foreground));border-color:hsl(var(--primary)); }
    .ev-page-btn.active { background:hsl(var(--primary));color:hsl(var(--primary-foreground));border-color:transparent;box-shadow:0 2px 8px hsl(var(--primary) / .25); }
    .ev-page-btn:disabled { opacity:.35;cursor:not-allowed; }
    /* dialog */
    .ev-dialog { border-radius:14px !important;border:1px solid #eef2f3 !important;overflow:hidden;box-shadow:0 20px 60px rgba(0,48,56,.15) !important; }
    .ev-dialog-header { padding:20px 24px;border-bottom:1px solid #eef2f3; }
    .ev-dialog-body { display:grid;grid-template-columns:1fr;max-height:55vh;overflow:hidden; }
    @media(min-width:768px){.ev-dialog-body{grid-template-columns:7fr 5fr;}}
    .ev-dialog-left { padding:20px 24px;overflow-y:auto; }
    .ev-dialog-right { padding:20px 24px;background:#f7fafa;border-top:1px solid #eef2f3;overflow-y:auto; }
    @media(min-width:768px){.ev-dialog-right{border-top:none;border-left:1px solid #eef2f3;}}
    .ev-section-label { font-size:9px;font-weight:700;text-transform:uppercase;letter-spacing:.07em;color:#8ca4a8;margin-bottom:10px;margin-top:18px; }
    .ev-section-label:first-child { margin-top:0; }
    .ev-desc-box { font-size:13px;font-weight:500;color:#64868c;background:#f7fafa;border:1px solid #eef2f3;border-radius:10px;padding:14px 16px;line-height:1.6;white-space:pre-wrap; }
    .ev-meta-grid { display:grid;grid-template-columns:1fr 1fr;gap:14px 20px; }
    .ev-meta-label { font-size:9px;font-weight:700;text-transform:uppercase;letter-spacing:.06em;color:#8ca4a8;margin-bottom:4px; }
    .ev-meta-value { font-size:13px;font-weight:700;color:#1d4ed8; }
    .ev-meta-value a { color:#00a3a3;text-decoration:none; }
    .ev-meta-value a:hover { text-decoration:underline; }
    .ev-contact-box { background:#fff;border-radius:10px;border:1px solid #eef2f3;overflow:hidden; }
    .ev-contact-row { display:flex;align-items:center;justify-content:space-between;padding:10px 14px;border-bottom:1px solid #f5f8f9; }
    .ev-contact-row:last-child { border-bottom:none; }
    .ev-contact-label { font-size:11px;font-weight:600;color:#8ca4a8; }
    .ev-contact-value { font-size:12px;font-weight:700;color:#1d4ed8; }
    .ev-sync-box { border-radius:10px;border:1px solid;display:flex;align-items:flex-start;gap:10px;padding:12px 14px; }
    .ev-sync-icon { width:34px;height:34px;border-radius:8px;display:flex;align-items:center;justify-content:center;flex-shrink:0; }
    .ev-dialog-footer { display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:8px;padding:12px 18px;border-top:1px solid #eef2f3;background:#fff; }
    .ev-action-group { display:flex;align-items:center;gap:6px;flex-wrap:wrap; }
    .ev-action-btn { display:inline-flex;align-items:center;gap:5px;padding:6px 12px;font-size:11px;font-weight:700;border-radius:7px;border:1px solid;cursor:pointer;transition:all .15s ease;font-family:'Inter',sans-serif;white-space:nowrap; }
    .ev-action-btn:disabled { opacity:.5;cursor:not-allowed; }
    .ev-action-confirm { background:hsl(var(--primary));color:hsl(var(--primary-foreground));border-color:hsl(var(--primary)); }
    .ev-action-confirm:hover:not(:disabled) { background:hsl(var(--primary) / .92); }
    .ev-action-done { background:hsl(var(--primary));color:hsl(var(--primary-foreground));border-color:transparent;box-shadow:0 2px 8px hsl(var(--primary) / .22); }
    .ev-action-done:hover:not(:disabled) { box-shadow:0 4px 14px hsl(var(--primary) / .3); }
    .ev-action-neutral { background:hsl(var(--card));color:hsl(var(--muted-foreground));border-color:hsl(var(--border)); }
    .ev-action-neutral:hover:not(:disabled) { background:hsl(var(--secondary));color:hsl(var(--foreground));border-color:hsl(var(--ring) / .35); }
    .ev-action-danger { background:hsl(var(--destructive) / .08);color:hsl(var(--destructive));border-color:hsl(var(--destructive) / .24); }
    .ev-action-danger:hover:not(:disabled) { background:hsl(var(--destructive) / .14); }
    .ev-action-close { background:transparent;color:hsl(var(--muted-foreground));border-color:transparent; }
    .ev-action-close:hover { background:hsl(var(--secondary));color:hsl(var(--foreground));border-color:hsl(var(--border)); }
    /* form dialog */
    .ev-form-dialog { border-radius:14px !important;border:1px solid #eef2f3 !important;background:#fff !important;box-shadow:0 16px 48px rgba(0,48,56,.12) !important; }
    .ev-form-title { font-size:16px;font-weight:800;color:#1d4ed8;display:flex;align-items:center;gap:8px; }
    .ev-field-label { font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.06em;color:#8ca4a8;display:block;margin-bottom:6px; }
    .ev-input { width:100%;height:38px;padding:0 12px;font-size:13px;font-weight:500;font-family:'Inter',sans-serif;border:1px solid #e2e8e9;border-radius:8px;background:#fff;color:#1d4ed8;outline:none;transition:all .15s ease;box-sizing:border-box; }
    .ev-input:focus { border-color:#00d1d1;box-shadow:0 0 0 3px rgba(0,209,209,.12); }
    .ev-textarea { width:100%;padding:10px 12px;min-height:80px;font-size:13px;font-weight:500;font-family:'Inter',sans-serif;border:1px solid #e2e8e9;border-radius:8px;background:#fff;color:#1d4ed8;outline:none;resize:vertical;transition:all .15s ease;box-sizing:border-box; }
    .ev-textarea:focus { border-color:#00d1d1;box-shadow:0 0 0 3px rgba(0,209,209,.12); }
    .ev-select-trigger { width:100%;height:38px;padding:0 12px;font-size:13px;font-weight:500;font-family:'Inter',sans-serif;border:1px solid #e2e8e9;border-radius:8px;background:#fff;color:#1d4ed8; }
    .ev-form-footer { display:flex;gap:8px;margin-top:20px; }
    .ev-form-cancel { flex:1;height:38px;border-radius:8px;border:1px solid hsl(var(--border));background:hsl(var(--secondary));color:hsl(var(--muted-foreground));font-size:13px;font-weight:700;cursor:pointer;font-family:'Inter',sans-serif;transition:all .15s ease; }
    .ev-form-cancel:hover { background:hsl(var(--accent));color:hsl(var(--foreground)); }
    .ev-form-submit { flex:1;height:38px;border-radius:8px;border:none;background:hsl(var(--primary));color:hsl(var(--primary-foreground));font-size:13px;font-weight:700;cursor:pointer;font-family:'Inter',sans-serif;box-shadow:0 3px 10px hsl(var(--primary) / .22);transition:all .2s ease; }
    .ev-form-submit:hover:not(:disabled) { box-shadow:0 5px 14px hsl(var(--primary) / .3); }
    .ev-form-submit:disabled { opacity:.55;cursor:not-allowed; }
    .ev-empty { padding:60px 20px;text-align:center;color:#8ca4a8; }
    .ev-empty-icon { width:48px;height:48px;border-radius:12px;background:#f0f4f5;margin:0 auto 12px;display:flex;align-items:center;justify-content:center; }
    .ev-empty-title { font-size:14px;font-weight:700;color:#64868c;margin-bottom:4px; }
    .ev-empty-sub { font-size:12px;color:#8ca4a8; }
    .ev-delete-dialog { border-radius:14px !important;border:1px solid #eef2f3 !important;background:#fff !important;box-shadow:0 16px 48px rgba(0,48,56,.12) !important;max-width:380px !important; }
    .cal-status { display:flex;align-items:center;gap:7px;padding:7px 13px;border-radius:8px;border:1px solid #eef2f3;background:#fff;font-size:11px;font-weight:700;color:#64868c; }
    .cal-dot { width:8px;height:8px;border-radius:50%; }
    .cal-dot-connected { background:#22c55e;box-shadow:0 0 0 3px rgba(34,197,94,.2); }
    .cal-dot-disconnected { background:#ef4444;box-shadow:0 0 0 3px rgba(239,68,68,.2); }
  `}</style>
);

// ── EVENT CARD ───────────────────────────────────────────────────────────────
const EventCard = ({ event, onClick }: { event: BclEvent; onClick: () => void }) => {
  const col = getEventTypeConfig(event.event_type);
  const typeLabel = EVENT_TYPES.find(t => t.value === event.event_type)?.label ?? event.event_type;
  return (
    <div className="ev-card" style={{ borderLeftColor: col.bg }} onClick={onClick}>
      <div className="ev-card-body">
        <div className="ev-card-type-badge" style={{ background: col.light, color: col.bg }}>
          <EventTypeIcon type={event.event_type} size={11} />
          {typeLabel}
        </div>
        <div className="ev-card-name">{event.event_name}</div>
        <div className="ev-card-organizer">
          <Building size={11} />
          {event.organizer_name || 'No organizer'}
          {event.organizer_company ? ` · ${event.organizer_company}` : ''}
        </div>
        <div className="ev-card-info-row">
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 30, height: 30, borderRadius: 7, background: '#eef2f3', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Calendar size={14} style={{ color: '#64868c' }} />
            </div>
            <div>
              <div style={{ fontSize: 12, fontWeight: 700, color: '#1d4ed8' }}>
                {formatDate(event.event_date, { day: '2-digit', month: '2-digit', year: 'numeric' })}
              </div>
            </div>
          </div>
          <div>
            <div style={{ fontSize: 12, fontWeight: 700, color: '#1d4ed8', textAlign: 'right' }}>{formatTime(event.event_start_time)}</div>
            {event.event_duration && <div style={{ fontSize: 9, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: '#8ca4a8', textAlign: 'right', marginTop: 2 }}>{event.event_duration}m</div>}
          </div>
        </div>
        {event.event_venue_area && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: '#8ca4a8', padding: '0 2px' }}>
            <MapPin size={12} />{event.event_venue_area}
          </div>
        )}
      </div>
      <div className="ev-card-footer">
        <div style={{ fontSize: 10, fontWeight: 700, color: '#8ca4a8', display: 'flex', alignItems: 'center', gap: 4 }}>
          <Hash size={10} />{event.id}
        </div>
        <StatusPill status={event.status ?? 'upcoming'} />
      </div>
    </div>
  );
};

// ── MAIN PAGE ────────────────────────────────────────────────────────────────
const EventsContent = () => {
  const router = useRouter();
  const { toast } = useToast();
  const notify = {
    success: (title: string, desc?: string) => toast({ title, description: desc }),
    error: (title: string, desc?: string) => toast({ variant: 'destructive', title, description: desc }),
  };

  const [events, setEvents] = useState<BclEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('upcoming');
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<'table' | 'cards'>('table');
  const [currentPage, setCurrentPage] = useState(0);
  const ITEMS_PER_PAGE = 12;

  const [selectedEvent, setSelectedEvent] = useState<BclEvent | null>(null);
  const [deletingEvent, setDeletingEvent] = useState<BclEvent | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [actionLoading, setActionLoading] = useState('');
  const [calStatus, setCalStatus] = useState('checking');

  const [isCreateOpen, setCreateOpen] = useState(false);
  const [isEditOpen, setEditOpen] = useState(false);
  const [createForm, setCreateForm] = useState({ ...BLANK_FORM });
  const [editForm, setEditForm] = useState({ ...BLANK_FORM });
  const [isSubmitting, setSubmitting] = useState(false);

  // Current user + admin flag
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [currentUserEmail, setCurrentUserEmail] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);

  // BCL Attendees
  const [bclAttendeesList, setBclAttendeesList] = useState<{ id: string; displayName: string }[]>([]);
  const [loadingBclAttendees, setLoadingBclAttendees] = useState(true);
  const [createAttendeeOpen, setCreateAttendeeOpen] = useState(false);
  const [editAttendeeOpen, setEditAttendeeOpen] = useState(false);

  // Reschedule state
  const [isRescheduleOpen, setRescheduleOpen] = useState(false);
  const [rescheduleConflict, setRescheduleConflict] = useState('');
  const [rescheduleData, setRescheduleData] = useState({
    event_date: '', event_start_time: '', event_duration: '60',
    event_end_time: '', event_slot_start_time: '', event_slot_end_time: '',
    venue_distance: '10',
  });

  const bclUsersById = useMemo(
    () => Object.fromEntries(bclAttendeesList.map(u => [String(u.id), u.displayName])),
    [bclAttendeesList]
  );

  const [sortConfig, setSortConfig] = useState<SortConfig | null>({ key: 'event_date', dir: 'asc' });

  const toggleSort = (key: string) => {
    setSortConfig(prev =>
      prev?.key === key
        ? { key, dir: prev.dir === 'asc' ? 'desc' : 'asc' }
        : { key, dir: 'asc' }
    );
  };

  const SortIcon = ({ colKey }: { colKey: string }) => {
    if (sortConfig?.key !== colKey) return <ChevronsUpDown size={11} style={{ opacity: 0.35, marginLeft: 4 }} />;
    return sortConfig.dir === 'asc'
      ? <ChevronUp size={11} style={{ color: '#1d4ed8', marginLeft: 4 }} />
      : <ChevronDown size={11} style={{ color: '#1d4ed8', marginLeft: 4 }} />;
  };

  // fetch
  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const [evRes, calRes, attRes, meRes] = await Promise.all([
          fetch('/api/events'),
          fetch('/api/auth/google/status'),
          fetch('/api/users/bcl-attendees'),
          fetch('/api/users/me'),
        ]);
        if (evRes.ok) setEvents(await evRes.json());
        const cs = await calRes.json();
        setCalStatus(cs.connected ? 'connected' : 'disconnected');
        if (attRes.ok) setBclAttendeesList(await attRes.json());
        if (meRes.ok) {
          const me = await meRes.json();
          setCurrentUserId(me.id ? String(me.id) : null);
          setCurrentUserEmail(me.email ?? null);
          const ADMIN_ROLES = new Set(['admin', 'super_admin', 'administrator']);
          setIsAdmin(ADMIN_ROLES.has((me.role ?? '').toLowerCase()));
        }
      } catch (e) { console.error(e); }
      finally { setLoading(false); setLoadingBclAttendees(false); }
    };
    load();
    const handleResize = () => setViewMode(window.innerWidth < 1024 ? 'cards' : 'table');
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const filtered = useMemo(() => {
    const todayStr = new Date().toISOString().split('T')[0];
    let list = events;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      list = list.filter(e =>
        e.event_name?.toLowerCase().includes(q) ||
        e.organizer_name?.toLowerCase().includes(q) ||
        e.event_type?.toLowerCase().includes(q) ||
        String(e.id).includes(q)
      );
    }
    const TERMINAL = new Set(['cancelled', 'completed', 'no_show']);
    switch (activeTab) {
      case 'today': return list.filter(e => e.event_date === todayStr);
      case 'completed': return list.filter(e => e.status === 'completed');
      case 'cancelled': return list.filter(e => e.status === 'cancelled' || e.status === 'canceled');
      case 'confirmed': return list.filter(e => e.status === 'confirmed');
      case 'mycreated': return list.filter(e => {
        const creator = String(e.created_by ?? '');
        return (currentUserId && creator === String(currentUserId)) ||
               (currentUserEmail && creator === currentUserEmail);
      });
      case 'upcoming': return list.filter(e => !TERMINAL.has(e.status ?? '') && (e.event_date ?? '') >= todayStr);
      default: return list.filter(e => !TERMINAL.has(e.status ?? ''));
    }
  }, [events, activeTab, searchQuery, currentUserId, currentUserEmail]);

  const sortedFiltered = useMemo(() => sortItems(filtered, sortConfig), [filtered, sortConfig]);

  const paginated = sortedFiltered.slice(currentPage * ITEMS_PER_PAGE, (currentPage + 1) * ITEMS_PER_PAGE);
  const totalPages = Math.ceil(sortedFiltered.length / ITEMS_PER_PAGE);

  const patchEvent = useCallback(async (id: number, payload: object) => {
    const res = await fetch(`/api/events/${id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
    if (!res.ok) throw new Error((await res.json()).error || 'Request failed');
    return res.json();
  }, []);

  const updateLocal = useCallback((id: number, patch: object) => {
    setEvents(prev => prev.map(e => e.id === id ? { ...e, ...patch } : e));
    setSelectedEvent(prev => prev && prev.id === id ? { ...prev, ...patch } : prev);
  }, []);

  const handleConfirm = async () => {
    if (!selectedEvent) return;
    setActionLoading('confirm');
    try { await patchEvent(selectedEvent.id, { badge_status: 'Confirmed', status: 'confirmed' }); updateLocal(selectedEvent.id, { badge_status: 'Confirmed', status: 'confirmed' }); notify.success('Event Confirmed'); }
    catch (e: any) { notify.error('Failed', e.message); }
    finally { setActionLoading(''); }
  };

  const handleMarkDone = async () => {
    if (!selectedEvent) return;
    setActionLoading('done');
    try { await patchEvent(selectedEvent.id, { status: 'completed' }); updateLocal(selectedEvent.id, { status: 'completed' }); notify.success('Marked as done'); setSelectedEvent(null); }
    catch (e: any) { notify.error('Failed', e.message); }
    finally { setActionLoading(''); }
  };

  const handleCancel = async () => {
    if (!selectedEvent) return;
    setActionLoading('cancel');
    try { await patchEvent(selectedEvent.id, { status: 'cancelled' }); updateLocal(selectedEvent.id, { status: 'cancelled' }); notify.success('Event Cancelled'); setSelectedEvent(null); }
    catch (e: any) { notify.error('Failed', e.message); }
    finally { setActionLoading(''); }
  };

  const handleSyncToCalendar = async () => {
    if (!selectedEvent) return;
    setActionLoading('sync');
    try {
      const res = await fetch('/api/events/sync-to-calendar', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(selectedEvent) });
      if (!res.ok) throw new Error((await res.json()).error || 'Sync failed');
      const { eventId } = await res.json();
      if (eventId) updateLocal(selectedEvent.id, { google_event_id: eventId });
      notify.success('Synced to Google Calendar');
    } catch (e: any) { notify.error('Sync failed', e.message); }
    finally { setActionLoading(''); }
  };

  const handleDelete = async () => {
    if (!deletingEvent) return;
    setIsDeleting(true);
    try {
      const res = await fetch(`/api/events/${deletingEvent.id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error((await res.json()).error || 'Delete failed');
      setEvents(prev => prev.filter(e => e.id !== deletingEvent.id));
      setSelectedEvent(null); setDeletingEvent(null);
      notify.success('Event deleted');
    } catch (e: any) { notify.error('Delete failed', e.message); }
    finally { setIsDeleting(false); }
  };

  const handleCreate = async () => {
    setSubmitting(true);
    try {
      const res = await fetch('/api/events', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(createForm) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Create failed');

      let syncedData = data;
      if (calStatus === 'connected') {
        try {
          const syncRes = await fetch('/api/events/sync-to-calendar', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data),
          });
          if (syncRes.ok) {
            const { eventId } = await syncRes.json();
            if (eventId) {
              syncedData = { ...data, google_event_id: eventId };
            }
          }
        } catch (syncErr) {
          console.error('Failed to auto-sync event to calendar:', syncErr);
        }
      }

      setEvents(prev => [syncedData, ...prev]);
      setCreateOpen(false);
      setCreateForm({ ...BLANK_FORM });
      notify.success('Event created', data.event_name);
    } catch (e: any) { notify.error('Failed to create event', e.message); }
    finally { setSubmitting(false); }
  };

  const openReschedule = () => {
    if (!selectedEvent) return;
    setRescheduleConflict('');
    const start = selectedEvent.event_start_time || '';
    const dur = String(selectedEvent.event_duration || 60);
    const end = start ? addMins(start, parseInt(dur)) : '';
    const travel = parseInt(String(selectedEvent.venue_distance ?? 10));
    setRescheduleData({
      event_date: selectedEvent.event_date || '',
      event_start_time: start,
      event_duration: dur,
      event_end_time: end,
      event_slot_start_time: selectedEvent.event_slot_start_time || calcSlot(start, -travel),
      event_slot_end_time: selectedEvent.event_slot_end_time || calcSlot(end, travel),
      venue_distance: String(travel),
    });
    setRescheduleOpen(true);
  };

  const handleReschedule = async () => {
    if (!selectedEvent) return;
    setRescheduleConflict('');
    setActionLoading('reschedule');
    try {
      const dur = parseInt(rescheduleData.event_duration) || 60;
      const travel = parseInt(rescheduleData.venue_distance) || 0;
      const endTime = addMins(rescheduleData.event_start_time, dur);
      const slotStart = calcSlot(rescheduleData.event_start_time, -travel);
      const slotEnd = calcSlot(endTime, travel);
      const patch = {
        status: 'rescheduled',
        event_date: rescheduleData.event_date,
        event_start_time: rescheduleData.event_start_time,
        event_end_time: endTime,
        event_duration: dur,
        event_slot_start_time: slotStart,
        event_slot_end_time: slotEnd,
        venue_distance: travel,
      };
      await patchEvent(selectedEvent.id, patch);
      updateLocal(selectedEvent.id, patch);
      setRescheduleOpen(false);
      notify.success('Event rescheduled', calStatus === 'connected' ? 'Calendar will be updated.' : '');
    } catch (e: any) { notify.error('Reschedule failed', e.message); }
    finally { setActionLoading(''); }
  };

  const openEdit = () => {
    if (!selectedEvent) return;
    setEditForm({
      event_name: selectedEvent.event_name || '',
      event_type: selectedEvent.event_type || 'other',
      event_date: selectedEvent.event_date || '',
      event_start_time: selectedEvent.event_start_time || '',
      event_end_time: selectedEvent.event_end_time || '',
      event_duration: String(selectedEvent.event_duration || ''),
      event_slot_start_time: selectedEvent.event_slot_start_time || '',
      event_slot_end_time: selectedEvent.event_slot_end_time || '',
      venue_distance: String(selectedEvent.venue_distance ?? 10),
      event_venue: selectedEvent.event_venue || '',
      event_venue_area: selectedEvent.event_venue_area || '',
      event_format: selectedEvent.event_format || 'physical',
      virtual_meeting_mode: selectedEvent.virtual_meeting_mode || '',
      meeting_link: selectedEvent.meeting_link || '',
      meeting_id: selectedEvent.meeting_id || '',
      organizer_name: selectedEvent.organizer_name || '',
      organizer_company: selectedEvent.organizer_company || '',
      organizer_email: selectedEvent.organizer_email || '',
      organizer_mobile: selectedEvent.organizer_mobile || '',
      event_description: selectedEvent.event_description || '',
      expected_attendees: String(selectedEvent.expected_attendees || ''),
      bcl_attendee: Array.isArray(selectedEvent.bcl_attendee) ? selectedEvent.bcl_attendee : [],
      bcl_attendee_names: resolveAttendeeNames(selectedEvent, bclUsersById),
      status: selectedEvent.status || 'confirmed',
    });
    setEditOpen(true);
  };

  const handleEdit = async () => {
    if (!selectedEvent) return;
    setSubmitting(true);
    try {
      const res = await fetch(`/api/events/${selectedEvent.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(editForm) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Update failed');

      let syncedData = data;
      if (calStatus === 'connected') {
        try {
          const syncRes = await fetch('/api/events/sync-to-calendar', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data),
          });
          if (syncRes.ok) {
            const { eventId } = await syncRes.json();
            if (eventId) {
              syncedData = { ...data, google_event_id: eventId };
            }
          }
        } catch (syncErr) {
          console.error('Failed to auto-sync event update to calendar:', syncErr);
        }
      }

      updateLocal(selectedEvent.id, syncedData);
      setEditOpen(false);
      notify.success('Event updated');
    } catch (e: any) { notify.error('Update failed', e.message); }
    finally { setSubmitting(false); }
  };

  const ev = selectedEvent;
  const detailEvent = useMemo(
    () => (ev ? { ...ev, bcl_attendee_names: resolveAttendeeNames(ev, bclUsersById) } : null),
    [ev, bclUsersById]
  );
  const canChange = ev && !['cancelled', 'completed'].includes(ev.status ?? '');
  const isOwner = ev && (isAdmin || ev.created_by === currentUserId || ev.created_by === currentUserEmail);
  const canEdit = canChange && isOwner;
  const canDelete = !!ev && !!isOwner;

  // ── EVENT COLUMN DEFINITIONS ─────────────────────────────────────────────
  const evColumns: ColumnDef[] = useMemo(() => [
    {
      key: 'select',
      header: '',
      headerClassName: 'w-[44px] pl-4',
      cellClassName: 'pl-4',
      render: () => (
        <div style={{ width: 16, height: 16, borderRadius: 4, border: '1.5px solid #d0dfe1', background: '#fff' }} />
      ),
    },
    {
      key: 'event_name',
      header: 'Event',
      sortable: true,
      render: (ev: BclEvent) => {
        const col = getEventTypeConfig(ev.event_type);
        const typeLabel = EVENT_TYPES.find(t => t.value === ev.event_type)?.label ?? ev.event_type;
        return (
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div className="ev-type-icon" style={{ background: col.light, color: col.bg, width: 30, height: 30 }}>
              <EventTypeIcon type={ev.event_type} size={14} />
            </div>
            <div style={{ minWidth: 0 }}>
              <div className="ev-cell-main" style={{ fontSize: '12px' }}>{ev.event_name}</div>
              <div className="ev-cell-sub" style={{ fontSize: '10px' }}>{typeLabel}</div>
            </div>
          </div>
        );
      },
    },
    {
      key: 'event_date',
      header: 'Date',
      sortable: true,
      render: (ev: BclEvent) => (
        <div className="ev-cell-date">{formatDate(ev.event_date, { day: '2-digit', month: '2-digit', year: 'numeric' })}</div>
      ),
    },
    {
      key: 'event_start_time',
      header: 'Start',
      sortable: true,
      render: (ev: BclEvent) => (
        <div className="ev-cell-time" style={{ color: '#1d4ed8' }}>{formatTime(ev.event_start_time)}</div>
      ),
    },
    {
      key: 'event_end_time',
      header: 'End',
      sortable: true,
      render: (ev: BclEvent) => (
        <div className="ev-cell-time">{formatTime(ev.event_end_time)}</div>
      ),
    },
    {
      key: 'event_duration',
      header: 'Dur.',
      sortable: true,
      render: (ev: BclEvent) => (
        <div style={{ fontSize: '11px', fontWeight: 600, color: '#64868c' }}>
          {ev.event_duration ? `${ev.event_duration}m` : '—'}
        </div>
      ),
    },
    {
      key: 'bcl_attendee',
      header: 'BCL Attendee',
      render: (ev: BclEvent) => {
        const names = resolveAttendeeNames(ev, bclUsersById);
        return names.length > 0 ? (
          <div className="flex items-center gap-2">
            <Avatar className="h-7 w-7 rounded">
              <AvatarFallback className="bg-slate-100 text-[10px] font-bold text-slate-500 rounded">{safeInitials(names[0])}</AvatarFallback>
            </Avatar>
            <span className="text-xs text-slate-600">{names[0]}</span>
            {names.length > 1 && <span className="text-[10px] font-bold text-slate-400">+{names.length - 1}</span>}
          </div>
        ) : <span className="text-xs text-slate-400">—</span>;
      },
    },
    {
      key: 'status',
      header: 'Status',
      sortable: true,
      render: (ev: BclEvent) => <StatusPill status={ev.status ?? 'upcoming'} />,
    },
    {
      key: 'google_event_id',
      header: 'Synced',
      sortable: true,
      headerClassName: 'text-center',
      render: (ev: BclEvent) => (
        <div className="flex justify-center">
          {ev.google_event_id ? (
            <div title="Synced" style={{ color: '#22c55e', background: '#f0fdf4', padding: '4px', borderRadius: '6px' }}>
              <Cloud size={14} />
            </div>
          ) : (
            <div title="Not synced" style={{ color: '#94a3b8', padding: '4px' }}>
              <CloudOff size={14} />
            </div>
          )}
        </div>
      ),
    },
    {
      key: 'actions',
      header: '',
      stopPropagation: true,
      headerClassName: 'w-[60px]',
      render: (ev: BclEvent) => (
        <div className="flex justify-end opacity-0 transition-opacity group-hover:opacity-100">
          <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full" onClick={() => setSelectedEvent(ev)}>
            <MoreHorizontal size={14} />
          </Button>
        </div>
      ),
    },
  // eslint-disable-next-line react-hooks/exhaustive-deps
  ], [bclUsersById]);

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '80vh' }}>
      <div style={{ width: 48, height: 48, borderRadius: 12, background: 'linear-gradient(135deg,#1d4ed8,#00505e)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Loader2 size={22} color="#00d1d1" className="animate-spin" />
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-50 px-6 py-5 font-sans">
      <EventsStyles />
      <Toaster />

      {/* HEADER */}
      <div className="mb-7 flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="text-2xl font-bold text-slate-900">Events</div>
          <div className="mt-1 text-[13px] text-slate-500">Manage weddings, fundraisers, conferences and more</div>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-500">
              <span className={cn("h-2 w-2 flex-shrink-0 rounded-full", calStatus === 'connected' ? "bg-green-500 shadow-[0_0_0_3px_rgba(34,197,94,.2)]" : calStatus === 'checking' ? "bg-slate-400" : "bg-red-500 shadow-[0_0_0_3px_rgba(239,68,68,.2)]")} />
              {calStatus === 'checking' ? 'Checking…' : `Calendar ${calStatus}`}
            </div>
            {calStatus === 'connected' && (
              <Button variant="outline" size="sm" className="h-8 text-xs text-red-500 border-red-200 hover:bg-red-50"
                onClick={async () => { try { await fetch('/api/auth/google/disconnect', { method: 'POST' }); setCalStatus('disconnected'); } catch { } }}>
                Disconnect
              </Button>
            )}
            {calStatus === 'disconnected' && (
              <Button variant="outline" size="sm" className="h-8 text-xs text-blue-600 border-blue-200 hover:bg-blue-50"
                onClick={() => { window.location.href = '/api/auth/google'; }}>
                Connect Calendar
              </Button>
            )}
          </div>
          <Button variant="outline" size="sm" className="h-8 text-xs gap-1.5"><Download size={13} /> Export</Button>
          <Button className="h-9 text-xs bg-blue-600 hover:bg-blue-700 text-white gap-2 px-4 shadow-sm shadow-blue-100" onClick={() => setCreateOpen(true)}>
            <Plus size={14} /> Create New Event
          </Button>
        </div>
      </div>

      <DataTable
        columns={evColumns}
        rows={paginated}
        rowKey={ev => ev.id}
        onRowClick={ev => setSelectedEvent(ev)}
        tabs={[
          { key: 'upcoming', label: 'Upcoming' },
          { key: 'confirmed', label: 'Confirmed' },
          { key: 'today', label: 'Today' },
          { key: 'completed', label: 'Completed' },
          { key: 'cancelled', label: 'Cancelled' },
          { key: 'mycreated', label: 'My Created' },
        ]}
        activeTab={activeTab}
        onTabChange={tab => { setActiveTab(tab); setCurrentPage(0); }}
        searchQuery={searchQuery}
        onSearchChange={q => { setSearchQuery(q); setCurrentPage(0); }}
        searchPlaceholder="Search events or organizer…"
        viewMode={viewMode}
        onViewModeChange={mode => setViewMode(mode)}
        renderCard={ev => <EventCard key={ev.id} event={ev} onClick={() => setSelectedEvent(ev)} />}
        sortColumn={sortConfig?.key ?? null}
        sortDirection={sortConfig?.dir ?? 'asc'}
        onSort={toggleSort}
        currentPage={currentPage}
        totalPages={totalPages}
        totalRows={sortedFiltered.length}
        itemsPerPage={ITEMS_PER_PAGE}
        onPageChange={setCurrentPage}
        emptyMessage="No events found"
      />

      <EventDetailDialog
        event={detailEvent}
        onClose={() => setSelectedEvent(null)}
        isEditOpen={isEditOpen}
        setEditOpen={setEditOpen}
        editForm={editForm}
        setEditForm={setEditForm}
        editAttendeeOpen={editAttendeeOpen}
        setEditAttendeeOpen={setEditAttendeeOpen}
        bclAttendeesList={bclAttendeesList}
        loadingBclAttendees={loadingBclAttendees}
        isSubmitting={isSubmitting}
        actionLoading={actionLoading}
        calStatus={calStatus}
        canEdit={canEdit}
        canDelete={canDelete}
        onConfirm={handleConfirm}
        onMarkDone={handleMarkDone}
        onCancel={handleCancel}
        onReschedule={openReschedule}
        onSyncToCalendar={handleSyncToCalendar}
        onSaveEdit={handleEdit}
        onOpenEdit={openEdit}
        onDelete={(event) => setDeletingEvent(event)}
      />

      {/* ── RESCHEDULE EVENT DIALOG ── */}
      <Dialog open={isRescheduleOpen} onOpenChange={o => { if (!o) { setRescheduleOpen(false); setRescheduleConflict(''); } }}>
        <DialogContent className="max-w-md bg-white border-slate-200 text-slate-900 shadow-xl rounded-xl">
          <DialogHeader>
            <DialogTitle className="text-orange-700 font-bold flex items-center gap-2">
              <RefreshCw size={16} /> Reschedule Event
            </DialogTitle>
            {selectedEvent && (
              <p className="text-xs text-slate-500 font-medium mt-1">
                Postpone <strong>{selectedEvent.event_name}</strong> to a new date or time.
              </p>
            )}
          </DialogHeader>
          <div className="grid grid-cols-2 gap-3 py-2">
            <div className="col-span-2">
              <label className="mb-1.5 block text-[10px] font-bold uppercase tracking-wider text-slate-400">New Event Date *</label>
              <Input type="date" className="bg-slate-50 border-slate-200" value={rescheduleData.event_date}
                onChange={e => { setRescheduleData(p => ({ ...p, event_date: e.target.value })); setRescheduleConflict(''); }} />
            </div>
            <div>
              <label className="mb-1.5 block text-[10px] font-bold uppercase tracking-wider text-slate-400">Start Time *</label>
              <Input type="time" className="bg-slate-50 border-slate-200" value={rescheduleData.event_start_time}
                onChange={e => {
                  const val = e.target.value;
                  const dur = parseInt(rescheduleData.event_duration) || 60;
                  const travel = parseInt(rescheduleData.venue_distance) || 0;
                  const end = addMins(val, dur);
                  setRescheduleData(p => ({ ...p, event_start_time: val, event_end_time: end, event_slot_start_time: calcSlot(val, -travel), event_slot_end_time: calcSlot(end, travel) }));
                  setRescheduleConflict('');
                }} />
            </div>
            <div>
              <label className="mb-1.5 block text-[10px] font-bold uppercase tracking-wider text-slate-400">Duration</label>
              <Select value={rescheduleData.event_duration}
                onValueChange={val => {
                  const dur = parseInt(val) || 60;
                  const travel = parseInt(rescheduleData.venue_distance) || 0;
                  const end = addMins(rescheduleData.event_start_time, dur);
                  setRescheduleData(p => ({ ...p, event_duration: val, event_end_time: end, event_slot_end_time: calcSlot(end, travel) }));
                }}>
                <SelectTrigger className="bg-slate-50 border-slate-200"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {[['60','1 hour'],['90','1.5 hrs'],['120','2 hrs'],['180','3 hrs'],['240','4 hrs'],['300','5 hrs'],['360','6 hrs'],['480','8 hrs']].map(([v, l]) => (
                    <SelectItem key={v} value={v}>{l}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="mb-1.5 block text-[10px] font-bold uppercase tracking-wider text-slate-400">End Time (calc.)</label>
              <Input className="cursor-not-allowed border-slate-200 bg-slate-50 text-slate-500" readOnly value={rescheduleData.event_end_time || '—'} />
            </div>
            <div>
              <label className="mb-1.5 block text-[10px] font-bold uppercase tracking-wider text-slate-400">Travel Time</label>
              <Select value={rescheduleData.venue_distance}
                onValueChange={val => {
                  const travel = parseInt(val) || 0;
                  setRescheduleData(p => ({ ...p, venue_distance: val, event_slot_start_time: calcSlot(p.event_start_time, -travel), event_slot_end_time: calcSlot(p.event_end_time, travel) }));
                }}>
                <SelectTrigger className="bg-slate-50 border-slate-200"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {[['0','0 min'],['10','10 min'],['15','15 min'],['30','30 min'],['45','45 min'],['60','1 hour'],['90','1.5 hrs'],['120','2 hrs']].map(([v, l]) => (
                    <SelectItem key={v} value={v}>{l}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {rescheduleConflict && (
              <div className="col-span-2 flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-3.5 py-2.5 text-xs font-semibold text-red-800">
                <AlertCircle size={14} /> {rescheduleConflict}
              </div>
            )}
          </div>
          <DialogFooter className="bg-slate-50 -m-6 mt-2 p-4 flex gap-2">
            <Button variant="ghost" className="text-slate-500 font-semibold" onClick={() => { setRescheduleOpen(false); setRescheduleConflict(''); }}>Cancel</Button>
            <Button onClick={handleReschedule} disabled={!!actionLoading || !rescheduleData.event_date || !rescheduleData.event_start_time}
              className="bg-orange-600 hover:bg-orange-700 text-white font-bold">
              {actionLoading === 'reschedule' ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Rescheduling…</> : <><RefreshCw className="mr-2 h-4 w-4" /> Confirm Reschedule</>}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <EventFormDialog
        open={isCreateOpen}
        onOpenChange={(o) => { if (!o) setCreateOpen(false); }}
        form={createForm}
        setForm={setCreateForm}
        attendeeOpen={createAttendeeOpen}
        setAttendeeOpen={setCreateAttendeeOpen}
        bclAttendeesList={bclAttendeesList}
        loadingBclAttendees={loadingBclAttendees}
        isSubmitting={isSubmitting}
        onSubmit={handleCreate}
      />

      <DeleteEventDialog
        event={deletingEvent}
        isDeleting={isDeleting}
        onOpenChange={(o) => !o && setDeletingEvent(null)}
        onConfirm={handleDelete}
      />
    </div>
  );
};

const EventsPage = () => (
  <React.Suspense fallback={<div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh' }}><Loader2 size={24} className="animate-spin" color="#00d1d1" /></div>}>
    <EventsContent />
  </React.Suspense>
);

export default EventsPage;
