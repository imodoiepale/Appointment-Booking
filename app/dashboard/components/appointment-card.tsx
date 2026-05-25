// @ts-nocheck
"use client"

import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Calendar, Clock, Loader2, MapPin, MessageSquare } from "lucide-react";
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

  const accentColor = {
    upcoming: 'bg-[#0DAA8A]',
    rescheduled: 'bg-purple-500',
    pending: 'bg-amber-500',
    canceled: 'bg-red-500',
    completed: 'bg-blue-500',
  }[displayAppointment.status] || 'bg-slate-300';

  return (
    <Card
      className="group relative flex cursor-pointer flex-col overflow-hidden rounded-lg border-slate-200 bg-white shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-[#0DAA8A]/25 hover:shadow-md"
      onClick={onClick}
    >
      {/* Top accent strip */}
      <div className={`h-0.5 w-full ${accentColor}`} />

      {/* Header */}
      <div className="flex items-start justify-between gap-2 border-b border-slate-100 px-3 pb-2 pt-3">
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-slate-800 truncate leading-tight" title={appointment.client_name}>
            {appointment.client_name}
          </p>
          <p className="text-[11px] text-slate-400 truncate mt-0.5" title={appointment.client_company}>
            {appointment.client_company || '-'}
          </p>
        </div>
        <div className="flex flex-col items-end gap-1 shrink-0">
          <Badge variant="outline" className={`text-[10px] h-4 px-1.5 ${getStatusColor(displayAppointment.status)} flex items-center gap-0.5`}>
            {getStatusIcon(displayAppointment.status)}
            {displayAppointment.status.charAt(0).toUpperCase() + displayAppointment.status.slice(1)}
          </Badge>
          <Badge variant="outline" className={`text-[10px] h-4 px-1.5 ${getBadgeStatusColor(appointment.badge_status)}`}>
            {appointment.badge_status}
          </Badge>
        </div>
      </div>

      {/* Body */}
      <div className="flex-1 space-y-1.5 px-3 py-2.5 text-xs text-slate-600">
        <div className="flex items-center gap-1.5">
          <Calendar className="h-3 w-3 shrink-0 text-[#0DAA8A]" />
          <span className="font-medium text-slate-700">
            {new Date(appointment.meeting_date).toLocaleDateString('en-GB', { weekday: 'short', month: 'short', day: 'numeric' })}
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          <Clock className="h-3 w-3 shrink-0 text-blue-500" />
          <span className="font-medium text-slate-700">{formatTime(appointment.meeting_start_time)} - {formatTime(appointment.meeting_end_time)}</span>
          <span className="ml-auto text-[10px] text-slate-400">{appointment.meeting_duration}m</span>
        </div>
        <div className="flex items-center gap-1.5">
          <MapPin className="h-3 w-3 shrink-0 text-slate-400" />
          <span className="truncate text-slate-600" title={appointment.meeting_venue_area}>{appointment.meeting_venue_area || 'N/A'}</span>
        </div>
        <div className="flex items-start gap-1.5">
          <MessageSquare className="mt-px h-3 w-3 shrink-0 text-slate-400" />
          <span className="line-clamp-2 text-slate-500" title={appointment.meeting_agenda}>{appointment.meeting_agenda || 'No agenda'}</span>
        </div>
      </div>

      {/* Footer - sync status */}
      <div className="flex items-center justify-between gap-2 border-t border-slate-100 bg-slate-50/70 px-3 py-2">
        <span className="text-[10px] text-slate-400">#{appointment.id_main}</span>
        <div className="flex items-center gap-1.5">
          {appointment.google_event_id ? (
            <span className="inline-flex items-center gap-0.5 text-[10px] font-medium text-[#087963]">
              <Calendar className="w-2.5 h-2.5" />Synced
            </span>
          ) : (
            <span className="inline-flex items-center gap-0.5 text-[10px] text-slate-400">
              <Calendar className="w-2.5 h-2.5" />Not Synced
            </span>
          )}
          {calendarConnectionStatus === 'connected' && (
            isSyncing
              ? <Loader2 className="w-3 h-3 text-slate-400 animate-spin" />
              : appointment.google_event_id
                ? <button onClick={(e) => { e.stopPropagation(); onUnsync(appointment); }} className="text-[10px] text-red-500 hover:text-red-700 font-medium leading-none">Unsync</button>
                : <button onClick={(e) => { e.stopPropagation(); onSync(appointment); }} className="text-[10px] font-medium leading-none text-[#087963] hover:text-[#0B9579]">Sync</button>
          )}
        </div>
      </div>
    </Card>
  );
};

export default AppointmentCard;
