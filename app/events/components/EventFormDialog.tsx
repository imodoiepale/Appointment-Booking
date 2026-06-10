// @ts-nocheck
'use client';

import React from 'react';
import { 
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter 
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { SearchableSelect } from "@/components/ui/searchable-select";
import { 
  Loader2, Calendar, Clock, MapPin, Video, Users, 
  ChevronRight, FileText, Briefcase, Globe 
} from 'lucide-react';
import { EVENT_TYPES } from '@/utils/appointmentStyles';
import { CREATION_STATUSES } from '@/utils/appointmentStatuses';

// ── HELPERS ──────────────────────────────────────────────────────────────────

export const BLANK_FORM = {
  event_name: '', event_type: 'other',
  event_date: '', event_start_time: '', event_end_time: '',
  event_duration: '60',
  venue_distance: '10',
  event_slot_start_time: '', event_slot_end_time: '',
  event_venue: '', event_venue_area: '',
  event_format: 'physical',
  virtual_meeting_mode: '', meeting_link: '', meeting_id: '',
  organizer_name: '', organizer_company: '', organizer_email: '', organizer_mobile: '',
  event_description: '', expected_attendees: '',
  bcl_attendee: [] as string[],
  bcl_attendee_names: [] as string[],
  status: 'confirmed',
};

const DURATION_OPTIONS: [string, string][] = [
  ['15', '15 min'], ['30', '30 min'], ['45', '45 min'], ['60', '1 hour'],
  ['90', '1.5 hrs'], ['120', '2 hrs'], ['180', '3 hrs'], ['240', '4 hrs'], ['300', '5 hrs'],
];

const TRAVEL_OPTIONS: [string, string][] = [
  ['0', '0 min'], ['10', '10 min'], ['15', '15 min'], ['30', '30 min'],
  ['45', '45 min'], ['60', '1 hour'], ['90', '1.5 hrs'], ['120', '2 hrs'],
];

export function calcEndTime(start: string, mins: number): string {
  if (!start || isNaN(mins) || mins <= 0) return '';
  const [h, m] = start.split(':').map(Number);
  const total = h * 60 + m + mins;
  return `${String(Math.floor(total / 60) % 24).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`;
}

export function calcSlotTime(base: string, offset: number): string {
  if (!base || isNaN(offset)) return '';
  const [h, m] = base.split(':').map(Number);
  const d = new Date(); d.setHours(h, m + offset, 0, 0);
  return d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
}

// ── MAIN COMPONENT ───────────────────────────────────────────────────────────

interface EventFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  form: typeof BLANK_FORM;
  setForm: (fn: (prev: any) => any) => void;
  attendeeOpen: boolean;
  setAttendeeOpen: (v: boolean) => void;
  bclAttendeesList: { id: string; displayName: string }[];
  loadingBclAttendees: boolean;
  isSubmitting: boolean;
  onSubmit: () => void;
}

export function EventFormDialog({
  open, onOpenChange, form, setForm,
  bclAttendeesList, loadingBclAttendees, isSubmitting, onSubmit,
}: EventFormDialogProps) {

  const updateTimes = (startTime: string, duration: string, travel: string) => {
    const durMins = parseInt(duration) || 0;
    const travelMins = parseInt(travel) || 0;
    const end = calcEndTime(startTime, durMins);
    
    setForm(p => ({
      ...p,
      event_start_time: startTime,
      event_end_time: end,
      event_duration: duration,
      venue_distance: travel,
      event_slot_start_time: calcSlotTime(startTime, -travelMins),
      event_slot_end_time: calcSlotTime(end, travelMins),
    }));
  };

  // Map the list for SearchableSelect
  const attendeeOptions = bclAttendeesList.map(a => ({
    label: a.displayName,
    value: a.id
  }));

  const handleAttendeeChange = (selectedIds: string[]) => {
    const selectedNames = bclAttendeesList
      .filter(a => selectedIds.includes(a.id))
      .map(a => a.displayName);

    setForm(p => ({
      ...p,
      bcl_attendee: selectedIds,
      bcl_attendee_names: selectedNames
    }));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl p-0 overflow-hidden border-none shadow-2xl">
        {/* Header */}
        <DialogHeader className="px-8 pt-8 pb-6 bg-white border-b">
          <div className="flex items-center gap-4">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-600 text-white shadow-lg shadow-blue-200">
              <Calendar className="h-7 w-7" />
            </div>
            <div>
              <DialogTitle className="text-2xl font-bold text-slate-900 tracking-tight">Schedule New Event</DialogTitle>
              <DialogDescription className="text-slate-500 text-base">Plan and organize your business engagements efficiently.</DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <ScrollArea className="max-h-[70vh]">
          <div className="p-8 space-y-8">
            
            {/* 1. Basic Information Card */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/50 flex items-center gap-2">
                <Briefcase className="h-4 w-4 text-blue-600" />
                <h3 className="text-sm font-bold text-slate-700 uppercase tracking-wider">General Information</h3>
              </div>
              <div className="p-6 grid grid-cols-1 md:grid-cols-6 gap-6">
                <div className="md:col-span-4 space-y-2">
                  <label className="text-[11px] font-bold text-slate-500 uppercase tracking-widest">Event Name *</label>
                  <Input 
                    placeholder="e.g. Quarterly Business Review" 
                    className="h-11 border-slate-200 focus:border-blue-400 focus:ring-blue-50"
                    value={form.event_name} 
                    onChange={e => setForm(p => ({ ...p, event_name: e.target.value }))}
                  />
                </div>
                <div className="md:col-span-2 space-y-2">
                  <label className="text-[11px] font-bold text-slate-500 uppercase tracking-widest">Initial Status</label>
                  <Select value={form.status} onValueChange={v => setForm(p => ({ ...p, status: v }))}>
                    <SelectTrigger className="h-11 border-slate-200 bg-white"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {CREATION_STATUSES.map(s => (
                        <SelectItem key={s.value} value={s.value}>
                          <div className="flex items-center gap-2">
                            <div className={`h-2 w-2 rounded-full ${
                              s.value === 'draft' ? 'bg-gray-400' :
                              s.value === 'pending_confirmation' ? 'bg-amber-500' :
                              s.value === 'confirmed' ? 'bg-blue-500' :
                              s.value === 'in_progress' ? 'bg-cyan-500' :
                              s.value === 'completed' ? 'bg-green-500' :
                              s.value === 'rescheduled' ? 'bg-orange-500' :
                              s.value === 'cancelled' ? 'bg-red-500' :
                              s.value === 'no_show' ? 'bg-rose-500' : 'bg-slate-400'
                            }`} />
                            {s.label}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="md:col-span-3 space-y-2">
                  <label className="text-[11px] font-bold text-slate-500 uppercase tracking-widest">Event Type</label>
                  <Select value={form.event_type} onValueChange={v => setForm(p => ({ ...p, event_type: v }))}>
                    <SelectTrigger className="h-11 border-slate-200 bg-white"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {EVENT_TYPES.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            {/* 2. Timing Section Card */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/50 flex items-center gap-2">
                <Clock className="h-4 w-4 text-blue-600" />
                <h3 className="text-sm font-bold text-slate-700 uppercase tracking-wider">Date & Timing</h3>
              </div>
              <div className="p-6">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                  <div className="space-y-2">
                    <label className="text-[11px] font-bold text-slate-500 uppercase tracking-widest">Date *</label>
                    <Input 
                      type="date" 
                      className="h-11 border-slate-200"
                      value={form.event_date} 
                      onChange={e => setForm(p => ({ ...p, event_date: e.target.value }))} 
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[11px] font-bold text-slate-500 uppercase tracking-widest">Start Time *</label>
                    <Input 
                      type="time" 
                      className="h-11 border-slate-200"
                      value={form.event_start_time} 
                      onChange={e => updateTimes(e.target.value, form.event_duration, form.venue_distance)} 
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[11px] font-bold text-slate-500 uppercase tracking-widest">Duration</label>
                    <Select value={form.event_duration} onValueChange={v => updateTimes(form.event_start_time, v, form.venue_distance)}>
                      <SelectTrigger className="h-11 border-slate-200 bg-white"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {DURATION_OPTIONS.map(([v, l]) => <SelectItem key={v} value={v}>{l}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-[11px] font-bold text-slate-500 uppercase tracking-widest">Travel Time (Each Way)</label>
                    <Select value={form.venue_distance} onValueChange={v => updateTimes(form.event_start_time, form.event_duration, v)}>
                      <SelectTrigger className="h-11 border-slate-200 bg-white"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {TRAVEL_OPTIONS.map(([v, l]) => <SelectItem key={v} value={v}>{l}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Calculation Summary Bar */}
                <div className="mt-8 grid grid-cols-3 bg-slate-900 rounded-xl p-5 text-white">
                  <div className="text-center border-r border-slate-700">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Ends At</p>
                    <p className="text-xl font-mono font-bold text-blue-400">{form.event_end_time || '--:--'}</p>
                  </div>
                  <div className="text-center border-r border-slate-700">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Total Slot Start</p>
                    <p className="text-xl font-mono font-bold text-white">{form.event_slot_start_time || '--:--'}</p>
                  </div>
                  <div className="text-center">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Total Slot End</p>
                    <p className="text-xl font-mono font-bold text-white">{form.event_slot_end_time || '--:--'}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* 3. Location / Logistics Card */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/50 flex items-center gap-2">
                <MapPin className="h-4 w-4 text-blue-600" />
                <h3 className="text-sm font-bold text-slate-700 uppercase tracking-wider">Location & Format</h3>
              </div>
              <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-[11px] font-bold text-slate-500 uppercase tracking-widest">Event Format</label>
                  <Select 
                    value={form.event_format} 
                    onValueChange={val => setForm(p => ({ 
                      ...p, event_format: val, 
                      ...(val !== 'virtual' ? { virtual_meeting_mode: '', meeting_link: '', meeting_id: '' } : {}) 
                    }))}
                  >
                    <SelectTrigger className="h-11 border-slate-200 bg-white">
                      <div className="flex items-center gap-2">
                        {form.event_format === 'physical' ? <MapPin size={14} className="text-orange-500" /> : <Video size={14} className="text-blue-500" />}
                        <SelectValue />
                      </div>
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="physical">Physical Attendance</SelectItem>
                      <SelectItem value="virtual">Virtual Meeting</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {form.event_format === 'physical' ? (
                  <div className="space-y-2">
                    <label className="text-[11px] font-bold text-slate-500 uppercase tracking-widest">Expected Attendees</label>
                    <Input 
                      type="number" className="h-11 border-slate-200" placeholder="e.g. 50"
                      value={form.expected_attendees} 
                      onChange={e => setForm(p => ({ ...p, expected_attendees: e.target.value }))}
                    />
                  </div>
                ) : (
                  <div className="space-y-2">
                    <label className="text-[11px] font-bold text-slate-500 uppercase tracking-widest">Meeting Source</label>
                    <Select 
                      value={form.virtual_meeting_mode} 
                      onValueChange={v => setForm(p => ({ ...p, virtual_meeting_mode: v }))}
                    >
                      <SelectTrigger className="h-11 border-slate-200 bg-white"><SelectValue placeholder="Select platform" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="hosted">Google Meet (Auto-generate)</SelectItem>
                        <SelectItem value="external">External Link (Zoom/Teams)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                )}

                {form.event_format === 'physical' ? (
                  <>
                    <div className="space-y-2">
                      <label className="text-[11px] font-bold text-slate-500 uppercase tracking-widest">Venue Name</label>
                      <Input 
                        className="h-11 border-slate-200" placeholder="e.g. Conference Room A"
                        value={form.event_venue} onChange={e => setForm(p => ({ ...p, event_venue: e.target.value }))} 
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[11px] font-bold text-slate-500 uppercase tracking-widest">Area / Neighborhood</label>
                      <Input 
                        className="h-11 border-slate-200" placeholder="e.g. Victoria Island"
                        value={form.event_venue_area} onChange={e => setForm(p => ({ ...p, event_venue_area: e.target.value }))} 
                      />
                    </div>
                  </>
                ) : form.virtual_meeting_mode === 'external' && (
                  <>
                    <div className="space-y-2">
                      <label className="text-[11px] font-bold text-slate-500 uppercase tracking-widest">Meeting Link</label>
                      <Input 
                        className="h-11 border-slate-200" placeholder="https://zoom.us/j/..."
                        value={form.meeting_link} onChange={e => setForm(p => ({ ...p, meeting_link: e.target.value }))} 
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[11px] font-bold text-slate-500 uppercase tracking-widest">Meeting ID / Passcode</label>
                      <Input 
                        className="h-11 border-slate-200" placeholder="Optional"
                        value={form.meeting_id} onChange={e => setForm(p => ({ ...p, meeting_id: e.target.value }))} 
                      />
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* 4. Stakeholders Card */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/50 flex items-center gap-2">
                <Users className="h-4 w-4 text-blue-600" />
                <h3 className="text-sm font-bold text-slate-700 uppercase tracking-wider">Stakeholders</h3>
              </div>
              <div className="p-6 space-y-6">
                <div className="space-y-2">
                  <label className="text-[11px] font-bold text-slate-500 uppercase tracking-widest flex items-center gap-2">
                    Internal Team Members (BCL)
                    {loadingBclAttendees && <Loader2 size={12} className="animate-spin text-blue-500" />}
                  </label>
                  <SearchableSelect
                    options={attendeeOptions}
                    value={form.bcl_attendee}
                    onChange={handleAttendeeChange}
                    placeholder={loadingBclAttendees ? "Loading team..." : "Search and select team members..."}
                    multiple={true}
                    className="w-full"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t border-slate-50">
                  <div className="space-y-2">
                    <label className="text-[11px] font-bold text-slate-500 uppercase tracking-widest">Organizer Name</label>
                    <Input 
                      className="h-11 border-slate-200" 
                      value={form.organizer_name} onChange={e => setForm(p => ({ ...p, organizer_name: e.target.value }))} 
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[11px] font-bold text-slate-500 uppercase tracking-widest">Organizer Company</label>
                    <div className="relative">
                      <Briefcase className="absolute left-3 top-3.5 h-4 w-4 text-slate-400" />
                      <Input 
                        className="h-11 pl-10 border-slate-200" 
                        value={form.organizer_company} onChange={e => setForm(p => ({ ...p, organizer_company: e.target.value }))} 
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="text-[11px] font-bold text-slate-500 uppercase tracking-widest">Organizer Mobile</label>
                    <Input 
                      className="h-11 border-slate-200" 
                      value={form.organizer_mobile} onChange={e => setForm(p => ({ ...p, organizer_mobile: e.target.value }))} 
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[11px] font-bold text-slate-500 uppercase tracking-widest">Organizer Email</label>
                    <div className="relative">
                      <Globe className="absolute left-3 top-3.5 h-4 w-4 text-slate-400" />
                      <Input 
                        type="email"
                        className="h-11 pl-10 border-slate-200" 
                        value={form.organizer_email} onChange={e => setForm(p => ({ ...p, organizer_email: e.target.value }))} 
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* 5. Additional Details Card */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden mb-6">
              <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/50 flex items-center gap-2">
                <FileText className="h-4 w-4 text-blue-600" />
                <h3 className="text-sm font-bold text-slate-700 uppercase tracking-wider">Additional Details</h3>
              </div>
              <div className="p-6">
                <label className="text-[11px] font-bold text-slate-500 uppercase tracking-widest">Agenda & Internal Notes</label>
                <Textarea 
                  className="mt-2 min-h-[120px] border-slate-200 focus:border-blue-400 focus:ring-blue-50 resize-none p-4" 
                  placeholder="Provide context, goals, or preparation instructions..."
                  value={form.event_description} 
                  onChange={e => setForm(p => ({ ...p, event_description: e.target.value }))} 
                />
              </div>
            </div>
          </div>
        </ScrollArea>

        {/* Footer */}
        <DialogFooter className="px-8 py-6 bg-white border-t flex items-center justify-between sm:justify-between shadow-[0_-4px_20px_-10px_rgba(0,0,0,0.1)]">
          <Button 
            variant="ghost" 
            className="text-slate-500 font-semibold hover:bg-slate-100 transition-colors px-6" 
            onClick={() => onOpenChange(false)} 
            disabled={isSubmitting}
          >
            Cancel
          </Button>
          <Button 
            className="bg-blue-600 hover:bg-blue-700 text-white font-bold px-8 h-12 shadow-lg shadow-blue-200 transition-all active:scale-95 disabled:opacity-70"
            onClick={onSubmit}
            disabled={isSubmitting || !form.event_name || !form.event_date || !form.event_start_time}
          >
            {isSubmitting ? (
              <span className="flex items-center gap-2"><Loader2 size={18} className="animate-spin" /> Saving Changes...</span>
            ) : (
              <span className="flex items-center gap-2">Confirm & Schedule <ChevronRight size={18} /></span>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}