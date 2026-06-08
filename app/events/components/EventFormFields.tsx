// @ts-nocheck
'use client';

import React from 'react';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Checkbox } from '@/components/ui/checkbox';
import { Loader2, X, User } from 'lucide-react';
import { EVENT_TYPES } from '@/utils/appointmentStyles';
import { MEETING_STATUSES, STATUS_PILL_CLASSES } from '@/utils/appointmentStatuses';

// ── BLANK CREATE FORM ────────────────────────────────────────────────────────
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

// ── TIME HELPERS — mirrors app/schedule/page.tsx calcEndTime/calcSlotTime ───
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
}

// ── Shared form fields renderer — mirrors the meetings creation/edit dialog ─
export function EventFormFields({ form, setForm, attendeeOpen, setAttendeeOpen, bclAttendeesList, loadingBclAttendees }: EventFormFieldsProps) {
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

        {/* Start → Duration → End */}
        <div>
          <label className="ev-field-label">Start Time *</label>
          <Input type="time" className="ev-input" value={form.event_start_time} onChange={e => handleStartTime(e.target.value)} />
        </div>
        <div>
          <label className="ev-field-label">Duration (mins) *</label>
          <Select value={form.event_duration} onValueChange={handleDuration}>
            <SelectTrigger className="ev-select-trigger"><SelectValue placeholder="Select duration" /></SelectTrigger>
            <SelectContent>{DURATION_OPTIONS.map(([v, l]) => <SelectItem key={v} value={v}>{l}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <div>
          <label className="ev-field-label">End Time (auto-calc)</label>
          <Input className="ev-input" readOnly value={form.event_end_time || '—'} style={{ background: '#f7fafa', color: '#8ca4a8' }} />
        </div>

        {/* Travel + Calendar Slot */}
        <div>
          <label className="ev-field-label">Travel Time (Each Way) *</label>
          <Select value={form.venue_distance} onValueChange={handleTravel}>
            <SelectTrigger className="ev-select-trigger"><SelectValue placeholder="Select travel time" /></SelectTrigger>
            <SelectContent>{TRAVEL_OPTIONS.map(([v, l]) => <SelectItem key={v} value={v}>{l}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <div>
          <label className="ev-field-label">Calendar Slot Start (auto-calc)</label>
          <Input className="ev-input" readOnly value={form.event_slot_start_time || '—'} style={{ background: '#f7fafa', color: '#8ca4a8' }} />
        </div>
        <div>
          <label className="ev-field-label">Calendar Slot End (auto-calc)</label>
          <Input className="ev-input" readOnly value={form.event_slot_end_time || '—'} style={{ background: '#f7fafa', color: '#8ca4a8' }} />
        </div>

        <div>
          <label className="ev-field-label">Venue Name</label>
          <Input className="ev-input" placeholder="e.g. Grand Ballroom" value={form.event_venue} onChange={e => setForm(p => ({ ...p, event_venue: e.target.value }))} />
        </div>
        <div>
          <label className="ev-field-label">Venue Area / Location</label>
          <Input className="ev-input" placeholder="e.g. Nairobi CBD" value={form.event_venue_area} onChange={e => setForm(p => ({ ...p, event_venue_area: e.target.value }))} />
        </div>

        {/* Format + virtual sub-fields */}
        <div>
          <label className="ev-field-label">Format *</label>
          <Select value={form.event_format} onValueChange={handleFormat}>
            <SelectTrigger className="ev-select-trigger"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="physical">Physical</SelectItem>
              <SelectItem value="virtual">Virtual</SelectItem>
            </SelectContent>
          </Select>
        </div>
        {form.event_format === 'virtual' && (
          <div>
            <label className="ev-field-label">How will this be joined? *</label>
            <Select value={form.virtual_meeting_mode} onValueChange={handleVirtualMode}>
              <SelectTrigger className="ev-select-trigger"><SelectValue placeholder="Select mode" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="hosted">We'll generate a Google Meet link</SelectItem>
                <SelectItem value="external">Provide an existing link</SelectItem>
              </SelectContent>
            </Select>
          </div>
        )}
        {form.event_format === 'virtual' && form.virtual_meeting_mode === 'external' && (
          <>
            <div>
              <label className="ev-field-label">Meeting Link *</label>
              <Input className="ev-input" placeholder="https://zoom.us/j/..." value={form.meeting_link} onChange={e => setForm(p => ({ ...p, meeting_link: e.target.value }))} />
            </div>
            <div>
              <label className="ev-field-label">Meeting ID</label>
              <Input className="ev-input" placeholder="e.g. 123 4567 8901" value={form.meeting_id} onChange={e => setForm(p => ({ ...p, meeting_id: e.target.value }))} />
            </div>
          </>
        )}

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
                          onClick={e => { e.stopPropagation(); toggleEventAttendee(setForm, (form.bcl_attendee as string[])[i], name, false); }}>
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
                        onClick={() => toggleEventAttendee(setForm, a.id, a.displayName, !sel)}>
                        <Checkbox checked={sel} onCheckedChange={c => toggleEventAttendee(setForm, a.id, a.displayName, !!c)} onClick={e => e.stopPropagation()} />
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
}
