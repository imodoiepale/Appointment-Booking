// @ts-nocheck
'use client';

import React from 'react';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel,
  AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Trash2, Loader2 } from 'lucide-react';

interface DeleteEventDialogProps {
  event: { event_name?: string } | null;
  isDeleting: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
}

export function DeleteEventDialog({ event, isDeleting, onOpenChange, onConfirm }: DeleteEventDialogProps) {
  return (
    <AlertDialog open={!!event} onOpenChange={onOpenChange}>
      <AlertDialogContent className="ev-delete-dialog" style={{ padding: 24 }}>
        <AlertDialogHeader>
          <div style={{ width: 48, height: 48, borderRadius: 12, background: 'linear-gradient(135deg,#ef4444,#dc2626)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 12, boxShadow: '0 4px 14px rgba(239,68,68,.3)' }}>
            <Trash2 size={20} color="#fff" />
          </div>
          <AlertDialogTitle style={{ fontFamily: 'Inter,sans-serif', fontSize: 16, fontWeight: 800, color: '#1d4ed8' }}>Delete Event</AlertDialogTitle>
          <AlertDialogDescription style={{ fontFamily: 'Inter,sans-serif', fontSize: 13, color: '#64868c', lineHeight: 1.6 }}>
            Permanently remove <strong style={{ color: '#1d4ed8' }}>{event?.event_name}</strong>? This cannot be undone.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter style={{ marginTop: 16, gap: 8 }}>
          <AlertDialogCancel style={{ flex: 1, height: 38, borderRadius: 8, fontFamily: 'Inter,sans-serif', fontWeight: 700, fontSize: 13, border: '1px solid #eef2f3', background: '#f7fafa', color: '#64868c', cursor: 'pointer' }}>Keep</AlertDialogCancel>
          <AlertDialogAction onClick={onConfirm} disabled={isDeleting} style={{ flex: 1, height: 38, borderRadius: 8, fontFamily: 'Inter,sans-serif', fontWeight: 700, fontSize: 13, border: 'none', background: 'linear-gradient(135deg,#ef4444,#dc2626)', color: '#fff', cursor: 'pointer', boxShadow: '0 3px 10px rgba(239,68,68,.3)' }}>
            {isDeleting ? <Loader2 size={14} className="animate-spin" /> : 'Delete Permanently'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
