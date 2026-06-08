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

export function StatusPill({ status }: { status?: string }) {
  const col = getStatusHexColor(status);
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', padding: '3px 9px', borderRadius: 5, fontSize: 10, fontWeight: 700, letterSpacing: '0.04em', background: col.bg, color: col.text, border: `1px solid ${col.hex}40` }}>
      {getStatusLabel(status)}
    </span>
  );
}
