// @ts-nocheck
'use client';

import React, { useState } from 'react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import {
  Building, MapPin, Trash2, Loader2, CheckCircle2, Edit2, Ban, UserCheck,
  Cloud, CloudOff, User, Link as LinkIcon, Hash, Video, Info, Clock,
  Phone, Mail, Users, Calendar as CalendarIcon, X, Save, CalendarClock
} from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from '@/components/ui/separator';
import { getEventTypeConfig, EventTypeIcon, EVENT_TYPES } from '@/utils/appointmentStyles';
import { getStatusHexColor } from '@/utils/appointmentStatuses';
import { formatDate } from '../../../utils/format';
import { formatTime, StatusPill } from './eventShared';
import { EventFormFields } from './EventFormFields';

export function EventDetailDialog({
  event, onClose, isEditOpen, setEditOpen, editForm, setEditForm,
  editAttendeeOpen, setAttendeeOpen, bclAttendeesList, loadingBclAttendees,
  isSubmitting, actionLoading, calStatus, canEdit, canDelete,
  onConfirm, onMarkDone, onCancel, onReschedule, onSyncToCalendar, onSaveEdit, onOpenEdit, onDelete,
}) {
  if (!event) return null;

  const col = getEventTypeConfig(event.event_type);
  const statusCol = getStatusHexColor(event.status ?? 'upcoming');
  const typeLabel = EVENT_TYPES.find(t => t.value === event.event_type)?.label ?? event.event_type;
  const isVirtual = event.event_format === 'virtual';

  return (
    <Dialog open={!!event} onOpenChange={o => !o && onClose()}>
      <DialogContent className="p-0 border-none shadow-2xl overflow-hidden bg-white max-w-[900px]">
        
        {/* --- PERSISTENT HERO HEADER --- */}
        <div className="px-8 pt-8 pb-6 border-b relative bg-white">
          <div style={{ position: 'absolute', top: -20, right: -20, width: 150, height: 150, borderRadius: '50%', background: `${statusCol.hex}10` }} />
          
          <div className="flex justify-between items-start relative z-10">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-md" style={{ background: col.bg, color: '#fff' }}>
                  <EventTypeIcon type={event.event_type} size={14} />
                </div>
                <span className="text-[10px] font-bold uppercase tracking-widest" style={{ color: col.bg }}>
                  {isEditOpen ? 'Editing Event' : `${typeLabel} • #${event.id}`}
                </span>
              </div>
              <h2 className="text-2xl font-extrabold text-slate-900 tracking-tight">
                {isEditOpen ? (editForm.event_name || "New Event Name") : event.event_name}
              </h2>
              <div className="flex items-center gap-3 text-slate-500 text-sm">
                <div className="flex items-center gap-1.5">
                  <Building size={14} />
                  <span className="font-medium text-slate-700">{event.organizer_company || 'Independent'}</span>
                </div>
                <span className="text-slate-300">|</span>
                <span>{event.organizer_name}</span>
              </div>
            </div>
            {!isEditOpen && <StatusPill status={event.status ?? 'upcoming'} />}
          </div>
        </div>

        {/* --- MAIN CONTENT AREA --- */}
       <div className="bg-slate-50/50">
          {isEditOpen ? (
            <Tabs defaultValue="logistics" className="w-full">
              <div className="px-8 bg-white border-b">
                <TabsList className="h-12 bg-transparent p-0 gap-8">
                  {['logistics', 'organizer', 'details'].map((t, i) => (
                    <TabsTrigger 
                      key={t} 
                      value={t} 
                      className="rounded-none border-b-2 border-transparent data-[state=active]:border-blue-600 data-[state=active]:bg-transparent shadow-none px-0 text-[11px] font-bold uppercase tracking-wider"
                    >
                      {i + 1}. {t}
                    </TabsTrigger>
                  ))}
                </TabsList>
              </div>

              <ScrollArea className="h-[55vh]">
                <div className="p-8 flex justify-center">
                  <div className="w-full max-w-3xl bg-white p-10 rounded-2xl border border-slate-200 shadow-sm">
                    <TabsContent value="logistics" className="m-0 mt-0 focus-visible:ring-0">
                      <EventFormFields tab="logistics" form={editForm} setForm={setEditForm} bclAttendeesList={bclAttendeesList} />
                    </TabsContent>
                    <TabsContent value="organizer" className="m-0 focus-visible:ring-0">
                      <EventFormFields tab="organizer" form={editForm} setForm={setEditForm} bclAttendeesList={bclAttendeesList} />
                    </TabsContent>
                    <TabsContent value="details" className="m-0 focus-visible:ring-0">
                      <EventFormFields tab="details" form={editForm} setForm={setEditForm} bclAttendeesList={bclAttendeesList} />
                    </TabsContent>
                  </div>
                </div>
              </ScrollArea>
            </Tabs>
          ) : (
            <ScrollArea className="h-[55vh]">
              <div className="grid grid-cols-12 gap-0">
                {/* --- VIEW MODE: LEFT COLUMN --- */}
                <div className="col-span-7 p-8 space-y-8 border-r border-slate-200 min-h-full bg-white">
                  <section className="space-y-4">
                    <h4 className="text-[11px] font-bold text-blue-600 uppercase tracking-widest flex items-center gap-2">
                      <CalendarIcon size={14} /> Logistics & Location
                    </h4>
                    <div className="grid grid-cols-2 gap-6 bg-slate-50 p-5 rounded-2xl border border-slate-100">
                      <div className="space-y-1">
                        <p className="text-[10px] text-slate-400 font-bold uppercase">Date</p>
                        <p className="font-semibold text-slate-800 text-sm">{formatDate(event.event_date, { day: '2-digit', month: 'long', year: 'numeric' })}</p>
                      </div>
                      <div className="space-y-1">
                        <p className="text-[10px] text-slate-400 font-bold uppercase">Actual Time</p>
                        <p className="font-semibold text-blue-600 text-sm">{formatTime(event.event_start_time)} - {formatTime(event.event_end_time)}</p>
                      </div>
                      <div className="space-y-1">
                        <p className="text-[10px] text-slate-400 font-bold uppercase">Format</p>
                        <div className="flex items-center gap-1.5 text-sm font-semibold text-slate-800">
                          {isVirtual ? <Video size={14} className="text-blue-500" /> : <MapPin size={14} className="text-orange-500" />}
                          {isVirtual ? 'Virtual' : 'In-Person'}
                        </div>
                      </div>
                      <div className="space-y-1">
                        <p className="text-[10px] text-slate-400 font-bold uppercase">Guests</p>
                        <p className="font-semibold text-slate-800 text-sm">{event.expected_attendees || '—'} Expected</p>
                      </div>
                      <div className="col-span-2 pt-3 border-t border-slate-200 mt-2">
                        <p className="text-[10px] text-slate-400 font-bold uppercase mb-1">{isVirtual ? 'Access Details' : 'Physical Address'}</p>
                        {isVirtual ? (
                           <div className="flex flex-col gap-1">
                             {event.google_meet_link || event.meeting_link ? (
                               <a href={event.google_meet_link || event.meeting_link} target="_blank" rel="noreferrer" className="text-blue-600 text-sm font-bold flex items-center gap-1 hover:underline">
                                 <LinkIcon size={14} /> Join Meeting Link
                               </a>
                             ) : <span className="text-sm text-slate-400 italic">No link provided</span>}
                           </div>
                        ) : (
                          <div className="text-sm font-bold text-slate-800">
                            {event.event_venue || 'No Venue Name'}
                            {event.event_venue_area && <span className="block text-xs text-slate-500 font-normal">{event.event_venue_area}</span>}
                          </div>
                        )}
                      </div>
                    </div>
                  </section>

                  <section className="space-y-3">
                    <h4 className="text-[11px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
                      <Info size={14} /> Description & Agenda
                    </h4>
                    <div className="text-slate-600 text-sm leading-relaxed whitespace-pre-wrap px-1">
                      {event.event_description || 'No detailed description provided.'}
                    </div>
                  </section>
                </div>

                {/* --- VIEW MODE: RIGHT COLUMN --- */}
                <div className="col-span-5 p-8 space-y-8">
                  <section className="space-y-4">
                    <h4 className="text-[11px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
                      <Users size={14} /> BCL Attendees
                    </h4>
                    <div className="flex flex-wrap gap-2">
                      {event.bcl_attendee_names?.length > 0 ? (
                        event.bcl_attendee_names.map((name, i) => (
                          <div key={i} className="flex items-center gap-2 bg-white border border-slate-200 px-3 py-2 rounded-xl shadow-sm text-xs font-bold text-slate-700">
                            <div className="w-5 h-5 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center text-[10px]">{name.charAt(0)}</div>
                            {name}
                          </div>
                        ))
                      ) : <p className="text-xs text-slate-400 italic px-1">No members assigned.</p>}
                    </div>
                  </section>

                  <section className="space-y-4">
                    <h4 className="text-[11px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
                      <UserCheck size={14} /> Organizer Info
                    </h4>
                    <div className="bg-white rounded-2xl border border-slate-200 p-4 space-y-3 shadow-sm">
                      <div className="flex items-center gap-3"><User size={14} className="text-slate-400" /><span className="text-sm font-semibold text-slate-700">{event.organizer_name}</span></div>
                      {event.organizer_mobile && <div className="flex items-center gap-3"><Phone size={14} className="text-slate-400" /><span className="text-sm text-slate-600">{event.organizer_mobile}</span></div>}
                      {event.organizer_email && <div className="flex items-center gap-3"><Mail size={14} className="text-slate-400" /><span className="text-sm text-slate-600 break-all">{event.organizer_email}</span></div>}
                    </div>
                  </section>

                  <div className={`flex items-center gap-4 p-4 rounded-2xl border ${event.google_event_id ? 'bg-green-50/50 border-green-100' : 'bg-slate-100/50 border-slate-200'}`}>
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${event.google_event_id ? 'bg-green-100 text-green-600' : 'bg-slate-200 text-slate-400'}`}>
                      {event.google_event_id ? <Cloud size={20} /> : <CloudOff size={20} />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className={`text-xs font-bold ${event.google_event_id ? 'text-green-700' : 'text-slate-500'}`}>{event.google_event_id ? 'Synced' : 'Local Only'}</p>
                      {event.google_event_id && <p className="text-[10px] text-green-600 truncate">{event.google_event_id}</p>}
                    </div>
                  </div>
                </div>
              </div>
            </ScrollArea>
          )}
        </div>

        {/* --- UNIFIED DYNAMIC FOOTER --- */}
       <div className="px-8 py-5 bg-white border-t flex items-center justify-between">
          {isEditOpen ? (
            <>
              <Button variant="ghost" className="text-slate-400 hover:text-red-500 font-bold gap-2 h-10 px-0" onClick={() => setEditOpen(false)}>
                <X size={16} /> Discard Changes
              </Button>
              <div className="flex gap-3">
                <Button variant="outline" className="h-10 px-6 font-bold" onClick={() => setEditOpen(false)}>Cancel</Button>
                <Button className="h-10 bg-blue-600 px-8 font-bold gap-2" onClick={onSaveEdit} disabled={isSubmitting}>
                  {isSubmitting ? <Loader2 className="animate-spin" size={16} /> : <Save size={16} />} Save Changes
                </Button>
              </div>
            </>
          ) : (
            <>
              <div className="flex gap-2 flex-wrap">
                {canEdit && !['confirmed', 'completed', 'cancelled', 'no_show'].includes(event.status ?? '') && (
                  <Button variant="outline" size="sm" className="h-10 border-green-200 text-green-700 hover:bg-green-50 gap-2" onClick={onConfirm} disabled={!!actionLoading}>
                    {actionLoading === 'confirm' ? <Loader2 className="animate-spin" size={14}/> : <UserCheck size={14}/>} Confirm
                  </Button>
                )}
                {canEdit && event.status !== 'completed' && (
                  <Button variant="outline" size="sm" className="h-10 border-blue-200 text-blue-700 hover:bg-blue-50 gap-2" onClick={onMarkDone} disabled={!!actionLoading}>
                    {actionLoading === 'done' ? <Loader2 className="animate-spin" size={14}/> : <CheckCircle2 size={14}/>} Mark Complete
                  </Button>
                )}
                {canEdit && !['cancelled', 'completed', 'no_show'].includes(event.status ?? '') && (
                  <Button variant="outline" size="sm" className="h-10 border-orange-200 text-orange-700 hover:bg-orange-50 gap-2" onClick={onReschedule} disabled={!!actionLoading}>
                    {actionLoading === 'reschedule' ? <Loader2 className="animate-spin" size={14}/> : <CalendarClock size={14}/>} Reschedule
                  </Button>
                )}
                {canEdit && !['cancelled', 'no_show'].includes(event.status ?? '') && (
                  <Button variant="outline" size="sm" className="h-10 border-red-200 text-red-600 hover:bg-red-50 gap-2" onClick={onCancel} disabled={!!actionLoading}>
                    {actionLoading === 'cancel' ? <Loader2 className="animate-spin" size={14}/> : <Ban size={14}/>} Cancel
                  </Button>
                )}
              </div>

              <div className="flex gap-2 items-center">
                <Button variant="secondary" size="sm" className="h-10 gap-2" onClick={onSyncToCalendar} disabled={!!actionLoading || calStatus !== 'connected'}>
                  <Cloud size={14} /> Sync
                </Button>
                {canEdit && (
                  <Button variant="secondary" size="sm" className="h-10 gap-2 font-bold" onClick={onOpenEdit} title="Fix incorrect event details">
                    <Edit2 size={14} /> Edit Details
                  </Button>
                )}
                {canDelete && (
                  <Button variant="ghost" size="sm" className="h-10 w-10 text-red-400 hover:bg-red-50 hover:text-red-600" onClick={() => onDelete(event)}>
                    <Trash2 size={16} />
                  </Button>
                )}
                <Separator orientation="vertical" className="h-8 mx-2" />
                <Button variant="default" className="h-10 px-8 bg-slate-900" onClick={onClose}>Close</Button>
              </div>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}