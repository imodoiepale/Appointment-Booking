// @ts-nocheck
"use client"

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Toaster } from "@/components/ui/toaster";
import { useToast } from "@/hooks/use-toast";
import {
  Calendar, Clock, Building, MapPin, CheckCircle, XCircle, Table2, LayoutGrid,
  Video, Trash2, Loader2, CloudOff, Cloud, ChevronLeft, ChevronRight, Search,
  MoreHorizontal, Plus, Download, Hash, Globe, CheckCircle2, CalendarClock,
  Edit2, Ban, UserCheck, AlertCircle, PartyPopper, Users,
} from 'lucide-react';
import { getStatusColors, getBadgeStatusColor } from '@/utils/statusColors';
import { formatTime } from './format';

// ── SHARED DESIGN SYSTEM STYLES ──────────────────────────────────
const DashboardStyles = () => (
  <style>{`
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');

    .db-shell {
      font-family: 'Inter', sans-serif;
      background: #f4f7f8;
      min-height: 100vh;
      padding: 24px;
    }

    /* ── TOPBAR ── */
    .db-header { margin-bottom: 20px; display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 12px; }
    .db-title { font-size: 18px; font-weight: 800; color: #1d4ed8; letter-spacing: -0.02em; }
    .db-subtitle { font-size: 12px; color: #64868c; margin-top: 2px; }

    /* ── BUTTONS — mirrors sidebar create btn ── */
    .db-btn-primary {
      display: inline-flex; align-items: center; gap: 6px;
      padding: 8px 16px; font-size: 13px; font-weight: 700;
      border-radius: 8px; border: none;
      background: hsl(var(--primary));
      color: hsl(var(--primary-foreground)); cursor: pointer;
      box-shadow: 0 4px 14px hsl(var(--primary) / 0.22);
      transition: all 0.2s ease;
    }
    .db-btn-primary:hover { transform: translateY(-1px); background: hsl(var(--primary) / 0.92); box-shadow: 0 6px 18px hsl(var(--primary) / 0.3); }

    .db-btn-outline {
      display: inline-flex; align-items: center; gap: 6px;
      padding: 7px 14px; font-size: 12px; font-weight: 600;
      border-radius: 8px; border: 1px solid hsl(var(--border));
      background: hsl(var(--card)); color: hsl(var(--foreground));
      cursor: pointer; transition: all 0.15s ease;
    }
    .db-btn-outline:hover { background: hsl(var(--secondary)); border-color: hsl(var(--ring) / 0.35); }

    .db-btn-ghost {
      display: inline-flex; align-items: center; gap: 6px;
      padding: 6px 12px; font-size: 12px; font-weight: 600;
      border-radius: 8px; border: none; background: transparent;
      color: hsl(var(--muted-foreground)); cursor: pointer; transition: all 0.15s ease;
    }
    .db-btn-ghost:hover { background: hsl(var(--secondary)); color: hsl(var(--foreground)); }

    /* ── PANELS ── */
    .db-panel {
      background: #ffffff; border-radius: 12px;
      border: 1px solid #eef2f3; overflow: hidden;
      box-shadow: 0 18px 45px rgba(0,48,56,0.08);
    }

    /* ── TOOLBAR ── */
    .db-toolbar {
      display: flex; align-items: center; flex-wrap: wrap; gap: 0;
      border-bottom: 1px solid #eef2f3;
      background: #f7fafa;
    }
    .db-tabs { display: flex; padding: 10px 12px; gap: 2px; }
    .db-tab {
      padding: 7px 14px; font-size: 12px; font-weight: 700;
      border-radius: 7px; border: 1px solid transparent;
      background: transparent; color: hsl(var(--muted-foreground)); cursor: pointer;
      transition: all 0.15s ease; text-transform: capitalize;
    }
    .db-tab:hover { color: hsl(var(--foreground)); background: hsl(var(--secondary)); }
    .db-tab.active {
      background: hsl(var(--card)); color: hsl(var(--primary));
      border-color: hsl(var(--border));
      box-shadow: 0 1px 4px rgba(0,0,0,0.06);
    }
    .db-tab.active.tab-upcoming,
    .db-tab.active.tab-today,
    .db-tab.active.tab-pending,
    .db-tab.active.tab-completed,
    .db-tab.active.tab-canceled { color: hsl(var(--primary)); }

    /* search + view toggle */
    .db-toolbar-right { flex: 1; display: flex; align-items: center; gap: 10px; padding: 10px 12px; justify-content: flex-end; }
    .db-search-wrap { position: relative; flex: 1; max-width: 320px; }
    .db-search-icon { position: absolute; left: 11px; top: 50%; transform: translateY(-50%); color: #8ca4a8; pointer-events: none; }
    .db-search {
      width: 100%; height: 36px; padding: 0 12px 0 34px;
      font-size: 13px; font-weight: 500; font-family: 'Inter', sans-serif;
      border: 1px solid #e2e8e9; border-radius: 8px;
      background: #ffffff; color: #1d4ed8; outline: none;
      transition: all 0.15s ease;
    }
    .db-search:focus { border-color: hsl(var(--ring)); box-shadow: 0 0 0 3px hsl(var(--ring) / 0.14); }
    .db-search::placeholder { color: #8ca4a8; }

    .db-view-toggle { display: flex; background: hsl(var(--secondary)); border-radius: 8px; padding: 3px; gap: 2px; }
    .db-view-btn {
      display: flex; align-items: center; gap: 5px;
      padding: 5px 10px; font-size: 11px; font-weight: 700;
      border-radius: 5px; border: none; cursor: pointer;
      color: hsl(var(--muted-foreground)); background: transparent; transition: all 0.15s ease;
    }
    .db-view-btn:hover { color: hsl(var(--foreground)); }
    .db-view-btn.active {
      background: hsl(var(--card)); color: hsl(var(--primary));
      box-shadow: 0 1px 3px rgba(0,0,0,0.08);
    }

    /* ── TABLE ── */
    .db-table-wrap { overflow-x: auto; padding: 12px; background: #ffffff; }
    .db-table { width: 100%; border-collapse: collapse; }
    .db-table th {
      padding: 10px 16px; text-align: left;
      font-size: 9px; font-weight: 700; text-transform: uppercase;
      letter-spacing: 0.07em; color: #8ca4a8;
      background: #f7fafa; border: 1px solid #e2e8e9;
      white-space: nowrap;
    }
    .db-table td { padding: 13px 16px; border: 1px solid #e8eef0; vertical-align: middle; }
    .db-table tr:last-child td { border-bottom: 1px solid #e8eef0; }
    .db-table tr { cursor: pointer; transition: background 0.12s ease; }
    .db-table tr:hover td { background: #f7fafa; }

    .db-type-icon {
      width: 36px; height: 36px; border-radius: 9px;
      display: flex; align-items: center; justify-content: center;
      flex-shrink: 0;
    }
    .db-type-virtual { background: #ede9fe; color: #7c3aed; }
    .db-type-physical { background: #e0f2fe; color: #0284c7; }

    .db-cell-main { font-size: 13px; font-weight: 700; color: #1d4ed8; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 200px; }
    .db-cell-sub { font-size: 11px; color: #8ca4a8; margin-top: 2px; }
    .db-cell-date { font-size: 12px; font-weight: 700; color: #1d4ed8; white-space: nowrap; }
    .db-cell-time { font-size: 12px; font-weight: 600; color: #64868c; display: flex; align-items: center; gap: 5px; white-space: nowrap; }
    .db-avatar-sm {
      width: 26px; height: 26px; border-radius: 6px;
      display: flex; align-items: center; justify-content: center;
      font-size: 9px; font-weight: 800;
      background: linear-gradient(135deg, #1d4ed8, #00505e);
      color: #ffffff; flex-shrink: 0;
    }
    .db-attendee { display: flex; align-items: center; gap: 7px; font-size: 12px; font-weight: 600; color: #64868c; }

    /* row action buttons — appear on hover */
    .db-row-actions { display: flex; align-items: center; gap: 4px; opacity: 0; transition: opacity 0.15s ease; }
    .db-table tr:hover .db-row-actions { opacity: 1; }
    .db-row-btn {
      width: 28px; height: 28px; border-radius: 7px; border: none;
      display: flex; align-items: center; justify-content: center;
      cursor: pointer; transition: all 0.12s ease; background: transparent; color: #8ca4a8;
    }
    .db-row-btn:hover { background: hsl(var(--secondary)); color: hsl(var(--foreground)); }

    /* ── STATUS PILLS ── */
    .pill {
      display: inline-flex; align-items: center;
      padding: 3px 9px; border-radius: 5px;
      font-size: 10px; font-weight: 700; letter-spacing: 0.04em;
      text-transform: uppercase; border: 1px solid transparent;
    }
    .pill-upcoming  { background: #dbeafe; color: #1e40af; border-color: #bfdbfe; }
    .pill-rescheduled{ background: #ede9fe; color: #5b21b6; border-color: #ddd6fe; }
    .pill-pending   { background: #fef3c7; color: #92400e; border-color: #fde68a; }
    .pill-completed { background: #dcfce7; color: #166534; border-color: #bbf7d0; }
    .pill-canceled  { background: #fee2e2; color: #991b1b; border-color: #fecaca; }
    .pill-confirmed { background: #ccfbf1; color: #065f46; border-color: #99f6e4; }
    .pill-today     { background: rgba(0,209,209,0.12); color: #007a7a; border-color: rgba(0,209,209,0.3); }

    /* ── CARD VIEW ── */
    .db-cards-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(260px, 1fr)); gap: 14px; padding: 16px; background: #f7fafa; }
    .db-card {
      background: #ffffff; border-radius: 12px; border: 1px solid #eef2f3;
      cursor: pointer; transition: all 0.2s ease; overflow: hidden;
      border-left: 3px solid transparent;
    }
    .db-card:hover { box-shadow: 0 6px 20px rgba(0,48,56,0.1); transform: translateY(-2px); border-color: #d0dfe1; }
    .db-card-body { padding: 14px 16px; }
    .db-card-badges { display: flex; gap: 5px; margin-bottom: 10px; flex-wrap: wrap; }
    .db-card-name { font-size: 14px; font-weight: 800; color: #1d4ed8; margin-bottom: 3px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .db-card-company { font-size: 11px; color: #8ca4a8; display: flex; align-items: center; gap: 4px; margin-bottom: 12px; }
    .db-card-info-row {
      display: flex; align-items: center; justify-content: space-between;
      background: #f7fafa; border-radius: 8px; border: 1px solid #eef2f3;
      padding: 10px 12px; margin-bottom: 8px;
    }
    .db-card-info-left { display: flex; align-items: center; gap: 10px; }
    .db-card-info-icon { width: 30px; height: 30px; border-radius: 7px; background: #eef2f3; display: flex; align-items: center; justify-content: center; }
    .db-card-date { font-size: 12px; font-weight: 700; color: #1d4ed8; }
    .db-card-dow { font-size: 9px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; color: #8ca4a8; margin-top: 2px; }
    .db-card-time { font-size: 12px; font-weight: 700; color: #1d4ed8; text-align: right; }
    .db-card-dur { font-size: 9px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; color: #8ca4a8; text-align: right; margin-top: 2px; }
    .db-card-venue { display: flex; align-items: center; gap: 6px; font-size: 11px; color: #8ca4a8; padding: 0 2px; }
    .db-card-footer {
      display: flex; align-items: center; justify-content: space-between;
      padding: 9px 16px; background: #f7fafa; border-top: 1px solid #eef2f3;
    }
    .db-card-id { font-size: 10px; font-weight: 700; color: #8ca4a8; display: flex; align-items: center; gap: 4px; text-transform: uppercase; letter-spacing: 0.04em; }
    .db-card-att { font-size: 10px; font-weight: 700; color: #64868c; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; max-width: 110px; }

    /* ── PAGINATION ── */
    .db-pagination { display: flex; align-items: center; justify-content: space-between; padding: 12px 16px; border-top: 1px solid #eef2f3; }
    .db-pagination-info { font-size: 12px; font-weight: 600; color: #8ca4a8; }
    .db-pagination-info b { color: #1d4ed8; font-weight: 700; }
    .db-page-btns { display: flex; align-items: center; gap: 4px; }
    .db-page-btn {
      width: 30px; height: 30px; border-radius: 7px; border: 1px solid #eef2f3;
      background: hsl(var(--card)); color: hsl(var(--muted-foreground));
      display: flex; align-items: center; justify-content: center;
      font-size: 12px; font-weight: 700; cursor: pointer; transition: all 0.12s ease;
    }
    .db-page-btn:hover:not(:disabled) { background: hsl(var(--primary)); color: hsl(var(--primary-foreground)); border-color: hsl(var(--primary)); }
    .db-page-btn.active { background: hsl(var(--primary)); color: hsl(var(--primary-foreground)); border-color: transparent; box-shadow: 0 2px 8px hsl(var(--primary) / 0.25); }
    .db-page-btn:disabled { opacity: 0.35; cursor: not-allowed; }

    /* ── DETAIL DIALOG ── */
    .db-dialog { border-radius: 14px !important; border: 1px solid #eef2f3 !important; overflow: hidden; box-shadow: 0 20px 60px rgba(0,48,56,0.15) !important; }
    .db-dialog-header { padding: 20px 24px; background: #f7fafa; border-bottom: 1px solid #eef2f3; }
    .db-dialog-id { font-size: 10px; font-weight: 700; color: #8ca4a8; text-transform: uppercase; letter-spacing: 0.06em; margin-bottom: 6px; display: flex; align-items: center; gap: 6px; }
    .db-dialog-name { font-size: 20px; font-weight: 800; color: #1d4ed8; letter-spacing: -0.02em; }
    .db-dialog-company { font-size: 13px; color: #64868c; display: flex; align-items: center; gap: 5px; margin-top: 4px; }
    .db-dialog-body { display: grid; grid-template-columns: 1fr; max-height: 55vh; overflow: hidden; }
    @media (min-width: 768px) { .db-dialog-body { grid-template-columns: 7fr 5fr; } }
    .db-dialog-left { padding: 20px 24px; overflow-y: auto; }
    .db-dialog-right { padding: 20px 24px; background: #f7fafa; border-top: 1px solid #eef2f3; overflow-y: auto; }
    @media (min-width: 768px) { .db-dialog-right { border-top: none; border-left: 1px solid #eef2f3; } }
    .db-section-label { font-size: 9px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.07em; color: #8ca4a8; margin-bottom: 10px; margin-top: 18px; }
    .db-section-label:first-child { margin-top: 0; }
    .db-agenda-box { font-size: 13px; font-weight: 500; color: #64868c; background: #f7fafa; border: 1px solid #eef2f3; border-radius: 10px; padding: 14px 16px; line-height: 1.6; white-space: pre-wrap; }
    .db-meta-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 14px 20px; }
    .db-meta-label { font-size: 9px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.06em; color: #8ca4a8; margin-bottom: 4px; }
    .db-meta-value { font-size: 13px; font-weight: 700; color: #1d4ed8; }
    .db-meta-value a { color: #00a3a3; text-decoration: none; }
    .db-meta-value a:hover { text-decoration: underline; }
    .db-participant {
      display: flex; align-items: center; gap: 10px;
      padding: 12px 14px; border-radius: 10px;
      background: #ffffff; border: 1px solid #eef2f3;
    }
    .db-participant-avatar {
      width: 38px; height: 38px; border-radius: 9px;
      display: flex; align-items: center; justify-content: center;
      font-size: 12px; font-weight: 800;
      flex-shrink: 0;
    }
    .db-participant-internal { background: linear-gradient(135deg, #1d4ed8, #00505e); color: #fff; }
    .db-participant-external { background: #eef2f3; color: #64868c; }
    .db-participant-name { font-size: 13px; font-weight: 700; color: #1d4ed8; }
    .db-participant-role { font-size: 9px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; color: #8ca4a8; margin-top: 2px; }

    .db-contact-box { background: #ffffff; border-radius: 10px; border: 1px solid #eef2f3; overflow: hidden; }
    .db-contact-row { display: flex; align-items: center; justify-content: space-between; padding: 10px 14px; border-bottom: 1px solid #f5f8f9; }
    .db-contact-row:last-child { border-bottom: none; }
    .db-contact-label { font-size: 11px; font-weight: 600; color: #8ca4a8; }
    .db-contact-value { font-size: 12px; font-weight: 700; color: #1d4ed8; }

    .db-sync-box { border-radius: 10px; border: 1px solid; display: flex; align-items: flex-start; gap: 10px; padding: 12px 14px; }
    .db-sync-icon { width: 34px; height: 34px; border-radius: 8px; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
    .db-sync-title { font-size: 13px; font-weight: 700; }
    .db-sync-sub { font-size: 11px; margin-top: 3px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }

    /* ── DIALOG FOOTER ACTIONS ── */
    .db-dialog-footer { display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 8px; padding: 12px 18px; border-top: 1px solid #eef2f3; background: #ffffff; }
    .db-action-group { display: flex; align-items: center; gap: 6px; flex-wrap: wrap; }
    .db-action-btn {
      display: inline-flex; align-items: center; gap: 5px;
      padding: 6px 12px; font-size: 11px; font-weight: 700;
      border-radius: 7px; border: 1px solid; cursor: pointer;
      transition: all 0.15s ease; font-family: 'Inter', sans-serif;
      white-space: nowrap;
    }
    .db-action-btn:disabled { opacity: 0.5; cursor: not-allowed; }
    .db-action-confirm { background: hsl(var(--primary)); color: hsl(var(--primary-foreground)); border-color: hsl(var(--primary)); }
    .db-action-confirm:hover:not(:disabled) { background: hsl(var(--primary) / 0.92); }
    .db-action-done { background: hsl(var(--primary)); color: hsl(var(--primary-foreground)); border-color: transparent; box-shadow: 0 2px 8px hsl(var(--primary) / 0.22); }
    .db-action-done:hover:not(:disabled) { box-shadow: 0 4px 14px hsl(var(--primary) / 0.3); }
    .db-action-neutral { background: hsl(var(--card)); color: hsl(var(--muted-foreground)); border-color: hsl(var(--border)); }
    .db-action-neutral:hover:not(:disabled) { background: hsl(var(--secondary)); color: hsl(var(--foreground)); border-color: hsl(var(--ring) / 0.35); }
    .db-action-danger { background: hsl(var(--destructive) / 0.08); color: hsl(var(--destructive)); border-color: hsl(var(--destructive) / 0.24); }
    .db-action-danger:hover:not(:disabled) { background: hsl(var(--destructive) / 0.14); }
    .db-action-close { background: transparent; color: hsl(var(--muted-foreground)); border-color: transparent; }
    .db-action-close:hover { background: hsl(var(--secondary)); color: hsl(var(--foreground)); border-color: hsl(var(--border)); }

    /* ── FORM DIALOGS ── */
    .db-form-dialog { border-radius: 14px !important; border: 1px solid #eef2f3 !important; background: #ffffff !important; box-shadow: 0 16px 48px rgba(0,48,56,0.12) !important; }
    .db-form-title { font-size: 16px; font-weight: 800; color: #1d4ed8; display: flex; align-items: center; gap: 8px; }
    .db-field-label { font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.06em; color: #8ca4a8; display: block; margin-bottom: 6px; }
    .db-input {
      width: 100%; height: 38px; padding: 0 12px;
      font-size: 13px; font-weight: 500; font-family: 'Inter', sans-serif;
      border: 1px solid #e2e8e9; border-radius: 8px;
      background: #ffffff; color: #1d4ed8; outline: none;
      transition: all 0.15s ease; box-sizing: border-box;
    }
    .db-input:focus { border-color: hsl(var(--ring)); box-shadow: 0 0 0 3px hsl(var(--ring) / 0.14); }
    .db-textarea {
      width: 100%; padding: 10px 12px; min-height: 80px;
      font-size: 13px; font-weight: 500; font-family: 'Inter', sans-serif;
      border: 1px solid #e2e8e9; border-radius: 8px;
      background: #ffffff; color: #1d4ed8; outline: none; resize: vertical;
      transition: all 0.15s ease; box-sizing: border-box;
    }
    .db-textarea:focus { border-color: hsl(var(--ring)); box-shadow: 0 0 0 3px hsl(var(--ring) / 0.14); }
    .db-select-trigger {
      width: 100%; height: 38px; padding: 0 12px;
      font-size: 13px; font-weight: 500; font-family: 'Inter', sans-serif;
      border: 1px solid #e2e8e9; border-radius: 8px;
      background: #ffffff; color: #1d4ed8;
    }
    .db-form-footer { display: flex; gap: 8px; margin-top: 20px; }
    .db-form-cancel { flex: 1; height: 38px; border-radius: 8px; border: 1px solid hsl(var(--border)); background: hsl(var(--secondary)); color: hsl(var(--muted-foreground)); font-size: 13px; font-weight: 700; cursor: pointer; font-family: 'Inter', sans-serif; transition: all 0.15s ease; }
    .db-form-cancel:hover { background: hsl(var(--accent)); color: hsl(var(--foreground)); }
    .db-form-submit { flex: 1; height: 38px; border-radius: 8px; border: none; background: hsl(var(--primary)); color: hsl(var(--primary-foreground)); font-size: 13px; font-weight: 700; cursor: pointer; font-family: 'Inter', sans-serif; box-shadow: 0 3px 10px hsl(var(--primary) / 0.22); transition: all 0.2s ease; }
    .db-form-submit:hover:not(:disabled) { box-shadow: 0 5px 14px hsl(var(--primary) / 0.3); }
    .db-form-submit:disabled { opacity: 0.55; cursor: not-allowed; }

    /* ── EMPTY STATE ── */
    .db-empty { padding: 60px 20px; text-align: center; color: #8ca4a8; }
    .db-empty-icon { width: 48px; height: 48px; border-radius: 12px; background: #f0f4f5; margin: 0 auto 12px; display: flex; align-items: center; justify-content: center; }
    .db-empty-title { font-size: 14px; font-weight: 700; color: #64868c; margin-bottom: 4px; }
    .db-empty-sub { font-size: 12px; color: #8ca4a8; }

    /* ── CAL STATUS DOT ── */
    .cal-status { display: flex; align-items: center; gap: 7px; padding: 7px 13px; border-radius: 8px; border: 1px solid #eef2f3; background: #ffffff; font-size: 11px; font-weight: 700; color: #64868c; }
    .cal-dot { width: 8px; height: 8px; border-radius: 50%; }
    .cal-dot-connected { background: #22c55e; box-shadow: 0 0 0 3px rgba(34,197,94,0.2); }
    .cal-dot-disconnected { background: #ef4444; box-shadow: 0 0 0 3px rgba(239,68,68,0.2); }

    /* delete dialog */
    .db-delete-dialog { border-radius: 14px !important; border: 1px solid #eef2f3 !important; background: #ffffff !important; box-shadow: 0 16px 48px rgba(0,48,56,0.12) !important; max-width: 380px !important; }

    /* ── CONTENT TYPE SWITCHER ── */
    .db-content-switcher { display:flex; align-items:center; gap:6px; padding:4px; background:hsl(var(--secondary)); border-radius:10px; }
    .db-content-btn { padding:6px 14px; font-size:12px; font-weight:700; border-radius:7px; border:none; cursor:pointer; transition:all .15s ease; color:hsl(var(--muted-foreground)); background:transparent; display:flex; align-items:center; gap:6px; }
    .db-content-btn:hover { color:hsl(var(--foreground)); background:hsl(var(--accent)); }
    .db-content-btn.active { background:hsl(var(--card)); color:hsl(var(--primary)); box-shadow:0 1px 4px rgba(0,0,0,.08); }
    .db-content-btn.active.ct-meetings,
    .db-content-btn.active.ct-events,
    .db-content-btn.active.ct-all { color:hsl(var(--primary)); }

    /* events inline table rows */
    .ev-type-chip { display:inline-flex;align-items:center;gap:4px;padding:2px 7px;border-radius:4px;font-size:9px;font-weight:700;letter-spacing:.04em;text-transform:uppercase; }
    .pill-event-upcoming  { background:#ede9fe; color:#5b21b6; border:1px solid #ddd6fe; }
    .pill-event-confirmed { background:#ccfbf1; color:#065f46; border:1px solid #99f6e4; }
    .pill-event-completed { background:#dcfce7; color:#166534; border:1px solid #bbf7d0; }
    .pill-event-cancelled { background:#fee2e2; color:#991b1b; border:1px solid #fecaca; }
  `}</style>
);

// ── HELPERS ──────────────────────────────────────────────────────
const ADMIN_ROLES = new Set(['admin', 'super_admin', 'administrator']);
function parseBclAttendees(value: any): string[] {
  if (Array.isArray(value)) return value.map(String);
  if (typeof value === 'string' && value.trim()) {
    try { const p = JSON.parse(value); if (Array.isArray(p)) return p.map(String); } catch { }
    return [value.trim()];
  }
  return [];
}
function addMinutesToTime(time: string, minutes: number): string {
  const [h, m] = time.split(':').map(Number);
  const total = h * 60 + m + minutes;
  return `${String(Math.floor(total / 60) % 24).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`;
}
const initials = (n: string) => n?.split(' ').map(c => c[0]).join('').slice(0, 2).toUpperCase() ?? '??';

function getPillClass(status: string) {
  const s = status?.toLowerCase();
  if (s === 'upcoming') return 'pill pill-upcoming';
  if (s === 'rescheduled') return 'pill pill-rescheduled';
  if (s === 'pending') return 'pill pill-pending';
  if (s === 'completed') return 'pill pill-completed';
  if (s === 'canceled' || s === 'cancelled') return 'pill pill-canceled';
  if (s === 'confirmed') return 'pill pill-confirmed';
  if (s === 'today') return 'pill pill-today';
  return 'pill pill-upcoming';
}

function getCardAccent(status: string) {
  const s = status?.toLowerCase();
  if (s === 'upcoming') return '#0284c7';
  if (s === 'rescheduled') return '#7c3aed';
  if (s === 'pending') return '#f59e0b';
  if (s === 'completed') return '#22c55e';
  if (s === 'canceled' || s === 'cancelled') return '#ef4444';
  return '#00d1d1';
}

// ── APPOINTMENT CARD ─────────────────────────────────────────────
const AppointmentCard = ({ appointment, onClick }) => {
  const displayStatus = (() => {
    const now = new Date();
    const mtgDate = new Date(`${appointment.meeting_date}T${appointment.meeting_start_time || '00:00'}`);
    if (['upcoming', 'rescheduled'].includes(appointment.status) && now > mtgDate) return 'pending';
    return appointment.status;
  })();
  const attendeeName = appointment.bcl_attendee_name || parseBclAttendees(appointment.bcl_attendee)[0] || '—';
  const accent = getCardAccent(displayStatus);

  return (
    <div className="db-card" style={{ borderLeftColor: accent }} onClick={onClick}>
      <div className="db-card-body">
        <div className="db-card-badges">
          <span className={getPillClass(displayStatus)}>{displayStatus}</span>
          {appointment.badge_status && (
            <span className={getPillClass(appointment.badge_status)}>{appointment.badge_status}</span>
          )}
        </div>
        <div className="db-card-name">{appointment.client_name}</div>
        <div className="db-card-company">
          <Globe size={11} />{appointment.client_company || 'Independent Client'}
        </div>
        <div className="db-card-info-row">
          <div className="db-card-info-left">
            <div className="db-card-info-icon"><Calendar size={14} style={{ color: '#64868c' }} /></div>
            <div>
              <div className="db-card-date">
                {new Date(appointment.meeting_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
              </div>
              <div className="db-card-dow">
                {new Date(appointment.meeting_date).toLocaleDateString('en-GB', { weekday: 'short' })}
              </div>
            </div>
          </div>
          <div>
            <div className="db-card-time">{formatTime(appointment.meeting_start_time)}</div>
            <div className="db-card-dur">{appointment.meeting_duration}m</div>
          </div>
        </div>
        <div className="db-card-venue">
          {appointment.meeting_type === 'virtual' ? <Video size={12} /> : <MapPin size={12} />}
          {appointment.meeting_venue_area || (appointment.meeting_type === 'virtual' ? 'Virtual' : 'TBD')}
        </div>
      </div>
      <div className="db-card-footer">
        <div className="db-card-id"><Hash size={10} />{appointment.id_main}</div>
        <div className="db-card-att">{attendeeName}</div>
      </div>
    </div>
  );
};

// ── MAIN DASHBOARD ───────────────────────────────────────────────
const DashboardContent = () => {
  const searchParams = useSearchParams();
  const router = useRouter();
  const scope = searchParams.get('scope') ?? 'all';
  const statusParam = searchParams.get('status');

  const [appointments, setAppointments] = useState([]);
  const [allEvents, setAllEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedAppointment, setSelectedAppointment] = useState(null);
  const [activeTab, setActiveTab] = useState(statusParam ?? 'upcoming');
  const [contentType, setContentType] = useState<'meetings' | 'events' | 'all'>('meetings');
  const [calendarConnectionStatus, setCalendarConnectionStatus] = useState('checking');
  const [currentUserId, setCurrentUserId] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [currentPage, setCurrentPage] = useState(0);
  const [itemsPerPage] = useState(12);
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState('table');
  const { toast } = useToast();
  const [actionLoading, setActionLoading] = useState('');
  const [isDeleteOpen, setDeleteOpen] = useState(false);
  const [isRescheduleOpen, setRescheduleOpen] = useState(false);
  const [isEditOpen, setEditOpen] = useState(false);
  const [rescheduleData, setRescheduleData] = useState({ meeting_date: '', meeting_start_time: '', meeting_duration: '60' });
  const [editData, setEditData] = useState({ client_name: '', client_company: '', client_mobile: '', meeting_date: '', meeting_start_time: '', meeting_duration: '60', meeting_type: 'inPerson', meeting_venue_area: '', meeting_agenda: '' });

  const notify = {
    success: (title: string, desc?: string) => toast({ title, description: desc }),
    error: (title: string, desc?: string) => toast({ variant: 'destructive', title, description: desc }),
  };

  useEffect(() => { if (statusParam) setActiveTab(statusParam); }, [statusParam]);

  useEffect(() => {
    const init = async () => {
      setLoading(true);
      try {
        const [userRes, meetingsRes, eventsRes, calRes] = await Promise.all([
          fetch('/api/users/me'),
          fetch('/api/meetings'),
          fetch('/api/events'),
          fetch('/api/auth/google/status'),
        ]);
        if (userRes.ok) {
          const me = await userRes.json();
          setCurrentUserId(me.id);
          setIsAdmin(ADMIN_ROLES.has((me.role ?? '').toLowerCase()));
        }
        if (meetingsRes.ok) {
          const data = await meetingsRes.json();
          setAppointments(Array.isArray(data) ? data : []);
        }
        if (eventsRes.ok) {
          const data = await eventsRes.json();
          setAllEvents(Array.isArray(data) ? data : []);
        }
        const calStatus = await calRes.json();
        setCalendarConnectionStatus(calStatus.connected ? 'connected' : 'disconnected');
      } catch (err) { console.error(err); }
      finally { setLoading(false); }
    };
    init();
    const handleResize = () => setViewMode(window.innerWidth < 1024 ? 'cards' : 'table');
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const checkAppointmentStatus = (app: any) => {
    const now = new Date();
    const mtgDate = new Date(`${app.meeting_date}T${app.meeting_start_time || '00:00'}`);
    if (['upcoming', 'rescheduled'].includes(app.status) && now > mtgDate) return { ...app, status: 'pending' };
    return app;
  };

  const patchMeeting = useCallback(async (id: number, payload: object) => {
    const res = await fetch(`/api/meetings/${id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
    if (!res.ok) throw new Error((await res.json()).error || 'Request failed');
    return res.json();
  }, []);

  const updateLocal = useCallback((id: number, patch: object) => {
    setAppointments(prev => prev.map(a => a.id_main === id ? { ...a, ...patch } : a));
    setSelectedAppointment(prev => prev && prev.id_main === id ? { ...prev, ...patch } : prev);
  }, []);

  const handleCancel = async () => {
    if (!selectedAppointment) return;
    setActionLoading('cancel');
    try { await patchMeeting(selectedAppointment.id_main, { status: 'canceled' }); updateLocal(selectedAppointment.id_main, { status: 'canceled' }); notify.success('Meeting Cancelled'); setSelectedAppointment(null); }
    catch (e: any) { notify.error('Failed to cancel', e.message); }
    finally { setActionLoading(''); }
  };

  const handleConfirm = async () => {
    if (!selectedAppointment) return;
    setActionLoading('confirm');
    try { await patchMeeting(selectedAppointment.id_main, { badge_status: 'Confirmed' }); updateLocal(selectedAppointment.id_main, { badge_status: 'Confirmed' }); notify.success('Meeting Confirmed'); }
    catch (e: any) { notify.error('Failed to confirm', e.message); }
    finally { setActionLoading(''); }
  };

  const handleMarkDone = async () => {
    if (!selectedAppointment) return;
    setActionLoading('done');
    try { await patchMeeting(selectedAppointment.id_main, { status: 'completed' }); updateLocal(selectedAppointment.id_main, { status: 'completed' }); notify.success('Marked as done'); setSelectedAppointment(null); }
    catch (e: any) { notify.error('Failed', e.message); }
    finally { setActionLoading(''); }
  };

  const handleSyncToCalendar = async () => {
    if (!selectedAppointment) return;
    setActionLoading('sync');
    try {
      const res = await fetch('/api/sync-to-calendar', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(selectedAppointment) });
      if (!res.ok) throw new Error((await res.json()).error || 'Sync failed');
      const { eventId } = await res.json();
      if (eventId) updateLocal(selectedAppointment.id_main, { google_event_id: eventId });
      notify.success('Synced to Google Calendar');
    } catch (e: any) { notify.error('Sync failed', e.message); }
    finally { setActionLoading(''); }
  };

  const handleDeletePermanently = async () => {
    if (!selectedAppointment) return;
    setActionLoading('delete');
    try {
      const res = await fetch(`/api/meetings/${selectedAppointment.id_main}`, { method: 'DELETE' });
      if (!res.ok) throw new Error((await res.json()).error || 'Delete failed');
      setAppointments(prev => prev.filter(a => a.id_main !== selectedAppointment.id_main));
      setSelectedAppointment(null); setDeleteOpen(false);
      notify.success('Meeting deleted permanently');
    } catch (e: any) { notify.error('Delete failed', e.message); }
    finally { setActionLoading(''); }
  };

  const handleReschedule = async () => {
    if (!selectedAppointment) return;
    setActionLoading('reschedule');
    try {
      const duration = parseInt(rescheduleData.meeting_duration) || 60;
      const endTime = addMinutesToTime(rescheduleData.meeting_start_time, duration);
      const patch = { status: 'rescheduled', meeting_date: rescheduleData.meeting_date, meeting_start_time: rescheduleData.meeting_start_time, meeting_end_time: endTime, meeting_duration: duration };
      await patchMeeting(selectedAppointment.id_main, patch); updateLocal(selectedAppointment.id_main, patch);
      setRescheduleOpen(false); notify.success('Meeting rescheduled');
    } catch (e: any) { notify.error('Reschedule failed', e.message); }
    finally { setActionLoading(''); }
  };

  const handleEdit = async () => {
    if (!selectedAppointment) return;
    setActionLoading('edit');
    try {
      const duration = parseInt(editData.meeting_duration) || 60;
      const endTime = addMinutesToTime(editData.meeting_start_time, duration);
      const patch = { ...editData, meeting_end_time: endTime, meeting_duration: duration };
      await patchMeeting(selectedAppointment.id_main, patch); updateLocal(selectedAppointment.id_main, patch);
      setEditOpen(false); notify.success('Meeting updated');
    } catch (e: any) { notify.error('Update failed', e.message); }
    finally { setActionLoading(''); }
  };

  const openEdit = () => {
    if (!selectedAppointment) return;
    setEditData({ client_name: selectedAppointment.client_name || '', client_company: selectedAppointment.client_company || '', client_mobile: selectedAppointment.client_mobile || '', meeting_date: selectedAppointment.meeting_date || '', meeting_start_time: selectedAppointment.meeting_start_time || '', meeting_duration: String(selectedAppointment.meeting_duration || 60), meeting_type: selectedAppointment.meeting_type || 'inPerson', meeting_venue_area: selectedAppointment.meeting_venue_area || '', meeting_agenda: selectedAppointment.meeting_agenda || '' });
    setEditOpen(true);
  };

  const openReschedule = () => {
    if (!selectedAppointment) return;
    setRescheduleData({ meeting_date: selectedAppointment.meeting_date || '', meeting_start_time: selectedAppointment.meeting_start_time || '', meeting_duration: String(selectedAppointment.meeting_duration || 60) });
    setRescheduleOpen(true);
  };

  const scopedAppointments = useMemo(() => {
    let filtered = isAdmin || scope === 'all' ? appointments
      : scope === 'created' ? appointments.filter(a => a.created_by === currentUserId)
        : appointments.filter(a => parseBclAttendees(a.bcl_attendee).includes(currentUserId));
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      filtered = filtered.filter(a => a.client_name?.toLowerCase().includes(q) || a.client_company?.toLowerCase().includes(q) || String(a.id_main).includes(q));
    }
    return filtered;
  }, [appointments, scope, currentUserId, isAdmin, searchQuery]);

  const activeAppointments = useMemo(() => {
    const todayStr = new Date().toISOString().split('T')[0];
    const filtered = scopedAppointments.map(checkAppointmentStatus);
    switch (activeTab) {
      case 'today': return filtered.filter(a => a.meeting_date === todayStr);
      case 'pending': return filtered.filter(a => a.status === 'pending');
      case 'canceled': return filtered.filter(a => a.status === 'canceled');
      case 'completed': return filtered.filter(a => a.status === 'completed');
      default: return filtered.filter(a => ['upcoming', 'rescheduled'].includes(a.status));
    }
  }, [scopedAppointments, activeTab]);

  // ── Events filtering (mirrors meetings logic) ───────────────────────────
  const activeEvents = useMemo(() => {
    const todayStr = new Date().toISOString().split('T')[0];
    let list = allEvents;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      list = list.filter((e: any) => e.event_name?.toLowerCase().includes(q) || e.organizer_name?.toLowerCase().includes(q) || String(e.id).includes(q));
    }
    switch (activeTab) {
      case 'today': return list.filter((e: any) => e.event_date === todayStr);
      case 'pending': return list.filter((e: any) => e.status === 'upcoming');
      case 'completed': return list.filter((e: any) => e.status === 'completed');
      case 'canceled': return list.filter((e: any) => e.status === 'cancelled');
      default: return list.filter((e: any) => ['upcoming', 'confirmed'].includes(e.status ?? 'upcoming'));
    }
  }, [allEvents, activeTab, searchQuery]);

  // ── Combined list for "All" tab ─────────────────────────────────────────
  const combinedList = useMemo(() => {
    const mtg = activeAppointments.map((a: any) => ({ ...a, _kind: 'meeting' }));
    const evs = activeEvents.map((e: any) => ({ ...e, _kind: 'event' }));
    return [...mtg, ...evs].sort((a: any, b: any) => {
      const da = a.meeting_date ?? a.event_date ?? '';
      const db2 = b.meeting_date ?? b.event_date ?? '';
      return da.localeCompare(db2) || (a.meeting_start_time ?? a.event_start_time ?? '').localeCompare(b.meeting_start_time ?? b.event_start_time ?? '');
    });
  }, [activeAppointments, activeEvents]);

  const activeList = contentType === 'meetings' ? activeAppointments
    : contentType === 'events' ? activeEvents
      : combinedList;

  const paginated = activeList.slice(currentPage * itemsPerPage, (currentPage + 1) * itemsPerPage);
  const totalPages = Math.ceil(activeList.length / itemsPerPage);

  const apt = selectedAppointment;
  const displayApt = apt ? checkAppointmentStatus(apt) : null;
  const attendeeName = apt ? (apt.bcl_attendee_name || parseBclAttendees(apt.bcl_attendee)[0] || '—') : '—';
  const canChangeStatus = displayApt && !['canceled', 'completed'].includes(displayApt.status);

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '80vh' }}>
      <div style={{ width: 48, height: 48, borderRadius: 12, background: 'linear-gradient(135deg,#1d4ed8,#00505e)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Loader2 size={22} color="#00d1d1" className="animate-spin" />
      </div>
    </div>
  );

  return (
    <div className="db-shell">
      <DashboardStyles />
      <Toaster />

      {/* HEADER */}
      <div className="db-header">
        <div>
          <div className="db-title">Meetings & Schedule</div>
          <div className="db-subtitle">Manage your client engagements, events and team schedule</div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {/* Content type switcher */}
          <div className="db-content-switcher">
            {([
              { id: 'meetings', label: 'Meetings', icon: Calendar },
              { id: 'events', label: 'Events', icon: PartyPopper },
              { id: 'all', label: 'All', icon: Users },
            ] as const).map(({ id, label, icon: Icon }) => (
              <Button key={id} className={`db-content-btn h-auto ${contentType === id ? `active ct-${id}` : ''}`}
                onClick={() => { setContentType(id); setCurrentPage(0); }}>
                <Icon size={13} /> {label}
              </Button>
            ))}
          </div>
          <div className="cal-status">
            <div className={`cal-dot ${calendarConnectionStatus === 'connected' ? 'cal-dot-connected' : 'cal-dot-disconnected'}`} />
            Calendar {calendarConnectionStatus}
          </div>
          <Button className="db-btn-outline h-auto" onClick={() => { }}>
            <Download size={13} /> Export
          </Button>
          {contentType === 'events'
            ? <Button className="db-btn-primary h-auto" onClick={() => router.push('/events')}><Plus size={14} /> New Event</Button>
            : <Button className="db-btn-primary h-auto" onClick={() => router.push('/schedule')}><Plus size={14} /> New Meeting</Button>
          }
        </div>
      </div>

      {/* MAIN PANEL */}
      <div className="db-panel">
        {/* TOOLBAR */}
        <div className="db-toolbar">
          <div className="db-tabs">
            {['upcoming', 'today', 'pending', 'completed', 'canceled'].map(tab => (
              <Button key={tab} className={`db-tab h-auto ${activeTab === tab ? `active tab-${tab}` : ''}`}
                onClick={() => { setActiveTab(tab); setCurrentPage(0); }}>
                {tab}
              </Button>
            ))}
          </div>
          <div className="db-toolbar-right">
            <div className="db-search-wrap">
              <Search size={14} className="db-search-icon" />
              <Input className="db-search" placeholder="Search clients or ID…"
                value={searchQuery} onChange={e => { setSearchQuery(e.target.value); setCurrentPage(0); }} />
            </div>
            <div className="db-view-toggle">
              <Button className={`db-view-btn h-auto ${viewMode === 'table' ? 'active' : ''}`} onClick={() => setViewMode('table')}>
                <Table2 size={12} /> Table
              </Button>
              <Button className={`db-view-btn h-auto ${viewMode === 'cards' ? 'active' : ''}`} onClick={() => setViewMode('cards')}>
                <LayoutGrid size={12} /> Grid
              </Button>
            </div>
          </div>
        </div>

        {/* LIST */}
        {viewMode === 'table' ? (
          <div className="db-table-wrap">
            <table className="db-table">
              <thead>
                <tr>
                  <th style={{ width: 40, paddingLeft: 18 }}></th>
                  {contentType === 'all' && <th style={{ width: 70 }}>Type</th>}
                  <th>{contentType === 'events' ? 'Event' : 'Meeting & Client'}</th>
                  <th>Date</th>
                  <th>Time</th>
                  <th>{contentType === 'events' ? 'Organizer' : 'Attendee'}</th>
                  <th>Status</th>
                  <th style={{ width: 80, textAlign: 'right', paddingRight: 16 }}></th>
                </tr>
              </thead>
              <tbody>
                {paginated.length > 0 ? paginated.map((row: any) => {
                  const isMtg = row._kind !== 'event' && !row.event_name;
                  const rowKey = isMtg ? `m-${row.id_main}` : `e-${row.id}`;
                  const name = isMtg
                    ? (row.bcl_attendee_name || parseBclAttendees(row.bcl_attendee)[0] || '—')
                    : (row.organizer_name || '—');
                  const date = isMtg ? row.meeting_date : row.event_date;
                  const startTime = isMtg ? row.meeting_start_time : row.event_start_time;
                  const title = isMtg ? (row.meeting_agenda || `${row.client_name} Meeting`) : row.event_name;
                  const subtitle = isMtg ? `#${row.id_main} · ${row.client_name}` : `#${row.id} · ${row.event_type}`;
                  const status = row.status ?? 'upcoming';

                  return (
                    <tr key={rowKey} onClick={() => isMtg ? setSelectedAppointment(row) : router.push('/events')}>
                      <td style={{ paddingLeft: 18 }}>
                        <div style={{ width: 16, height: 16, borderRadius: 4, border: '1.5px solid #d0dfe1', background: '#fff' }} />
                      </td>
                      {contentType === 'all' && (
                        <td>
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '2px 7px', borderRadius: 4, fontSize: 9, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em', background: isMtg ? '#e0f2fe' : '#ede9fe', color: isMtg ? '#0284c7' : '#7c3aed' }}>
                            {isMtg ? <Video size={9} /> : <PartyPopper size={9} />}
                            {isMtg ? 'Mtg' : 'Evt'}
                          </span>
                        </td>
                      )}
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          {isMtg
                            ? <div className={`db-type-icon ${row.meeting_type === 'virtual' ? 'db-type-virtual' : 'db-type-physical'}`}>{row.meeting_type === 'virtual' ? <Video size={15} /> : <MapPin size={15} />}</div>
                            : <div style={{ width: 36, height: 36, borderRadius: 9, background: '#ede9fe', color: '#7c3aed', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><PartyPopper size={15} /></div>
                          }
                          <div>
                            <div className="db-cell-main">{title}</div>
                            <div className="db-cell-sub">{subtitle}</div>
                          </div>
                        </div>
                      </td>
                      <td><div className="db-cell-date">{new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</div></td>
                      <td><div className="db-cell-time"><Clock size={12} />{formatTime(startTime)}</div></td>
                      <td>
                        <div className="db-attendee">
                          <div className="db-avatar-sm">{initials(name)}</div>
                          <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: 120 }}>{name}</span>
                        </div>
                      </td>
                      <td><span className={getPillClass(status)}>{status}</span></td>
                      <td style={{ textAlign: 'right', paddingRight: 12 }} onClick={e => e.stopPropagation()}>
                        <div className="db-row-actions">
                          {isMtg && row.google_meet_link && (
                            <Button className="db-row-btn" style={{ color: '#7c3aed' }} onClick={() => window.open(row.google_meet_link, '_blank')} title="Join meeting"><Video size={14} /></Button>
                          )}
                          <Button className="db-row-btn" onClick={() => isMtg ? setSelectedAppointment(row) : router.push('/events')} title="View details">
                            <MoreHorizontal size={14} />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                }) : (
                  <tr>
                    <td colSpan={contentType === 'all' ? 8 : 7}>
                      <div className="db-empty">
                        <div className="db-empty-icon">
                          {contentType === 'events' ? <PartyPopper size={20} color="#8ca4a8" /> : <Calendar size={20} color="#8ca4a8" />}
                        </div>
                        <div className="db-empty-title">No {contentType === 'events' ? 'events' : 'meetings'} found</div>
                        <div className="db-empty-sub">No items match this filter</div>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="db-cards-grid">
            {paginated.map((row: any) => {
              const isMtg = row._kind !== 'event' && !row.event_name;
              return isMtg
                ? <AppointmentCard key={`m-${row.id_main}`} appointment={row} onClick={() => setSelectedAppointment(row)} />
                : (
                  <div key={`e-${row.id}`} className="db-card" style={{ borderLeftColor: '#8b5cf6', cursor: 'pointer' }} onClick={() => router.push('/events')}>
                    <div className="db-card-body">
                      <div className="db-card-badges">
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '3px 9px', borderRadius: 5, fontSize: 10, fontWeight: 700, background: '#ede9fe', color: '#7c3aed', border: '1px solid #ddd6fe' }}>
                          <PartyPopper size={10} /> {row.event_type}
                        </span>
                      </div>
                      <div className="db-card-name">{row.event_name}</div>
                      <div className="db-card-company"><Globe size={11} />{row.organizer_name || 'No organizer'}</div>
                      <div className="db-card-info-row">
                        <div className="db-card-info-left">
                          <div className="db-card-info-icon"><Calendar size={14} style={{ color: '#64868c' }} /></div>
                          <div>
                            <div className="db-card-date">{new Date(row.event_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}</div>
                            <div className="db-card-dow">{new Date(row.event_date).toLocaleDateString('en-GB', { weekday: 'short' })}</div>
                          </div>
                        </div>
                        <div>
                          <div className="db-card-time">{formatTime(row.event_start_time)}</div>
                          {row.event_duration && <div className="db-card-dur">{row.event_duration}m</div>}
                        </div>
                      </div>
                      {row.event_venue_area && <div className="db-card-venue"><MapPin size={12} />{row.event_venue_area}</div>}
                    </div>
                    <div className="db-card-footer">
                      <div className="db-card-id"><Hash size={10} />{row.id}</div>
                      <span className={`pill pill-${row.status ?? 'upcoming'}`}>{row.status ?? 'upcoming'}</span>
                    </div>
                  </div>
                );
            })}
            {paginated.length === 0 && (
              <div style={{ gridColumn: '1/-1' }}>
                <div className="db-empty">
                  <div className="db-empty-icon"><Calendar size={20} color="#8ca4a8" /></div>
                  <div className="db-empty-title">No items found</div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* PAGINATION */}
        <div className="db-pagination">
          <div className="db-pagination-info">
            Showing <b>{activeList.length > 0 ? currentPage * itemsPerPage + 1 : 0}</b> to <b>{Math.min((currentPage + 1) * itemsPerPage, activeList.length)}</b> of <b>{activeList.length}</b>
          </div>
          <div className="db-page-btns">
            <Button className="db-page-btn" onClick={() => setCurrentPage(p => p - 1)} disabled={currentPage === 0}>
              <ChevronLeft size={14} />
            </Button>
            {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
              const page = totalPages <= 5 ? i : Math.max(0, Math.min(currentPage - 2, totalPages - 5)) + i;
              return (
                <Button key={page} className={`db-page-btn ${currentPage === page ? 'active' : ''}`} onClick={() => setCurrentPage(page)}>
                  {page + 1}
                </Button>
              );
            })}
            <Button className="db-page-btn" onClick={() => setCurrentPage(p => p + 1)} disabled={currentPage >= totalPages - 1}>
              <ChevronRight size={14} />
            </Button>
          </div>
        </div>
      </div>

      {/* ── DETAIL DIALOG ── */}
      <Dialog open={!!selectedAppointment} onOpenChange={o => !o && setSelectedAppointment(null)}>
        <DialogContent className="db-dialog" style={{ maxWidth: 820, padding: 0 }}>
          {/* header */}
          <div className="db-dialog-header">
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
              <div>
                <div className="db-dialog-id">
                  <div style={{ width: 22, height: 22, borderRadius: 5, background: '#eef2f3', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 8, fontWeight: 800, color: '#64868c' }}>MTG</div>
                  #{apt?.id_main} · Details
                </div>
                <div className="db-dialog-name">{apt?.client_name}</div>
                <div className="db-dialog-company"><Building size={13} />{apt?.client_company || 'Independent Client'}</div>
              </div>
              <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                {apt?.badge_status && <span className={getPillClass(apt.badge_status)}>{apt.badge_status}</span>}
                {displayApt && <span className={getPillClass(displayApt.status)}>{displayApt.status}</span>}
              </div>
            </div>
          </div>

          {apt && (
            <div className="db-dialog-body">
              {/* LEFT */}
              <div className="db-dialog-left">
                <div className="db-section-label">Agenda & Notes</div>
                <div className="db-agenda-box">{apt.meeting_agenda || 'No specific agenda has been outlined.'}</div>

                <div className="db-section-label">Logistics</div>
                <div className="db-meta-grid">
                  <div>
                    <div className="db-meta-label">Date</div>
                    <div className="db-meta-value">{new Date(apt.meeting_date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}</div>
                  </div>
                  <div>
                    <div className="db-meta-label">Time</div>
                    <div className="db-meta-value">{formatTime(apt.meeting_start_time)} — {formatTime(apt.meeting_end_time)}</div>
                  </div>
                  <div>
                    <div className="db-meta-label">Format</div>
                    <div className="db-meta-value" style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                      {apt.meeting_type === 'virtual' ? <Video size={13} /> : <MapPin size={13} />}
                      <span style={{ textTransform: 'capitalize' }}>{apt.meeting_type}</span>
                    </div>
                  </div>
                  <div>
                    <div className="db-meta-label">Venue / Link</div>
                    <div className="db-meta-value">
                      {apt.google_meet_link
                        ? <a href={apt.google_meet_link} target="_blank" rel="noreferrer">Join Meeting →</a>
                        : apt.meeting_venue_area || 'Not provided'}
                    </div>
                  </div>
                </div>

                <div className="db-section-label">Participants</div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                  <div className="db-participant">
                    <div className="db-participant-avatar db-participant-internal">{initials(attendeeName)}</div>
                    <div>
                      <div className="db-participant-name">{attendeeName}</div>
                      <div className="db-participant-role">Internal</div>
                    </div>
                  </div>
                  <div className="db-participant">
                    <div className="db-participant-avatar db-participant-external">{initials(apt.client_name)}</div>
                    <div>
                      <div className="db-participant-name">{apt.client_name}</div>
                      <div className="db-participant-role">External</div>
                    </div>
                  </div>
                </div>
              </div>

              {/* RIGHT */}
              <div className="db-dialog-right">
                <div className="db-section-label">Contact Info</div>
                <div className="db-contact-box">
                  <div className="db-contact-row">
                    <div className="db-contact-label">Client Mobile</div>
                    <div className="db-contact-value">{apt.client_mobile || '—'}</div>
                  </div>
                  <div className="db-contact-row">
                    <div className="db-contact-label">Staff Mobile</div>
                    <div className="db-contact-value">{apt.bcl_attendee_mobile || '—'}</div>
                  </div>
                </div>

                <div className="db-section-label">Calendar Sync</div>
                <div className="db-sync-box" style={{ borderColor: apt.google_event_id ? '#bbf7d0' : '#eef2f3', background: apt.google_event_id ? '#f0fdf4' : '#ffffff' }}>
                  <div className="db-sync-icon" style={{ background: apt.google_event_id ? '#dcfce7' : '#eef2f3', color: apt.google_event_id ? '#16a34a' : '#8ca4a8' }}>
                    {apt.google_event_id ? <Cloud size={16} /> : <CloudOff size={16} />}
                  </div>
                  <div style={{ minWidth: 0 }}>
                    <div className="db-sync-title" style={{ color: apt.google_event_id ? '#14532d' : '#1d4ed8' }}>{apt.google_event_id ? 'Calendar Synced' : 'Not Synced'}</div>
                    <div className="db-sync-sub" style={{ color: apt.google_event_id ? '#16a34a' : '#8ca4a8' }}>
                      {apt.google_event_id ? `ID: ${apt.google_event_id.slice(0, 10)}…` : 'Not connected to Google Calendar'}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* FOOTER ACTIONS */}
          <div className="db-dialog-footer">
            <div className="db-action-group">
              {canChangeStatus && (
                <Button className="db-action-btn db-action-confirm h-auto" onClick={handleConfirm} disabled={!!actionLoading || apt?.badge_status === 'Confirmed'}>
                  {actionLoading === 'confirm' ? <Loader2 size={12} className="animate-spin" /> : <UserCheck size={12} />} Confirm
                </Button>
              )}
              {canChangeStatus && (
                <Button className="db-action-btn db-action-done h-auto" onClick={handleMarkDone} disabled={!!actionLoading}>
                  {actionLoading === 'done' ? <Loader2 size={12} className="animate-spin" /> : <CheckCircle2 size={12} />} Mark Done
                </Button>
              )}
              {canChangeStatus && (
                <Button className="db-action-btn db-action-neutral h-auto" onClick={openReschedule} disabled={!!actionLoading}>
                  <CalendarClock size={12} /> Reschedule
                </Button>
              )}
              {canChangeStatus && (
                <Button className="db-action-btn db-action-danger h-auto" onClick={handleCancel} disabled={!!actionLoading}>
                  {actionLoading === 'cancel' ? <Loader2 size={12} className="animate-spin" /> : <Ban size={12} />} Cancel
                </Button>
              )}
            </div>
            <div className="db-action-group">
              <Button className="db-action-btn db-action-neutral h-auto" onClick={handleSyncToCalendar} disabled={!!actionLoading || calendarConnectionStatus !== 'connected'}>
                {actionLoading === 'sync' ? <Loader2 size={12} className="animate-spin" /> : <Cloud size={12} />} Sync
              </Button>
              <Button className="db-action-btn db-action-neutral h-auto" onClick={openEdit} disabled={!!actionLoading}>
                <Edit2 size={12} /> Edit
              </Button>
              <Button className="db-action-btn db-action-danger h-auto" onClick={() => setDeleteOpen(true)} disabled={!!actionLoading}>
                <Trash2 size={12} /> Delete
              </Button>
              <Button className="db-action-btn db-action-close h-auto" onClick={() => setSelectedAppointment(null)}>Close</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* DELETE */}
      <AlertDialog open={isDeleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent className="db-delete-dialog" style={{ padding: 24 }}>
          <AlertDialogHeader>
            <div style={{ width: 48, height: 48, borderRadius: 12, background: 'linear-gradient(135deg,#ef4444,#dc2626)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 12, boxShadow: '0 4px 14px rgba(239,68,68,0.3)' }}>
              <Trash2 size={20} color="#fff" />
            </div>
            <AlertDialogTitle style={{ fontFamily: 'Inter,sans-serif', fontSize: 16, fontWeight: 800, color: '#1d4ed8' }}>Delete Permanently</AlertDialogTitle>
            <AlertDialogDescription style={{ fontFamily: 'Inter,sans-serif', fontSize: 13, color: '#64868c', lineHeight: 1.6 }}>
              This will permanently remove the booking for <strong style={{ color: '#1d4ed8' }}>{apt?.client_name}</strong>. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter style={{ marginTop: 16, gap: 8 }}>
            <AlertDialogCancel style={{ flex: 1, height: 38, borderRadius: 8, fontFamily: 'Inter,sans-serif', fontWeight: 700, fontSize: 13, border: '1px solid #eef2f3', background: '#f7fafa', color: '#64868c', cursor: 'pointer' }}>Keep</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeletePermanently} disabled={actionLoading === 'delete'} style={{ flex: 1, height: 38, borderRadius: 8, fontFamily: 'Inter,sans-serif', fontWeight: 700, fontSize: 13, border: 'none', background: 'linear-gradient(135deg,#ef4444,#dc2626)', color: '#fff', cursor: 'pointer', boxShadow: '0 3px 10px rgba(239,68,68,0.3)' }}>
              {actionLoading === 'delete' ? <Loader2 size={14} className="animate-spin" /> : 'Delete Permanently'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* RESCHEDULE */}
      <Dialog open={isRescheduleOpen} onOpenChange={setRescheduleOpen}>
        <DialogContent className="db-form-dialog" style={{ maxWidth: 420, padding: 24 }}>
          <DialogHeader>
            <DialogTitle className="db-form-title"><CalendarClock size={17} color="#00a3a3" /> Reschedule Meeting</DialogTitle>
          </DialogHeader>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14, marginTop: 12 }}>
            <div><label className="db-field-label">New Date</label><Input type="date" className="db-input" value={rescheduleData.meeting_date} onChange={e => setRescheduleData(d => ({ ...d, meeting_date: e.target.value }))} /></div>
            <div><label className="db-field-label">Start Time</label><Input type="time" className="db-input" value={rescheduleData.meeting_start_time} onChange={e => setRescheduleData(d => ({ ...d, meeting_start_time: e.target.value }))} /></div>
            <div>
              <label className="db-field-label">Duration</label>
              <Select value={rescheduleData.meeting_duration} onValueChange={v => setRescheduleData(d => ({ ...d, meeting_duration: v }))}>
                <SelectTrigger className="db-select-trigger"><SelectValue /></SelectTrigger>
                <SelectContent>{[30, 45, 60, 90, 120].map(m => <SelectItem key={m} value={String(m)}>{m} minutes</SelectItem>)}</SelectContent>
              </Select>
            </div>
          </div>
          <div className="db-form-footer">
            <Button className="db-form-cancel h-auto" onClick={() => setRescheduleOpen(false)}>Cancel</Button>
            <Button className="db-form-submit h-auto" onClick={handleReschedule} disabled={!rescheduleData.meeting_date || !rescheduleData.meeting_start_time || actionLoading === 'reschedule'}>
              {actionLoading === 'reschedule' ? <Loader2 size={14} className="animate-spin" /> : 'Save Changes'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* EDIT */}
      <Dialog open={isEditOpen} onOpenChange={setEditOpen}>
        <DialogContent className="db-form-dialog" style={{ maxWidth: 500, padding: 24 }}>
          <DialogHeader>
            <DialogTitle className="db-form-title"><Edit2 size={17} color="#00a3a3" /> Edit Meeting</DialogTitle>
          </DialogHeader>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginTop: 12, maxHeight: '60vh', overflowY: 'auto', paddingRight: 4 }}>
            {[{ k: 'client_name', l: 'Client Name' }, { k: 'client_company', l: 'Company' }, { k: 'client_mobile', l: 'Client Mobile' }, { k: 'meeting_venue_area', l: 'Venue / Location' }].map(({ k, l }) => (
              <div key={k}><label className="db-field-label">{l}</label><Input className="db-input" value={editData[k]} onChange={e => setEditData(d => ({ ...d, [k]: e.target.value }))} /></div>
            ))}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div><label className="db-field-label">Date</label><Input type="date" className="db-input" value={editData.meeting_date} onChange={e => setEditData(d => ({ ...d, meeting_date: e.target.value }))} /></div>
              <div><label className="db-field-label">Start Time</label><Input type="time" className="db-input" value={editData.meeting_start_time} onChange={e => setEditData(d => ({ ...d, meeting_start_time: e.target.value }))} /></div>
            </div>
            <div>
              <label className="db-field-label">Duration</label>
              <Select value={editData.meeting_duration} onValueChange={v => setEditData(d => ({ ...d, meeting_duration: v }))}>
                <SelectTrigger className="db-select-trigger"><SelectValue /></SelectTrigger>
                <SelectContent>{[30, 45, 60, 90, 120].map(m => <SelectItem key={m} value={String(m)}>{m} minutes</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><label className="db-field-label">Agenda</label><Textarea className="db-textarea" value={editData.meeting_agenda} onChange={e => setEditData(d => ({ ...d, meeting_agenda: e.target.value }))} /></div>
          </div>
          <div className="db-form-footer">
            <Button className="db-form-cancel h-auto" onClick={() => setEditOpen(false)}>Cancel</Button>
            <Button className="db-form-submit h-auto" onClick={handleEdit} disabled={actionLoading === 'edit'}>
              {actionLoading === 'edit' ? <Loader2 size={14} className="animate-spin" /> : 'Save Changes'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

const Dashboard = () => (
  <React.Suspense fallback={<div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh' }}><Loader2 size={24} className="animate-spin" color="#00d1d1" /></div>}>
    <DashboardContent />
  </React.Suspense>
);

export default Dashboard;
