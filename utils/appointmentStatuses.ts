// @ts-nocheck
/**
 * Unified status definitions for meetings and events.
 * Single source of truth for all status labels, Tailwind classes, and hex colors.
 */

// ── STATUS LISTS ──────────────────────────────────────────────────────────────

export const MEETING_STATUSES = [
  { value: 'draft',               label: 'Draft' },
  { value: 'pending_confirmation', label: 'Pending Confirmation' },
  { value: 'confirmed',           label: 'Confirmed' },
  { value: 'upcoming',            label: 'Upcoming' },
  { value: 'in_progress',         label: 'In Progress' },
  { value: 'overdue',             label: 'Overdue' },
  { value: 'completed',           label: 'Completed' },
  { value: 'rescheduled',         label: 'Rescheduled' },
  { value: 'cancelled',           label: 'Cancelled' },
  { value: 'no_show',             label: 'No Show' },
] as const;

export const EVENT_STATUSES = MEETING_STATUSES;

export type StatusValue = (typeof MEETING_STATUSES)[number]['value'];

// ── TAILWIND PILL CLASSES (bg + text) ─────────────────────────────────────────
// Used wherever a status badge / pill needs Tailwind classes.

export const STATUS_PILL_CLASSES: Record<string, string> = {
  draft:                'bg-gray-100 text-gray-800',
  pending_confirmation: 'bg-amber-100 text-amber-800',
  confirmed:            'bg-blue-100 text-blue-800',
  upcoming:             'bg-indigo-100 text-indigo-800',
  in_progress:          'bg-cyan-100 text-cyan-800',
  overdue:              'bg-yellow-100 text-yellow-900',
  completed:            'bg-green-100 text-green-800',
  rescheduled:          'bg-orange-100 text-orange-800',
  cancelled:            'bg-red-100 text-red-800',
  canceled:             'bg-red-100 text-red-800', // legacy spelling
  no_show:              'bg-rose-100 text-rose-800',
};

// ── HEX COLORS (for calendar chips, charts, gradients) ────────────────────────

export const STATUS_HEX: Record<string, { hex: string; bg: string; text: string }> = {
  draft:                { hex: '#6b7280', bg: 'rgba(107,114,128,0.12)', text: '#374151' },
  pending_confirmation: { hex: '#f59e0b', bg: 'rgba(245,158,11,0.12)',  text: '#92400e' },
  confirmed:            { hex: '#3b82f6', bg: 'rgba(59,130,246,0.12)',  text: '#1e40af' },
  upcoming:             { hex: '#6366f1', bg: 'rgba(99,102,241,0.12)',  text: '#3730a3' },
  in_progress:          { hex: '#06b6d4', bg: 'rgba(6,182,212,0.12)',   text: '#155e75' },
  overdue:              { hex: '#ca8a04', bg: 'rgba(202,138,4,0.12)',   text: '#713f12' },
  completed:            { hex: '#22c55e', bg: 'rgba(34,197,94,0.12)',   text: '#14532d' },
  rescheduled:          { hex: '#f97316', bg: 'rgba(249,115,22,0.12)',  text: '#9a3412' },
  cancelled:            { hex: '#ef4444', bg: 'rgba(239,68,68,0.12)',   text: '#991b1b' },
  canceled:             { hex: '#ef4444', bg: 'rgba(239,68,68,0.12)',   text: '#991b1b' },
  no_show:              { hex: '#f43f5e', bg: 'rgba(244,63,94,0.12)',   text: '#9f1239' },
};

// ── TAILWIND FULL CONFIG (for STATUS_CONFIG-style usage) ──────────────────────

export const STATUS_TAILWIND: Record<string, {
  label: string; bg: string; text: string; border: string; dot: string;
}> = {
  draft: {
    label: 'Draft',
    bg: 'bg-gray-100', text: 'text-gray-800', border: 'border-gray-200', dot: 'bg-gray-400',
  },
  pending_confirmation: {
    label: 'Pending Confirmation',
    bg: 'bg-amber-100', text: 'text-amber-800', border: 'border-amber-200', dot: 'bg-amber-500',
  },
  confirmed: {
    label: 'Confirmed',
    bg: 'bg-blue-100', text: 'text-blue-800', border: 'border-blue-200', dot: 'bg-blue-500',
  },
  upcoming: {
    label: 'Upcoming',
    bg: 'bg-indigo-100', text: 'text-indigo-800', border: 'border-indigo-200', dot: 'bg-indigo-500',
  },
  in_progress: {
    label: 'In Progress',
    bg: 'bg-cyan-100', text: 'text-cyan-800', border: 'border-cyan-200', dot: 'bg-cyan-500',
  },
  overdue: {
    label: 'Overdue',
    bg: 'bg-yellow-100', text: 'text-yellow-900', border: 'border-yellow-400', dot: 'bg-yellow-600',
  },
  completed: {
    label: 'Completed',
    bg: 'bg-green-100', text: 'text-green-800', border: 'border-green-200', dot: 'bg-green-500',
  },
  rescheduled: {
    label: 'Rescheduled',
    bg: 'bg-orange-100', text: 'text-orange-800', border: 'border-orange-200', dot: 'bg-orange-500',
  },
  cancelled: {
    label: 'Cancelled',
    bg: 'bg-red-100', text: 'text-red-800', border: 'border-red-200', dot: 'bg-red-500',
  },
  canceled: {
    label: 'Cancelled',
    bg: 'bg-red-100', text: 'text-red-800', border: 'border-red-200', dot: 'bg-red-500',
  },
  no_show: {
    label: 'No Show',
    bg: 'bg-rose-100', text: 'text-rose-800', border: 'border-rose-200', dot: 'bg-rose-500',
  },
};

// ── HELPERS ───────────────────────────────────────────────────────────────────

/** Normalise legacy/variant status strings to canonical keys */
export function normaliseStatus(status?: string): string {
  if (!status) return 'upcoming';
  const s = status.toLowerCase().trim().replace(/[\s-]+/g, '_');
  const legacyMap: Record<string, string> = {
    pending: 'pending_confirmation',
    'in progress': 'in_progress',
    'no show': 'no_show',
  };
  return legacyMap[s] ?? s;
}

/** Returns Tailwind pill classes for a status */
export function getStatusPillClass(status?: string): string {
  const key = normaliseStatus(status);
  return STATUS_PILL_CLASSES[key] ?? STATUS_PILL_CLASSES.upcoming;
}

/** Returns hex color config for a status */
export function getStatusHexColor(status?: string) {
  const key = normaliseStatus(status);
  return STATUS_HEX[key] ?? STATUS_HEX.upcoming;
}

/** Returns full Tailwind config for a status */
export function getStatusTailwind(status?: string) {
  const key = normaliseStatus(status);
  return STATUS_TAILWIND[key] ?? STATUS_TAILWIND.upcoming;
}

/** Human-readable label for a status value */
export function getStatusLabel(status?: string): string {
  const key = normaliseStatus(status);
  return STATUS_TAILWIND[key]?.label ?? (status ?? 'Upcoming');
}
