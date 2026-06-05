// @ts-nocheck
'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel,
  AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Toaster } from '@/components/ui/toaster';
import { useToast } from '@/hooks/use-toast';
import {
  Calendar, Clock, MapPin, Trash2, Loader2,
  ChevronLeft, ChevronRight, Search, MoreHorizontal, Plus, Download,
  Hash, CheckCircle2, Edit2, Ban, UserCheck, Users,
  Table2, LayoutGrid, Building, AlertCircle, Cloud, CloudOff,
  ChevronUp, ChevronDown, ChevronsUpDown, Link as LinkIcon, X, User, Phone,
} from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Checkbox } from '@/components/ui/checkbox';
import {
  getEventTypeConfig, EventTypeIcon, EVENT_TYPES, EVENT_TYPE_CONFIG,
  formatDateDDMMYYYY, sortItems, SortConfig,
} from '@/utils/appointmentStyles';
import {
  MEETING_STATUSES, STATUS_PILL_CLASSES, getStatusPillClass, getStatusHexColor,
} from '@/utils/appointmentStatuses';

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

function formatTime(t: string) {
  if (!t) return '—';
  const [h, m] = t.split(':').map(Number);
  const ampm = h >= 12 ? 'PM' : 'AM';
  return `${((h % 12) || 12).toString().padStart(2, '0')}:${m.toString().padStart(2, '0')} ${ampm}`;
}

function StatusPill({ status }: { status?: string }) {
  const pillClass = getStatusPillClass(status);
  const label = MEETING_STATUSES.find(s => s.value === status?.toLowerCase().replace(/[\s-]+/g, '_'))?.label ?? (status ?? 'Upcoming');
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold tracking-wide border ${pillClass}`} style={{ borderColor: 'transparent' }}>
      {label}
    </span>
  );
}

function safeInitials(n: string) {
  if (!n || typeof n !== 'string') return '??';
  return n.split(' ').filter(Boolean).map(c => c[0]).join('').slice(0, 2).toUpperCase();
}

function addMinutes(time: string, mins: number) {
  const [h, m] = time.split(':').map(Number);
  const t = h * 60 + m + mins;
  return `${String(Math.floor(t / 60) % 24).padStart(2, '0')}:${String(t % 60).padStart(2, '0')}`;
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
                {formatDateDDMMYYYY(event.event_date)}
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

// ── BLANK CREATE FORM ────────────────────────────────────────────────────────
const BLANK_FORM = {
  event_name: '', event_type: 'other',
  event_date: '', event_start_time: '', event_end_time: '',
  event_duration: '',
  event_slot_start_time: '', event_slot_end_time: '',
  event_venue: '', event_venue_area: '',
  organizer_name: '', organizer_company: '', organizer_email: '', organizer_mobile: '',
  event_description: '', expected_attendees: '',
  bcl_attendee: [] as string[],
  bcl_attendee_names: [] as string[],
  status: 'upcoming',
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
    switch (activeTab) {
      case 'today': return list.filter(e => e.event_date === todayStr);
      case 'completed': return list.filter(e => e.status === 'completed');
      case 'cancelled': return list.filter(e => e.status === 'cancelled');
      case 'confirmed': return list.filter(e => e.status === 'confirmed');
      default: return list.filter(e => ['upcoming', 'confirmed'].includes(e.status ?? 'upcoming'));
    }
  }, [events, activeTab, searchQuery]);

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
      event_venue: selectedEvent.event_venue || '',
      event_venue_area: selectedEvent.event_venue_area || '',
      organizer_name: selectedEvent.organizer_name || '',
      organizer_company: selectedEvent.organizer_company || '',
      organizer_email: selectedEvent.organizer_email || '',
      organizer_mobile: selectedEvent.organizer_mobile || '',
      event_description: selectedEvent.event_description || '',
      expected_attendees: String(selectedEvent.expected_attendees || ''),
      bcl_attendee: Array.isArray(selectedEvent.bcl_attendee) ? selectedEvent.bcl_attendee : [],
      bcl_attendee_names: Array.isArray(selectedEvent.bcl_attendee_names) ? selectedEvent.bcl_attendee_names : [],
      status: selectedEvent.status || 'upcoming',
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
  const canChange = ev && !['cancelled', 'completed'].includes(ev.status ?? '');
  const isOwner = ev && (isAdmin || ev.created_by === currentUserId || ev.created_by === currentUserEmail);
  const canEdit = canChange && isOwner;
  const canDelete = !!ev && !!isOwner;

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '80vh' }}>
      <div style={{ width: 48, height: 48, borderRadius: 12, background: 'linear-gradient(135deg,#1d4ed8,#00505e)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Loader2 size={22} color="#00d1d1" className="animate-spin" />
      </div>
    </div>
  );

  // ── BCL Attendee toggle helper ─────────────────────────────────────────────
  const toggleEventAttendee = (form: any, setForm: any, attendeeOpen: boolean, setAttendeeOpen: any, id: string, name: string, checked: boolean) => {
    setForm(p => {
      const ids: string[] = Array.isArray(p.bcl_attendee) ? p.bcl_attendee : [];
      const names: string[] = Array.isArray(p.bcl_attendee_names) ? p.bcl_attendee_names : [];
      if (checked) return { ...p, bcl_attendee: [...ids, id], bcl_attendee_names: [...names, name] };
      const i = ids.indexOf(id);
      return { ...p, bcl_attendee: ids.filter((_, j) => j !== i), bcl_attendee_names: names.filter((_, j) => j !== i) };
    });
  };

  // Auto-calc duration from start/end times
  const calcEventDuration = (start: string, end: string): string => {
    if (!start || !end) return '';
    const [sh, sm] = start.split(':').map(Number);
    const [eh, em] = end.split(':').map(Number);
    const diff = (eh * 60 + em) - (sh * 60 + sm);
    return diff > 0 ? String(diff) : '';
  };

  // ── Shared form fields renderer ──────────────────────────────────────────
  const renderFormFields = (form: typeof BLANK_FORM, setForm: (fn: (prev: any) => any) => void, attendeeOpen: boolean, setAttendeeOpen: (v: boolean) => void) => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginTop: 12, maxHeight: '60vh', overflowY: 'auto', paddingRight: 4 }}>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        <div style={{ gridColumn: '1/-1' }}>
          <label className="ev-field-label">Event Name *</label>
          <Input className="ev-input" placeholder="e.g. Annual Gala Dinner" value={form.event_name} onChange={e => setForm(p => ({ ...p, event_name: e.target.value }))} />
        </div>
        <div>
          <label className="ev-field-label">Event Type *</label>
          <Select value={form.event_type} onValueChange={v => setForm(p => ({ ...p, event_type: v }))}>
            <SelectTrigger className="ev-select-trigger"><SelectValue /></SelectTrigger>
            <SelectContent>{EVENT_TYPES.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <div>
          <label className="ev-field-label">Status</label>
          <Select value={form.status} onValueChange={v => setForm(p => ({ ...p, status: v }))}>
            <SelectTrigger className="ev-select-trigger"><SelectValue /></SelectTrigger>
            <SelectContent>
              {MEETING_STATUSES.map(s => (
                <SelectItem key={s.value} value={s.value}>
                  <span className={`inline-flex items-center gap-1.5 px-1.5 py-0.5 rounded text-[10px] font-bold ${STATUS_PILL_CLASSES[s.value] ?? ''}`}>
                    {s.label}
                  </span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <label className="ev-field-label">Event Date *</label>
          <Input type="date" className="ev-input" value={form.event_date} onChange={e => setForm(p => ({ ...p, event_date: e.target.value }))} />
        </div>

        {/* Times row */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
          <div>
            <label className="ev-field-label">Start Time *</label>
            <Input type="time" className="ev-input" value={form.event_start_time} onChange={e => {
              const start = e.target.value;
              const dur = calcEventDuration(start, form.event_end_time);
              setForm(p => ({ ...p, event_start_time: start, event_duration: dur }));
            }} />
          </div>
          <div>
            <label className="ev-field-label">End Time *</label>
            <Input type="time" className="ev-input" value={form.event_end_time} onChange={e => {
              const end = e.target.value;
              const dur = calcEventDuration(form.event_start_time, end);
              setForm(p => ({ ...p, event_end_time: end, event_duration: dur }));
            }} />
          </div>
        </div>

        {/* Duration (read-only, auto-calc) */}
        <div>
          <label className="ev-field-label">Duration (mins)</label>
          <Input className="ev-input" readOnly value={form.event_duration ? `${form.event_duration} min` : '—'} style={{ background: '#f7fafa', color: '#8ca4a8' }} />
        </div>

        {/* Slot times */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, gridColumn: '1/-1' }}>
          <div>
            <label className="ev-field-label">Slot Start Time</label>
            <Input type="time" className="ev-input" value={form.event_slot_start_time} onChange={e => setForm(p => ({ ...p, event_slot_start_time: e.target.value }))} />
          </div>
          <div>
            <label className="ev-field-label">Slot End Time</label>
            <Input type="time" className="ev-input" value={form.event_slot_end_time} onChange={e => setForm(p => ({ ...p, event_slot_end_time: e.target.value }))} />
          </div>
        </div>

        <div>
          <label className="ev-field-label">Venue Name</label>
          <Input className="ev-input" placeholder="e.g. Grand Ballroom" value={form.event_venue} onChange={e => setForm(p => ({ ...p, event_venue: e.target.value }))} />
        </div>
        <div>
          <label className="ev-field-label">Venue Area / Location</label>
          <Input className="ev-input" placeholder="e.g. Nairobi CBD" value={form.event_venue_area} onChange={e => setForm(p => ({ ...p, event_venue_area: e.target.value }))} />
        </div>
        <div>
          <label className="ev-field-label">Organizer Name</label>
          <Input className="ev-input" value={form.organizer_name} onChange={e => setForm(p => ({ ...p, organizer_name: e.target.value }))} />
        </div>
        <div>
          <label className="ev-field-label">Organizer Company</label>
          <Input className="ev-input" value={form.organizer_company} onChange={e => setForm(p => ({ ...p, organizer_company: e.target.value }))} />
        </div>
        <div>
          <label className="ev-field-label">Organizer Mobile</label>
          <Input className="ev-input" value={form.organizer_mobile} onChange={e => setForm(p => ({ ...p, organizer_mobile: e.target.value }))} />
        </div>
        <div>
          <label className="ev-field-label">Organizer Email</label>
          <Input type="email" className="ev-input" value={form.organizer_email} onChange={e => setForm(p => ({ ...p, organizer_email: e.target.value }))} />
        </div>
        <div>
          <label className="ev-field-label">Expected Attendees</label>
          <Input type="number" className="ev-input" min={0} value={form.expected_attendees} onChange={e => setForm(p => ({ ...p, expected_attendees: e.target.value }))} />
        </div>

        {/* BCL Attendees */}
        <div style={{ gridColumn: '1/-1' }}>
          <label className="ev-field-label">BCL Attendees</label>
          {loadingBclAttendees ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, height: 38, color: '#8ca4a8', fontSize: 13 }}>
              <Loader2 size={13} className="animate-spin" /> Loading attendees…
            </div>
          ) : (
            <Popover open={attendeeOpen} onOpenChange={setAttendeeOpen}>
              <PopoverTrigger asChild>
                <button style={{
                  width: '100%', minHeight: 38, padding: '6px 12px 6px 12px',
                  fontSize: 13, fontWeight: 500, fontFamily: 'Inter, sans-serif',
                  border: '1px solid #e2e8e9', borderRadius: 8,
                  background: '#fff', color: '#1d4ed8', cursor: 'pointer',
                  textAlign: 'left', display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 5,
                  transition: 'all 0.15s ease', boxSizing: 'border-box',
                }}>
                  {(!form.bcl_attendee || (form.bcl_attendee as string[]).length === 0)
                    ? <span style={{ color: '#b0c4c8' }}>Select BCL attendees…</span>
                    : (form.bcl_attendee_names as string[]).map((name, i) => (
                      <span key={i} style={{ display: 'inline-flex', alignItems: 'center', gap: 4, background: '#eef2f3', borderRadius: 5, padding: '2px 8px', fontSize: 11, fontWeight: 700, color: '#1d4ed8' }}>
                        {name}
                        <span style={{ cursor: 'pointer', color: '#8ca4a8', display: 'flex', alignItems: 'center' }}
                          onClick={e => { e.stopPropagation(); toggleEventAttendee(form, setForm, attendeeOpen, setAttendeeOpen, (form.bcl_attendee as string[])[i], name, false); }}>
                          <X size={10} />
                        </span>
                      </span>
                    ))
                  }
                </button>
              </PopoverTrigger>
              <PopoverContent style={{ width: 260, padding: 10, borderRadius: 10, border: '1px solid #eef2f3', background: '#fff', boxShadow: '0 8px 24px rgba(0,48,56,0.1)' }} align="start">
                <div style={{ fontSize: 9, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: '#8ca4a8', padding: '0 4px', marginBottom: 8 }}>Select BCL Attendees</div>
                <div style={{ maxHeight: 200, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 2 }}>
                  {bclAttendeesList.map(a => {
                    const sel = Array.isArray(form.bcl_attendee) && (form.bcl_attendee as string[]).includes(a.id);
                    return (
                      <div key={a.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 6px', borderRadius: 7, cursor: 'pointer', background: sel ? '#f0f4f5' : 'transparent', transition: 'background 0.12s' }}
                        onClick={() => toggleEventAttendee(form, setForm, attendeeOpen, setAttendeeOpen, a.id, a.displayName, !sel)}>
                        <Checkbox checked={sel} onCheckedChange={c => toggleEventAttendee(form, setForm, attendeeOpen, setAttendeeOpen, a.id, a.displayName, !!c)} onClick={e => e.stopPropagation()} />
                        <span style={{ fontSize: 13, fontWeight: 500, color: '#1d4ed8' }}>{a.displayName}</span>
                      </div>
                    );
                  })}
                </div>
              </PopoverContent>
            </Popover>
          )}
        </div>

        <div style={{ gridColumn: '1/-1' }}>
          <label className="ev-field-label">Description / Notes</label>
          <Textarea className="ev-textarea" rows={3} value={form.event_description} onChange={e => setForm(p => ({ ...p, event_description: e.target.value }))} />
        </div>
      </div>
    </div>
  );

  return (
    <div className="ev-shell">
      <EventsStyles />
      <Toaster />

      {/* HEADER */}
      <div className="ev-header">
        <div>
          <div className="ev-title">Events</div>
          <div className="ev-subtitle">Manage weddings, fundraisers, conferences and more</div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div className="cal-status">
              <div className={`cal-dot ${calStatus === 'connected' ? 'cal-dot-connected' : calStatus === 'checking' ? '' : 'cal-dot-disconnected'}`}
                style={calStatus === 'checking' ? { background: '#94a3b8' } : undefined} />
              {calStatus === 'checking' ? 'Checking…' : `Calendar ${calStatus}`}
            </div>
            {calStatus === 'connected' && (
              <Button
                className="ev-btn-outline h-auto"
                style={{ fontSize: 11, padding: '5px 10px', color: '#ef4444', borderColor: '#fca5a5' }}
                onClick={async () => {
                  try {
                    await fetch('/api/auth/google/disconnect', { method: 'POST' });
                    setCalStatus('disconnected');
                  } catch {}
                }}
              >
                Disconnect
              </Button>
            )}
            {calStatus === 'disconnected' && (
              <Button
                className="ev-btn-outline h-auto"
                style={{ fontSize: 11, padding: '5px 10px', color: '#1d4ed8', borderColor: '#bfdbfe' }}
                onClick={() => { window.location.href = '/api/auth/google'; }}
              >
                <Cloud size={12} /> Connect Calendar
              </Button>
            )}
          </div>
          <Button className="ev-btn-outline h-auto"><Download size={13} /> Export</Button>
          <Button className="ev-btn-primary h-auto" onClick={() => setCreateOpen(true)}><Plus size={14} /> New Event</Button>
        </div>
      </div>

      {/* PANEL */}
      <div className="ev-panel">
        {/* TOOLBAR */}
        <div className="ev-toolbar">
          <div className="ev-tabs">
            {(['upcoming', 'confirmed', 'today', 'completed', 'cancelled'] as const).map(tab => (
              <Button key={tab} className={`ev-tab h-auto ${activeTab === tab ? `active tab-${tab}` : ''}`}
                onClick={() => { setActiveTab(tab); setCurrentPage(0); }}>
                {tab}
              </Button>
            ))}
          </div>
          <div className="ev-toolbar-right">
            <div className="ev-search-wrap">
              <Search size={14} className="ev-search-icon" />
              <Input className="ev-search" placeholder="Search events or organizer…"
                value={searchQuery} onChange={e => { setSearchQuery(e.target.value); setCurrentPage(0); }} />
            </div>
            <div className="ev-view-toggle">
              <Button className={`ev-view-btn h-auto ${viewMode === 'table' ? 'active' : ''}`} onClick={() => setViewMode('table')}>
                <Table2 size={12} /> Table
              </Button>
              <Button className={`ev-view-btn h-auto ${viewMode === 'cards' ? 'active' : ''}`} onClick={() => setViewMode('cards')}>
                <LayoutGrid size={12} /> Grid
              </Button>
            </div>
          </div>
        </div>

        {/* LIST */}
        {viewMode === 'table' ? (
          <div className="ev-table-wrap">
            <table className="ev-table">
              <thead>
                <tr>
                  <th style={{ width: 40, paddingLeft: 18 }}></th>
                  <th style={{ cursor: 'pointer', userSelect: 'none' }} onClick={() => toggleSort('event_name')}>
                    <span style={{ display: 'flex', alignItems: 'center' }}>Event <SortIcon colKey="event_name" /></span>
                  </th>
                  <th style={{ cursor: 'pointer', userSelect: 'none' }} onClick={() => toggleSort('event_date')}>
                    <span style={{ display: 'flex', alignItems: 'center' }}>Date <SortIcon colKey="event_date" /></span>
                  </th>
                  <th style={{ cursor: 'pointer', userSelect: 'none' }} onClick={() => toggleSort('event_start_time')}>
                    <span style={{ display: 'flex', alignItems: 'center' }}>Time <SortIcon colKey="event_start_time" /></span>
                  </th>
                  <th style={{ cursor: 'pointer', userSelect: 'none' }} onClick={() => toggleSort('organizer_name')}>
                    <span style={{ display: 'flex', alignItems: 'center' }}>Organizer <SortIcon colKey="organizer_name" /></span>
                  </th>
                  <th style={{ cursor: 'pointer', userSelect: 'none' }} onClick={() => toggleSort('status')}>
                    <span style={{ display: 'flex', alignItems: 'center' }}>Status <SortIcon colKey="status" /></span>
                  </th>
                  <th style={{ width: 80, textAlign: 'right', paddingRight: 16 }}></th>
                </tr>
              </thead>
              <tbody>
                {paginated.length > 0 ? paginated.map(ev => {
                  const col = getEventTypeConfig(ev.event_type);
                  const typeLabel = EVENT_TYPES.find(t => t.value === ev.event_type)?.label ?? ev.event_type;
                  return (
                    <tr key={ev.id} onClick={() => setSelectedEvent(ev)}>
                      <td style={{ paddingLeft: 18 }}>
                        <div style={{ width: 16, height: 16, borderRadius: 4, border: '1.5px solid #d0dfe1', background: '#fff' }} />
                      </td>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          <div className="ev-type-icon" style={{ background: col.light, color: col.bg }}>
                            <EventTypeIcon type={ev.event_type} />
                          </div>
                          <div>
                            <div className="ev-cell-main">{ev.event_name}</div>
                            <div className="ev-cell-sub">#{ev.id} · {typeLabel}</div>
                          </div>
                        </div>
                      </td>
                      <td><div className="ev-cell-date">{formatDateDDMMYYYY(ev.event_date)}</div></td>
                      <td><div className="ev-cell-time"><Clock size={12} />{formatTime(ev.event_start_time)}</div></td>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 7, fontSize: 12, fontWeight: 600, color: '#64868c' }}>
                          <div style={{ width: 26, height: 26, borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 9, fontWeight: 800, background: 'linear-gradient(135deg,#1d4ed8,#00505e)', color: '#fff', flexShrink: 0 }}>
                            {safeInitials(ev.organizer_name || '?')}
                          </div>
                          <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: 120 }}>{ev.organizer_name || '—'}</span>
                        </div>
                      </td>
                      <td><StatusPill status={ev.status ?? 'upcoming'} /></td>
                      <td style={{ textAlign: 'right', paddingRight: 12 }} onClick={e => e.stopPropagation()}>
                        <div className="ev-row-actions">
                          <Button className="ev-row-btn" onClick={() => setSelectedEvent(ev)} title="View details">
                            <MoreHorizontal size={14} />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                }) : (
                  <tr><td colSpan={7}>
                    <div className="ev-empty">
                      <div className="ev-empty-icon"><Calendar size={20} color="#8ca4a8" /></div>
                      <div className="ev-empty-title">No events found</div>
                      <div className="ev-empty-sub">No events match this filter</div>
                    </div>
                  </td></tr>
                )}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="ev-cards-grid">
            {paginated.map(ev => <EventCard key={ev.id} event={ev} onClick={() => setSelectedEvent(ev)} />)}
            {paginated.length === 0 && (
              <div style={{ gridColumn: '1/-1' }}>
                <div className="ev-empty">
                  <div className="ev-empty-icon"><Calendar size={20} color="#8ca4a8" /></div>
                  <div className="ev-empty-title">No events found</div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* PAGINATION */}
        <div className="ev-pagination">
          <div className="ev-pagination-info">
            Showing <b>{sortedFiltered.length > 0 ? currentPage * ITEMS_PER_PAGE + 1 : 0}</b> to{' '}
            <b>{Math.min((currentPage + 1) * ITEMS_PER_PAGE, sortedFiltered.length)}</b> of <b>{sortedFiltered.length}</b>
          </div>
          <div className="ev-page-btns">
            <Button className="ev-page-btn" onClick={() => setCurrentPage(p => p - 1)} disabled={currentPage === 0}><ChevronLeft size={14} /></Button>
            {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
              const page = totalPages <= 5 ? i : Math.max(0, Math.min(currentPage - 2, totalPages - 5)) + i;
              return <Button key={page} className={`ev-page-btn ${currentPage === page ? 'active' : ''}`} onClick={() => setCurrentPage(page)}>{page + 1}</Button>;
            })}
            <Button className="ev-page-btn" onClick={() => setCurrentPage(p => p + 1)} disabled={currentPage >= totalPages - 1}><ChevronRight size={14} /></Button>
          </div>
        </div>
      </div>

      {/* ── DETAIL DIALOG ─────────────────────────────────────────────────── */}
      <Dialog open={!!selectedEvent} onOpenChange={o => !o && setSelectedEvent(null)}>
        <DialogContent className="ev-dialog" style={{ maxWidth: 820, padding: 0 }}>
          {ev && (() => {
            const col = getEventTypeConfig(ev.event_type);
            const typeLabel = EVENT_TYPES.find(t => t.value === ev.event_type)?.label ?? ev.event_type;
            return (
              <>
                <div className="ev-dialog-header" style={{ background: col.light, borderBottom: `2px solid ${col.bg}20` }}>
                  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                        <div style={{ width: 32, height: 32, borderRadius: 8, background: col.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff' }}>
                          <EventTypeIcon type={ev.event_type} size={16} />
                        </div>
                        <span style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: col.bg }}>{typeLabel} · #{ev.id}</span>
                      </div>
                      <div style={{ fontSize: 20, fontWeight: 800, color: '#1d4ed8', letterSpacing: '-0.02em' }}>{ev.event_name}</div>
                      {ev.organizer_name && (
                        <div style={{ fontSize: 13, color: '#64868c', display: 'flex', alignItems: 'center', gap: 5, marginTop: 4 }}>
                          <Building size={13} />{ev.organizer_name}{ev.organizer_company ? ` · ${ev.organizer_company}` : ''}
                        </div>
                      )}
                    </div>
                    <div style={{ flexShrink: 0 }}><StatusPill status={ev.status ?? 'upcoming'} /></div>
                  </div>
                </div>

                <div className="ev-dialog-body">
                  <div className="ev-dialog-left">
                    <div className="ev-section-label">Description</div>
                    <div className="ev-desc-box">{ev.event_description || 'No description provided.'}</div>

                    <div className="ev-section-label">Schedule & Venue</div>
                    <div className="ev-meta-grid">
                      <div><div className="ev-meta-label">Date</div><div className="ev-meta-value">{formatDateDDMMYYYY(ev.event_date)}</div></div>
                      <div><div className="ev-meta-label">Time</div><div className="ev-meta-value">{formatTime(ev.event_start_time)} — {formatTime(ev.event_end_time)}</div></div>
                      <div><div className="ev-meta-label">Duration</div><div className="ev-meta-value">{ev.event_duration ? `${ev.event_duration} min` : '—'}</div></div>
                      <div><div className="ev-meta-label">Expected Guests</div><div className="ev-meta-value">{ev.expected_attendees ?? '—'}</div></div>
                      {(ev.event_slot_start_time || ev.event_slot_end_time) && (
                        <div style={{ gridColumn: '1/-1' }}>
                          <div className="ev-meta-label">Calendar Slot</div>
                          <div className="ev-meta-value">{formatTime(ev.event_slot_start_time || '')} — {formatTime(ev.event_slot_end_time || '')}</div>
                        </div>
                      )}
                      {ev.event_venue && <div style={{ gridColumn: '1/-1' }}><div className="ev-meta-label">Venue</div><div className="ev-meta-value">{ev.event_venue}</div></div>}
                      {ev.event_venue_area && <div><div className="ev-meta-label">Area</div><div className="ev-meta-value"><span style={{ display: 'flex', alignItems: 'center', gap: 5 }}><MapPin size={13} />{ev.event_venue_area}</span></div></div>}
                    </div>

                    {Array.isArray(ev.bcl_attendee) && ev.bcl_attendee.length > 0 && (
                      <>
                        <div className="ev-section-label">BCL Attendees</div>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                          {(ev.bcl_attendee_names ?? ev.bcl_attendee).map((name, i) => (
                            <span key={i} style={{ display: 'inline-flex', alignItems: 'center', gap: 5, background: '#eef2f3', borderRadius: 6, padding: '4px 10px', fontSize: 11, fontWeight: 700, color: '#1d4ed8' }}>
                              <User size={10} />{name}
                            </span>
                          ))}
                        </div>
                      </>
                    )}
                  </div>

                  <div className="ev-dialog-right">
                    <div className="ev-section-label">Organizer Contact</div>
                    <div className="ev-contact-box">
                      {[
                        { label: 'Name', value: ev.organizer_name },
                        { label: 'Company', value: ev.organizer_company },
                        { label: 'Mobile', value: ev.organizer_mobile },
                        { label: 'Email', value: ev.organizer_email },
                      ].map(({ label, value }) => value ? (
                        <div key={label} className="ev-contact-row">
                          <div className="ev-contact-label">{label}</div>
                          <div className="ev-contact-value">{value}</div>
                        </div>
                      ) : null)}
                    </div>

                    <div className="ev-section-label">Google Calendar</div>
                    <div className="ev-sync-box" style={{ borderColor: ev.google_event_id ? '#bbf7d0' : '#eef2f3', background: ev.google_event_id ? '#f0fdf4' : '#ffffff' }}>
                      <div className="ev-sync-icon" style={{ background: ev.google_event_id ? '#dcfce7' : '#eef2f3', color: ev.google_event_id ? '#16a34a' : '#8ca4a8' }}>
                        {ev.google_event_id ? <Cloud size={16} /> : <CloudOff size={16} />}
                      </div>
                      <div style={{ minWidth: 0 }}>
                        <div style={{ fontSize: 13, fontWeight: 700, color: ev.google_event_id ? '#14532d' : '#1d4ed8' }}>{ev.google_event_id ? 'Calendar Synced' : 'Not Synced'}</div>
                        <div style={{ fontSize: 11, marginTop: 3, color: ev.google_event_id ? '#16a34a' : '#8ca4a8', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {ev.google_event_id ? `ID: ${ev.google_event_id.slice(0, 12)}…` : 'Click Sync to add to Google Calendar'}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="ev-dialog-footer">
                  <div className="ev-action-group">
                    {canEdit && <Button className="ev-action-btn ev-action-confirm h-auto" onClick={handleConfirm} disabled={!!actionLoading || ev.status === 'confirmed'}>{actionLoading === 'confirm' ? <Loader2 size={12} className="animate-spin" /> : <UserCheck size={12} />} Confirm</Button>}
                    {canEdit && <Button className="ev-action-btn ev-action-done h-auto" onClick={handleMarkDone} disabled={!!actionLoading}>{actionLoading === 'done' ? <Loader2 size={12} className="animate-spin" /> : <CheckCircle2 size={12} />} Mark Done</Button>}
                    {canEdit && <Button className="ev-action-btn ev-action-danger h-auto" onClick={handleCancel} disabled={!!actionLoading}>{actionLoading === 'cancel' ? <Loader2 size={12} className="animate-spin" /> : <Ban size={12} />} Cancel</Button>}
                  </div>
                  <div className="ev-action-group">
                    <Button className="ev-action-btn ev-action-neutral h-auto" onClick={handleSyncToCalendar} disabled={!!actionLoading || calStatus !== 'connected'}>{actionLoading === 'sync' ? <Loader2 size={12} className="animate-spin" /> : <Cloud size={12} />} Sync</Button>
                    {canEdit && <Button className="ev-action-btn ev-action-neutral h-auto" onClick={openEdit} disabled={!!actionLoading}><Edit2 size={12} /> Edit</Button>}
                    {canDelete && <Button className="ev-action-btn ev-action-danger h-auto" onClick={() => setDeletingEvent(ev)} disabled={!!actionLoading}><Trash2 size={12} /> Delete</Button>}
                    <Button className="ev-action-btn ev-action-close h-auto" onClick={() => setSelectedEvent(null)}>Close</Button>
                  </div>
                </div>
              </>
            );
          })()}
        </DialogContent>
      </Dialog>

      {/* CREATE */}
      <Dialog open={isCreateOpen} onOpenChange={o => { if (!o) setCreateOpen(false); }}>
        <DialogContent className="ev-form-dialog" style={{ maxWidth: 560, padding: 24 }}>
          <DialogHeader><DialogTitle className="ev-form-title"><Plus size={17} color="#00a3a3" /> Create Event</DialogTitle></DialogHeader>
          {renderFormFields(createForm, setCreateForm, createAttendeeOpen, setCreateAttendeeOpen)}
          <div className="ev-form-footer">
            <Button className="ev-form-cancel h-auto" onClick={() => setCreateOpen(false)}>Cancel</Button>
            <Button className="ev-form-submit h-auto" onClick={handleCreate}
              disabled={isSubmitting || !createForm.event_name || !createForm.event_date || !createForm.event_start_time || !createForm.event_end_time}>
              {isSubmitting ? <Loader2 size={14} className="animate-spin" /> : 'Create Event'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* EDIT */}
      <Dialog open={isEditOpen} onOpenChange={o => { if (!o) setEditOpen(false); }}>
        <DialogContent className="ev-form-dialog" style={{ maxWidth: 560, padding: 24 }}>
          <DialogHeader><DialogTitle className="ev-form-title"><Edit2 size={17} color="#00a3a3" /> Edit Event</DialogTitle></DialogHeader>
          {renderFormFields(editForm, setEditForm, editAttendeeOpen, setEditAttendeeOpen)}
          <div className="ev-form-footer">
            <Button className="ev-form-cancel h-auto" onClick={() => setEditOpen(false)}>Cancel</Button>
            <Button className="ev-form-submit h-auto" onClick={handleEdit} disabled={isSubmitting}>
              {isSubmitting ? <Loader2 size={14} className="animate-spin" /> : 'Save Changes'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* DELETE */}
      <AlertDialog open={!!deletingEvent} onOpenChange={o => !o && setDeletingEvent(null)}>
        <AlertDialogContent className="ev-delete-dialog" style={{ padding: 24 }}>
          <AlertDialogHeader>
            <div style={{ width: 48, height: 48, borderRadius: 12, background: 'linear-gradient(135deg,#ef4444,#dc2626)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 12, boxShadow: '0 4px 14px rgba(239,68,68,.3)' }}>
              <Trash2 size={20} color="#fff" />
            </div>
            <AlertDialogTitle style={{ fontFamily: 'Inter,sans-serif', fontSize: 16, fontWeight: 800, color: '#1d4ed8' }}>Delete Event</AlertDialogTitle>
            <AlertDialogDescription style={{ fontFamily: 'Inter,sans-serif', fontSize: 13, color: '#64868c', lineHeight: 1.6 }}>
              Permanently remove <strong style={{ color: '#1d4ed8' }}>{deletingEvent?.event_name}</strong>? This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter style={{ marginTop: 16, gap: 8 }}>
            <AlertDialogCancel style={{ flex: 1, height: 38, borderRadius: 8, fontFamily: 'Inter,sans-serif', fontWeight: 700, fontSize: 13, border: '1px solid #eef2f3', background: '#f7fafa', color: '#64868c', cursor: 'pointer' }}>Keep</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} disabled={isDeleting} style={{ flex: 1, height: 38, borderRadius: 8, fontFamily: 'Inter,sans-serif', fontWeight: 700, fontSize: 13, border: 'none', background: 'linear-gradient(135deg,#ef4444,#dc2626)', color: '#fff', cursor: 'pointer', boxShadow: '0 3px 10px rgba(239,68,68,.3)' }}>
              {isDeleting ? <Loader2 size={14} className="animate-spin" /> : 'Delete Permanently'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

const EventsPage = () => (
  <React.Suspense fallback={<div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh' }}><Loader2 size={24} className="animate-spin" color="#00d1d1" /></div>}>
    <EventsContent />
  </React.Suspense>
);

export default EventsPage;
