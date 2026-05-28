// @ts-nocheck
"use client"

import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Calendar, Clock, Loader2, MapPin, MessageSquare, Video, Globe, CheckCircle2, AlertCircle, Hash } from "lucide-react";
import type { ReactNode } from "react";
import { formatTime } from "../format";
import type { Appointment, CalendarConnectionStatus } from "./types";

interface AppointmentCardProps {
  appointment: Appointment;
  onClick: () => void;
  getStatusColor: (status: string) => string;
  getStatusIcon: (status: string) => ReactNode;
  getBadgeStatusColor: (badgeStatus: string) => string;
  checkAppointmentStatus: (appointment: Appointment) => Appointment;
  calendarConnectionStatus: CalendarConnectionStatus;
  onSync: (appointment: Appointment) => void;
  onUnsync: (appointment: Appointment) => void;
  isSyncing: boolean;
}

const AppointmentCard = ({ appointment, onClick, getStatusColor, getStatusIcon, getBadgeStatusColor, checkAppointmentStatus, calendarConnectionStatus, onSync, onUnsync, isSyncing }: AppointmentCardProps) => {
  const displayAppointment = checkAppointmentStatus(appointment);

  const accentColors = {
    upcoming: 'border-l-indigo-500 bg-indigo-50/30',
    rescheduled: 'border-l-purple-500 bg-purple-50/30',
    pending: 'border-l-amber-500 bg-amber-50/30',
    canceled: 'border-l-rose-500 bg-rose-50/30',
    completed: 'border-l-emerald-500 bg-emerald-50/30',
  }[displayAppointment.status] || 'border-l-slate-300 bg-slate-50';

  return (
    <Card
      className={`group relative flex cursor-pointer flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white transition-all duration-300 hover:shadow-xl hover:shadow-indigo-500/10 hover:-translate-y-1 border-l-4 ${accentColors}`}
      onClick={onClick}
    >
      <div className="p-4 space-y-4">

        {/* --- HEADER: Badges & Sync Action --- */}
        <div className="flex items-start justify-between gap-2">
          <div className="flex flex-wrap gap-1.5">
            <Badge className={`px-2 py-0.5 rounded-md border-none font-bold text-[9px] uppercase tracking-wider ${getStatusColor(displayAppointment.status)}`}>
              {displayAppointment.status}
            </Badge>
            <Badge variant="outline" className={`px-2 py-0.5 rounded-md font-bold text-[9px] uppercase tracking-wider bg-white/80 ${getBadgeStatusColor(appointment.badge_status)}`}>
              {appointment.badge_status}
            </Badge>
          </div>

          {/* Calendar Sync Status Pill */}
          {calendarConnectionStatus === 'connected' && (
            <div onClick={(e) => e.stopPropagation()}>
              {isSyncing ? (
                <Loader2 className="h-3.5 w-3.5 text-slate-400 animate-spin" />
              ) : appointment.google_event_id ? (
                <button
                  onClick={() => onUnsync(appointment)}
                  className="flex items-center gap-1 text-[9px] font-bold text-emerald-600 bg-emerald-100/50 px-2 py-1 rounded-full hover:bg-rose-100 hover:text-rose-600 transition-colors group/sync"
                >
                  <CheckCircle2 className="h-2.5 w-2.5" />
                  <span className="group-hover/sync:hidden">SYNCED</span>
                  <span className="hidden group-hover/sync:inline">UNSYNC</span>
                </button>
              ) : (
                <button
                  onClick={() => onSync(appointment)}
                  className="flex items-center gap-1 text-[9px] font-bold text-slate-400 bg-slate-100 px-2 py-1 rounded-full hover:bg-indigo-600 hover:text-white transition-all"
                >
                  <Calendar className="h-2.5 w-2.5" />
                  SYNC
                </button>
              )}
            </div>
          )}
        </div>

        {/* --- CLIENT IDENTITY --- */}
        <div className="space-y-1">
          <h4 className="font-extrabold text-slate-900 leading-tight truncate text-base tracking-tight">
            {appointment.client_name}
          </h4>
          <div className="flex items-center gap-1.5 text-[11px] font-medium text-slate-500">
            <Globe className="h-3 w-3 text-slate-400" />
            <span className="truncate">{appointment.client_company || 'Independent Client'}</span>
          </div>
        </div>

        {/* --- LOGISTICS GRID --- */}
        <div className="grid grid-cols-1 gap-2.5">
          {/* Date & Time Range */}
          <div className="flex items-center justify-between bg-white/60 rounded-xl p-2.5 border border-white/50 shadow-sm">
            <div className="flex items-center gap-2">
              <div className="h-7 w-7 rounded-lg bg-indigo-50 flex items-center justify-center">
                <Calendar className="h-3.5 w-3.5 text-indigo-600" />
              </div>
              <div>
                <p className="text-[10px] font-bold text-slate-900 leading-none">
                  {new Date(appointment.meeting_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                </p>
                <p className="text-[9px] font-medium text-slate-400 uppercase mt-0.5">
                  {new Date(appointment.meeting_date).toLocaleDateString('en-GB', { weekday: 'long' })}
                </p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-[10px] font-bold text-slate-900 leading-none">
                {formatTime(appointment.meeting_start_time)} - {formatTime(appointment.meeting_end_time)}
              </p>
              <p className="text-[9px] font-bold text-indigo-500 uppercase mt-0.5">{appointment.meeting_duration}m Session</p>
            </div>
          </div>

          {/* Venue / Location */}
          <div className="flex items-center gap-2 px-1">
            {appointment.meeting_type === 'virtual' ? (
              <Video className="h-3.5 w-3.5 text-indigo-500 shrink-0" />
            ) : (
              <MapPin className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
            )}
            <p className="text-[11px] font-medium text-slate-600 truncate">
              {appointment.meeting_venue_area || (appointment.meeting_type === 'virtual' ? 'Google Meet / Digital' : 'Venue not set')}
            </p>
          </div>

          {/* Agenda Snippet */}
          <div className="flex items-start gap-2 px-1 py-1">
            <MessageSquare className="h-3.5 w-3.5 text-slate-400 mt-0.5 shrink-0" />
            <p className="text-[11px] text-slate-500 line-clamp-1 italic leading-relaxed">
              "{appointment.meeting_agenda || 'No specific agenda outlined...'}"
            </p>
          </div>
        </div>
      </div>

      {/* --- FOOTER: ID & TYPE --- */}
      <div className="mt-auto flex items-center justify-between px-4 py-3 bg-white/40 border-t border-slate-100">
        <div className="flex items-center gap-1 text-[10px] font-bold text-slate-400 tracking-tight uppercase">
          <Hash className="h-3 w-3" />
          {appointment.id_main}
        </div>
        <div className="flex items-center gap-1 text-[9px] font-extrabold text-slate-400 uppercase tracking-widest bg-slate-100 px-2 py-0.5 rounded">
          {appointment.meeting_type}
        </div>
      </div>
    </Card>
  );
};

export default AppointmentCard;