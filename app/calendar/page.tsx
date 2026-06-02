// @ts-nocheck
"use client";

import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useRouter } from 'next/navigation';
import {
  format, startOfMonth, startOfWeek, isSameDay, parseISO,
  addDays, addMonths, addWeeks, isToday as dateFnsIsToday
} from 'date-fns';
import {
  ChevronLeft, ChevronRight, Trash2, Loader2, Video,
  MapPin, Phone, Mail, PlusCircle, X, Download,
  CalendarDays, Calendar, Users, Clock, AlertCircle,
  CheckCircle2, XCircle, Sparkles, PartyPopper, Heart,
  DollarSign, Cpu, Gift, Star, BookOpen, Hammer,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel,
  AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle
} from "@/components/ui/alert-dialog";
import { useToast } from '@/hooks/use-toast';
import { cn } from "@/lib/utils";
import supabase from '@/utils/supabaseClient';
import {
  getStatusGradient,
  getStatusColor,
  getStatusBadgeClasses
} from '@/utils/meetingStatusColors';
import { Tabs } from '@/components/ui/tabs';

// ── TYPES ────────────────────────────────────────────────────────
interface Meeting {
  id_main: number;
  meeting_date: string;
  meeting_start_time: string;
  meeting_end_time: string;
  meeting_duration?: number;
  client_name: string;
  client_company: string;
  client_email?: string;
  client_mobile?: string;
  meeting_type: 'virtual' | 'physical';
  meeting_venue_area: string;
  meeting_venue?: string;
  meeting_agenda: string;
  bcl_attendee: string;
  bcl_attendee_mobile?: string;
  status?: string;
  badge_status?: string;
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

const EVENT_TYPE_COLORS: Record<string, { bg: string; light: string; gradient: string }> = {
  wedding: { bg: '#ec4899', light: '#fdf2f8', gradient: 'linear-gradient(135deg,#ec4899,#db2777)' },
  fundraiser: { bg: '#f97316', light: '#fff7ed', gradient: 'linear-gradient(135deg,#f97316,#ea580c)' },
  tech_event: { bg: '#8b5cf6', light: '#f5f3ff', gradient: 'linear-gradient(135deg,#8b5cf6,#7c3aed)' },
  conference: { bg: '#3b82f6', light: '#eff6ff', gradient: 'linear-gradient(135deg,#3b82f6,#2563eb)' },
  birthday: { bg: '#f59e0b', light: '#fffbeb', gradient: 'linear-gradient(135deg,#f59e0b,#d97706)' },
  party: { bg: '#e879f9', light: '#fdf4ff', gradient: 'linear-gradient(135deg,#e879f9,#c026d3)' },
  gala: { bg: '#d97706', light: '#fffbeb', gradient: 'linear-gradient(135deg,#d97706,#b45309)' },
  seminar: { bg: '#10b981', light: '#f0fdf4', gradient: 'linear-gradient(135deg,#10b981,#059669)' },
  workshop: { bg: '#06b6d4', light: '#ecfeff', gradient: 'linear-gradient(135deg,#06b6d4,#0891b2)' },
  other: { bg: '#6b7280', light: '#f9fafb', gradient: 'linear-gradient(135deg,#6b7280,#4b5563)' },
};
const getEvTypeCol = (t: string) => EVENT_TYPE_COLORS[t?.toLowerCase()] ?? EVENT_TYPE_COLORS.other;

const EVENT_TYPE_LABELS: Record<string, string> = {
  wedding: 'Wedding', fundraiser: 'Fundraiser', tech_event: 'Tech Event',
  conference: 'Conference', birthday: 'Birthday', party: 'Party',
  gala: 'Gala', seminar: 'Seminar', workshop: 'Workshop', other: 'Event',
};

const EVENT_TYPE_ICON_MAP: Record<string, any> = {
  wedding: Heart, fundraiser: DollarSign, tech_event: Cpu,
  conference: Users, birthday: Gift, party: Star,
  gala: Sparkles, seminar: BookOpen, workshop: Hammer, other: PartyPopper,
};
const EvTypeIcon = ({ type, size = 11 }: { type: string; size?: number }) => {
  const Icon = EVENT_TYPE_ICON_MAP[type?.toLowerCase()] ?? PartyPopper;
  return <Icon size={size} />;
};

const getLightStatusColor = (status: string) => {
  const s = status?.toLowerCase();
  if (s === 'completed' || s === 'active') return '#f0fdfa'; // Light Teal
  if (s === 'virtual') return '#f5f3ff'; // Light Purple
  if (s === 'physical') return '#f0f9ff'; // Light Blue
  if (s === 'cancelled') return '#fef2f2'; // Light Red
  if (s === 'pending') return '#fffbeb'; // Light Amber
  return '#f8fafc'; // Default Slate
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
const getEventColor = (m: Meeting) => getStatusColor(m.status || m.meeting_type);
const getLabel = (m: Meeting) => m.status || m.meeting_type || 'Meeting';
const initials = (n: string) => {
  if (!n || typeof n !== 'string') return '??';
  return n.split(' ').filter(Boolean).map(c => c[0]).join('').slice(0, 2).toUpperCase();
};

// ── CONSTANTS ────────────────────────────────────────────────────
const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const TIME_SLOTS = Array.from({ length: 14 }, (_, i) => `${(i + 7).toString().padStart(2, '0')}:00`);

// ── MINI CALENDAR ────────────────────────────────────────────────
function MiniCalendar({ currentDate, selectedDate, onSelect, daysWithMeetings }: {
  currentDate: Date; selectedDate: Date;
  onSelect: (d: Date) => void; daysWithMeetings: Date[];
}) {
  const [miniDate, setMiniDate] = useState(currentDate);
  const ms = startOfMonth(miniDate);
  const cs = startOfWeek(ms, { weekStartsOn: 0 });
  const days = Array.from({ length: 42 }, (_, i) => addDays(cs, i));

  return (
    <>
      <div className="mini-cal-nav">
        <Button className="mini-cal-nav-btn" onClick={() => setMiniDate(addMonths(miniDate, -1))}>
          <ChevronLeft size={12} />
        </Button>
        <span className="text-slate-800 font-bold text-lg">{format(miniDate, 'MMMM yyyy')}</span>
        <Button className="mini-cal-nav-btn" onClick={() => setMiniDate(addMonths(miniDate, 1))}>
          <ChevronRight size={12} />
        </Button>
      </div>
      <div className="mini-cal-grid">
        <div className="mini-cal-dow">
          {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((d, i) => <span key={i}>{d}</span>)}
        </div>
        <div className="mini-cal-days">
          {days.map((day, i) => {
            const isOther = day.getMonth() !== miniDate.getMonth();
            const isSel = isSameDay(day, selectedDate);
            const isNow = dateFnsIsToday(day);
            const hasMtg = !isOther && daysWithMeetings.some(d => isSameDay(d, day));
            return (
              <Button key={i} onClick={() => !isOther && onSelect(day)}
                className={cn('mini-day',
                  isOther && 'other-month',
                  isSel && 'selected',
                  !isSel && isNow && 'today',
                  hasMtg && 'has-meeting',
                )}>
                {format(day, 'd')}
              </Button>
            );
          })}
        </div>
      </div>
    </>
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

  const fetchMeetings = useCallback(async () => {
    setLoading(true);
    try {
      const [mtgRes, evsRes] = await Promise.all([
        supabase.from('bcl_meetings_meetings').select('*')
          .order('meeting_date', { ascending: true })
          .order('meeting_start_time', { ascending: true }),
        supabase.from('bcl_events').select('*')
          .order('event_date', { ascending: true })
          .order('event_start_time', { ascending: true })
      ]);

      if (mtgRes.error) throw mtgRes.error;
      if (evsRes.error) throw evsRes.error;

      if (mtgRes.data) setAllMeetings(mtgRes.data as Meeting[]);
      if (evsRes.data) setAllEvents(evsRes.data as BclEvent[]);
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
    return Array.from(new Set(dates)).map(d => parseISO(d));
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
        ? `${format(ws, 'MMM d')} – ${format(we, 'd, yyyy')}`
        : `${format(ws, 'MMM d')} – ${format(we, 'MMM d, yyyy')}`;
    }
    if (view === 'day') return format(currentDate, 'EEEE, MMMM d yyyy');
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
                const borderTopColor = isMtg ? getStatusColor(item.status || item.meeting_type) : getEvTypeCol(item.event_type).bg;
                const backgroundColor = isMtg ? getLightStatusColor(item.status || item.meeting_type) : getEvTypeCol(item.event_type).light;
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
                      <EvTypeIcon type={item.event_type} size={8} />
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
                  const borderTopColor = isMtg ? getStatusColor(item.status || item.meeting_type) : getEvTypeCol(item.event_type).bg;
                  const backgroundColor = isMtg ? getLightStatusColor(item.status || item.meeting_type) : getEvTypeCol(item.event_type).light;

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
                            <EvTypeIcon type={item.event_type} size={9} />
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
                            {isMtg ? getLabel(item) : (EVENT_TYPE_LABELS[item.event_type] ?? item.event_type)}
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
              <div style={{ fontSize: 13, fontWeight: 700, color: '#1d4ed8' }}>{format(currentDate, 'EEEE, MMMM d')}</div>
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
            const borderTopColor = isMtg ? getStatusColor(item.status || item.meeting_type) : getEvTypeCol(item.event_type).bg;
            const backgroundColor = isMtg ? getLightStatusColor(item.status || item.meeting_type) : getEvTypeCol(item.event_type).light;

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
                      {isMtg ? getLabel(item) : (EVENT_TYPE_LABELS[item.event_type] ?? item.event_type)}
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
                      <EvTypeIcon type={item.event_type} size={10} />
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
                    <span style={{ fontSize: 10, color: '#8ca4a8' }}>{isMtg ? item.bcl_attendee : `${item.expected_attendees} Expected Guests`}</span>
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
  const renderDetail = () => {
    if (!selectedMeeting) {
      return (
        <div className="cal-detail">
          <div className="cal-panel-header">Details</div>
          <div className="cal-detail-empty">
            <div className="cal-detail-icon-wrap">
              <CalendarDays size={22} style={{ color: '#8ca4a8' }} />
            </div>
            <div className="text-slate-800 text-2xl font-bold">No item selected</div>
            <div className="text-slate-400 text-sm font-semibold">Click any item on the calendar to view its details here</div>
          </div>
        </div>
      );
    }

    const item = selectedMeeting;
    const isMtg = item._kind === 'meeting';

    const gradient = isMtg
      ? getStatusGradient(item.status || item.meeting_type)
      : getEvTypeCol(item.event_type).gradient;

    const label = isMtg
      ? getLabel(item)
      : (EVENT_TYPE_LABELS[item.event_type] ?? item.event_type);

    const title = isMtg ? item.client_name : item.event_name;
    const subtitle = isMtg ? item.client_company : (item.organizer_name || 'Event Organizer');

    const dateStr = isMtg ? item.meeting_date : item.event_date;
    const startTime = isMtg ? item.meeting_start_time : item.event_start_time;
    const endTime = isMtg ? item.meeting_end_time : item.event_end_time;
    const duration = isMtg ? item.meeting_duration : item.event_duration;
    const description = isMtg ? item.meeting_agenda : item.event_description;

    return (
      <div className="cal-detail">
        {/* colored header */}
        <div className="detail-color-header" style={{ background: gradient }}>
          <div className="detail-header-shine" />
          <div className='flex-col gap-4 text-white'>
            <div style={{ display: 'flex', alignItems: 'center', justify: 'space-between', marginBottom: 10 }}>
              <span className="detail-status-pill">{label}</span>
              <Button className="detail-close" onClick={() => setSelectedMeeting(null)}><X size={12} /></Button>
            </div>
            <div className="w-12 h-12 rounded-full flex items-center justify-center font-semibold text-2xl text-[#1d4ed8] bg-white/90 mb-2">
              {initials(isMtg ? item.client_name : (item.organizer_name || item.event_name))}
            </div>
            <div className="text-xl font-bold uppercase overflow-hidden text-ellipsis whitespace-nowrap">{title}</div>
            <div className="text-xs font-semibold text-white/80 overflow-hidden text-ellipsis whitespace-nowrap">{subtitle}</div>
          </div>
        </div>

        {/* body */}
        <div className="detail-body">
          {/* date + time chips */}
          <div className="detail-section-label">Schedule</div>
          <div className="detail-chip-grid">
            <div className="detail-chip">
              <div className="detail-chip-label">Date</div>
              <div className="detail-chip-value">
                {dateStr ? format(parseISO(dateStr), 'MMM d, yyyy') : '—'}
              </div>
            </div>
            <div className="detail-chip">
              <div className="detail-chip-label">Day</div>
              <div className="detail-chip-value">
                {dateStr ? format(parseISO(dateStr), 'EEEE') : '—'}
              </div>
            </div>
            <div className="detail-chip">
              <div className="detail-chip-label">Time</div>
              <div className="detail-chip-value">{startTime?.slice(0, 5)} – {endTime?.slice(0, 5)}</div>
            </div>
            <div className="detail-chip">
              <div className="detail-chip-label">Duration</div>
              <div className="detail-chip-value">
                {duration
                  ? `${duration} min`
                  : (() => {
                    if (!startTime || !endTime) return '—';
                    const [sh, sm] = startTime.split(':').map(Number);
                    const [eh, em] = endTime.split(':').map(Number);
                    const diff = (eh * 60 + em) - (sh * 60 + sm);
                    return diff > 0 ? `${diff} min` : '—';
                  })()}
              </div>
            </div>
          </div>

          {/* logistics */}
          <div className="detail-section-label">Logistics</div>
          <div className="detail-type-row">
            <div className="detail-type-icon"
              style={{ background: isMtg ? (item.meeting_type === 'virtual' ? '#ede9fe' : '#e0f2fe') : '#ede9fe' }}>
              {isMtg ? (
                item.meeting_type === 'virtual'
                  ? <Video size={15} style={{ color: '#7c3aed' }} />
                  : <MapPin size={15} style={{ color: '#0284c7' }} />
              ) : (
                <EvTypeIcon type={item.event_type} size={15} />
              )}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: '#1d4ed8', textTransform: 'capitalize' }}>
                {isMtg ? item.meeting_type : (EVENT_TYPE_LABELS[item.event_type] ?? item.event_type)}
              </div>
              {(isMtg ? item.meeting_venue_area : item.event_venue_area) && (
                <div style={{ fontSize: 11, color: '#8ca4a8' }}>
                  {isMtg ? item.meeting_venue_area : item.event_venue_area}
                </div>
              )}
              {isMtg ? item.meeting_venue : item.event_venue && (
                <div style={{ fontSize: 10, color: '#b0c4c8', marginTop: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {isMtg ? item.meeting_venue : item.event_venue}
                </div>
              )}
            </div>
          </div>

          {/* description / agenda */}
          {description && (
            <>
              <div className="detail-section-label">{isMtg ? 'Agenda' : 'Description'}</div>
              <div className="detail-agenda">{description}</div>
            </>
          )}

          {/* attendee / organizer */}
          {isMtg ? (
            item.bcl_attendee && (
              <>
                <div className="detail-section-label">BCL Attendee</div>
                <div className="detail-attendee">
                  <div className="detail-att-avatar">{initials(item.bcl_attendee)}</div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 12, fontWeight: 600, color: '#1d4ed8' }}>{item.bcl_attendee}</div>
                    {item.bcl_attendee_mobile && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 2 }}>
                        <Phone size={9} style={{ color: '#8ca4a8', flexShrink: 0 }} />
                        <span style={{ fontSize: 10, color: '#8ca4a8' }}>{item.bcl_attendee_mobile}</span>
                      </div>
                    )}
                  </div>
                </div>
              </>
            )
          ) : (
            (item.organizer_name || item.organizer_email || item.organizer_mobile) && (
              <>
                <div className="detail-section-label">Organizer</div>
                <div className="detail-attendee">
                  <div className="detail-att-avatar" style={{ background: getEvTypeCol(item.event_type).bg }}>
                    {initials(item.organizer_name || item.event_name)}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 12, fontWeight: 600, color: '#1d4ed8' }}>{item.organizer_name || '—'}</div>
                    {item.organizer_company && <div style={{ fontSize: 10, color: '#8ca4a8' }}>{item.organizer_company}</div>}
                  </div>
                </div>
              </>
            )
          )}

          {/* contact details */}
          {isMtg ? (
            (item.client_email || item.client_mobile) && (
              <>
                <div className="detail-section-label">Contact</div>
                {item.client_email && (
                  <a href={`mailto:${item.client_email}`} className="detail-contact-link">
                    <div className="detail-contact-icon" style={{ background: '#ede9fe' }}>
                      <Mail size={13} style={{ color: '#7c3aed' }} />
                    </div>
                    <span className="detail-contact-text">{item.client_email}</span>
                  </a>
                )}
                {item.client_mobile && (
                  <a href={`tel:${item.client_mobile}`} className="detail-contact-link">
                    <div className="detail-contact-icon" style={{ background: '#dcfce7' }}>
                      <Phone size={13} style={{ color: '#16a34a' }} />
                    </div>
                    <span className="detail-contact-text">{item.client_mobile}</span>
                  </a>
                )}
              </>
            )
          ) : (
            (item.organizer_email || item.organizer_mobile) && (
              <>
                <div className="detail-section-label">Organizer Contact</div>
                {item.organizer_email && (
                  <a href={`mailto:${item.organizer_email}`} className="detail-contact-link">
                    <div className="detail-contact-icon" style={{ background: '#ede9fe' }}>
                      <Mail size={13} style={{ color: '#7c3aed' }} />
                    </div>
                    <span className="detail-contact-text">{item.organizer_email}</span>
                  </a>
                )}
                {item.organizer_mobile && (
                  <a href={`tel:${item.organizer_mobile}`} className="detail-contact-link">
                    <div className="detail-contact-icon" style={{ background: '#dcfce7' }}>
                      <Phone size={13} style={{ color: '#16a34a' }} />
                    </div>
                    <span className="detail-contact-text">{item.organizer_mobile}</span>
                  </a>
                )}
              </>
            )
          )}
        </div>

        {/* footer */}
        <div className="detail-footer">
          {isMtg ? (
            <>
              <Button className="detail-del-btn" onClick={() => setDeletingMeeting(item)} title="Delete meeting">
                <Trash2 size={15} />
              </Button>
              {item.meeting_type === 'virtual' && item.google_meet_link ? (
                <Button className="detail-join-btn" onClick={() => window.open(item.google_meet_link, '_blank')}>
                  <Video size={13} /> Join Video
                </Button>
              ) : (
                <Button className="detail-edit-btn" onClick={() => router.push(`/schedule/edit/${item.id_main}`)}>
                  Edit Meeting
                </Button>
              )}
            </>
          ) : (
            <>
              <Button className="detail-edit-btn" style={{ flex: 1 }} onClick={() => router.push('/events')}>
                Manage Events Page
              </Button>
            </>
          )}
        </div>
      </div>
    );
  };

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
                const color = isMtg ? getStatusColor(item.status || item.meeting_type) : getEvTypeCol(item.event_type).bg;
                const name = isMtg ? item.client_name : item.event_name;
                const meta = isMtg
                  ? `${item.meeting_start_time?.slice(0, 5)} · ${item.client_company}`
                  : `${item.event_start_time?.slice(0, 5)} · ${EVENT_TYPE_LABELS[item.event_type] ?? item.event_type}`;
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