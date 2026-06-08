// @ts-nocheck
'use client';

import React from 'react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import {
  Building, MapPin, Trash2, Loader2, CheckCircle2, Edit2, Ban, UserCheck,
  Cloud, CloudOff, User, Link as LinkIcon, Hash, Video, Info, Clock, 
  Phone, Mail, Globe, Users, Calendar as CalendarIcon, ChevronRight
} from 'lucide-react';
import { getEventTypeConfig, EventTypeIcon, EVENT_TYPES } from '@/utils/appointmentStyles';
import { getStatusHexColor } from '@/utils/appointmentStatuses';
import { formatDate } from '../../../utils/format';
import { formatTime, StatusPill } from './eventShared';
import { EventFormFields, BLANK_FORM } from './EventFormFields';
import { Separator } from '@/components/ui/separator';

interface EventDetailDialogProps {
  // ... (props stay the same as your previous definition)
}

export function EventDetailDialog({
  event, onClose, isEditOpen, setEditOpen, editForm, setEditForm,
  editAttendeeOpen, setEditAttendeeOpen, bclAttendeesList, loadingBclAttendees,
  isSubmitting, actionLoading, calStatus, canEdit, canDelete,
  onConfirm, onMarkDone, onCancel, onSyncToCalendar, onSaveEdit, onOpenEdit, onDelete,
}: EventDetailDialogProps) {
  return (
    <Dialog open={!!event} onOpenChange={o => !o && onClose()}>
      <DialogContent className="p-0 border-none shadow-2xl overflow-hidden bg-slate-50" style={{ maxWidth: 900 }}>
        {event && (() => {
          const ev = event;
          const col = getEventTypeConfig(ev.event_type);
          const typeLabel = EVENT_TYPES.find(t => t.value === ev.event_type)?.label ?? ev.event_type;
          const statusCol = getStatusHexColor(ev.status ?? 'upcoming');
          const isVirtual = ev.event_format === 'virtual';
          
          return (
            <div className="flex flex-col max-h-[95vh]">
              
              {/* --- HEADER SECTION --- */}
              <div className="bg-white px-8 pt-8 pb-6 border-b relative">
                <div style={{ position: 'absolute', top: -20, right: -20, width: 150, height: 150, borderRadius: '50%', background: `${statusCol.hex}10` }} />
                
                <div className="flex justify-between items-start relative z-10">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <div className="p-1.5 rounded-md" style={{ background: col.bg, color: '#fff' }}>
                        <EventTypeIcon type={ev.event_type} size={14} />
                      </div>
                      <span className="text-[10px] font-bold uppercase tracking-widest" style={{ color: col.bg }}>
                        {typeLabel} • #{ev.id}
                      </span>
                    </div>
                    <h2 className="text-2xl font-extrabold text-slate-900 tracking-tight">
                      {ev.event_name}
                    </h2>
                    <div className="flex items-center gap-3 text-slate-500 text-sm">
                      <div className="flex items-center gap-1.5">
                        <Building size={14} />
                        <span className="font-medium text-slate-700">{ev.organizer_company || 'N/A'}</span>
                      </div>
                      <span className="text-slate-300">|</span>
                      <span>{ev.organizer_name}</span>
                    </div>
                  </div>
                  <StatusPill status={ev.status ?? 'upcoming'} />
                </div>
              </div>

              <div className="overflow-y-auto">
                {isEditOpen ? (
                  <div className="p-8">
                    <div className="bg-white p-8 rounded-2xl border border-slate-200 shadow-sm">
                      <EventFormFields
                        form={editForm} setForm={setEditForm}
                        attendeeOpen={editAttendeeOpen} setAttendeeOpen={setEditAttendeeOpen}
                        bclAttendeesList={bclAttendeesList} loadingBclAttendees={loadingBclAttendees}
                      />
                      <div className="mt-8 flex justify-end gap-3 pt-6 border-t">
                        <Button variant="ghost" onClick={() => setEditOpen(false)}>Cancel</Button>
                        <Button className="bg-blue-600 px-8" onClick={onSaveEdit} disabled={isSubmitting}>
                          {isSubmitting ? <Loader2 className="animate-spin mr-2" size={16}/> : null} Save Changes
                        </Button>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="grid grid-cols-12 gap-0">
                    
                    {/* --- LEFT COLUMN: Primary Details --- */}
                    <div className="col-span-7 p-8 space-y-8 bg-white border-r min-h-[500px]">
                      
                      {/* 1. Schedule & Venue Card */}
                      <section className="space-y-4">
                        <h4 className="text-[11px] font-bold text-blue-600 uppercase tracking-widest flex items-center gap-2">
                          <CalendarIcon size={14} /> Logistics & Location
                        </h4>
                        <div className="grid grid-cols-2 gap-6 bg-slate-50 p-5 rounded-2xl border border-slate-100">
                          <div className="space-y-1">
                            <p className="text-[10px] text-slate-400 font-bold uppercase">Date</p>
                            <p className="font-semibold text-slate-800 text-sm">{formatDate(ev.event_date, { day: '2-digit', month: 'long', year: 'numeric' })}</p>
                          </div>
                          <div className="space-y-1">
                            <p className="text-[10px] text-slate-400 font-bold uppercase">Actual Time</p>
                            <p className="font-semibold text-blue-600 text-sm">{formatTime(ev.event_start_time)} - {formatTime(ev.event_end_time)}</p>
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
                            <p className="font-semibold text-slate-800 text-sm">{ev.expected_attendees || '—'} Expected</p>
                          </div>
                          
                          {/* Location details expanded */}
                          <div className="col-span-2 pt-3 border-t border-slate-200 mt-2">
                            <p className="text-[10px] text-slate-400 font-bold uppercase mb-1">
                              {isVirtual ? 'Access Details' : 'Physical Address'}
                            </p>
                            {isVirtual ? (
                               <div className="flex flex-col gap-1">
                                 {ev.google_meet_link || ev.meeting_link ? (
                                   <a href={ev.google_meet_link || ev.meeting_link} target="_blank" rel="noreferrer" 
                                      className="text-blue-600 text-sm font-bold flex items-center gap-1 hover:underline">
                                     <LinkIcon size={14} /> Join Meeting Link
                                   </a>
                                 ) : <span className="text-sm text-slate-400 italic">No link provided</span>}
                                 {ev.meeting_id && <span className="text-xs font-mono text-slate-500">ID: {ev.meeting_id}</span>}
                               </div>
                            ) : (
                              <div className="text-sm font-bold text-slate-800">
                                {ev.event_venue || 'No Venue Name'}
                                {ev.event_venue_area && <span className="block text-xs text-slate-500 font-normal">{ev.event_venue_area}</span>}
                              </div>
                            )}
                          </div>
                        </div>
                      </section>

                      {/* 2. Description Section */}
                      <section className="space-y-3">
                        <h4 className="text-[11px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
                          <Info size={14} /> Description & Agenda
                        </h4>
                        <div className="text-slate-600 text-sm leading-relaxed whitespace-pre-wrap px-1">
                          {ev.event_description || 'No detailed description provided for this event.'}
                        </div>
                      </section>
                    </div>

                    {/* --- RIGHT COLUMN: Stakeholders & Meta --- */}
                    <div className="col-span-5 p-8 space-y-8">
                      
                      {/* BCL Team Members */}
                      <section className="space-y-4">
                        <h4 className="text-[11px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
                          <Users size={14} /> BCL Attendees
                        </h4>
                        <div className="flex flex-wrap gap-2">
                          {Array.isArray(ev.bcl_attendee_names) && ev.bcl_attendee_names.length > 0 ? (
                            ev.bcl_attendee_names.map((name, i) => (
                              <div key={i} className="flex items-center gap-2 bg-white border border-slate-200 px-3 py-2 rounded-xl shadow-sm text-xs font-bold text-slate-700">
                                <div className="w-5 h-5 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center text-[10px]">
                                  {name.charAt(0)}
                                </div>
                                {name}
                              </div>
                            ))
                          ) : (
                            <p className="text-xs text-slate-400 italic px-1">No internal members assigned.</p>
                          )}
                        </div>
                      </section>

                      {/* Organizer Card */}
                      <section className="space-y-4">
                        <h4 className="text-[11px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
                          <UserCheck size={14} /> Organizer Info
                        </h4>
                        <div className="bg-white rounded-2xl border border-slate-200 p-4 space-y-3 shadow-sm">
                          {ev.organizer_name && (
                            <div className="flex items-center gap-3">
                              <User size={14} className="text-slate-400" />
                              <span className="text-sm font-semibold text-slate-700">{ev.organizer_name}</span>
                            </div>
                          )}
                          {ev.organizer_mobile && (
                            <div className="flex items-center gap-3">
                              <Phone size={14} className="text-slate-400" />
                              <span className="text-sm text-slate-600">{ev.organizer_mobile}</span>
                            </div>
                          )}
                          {ev.organizer_email && (
                            <div className="flex items-center gap-3">
                              <Mail size={14} className="text-slate-400" />
                              <span className="text-sm text-slate-600 break-all">{ev.organizer_email}</span>
                            </div>
                          )}
                        </div>
                      </section>

                      {/* Buffer / Slot Detail Section */}
                      <section className="bg-blue-600/5 border border-blue-100 rounded-2xl p-5 space-y-3">
                        <h4 className="text-[10px] font-bold text-blue-700 uppercase tracking-widest flex items-center gap-2">
                          <Clock size={14} /> Timing Logistics
                        </h4>
                        <div className="flex justify-between items-center text-sm">
                          <span className="text-slate-500">Travel Buffer:</span>
                          <span className="font-bold text-slate-700">{ev.venue_distance || 0} mins</span>
                        </div>
                        <div className="flex justify-between items-center text-sm pt-2 border-t border-blue-100/50">
                          <span className="text-slate-500">Total Slot:</span>
                          <span className="font-bold text-blue-700">
                            {formatTime(ev.event_slot_start_time)} - {formatTime(ev.event_slot_end_time)}
                          </span>
                        </div>
                      </section>

                      {/* Google Calendar Status */}
                      <div className={`flex items-center gap-4 p-4 rounded-2xl border ${ev.google_event_id ? 'bg-green-50/50 border-green-100' : 'bg-slate-100/50 border-slate-200'}`}>
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${ev.google_event_id ? 'bg-green-100 text-green-600' : 'bg-slate-200 text-slate-400'}`}>
                          {ev.google_event_id ? <Cloud size={20} /> : <CloudOff size={20} />}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className={`text-xs font-bold ${ev.google_event_id ? 'text-green-700' : 'text-slate-500'}`}>
                            {ev.google_event_id ? 'Synced to Calendar' : 'Local Booking'}
                          </p>
                          {ev.google_event_id && <p className="text-[10px] text-green-600 truncate">ID: {ev.google_event_id}</p>}
                        </div>
                      </div>

                    </div>
                  </div>
                )}
              </div>

              {/* --- ACTION FOOTER --- */}
              <div className="p-6 bg-white border-t flex items-center justify-between shadow-[0_-4px_20px_rgba(0,0,0,0.03)]">
                <div className="flex gap-2">
                  {canEdit && (
                    <>
                      <Button variant="outline" size="sm" className="h-10 border-green-200 text-green-700 hover:bg-green-50 gap-2" onClick={onConfirm} disabled={!!actionLoading || ev.status === 'confirmed'}>
                        {actionLoading === 'confirm' ? <Loader2 className="animate-spin" size={14}/> : <UserCheck size={14}/>} Confirm
                      </Button>
                      <Button variant="outline" size="sm" className="h-10 border-blue-200 text-blue-700 hover:bg-blue-50 gap-2" onClick={onMarkDone} disabled={!!actionLoading}>
                        {actionLoading === 'done' ? <Loader2 className="animate-spin" size={14}/> : <CheckCircle2 size={14}/>} Done
                      </Button>
                    </>
                  )}
                </div>

                <div className="flex gap-2">
                  <Button variant="secondary" size="sm" className="h-10 gap-2" onClick={onSyncToCalendar} disabled={!!actionLoading || calStatus !== 'connected'}>
                    <Cloud size={14} /> Sync
                  </Button>
                  {canEdit && (
                    <Button variant="secondary" size="sm" className="h-10 gap-2" onClick={onOpenEdit}>
                      <Edit2 size={14} /> Edit
                    </Button>
                  )}
                  {canDelete && (
                    <Button variant="ghost" size="sm" className="h-10 w-10 text-red-500 p-0 hover:bg-red-50 hover:text-red-600" onClick={() => onDelete(ev)}>
                      <Trash2 size={16} />
                    </Button>
                  )}
                  <Separator orientation="vertical" className="h-10 mx-2" />
                  <Button variant="default" className="h-10 px-8 bg-slate-900" onClick={onClose}>Close</Button>
                </div>
              </div>
            </div>
          );
        })()}
      </DialogContent>
    </Dialog>
  );
}