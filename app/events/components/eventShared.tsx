// @ts-nocheck
'use client';

import React from 'react';
import { getStatusHexColor, getStatusLabel } from '@/utils/appointmentStatuses';

export function formatTime(t: string) {
  if (!t) return '—';
  const [h, m] = t.split(':').map(Number);
  const ampm = h >= 12 ? 'PM' : 'AM';
  return `${((h % 12) || 12).toString().padStart(2, '0')}:${m.toString().padStart(2, '0')} ${ampm}`;
}

export function safeInitials(n: string) {
  if (!n || typeof n !== 'string') return '??';
  return n.split(' ').filter(Boolean).map(c => c[0]).join('').slice(0, 2).toUpperCase();
}

// Parses bcl_attendee whether it arrives as an array or a JSON-stringified array
export function parseBclAttendeeIds(raw: unknown): string[] {
  if (Array.isArray(raw)) return raw.map(String).filter(Boolean);
  if (typeof raw === 'string' && raw.trim()) {
    try {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed.map(String).filter(Boolean);
    } catch {
      return [raw.trim()];
    }
  }
  return [];
}

// Resolves an event's bcl_attendee ids to display names via the bclAttendeesList map —
// mirrors DashboardContent's getAttendeeDetails so names survive a reload (not just the local form state)
export function resolveAttendeeNames(ev: { bcl_attendee?: unknown; bcl_attendee_names?: string[] }, usersById: Record<string, string>): string[] {
  const ids = parseBclAttendeeIds(ev?.bcl_attendee);
  if (ids.length > 0) return ids.map(id => usersById[id] || id);
  return Array.isArray(ev?.bcl_attendee_names) ? ev.bcl_attendee_names : [];
}

export function StatusPill({ status }: { status?: string }) {
  const col = getStatusHexColor(status);
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', padding: '3px 9px', borderRadius: 5, fontSize: 10, fontWeight: 700, letterSpacing: '0.04em', background: col.bg, color: col.text, border: `1px solid ${col.hex}40` }}>
      {getStatusLabel(status)}
    </span>
  );
}
