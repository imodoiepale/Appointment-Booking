// @ts-nocheck
/**
 * Unified styles, colors and helpers for meetings and events.
 * Single source of truth — import from here instead of inline definitions.
 */
import React from 'react';
import {
  Heart, DollarSign, Cpu, Users, Gift, Star, BookOpen, Hammer,
  Calendar, PartyPopper,
} from 'lucide-react';

// ── MEETING STATUS PILLS (Tailwind classes) ───────────────────────────────

export const MEETING_STATUS_PILLS: Record<string, string> = {
  upcoming:    'bg-blue-50 text-blue-700 border border-blue-200',
  rescheduled: 'bg-indigo-50 text-indigo-700 border border-indigo-200',
  pending:     'bg-amber-50 text-amber-700 border border-amber-200',
  confirmed:   'bg-emerald-50 text-emerald-700 border border-emerald-200',
  completed:   'bg-emerald-50 text-emerald-700 border border-emerald-200',
  canceled:    'bg-red-50 text-red-700 border border-red-200',
  cancelled:   'bg-red-50 text-red-700 border border-red-200',
};

export function getMeetingStatusPillClass(status?: string): string {
  return MEETING_STATUS_PILLS[(status ?? '').toLowerCase()] ?? MEETING_STATUS_PILLS.upcoming;
}

// ── MEETING STATUS HEX COLORS (for calendar/chart contexts) ──────────────

export const MEETING_STATUS_COLORS: Record<string, { hex: string; bg: string; text: string }> = {
  upcoming:    { hex: '#8B5CF6', bg: 'rgba(139,92,246,0.1)',  text: '#6D28D9' },
  rescheduled: { hex: '#F59E0B', bg: 'rgba(245,158,11,0.1)',  text: '#B45309' },
  pending:     { hex: '#F97316', bg: 'rgba(249,115,22,0.1)',  text: '#C2410C' },
  confirmed:   { hex: '#06B6D4', bg: 'rgba(6,182,212,0.1)',   text: '#0E7490' },
  completed:   { hex: '#10B981', bg: 'rgba(16,185,129,0.1)',  text: '#047857' },
  canceled:    { hex: '#EF4444', bg: 'rgba(239,68,68,0.1)',   text: '#B91C1C' },
  cancelled:   { hex: '#EF4444', bg: 'rgba(239,68,68,0.1)',   text: '#B91C1C' },
  virtual:     { hex: '#3B82F6', bg: 'rgba(59,130,246,0.1)',  text: '#1D4ED8' },
  inPerson:    { hex: '#0EA5E9', bg: 'rgba(14,165,233,0.1)',  text: '#0369A1' },
  physical:    { hex: '#0EA5E9', bg: 'rgba(14,165,233,0.1)',  text: '#0369A1' },
};

export function getMeetingStatusHex(status?: string): string {
  return MEETING_STATUS_COLORS[(status ?? '').toLowerCase()]?.hex ?? '#8ca4a8';
}

// ── EVENT TYPES ────────────────────────────────────────────────────────────

export interface EventTypeConfig {
  bg: string;
  text: string;
  light: string;
  gradient: string;
  label: string;
  Icon: React.ComponentType<{ size?: number }>;
}

export const EVENT_TYPE_CONFIG: Record<string, EventTypeConfig> = {
  wedding:    { bg: '#ec4899', text: '#fff', light: '#fdf2f8', gradient: 'linear-gradient(135deg,#ec4899,#db2777)', label: 'Wedding',    Icon: Heart },
  fundraiser: { bg: '#f97316', text: '#fff', light: '#fff7ed', gradient: 'linear-gradient(135deg,#f97316,#ea580c)', label: 'Fundraiser', Icon: DollarSign },
  tech_event: { bg: '#8b5cf6', text: '#fff', light: '#f5f3ff', gradient: 'linear-gradient(135deg,#8b5cf6,#7c3aed)', label: 'Tech Event', Icon: Cpu },
  conference: { bg: '#3b82f6', text: '#fff', light: '#eff6ff', gradient: 'linear-gradient(135deg,#3b82f6,#2563eb)', label: 'Conference', Icon: Users },
  birthday:   { bg: '#f59e0b', text: '#fff', light: '#fffbeb', gradient: 'linear-gradient(135deg,#f59e0b,#d97706)', label: 'Birthday',   Icon: Gift },
  party:      { bg: '#e879f9', text: '#fff', light: '#fdf4ff', gradient: 'linear-gradient(135deg,#e879f9,#c026d3)', label: 'Party',      Icon: PartyPopper },
  gala:       { bg: '#d97706', text: '#fff', light: '#fffbeb', gradient: 'linear-gradient(135deg,#d97706,#b45309)', label: 'Gala',       Icon: Star },
  seminar:    { bg: '#10b981', text: '#fff', light: '#f0fdf4', gradient: 'linear-gradient(135deg,#10b981,#059669)', label: 'Seminar',    Icon: BookOpen },
  workshop:   { bg: '#06b6d4', text: '#fff', light: '#ecfeff', gradient: 'linear-gradient(135deg,#06b6d4,#0891b2)', label: 'Workshop',   Icon: Hammer },
  other:      { bg: '#6b7280', text: '#fff', light: '#f9fafb', gradient: 'linear-gradient(135deg,#6b7280,#4b5563)', label: 'Event',      Icon: Calendar },
};

export function getEventTypeConfig(type?: string): EventTypeConfig {
  return EVENT_TYPE_CONFIG[(type ?? '').toLowerCase()] ?? EVENT_TYPE_CONFIG.other;
}

/** Small icon component — use anywhere you need an event type icon */
export const EventTypeIcon = ({ type, size = 14 }: { type: string; size?: number }) => {
  const cfg = getEventTypeConfig(type);
  return React.createElement(cfg.Icon, { size });
};

/** Ordered list for form selects */
export const EVENT_TYPES = [
  { value: 'wedding',    label: 'Wedding' },
  { value: 'fundraiser', label: 'Fundraiser' },
  { value: 'tech_event', label: 'Tech Event' },
  { value: 'conference', label: 'Conference' },
  { value: 'birthday',   label: 'Birthday' },
  { value: 'party',      label: 'Party' },
  { value: 'gala',       label: 'Gala' },
  { value: 'seminar',    label: 'Seminar' },
  { value: 'workshop',   label: 'Workshop' },
  { value: 'other',      label: 'Other' },
] as const;

export type EventTypeValue = (typeof EVENT_TYPES)[number]['value'];

// ── DATE HELPERS ───────────────────────────────────────────────────────────

/** Parse YYYY-MM-DD as a local date (avoids UTC-to-local timezone shift) */
export function parseLocalDateStr(dateStr?: string): Date | null {
  if (!dateStr) return null;
  if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
    const [y, m, d] = dateStr.split('-').map(Number);
    return new Date(y, m - 1, d);
  }
  const d = new Date(dateStr);
  return isNaN(d.getTime()) ? null : d;
}

/** Format a date string to dd/MM/yyyy */
export function formatDateDDMMYYYY(dateStr?: string, fallback = '—'): string {
  const d = parseLocalDateStr(dateStr);
  if (!d) return fallback;
  return d.toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

/** Format a date string with custom options using en-GB locale */
export function formatLocalDate(dateStr?: string, options?: Intl.DateTimeFormatOptions, fallback = '—'): string {
  const d = parseLocalDateStr(dateStr);
  return d ? d.toLocaleDateString('en-GB', options) : fallback;
}

// ── SORT HELPER ────────────────────────────────────────────────────────────

export interface SortConfig {
  key: string;
  dir: 'asc' | 'desc';
}

export function sortItems<T extends Record<string, any>>(items: T[], cfg: SortConfig | null): T[] {
  if (!cfg) return items;
  return [...items].sort((a, b) => {
    const av = a[cfg.key] ?? '';
    const bv = b[cfg.key] ?? '';
    const cmp = typeof av === 'number' && typeof bv === 'number'
      ? av - bv
      : String(av).localeCompare(String(bv), undefined, { sensitivity: 'base' });
    return cfg.dir === 'asc' ? cmp : -cmp;
  });
}
