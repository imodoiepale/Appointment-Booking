// @ts-nocheck
"use client"

import React, { useEffect, useState } from 'react';
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Calendar, Clock, Building, MapPin, CheckCircle, Video, Trash2, Loader2, CloudOff, Cloud, Hash, Edit2, Ban, UserCheck, AlertCircle, Users, ClipboardList, Zap, LinkIcon, ArrowRight, RefreshCw, Timer, MoveRight, AlarmClock, PlusCircle, Phone, Mail, User, Briefcase, FileText, Clock3, CalendarClock, Star, Tag } from 'lucide-react';
import { getStatusHexColor, getStatusLabel } from '@/utils/appointmentStatuses';
import { formatTime, formatDate, parseLocalDate } from '../../../utils/format';
import { cn } from '@/lib/utils';

const TERMINAL_STATUSES = new Set(['cancelled', 'canceled', 'completed', 'no_show']);

function parseLocalDateTime(dateStr?: string, timeStr?: string) {
  const date = parseLocalDate(dateStr); if (!date) return null;
  const [hours = 0, minutes = 0] = (timeStr || '00:00').split(':').map(Number);
  date.setHours(hours || 0, minutes || 0, 0, 0); return date;
}

function addMinutesToTime(time: string, minutes: number): string {
  const [h, m] = time.split(':').map(Number);
  const total = h * 60 + m + minutes;
  return `${String(Math.floor(total / 60) % 24).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`;
}

function effectiveStatus(meeting: any, now: Date): string {
  const base = (meeting?.status || 'pending_confirmation').toLowerCase();
  if (TERMINAL_STATUSES.has(base) || base === 'overdue') return base;
  if (!meeting?.meeting_date || !meeting?.meeting_start_time || !meeting?.meeting_end_time) return base;
  const start = parseLocalDateTime(meeting.meeting_date, meeting.meeting_start_time);
  const end = parseLocalDateTime(meeting.meeting_date, meeting.meeting_end_time);
  if (!start || !end) return base;
  if (now >= end) return 'overdue';
  if (now >= start) return 'in_progress';
  return base;
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

function DateTile({ dateStr, dim = false }: { dateStr?: string; dim?: boolean }) {
  if (!dateStr) return null;
  const d = parseLocalDate(dateStr); if (!d) return null;
  return (
    <div className={cn("flex h-[42px] w-[42px] flex-shrink-0 flex-col items-center justify-center rounded-lg", dim ? "bg-slate-400" : "bg-blue-600")}>
      <span className="text-[15px] font-black leading-none text-white">{d.getDate()}</span>
      <span className="text-[8px] font-bold uppercase tracking-wide text-white/70">{d.toLocaleDateString('en', { month: 'short' })}</span>
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
    <div className="flex flex-col" >
      {/* Tabs */}
      <div className="flex flex-shrink-0 border-b border-slate-200 bg-slate-50 px-5">
        {EDIT_TABS.map(t => (
          <button key={t} className={cn("border-b-2 border-transparent px-4 py-3 text-[11px] font-bold uppercase tracking-wider text-slate-400 transition-colors hover:text-slate-600", activeTab === t && "border-blue-600 text-blue-600")} onClick={() => setActiveTab(t)}>{t}</button>
        ))}
      </div>

      {/* Body */}
      <ScrollArea className="flex-1 bg-white">
        <div className="flex-1 overflow-y-auto px-7 py-6">

          {/* ── CLIENT TAB ── */}
          {activeTab === 'Client' && (
            <div>
              <div className="mb-6">
                <div className="mb-3 flex items-center gap-1.5 text-[9px] font-extrabold uppercase tracking-widest text-slate-400 after:h-px after:flex-1 after:bg-slate-100"><User size={11} /> Client Identity</div>
                <div className="grid grid-cols-1 gap-4">
                  <EditField label="Full Name" icon={<User size={13} />}>
                    <input className="h-10 w-full rounded-lg border border-slate-200 bg-white px-3 pl-9 text-[13px] text-slate-900 outline-none transition-colors focus:border-blue-600 focus:ring-4 focus:ring-blue-100" value={data.client_name} onChange={e => set('client_name', e.target.value)} placeholder="Client full name" />
                  </EditField>
                  <EditField label="Company / Organisation" icon={<Briefcase size={13} />}>
                    <input className="h-10 w-full rounded-lg border border-slate-200 bg-white px-3 pl-9 text-[13px] text-slate-900 outline-none transition-colors focus:border-blue-600 focus:ring-4 focus:ring-blue-100" value={data.client_company} onChange={e => set('client_company', e.target.value)} placeholder="Company name" />
                  </EditField>
                </div>
              </div>
              <div className="mb-6">
                <div className="mb-3 flex items-center gap-1.5 text-[9px] font-extrabold uppercase tracking-widest text-slate-400 after:h-px after:flex-1 after:bg-slate-100"><Phone size={11} /> Contact Details</div>
                <div className="grid grid-cols-2 gap-4">
                  <EditField label="Mobile" icon={<Phone size={13} />}>
                    <input className="h-10 w-full rounded-lg border border-slate-200 bg-white px-3 pl-9 text-[13px] text-slate-900 outline-none transition-colors focus:border-blue-600 focus:ring-4 focus:ring-blue-100" value={data.client_mobile} onChange={e => set('client_mobile', e.target.value)} placeholder="+254 7xx xxx xxx" />
                  </EditField>
                  <EditField label="Email" icon={<Mail size={13} />}>
                    <input className="h-10 w-full rounded-lg border border-slate-200 bg-white px-3 pl-9 text-[13px] text-slate-900 outline-none transition-colors focus:border-blue-600 focus:ring-4 focus:ring-blue-100" value={data.client_email} onChange={e => set('client_email', e.target.value)} placeholder="email@example.com" />
                  </EditField>
                </div>
              </div>
              <div className="mb-6">
                <div className="mb-3 flex items-center gap-1.5 text-[9px] font-extrabold uppercase tracking-widest text-slate-400 after:h-px after:flex-1 after:bg-slate-100"><Tag size={11} /> Status</div>
                <EditField label="Badge Status">
                  <select className="h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-[13px] text-slate-900 outline-none transition-colors focus:border-blue-600 focus:ring-4 focus:ring-blue-100" value={data.badge_status} onChange={e => set('badge_status', e.target.value)}>
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
              <div className="mb-6">
                <div className="mb-3 flex items-center gap-1.5 text-[9px] font-extrabold uppercase tracking-widest text-slate-400 after:h-px after:flex-1 after:bg-slate-100"><Calendar size={11} /> Date & Time</div>
                <div className="grid grid-cols-2 gap-4">
                  <EditField label="Meeting Date">
                    <input type="date" className="h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-[13px] text-slate-900 outline-none transition-colors focus:border-blue-600 focus:ring-4 focus:ring-blue-100" value={data.meeting_date} onChange={e => set('meeting_date', e.target.value)} />
                  </EditField>
                  <EditField label="Start Time" icon={<Clock size={13} />}>
                    <input type="time" className="h-10 w-full rounded-lg border border-slate-200 bg-white px-3 pl-9 text-[13px] text-slate-900 outline-none transition-colors focus:border-blue-600 focus:ring-4 focus:ring-blue-100" value={data.meeting_start_time} onChange={e => set('meeting_start_time', e.target.value)} />
                  </EditField>
                  <EditField label="Duration">
                    <select className="h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-[13px] text-slate-900 outline-none transition-colors focus:border-blue-600 focus:ring-4 focus:ring-blue-100" value={data.meeting_duration} onChange={e => set('meeting_duration', e.target.value)}>
                      {[['15', '15 min'], ['30', '30 min'], ['45', '45 min'], ['60', '1 hour'], ['90', '1.5 hrs'], ['120', '2 hrs'], ['180', '3 hrs'], ['240', '4 hrs'], ['300', '5 hrs']].map(([v, l]) =>
                        <option key={v} value={v}>{l}</option>
                      )}
                    </select>
                  </EditField>
                  <EditField label="End Time (auto-calc)">
                    <input className="h-10 w-full cursor-not-allowed rounded-lg border border-slate-200 bg-slate-50 px-3 text-[13px] text-slate-400 outline-none" readOnly value={data.meeting_end_time || '—'} />
                  </EditField>
                </div>
              </div>
              <div className="mb-6">
                <div className="mb-3 flex items-center gap-1.5 text-[9px] font-extrabold uppercase tracking-widest text-slate-400 after:h-px after:flex-1 after:bg-slate-100"><MapPin size={11} /> Meeting Type & Venue</div>
                <div className="grid grid-cols-2 gap-4">
                  <EditField label="Meeting Type">
                    <select className="h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-[13px] text-slate-900 outline-none transition-colors focus:border-blue-600 focus:ring-4 focus:ring-blue-100" value={data.meeting_type} onChange={e => set('meeting_type', e.target.value)}>
                      <option value="inPerson">In-Person</option>
                      <option value="virtual">Virtual</option>
                    </select>
                  </EditField>
                  {data.meeting_type === 'virtual' && (
                    <EditField label="How will this be joined?">
                      <select className="h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-[13px] text-slate-900 outline-none transition-colors focus:border-blue-600 focus:ring-4 focus:ring-blue-100" value={data.virtual_meeting_mode} onChange={e => set('virtual_meeting_mode', e.target.value)}>
                        <option value="">— Select —</option>
                        <option value="hosted">We will generate a Google Meet link</option>
                        <option value="external">Provide an existing link</option>
                      </select>
                    </EditField>
                  )}
                  {data.meeting_type === 'virtual' && data.virtual_meeting_mode === 'external' && (
                    <>
                      <EditField label="Meeting Link" icon={<LinkIcon size={13} />}>
                        <input className="h-10 w-full rounded-lg border border-slate-200 bg-white px-3 pl-9 text-[13px] text-slate-900 outline-none transition-colors focus:border-blue-600 focus:ring-4 focus:ring-blue-100" value={data.meeting_link} onChange={e => set('meeting_link', e.target.value)} placeholder="https://zoom.us/j/..." />
                      </EditField>
                      <EditField label="Meeting ID" icon={<Hash size={13} />}>
                        <input className="h-10 w-full rounded-lg border border-slate-200 bg-white px-3 pl-9 text-[13px] text-slate-900 outline-none transition-colors focus:border-blue-600 focus:ring-4 focus:ring-blue-100" value={data.meeting_id} onChange={e => set('meeting_id', e.target.value)} placeholder="e.g. 123 4567 8901" />
                      </EditField>
                    </>
                  )}
                  <EditField label="Travel Time (mins)">
                    <select className="h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-[13px] text-slate-900 outline-none transition-colors focus:border-blue-600 focus:ring-4 focus:ring-blue-100" value={data.venue_distance} onChange={e => set('venue_distance', e.target.value)}>
                      {[['0', '0 (Virtual)'], ['10', '10 min'], ['15', '15 min'], ['30', '30 min'], ['45', '45 min'], ['60', '1 hour'], ['90', '1.5 hrs'], ['120', '2 hrs']].map(([v, l]) =>
                        <option key={v} value={v}>{l}</option>
                      )}
                    </select>
                  </EditField>
                  <div className="col-span-2">
                    <EditField label="Venue / Area" icon={<MapPin size={13} />}>
                      <input className="h-10 w-full rounded-lg border border-slate-200 bg-white px-3 pl-9 text-[13px] text-slate-900 outline-none transition-colors focus:border-blue-600 focus:ring-4 focus:ring-blue-100" value={data.meeting_venue_area} onChange={e => set('meeting_venue_area', e.target.value)} placeholder="e.g. BCL Boardroom, Westlands" />
                    </EditField>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ── DETAILS TAB ── */}
          {activeTab === 'Details' && (
            <div>
              <div className="mb-6">
                <div className="mb-3 flex items-center gap-1.5 text-[9px] font-extrabold uppercase tracking-widest text-slate-400 after:h-px after:flex-1 after:bg-slate-100"><ClipboardList size={11} /> Meeting Agenda</div>
                <label className="mb-1.5 block text-[10px] font-bold uppercase tracking-wider text-slate-500">Agenda</label>
                <textarea
                  className="w-full resize-y rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-[13px] text-slate-900 outline-none transition-colors focus:border-blue-600 focus:ring-4 focus:ring-blue-100"
                  rows={4}
                  value={data.meeting_agenda}
                  onChange={e => set('meeting_agenda', e.target.value)}
                  placeholder="Describe the topics and objectives for this meeting…"
                />
              </div>
              <div className="mb-6">
                <div className="mb-3 flex items-center gap-1.5 text-[9px] font-extrabold uppercase tracking-widest text-slate-400 after:h-px after:flex-1 after:bg-slate-100"><FileText size={11} /> Notes</div>
                <label className="mb-1.5 block text-[10px] font-bold uppercase tracking-wider text-slate-500">Internal Notes</label>
                <textarea
                  className="w-full resize-y rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-[13px] text-slate-900 outline-none transition-colors focus:border-blue-600 focus:ring-4 focus:ring-blue-100"
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
      <div className="flex flex-shrink-0 gap-2.5 border-t border-slate-100 bg-slate-50 px-7 py-4">
        <Button variant="outline" className="h-10 flex-1 border-slate-200 bg-white text-[13px] font-semibold text-slate-500 hover:bg-slate-50" onClick={onCancel}>
          Cancel
        </Button>
        <Button className="h-10 flex-[2] bg-blue-600 text-[13px] font-bold text-white hover:bg-blue-700" disabled={loading} onClick={() => onSave(data)}>
          {loading ? <><Loader2 size={14} className="animate-spin" /> Savingâ€¦</> : <><CheckCircle size={14} /> Save Changes</>}
        </Button>
      </div>
    </div>
  );
};

// Helper for edit field with icon
const EditField = ({ label, icon, children }: { label: string; icon?: React.ReactNode; children: React.ReactNode }) => (
  <div>
    <label className="mb-1.5 block text-[10px] font-bold uppercase tracking-wider text-slate-500">{label}</label>
    {icon ? (
      <div className="relative">
        <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">{icon}</span>
        {children}
      </div>
    ) : children}
  </div>
);

// ── MAIN COMPONENT ────────────────────────────────────────────────


const DetailBox = ({ label, value, icon }: { label: string; value?: string; icon?: React.ReactNode }) => (
  <div className="rounded-xl border border-slate-200 bg-white px-3.5 py-3 shadow-sm">
    <p className="flex items-center gap-1 text-[9px] font-bold uppercase tracking-normal text-slate-400">{icon}{label}</p>
    <p className="mt-1 truncate text-xs font-semibold text-slate-700">{value || 'â€”'}</p>
  </div>
);

const ActionButton = ({ onClick, loading, icon, label, className }: any) => (
  <Button onClick={onClick} disabled={loading} variant="outline" className={cn("h-9 w-full justify-start gap-2 border-slate-200 bg-white text-xs font-bold text-slate-600 transition-all hover:bg-slate-50", className)}>
    {loading ? <Loader2 size={13} className="animate-spin" /> : icon}
    {label}
  </Button>
);

export function DashboardDialogs(props: any) {
  const {
    selectedAppointment,
    setSelectedAppointment,
    now,
    selectedAttendees,
    isEditOpen,
    setEditOpen,
    actionLoading,
    handleEdit,
    handleEndMeeting,
    handleExtend,
    setExtendOpen,
    openReschedule,
    handleConfirm,
    handleMarkDone,
    handleCancel,
    calendarConnectionStatus,
    handleUnsync,
    handleSyncToCalendar,
    setDeleteOpen,
    isRescheduleOpen,
    setRescheduleOpen,
    setRescheduleConflict,
    rescheduleData,
    setRescheduleData,
    handleRschdStartTime,
    handleRschdDuration,
    handleRschdTravel,
    rescheduleConflict,
    handleReschedule,
    extendOpen,
    setPendingExtension,
    customExtendMins,
    setCustomExtendMins,
    conflictModalOpen,
    setConflictModalOpen,
    conflictingMeetings,
    cascadeProposal,
    pendingExtension,
    applyAutoMove,
    isDeleteOpen,
    handleDeletePermanently,
  } = props;

  return (
    <>
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
              <div className="relative overflow-hidden border-b border-slate-100 px-7 pb-5 pt-6">
                {/* Decorative circles — tinted with the meeting's status color so it reads at a glance */}
                <div className="absolute -right-8 -top-8 h-[140px] w-[140px] rounded-full" style={{ background: `${statusCol.hex}14` }} />
                <div className="absolute -bottom-5 right-16 h-20 w-20 rounded-full" style={{ background: `${statusCol.hex}0d` }} />

                <div className="flex items-start justify-between gap-4 relative">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">Meeting · #{selectedAppointment?.id_main}</span>
                      <StatusPill status={effectiveStatus(selectedAppointment, now)} />
                    </div>
                    <h2 className="mb-1 text-[22px] font-extrabold text-slate-900">{selectedAppointment?.client_name}</h2>
                    <p className="flex items-center gap-1.5 text-[13px] text-slate-500">
                      <Building size={13} /> {selectedAppointment?.client_company || 'Independent'}
                      {selectedAppointment?.client_mobile && <><span className="text-slate-300">·</span><Phone size={12} />{selectedAppointment.client_mobile}</>}
                      {selectedAppointment?.client_email && <><span className="text-slate-300">·</span><Mail size={12} />{selectedAppointment.client_email}</>}
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
                    <span className="inline-flex items-center gap-1.5 rounded-md border border-slate-200 bg-slate-100 px-2.5 py-1 text-[11px] font-semibold text-slate-600">
                      <Calendar size={11} />
                      {formatDate(selectedAppointment.meeting_date, { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })}
                    </span>
                  )}
                  {selectedAppointment?.meeting_start_time && (
                    <span className="inline-flex items-center gap-1.5 rounded-md border border-slate-200 bg-slate-100 px-2.5 py-1 text-[11px] font-semibold text-slate-600">
                      <Clock size={11} />
                      {formatTime(selectedAppointment.meeting_start_time)}
                      {selectedAppointment?.meeting_end_time && ` – ${formatTime(selectedAppointment.meeting_end_time)}`}
                    </span>
                  )}
                  {selectedAppointment?.meeting_duration && (
                    <span className="inline-flex items-center gap-1.5 rounded-md border border-slate-200 bg-slate-100 px-2.5 py-1 text-[11px] font-semibold text-slate-600">
                      <Timer size={11} />
                      {selectedAppointment.meeting_duration >= 60
                        ? `${Math.floor(selectedAppointment.meeting_duration / 60)}h${selectedAppointment.meeting_duration % 60 ? ` ${selectedAppointment.meeting_duration % 60}m` : ''}`
                        : `${selectedAppointment.meeting_duration}m`}
                    </span>
                  )}
                  {selectedAppointment?.meeting_venue_area && (
                    <span className="inline-flex items-center gap-1.5 rounded-md border border-slate-200 bg-slate-100 px-2.5 py-1 text-[11px] font-semibold text-slate-600">
                      <MapPin size={11} /> {selectedAppointment.meeting_venue_area}
                    </span>
                  )}
                  {selectedAppointment?.badge_status && (
                    <span className="inline-flex items-center gap-1 rounded-md border border-green-200 bg-green-100 px-2.5 py-1 text-[11px] font-bold text-green-700">
                      <Star size={10} /> {selectedAppointment.badge_status}
                    </span>
                  )}
                </div>
              </div>
            );
          })()}

          {isEditOpen ? (
            <>
              <div className="px-7 py-3 bg-blue-50 border-b border-blue-100 flex items-center gap-2">
                <Edit2 size={13} className="text-blue-600 flex-shrink-0" />
                <p className="text-xs text-blue-700 font-medium">
                  <strong>Edit Details</strong> — Correct any incorrect information. This does <em>not</em> change the meeting status. To move a meeting to a new date/time, use <strong>Reschedule</strong> instead.
                </p>
              </div>
              <EditDetailsForm
                appointment={selectedAppointment}
                onSave={handleEdit}
                onCancel={() => setEditOpen(false)}
                loading={actionLoading === 'edit'}
              />
            </>
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
              <div className="flex h-[65vh]">
                {/* ── LEFT CONTENT ── */}
                <ScrollArea className="flex-1 border-r border-slate-100 bg-white">
                  <div className="p-6 space-y-7">

                    {/* Agenda */}
                    <section>
                      <div className="mb-3 flex items-center gap-1.5 text-[9px] font-extrabold uppercase tracking-widest text-slate-400 after:h-px after:flex-1 after:bg-slate-100"><ClipboardList size={11} /> Agenda</div>
                      <div className="p-4 rounded-xl bg-gradient-to-br from-slate-50 to-blue-50/30 border border-slate-100">
                        <p className="text-sm text-slate-600 italic leading-relaxed">&quot;{selectedAppointment?.meeting_agenda || 'No agenda provided.'}&quot;</p>
                      </div>
                    </section>

                    {/* Schedule */}
                    <section>
                      <div className="mb-3 flex items-center gap-1.5 text-[9px] font-extrabold uppercase tracking-widest text-slate-400 after:h-px after:flex-1 after:bg-slate-100"><Calendar size={11} /> Schedule</div>
                      <div className="grid grid-cols-3 gap-3">
                        {/* Date tile */}
                        <div className="rounded-xl border border-slate-200 bg-white px-3.5 py-3 shadow-sm flex items-center gap-3">
                          <DateTile dateStr={selectedAppointment?.meeting_date} />
                          <div>
                            <p className="text-[9px] font-bold text-slate-400 uppercase tracking-tight">Date</p>
                            <p className="text-sm font-bold text-slate-900">{formatDate(selectedAppointment?.meeting_date, { day: '2-digit', month: 'short', year: 'numeric' })}</p>
                            <p className="text-xs text-slate-500">{formatDate(selectedAppointment?.meeting_date, { weekday: 'long' }, '')}</p>
                          </div>
                        </div>
                        {/* Time */}
                        <div className="rounded-xl border border-slate-200 bg-white px-3.5 py-3 shadow-sm">
                          <p className="text-[9px] font-bold text-slate-400 uppercase tracking-tight mb-1">Start → End</p>
                          <p className="text-lg font-black text-[#0057E7] leading-none tabular-nums">{formatTime(selectedAppointment?.meeting_start_time)}</p>
                          {selectedAppointment?.meeting_end_time && (
                            <p className="text-xs text-slate-500 mt-1 font-semibold">→ {formatTime(selectedAppointment.meeting_end_time)}</p>
                          )}
                        </div>
                        {/* Duration */}
                        <div className="rounded-xl border border-slate-200 bg-white px-3.5 py-3 shadow-sm flex flex-col justify-center">
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
                      <div className="mb-3 flex items-center gap-1.5 text-[9px] font-extrabold uppercase tracking-widest text-slate-400 after:h-px after:flex-1 after:bg-slate-100"><User size={11} /> Client Information</div>
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
                        <div className="mb-3 flex items-center gap-1.5 text-[9px] font-extrabold uppercase tracking-widest text-slate-400 after:h-px after:flex-1 after:bg-slate-100"><Users size={11} /> BCL Attendees</div>
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
                      <div className="mb-3 flex items-center gap-1.5 text-[9px] font-extrabold uppercase tracking-widest text-slate-400 after:h-px after:flex-1 after:bg-slate-100"><CalendarClock size={11} /> Booking Details</div>
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
                      <div className="mb-3 flex items-center gap-1.5 text-[9px] font-extrabold uppercase tracking-widest text-slate-400 after:h-px after:flex-1 after:bg-slate-100"><Cloud size={11} /> Google Calendar</div>
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
                        <div className="mb-3 flex items-center gap-1.5 text-[9px] font-extrabold uppercase tracking-widest text-slate-400 after:h-px after:flex-1 after:bg-slate-100"><FileText size={11} /> Notes</div>
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

                    {!TERMINAL_STATUSES.has(effectiveStatus(selectedAppointment, now)) &&
                     !['confirmed'].includes(selectedAppointment?.status) && (
                      <ActionButton onClick={handleConfirm} loading={actionLoading === 'confirm'} icon={<UserCheck size={13} />} label="Confirm Meeting" className="bg-[#0057E7] hover:bg-[#004bc7] text-white border-none shadow-sm" />
                    )}

                    {!TERMINAL_STATUSES.has(effectiveStatus(selectedAppointment, now)) && (
                      <ActionButton onClick={handleMarkDone} loading={actionLoading === 'done'} icon={<CheckCircle size={13} />} label="Mark as Completed" className="bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border-emerald-200" />
                    )}

                    {!TERMINAL_STATUSES.has(effectiveStatus(selectedAppointment, now)) && (
                      <ActionButton onClick={openReschedule} icon={<RefreshCw size={13} />} label="Reschedule (Postpone)" className="hover:bg-orange-50 text-orange-700 border-orange-100" />
                    )}
                    <ActionButton onClick={() => setEditOpen(true)} icon={<Edit2 size={13} />} label="Edit Details (Fix Errors)" />

                    {!['cancelled', 'canceled'].includes(selectedAppointment?.status ?? '') &&
                     !TERMINAL_STATUSES.has(effectiveStatus(selectedAppointment, now)) && (
                      <ActionButton onClick={handleCancel} loading={actionLoading === 'cancel'} icon={<Ban size={13} />} label="Cancel Meeting" className="hover:bg-red-50 text-red-600 border-red-100" />
                    )}

                    <Separator className="my-2" />

                    {selectedAppointment?.google_event_id
                      ? <ActionButton onClick={handleUnsync} loading={actionLoading === 'unsync'} icon={<CloudOff size={13} />} label="Remove from Calendar" className="hover:bg-red-50 text-red-500 border-red-100" />
                      : <ActionButton onClick={handleSyncToCalendar} loading={actionLoading === 'sync'} icon={<Cloud size={13} />} label="Sync to Calendar" className="hover:bg-blue-50 text-blue-600 border-blue-100" />
                    }

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
            <DialogTitle className="text-orange-700 font-bold flex items-center gap-2">
              <RefreshCw size={16} /> Reschedule Meeting — Postpone to New Date/Time
            </DialogTitle>
            {selectedAppointment && (
              <p className="text-xs text-slate-500 font-medium mt-1">
                {selectedAppointment.client_name} · Currently {formatDate(selectedAppointment.meeting_date, { day: '2-digit', month: 'short', year: 'numeric' })} at {formatTime(selectedAppointment.meeting_start_time)}
              </p>
            )}
            <p className="text-[11px] text-slate-400 mt-1 italic">This will set the meeting status to "Rescheduled". Use <strong>Edit Details</strong> to fix incorrect information without changing the status.</p>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-3 py-2">
            <div className="col-span-2">
              <label className="mb-1.5 block text-[10px] font-bold uppercase tracking-wider text-slate-400">New Meeting Date *</label>
              <Input type="date" className="bg-slate-50 border-slate-200" value={rescheduleData.meeting_date} onChange={e => { setRescheduleData(p => ({ ...p, meeting_date: e.target.value })); setRescheduleConflict(''); }} />
            </div>
            <div>
              <label className="mb-1.5 block text-[10px] font-bold uppercase tracking-wider text-slate-400">Start Time *</label>
              <Input type="time" className="bg-slate-50 border-slate-200" value={rescheduleData.meeting_start_time} onChange={e => handleRschdStartTime(e.target.value)} />
            </div>
            <div>
              <label className="mb-1.5 block text-[10px] font-bold uppercase tracking-wider text-slate-400">Duration</label>
              <Select value={rescheduleData.meeting_duration} onValueChange={handleRschdDuration}>
                <SelectTrigger className="bg-slate-50 border-slate-200"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {[['15', '15 min'], ['30', '30 min'], ['45', '45 min'], ['60', '1 hour'], ['90', '1.5 hrs'], ['120', '2 hrs'], ['180', '3 hrs'], ['240', '4 hrs'], ['300', '5 hrs']].map(([v, l]) => <SelectItem key={v} value={v}>{l}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="mb-1.5 block text-[10px] font-bold uppercase tracking-wider text-slate-400">End Time (calc.)</label>
              <Input className="cursor-not-allowed border-slate-200 bg-slate-50 text-slate-500" readOnly value={rescheduleData.meeting_end_time || '—'} />
            </div>
            <div>
              <label className="mb-1.5 block text-[10px] font-bold uppercase tracking-wider text-slate-400">Travel Time</label>
              <Select value={rescheduleData.venue_distance} onValueChange={handleRschdTravel}>
                <SelectTrigger className="bg-slate-50 border-slate-200"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {[['0', '0 min (Virtual)'], ['10', '10 min'], ['15', '15 min'], ['30', '30 min'], ['45', '45 min'], ['60', '1 hour'], ['90', '1.5 hrs'], ['120', '2 hrs']].map(([v, l]) => <SelectItem key={v} value={v}>{l}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="mb-1.5 block text-[10px] font-bold uppercase tracking-wider text-slate-400">Calendar Slot Start</label>
              <Input className="cursor-not-allowed border-slate-200 bg-slate-50 text-slate-500" readOnly value={rescheduleData.meeting_slot_start_time || '—'} />
            </div>
            <div>
              <label className="mb-1.5 block text-[10px] font-bold uppercase tracking-wider text-slate-400">Calendar Slot End</label>
              <Input className="cursor-not-allowed border-slate-200 bg-slate-50 text-slate-500" readOnly value={rescheduleData.meeting_slot_end_time || '—'} />
            </div>
            <div>
              <label className="mb-1.5 block text-[10px] font-bold uppercase tracking-wider text-slate-400">Meeting Type</label>
              <Select value={rescheduleData.meeting_type} onValueChange={v => setRescheduleData(p => ({ ...p, meeting_type: v }))}>
                <SelectTrigger className="bg-slate-50 border-slate-200"><SelectValue /></SelectTrigger>
                <SelectContent><SelectItem value="inPerson">In-Person</SelectItem><SelectItem value="virtual">Virtual</SelectItem></SelectContent>
              </Select>
            </div>
            <div>
              <label className="mb-1.5 block text-[10px] font-bold uppercase tracking-wider text-slate-400">Venue / Area</label>
              <Input className="bg-slate-50 border-slate-200" placeholder="e.g. BCL Boardroom" value={rescheduleData.meeting_venue_area} onChange={e => setRescheduleData(p => ({ ...p, meeting_venue_area: e.target.value }))} />
            </div>
            <div className="col-span-2">
              <label className="mb-1.5 block text-[10px] font-bold uppercase tracking-wider text-slate-400">Agenda</label>
              <Textarea rows={2} className="bg-slate-50 border-slate-200" value={rescheduleData.meeting_agenda} onChange={e => setRescheduleData(p => ({ ...p, meeting_agenda: e.target.value }))} />
            </div>
            <div className="col-span-2 text-[11px] font-semibold text-blue-700 bg-blue-50 border border-blue-100 rounded-lg px-3 py-2 flex items-center gap-2">
              <Cloud size={12} /> Calendar will be updated automatically for BCL attendees.
            </div>
            {rescheduleConflict && (
              <div className="col-span-2 flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-3.5 py-2.5 text-xs font-semibold text-red-800"><AlertCircle size={14} /> {rescheduleConflict}</div>
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
    </>
  );
}
