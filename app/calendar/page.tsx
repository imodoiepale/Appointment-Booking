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
  CheckCircle2, XCircle, Sparkles
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
      background-color: #f0f4f5;
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
    }
    .cal-topbar-title {
      font-size: 15px;
      font-weight: 700;
      color: #003038;
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
      background: #f0f4f5;
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
      color: #64868c;
      background: transparent;
      text-transform: capitalize;
      letter-spacing: 0.01em;
    }
    .cal-view-btn:hover { color: #003038; background: rgba(0,48,56,0.06); }
    .cal-view-btn.active {
      background: linear-gradient(135deg, #00d1d1 0%, #00a3a3 100%);
      color: #ffffff;
      box-shadow: 0 2px 8px rgba(0,209,209,0.25);
    }

    .cal-export-btn {
      display: flex;
      align-items: center;
      gap: 6px;
      padding: 7px 14px;
      font-size: 12px;
      font-weight: 600;
      border-radius: 8px;
      border: 1px solid #e2e8e9;
      background: #ffffff;
      color: #003038;
      cursor: pointer;
      transition: all 0.2s ease;
    }
    .cal-export-btn:hover { background: #f0f4f5; border-color: #c8d6d8; }

    .cal-add-btn {
      display: flex;
      align-items: center;
      font-size: 13px;
      font-weight: 700;
      border-radius: 8px;
      border: none;
      background: linear-gradient(135deg, #00d1d1 0%, #00a3a3 100%);
      color: #ffffff;
      cursor: pointer;
      box-shadow: 0 4px 14px rgba(0,209,209,0.3);
      transition: all 0.2s ease;
    }
    .cal-add-btn:hover { transform: translateY(-1px); box-shadow: 0 6px 18px rgba(0,209,209,0.35); }

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
    .mini-cal-month { font-size: 13px; font-weight: 700; color: #003038; }
    .mini-cal-nav-btn {
      width: 26px; height: 26px;
      border-radius: 6px;
      border: 1px solid #eef2f3;
      background: #f7fafa;
      color: #64868c;
      display: flex; align-items: center; justify-content: center;
      cursor: pointer;
      transition: all 0.15s ease;
    }
    .mini-cal-nav-btn:hover { background: #003038; color: #fff; border-color: #003038; }

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
      color: #003038;
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
      background: linear-gradient(135deg, #003038, #005060);
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
    .today-name { font-size: 12px; font-weight: 600; color: #003038; }
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
      font-size: 14px; font-weight: 700; color: #003038;
      min-width: 200px; text-align: center;
      letter-spacing: -0.01em;
    }
    .cal-nav-btn {
      width: 30px; height: 30px;
      border-radius: 8px; border: 1px solid #eef2f3;
      background: #f7fafa; color: #64868c;
      display: flex; align-items: center; justify-content: center;
      cursor: pointer; transition: all 0.15s ease;
    }
    .cal-nav-btn:hover { background: #003038; color: #fff; border-color: #003038; }
    .cal-today-btn {
      padding: 5px 14px; font-size: 12px; font-weight: 600;
      border-radius: 8px; border: 1px solid #eef2f3;
      background: #f7fafa; color: #003038; cursor: pointer;
      transition: all 0.15s ease;
    }
    .cal-today-btn:hover { background: rgba(0,209,209,0.08); border-color: #00d1d1; color: #007a7a; }

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
    }
    .month-grid {
      display: grid; grid-template-columns: repeat(7,1fr);
      grid-template-rows: repeat(6,1fr);
      flex: 1;
      min-height: 0;
      overflow: hidden;
    }
    .month-cell {
      border-right: 1px solid #f0f4f5;
      border-bottom: 1px solid #f0f4f5;
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
      background: linear-gradient(135deg, #003038, #005060);
      color: #ffffff;
      box-shadow: 0 2px 6px rgba(0,48,56,0.2);
    }
    .month-event:hover { opacity: 0.85; }

    /* ── WEEK VIEW ── */
    .week-layout { display: flex; flex: 1; overflow: hidden; }
    .week-time-col {
      width: 52px; flex-shrink: 0;
      border-right: 1px solid #f0f4f5;
      background: #ffffff;
    }
    .week-time-header { height: 56px; border-bottom: 1px solid #eef2f3; }
    .week-time-slot {
      height: 72px; border-bottom: 1px solid #f5f8f9;
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
      border-right: 1px solid #f0f4f5;
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
      font-size: 13px; font-weight: 700; color: #003038;
    }
    .week-date.today {
      background: linear-gradient(135deg, #003038, #00505e);
      color: #ffffff;
      box-shadow: 0 2px 8px rgba(0,48,56,0.25);
    }
    .week-grid-row {
      height: 72px; border-bottom: 1px solid #f5f8f9;
    }
    .week-event:hover { transform: scale(1.02); z-index: 10; box-shadow: 0 6px 20px rgba(0,0,0,0.18); }
    .week-event-time { font-size: 9px; font-weight: 700; opacity: 0.85; }
    .week-event-name { font-size: 11px; font-weight: 600; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .week-event-co { font-size: 10px; opacity: 0.75; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }

    /* ── DAY VIEW ── */
    .day-layout { display: flex; flex: 1; overflow: hidden; }
    .day-time-col {
      width: 52px; flex-shrink: 0;
      border-right: 1px solid #f0f4f5;
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
      background: linear-gradient(135deg, #003038, #00505e);
      color: #fff; box-shadow: 0 3px 10px rgba(0,48,56,0.25);
    }
    .day-big-num.not-today { background: #f0f4f5; color: #003038; }
    .day-grid-row {
      height: 96px; border-bottom: 1px solid #f5f8f9;
    }
    /* -- Updated Sharp Event Styles -- */

/* Shared base for all event cards */
.event-card-base {
  border: 1px solid rgba(0,0,0,0.05);
  border-top-width: 3px !important; /* The thick "sharp" top bar */
  border-radius: 4px; /* "Small rounded" */
  color: #003038;
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
  color: #003038;
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
    .day-event-name { font-size: 13px; font-weight: 700; color: #003038; }
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
    .cal-detail-empty-title { font-size: 13px; font-weight: 700; color: #003038; }
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
    .detail-avatar {
      width: 42px; height: 42px; border-radius: 10px;
      background: rgba(255,255,255,0.25);
      border: 1.5px solid rgba(255,255,255,0.35);
      display: flex; align-items: center; justify-content: center;
      font-size: 14px; font-weight: 800; color: #ffffff;
      margin-bottom: 8px;
    }
    .detail-name { font-size: 15px; font-weight: 800; color: #ffffff; letter-spacing: -0.01em; }
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
    .detail-chip-value { font-size: 12px; font-weight: 700; color: #003038; }

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
      background: linear-gradient(135deg, #003038, #005060);
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
    .detail-contact-text { font-size: 11px; font-weight: 500; color: #003038; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }

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
      background: linear-gradient(135deg, #00d1d1 0%, #00a3a3 100%);
      color: #fff; font-size: 12px; font-weight: 700;
      cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 6px;
      box-shadow: 0 3px 10px rgba(0,209,209,0.25);
      transition: all 0.2s ease;
    }
    .detail-join-btn:hover { box-shadow: 0 5px 15px rgba(0,209,209,0.35); transform: translateY(-1px); }
    .detail-edit-btn {
      flex: 1; height: 36px; border-radius: 8px;
      border: 1px solid #eef2f3; background: #f7fafa;
      color: #003038; font-size: 12px; font-weight: 700;
      cursor: pointer; transition: all 0.15s ease;
    }
    .detail-edit-btn:hover { background: #eef2f3; }

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
const initials = (n: string) => n?.split(' ').map(c => c[0]).join('').slice(0, 2).toUpperCase() ?? '??';

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
        <span className="mini-cal-month">{format(miniDate, 'MMMM yyyy')}</span>
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
  const [loading, setLoading] = useState(true);
  const [selectedMeeting, setSelectedMeeting] = useState<Meeting | null>(null);
  const [deletingMeeting, setDeletingMeeting] = useState<Meeting | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [view, setView] = useState<ViewType>('week');

  const fetchMeetings = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('bcl_meetings_meetings').select('*')
        .order('meeting_date', { ascending: true })
        .order('meeting_start_time', { ascending: true });
      if (error) throw error;
      if (data) setAllMeetings(data as Meeting[]);
    } catch (e: any) {
      toast({ title: 'Error fetching meetings', description: e.message, variant: 'destructive' });
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
    const ch = supabase.channel('mtg').on('postgres_changes', { event: '*', schema: 'public', table: 'bcl_meetings_meetings' }, fetchMeetings).subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [fetchMeetings]);

  const nav = (dir: 1 | -1) => {
    if (view === 'month') setCurrentDate(addMonths(currentDate, dir));
    else if (view === 'week') setCurrentDate(addWeeks(currentDate, dir));
    else setCurrentDate(addDays(currentDate, dir));
  };

  const daysWithMeetings = useMemo(() =>
    Array.from(new Set(allMeetings.map(m => m.meeting_date))).map(d => parseISO(d)), [allMeetings]);

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
    return allMeetings.filter(m => m.meeting_date === t);
  }, [allMeetings]);

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
          const dm = allMeetings.filter(m => m.meeting_date === ds);
          const isCur = day.getMonth() === currentDate.getMonth();
          const isSel = isSameDay(day, selectedDate);
          const isNow = dateFnsIsToday(day);
          return (
            <div key={idx} className={cn('month-cell', !isCur && 'other-month', isSel && 'selected')}
              onClick={() => { setSelectedDate(day); setCurrentDate(day); }}>
              <div className={cn('month-day-num', isNow && 'today')}>{format(day, 'd')}</div>
              {dm.slice(0, 3).map(m => (
                <div key={m.id_main}
                  className="month-event event-card-base"
                  style={{
                    borderTopColor: getStatusColor(m.status || m.meeting_type),
                    backgroundColor: getLightStatusColor(m.status || m.meeting_type)
                  }}
                  onClick={e => { e.stopPropagation(); setSelectedMeeting(m); }}>
                  <span className="truncate">{m.client_name}</span>
                </div>
              ))}
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
          const dm = allMeetings.filter(m => m.meeting_date === ds);
          return (
            <div key={day.toString()} className="week-day-col">
              <div className={cn('week-day-header', isNow && 'today-col')}>
                <span className="week-dow">{format(day, 'EEE')}</span>
                <div className={cn('week-date', isNow && 'today')}>{format(day, 'd')}</div>
              </div>
              <div style={{ position: 'relative' }}>
                {TIME_SLOTS.map((_, i) => <div key={i} className="week-grid-row" />)}
                {dm.map(m => {
                  const sh = parseInt(m.meeting_start_time.split(':')[0]);
                  const sm = parseInt(m.meeting_start_time.split(':')[1]);
                  const eh = m.meeting_end_time ? parseInt(m.meeting_end_time.split(':')[0]) : sh + 1;
                  const em = m.meeting_end_time ? parseInt(m.meeting_end_time.split(':')[1]) : 0;
                  const top = (sh - 7) * 72 + (sm / 60) * 72;
                  const height = Math.max(((eh * 60 + em) - (sh * 60 + sm)) / 60 * 72, 36);
                  return (
                    <div key={m.id_main}
                      className="week-event event-card-base"
                      style={{
                        top, height,
                        borderTopColor: getStatusColor(m.status || m.meeting_type),
                        backgroundColor: getLightStatusColor(m.status || m.meeting_type)
                      }}
                      onClick={() => setSelectedMeeting(m)}>
                      <div className="event-title">{m.meeting_agenda || 'Consultation'}</div>
                      <div className="event-subtitle">{m.meeting_start_time?.slice(0, 5)} - {m.meeting_end_time?.slice(0, 5)}</div>

                      {height > 60 && (
                        <div className="event-avatar-mini" style={{ background: getStatusColor(m.status || m.meeting_type), display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontSize: '8px' }}>
                          {initials(m.client_name)}
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
    const dm = allMeetings.filter(m => m.meeting_date === format(currentDate, 'yyyy-MM-dd'));
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
              <div style={{ fontSize: 13, fontWeight: 700, color: '#003038' }}>{format(currentDate, 'EEEE, MMMM d')}</div>
              <div style={{ fontSize: 11, color: '#8ca4a8' }}>{dm.length} meeting{dm.length !== 1 ? 's' : ''}</div>
            </div>
          </div>
          {TIME_SLOTS.map((_, i) => <div key={i} className="day-grid-row" />)}
          {dm.map(m => {
            const sh = parseInt(m.meeting_start_time.split(':')[0]);
            const sm2 = parseInt(m.meeting_start_time.split(':')[1]);
            const eh = m.meeting_end_time ? parseInt(m.meeting_end_time.split(':')[0]) : sh + 1;
            const em = m.meeting_end_time ? parseInt(m.meeting_end_time.split(':')[1]) : 0;
            const top = 56 + (sh - 7) * 96 + (sm2 / 60) * 96;
            const height = Math.max(((eh * 60 + em) - (sh * 60 + sm2)) / 60 * 96, 68);
            const color = getEventColor(m);
            return (
              <div key={m.id_main}
                className="day-event event-card-base"
                style={{
                  top, height,
                  borderTopColor: getStatusColor(m.status || m.meeting_type),
                  backgroundColor: getLightStatusColor(m.status || m.meeting_type)
                }}
                onClick={() => setSelectedMeeting(m)}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div>
                    <div className="event-title" style={{ fontSize: '14px' }}>{m.client_name}</div>
                    <div className="event-subtitle" style={{ fontSize: '12px' }}>{m.meeting_start_time?.slice(0, 5)} - {m.meeting_end_time?.slice(0, 5)}</div>
                  </div>
                  <div className="event-avatar-mini" style={{ width: '24px', height: '24px', background: getStatusColor(m.status || m.meeting_type), display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontSize: '10px' }}>
                    {initials(m.client_name)}
                  </div>
                </div>
                {height > 100 && (
                  <div style={{ marginTop: '8px', fontSize: '12px', color: '#64868c' }}>
                    {m.meeting_agenda}
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
          <div className="cal-panel-header">Meeting Details</div>
          <div className="cal-detail-empty">
            <div className="cal-detail-icon-wrap">
              <CalendarDays size={22} style={{ color: '#8ca4a8' }} />
            </div>
            <div className="cal-detail-empty-title">No meeting selected</div>
            <div className="cal-detail-empty-sub">Click any event on the calendar to view its details here</div>
          </div>
        </div>
      );
    }
    const m = selectedMeeting;
    const gradient = getEventGradient(m);
    return (
      <div className="cal-detail">
        {/* colored header */}
        <div className="detail-color-header" style={{ background: gradient }}>
          <div className="detail-header-shine" />
          <div style={{ position: 'relative', zIndex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
              <span className={cn('detail-status-pill')}>{getLabel(m)}</span>
              <Button className="detail-close" onClick={() => setSelectedMeeting(null)}><X size={12} /></Button>
            </div>
            <div className="detail-avatar">{initials(m.client_name)}</div>
            <div className="detail-name">{m.client_name}</div>
            <div className="detail-company">{m.client_company}</div>
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
                {m.meeting_date ? format(parseISO(m.meeting_date), 'MMM d, yyyy') : '—'}
              </div>
            </div>
            <div className="detail-chip">
              <div className="detail-chip-label">Time</div>
              <div className="detail-chip-value">{m.meeting_start_time?.slice(0, 5)} – {m.meeting_end_time?.slice(0, 5)}</div>
            </div>
          </div>

          {/* type */}
          <div className="detail-section-label">Meeting Type</div>
          <div className="detail-type-row">
            <div className="detail-type-icon"
              style={{ background: m.meeting_type === 'virtual' ? '#ede9fe' : '#e0f2fe' }}>
              {m.meeting_type === 'virtual'
                ? <Video size={15} style={{ color: '#7c3aed' }} />
                : <MapPin size={15} style={{ color: '#0284c7' }} />}
            </div>
            <div>
              <div style={{ fontSize: 12, fontWeight: 700, color: '#003038', textTransform: 'capitalize' }}>{m.meeting_type}</div>
              {m.meeting_venue_area && <div style={{ fontSize: 11, color: '#8ca4a8' }}>{m.meeting_venue_area}</div>}
            </div>
          </div>

          {/* agenda */}
          {m.meeting_agenda && (
            <>
              <div className="detail-section-label">Agenda</div>
              <div className="detail-agenda">{m.meeting_agenda}</div>
            </>
          )}

          {/* attendee */}
          {m.bcl_attendee && (
            <>
              <div className="detail-section-label">BCL Attendee</div>
              <div className="detail-attendee">
                <div className="detail-att-avatar">{initials(m.bcl_attendee)}</div>
                <div style={{ fontSize: 12, fontWeight: 600, color: '#003038' }}>{m.bcl_attendee}</div>
              </div>
            </>
          )}

          {/* contact */}
          {(m.client_email || m.client_mobile) && (
            <>
              <div className="detail-section-label">Contact</div>
              {m.client_email && (
                <a href={`mailto:${m.client_email}`} className="detail-contact-link">
                  <div className="detail-contact-icon" style={{ background: '#ede9fe' }}>
                    <Mail size={13} style={{ color: '#7c3aed' }} />
                  </div>
                  <span className="detail-contact-text">{m.client_email}</span>
                </a>
              )}
              {m.client_mobile && (
                <a href={`tel:${m.client_mobile}`} className="detail-contact-link">
                  <div className="detail-contact-icon" style={{ background: '#dcfce7' }}>
                    <Phone size={13} style={{ color: '#16a34a' }} />
                  </div>
                  <span className="detail-contact-text">{m.client_mobile}</span>
                </a>
              )}
            </>
          )}
        </div>

        {/* footer */}
        <div className="detail-footer">
          <Button className="detail-del-btn" onClick={() => setDeletingMeeting(m)} title="Delete meeting">
            <Trash2 size={15} />
          </Button>
          {m.meeting_type === 'virtual'
            ? <Button className="detail-join-btn"><Video size={13} /> Join Video</Button>
            : <Button className="detail-edit-btn" onClick={() => router.push(`/schedule/edit/${m.id_main}`)}>Edit Meeting</Button>
          }
          {m.meeting_type === 'virtual' && (
            <Button className="detail-edit-btn" onClick={() => router.push(`/schedule/edit/${m.id_main}`)}>Edit</Button>
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
            background: 'linear-gradient(135deg, #003038, #00505e)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 3px 10px rgba(0,48,56,0.2)',
          }}>
            <CalendarDays size={17} color="#00d1d1" />
          </div>
          <div>
            <div className="cal-topbar-title">Meeting Calendar</div>
            <div className="cal-topbar-sub">Manage your team schedule in real time</div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
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
            <div className="cal-panel-header">Today's Meetings</div>
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
                  <div style={{ fontSize: 12, fontWeight: 600, color: '#64868c' }}>No meetings today</div>
                </div>
              ) : todayMeetings.map(m => (
                <div key={m.id_main} className="today-item" onClick={() => setSelectedMeeting(m)}>
                  <div className="today-dot" style={{ background: getEventColor(m) }} />
                  <div>
                    <div className="today-name">{m.client_name}</div>
                    <div className="today-meta">{m.meeting_start_time?.slice(0, 5)} · {m.client_company}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* MAIN CALENDAR */}
        <div className="cal-main">
          {/* nav */}
          <div className="cal-nav">
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <Button className="cal-nav-btn" onClick={() => nav(-1)}><ChevronLeft size={15} /></Button>
              <span className="cal-nav-label">{headerLabel}</span>
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
                  background: 'linear-gradient(135deg, #003038, #00505e)',
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
            <AlertDialogTitle style={{ fontSize: 17, fontWeight: 800, color: '#003038', fontFamily: 'Inter, sans-serif' }}>
              Remove this meeting?
            </AlertDialogTitle>
            <AlertDialogDescription style={{ color: '#64868c', fontSize: 13, fontFamily: 'Inter, sans-serif' }}>
              This will permanently remove the meeting for{' '}
              <strong style={{ color: '#003038' }}>{deletingMeeting?.client_name}</strong>.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter style={{ marginTop: 20, gap: 8 }}>
            <AlertDialogCancel style={{
              borderRadius: 8, height: 38, fontWeight: 700, border: '1px solid #eef2f3',
              background: '#f7fafa', color: '#003038', fontSize: 13, fontFamily: 'Inter, sans-serif', flex: 1,
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