// @ts-nocheck
'use client';

import React from 'react';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Checkbox } from '@/components/ui/checkbox';
import { Loader2, X, Calendar, Clock, MapPin, Users, Info, Building, Phone, Mail, Globe } from 'lucide-react';
import { EVENT_TYPES } from '@/utils/appointmentStyles';
import { MEETING_STATUSES, STATUS_PILL_CLASSES } from '@/utils/appointmentStatuses';

// ── CONSTANTS ────────────────────────────────────────────────────────
export const BLANK_FORM = {
  event_name: '', event_type: 'other',
  event_date: '', event_start_time: '', event_end_time: '',
  event_duration: '',
  venue_distance: '10',
  event_slot_start_time: '', event_slot_end_time: '',
  event_venue: '', event_venue_area: '',
  event_format: 'physical',
  virtual_meeting_mode: '', meeting_link: '', meeting_id: '',
  organizer_name: '', organizer_company: '', organizer_email: '', organizer_mobile: '',
  event_description: '', expected_attendees: '',
  bcl_attendee: [] as string[],
  bcl_attendee_names: [] as string[],
  status: 'upcoming',
};

const DURATION_OPTIONS: [string, string][] = [
  ['15', '15 min'], ['30', '30 min'], ['45', '45 min'], ['60', '1 hour'],
  ['90', '1.5 hrs'], ['120', '2 hrs'], ['180', '3 hrs'], ['240', '4 hrs'], ['300', '5 hrs'],
];

const TRAVEL_OPTIONS: [string, string][] = [
  ['0', '0 min'], ['10', '10 min'], ['15', '15 min'], ['30', '30 min'],
  ['45', '45 min'], ['60', '1 hour'], ['90', '1.5 hrs'], ['120', '2 hrs'],
];

// ── TIME HELPERS ──────────────────────────────────────────────────────
export function calcEndTime(start: string, mins: number): string {
  if (!start || isNaN(mins) || mins <= 0) return '';
  const [h, m] = start.split(':').map(Number);
  if (isNaN(h) || isNaN(m)) return '';
  const total = h * 60 + m + mins;
  return `${String(Math.floor(total / 60) % 24).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`;
}

export function calcSlotTime(base: string, offset: number): string {
  if (!base || isNaN(offset)) return '';
  const [h, m] = base.split(':').map(Number);
  if (isNaN(h) || isNaN(m)) return '';
  const d = new Date(); d.setHours(h, m + offset, 0, 0);
  return d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
}

function toggleEventAttendee(setForm: any, id: string, name: string, checked: boolean) {
  setForm((p: any) => {
    const ids: string[] = Array.isArray(p.bcl_attendee) ? p.bcl_attendee : [];
    const names: string[] = Array.isArray(p.bcl_attendee_names) ? p.bcl_attendee_names : [];
    if (checked) return { ...p, bcl_attendee: [...ids, id], bcl_attendee_names: [...names, name] };
    const i = ids.indexOf(id);
    return { ...p, bcl_attendee: ids.filter((_, j) => j !== i), bcl_attendee_names: names.filter((_, j) => j !== i) };
  });
}

interface EventFormFieldsProps {
  form: typeof BLANK_FORM;
  setForm: (fn: (prev: any) => any) => void;
  attendeeOpen: boolean;
  setAttendeeOpen: (v: boolean) => void;
  bclAttendeesList: { id: string; displayName: string }[];
  loadingBclAttendees: boolean;
  tab?: "logistics" | "organizer" | "details";
}

export function EventFormFields({ 
  form, setForm, attendeeOpen, setAttendeeOpen, 
  bclAttendeesList, loadingBclAttendees, 
  tab = "logistics" 
}: EventFormFieldsProps) {

  const handleStartTime = (val: string) => {
    const dur = parseInt(form.event_duration) || 0;
    const end = calcEndTime(val, dur);
    const travel = parseInt(form.venue_distance) || 0;
    setForm(p => ({
      ...p, event_start_time: val, event_end_time: end,
      event_slot_start_time: calcSlotTime(val, -travel), event_slot_end_time: calcSlotTime(end, travel),
    }));
  };

  const handleDuration = (val: string) => {
    const end = calcEndTime(form.event_start_time, parseInt(val) || 0);
    const travel = parseInt(form.venue_distance) || 0;
    setForm(p => ({ ...p, event_duration: val, event_end_time: end, event_slot_end_time: calcSlotTime(end, travel) }));
  };

  const handleTravel = (val: string) => {
    const travel = parseInt(val) || 0;
    setForm(p => ({
      ...p, venue_distance: val,
      event_slot_start_time: calcSlotTime(p.event_start_time, -travel),
      event_slot_end_time: calcSlotTime(p.event_end_time, travel),
    }));
  };

  const handleFormat = (val: string) => {
    setForm(p => ({
      ...p, event_format: val,
      ...(val !== 'virtual' ? { virtual_meeting_mode: '', meeting_link: '', meeting_id: '' } : {}),
    }));
  };

  const handleVirtualMode = (val: string) => {
    setForm(p => ({ ...p, virtual_meeting_mode: val, ...(val !== 'external' ? { meeting_link: '', meeting_id: '' } : {}) }));
  };

  return (
    <div className="grid grid-cols-2 gap-x-6 gap-y-5">
      
      {/* ── LOGISTICS TAB ── */}
      {tab === "logistics" && (
        <>
          <div className="col-span-2">
            <label className="ev-field-label">Event Name *</label>
            <Input className="h-10" placeholder="e.g. Annual Gala Dinner" value={form.event_name} onChange={e => setForm(p => ({ ...p, event_name: e.target.value }))} />
          </div>
          
          <div>
            <label className="ev-field-label">Event Type *</label>
            <Select value={form.event_type} onValueChange={v => setForm(p => ({ ...p, event_type: v }))}>
              <SelectTrigger className="h-10"><SelectValue /></SelectTrigger>
              <SelectContent>{EVENT_TYPES.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}</SelectContent>
            </Select>
          </div>

          <div>
            <label className="ev-field-label">Status</label>
            <Select value={form.status} onValueChange={v => setForm(p => ({ ...p, status: v }))}>
              <SelectTrigger className="h-10"><SelectValue /></SelectTrigger>
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
            <Input type="date" className="h-10" value={form.event_date} onChange={e => setForm(p => ({ ...p, event_date: e.target.value }))} />
          </div>

          <div>
            <label className="ev-field-label">Start Time *</label>
            <Input type="time" className="h-10" value={form.event_start_time} onChange={e => handleStartTime(e.target.value)} />
          </div>

          <div>
            <label className="ev-field-label">Duration (mins) *</label>
            <Select value={form.event_duration} onValueChange={handleDuration}>
              <SelectTrigger className="h-10"><SelectValue placeholder="Select duration" /></SelectTrigger>
              <SelectContent>{DURATION_OPTIONS.map(([v, l]) => <SelectItem key={v} value={v}>{l}</SelectItem>)}</SelectContent>
            </Select>
          </div>

          <div>
            <label className="ev-field-label">End Time (auto-calc)</label>
            <Input className="h-10 bg-slate-50 text-slate-400" readOnly value={form.event_end_time || '—'} />
          </div>

          <div className="col-span-2 grid grid-cols-2 gap-4 p-4 bg-slate-50 rounded-xl border border-slate-100">
             <div>
                <label className="ev-field-label">Travel Time (Each Way)</label>
                <Select value={form.venue_distance} onValueChange={handleTravel}>
                  <SelectTrigger className="h-10 bg-white"><SelectValue /></SelectTrigger>
                  <SelectContent>{TRAVEL_OPTIONS.map(([v, l]) => <SelectItem key={v} value={v}>{l}</SelectItem>)}</SelectContent>
                </Select>
             </div>
             <div>
                <label className="ev-field-label">Format *</label>
                <Select value={form.event_format} onValueChange={handleFormat}>
                  <SelectTrigger className="h-10 bg-white"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="physical">Physical</SelectItem>
                    <SelectItem value="virtual">Virtual</SelectItem>
                  </SelectContent>
                </Select>
             </div>
          </div>

          <div className="col-span-2">
            <label className="ev-field-label">Venue Name</label>
            <Input className="h-10" placeholder="e.g. Grand Ballroom" value={form.event_venue} onChange={e => setForm(p => ({ ...p, event_venue: e.target.value }))} />
          </div>
        </>
      )}

      {/* ── ORGANIZER TAB ── */}
      {tab === "organizer" && (
        <>
          <div className="col-span-2">
            <label className="ev-field-label">Organizer Name</label>
            <Input className="h-10" value={form.organizer_name} onChange={e => setForm(p => ({ ...p, organizer_name: e.target.value }))} />
          </div>
          <div>
            <label className="ev-field-label">Organizer Company</label>
            <Input className="h-10" value={form.organizer_company} onChange={e => setForm(p => ({ ...p, organizer_company: e.target.value }))} />
          </div>
          <div>
            <label className="ev-field-label">Organizer Mobile</label>
            <Input className="h-10" value={form.organizer_mobile} onChange={e => setForm(p => ({ ...p, organizer_mobile: e.target.value }))} />
          </div>
          <div>
            <label className="ev-field-label">Organizer Email</label>
            <Input type="email" className="h-10" value={form.organizer_email} onChange={e => setForm(p => ({ ...p, organizer_email: e.target.value }))} />
          </div>
          <div>
            <label className="ev-field-label">Expected Attendees</label>
            <Input type="number" className="h-10" min={0} value={form.expected_attendees} onChange={e => setForm(p => ({ ...p, expected_attendees: e.target.value }))} />
          </div>

          <div className="col-span-2 pt-4 border-t mt-2">
            <label className="ev-field-label">BCL Attendees</label>
            {loadingBclAttendees ? (
              <div className="flex items-center gap-2 h-10 text-slate-400 text-sm italic">
                <Loader2 size={14} className="animate-spin" /> Loading attendees…
              </div>
            ) : (
              <Popover open={attendeeOpen} onOpenChange={setAttendeeOpen}>
                <PopoverTrigger asChild>
                  <button className="w-full min-h-[40px] px-3 py-2 text-sm border rounded-lg bg-white flex flex-wrap gap-1.5 items-center text-left">
                    {(!form.bcl_attendee || form.bcl_attendee.length === 0) ? (
                      <span className="text-slate-400">Select internal attendees…</span>
                    ) : (
                      form.bcl_attendee_names.map((name, i) => (
                        <span key={i} className="inline-flex items-center gap-1 bg-slate-100 px-2 py-1 rounded text-xs font-bold text-blue-700">
                          {name}
                          <X size={10} className="cursor-pointer text-slate-400" onClick={e => { e.stopPropagation(); toggleEventAttendee(setForm, form.bcl_attendee[i], name, false); }} />
                        </span>
                      ))
                    )}
                  </button>
                </PopoverTrigger>
                <PopoverContent className="w-[280px] p-2 bg-white shadow-xl rounded-xl border-slate-200" align="start">
                  <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest p-2 border-b mb-1">Select Members</div>
                  <div className="max-h-[200px] overflow-y-auto">
                    {bclAttendeesList.map(a => {
                      const isSel = form.bcl_attendee?.includes(a.id);
                      return (
                        <div key={a.id} className="flex items-center gap-3 p-2 hover:bg-slate-50 rounded-lg cursor-pointer" onClick={() => toggleEventAttendee(setForm, a.id, a.displayName, !isSel)}>
                          <Checkbox checked={isSel} />
                          <span className="text-sm font-medium text-slate-700">{a.displayName}</span>
                        </div>
                      );
                    })}
                  </div>
                </PopoverContent>
              </Popover>
            )}
          </div>
        </>
      )}

      {/* ── DETAILS TAB ── */}
      {tab === "details" && (
        <div className="col-span-2">
          <label className="ev-field-label">Description / Internal Notes</label>
          <Textarea 
            className="min-h-[250px] leading-relaxed" 
            placeholder="Describe event objectives, agenda items, or specific setup requirements..." 
            value={form.event_description} 
            onChange={e => setForm(p => ({ ...p, event_description: e.target.value }))} 
          />
        </div>
      )}
    </div>
  );
}