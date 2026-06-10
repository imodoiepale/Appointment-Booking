// @ts-nocheck
"use client";

import React, { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import {
  Calendar,
  Clock,
  PartyPopper,
  Video,
  MapPin,
  Users,
  Gift,
  MessageCircle,
  Building,
  ChevronRight,
  Loader2,
  RefreshCw,
  CalendarDays,
  Sparkles,
  PlusCircle,
  ChevronLeft,
  Search,
  LayoutGrid,
  Table2,
  Clock3,
  Cloud,
  CloudOff,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import { formatTime, formatDate, parseLocalDate } from "@/utils/format";
import { getStatusHexColor, getStatusLabel } from "@/utils/appointmentStatuses";
import { ScheduleDialog } from "../schedule/page";

// ── Helpers ───────────────────────────────────────────────────────────────────

const initials = (n: string) => n?.split(' ').map(c => c[0]).join('').slice(0, 2).toUpperCase() ?? '??';

function todayISO(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
}

function greet(name: string): string {
  const h = new Date().getHours();
  const prefix = h < 12 ? "Good morning" : h < 17 ? "Good afternoon" : "Good evening";
  return name ? `${prefix}, ${name.split(" ")[0]}` : prefix;
}

function StatusPill({ status }: { status?: string }) {
  const col = getStatusHexColor(status);
  return (
    <span
      style={{ background: col.bg, color: col.text, borderColor: `${col.hex}40` }}
      className="inline-flex items-center rounded border px-2.5 py-1 text-[10px] font-bold tracking-wide uppercase"
    >
      {getStatusLabel(status)}
    </span>
  );
}

function DateTile({ dateStr }: { dateStr?: string }) {
  if (!dateStr) return null;
  const d = parseLocalDate(dateStr);
  if (!d) return null;
  return (
    <div className="flex h-[42px] w-[42px] flex-shrink-0 flex-col items-center justify-center rounded-lg bg-[#0057E7]">
      <span className="text-[15px] font-black text-white leading-none">{d.getDate()}</span>
      <span className="text-[8px] font-bold text-white/70 tracking-wide uppercase">{d.toLocaleDateString('en', { month: 'short' })}</span>
    </div>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────

export default function HomePage() {
  const [meetings, setMeetings] = useState([]);
  const [events, setEvents] = useState([]);
  const [birthdays, setBirthdays] = useState([]);
  const [userName, setUserName] = useState("");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [scheduleOpen, setScheduleOpen] = useState(false);
  const [showBdayWithoutWish, setShowBdayWithoutWish] = useState(false);

  const today = todayISO();

  async function loadData(isRefresh = false) {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    try {
      const [userRes, meetingsRes, eventsRes, birthdaysRes] = await Promise.all([
        fetch("/api/users/me"),
        fetch(`/api/meetings?date=${today}`),
        fetch(`/api/events?date=${today}`),
        fetch("/api/birthdays"),
      ]);

      const [userJson, meetingsJson, eventsJson, birthdaysJson] = await Promise.all([
        userRes.ok ? userRes.json() : {},
        meetingsRes.ok ? meetingsRes.json() : [],
        eventsRes.ok ? eventsRes.json() : [],
        birthdaysRes.ok ? birthdaysRes.json() : [],
      ]);

      setUserName(userJson.displayName || userJson.name || userJson.email || "");
      setMeetings(Array.isArray(meetingsJson) ? meetingsJson : []);
      setEvents(Array.isArray(eventsJson) ? eventsJson : []);
      setBirthdays(
        (Array.isArray(birthdaysJson) ? birthdaysJson : []).filter(b => b.daysUntil === 0)
      );
    } catch (err) {
      console.error("Failed to load dashboard data:", err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  useEffect(() => { loadData(); }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[80vh]">
        <Loader2 className="animate-spin text-[#0057E7]" size={40} />
      </div>
    );
  }

  const sortedMeetings = [...meetings].sort((a, b) =>
    (a.meeting_start_time ?? "").localeCompare(b.meeting_start_time ?? "")
  );
  const sortedEvents = [...events].sort((a, b) =>
    (a.event_start_time ?? "").localeCompare(b.event_start_time ?? "")
  );

  return (
    <div className="min-h-screen bg-slate-50 px-6 py-5 font-sans">

      {/* HEADER SECTION - Matched to Dashboard */}
      <div className="mb-7 flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="text-2xl font-bold text-slate-900">{greet(userName)}</div>
          <div className="mt-1 text-[13px] text-slate-500">
            {formatDate(today, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })} — Today's Overview
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Button
            className="h-9 text-xs bg-[#0057E7] hover:bg-[#0046b8] text-white gap-2 px-4 shadow-sm shadow-blue-100"
            onClick={() => setScheduleOpen(true)}
          >
            <PlusCircle size={15} />
            <span>New Meeting</span>
          </Button>
          <ScheduleDialog open={scheduleOpen} onOpenChange={setScheduleOpen} />
        </div>
      </div>

      {/* STAT CARDS - Refined with Dashboard visual weight */}
      <div className="grid gap-6 mb-8 sm:grid-cols-3">
        <StatCard
          icon={<Video className="text-blue-600" size={20} />}
          label="Meetings Today"
          count={meetings.length}
          href="/dashboard?status=today"
          color="blue"
        />
        <StatCard
          icon={<CalendarDays className="text-indigo-600" size={20} />}
          label="Events Today"
          count={events.length}
          href="/events"
          color="indigo"
        />
        <StatCard
          icon={<PartyPopper className="text-rose-600" size={20} />}
          label="Birthdays Today"
          count={birthdays.length}
          href="/birthdays"
          color="rose"
        />
      </div>

      <div className="grid gap-8 lg:grid-cols-5">

        {/* MEETINGS COLUMN - Left Large */}
        <section className="lg:col-span-3 space-y-4">
          <SectionHeader
            icon={<Video className="text-[#0057E7]" size={16} />}
            title="Today's Meetings"
            count={sortedMeetings.length}
            href="/dashboard?status=today"
          />

          {sortedMeetings.length === 0 ? (
            <EmptyState message="No meetings scheduled for today." />
          ) : (
            <div className="space-y-3">
              {sortedMeetings.map((m) => (
                <MeetingItem key={m.id_main} meeting={m} />
              ))}
            </div>
          )}
        </section>

        {/* EVENTS & BIRTHDAYS - Right Small */}
        <section className="lg:col-span-2 space-y-8">

          {/* Events Sub-section */}
          <div className="space-y-4">
            <SectionHeader
              icon={<CalendarDays className="text-indigo-600" size={16} />}
              title="Events Today"
              count={sortedEvents.length}
              href="/events"
            />
            {sortedEvents.length === 0 ? (
              <EmptyState message="No events today." />
            ) : (
              <div className="space-y-3">
                {sortedEvents.map((e) => (
                  <EventItem key={e.id} event={e} />
                ))}
              </div>
            )}
          </div>

          {/* Birthdays Sub-section */}
          <div className="space-y-4">
            {/* Custom header with toggle */}
            <div className="flex items-center justify-between px-1">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-white border border-slate-200 flex items-center justify-center shadow-sm">
                  <PartyPopper className="text-rose-600" size={16} />
                </div>
                <h2 className="text-[15px] font-bold text-slate-900">Birthdays Today</h2>
                {birthdays.filter(b => showBdayWithoutWish || b.gets_wish).length > 0 && (
                  <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-[#0057E7] px-1.5 text-[10px] font-black text-white">
                    {birthdays.filter(b => showBdayWithoutWish || b.gets_wish).length}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setShowBdayWithoutWish(v => !v)}
                  className={cn(
                    "text-[10px] font-bold px-2 py-1 rounded-md border transition-colors",
                    showBdayWithoutWish
                      ? "bg-rose-50 text-rose-700 border-rose-200"
                      : "bg-slate-50 text-slate-500 border-slate-200 hover:bg-slate-100"
                  )}
                >
                  {showBdayWithoutWish ? "With Wish Only" : "+ Without Wish"}
                </button>
                <Link href="/birthdays" className="text-xs font-bold text-[#0057E7] hover:underline flex items-center gap-0.5">
                  View Hub <ChevronRight size={14} />
                </Link>
              </div>
            </div>

            {(() => {
              const filtered = birthdays.filter(b => showBdayWithoutWish || b.gets_wish);
              if (filtered.length === 0)
                return <EmptyState message={showBdayWithoutWish ? "No birthdays today." : "No birthdays with wish today."} />;
              return (
                <div className="grid gap-3">
                  {filtered.map(b => <BirthdayItem key={b.id} birthday={b} />)}
                </div>
              );
            })()}
          </div>
        </section>
      </div>
    </div>
  );
}

// ── Sub-components (Visual Sync) ──────────────────────────────────────────────

function StatCard({ icon, label, count, href, color }) {
  const colors = {
    blue: "border-blue-100 bg-blue-50/50",
    indigo: "border-indigo-100 bg-indigo-50/50",
    rose: "border-rose-100 bg-rose-50/50",
  };
  return (
    <Link href={href}>
      <Card className={cn("border transition-all hover:shadow-md hover:-translate-y-0.5", colors[color])}>
        <CardContent className="flex items-center justify-between p-5">
          <div>
            <p className="text-[13px] font-bold text-slate-500 uppercase tracking-tight">{label}</p>
            <p className="mt-1 text-3xl font-black text-slate-900">{count}</p>
          </div>
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-white shadow-sm border border-white/50">
            {icon}
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}

function SectionHeader({ icon, title, count, href }) {
  return (
    <div className="flex items-center justify-between px-1">
      <div className="flex items-center gap-2">
        <div className="w-7 h-7 rounded-lg bg-white border border-slate-200 flex items-center justify-center shadow-sm">
          {icon}
        </div>
        <h2 className="text-[15px] font-bold text-slate-900">{title}</h2>
        {count > 0 && (
          <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-[#0057E7] px-1.5 text-[10px] font-black text-white">
            {count}
          </span>
        )}
      </div>
      <Link href={href} className="text-xs font-bold text-[#0057E7] hover:underline flex items-center gap-0.5">
        View Hub <ChevronRight size={14} />
      </Link>
    </div>
  );
}

function MeetingItem({ meeting }) {
  const attendeeName = meeting.bcl_attendee_name || meeting.bcl_attendee || "Unknown";

  return (
    <div className="group relative bg-white rounded-xl border border-slate-200 p-4 shadow-sm hover:shadow-md transition-all cursor-pointer">
      <div className="flex gap-4">
        <DateTile dateStr={meeting.meeting_date} />

        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between mb-1">
            <h3 className="text-sm font-bold text-slate-900 truncate pr-2">
              {meeting.client_name}
            </h3>
            <StatusPill status={meeting.status} />
          </div>

          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mb-3">
            <div className="text-[11px] text-slate-500 flex items-center gap-1.5">
              <Building size={12} className="text-slate-400" />
              {meeting.client_company || 'Independent'}
            </div>
            <div className="text-[11px] font-bold text-[#0057E7] flex items-center gap-1">
              <Clock size={12} />
              {formatTime(meeting.meeting_start_time)}
            </div>
          </div>

          <div className="flex items-center justify-between pt-3 border-t border-slate-100">
            <div className="flex items-center gap-2">
              <Avatar className="h-6 w-6 border border-slate-200">
                <AvatarFallback className="bg-slate-100 text-[9px] font-bold text-slate-600">
                  {initials(attendeeName)}
                </AvatarFallback>
              </Avatar>
              <span className="text-[11px] font-medium text-slate-600">{attendeeName}</span>
            </div>

            <div className="flex items-center gap-2">
              {meeting.meeting_type === 'virtual' ? (
                <div className="flex items-center gap-1 text-[10px] font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded">
                  <Video size={10} /> VIRTUAL
                </div>
              ) : (
                <div className="flex items-center gap-1 text-[10px] font-bold text-orange-600 bg-orange-50 px-2 py-0.5 rounded">
                  <MapPin size={10} /> {meeting.meeting_venue_area || 'In-Person'}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function EventItem({ event }) {
  return (
    <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm hover:shadow-md transition-all">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-sm font-bold text-slate-900 truncate pr-2">{event.event_name}</h3>
        <Badge variant="outline" className="text-[9px] font-black uppercase bg-slate-50 border-slate-200">
          {event.event_type?.replace('_', ' ')}
        </Badge>
      </div>

      <div className="flex items-center justify-between text-[11px]">
        <div className="flex items-center gap-3 text-slate-500">
          <span className="flex items-center gap-1">
            <Clock3 size={12} className="text-slate-400" />
            {formatTime(event.event_start_time)}
          </span>
          <span className="flex items-center gap-1">
            <MapPin size={12} className="text-slate-400" />
            {event.event_venue_area || 'TBD'}
          </span>
        </div>
        <div className="text-[10px] font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded uppercase">
          Corporate
        </div>
      </div>
    </div>
  );
}

function BirthdayItem({ birthday }) {
  return (
    <div className={cn(
      "bg-white rounded-xl border p-3 shadow-sm transition-colors",
      birthday.gets_wish
        ? "border-rose-100 hover:border-rose-200"
        : "border-slate-100 hover:border-slate-200 opacity-80"
    )}>
      <div className="flex items-start gap-3">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-rose-50 text-lg shadow-inner mt-0.5">
          🎂
        </div>
        <div className="min-w-0 flex-1">
          {/* Name + sync status */}
          <div className="flex items-start justify-between gap-1 mb-0.5">
            <p className="text-sm font-bold text-slate-900 truncate">{birthday.name}</p>
            <span
              title={birthday.calendarSynced ? "Synced to Google Calendar" : "Not synced to calendar"}
              className="shrink-0 mt-0.5"
            >
              {birthday.calendarSynced
                ? <Cloud size={12} className="text-green-500" />
                : <CloudOff size={12} className="text-slate-300" />
              }
            </span>
          </div>

          <p className="text-[10px] font-medium text-slate-500 truncate uppercase tracking-tight">
            {birthday.company && birthday.company !== 'Not Allocated' ? birthday.company : 'Private Client'}
          </p>
          {birthday.principalName && (
            <p className="text-[10px] text-slate-400 truncate">Dep. of {birthday.principalName}</p>
          )}

          <div className="mt-2 flex flex-wrap gap-1">
            {birthday.gets_wish
              ? <GiftTag icon={<MessageCircle size={10} />} label="WISH" color="blue" />
              : <GiftTag icon={<MessageCircle size={10} />} label="NO WISH" color="gray" />
            }
            {birthday.gets_cake && <GiftTag icon={<Sparkles size={10} />} label="CAKE" color="amber" />}
            {birthday.gets_gift && <GiftTag icon={<Gift size={10} />} label="GIFT" color="emerald" />}
            {birthday.messageSent && <GiftTag icon={null} label="✓ SENT" color="green" />}
          </div>
        </div>
      </div>
    </div>
  );
}

function GiftTag({ icon, label, color }) {
  const styles = {
    blue:    "bg-blue-50 text-blue-700 border-blue-100",
    amber:   "bg-amber-50 text-amber-700 border-amber-100",
    emerald: "bg-emerald-50 text-emerald-700 border-emerald-100",
    green:   "bg-green-50 text-green-700 border-green-100",
    gray:    "bg-slate-50 text-slate-400 border-slate-200",
  };
  return (
    <span className={cn("inline-flex items-center gap-1 rounded border px-1.5 py-0.5 text-[9px] font-black", styles[color] ?? styles.gray)}>
      {icon} {label}
    </span>
  );
}

function EmptyState({ message }) {
  return (
    <div className="rounded-xl border border-dashed border-slate-200 bg-white/50 py-8 text-center shadow-inner">
      <p className="text-xs font-medium text-slate-400">{message}</p>
    </div>
  );
}