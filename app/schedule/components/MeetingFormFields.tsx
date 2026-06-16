// @ts-nocheck
'use client';

import React from 'react';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Calendar, Clock, MapPin, Link2, Hash, Video } from 'lucide-react';
import { CREATION_STATUSES } from '@/utils/appointmentStatuses';

// ── CONSTANTS ────────────────────────────────────────────────────────
export const BLANK_MEETING_FORM = {
  bookingDate: '',
  bookingDay: '',
  meetingDate: '',
  meetingDay: '',
  meetingType: '',
  meetingVenueArea: '',
  otherMeetingVenueArea: '',
  virtualMeetingMode: '',
  meetingLink: '',
  meetingId: '',
  // derived from clientAttendees for DB insert
  clientName: '',
  clientCompany: '',
  clientMobile: '',
  clientEmail: '',
  // structured attendee arrays
  clientAttendees: [] as any[],
  thirdPartyAttendees: [] as any[],
  bclAttendees: [] as string[],
  bclAttendeeNames: [] as string[],
  bclAttendeeEmailMap: {} as Record<string, string>,
  bclAttendeeMobile: '+254700298298',
  meetingAgenda: '',
  otherMeetingAgenda: '',
  meetingDuration: '',
  venueDistance: '10',
  meetingStartTime: '',
  meetingEndTime: '',
  meetingSlotStartTime: '',
  meetingSlotEndTime: '',
  status: 'confirmed',
};

const DURATION_OPTIONS: [string, string][] = [
  ['15', '15 min'], ['30', '30 min'], ['45', '45 min'],
  ['60', '1 hour'], ['90', '1.5 hrs'], ['120', '2 hrs'],
  ['180', '3 hrs'], ['240', '4 hrs'], ['300', '5 hrs'],
];

const TRAVEL_OPTIONS: [string, string][] = [
  ['0', '0 min (Virtual)'], ['10', '10 min'], ['15', '15 min'],
  ['30', '30 min'], ['45', '45 min'], ['60', '1 hour'],
  ['90', '1.5 hrs'], ['120', '2 hrs'],
];

const VENUE_OPTIONS: [string, string][] = [
  ['BCL BR', 'BCL Boardroom'],
  ['Client Office', 'Client Office'],
  ['Virtual', 'Virtual / Online'],
  ['Other', 'Other (Specify)'],
];

const AGENDA_OPTIONS: [string, string][] = [
  ['Introduction & Needs Discovery', 'Introduction & Needs Discovery'],
  ['Proposal Review', 'Proposal Review'],
  ['Project Kick-off', 'Project Kick-off'],
  ['Project Update/Review', 'Project Update/Review'],
  ['Product/Service Demo', 'Product/Service Demo'],
  ['Support/Training', 'Support/Training'],
  ['Partnership Discussion', 'Partnership Discussion'],
  ['General Catch-up', 'General Catch-up'],
  ['Other', 'Other (Specify)'],
];

// ── TIME HELPERS ─────────────────────────────────────────────────────
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

// ── COMPONENT PROPS ──────────────────────────────────────────────────
interface MeetingFormFieldsProps {
  form: typeof BLANK_MEETING_FORM;
  setForm: (fn: (prev: any) => any) => void;
  /** Which section of fields to render */
  tab?: 'basicInfo' | 'scheduling';
}

// ── MAIN COMPONENT ───────────────────────────────────────────────────
export function MeetingFormFields({ form, setForm, tab = 'basicInfo' }: MeetingFormFieldsProps) {

  const handleStartTime = (val: string) => {
    const dur = parseInt(form.meetingDuration) || 0;
    const travel = parseInt(form.venueDistance) || 0;
    const end = calcEndTime(val, dur);
    setForm(p => ({
      ...p,
      meetingStartTime: val,
      meetingEndTime: end,
      meetingSlotStartTime: calcSlotTime(val, -travel),
      meetingSlotEndTime: calcSlotTime(end, travel),
    }));
  };

  const handleDuration = (val: string) => {
    const travel = parseInt(form.venueDistance) || 0;
    const end = calcEndTime(form.meetingStartTime, parseInt(val) || 0);
    setForm(p => ({
      ...p,
      meetingDuration: val,
      meetingEndTime: end,
      meetingSlotEndTime: calcSlotTime(end, travel),
    }));
  };

  const handleTravel = (val: string) => {
    const travel = parseInt(val) || 0;
    setForm(p => ({
      ...p,
      venueDistance: val,
      meetingSlotStartTime: calcSlotTime(p.meetingStartTime, -travel),
      meetingSlotEndTime: calcSlotTime(p.meetingEndTime, travel),
    }));
  };

  const handleMeetingType = (val: string) => {
    setForm(p => ({
      ...p,
      meetingType: val,
      ...(val !== 'virtual' ? { virtualMeetingMode: '', meetingLink: '', meetingId: '' } : {}),
    }));
  };

  const handleVirtualMode = (val: string) => {
    setForm(p => ({
      ...p,
      virtualMeetingMode: val,
      ...(val !== 'external' ? { meetingLink: '', meetingId: '' } : {}),
    }));
  };

  const handleVenueArea = (val: string) => {
    setForm(p => ({
      ...p,
      meetingVenueArea: val,
      ...(val !== 'Other' ? { otherMeetingVenueArea: '' } : {}),
    }));
  };

  const handleAgenda = (val: string) => {
    setForm(p => ({
      ...p,
      meetingAgenda: val,
      ...(val !== 'Other' ? { otherMeetingAgenda: '' } : {}),
    }));
  };

  return (
    <div className="grid grid-cols-2 gap-x-6 gap-y-5">

      {/* ── BASIC INFO TAB ── */}
      {tab === 'basicInfo' && (
        <>
          {/* Booking date row — read-only, auto-populated by parent */}
          <div className="space-y-2">
            <label className="text-[11px] font-bold text-slate-500 uppercase tracking-widest">Booking Date</label>
            <div className="relative">
              <Calendar className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
              <Input className="h-11 pl-10 border-slate-200 bg-slate-50 text-slate-400 cursor-not-allowed" readOnly value={form.bookingDate || ''} />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-[11px] font-bold text-slate-500 uppercase tracking-widest">Booking Day</label>
            <div className="relative">
              <Calendar className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
              <Input className="h-11 pl-10 border-slate-200 bg-slate-50 text-slate-400 cursor-not-allowed" readOnly value={form.bookingDay || ''} />
            </div>
          </div>

          {/* Meeting date row */}
          <div className="space-y-2">
            <label className="text-[11px] font-bold text-slate-500 uppercase tracking-widest">Meeting Date *</label>
            <div className="relative">
              <Calendar className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
              <Input
                type="date"
                className="h-11 pl-10 border-slate-200"
                min={new Date().toISOString().split('T')[0]}
                value={form.meetingDate}
                onChange={e => {
                  const val = e.target.value;
                  const d = new Date(val);
                  setForm(p => ({
                    ...p,
                    meetingDate: val,
                    meetingDay: val && !isNaN(d.getTime()) ? d.toLocaleDateString('en-US', { weekday: 'long' }) : '',
                  }));
                }}
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-[11px] font-bold text-slate-500 uppercase tracking-widest">Meeting Day</label>
            <div className="relative">
              <Calendar className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
              <Input className="h-11 pl-10 border-slate-200 bg-slate-50 text-slate-400 cursor-not-allowed" readOnly value={form.meetingDay || ''} />
            </div>
          </div>

          {/* Status */}
          <div className="space-y-2">
            <label className="text-[11px] font-bold text-slate-500 uppercase tracking-widest">Meeting Status</label>
            <Select value={form.status} onValueChange={v => setForm(p => ({ ...p, status: v }))}>
              <SelectTrigger className="h-11 border-slate-200 bg-white"><SelectValue /></SelectTrigger>
              <SelectContent>
                {CREATION_STATUSES.map(s => (
                  <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Meeting Type */}
          <div className="space-y-2">
            <label className="text-[11px] font-bold text-slate-500 uppercase tracking-widest">Meeting Type *</label>
            <Select value={form.meetingType} onValueChange={handleMeetingType}>
              <SelectTrigger className="h-11 border-slate-200 bg-white">
                <div className="flex items-center gap-2">
                  {form.meetingType === 'virtual' ? <Video size={14} className="text-blue-500" /> : <MapPin size={14} className="text-orange-500" />}
                  <SelectValue placeholder="Select type" />
                </div>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="inPerson">In Person</SelectItem>
                <SelectItem value="virtual">Virtual</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Virtual mode — conditional */}
          {form.meetingType === 'virtual' && (
            <div className="col-span-2 space-y-2">
              <label className="text-[11px] font-bold text-slate-500 uppercase tracking-widest">How Will This Be Joined? *</label>
              <Select value={form.virtualMeetingMode} onValueChange={handleVirtualMode}>
                <SelectTrigger className="h-11 border-slate-200 bg-white"><SelectValue placeholder="Select mode" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="hosted">We'll generate a Google Meet link</SelectItem>
                  <SelectItem value="external">Provide an existing link</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}

          {/* External link fields — conditional */}
          {form.meetingType === 'virtual' && form.virtualMeetingMode === 'external' && (
            <>
              <div className="space-y-2">
                <label className="text-[11px] font-bold text-slate-500 uppercase tracking-widest">Meeting Link *</label>
                <div className="relative">
                  <Link2 className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                  <Input
                    className="h-11 pl-10 border-slate-200"
                    placeholder="https://zoom.us/j/..."
                    value={form.meetingLink}
                    onChange={e => setForm(p => ({ ...p, meetingLink: e.target.value }))}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-[11px] font-bold text-slate-500 uppercase tracking-widest">Meeting ID</label>
                <div className="relative">
                  <Hash className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                  <Input
                    className="h-11 pl-10 border-slate-200"
                    placeholder="e.g. 123 4567 8901"
                    value={form.meetingId}
                    onChange={e => setForm(p => ({ ...p, meetingId: e.target.value }))}
                  />
                </div>
              </div>
            </>
          )}

          {/* Venue Area */}
          <div className="space-y-2">
            <label className="text-[11px] font-bold text-slate-500 uppercase tracking-widest">Meeting Venue *</label>
            <Select value={form.meetingVenueArea} onValueChange={handleVenueArea}>
              <SelectTrigger className="h-11 border-slate-200 bg-white">
                <div className="flex items-center gap-2">
                  <MapPin size={14} className="text-slate-400" />
                  <SelectValue placeholder="Select venue" />
                </div>
              </SelectTrigger>
              <SelectContent>
                {VENUE_OPTIONS.map(([v, l]) => <SelectItem key={v} value={v}>{l}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          {/* Other venue — conditional */}
          {form.meetingVenueArea === 'Other' && (
            <div className="space-y-2">
              <label className="text-[11px] font-bold text-slate-500 uppercase tracking-widest">Specify Venue *</label>
              <div className="relative">
                <MapPin className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                <Input
                  className="h-11 pl-10 border-slate-200"
                  placeholder="e.g. Café name or address"
                  value={form.otherMeetingVenueArea}
                  onChange={e => setForm(p => ({ ...p, otherMeetingVenueArea: e.target.value }))}
                />
              </div>
            </div>
          )}
        </>
      )}

      {/* ── SCHEDULING TAB ── */}
      {tab === 'scheduling' && (
        <>
          <div className="space-y-2">
            <label className="text-[11px] font-bold text-slate-500 uppercase tracking-widest">Start Time *</label>
            <div className="relative">
              <Clock className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
              <Input
                type="time"
                className="h-11 pl-10 border-slate-200"
                value={form.meetingStartTime}
                onChange={e => handleStartTime(e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-[11px] font-bold text-slate-500 uppercase tracking-widest">Duration *</label>
            <Select value={form.meetingDuration} onValueChange={handleDuration}>
              <SelectTrigger className="h-11 border-slate-200 bg-white"><SelectValue placeholder="Select duration" /></SelectTrigger>
              <SelectContent>
                {DURATION_OPTIONS.map(([v, l]) => <SelectItem key={v} value={v}>{l}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <label className="text-[11px] font-bold text-slate-500 uppercase tracking-widest">Travel Time (Each Way) *</label>
            <Select value={form.venueDistance} onValueChange={handleTravel}>
              <SelectTrigger className="h-11 border-slate-200 bg-white"><SelectValue /></SelectTrigger>
              <SelectContent>
                {TRAVEL_OPTIONS.map(([v, l]) => <SelectItem key={v} value={v}>{l}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          {/* Timing summary bar */}
          <div className="col-span-2 grid grid-cols-3 bg-slate-900 rounded-xl p-5 text-white">
            <div className="text-center border-r border-slate-700">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Ends At</p>
              <p className="text-xl font-mono font-bold text-blue-400">{form.meetingEndTime || '--:--'}</p>
            </div>
            <div className="text-center border-r border-slate-700">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Slot Start</p>
              <p className="text-xl font-mono font-bold text-white">{form.meetingSlotStartTime || '--:--'}</p>
            </div>
            <div className="text-center">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Slot End</p>
              <p className="text-xl font-mono font-bold text-white">{form.meetingSlotEndTime || '--:--'}</p>
            </div>
          </div>

          {/* Agenda */}
          <div className="col-span-2 space-y-2">
            <label className="text-[11px] font-bold text-slate-500 uppercase tracking-widest">Meeting Agenda *</label>
            <Select value={form.meetingAgenda} onValueChange={handleAgenda}>
              <SelectTrigger className="h-11 border-slate-200 bg-white"><SelectValue placeholder="Select agenda" /></SelectTrigger>
              <SelectContent>
                {AGENDA_OPTIONS.map(([v, l]) => <SelectItem key={v} value={v}>{l}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          {/* Other agenda — conditional */}
          {form.meetingAgenda === 'Other' && (
            <div className="col-span-2 space-y-2">
              <label className="text-[11px] font-bold text-slate-500 uppercase tracking-widest">Specify Agenda *</label>
              <Textarea
                className="min-h-[80px] border-slate-200 resize-none p-4"
                placeholder="Briefly describe the meeting purpose…"
                value={form.otherMeetingAgenda}
                onChange={e => setForm(p => ({ ...p, otherMeetingAgenda: e.target.value }))}
              />
            </div>
          )}
        </>
      )}
    </div>
  );
}
