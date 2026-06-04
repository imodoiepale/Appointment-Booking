// @ts-nocheck
"use client";

import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { format, startOfMonth, startOfWeek, isSameDay, parseISO, addDays, addMonths, addWeeks, isToday as dateFnsIsToday, isValid } from 'date-fns';
import { ChevronLeft, ChevronRight, Trash2, Loader2, Video, MapPin, Phone, Mail, PlusCircle, X, Download, CalendarDays, Calendar, Users, Clock, AlertCircle, CheckCircle2, XCircle, PartyPopper, CalendarClock, Timer, CheckCircle, RefreshCw, Building, MapPinned, ClipboardList, Info, } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { useToast } from '@/hooks/use-toast';
import { cn } from "@/lib/utils";
import supabase from '@/utils/supabaseClient';
import { getStatusGradient } from '@/utils/meetingStatusColors';
import {
  getEventTypeConfig, EventTypeIcon as EvTypeIconUtil, EVENT_TYPE_CONFIG,
  getMeetingStatusHex, MEETING_STATUS_COLORS, formatDateDDMMYYYY,
} from '@/utils/appointmentStyles';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';

// ── TYPES ────────────────────────────────────────────────────────
interface Meeting {
  id_main: number;
  booking_date?: string;
  booking_day?: string;
  meeting_date: string;
  meeting_day?: string;
  meeting_start_time: string;
  meeting_end_time: string;
  meeting_slot_start_time?: string;
  meeting_slot_end_time?: string;
  meeting_duration?: number;
  client_name: string;
  client_company: string;
  client_email?: string;
  client_mobile?: string;
  meeting_type: 'virtual' | 'physical' | 'inPerson';
  meeting_venue_area: string;
  meeting_venue?: string;
  venue_distance?: number;
  meeting_agenda: string;
  bcl_attendee: string | string[];
  bcl_attendees_info?: Array<{ id?: string; name?: string }> | string;
  bcl_attendee_name?: string;
  bcl_attendee_mobile?: string;
  status?: string;
  badge_status?: string;
  google_event_id?: string;
  google_meet_link?: string;
  created_by?: string;
  updated_by?: string;
}

type ViewType = 'month' | 'week' | 'day';
type ContentFilter = 'meetings' | 'events' | 'all';

interface BclEvent {
  id: number;
  event_name: string;
  event_type: string;
  event_date: string;
  event_start_time: string;
  event_end_time: string;
  event_duration?: number;
  event_venue?: string;
  event_venue_area?: string;
  event_description?: string;
  organizer_name?: string;
  organizer_company?: string;
  organizer_email?: string;
  organizer_mobile?: string;
  expected_attendees?: number;
  status?: string;
  badge_status?: string;
  google_event_id?: string;
}


const getLightStatusColor = (status: string) => {
  const col = MEETING_STATUS_COLORS[(status ?? '').toLowerCase()];
  return col ? col.bg : 'rgba(248,250,252,0.8)';
};

// ── INJECTED STYLES — matches sidebar design language exactly ─────
const CalendarStyles = () => (
  <style>{`
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');

    .cal-shell {
      font-family: 'Inter', sans-serif;
      background-color: #f4f7f8;
      height: 100vh;
      display: flex;
      flex-direction: column;
      overflow: hidden;
    }

    /* ── TOPBAR ── */
    .cal-topbar {
      background: #ffffff;
      border-bottom: 1px solid #eef2f3;
      padding: 0 24px;
      height: 58px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      flex-shrink: 0;
      box-shadow: 0 10px 30px rgba(0,48,56,0.05);
    }
    .cal-topbar-title {
      font-size: 15px;
      font-weight: 700;
      letter-spacing: -0.01em;
    }
    .cal-topbar-sub {
      font-size: 12px;
      color: #64868c;
      margin-top: 1px;
    }

    /* View switcher — mirrors sb-link style */
    .cal-view-pill {
      display: flex;
      background: hsl(var(--secondary));
      border-radius: 8px;
      padding: 3px;
      gap: 2px;
    }
    .cal-view-btn {
      padding: 6px 14px;
      font-size: 12px;
      font-weight: 600;
      border-radius: 6px;
      border: none;
      cursor: pointer;
      transition: all 0.2s ease;
      color: hsl(var(--muted-foreground));
      background: transparent;
      text-transform: capitalize;
      letter-spacing: 0.01em;
    }
    .cal-view-btn:hover { color: hsl(var(--foreground)); background: hsl(var(--accent)); }
    .cal-view-btn.active {
      background: hsl(var(--primary));
      color: hsl(var(--primary-foreground));
      box-shadow: 0 2px 8px hsl(var(--primary) / 0.22);
    }

    /* Content type switcher */
    .cal-content-switcher { display: flex; align-items: center; gap: 6px; padding: 4px; background: hsl(var(--secondary)); border-radius: 10px; }
    .cal-content-btn { padding: 6px 14px; font-size: 12px; font-weight: 700; border-radius: 7px; border: none; cursor: pointer; transition: all 0.15s ease; color: hsl(var(--muted-foreground)); background: transparent; display: flex; align-items: center; gap: 6px; }
    .cal-content-btn:hover { color: hsl(var(--foreground)); background: hsl(var(--accent)); }
    .cal-content-btn.active { background: hsl(var(--card)); color: hsl(var(--primary)); box-shadow: 0 1px 4px rgba(0,0,0,0.08); }
    .cal-content-btn.active.ct-meetings,
    .cal-content-btn.active.ct-events,
    .cal-content-btn.active.ct-all { color: hsl(var(--primary)); }

    .cal-export-btn {
      display: flex;
      align-items: center;
      gap: 6px;
      padding: 7px 14px;
      font-size: 12px;
      font-weight: 600;
      border-radius: 8px;
      border: 1px solid hsl(var(--border));
      background: hsl(var(--card));
      color: hsl(var(--foreground));
      cursor: pointer;
      transition: all 0.2s ease;
    }
    .cal-export-btn:hover { background: hsl(var(--secondary)); border-color: hsl(var(--ring) / 0.35); }

    .cal-add-btn {
      display: flex;
      align-items: center;
      font-size: 13px;
      font-weight: 700;
      border-radius: 8px;
      border: none;
      background: hsl(var(--primary));
      color: hsl(var(--primary-foreground));
      cursor: pointer;
      box-shadow: 0 4px 14px hsl(var(--primary) / 0.24);
      transition: all 0.2s ease;
    }
    .cal-add-btn:hover { transform: translateY(-1px); background: hsl(var(--primary) / 0.92); box-shadow: 0 6px 18px hsl(var(--primary) / 0.3); }

    /* ── BODY LAYOUT ── */
    .cal-body {
      flex: 1;
      display: flex;
      overflow: hidden;
      padding: 16px;
      gap: 14px;
    }

    /* ── LEFT SIDEBAR (mini calendar + today list) ── */
    .cal-aside {
      width: 232px;
      flex-shrink: 0;
      display: flex;
      flex-direction: column;
      gap: 12px;
    }

    .cal-panel {
      background: #ffffff;
      border-radius: 12px;
      border: 1px solid #eef2f3;
      overflow: hidden;
      box-shadow: 0 14px 35px rgba(0,48,56,0.07);
    }

    .cal-panel-header {
      font-size: 10px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.06em;
      color: #8ca4a8;
      padding: 14px 16px 8px 16px;
    }

    /* Mini calendar */
    .mini-cal-nav {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 14px 14px 10px;
    }
    .mini-cal-month { font-size: 13px; font-weight: 700; color: #1d4ed8; }
    .mini-cal-nav-btn {
      width: 26px; height: 26px;
      border-radius: 6px;
      border: 1px solid hsl(var(--border));
      background: hsl(var(--secondary));
      color: hsl(var(--muted-foreground));
      display: flex; align-items: center; justify-content: center;
      cursor: pointer;
      transition: all 0.15s ease;
    }
    .mini-cal-nav-btn:hover { background: hsl(var(--primary)); color: hsl(var(--primary-foreground)); border-color: hsl(var(--primary)); }

    .mini-cal-grid { padding: 0 10px 12px; }
    .mini-cal-dow {
      display: grid; grid-template-columns: repeat(7,1fr);
      margin-bottom: 4px;
    }
    .mini-cal-dow span {
      text-align: center; font-size: 9px; font-weight: 700;
      text-transform: uppercase; letter-spacing: 0.04em; color: #8ca4a8;
      padding: 4px 0;
    }
    .mini-cal-days { display: grid; grid-template-columns: repeat(7,1fr); gap: 1px; }
    .mini-day {
      aspect-ratio: 1;
      display: flex; align-items: center; justify-content: center;
      font-size: 11px; font-weight: 500;
      border-radius: 6px;
      cursor: pointer;
      color: #f2f2f2;
      transition: all 0.15s ease;
      position: relative;
    }
    .mini-day:hover { background: #f0f4f5; }
    .mini-day.other-month { color: #c8d6d8; }
    .mini-day.today {
      background: rgba(0,209,209,0.1);
      color: #007a7a;
      font-weight: 700;
    }
    .mini-day.selected {
      background: linear-gradient(135deg, #1d4ed8, #005060);
      color: #ffffff;
      font-weight: 700;
      box-shadow: 0 2px 8px rgba(0,48,56,0.25);
    }
    .mini-day.has-meeting::after {
      content: '';
      position: absolute;
      bottom: 2px;
      left: 50%; transform: translateX(-50%);
      width: 4px; height: 4px;
      border-radius: 50%;
      background: #00d1d1;
    }
    .mini-day.selected::after { background: rgba(255,255,255,0.6); }

    /* Today list */
    .today-item {
      display: flex; align-items: flex-start;
      gap: 10px;
      padding: 10px 14px;
      cursor: pointer;
      transition: background 0.15s ease;
      border-bottom: 1px solid #f5f8f9;
    }
    .today-item:last-child { border-bottom: none; }
    .today-item:hover { background: #f7fafa; }
    .today-dot { width: 8px; height: 8px; border-radius: 50%; flex-shrink: 0; margin-top: 4px; }
    .today-name { font-size: 12px; font-weight: 600; color: #1d4ed8; }
    .today-meta { font-size: 11px; color: #8ca4a8; margin-top: 2px; }

    /* ── MAIN CALENDAR AREA ── */
    .cal-main {
      flex: 1;
      display: flex;
      flex-direction: column;
      background: #ffffff;
      border-radius: 12px;
      border: 1px solid #eef2f3;
      overflow: hidden;
      min-width: 0;
      box-shadow: 0 18px 45px rgba(0,48,56,0.08);
    }

    /* Calendar nav bar */
    .cal-nav {
      height: 52px;
      display: flex; align-items: center; justify-content: space-between;
      padding: 0 18px;
      border-bottom: 1px solid #eef2f3;
      flex-shrink: 0;
      background: #ffffff;
    }
    .cal-nav-label {
      font-size: 14px; font-weight: 700; color: #1d4ed8;
      min-width: 200px; text-align: center;
      letter-spacing: -0.01em;
    }
    .cal-nav-btn {
      width: 30px; height: 30px;
      border-radius: 8px; border: 1px solid hsl(var(--border));
      background: hsl(var(--secondary)); color: hsl(var(--muted-foreground));
      display: flex; align-items: center; justify-content: center;
      cursor: pointer; transition: all 0.15s ease;
    }
    .cal-nav-btn:hover { background: hsl(var(--primary)); color: hsl(var(--primary-foreground)); border-color: hsl(var(--primary)); }
    .cal-today-btn {
      padding: 5px 14px; font-size: 12px; font-weight: 600;
      border-radius: 8px; border: 1px solid hsl(var(--border));
      background: hsl(var(--secondary)); color: hsl(var(--foreground)); cursor: pointer;
      transition: all 0.15s ease;
    }
    .cal-today-btn:hover { background: hsl(var(--accent)); border-color: hsl(var(--ring)); color: hsl(var(--primary)); }

    /* ── MONTH VIEW ── */
    .month-dow-header {
      display: grid; grid-template-columns: repeat(7,1fr);
      background: #f7fafa;
      border-bottom: 1px solid #eef2f3;
    }
    .month-dow-cell {
      text-align: center; font-size: 10px; font-weight: 700;
      text-transform: uppercase; letter-spacing: 0.05em;
      color: #8ca4a8; padding: 10px 0;
      border-right: 1px solid #e8eef0;
    }
    .month-dow-cell:last-child {
      border-right: none;
    }
    .month-grid {
      display: grid; grid-template-columns: repeat(7,1fr);
      grid-template-rows: repeat(6,1fr);
      flex: 1;
      min-height: 0;
      overflow: hidden;
    }
    .month-cell {
      border-right: 1px solid #e8eef0;
      border-bottom: 1px solid #e8eef0;
      padding: 6px;
      cursor: pointer;
      min-height: 0;
      transition: background 0.15s ease;
      position: relative;
    }
    .month-cell:hover { background: #f7fafa; }
    .month-cell.other-month { background: #fafcfc; opacity: 0.55; }
    .month-cell.selected { background: rgba(0,209,209,0.04); }
    .month-day-num {
      width: 24px; height: 24px;
      border-radius: 6px;
      display: flex; align-items: center; justify-content: center;
      font-size: 12px; font-weight: 600; color: #64868c;
      margin-bottom: 4px;
    }
    .month-day-num.today {
      background: linear-gradient(135deg, #1d4ed8, #005060);
      color: #ffffff;
      box-shadow: 0 2px 6px rgba(0,48,56,0.2);
    }
    .month-event:hover { opacity: 0.85; }

    /* ── WEEK VIEW ── */
    .week-layout { display: flex; flex: 1; overflow: hidden; }
    .week-time-col {
      width: 52px; flex-shrink: 0;
      border-right: 1px solid #e8eef0;
      background: #ffffff;
    }
    .week-time-header { height: 56px; border-bottom: 1px solid #eef2f3; }
    .week-time-slot {
      height: 72px; border-bottom: 1px solid #e8eef0;
      position: relative;
    }
    .week-time-label {
      position: absolute; top: -7px; right: 8px;
      font-size: 9px; font-weight: 700; color: #b0c4c8;
      text-transform: uppercase; letter-spacing: 0.03em;
    }
    .week-days-scroll { flex: 1; overflow-x: auto; display: flex; }
    .week-day-col {
      flex: 1; min-width: 100px;
      border-right: 1px solid #e8eef0;
      position: relative;
    }
    .week-day-col:last-child { border-right: none; }
    .week-day-header {
      height: 56px; display: flex; flex-direction: column;
      align-items: center; justify-content: center;
      border-bottom: 1px solid #eef2f3;
      position: sticky; top: 0; z-index: 10; background: #ffffff;
      transition: background 0.2s;
    }
    .week-day-header.today-col { background: rgba(0,209,209,0.04); }
    .week-dow { font-size: 9px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; color: #8ca4a8; }
    .week-date {
      width: 28px; height: 28px; margin-top: 3px;
      border-radius: 8px;
      display: flex; align-items: center; justify-content: center;
      font-size: 13px; font-weight: 700; color: #1d4ed8;
    }
    .week-date.today {
      background: linear-gradient(135deg, #1d4ed8, #00505e);
      color: #ffffff;
      box-shadow: 0 2px 8px rgba(0,48,56,0.25);
    }
    .week-grid-row {
      height: 72px; border-bottom: 1px solid #e8eef0;
    }
    .week-event:hover { transform: scale(1.02); z-index: 10; box-shadow: 0 6px 20px rgba(0,0,0,0.18); }
    .week-event-time { font-size: 9px; font-weight: 700; opacity: 0.85; }
    .week-event-name { font-size: 11px; font-weight: 600; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .week-event-co { font-size: 10px; opacity: 0.75; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }

    /* ── DAY VIEW ── */
    .day-layout { display: flex; flex: 1; overflow: hidden; }
    .day-time-col {
      width: 52px; flex-shrink: 0;
      border-right: 1px solid #e8eef0;
      background: #ffffff;
    }
    .day-time-header { height: 56px; border-bottom: 1px solid #eef2f3; }
    .day-content { flex: 1; overflow-y: auto; position: relative; }
    .day-header-strip {
      height: 56px; display: flex; align-items: center;
      padding: 0 20px; gap: 14px;
      border-bottom: 1px solid #eef2f3;
      position: sticky; top: 0; z-index: 10; background: #ffffff;
    }
    .day-big-num {
      width: 38px; height: 38px;
      border-radius: 10px;
      display: flex; align-items: center; justify-content: center;
      font-size: 17px; font-weight: 800;
      flex-shrink: 0;
    }
    .day-big-num.today {
      background: linear-gradient(135deg, #1d4ed8, #00505e);
      color: #fff; box-shadow: 0 3px 10px rgba(0,48,56,0.25);
    }
    .day-big-num.not-today { background: #f0f4f5; color: #1d4ed8; }
    .day-grid-row {
      height: 96px; border-bottom: 1px solid #e8eef0;
    }
    /* -- Updated Sharp Event Styles -- */

/* Shared base for all event cards */
.event-card-base {
  border: 1px solid rgba(0,0,0,0.05);
  border-top-width: 3px !important; /* The thick "sharp" top bar */
  border-radius: 4px; /* "Small rounded" */
  color: #1d4ed8;
  box-shadow: 0 2px 4px rgba(0,0,0,0.02);
  transition: transform 0.1s ease, box-shadow 0.1s ease;
  overflow: hidden;
}

.event-card-base:hover {
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(0,0,0,0.08);
  z-index: 20;
}

/* Month View Specific */
.month-event {
  display: flex;
  flex-direction: column;
  padding: 2px 6px;
  font-size: 10px;
  font-weight: 700;
  margin-bottom: 3px;
  height: 22px;
  justify-content: center;
}

/* Week View Specific */
.week-event {
  position: absolute;
  left: 3px;
  right: 3px;
  padding: 8px;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

/* Day View Specific */
.day-event {
  position: absolute;
  left: 16px;
  right: 16px;
  padding: 12px;
  display: flex;
  flex-direction: column;
}

/* Typography for the "Sharp" look */
.event-title {
  font-size: 11px;
  font-weight: 800;
  color: #1d4ed8;
  line-height: 1.2;
}
.event-subtitle {
  font-size: 10px;
  font-weight: 500;
  color: #64868c;
}
.event-avatar-mini {
  width: 16px;
  height: 16px;
  border-radius: 4px;
  margin-top: auto;
}
    .day-event:hover { box-shadow: 0 6px 20px rgba(0,0,0,0.12); transform: translateX(2px); }
    .day-event-bar { width: 4px; flex-shrink: 0; }
    .day-event-body {
      flex: 1; padding: 12px 14px;
      display: flex; align-items: center; gap: 12px;
      background: #ffffff;
      border: 1px solid #eef2f3;
      border-left: none;
      border-radius: 0 10px 10px 0;
    }
    .day-event-avatar {
      width: 36px; height: 36px; flex-shrink: 0;
      border-radius: 8px;
      display: flex; align-items: center; justify-content: center;
      font-size: 11px; font-weight: 700; color: #ffffff;
    }
    .day-event-info { flex: 1; min-width: 0; }
    .day-event-name { font-size: 13px; font-weight: 700; color: #1d4ed8; }
    .day-event-meta { font-size: 11px; color: #8ca4a8; margin-top: 2px; }
    .day-event-pill {
      padding: 3px 10px; border-radius: 5px;
      font-size: 10px; font-weight: 700;
      flex-shrink: 0;
    }

    /* ── RIGHT DETAIL PANEL ── */
    .cal-detail {
      width: 268px; flex-shrink: 0;
      background: #ffffff;
      border-radius: 12px;
      border: 1px solid #eef2f3;
      display: flex; flex-direction: column;
      overflow: hidden;
    }
    .cal-detail-empty {
      flex: 1; display: flex; flex-direction: column;
      align-items: center; justify-content: center;
      padding: 24px; text-align: center;
    }
    .cal-detail-icon-wrap {
      width: 52px; height: 52px; border-radius: 14px;
      background: #f0f4f5;
      display: flex; align-items: center; justify-content: center;
      margin-bottom: 12px;
    }
    .cal-detail-empty-title { font-size: 13px; font-weight: 700; color: #1d4ed8; }
    .cal-detail-empty-sub { font-size: 12px; color: #8ca4a8; margin-top: 4px; line-height: 1.5; }

    .detail-color-header {
      padding: 18px 16px 14px;
      position: relative; overflow: hidden;
    }
    .detail-header-shine {
      position: absolute; top: -20px; right: -20px;
      width: 80px; height: 80px; border-radius: 50%;
      background: rgba(255,255,255,0.12);
    }
    .detail-status-pill {
      display: inline-flex; align-items: center;
      padding: 3px 10px;
      border-radius: 5px;
      font-size: 10px; font-weight: 700;
      letter-spacing: 0.04em; text-transform: uppercase;
      background: rgba(255,255,255,0.2);
      color: #ffffff;
      margin-bottom: 12px;
    }
    .detail-close {
      position: absolute; top: 12px; right: 12px;
      width: 26px; height: 26px; border-radius: 6px;
      background: rgba(255,255,255,0.15);
      border: none; cursor: pointer; color: #fff;
      display: flex; align-items: center; justify-content: center;
      transition: background 0.15s;
    }
    .detail-close:hover { background: rgba(255,255,255,0.25); }
      .detail-name { font-size: 15px; font-weight: 800; letter-spacing: -0.01em; }
    .detail-company { font-size: 12px; color: rgba(255,255,255,0.7); margin-top: 2px; }

    .detail-body { flex: 1; overflow-y: auto; padding: 14px; }
    .detail-section-label {
      font-size: 9px; font-weight: 700; text-transform: uppercase;
      letter-spacing: 0.07em; color: #8ca4a8; margin-bottom: 8px; margin-top: 14px;
    }
    .detail-section-label:first-child { margin-top: 0; }
    .detail-chip-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }
    .detail-chip {
      background: #f7fafa; border-radius: 8px;
      border: 1px solid #eef2f3;
      padding: 10px 12px;
    }
    .detail-chip-label { font-size: 9px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.06em; color: #8ca4a8; margin-bottom: 3px; }
    .detail-chip-value { font-size: 12px; font-weight: 700; color: #1d4ed8; }

    .detail-type-row {
      display: flex; align-items: center; gap: 10px;
      padding: 10px 12px;
      background: #f7fafa;
      border-radius: 8px; border: 1px solid #eef2f3;
    }
    .detail-type-icon {
      width: 30px; height: 30px; border-radius: 7px;
      display: flex; align-items: center; justify-content: center;
    }

    .detail-agenda {
      font-size: 12px; color: #64868c; line-height: 1.6;
      background: #f7fafa; border-radius: 8px;
      border: 1px solid #eef2f3; padding: 10px 12px;
    }

    .detail-attendee {
      display: flex; align-items: center; gap: 10px;
      padding: 10px 12px;
      background: #f7fafa; border-radius: 8px;
      border: 1px solid #eef2f3;
    }
    .detail-att-avatar {
      width: 30px; height: 30px; border-radius: 7px;
      background: linear-gradient(135deg, #1d4ed8, #005060);
      display: flex; align-items: center; justify-content: center;
      font-size: 10px; font-weight: 700; color: #fff; flex-shrink: 0;
    }

    .detail-contact-link {
      display: flex; align-items: center; gap: 10px;
      padding: 9px 12px;
      border-radius: 8px; border: 1px solid #eef2f3;
      text-decoration: none; color: inherit;
      transition: all 0.15s ease;
      margin-bottom: 6px;
    }
    .detail-contact-link:last-child { margin-bottom: 0; }
    .detail-contact-link:hover { background: #f7fafa; border-color: #c8d6d8; }
    .detail-contact-icon {
      width: 28px; height: 28px; border-radius: 7px;
      display: flex; align-items: center; justify-content: center;
      flex-shrink: 0;
    }
    .detail-contact-text { font-size: 11px; font-weight: 500; color: #1d4ed8; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }

    /* Detail footer */
    .detail-footer {
      padding: 12px 14px;
      border-top: 1px solid #eef2f3;
      display: flex; gap: 8px;
    }
    .detail-del-btn {
      width: 36px; height: 36px; border-radius: 8px;
      border: 1px solid #ffe0e0; background: #fff5f5;
      color: #e05252; display: flex; align-items: center; justify-content: center;
      cursor: pointer; transition: all 0.15s ease; flex-shrink: 0;
    }
    .detail-del-btn:hover { background: #ffe0e0; }
    .detail-join-btn {
      flex: 1; height: 36px; border-radius: 8px; border: none;
      background: hsl(var(--primary));
      color: hsl(var(--primary-foreground)); font-size: 12px; font-weight: 700;
      cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 6px;
      box-shadow: 0 3px 10px hsl(var(--primary) / 0.22);
      transition: all 0.2s ease;
    }
    .detail-join-btn:hover { box-shadow: 0 5px 15px hsl(var(--primary) / 0.3); transform: translateY(-1px); }
    .detail-edit-btn {
      flex: 1; height: 36px; border-radius: 8px;
      border: 1px solid hsl(var(--border)); background: hsl(var(--secondary));
      color: hsl(var(--foreground)); font-size: 12px; font-weight: 700;
      cursor: pointer; transition: all 0.15s ease;
    }
    .detail-edit-btn:hover { background: hsl(var(--accent)); }

    /* Status pill styles */
    .pill-completed { background: #dcfce7; color: #166534; }
    .pill-active    { background: #ccfbf1; color: #065f46; }
    .pill-virtual   { background: #ede9fe; color: #5b21b6; }
    .pill-scheduled { background: #dbeafe; color: #1e40af; }
    .pill-cancelled { background: #fee2e2; color: #991b1b; }
    .pill-pending   { background: #fef3c7; color: #92400e; }
    .pill-physical  { background: #e0f2fe; color: #0c4a6e; }
    .pill-default   { background: #f1f5f9; color: #334155; }

    /* Scrollbar */
    .cal-main ::-webkit-scrollbar,
    .cal-detail ::-webkit-scrollbar { width: 4px; height: 4px; }
    .cal-main ::-webkit-scrollbar-track,
    .cal-detail ::-webkit-scrollbar-track { background: transparent; }
    .cal-main ::-webkit-scrollbar-thumb,
    .cal-detail ::-webkit-scrollbar-thumb { background: #d0dfe1; border-radius: 4px; }
  `}</style>
);

// ── COLOR HELPERS ───────────────────────────────────────────────────
const getEventGradient = (m: Meeting) => getStatusGradient(m.status || m.meeting_type);
const getEventColor = (m: Meeting) => getMeetingStatusHex(m.status || m.meeting_type);
const getLabel = (m: Meeting) => m.status || m.meeting_type || 'Meeting';
const initials = (n: string) => {
  if (!n || typeof n !== 'string') return '??';
  return n.split(' ').filter(Boolean).map(c => c[0]).join('').slice(0, 2).toUpperCase();
};

function safeParseDate(dateStr?: string) {
  if (!dateStr) return null;
  // Parse YYYY-MM-DD as local date to avoid UTC-to-local timezone shift
  if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
    const [year, month, day] = dateStr.split('-').map(Number);
    return new Date(year, month - 1, day);
  }
  const date = parseISO(dateStr);
  return isValid(date) ? date : null;
}

function formatSafeDate(dateStr: string | undefined, pattern: string, fallback = '—') {
  const date = safeParseDate(dateStr);
  return date ? format(date, pattern) : fallback;
}

function parseBclAttendees(value: any): string[] {
  if (Array.isArray(value)) return value.map(String).filter(Boolean);
  if (typeof value === 'string' && value.trim()) {
    try {
      const parsed = JSON.parse(value);
      if (Array.isArray(parsed)) return parsed.map(String).filter(Boolean);
    } catch { return [value.trim()]; }
    return [value.trim()];
  }
  return [];
}

function parseAttendeeInfo(value: any): Array<{ id?: string; name?: string; email?: string; username?: string }> {
  if (Array.isArray(value)) return value.filter(Boolean);
  if (typeof value === 'string' && value.trim()) {
    try {
      const parsed = JSON.parse(value);
      return Array.isArray(parsed) ? parsed.filter(Boolean) : [];
    } catch { return []; }
  }
  return [];
}

function buildUserMap(users: any[]): Record<string, any> {
  return Object.fromEntries((users || []).map((u) => [String(u.id), u]));
}

function getAttendeeDetails(meeting: any, usersById: Record<string, any> = {}) {
  const info = parseAttendeeInfo(meeting?.bcl_attendees_info);
  const ids = [
    ...info.map((a) => a.id).filter(Boolean),
    ...parseBclAttendees(meeting?.bcl_attendee),
  ].map(String);
  const uniqueIds = Array.from(new Set(ids));
  const details = uniqueIds.map((id) => {
    const user = usersById[id];
    const fallback = info.find((a) => String(a.id) === id);
    return {
      id,
      name: user?.displayName || user?.name || fallback?.name || meeting?.bcl_attendee_name || id,
      email: user?.email || fallback?.email || null,
      username: user?.username || fallback?.username || null,
    };
  });

  if (details.length) return details;
  if (meeting?.bcl_attendee_name) return [{ id: '', name: meeting.bcl_attendee_name }];
  return [];
}

// ── CONSTANTS ────────────────────────────────────────────────────
const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const TIME_SLOTS = Array.from({ length: 14 }, (_, i) => `${(i + 7).toString().padStart(2, '0')}:00`);

// ── MINI CALENDAR ────────────────────────────────────────────────
function MiniCalendar({
  currentDate,
  selectedDate,
  onSelect,
  daysWithMeetings
}: MiniCalendarProps) {
  const [miniDate, setMiniDate] = useState(currentDate);

  // Calendar Logic
  const monthStart = startOfMonth(miniDate);
  const calendarStart = startOfWeek(monthStart, { weekStartsOn: 0 });
  const days = Array.from({ length: 42 }, (_, i) => addDays(calendarStart, i));

  const weekDays = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

  return (
    <div className="w-full max-w-[280px] p-4 bg-white rounded-2xl border border-slate-200 shadow-sm">
      {/* ── HEADER ── */}
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-sm font-black text-slate-900 tracking-tight">
          {format(miniDate, 'MMMM yyyy')}
        </h2>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 rounded-md hover:bg-slate-100"
            onClick={() => setMiniDate(addMonths(miniDate, -1))}
          >
            <ChevronLeft size={14} className="text-slate-600" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 rounded-md hover:bg-slate-100"
            onClick={() => setMiniDate(addMonths(miniDate, 1))}
          >
            <ChevronRight size={14} className="text-slate-600" />
          </Button>
        </div>
      </div>

      {/* ── GRID ── */}
      <div className="grid grid-cols-7 gap-px">
        {/* Days of Week */}
        {weekDays.map((day) => (
          <div key={day} className="h-8 flex items-center justify-center">
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
              {day}
            </span>
          </div>
        ))}

        {/* Days Grid */}
        {days.map((day, i) => {
          const isOtherMonth = day.getMonth() !== miniDate.getMonth();
          const isSelected = isSameDay(day, selectedDate);
          const isToday = dateFnsIsToday(day);
          const hasMeeting = daysWithMeetings.some(d => isSameDay(d, day));

          return (
            <button
              key={i}
              onClick={() => onSelect(day)}
              disabled={isOtherMonth}
              className={cn(
                "relative h-9 w-full flex flex-col items-center justify-center rounded-lg text-xs font-bold transition-all",
                "hover:bg-slate-50 focus:outline-none",
                isOtherMonth && "opacity-20 cursor-default",
                isToday && !isSelected && "text-blue-600 bg-blue-50/50",
                isSelected && "bg-blue-600 text-white hover:bg-blue-700 shadow-md shadow-blue-100",
                !isSelected && !isToday && "text-slate-600"
              )}
            >
              {format(day, 'd')}

              {/* Meeting Indicator Dot */}
              {hasMeeting && !isOtherMonth && (
                <span className={cn(
                  "absolute bottom-1 w-1 h-1 rounded-full",
                  isSelected ? "bg-white" : "bg-blue-500"
                )} />
              )}
            </button>
          );
        })}
      </div>

      {/* ── LEGEND (Optional) ── */}
      <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between">
        <Button
          variant="link"
          className="p-0 h-auto text-[10px] font-bold text-blue-600 uppercase"
          onClick={() => {
            const now = new Date();
            setMiniDate(now);
            onSelect(now);
          }}
        >
          Go to Today
        </Button>
        <div className="flex items-center gap-1.5">
          <div className="w-1.5 h-1.5 rounded-full bg-blue-500" />
          <span className="text-[10px] font-bold text-slate-400 uppercase">Meetings</span>
        </div>
      </div>
    </div>
  );
}

// ── EXPORT HELPER ────────────────────────────────────────────────
function exportMeetingsCSV(meetings: Meeting[]) {
  const headers = [
    'Date', 'Start Time', 'End Time', 'Client Name', 'Company',
    'Email', 'Mobile', 'Type', 'Venue Area', 'Venue',
    'Agenda', 'BCL Attendee', 'Status'
  ];
  const rows = meetings.map(m => [
    m.meeting_date, m.meeting_start_time, m.meeting_end_time,
    m.client_name, m.client_company, m.client_email ?? '',
    m.client_mobile ?? '', m.meeting_type, m.meeting_venue_area,
    m.meeting_venue ?? '', m.meeting_agenda, m.bcl_attendee, m.status ?? ''
  ]);
  const csv = [headers, ...rows]
    .map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(','))
    .join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `meetings-${format(new Date(), 'yyyy-MM-dd')}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

const STATUS_CONFIG: Record<string, {
  label: string;
  bg: string;
  text: string;
  border: string;
  dot: string;
  icon: React.ElementType;
}> = {
  upcoming: {
    label: 'Upcoming',
    bg: 'bg-blue-50',
    text: 'text-blue-700',
    border: 'border-blue-200',
    dot: 'bg-blue-500',
    icon: CalendarClock,
  },
  rescheduled: {
    label: 'Rescheduled',
    bg: 'bg-violet-50',
    text: 'text-violet-700',
    border: 'border-violet-200',
    dot: 'bg-violet-500',
    icon: RefreshCw,
  },
  pending: {
    label: 'Pending Review',
    bg: 'bg-amber-50',
    text: 'text-amber-700',
    border: 'border-amber-200',
    dot: 'bg-amber-500',
    icon: Timer,
  },
  confirmed: {
    label: 'Confirmed',
    bg: 'bg-emerald-50',
    text: 'text-emerald-700',
    border: 'border-emerald-200',
    dot: 'bg-emerald-500',
    icon: CheckCircle2,
  },
  completed: {
    label: 'Completed',
    bg: 'bg-slate-100',
    text: 'text-slate-700',
    border: 'border-slate-200',
    dot: 'bg-slate-500',
    icon: CheckCircle,
  },
  canceled: {
    label: 'Cancelled',
    bg: 'bg-red-50',
    text: 'text-red-700',
    border: 'border-red-200',
    dot: 'bg-red-500',
    icon: XCircle,
  },
  cancelled: {
    label: 'Cancelled',
    bg: 'bg-red-50',
    text: 'text-red-700',
    border: 'border-red-200',
    dot: 'bg-red-500',
    icon: XCircle,
  },
};

function getStatusCfg(status: string) {
  return STATUS_CONFIG[status?.toLowerCase()] ?? STATUS_CONFIG.upcoming;
}

// ── MAIN COMPONENT ───────────────────────────────────────────────
const CalendarView = () => {
  const { toast } = useToast();
  const router = useRouter();
  const [currentDate, setCurrentDate] = useState<Date>(new Date());
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [allMeetings, setAllMeetings] = useState<Meeting[]>([]);
  const [allEvents, setAllEvents] = useState<BclEvent[]>([]);
  const [contentType, setContentType] = useState<ContentFilter>('meetings');
  const [loading, setLoading] = useState(true);
  const [selectedMeeting, setSelectedMeeting] = useState<any>(null);
  const [deletingMeeting, setDeletingMeeting] = useState<Meeting | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [view, setView] = useState<ViewType>('week');
  const [bclUsersById, setBclUsersById] = useState<Record<string, any>>({});

  const fetchMeetings = useCallback(async () => {
    setLoading(true);
    try {
      const [mtgRes, evsRes, bclUsersRes] = await Promise.all([
        supabase.from('bcl_meetings_meetings').select('*')
          .order('meeting_date', { ascending: true })
          .order('meeting_start_time', { ascending: true }),
        supabase.from('bcl_events').select('*')
          .order('event_date', { ascending: true })
          .order('event_start_time', { ascending: true }),
        fetch('/api/users/bcl-attendees')
      ]);

      if (mtgRes.error) throw mtgRes.error;
      if (evsRes.error) throw evsRes.error;

      if (mtgRes.data) setAllMeetings(mtgRes.data as Meeting[]);
      if (evsRes.data) setAllEvents(evsRes.data as BclEvent[]);
      if (bclUsersRes.ok) {
        const users = await bclUsersRes.json();
        setBclUsersById(buildUserMap(Array.isArray(users) ? users : []));
      }
    } catch (e: any) {
      toast({ title: 'Error fetching calendar data', description: e.message, variant: 'destructive' });
    } finally { setLoading(false); }
  }, [toast]);

  const deleteMeeting = async () => {
    if (!deletingMeeting) return;
    setIsDeleting(true);
    try {
      const { error } = await supabase.from('bcl_meetings_meetings').delete().eq('id_main', deletingMeeting.id_main);
      if (error) throw error;
      setAllMeetings(prev => prev.filter(m => m.id_main !== deletingMeeting.id_main));
      setSelectedMeeting(null); setDeletingMeeting(null);
      toast({ title: 'Meeting Deleted', description: `Booking for ${deletingMeeting.client_name} removed.` });
    } catch (e: any) {
      toast({ title: 'Error', description: e.message, variant: 'destructive' });
    } finally { setIsDeleting(false); }
  };

  useEffect(() => {
    fetchMeetings();
    const chMtg = supabase.channel('mtg').on('postgres_changes', { event: '*', schema: 'public', table: 'bcl_meetings_meetings' }, fetchMeetings).subscribe();
    const chEvt = supabase.channel('evt').on('postgres_changes', { event: '*', schema: 'public', table: 'bcl_events' }, fetchMeetings).subscribe();
    return () => {
      supabase.removeChannel(chMtg);
      supabase.removeChannel(chEvt);
    };
  }, [fetchMeetings]);

  const nav = (dir: 1 | -1) => {
    if (view === 'month') setCurrentDate(addMonths(currentDate, dir));
    else if (view === 'week') setCurrentDate(addWeeks(currentDate, dir));
    else setCurrentDate(addDays(currentDate, dir));
  };

  const visibleItems = useMemo(() => {
    const meetings = (contentType === 'meetings' || contentType === 'all')
      ? allMeetings.map(m => ({ ...m, _kind: 'meeting' as const }))
      : [];
    const events = (contentType === 'events' || contentType === 'all')
      ? allEvents.map(e => ({ ...e, _kind: 'event' as const }))
      : [];
    return [...meetings, ...events];
  }, [allMeetings, allEvents, contentType]);

  const daysWithMeetings = useMemo(() => {
    const dates = visibleItems.map(item => item._kind === 'meeting' ? item.meeting_date : item.event_date);
    return Array.from(new Set(dates)).map(d => safeParseDate(d)).filter(Boolean) as Date[];
  }, [visibleItems]);

  const calendarDays = useMemo(() => {
    const ms = startOfMonth(currentDate);
    const cs = startOfWeek(ms, { weekStartsOn: 0 });
    return Array.from({ length: 42 }, (_, i) => addDays(cs, i));
  }, [currentDate]);

  const weekDays = useMemo(() => {
    const ws = startOfWeek(currentDate, { weekStartsOn: 0 });
    return Array.from({ length: 7 }, (_, i) => addDays(ws, i));
  }, [currentDate]);

  const todayMeetings = useMemo(() => {
    const t = format(new Date(), 'yyyy-MM-dd');
    return visibleItems.filter(item => {
      const date = item._kind === 'meeting' ? item.meeting_date : item.event_date;
      return date === t;
    });
  }, [visibleItems]);

  const headerLabel = useMemo(() => {
    if (view === 'week') {
      const ws = startOfWeek(currentDate, { weekStartsOn: 0 });
      const we = addDays(ws, 6);
      return ws.getMonth() === we.getMonth()
        ? `${format(ws, 'dd/MM')} – ${format(we, 'dd/MM/yyyy')}`
        : `${format(ws, 'dd/MM')} – ${format(we, 'dd/MM/yyyy')}`;
    }
    if (view === 'day') return format(currentDate, 'EEEE, dd/MM/yyyy');
    return format(currentDate, 'MMMM yyyy');
  }, [currentDate, view]);

  // ── MONTH VIEW ──────────────────────────────────────────────────
  const renderMonthView = () => (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div className="month-dow-header">
        {DAY_NAMES.map(d => <div key={d} className="month-dow-cell">{d}</div>)}
      </div>
      <div className="month-grid" style={{ flex: 1 }}>
        {calendarDays.map((day, idx) => {
          const ds = format(day, 'yyyy-MM-dd');
          const dm = visibleItems.filter(item => {
            const date = item._kind === 'meeting' ? item.meeting_date : item.event_date;
            return date === ds;
          });
          const isCur = day.getMonth() === currentDate.getMonth();
          const isSel = isSameDay(day, selectedDate);
          const isNow = dateFnsIsToday(day);
          return (
            <div key={idx} className={cn('month-cell', !isCur && 'other-month', isSel && 'selected')}
              onClick={() => { setSelectedDate(day); setCurrentDate(day); }}>
              <div className={cn('month-day-num', isNow && 'today')}>{format(day, 'd')}</div>
              {dm.slice(0, 3).map(item => {
                const isMtg = item._kind === 'meeting';
                const key = isMtg ? `m-${item.id_main}` : `e-${item.id}`;
                const borderTopColor = isMtg ? getMeetingStatusHex(item.status || item.meeting_type) : getEventTypeConfig(item.event_type).bg;
                const backgroundColor = isMtg ? getLightStatusColor(item.status || item.meeting_type) : getEventTypeConfig(item.event_type).light;
                const startTime = isMtg ? item.meeting_start_time : item.event_start_time;
                const title = isMtg ? item.client_name : item.event_name;

                return (
                  <div key={key}
                    className="month-event event-card-base"
                    style={{
                      borderTopColor,
                      backgroundColor,
                      flexDirection: 'row',
                      alignItems: 'center',
                      gap: 3,
                    }}
                    onClick={e => { e.stopPropagation(); setSelectedMeeting(item); }}>
                    {isMtg ? (
                      item.meeting_type === 'virtual'
                        ? <Video size={8} style={{ flexShrink: 0, opacity: 0.55 }} />
                        : <MapPin size={8} style={{ flexShrink: 0, opacity: 0.55 }} />
                    ) : (
                      <EvTypeIconUtil type={item.event_type} size={8} />
                    )}
                    <span style={{ fontSize: 9, fontWeight: 600, flexShrink: 0, opacity: 0.75, color: '#64868c' }}>
                      {startTime?.slice(0, 5)}
                    </span>
                    <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontWeight: 700, fontSize: 10 }}>
                      {title}
                    </span>
                  </div>
                );
              })}
              {dm.length > 3 && (
                <div style={{ fontSize: 10, fontWeight: 700, color: '#8ca4a8', padding: '1px 2px' }}>
                  +{dm.length - 3} more
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );

  // ── WEEK VIEW ───────────────────────────────────────────────────
  const renderWeekView = () => (
    <div className="week-layout" style={{ overflow: 'hidden', height: '100%' }}>
      <div className="week-time-col">
        <div className="week-time-header" />
        <div style={{ overflowY: 'hidden' }}>
          {TIME_SLOTS.map(t => (
            <div key={t} className="week-time-slot">
              <span className="week-time-label">{t}</span>
            </div>
          ))}
        </div>
      </div>
      <div className="week-days-scroll" style={{ overflowY: 'auto' }}>
        {weekDays.map(day => {
          const isNow = dateFnsIsToday(day);
          const ds = format(day, 'yyyy-MM-dd');
          const dm = visibleItems.filter(item => {
            const date = item._kind === 'meeting' ? item.meeting_date : item.event_date;
            return date === ds;
          });
          return (
            <div key={day.toString()} className="week-day-col">
              <div className={cn('week-day-header', isNow && 'today-col')}>
                <span className="week-dow">{format(day, 'EEE')}</span>
                <div className={cn('week-date', isNow && 'today')}>{format(day, 'd')}</div>
              </div>
              <div style={{ position: 'relative' }}>
                {TIME_SLOTS.map((_, i) => <div key={i} className="week-grid-row" />)}
                {dm.map(item => {
                  const isMtg = item._kind === 'meeting';
                  const key = isMtg ? `m-${item.id_main}` : `e-${item.id}`;
                  const startTime = isMtg ? item.meeting_start_time : item.event_start_time;
                  const endTime = isMtg ? item.meeting_end_time : item.event_end_time;
                  const title = isMtg ? item.client_name : item.event_name;
                  const borderTopColor = isMtg ? getMeetingStatusHex(item.status || item.meeting_type) : getEventTypeConfig(item.event_type).bg;
                  const backgroundColor = isMtg ? getLightStatusColor(item.status || item.meeting_type) : getEventTypeConfig(item.event_type).light;

                  const sh = parseInt(startTime.split(':')[0]);
                  const sm = parseInt(startTime.split(':')[1]);
                  const eh = endTime ? parseInt(endTime.split(':')[0]) : sh + 1;
                  const em = endTime ? parseInt(endTime.split(':')[1]) : 0;
                  const top = (sh - 7) * 72 + (sm / 60) * 72;
                  const height = Math.max(((eh * 60 + em) - (sh * 60 + sm)) / 60 * 72, 36);

                  return (
                    <div key={key}
                      className="week-event event-card-base"
                      style={{
                        top, height,
                        borderTopColor,
                        backgroundColor
                      }}
                      onClick={() => setSelectedMeeting(item)}>
                      <div className="event-title">{title}</div>
                      <div className="event-subtitle" style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
                        <Clock size={8} style={{ flexShrink: 0, opacity: 0.7 }} />
                        {startTime?.slice(0, 5)} – {endTime?.slice(0, 5)}
                      </div>
                      {height > 54 && (isMtg ? item.meeting_agenda : item.event_description) && (
                        <div style={{ fontSize: 10, color: '#64868c', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginTop: 1 }}>
                          {isMtg ? item.meeting_agenda : item.event_description}
                        </div>
                      )}
                      {height > 72 && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 3, marginTop: 2 }}>
                          {isMtg ? (
                            item.meeting_type === 'virtual'
                              ? <Video size={9} style={{ flexShrink: 0, opacity: 0.6 }} />
                              : <MapPin size={9} style={{ flexShrink: 0, opacity: 0.6 }} />
                          ) : (
                            <EvTypeIconUtil type={item.event_type} size={9} />
                          )}
                          <span style={{ fontSize: 9, color: '#64868c', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {isMtg ? (item.meeting_venue_area || item.meeting_type) : (item.event_venue_area || item.event_type)}
                          </span>
                        </div>
                      )}
                      {height > 60 && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginTop: 'auto' }}>
                          <div className="event-avatar-mini" style={{ background: borderTopColor, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontSize: '8px', borderRadius: 4 }}>
                            {initials(isMtg ? item.client_name : (item.organizer_name || item.event_name))}
                          </div>
                          <span style={{ fontSize: 9, fontWeight: 700, color: borderTopColor, textTransform: 'capitalize' }}>
                            {isMtg ? getLabel(item) : (getEventTypeConfig(item.event_type).label)}
                          </span>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );

  // ── DAY VIEW ────────────────────────────────────────────────────
  const renderDayView = () => {
    const formattedDate = format(currentDate, 'yyyy-MM-dd');
    const dm = visibleItems.filter(item => {
      const date = item._kind === 'meeting' ? item.meeting_date : item.event_date;
      return date === formattedDate;
    });
    const isNow = dateFnsIsToday(currentDate);
    return (
      <div className="day-layout" style={{ height: '100%' }}>
        <div className="day-time-col">
          <div className="day-time-header" />
          {TIME_SLOTS.map(t => (
            <div key={t} className="week-time-slot">
              <span className="week-time-label">{t}</span>
            </div>
          ))}
        </div>
        <div className="day-content">
          <div className="day-header-strip">
            <div className={cn('day-big-num', isNow ? 'today' : 'not-today')}>
              {format(currentDate, 'd')}
            </div>
            <div>
              <div style={{ fontSize: 13, fontWeight: 700, color: '#1d4ed8' }}>{format(currentDate, 'EEEE, dd/MM/yyyy')}</div>
              <div style={{ fontSize: 11, color: '#8ca4a8' }}>{dm.length} schedule item{dm.length !== 1 ? 's' : ''}</div>
            </div>
          </div>
          {TIME_SLOTS.map((_, i) => <div key={i} className="day-grid-row" />)}
          {dm.map(item => {
            const isMtg = item._kind === 'meeting';
            const key = isMtg ? `m-${item.id_main}` : `e-${item.id}`;
            const startTime = isMtg ? item.meeting_start_time : item.event_start_time;
            const endTime = isMtg ? item.meeting_end_time : item.event_end_time;
            const title = isMtg ? item.client_name : item.event_name;
            const borderTopColor = isMtg ? getMeetingStatusHex(item.status || item.meeting_type) : getEventTypeConfig(item.event_type).bg;
            const backgroundColor = isMtg ? getLightStatusColor(item.status || item.meeting_type) : getEventTypeConfig(item.event_type).light;

            const sh = parseInt(startTime.split(':')[0]);
            const sm2 = parseInt(startTime.split(':')[1]);
            const eh = endTime ? parseInt(endTime.split(':')[0]) : sh + 1;
            const em = endTime ? parseInt(endTime.split(':')[1]) : 0;
            const top = 56 + (sh - 7) * 96 + (sm2 / 60) * 96;
            const height = Math.max(((eh * 60 + em) - (sh * 60 + sm2)) / 60 * 96, 68);
            const durationMin = (eh * 60 + em) - (sh * 60 + sm2);
            return (
              <div key={key}
                className="day-event event-card-base"
                style={{
                  top, height,
                  borderTopColor,
                  backgroundColor
                }}
                onClick={() => setSelectedMeeting(item)}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div className="event-title" style={{ fontSize: 13, fontWeight: 800 }}>{title}</div>
                    {(isMtg ? item.client_company : item.organizer_name) && (
                      <div style={{ fontSize: 11, color: '#64868c', fontWeight: 500, marginTop: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {isMtg ? item.client_company : (item.organizer_company || item.organizer_name)}
                      </div>
                    )}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 4, flexWrap: 'wrap' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
                        <Clock size={10} style={{ color: '#8ca4a8', flexShrink: 0 }} />
                        <span style={{ fontSize: 10, color: '#64868c', fontWeight: 500 }}>{startTime?.slice(0, 5)} – {endTime?.slice(0, 5)}</span>
                      </div>
                      {durationMin > 0 && (
                        <span style={{ fontSize: 9, fontWeight: 700, color: '#8ca4a8' }}>{durationMin}m</span>
                      )}
                    </div>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4, flexShrink: 0 }}>
                    <div style={{ width: 28, height: 28, borderRadius: 7, background: borderTopColor, display: 'flex', alignItems: 'center', justify: 'center', color: 'white', fontSize: 10, fontWeight: 700 }}>
                      {initials(isMtg ? item.client_name : (item.organizer_name || item.event_name))}
                    </div>
                    <span style={{ fontSize: 9, fontWeight: 700, padding: '2px 6px', borderRadius: 4, backgroundColor: borderTopColor + '15', color: borderTopColor, border: `1px solid ${borderTopColor}40`, textTransform: 'capitalize' }}>
                      {isMtg ? getLabel(item) : (getEventTypeConfig(item.event_type).label)}
                    </span>
                  </div>
                </div>
                {height > 100 && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginTop: 8 }}>
                    {isMtg ? (
                      item.meeting_type === 'virtual'
                        ? <Video size={10} style={{ color: '#7c3aed', flexShrink: 0 }} />
                        : <MapPin size={10} style={{ color: '#0284c7', flexShrink: 0 }} />
                    ) : (
                      <EvTypeIconUtil type={item.event_type} size={10} />
                    )}
                    <span style={{ fontSize: 11, color: '#64868c' }}>
                      {isMtg ? (item.meeting_venue_area || (item.meeting_type === 'virtual' ? 'Virtual Meeting' : 'Physical Meeting')) : (item.event_venue_area || 'Physical Event')}
                    </span>
                  </div>
                )}
                {height > 132 && (isMtg ? item.meeting_agenda : item.event_description) && (
                  <div style={{ marginTop: 6, fontSize: 11, color: '#64868c', lineHeight: 1.4, overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
                    {isMtg ? item.meeting_agenda : item.event_description}
                  </div>
                )}
                {height > 164 && (isMtg ? item.bcl_attendee : item.expected_attendees != null) && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginTop: 6 }}>
                    <Users size={10} style={{ color: '#8ca4a8', flexShrink: 0 }} />
                    <span style={{ fontSize: 10, color: '#8ca4a8' }}>
                      {isMtg
                        ? (getAttendeeDetails(item, bclUsersById)[0]?.name || '—')
                        : `${item.expected_attendees} Expected Guests`}
                    </span>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  // ── DETAIL PANEL ─────────────────────────────────────────────────
  const SectionLabel = ({ children, icon: Icon }: { children: React.ReactNode, icon: any }) => (
    <div className="flex items-center gap-2 mb-3 mt-6 first:mt-0">
      <Icon size={14} className="text-slate-400" />
      <span className="text-[10px] font-black uppercase tracking-[0.15em] text-slate-400">
        {children}
      </span>
    </div>
  );

  const renderDetail = () => {
    if (!selectedMeeting) {
      return (
        <div className="h-full flex flex-col bg-white border-l border-slate-200">
          <div className="p-6 border-b border-slate-100 flex items-center justify-between">
            <h2 className="text-sm font-black text-slate-900 uppercase tracking-tight">Details</h2>
          </div>
          <div className="flex-1 flex flex-col items-center justify-center p-10 text-center">
            <div className="w-20 h-20 bg-slate-50 rounded-3xl flex items-center justify-center mb-6 border border-slate-100 shadow-inner">
              <CalendarDays size={32} className="text-slate-300" />
            </div>
            <h3 className="text-xl font-black text-slate-900 mb-2">No Item Selected</h3>
            <p className="text-sm text-slate-500 font-medium leading-relaxed max-w-[240px]">
              Click any meeting or event on the calendar to see full insights.
            </p>
          </div>
        </div>
      );
    }

    const item = selectedMeeting;
    const isMtg = item._kind === 'meeting';

    // Dynamic mapping based on previous logic
    const title = isMtg ? item.client_name : item.event_name;
    const subtitle = isMtg ? item.client_company : (item.organizer_name || 'Event Organizer');
    const dateStr = isMtg ? item.meeting_date : item.event_date;
    const description = isMtg ? item.meeting_agenda : item.event_description;

    // Use status colors established in previous dashboard step
    const statusCfg = isMtg ? getStatusCfg(item.status) : { bg: 'bg-indigo-600', text: 'text-white' };

    return (
      <div className="h-full flex flex-col bg-white border-l border-slate-200 shadow-2xl relative">
        {/* ── HEADER ── */}
        <div className={cn(
          "p-8 text-white relative overflow-hidden",
          isMtg ? "bg-[#061D43]" : "bg-indigo-950"
        )}>
          {/* Decorative Shine */}
          <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full -mr-32 -mt-32 blur-3xl" />

          <div className="relative z-10">
            <div className="flex items-center justify-between mb-6">
              <Badge className={cn("px-3 py-1 font-bold border-0 shadow-lg", isMtg ? "bg-blue-600" : "bg-indigo-600")}>
                {isMtg ? (item.status || 'Upcoming') : (item.event_type || 'Event')}
              </Badge>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 rounded-full bg-white/10 hover:bg-white/20 text-white border-0"
                onClick={() => setSelectedMeeting(null)}
              >
                <X size={16} />
              </Button>
            </div>

            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-2xl bg-white flex items-center justify-center text-blue-700 text-xl font-black shadow-xl">
                {initials(isMtg ? item.client_name : (item.organizer_name || item.event_name))}
              </div>
              <div className="flex-1 min-w-0">
                <h2 className="text-xl font-black tracking-tight truncate leading-tight">{title}</h2>
                <p className="text-white/60 text-xs font-bold uppercase tracking-widest mt-1 flex items-center gap-1.5">
                  <Building size={12} className="opacity-50" /> {subtitle || 'Independent'}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* ── BODY ── */}
        <ScrollArea className="flex-1">
          <div className="p-8 space-y-8">

            {/* Schedule Grid */}
            <section>
              <SectionLabel icon={Clock}>Schedule</SectionLabel>
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-slate-50 border border-slate-100 p-3 rounded-xl">
                  <p className="text-[9px] font-black text-slate-400 uppercase mb-1">Date</p>
                  <p className="text-xs font-bold text-slate-800">
                    {formatSafeDate(dateStr, 'dd/MM/yyyy')}
                  </p>
                </div>
                <div className="bg-slate-50 border border-slate-100 p-3 rounded-xl">
                  <p className="text-[9px] font-black text-slate-400 uppercase mb-1">Time</p>
                  <p className="text-xs font-bold text-slate-800">
                    {isMtg ? `${item.meeting_start_time?.slice(0, 5)} - ${item.meeting_end_time?.slice(0, 5)}` : '—'}
                  </p>
                </div>
              </div>
            </section>

            {/* Logistics */}
            <section>
              <SectionLabel icon={MapPinned}>Logistics</SectionLabel>
              <div className="flex items-start gap-4 p-4 rounded-2xl bg-blue-50/50 border border-blue-100/50">
                <div className="w-10 h-10 rounded-xl bg-white border border-blue-100 flex items-center justify-center shadow-sm flex-shrink-0">
                  {isMtg && item.meeting_type === 'virtual' ? (
                    <Video size={18} className="text-blue-600" />
                  ) : (
                    <MapPin size={18} className="text-blue-600" />
                  )}
                </div>
                <div>
                  <p className="text-xs font-black text-blue-900 capitalize">
                    {isMtg ? item.meeting_type : (item.event_type || 'In-Person')}
                  </p>
                  <p className="text-xs font-bold text-blue-600/70 mt-0.5">
                    {isMtg ? item.meeting_venue_area : item.event_venue_area || 'Standard Venue'}
                  </p>
                  {(isMtg ? item.meeting_venue : item.event_venue) && (
                    <p className="text-[10px] text-slate-400 mt-1 italic">
                      {isMtg ? item.meeting_venue : item.event_venue}
                    </p>
                  )}
                </div>
              </div>
            </section>

            {/* Agenda / Description */}
            {description && (
              <section>
                <SectionLabel icon={ClipboardList}>{isMtg ? 'Agenda' : 'Event Info'}</SectionLabel>
                <div className="bg-slate-50 border border-slate-100 rounded-2xl p-5">
                  <p className="text-sm text-slate-600 leading-relaxed font-medium">
                    {description}
                  </p>
                </div>
              </section>
            )}

            {/* Contact Details */}
            <section>
              <SectionLabel icon={Info}>Primary Contact</SectionLabel>
              <div className="space-y-2">
                {((isMtg ? item.client_email : item.organizer_email)) && (
                  <a
                    href={`mailto:${isMtg ? item.client_email : item.organizer_email}`}
                    className="flex items-center gap-3 p-3 rounded-xl border border-slate-100 hover:bg-slate-50 transition-colors"
                  >
                    <div className="w-8 h-8 rounded-lg bg-indigo-50 flex items-center justify-center text-indigo-600">
                      <Mail size={14} />
                    </div>
                    <span className="text-xs font-bold text-slate-700 truncate">
                      {isMtg ? item.client_email : item.organizer_email}
                    </span>
                  </a>
                )}
                {((isMtg ? item.client_mobile : item.organizer_mobile)) && (
                  <a
                    href={`tel:${isMtg ? item.client_mobile : item.organizer_mobile}`}
                    className="flex items-center gap-3 p-3 rounded-xl border border-slate-100 hover:bg-slate-50 transition-colors"
                  >
                    <div className="w-8 h-8 rounded-lg bg-emerald-50 flex items-center justify-center text-emerald-600">
                      <Phone size={14} />
                    </div>
                    <span className="text-xs font-bold text-slate-700">
                      {isMtg ? item.client_mobile : item.organizer_mobile}
                    </span>
                  </a>
                )}
              </div>
            </section>

            {/* BCL Attendees — meetings only */}
            {isMtg && (() => {
              const attendees = getAttendeeDetails(item, bclUsersById);
              if (!attendees.length) return null;
              return (
                <section>
                  <SectionLabel icon={Users}>BCL Attendees</SectionLabel>
                  <div className="space-y-2">
                    {attendees.map((att, i) => (
                      <div key={att.id || i} className="flex items-center gap-3 p-3 rounded-xl border border-slate-100 bg-slate-50">
                        <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center text-blue-700 text-[10px] font-black flex-shrink-0">
                          {initials(att.name)}
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs font-bold text-slate-800 truncate">{att.name}</p>
                          {att.email && <p className="text-[10px] text-slate-400 truncate">{att.email}</p>}
                        </div>
                      </div>
                    ))}
                  </div>
                </section>
              );
            })()}

          </div>
        </ScrollArea>

        {/* ── FOOTER ACTIONS ── */}
        <div className="p-6 bg-slate-50 border-t border-slate-100 flex gap-3">
          {isMtg ? (
            <>
              <Button
                variant="outline"
                className="w-12 h-12 rounded-xl border-slate-200 text-red-500 hover:bg-red-50 hover:text-red-600 hover:border-red-100 p-0"
                onClick={() => setDeletingMeeting(item)}
              >
                <Trash2 size={18} />
              </Button>
              {item.meeting_type === 'virtual' && item.google_meet_link ? (
                <Button
                  className="flex-1 h-12 bg-blue-600 hover:bg-blue-700 font-bold rounded-xl shadow-lg shadow-blue-100"
                  onClick={() => window.open(item.google_meet_link, '_blank')}
                >
                  <Video size={16} className="mr-2" /> Join Meeting
                </Button>
              ) : (
                <Button
                  className="flex-1 h-12 bg-blue-600 hover:bg-blue-700 font-bold rounded-xl shadow-lg shadow-blue-100"
                  onClick={() => router.push(`/schedule/edit/${item.id_main}`)}
                >
                  Edit Meeting
                </Button>
              )}
            </>
          ) : (
            <Button
              className="w-full h-12 bg-indigo-600 hover:bg-indigo-700 font-bold rounded-xl"
              onClick={() => router.push('/events')}
            >
              Manage Corporate Events
            </Button>
          )}
        </div>
      </div>
    );
  }

  // ── ROOT RENDER ──────────────────────────────────────────────────
  return (
    <div className="cal-shell">
      <CalendarStyles />

      {/* TOPBAR */}
      <div className="cal-topbar">
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{
            width: 34, height: 34, borderRadius: 9,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 3px 10px rgba(0,48,56,0.2)',
          }}>
            <CalendarDays size={17} color="#1d4ed8" />
          </div>
          <div>
            <div className="text-slate-800 text-2xl font-bold">Meeting Calendar</div>
            <div className="cal-topbar-sub">Manage your team schedule in real time</div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {/* Content type switcher */}
          <div className="cal-content-switcher">
            {([
              { id: 'meetings', label: 'Meetings', icon: Calendar },
              { id: 'events', label: 'Events', icon: PartyPopper },
              { id: 'all', label: 'All', icon: Users },
            ] as const).map(({ id, label, icon: Icon }) => (
              <Button key={id} className={cn('cal-content-btn h-auto', contentType === id && `active ct-${id}`)}
                onClick={() => { setContentType(id); setSelectedMeeting(null); }}>
                <Icon size={13} /> {label}
              </Button>
            ))}
          </div>
          <div className="cal-view-pill">
            {(['month', 'week', 'day'] as ViewType[]).map(v => (
              <Button key={v} className={cn('cal-view-btn', view === v && 'active')} onClick={() => setView(v)}>{v}</Button>
            ))}
          </div>
          <Button className="cal-export-btn" onClick={() => exportMeetingsCSV(allMeetings)}>
            <Download size={13} /> Export CSV
          </Button>
          <Button className="cal-add-btn" onClick={() => router.push('/schedule')}>
            <PlusCircle size={14} /> Add Meeting
          </Button>
        </div>
      </div>

      {/* BODY */}
      <div className="cal-body">

        {/* LEFT SIDEBAR */}
        <div className="cal-aside">
          {/* mini calendar panel */}
          <div className="cal-panel">
            <MiniCalendar
              currentDate={currentDate}
              selectedDate={selectedDate}
              onSelect={(d) => { setSelectedDate(d); setCurrentDate(d); }}
              daysWithMeetings={daysWithMeetings}
            />
          </div>

          {/* Today's meetings panel */}
          <div className="cal-panel" style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
            <div className="cal-panel-header">Today&apos;s Schedule</div>
            <div style={{ flex: 1, overflowY: 'auto' }}>
              {todayMeetings.length === 0 ? (
                <div style={{ padding: '16px 14px', textAlign: 'center' }}>
                  <div style={{
                    width: 40, height: 40, borderRadius: 10,
                    background: '#f0f4f5', margin: '0 auto 8px',
                    display: 'flex', alignItems: 'center', justifyContent: 'center'
                  }}>
                    <Calendar size={18} style={{ color: '#8ca4a8' }} />
                  </div>
                  <div style={{ fontSize: 12, fontWeight: 600, color: '#64868c' }}>No items today</div>
                </div>
              ) : todayMeetings.map(item => {
                const isMtg = item._kind === 'meeting';
                const key = isMtg ? `m-${item.id_main}` : `e-${item.id}`;
                const color = isMtg ? getMeetingStatusHex(item.status || item.meeting_type) : getEventTypeConfig(item.event_type).bg;
                const name = isMtg ? item.client_name : item.event_name;
                const meta = isMtg
                  ? `${item.meeting_start_time?.slice(0, 5)} · ${item.client_company}`
                  : `${item.event_start_time?.slice(0, 5)} · ${getEventTypeConfig(item.event_type).label}`;
                return (
                  <div key={key} className="today-item" onClick={() => setSelectedMeeting(item)}>
                    <div className="today-dot" style={{ background: color }} />
                    <div>
                      <div className="today-name">{name}</div>
                      <div className="today-meta">{meta}</div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* MAIN CALENDAR */}
        <div className="cal-main">
          {/* nav */}
          <div className="cal-nav">
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <Button className="cal-nav-btn" onClick={() => nav(-1)}><ChevronLeft size={15} /></Button>
              <span className="text-slate-800 font-bold text-lg">{headerLabel}</span>
              <Button className="cal-nav-btn" onClick={() => nav(1)}><ChevronRight size={15} /></Button>
            </div>
            <Button className="cal-today-btn" onClick={() => { setCurrentDate(new Date()); setSelectedDate(new Date()); }}>
              Today
            </Button>
          </div>

          {/* calendar body */}
          <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
            {loading ? (
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 10 }}>
                <div style={{
                  width: 44, height: 44, borderRadius: 12,
                  background: 'linear-gradient(135deg, #1d4ed8, #00505e)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <Loader2 size={20} color="#00d1d1" className="animate-spin" />
                </div>
                <span style={{ fontSize: 12, color: '#8ca4a8', fontWeight: 500 }}>Loading meetings…</span>
              </div>
            ) : (
              <>
                {view === 'month' && renderMonthView()}
                {view === 'week' && renderWeekView()}
                {view === 'day' && renderDayView()}
              </>
            )}
          </div>
        </div>

        {/* RIGHT DETAIL PANEL — always visible */}
        {renderDetail()}
      </div>

      {/* DELETE DIALOG */}
      <AlertDialog open={!!deletingMeeting} onOpenChange={o => !o && setDeletingMeeting(null)}>
        <AlertDialogContent style={{ borderRadius: 16, border: 'none', padding: 28, maxWidth: 380, boxShadow: '0 20px 60px rgba(0,0,0,0.15)' }}>
          <AlertDialogHeader>
            <div style={{
              width: 48, height: 48, borderRadius: 12,
              background: 'linear-gradient(135deg, #ef4444, #dc2626)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              marginBottom: 12, boxShadow: '0 4px 14px rgba(239,68,68,0.3)',
            }}>
              <Trash2 size={20} color="#fff" />
            </div>
            <AlertDialogTitle style={{ fontSize: 17, fontWeight: 800, color: '#1d4ed8', fontFamily: 'Inter, sans-serif' }}>
              Remove this meeting?
            </AlertDialogTitle>
            <AlertDialogDescription style={{ color: '#64868c', fontSize: 13, fontFamily: 'Inter, sans-serif' }}>
              This will permanently remove the meeting for{' '}
              <strong style={{ color: '#1d4ed8' }}>{deletingMeeting?.client_name}</strong>.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter style={{ marginTop: 20, gap: 8 }}>
            <AlertDialogCancel style={{
              borderRadius: 8, height: 38, fontWeight: 700, border: '1px solid #eef2f3',
              background: '#f7fafa', color: '#1d4ed8', fontSize: 13, fontFamily: 'Inter, sans-serif', flex: 1,
            }}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={deleteMeeting} disabled={isDeleting} style={{
              borderRadius: 8, height: 38, fontWeight: 700,
              background: 'linear-gradient(135deg, #ef4444, #dc2626)',
              color: '#fff', fontSize: 13, fontFamily: 'Inter, sans-serif', flex: 1, border: 'none',
              boxShadow: '0 3px 10px rgba(239,68,68,0.3)',
            }}>
              {isDeleting ? <Loader2 size={15} className="animate-spin" /> : 'Delete Permanently'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default CalendarView;