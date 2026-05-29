// @ts-nocheck
"use client"

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Toaster } from "@/components/ui/toaster";
import { useToast } from "@/hooks/use-toast";
import {
  Calendar, Clock, Building, MapPin, CheckCircle, XCircle, Table2, LayoutGrid,
  Video, Trash2, Loader2, CloudOff, Cloud, ChevronLeft, ChevronRight, Search,
  MoreHorizontal, Plus, Download, Hash, Globe, CheckCircle2, CalendarClock,
  Edit2, Ban, UserCheck, AlertCircle
} from 'lucide-react';
import { getStatusColors, getBadgeStatusColor } from '@/utils/statusColors';
import { formatTime } from './format';

// ── SHARED DESIGN SYSTEM STYLES ──────────────────────────────────
const DashboardStyles = () => (
  <style>{`
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');

    .db-shell {
      font-family: 'Inter', sans-serif;
      background-color: #f0f4f5;
      min-height: 100vh;
      padding: 20px 24px;
    }

    /* ── TOPBAR ── */
    .db-header { margin-bottom: 20px; display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 12px; }
    .db-title { font-size: 18px; font-weight: 800; color: #003038; letter-spacing: -0.02em; }
    .db-subtitle { font-size: 12px; color: #64868c; margin-top: 2px; }

    /* ── BUTTONS — mirrors sidebar create btn ── */
    .db-btn-primary {
      display: inline-flex; align-items: center; gap: 6px;
      padding: 8px 16px; font-size: 13px; font-weight: 700;
      border-radius: 8px; border: none;
      background: linear-gradient(135deg, #00d1d1 0%, #00a3a3 100%);
      color: #ffffff; cursor: pointer;
      box-shadow: 0 4px 14px rgba(0,209,209,0.28);
      transition: all 0.2s ease;
    }
    .db-btn-primary:hover { transform: translateY(-1px); box-shadow: 0 6px 18px rgba(0,209,209,0.35); }

    .db-btn-outline {
      display: inline-flex; align-items: center; gap: 6px;
      padding: 7px 14px; font-size: 12px; font-weight: 600;
      border-radius: 8px; border: 1px solid #e2e8e9;
      background: #ffffff; color: #003038;
      cursor: pointer; transition: all 0.15s ease;
    }
    .db-btn-outline:hover { background: #f0f4f5; border-color: #c8d6d8; }

    .db-btn-ghost {
      display: inline-flex; align-items: center; gap: 6px;
      padding: 6px 12px; font-size: 12px; font-weight: 600;
      border-radius: 8px; border: none; background: transparent;
      color: #64868c; cursor: pointer; transition: all 0.15s ease;
    }
    .db-btn-ghost:hover { background: #f0f4f5; color: #003038; }

    /* ── PANELS ── */
    .db-panel {
      background: #ffffff; border-radius: 12px;
      border: 1px solid #eef2f3; overflow: hidden;
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
      background: transparent; color: #8ca4a8; cursor: pointer;
      transition: all 0.15s ease; text-transform: capitalize;
    }
    .db-tab:hover { color: #003038; background: rgba(0,48,56,0.04); }
    .db-tab.active {
      background: #ffffff; color: #003038;
      border-color: #eef2f3;
      box-shadow: 0 1px 4px rgba(0,0,0,0.06);
    }
    .db-tab.active.tab-upcoming { color: #0284c7; }
    .db-tab.active.tab-today    { color: #007a7a; }
    .db-tab.active.tab-pending  { color: #b45309; }
    .db-tab.active.tab-completed{ color: #15803d; }
    .db-tab.active.tab-canceled { color: #dc2626; }

    /* search + view toggle */
    .db-toolbar-right { flex: 1; display: flex; align-items: center; gap: 10px; padding: 10px 12px; justify-content: flex-end; }
    .db-search-wrap { position: relative; flex: 1; max-width: 320px; }
    .db-search-icon { position: absolute; left: 11px; top: 50%; transform: translateY(-50%); color: #8ca4a8; pointer-events: none; }
    .db-search {
      width: 100%; height: 36px; padding: 0 12px 0 34px;
      font-size: 13px; font-weight: 500; font-family: 'Inter', sans-serif;
      border: 1px solid #e2e8e9; border-radius: 8px;
      background: #ffffff; color: #003038; outline: none;
      transition: all 0.15s ease;
    }
    .db-search:focus { border-color: #00d1d1; box-shadow: 0 0 0 3px rgba(0,209,209,0.12); }
    .db-search::placeholder { color: #8ca4a8; }

    .db-view-toggle { display: flex; background: #eef2f3; border-radius: 8px; padding: 3px; gap: 2px; }
    .db-view-btn {
      display: flex; align-items: center; gap: 5px;
      padding: 5px 10px; font-size: 11px; font-weight: 700;
      border-radius: 5px; border: none; cursor: pointer;
      color: #8ca4a8; background: transparent; transition: all 0.15s ease;
    }
    .db-view-btn:hover { color: #003038; }
    .db-view-btn.active {
      background: #ffffff; color: #003038;
      box-shadow: 0 1px 3px rgba(0,0,0,0.08);
    }

    /* ── TABLE ── */
    .db-table-wrap { overflow-x: auto; }
    .db-table { width: 100%; border-collapse: collapse; }
    .db-table th {
      padding: 10px 16px; text-align: left;
      font-size: 9px; font-weight: 700; text-transform: uppercase;
      letter-spacing: 0.07em; color: #8ca4a8;
      background: #f7fafa; border-bottom: 1px solid #eef2f3;
      white-space: nowrap;
    }
    .db-table td { padding: 13px 16px; border-bottom: 1px solid #f5f8f9; vertical-align: middle; }
    .db-table tr:last-child td { border-bottom: none; }
    .db-table tr { cursor: pointer; transition: background 0.12s ease; }
    .db-table tr:hover td { background: #f7fafa; }

    .db-type-icon {
      width: 36px; height: 36px; border-radius: 9px;
      display: flex; align-items: center; justify-content: center;
      flex-shrink: 0;
    }
    .db-type-virtual { background: #ede9fe; color: #7c3aed; }
    .db-type-physical { background: #e0f2fe; color: #0284c7; }

    .db-cell-main { font-size: 13px; font-weight: 700; color: #003038; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 200px; }
    .db-cell-sub { font-size: 11px; color: #8ca4a8; margin-top: 2px; }
    .db-cell-date { font-size: 12px; font-weight: 700; color: #003038; white-space: nowrap; }
    .db-cell-time { font-size: 12px; font-weight: 600; color: #64868c; display: flex; align-items: center; gap: 5px; white-space: nowrap; }
    .db-avatar-sm {
      width: 26px; height: 26px; border-radius: 6px;
      display: flex; align-items: center; justify-content: center;
      font-size: 9px; font-weight: 800;
      background: linear-gradient(135deg, #003038, #00505e);
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
    .db-row-btn:hover { background: #eef2f3; color: #003038; }

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
    .db-card-name { font-size: 14px; font-weight: 800; color: #003038; margin-bottom: 3px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .db-card-company { font-size: 11px; color: #8ca4a8; display: flex; align-items: center; gap: 4px; margin-bottom: 12px; }
    .db-card-info-row {
      display: flex; align-items: center; justify-content: space-between;
      background: #f7fafa; border-radius: 8px; border: 1px solid #eef2f3;
      padding: 10px 12px; margin-bottom: 8px;
    }
    .db-card-info-left { display: flex; align-items: center; gap: 10px; }
    .db-card-info-icon { width: 30px; height: 30px; border-radius: 7px; background: #eef2f3; display: flex; align-items: center; justify-content: center; }
    .db-card-date { font-size: 12px; font-weight: 700; color: #003038; }
    .db-card-dow { font-size: 9px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; color: #8ca4a8; margin-top: 2px; }
    .db-card-time { font-size: 12px; font-weight: 700; color: #003038; text-align: right; }
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
    .db-pagination-info b { color: #003038; font-weight: 700; }
    .db-page-btns { display: flex; align-items: center; gap: 4px; }
    .db-page-btn {
      width: 30px; height: 30px; border-radius: 7px; border: 1px solid #eef2f3;
      background: #ffffff; color: #64868c;
      display: flex; align-items: center; justify-content: center;
      font-size: 12px; font-weight: 700; cursor: pointer; transition: all 0.12s ease;
    }
    .db-page-btn:hover:not(:disabled) { background: #003038; color: #ffffff; border-color: #003038; }
    .db-page-btn.active { background: linear-gradient(135deg, #00d1d1, #00a3a3); color: #fff; border-color: transparent; box-shadow: 0 2px 8px rgba(0,209,209,0.3); }
    .db-page-btn:disabled { opacity: 0.35; cursor: not-allowed; }

    /* ── DETAIL DIALOG ── */
    .db-dialog { border-radius: 14px !important; border: 1px solid #eef2f3 !important; overflow: hidden; box-shadow: 0 20px 60px rgba(0,48,56,0.15) !important; }
    .db-dialog-header { padding: 20px 24px; background: #f7fafa; border-bottom: 1px solid #eef2f3; }
    .db-dialog-id { font-size: 10px; font-weight: 700; color: #8ca4a8; text-transform: uppercase; letter-spacing: 0.06em; margin-bottom: 6px; display: flex; align-items: center; gap: 6px; }
    .db-dialog-name { font-size: 20px; font-weight: 800; color: #003038; letter-spacing: -0.02em; }
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
    .db-meta-value { font-size: 13px; font-weight: 700; color: #003038; }
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
    .db-participant-internal { background: linear-gradient(135deg, #003038, #00505e); color: #fff; }
    .db-participant-external { background: #eef2f3; color: #64868c; }
    .db-participant-name { font-size: 13px; font-weight: 700; color: #003038; }
    .db-participant-role { font-size: 9px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; color: #8ca4a8; margin-top: 2px; }

    .db-contact-box { background: #ffffff; border-radius: 10px; border: 1px solid #eef2f3; overflow: hidden; }
    .db-contact-row { display: flex; align-items: center; justify-content: space-between; padding: 10px 14px; border-bottom: 1px solid #f5f8f9; }
    .db-contact-row:last-child { border-bottom: none; }
    .db-contact-label { font-size: 11px; font-weight: 600; color: #8ca4a8; }
    .db-contact-value { font-size: 12px; font-weight: 700; color: #003038; }

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
    .db-action-confirm { background: #003038; color: #fff; border-color: #003038; }
    .db-action-confirm:hover:not(:disabled) { background: #00505e; }
    .db-action-done { background: linear-gradient(135deg,#00d1d1,#00a3a3); color:#fff; border-color: transparent; box-shadow: 0 2px 8px rgba(0,209,209,0.25); }
    .db-action-done:hover:not(:disabled) { box-shadow: 0 4px 14px rgba(0,209,209,0.35); }
    .db-action-neutral { background: #ffffff; color: #64868c; border-color: #e2e8e9; }
    .db-action-neutral:hover:not(:disabled) { background: #f0f4f5; color: #003038; border-color: #c8d6d8; }
    .db-action-danger { background: #fff5f5; color: #dc2626; border-color: #fecaca; }
    .db-action-danger:hover:not(:disabled) { background: #fee2e2; }
    .db-action-close { background: transparent; color: #8ca4a8; border-color: transparent; }
    .db-action-close:hover { background: #f0f4f5; color: #003038; border-color: #eef2f3; }

    /* ── FORM DIALOGS ── */
    .db-form-dialog { border-radius: 14px !important; border: 1px solid #eef2f3 !important; background: #ffffff !important; box-shadow: 0 16px 48px rgba(0,48,56,0.12) !important; }
    .db-form-title { font-size: 16px; font-weight: 800; color: #003038; display: flex; align-items: center; gap: 8px; }
    .db-field-label { font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.06em; color: #8ca4a8; display: block; margin-bottom: 6px; }
    .db-input {
      width: 100%; height: 38px; padding: 0 12px;
      font-size: 13px; font-weight: 500; font-family: 'Inter', sans-serif;
      border: 1px solid #e2e8e9; border-radius: 8px;
      background: #ffffff; color: #003038; outline: none;
      transition: all 0.15s ease; box-sizing: border-box;
    }
    .db-input:focus { border-color: #00d1d1; box-shadow: 0 0 0 3px rgba(0,209,209,0.12); }
    .db-textarea {
      width: 100%; padding: 10px 12px; min-height: 80px;
      font-size: 13px; font-weight: 500; font-family: 'Inter', sans-serif;
      border: 1px solid #e2e8e9; border-radius: 8px;
      background: #ffffff; color: #003038; outline: none; resize: vertical;
      transition: all 0.15s ease; box-sizing: border-box;
    }
    .db-textarea:focus { border-color: #00d1d1; box-shadow: 0 0 0 3px rgba(0,209,209,0.12); }
    .db-select-trigger {
      width: 100%; height: 38px; padding: 0 12px;
      font-size: 13px; font-weight: 500; font-family: 'Inter', sans-serif;
      border: 1px solid #e2e8e9; border-radius: 8px;
      background: #ffffff; color: #003038;
    }
    .db-form-footer { display: flex; gap: 8px; margin-top: 20px; }
    .db-form-cancel { flex: 1; height: 38px; border-radius: 8px; border: 1px solid #e2e8e9; background: #f7fafa; color: #64868c; font-size: 13px; font-weight: 700; cursor: pointer; font-family: 'Inter', sans-serif; transition: all 0.15s ease; }
    .db-form-cancel:hover { background: #eef2f3; color: #003038; }
    .db-form-submit { flex: 1; height: 38px; border-radius: 8px; border: none; background: linear-gradient(135deg, #00d1d1, #00a3a3); color: #fff; font-size: 13px; font-weight: 700; cursor: pointer; font-family: 'Inter', sans-serif; box-shadow: 0 3px 10px rgba(0,209,209,0.25); transition: all 0.2s ease; }
    .db-form-submit:hover:not(:disabled) { box-shadow: 0 5px 14px rgba(0,209,209,0.35); }
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
  const [loading, setLoading] = useState(true);
  const [selectedAppointment, setSelectedAppointment] = useState(null);
  const [activeTab, setActiveTab] = useState(statusParam ?? 'upcoming');
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
        const [userRes, meetingsRes, calRes] = await Promise.all([
          fetch('/api/users/me'),
          fetch('/api/meetings'),
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

  const paginated = activeAppointments.slice(currentPage * itemsPerPage, (currentPage + 1) * itemsPerPage);
  const totalPages = Math.ceil(activeAppointments.length / itemsPerPage);

  const apt = selectedAppointment;
  const displayApt = apt ? checkAppointmentStatus(apt) : null;
  const attendeeName = apt ? (apt.bcl_attendee_name || parseBclAttendees(apt.bcl_attendee)[0] || '—') : '—';
  const canChangeStatus = displayApt && !['canceled', 'completed'].includes(displayApt.status);

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '80vh' }}>
      <div style={{ width: 48, height: 48, borderRadius: 12, background: 'linear-gradient(135deg,#003038,#00505e)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
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
          <div className="db-subtitle">Manage your client engagements and team schedule</div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div className="cal-status">
            <div className={`cal-dot ${calendarConnectionStatus === 'connected' ? 'cal-dot-connected' : 'cal-dot-disconnected'}`} />
            Calendar {calendarConnectionStatus}
          </div>
          <button className="db-btn-outline" onClick={() => { }}>
            <Download size={13} /> Export
          </button>
          <button className="db-btn-primary" onClick={() => router.push('/schedule')}>
            <Plus size={14} /> New Meeting
          </button>
        </div>
      </div>

      {/* MAIN PANEL */}
      <div className="db-panel">
        {/* TOOLBAR */}
        <div className="db-toolbar">
          <div className="db-tabs">
            {['upcoming', 'today', 'pending', 'completed', 'canceled'].map(tab => (
              <button key={tab} className={`db-tab ${activeTab === tab ? `active tab-${tab}` : ''}`}
                onClick={() => { setActiveTab(tab); setCurrentPage(0); }}>
                {tab}
              </button>
            ))}
          </div>
          <div className="db-toolbar-right">
            <div className="db-search-wrap">
              <Search size={14} className="db-search-icon" />
              <input className="db-search" placeholder="Search clients or ID…"
                value={searchQuery} onChange={e => { setSearchQuery(e.target.value); setCurrentPage(0); }} />
            </div>
            <div className="db-view-toggle">
              <button className={`db-view-btn ${viewMode === 'table' ? 'active' : ''}`} onClick={() => setViewMode('table')}>
                <Table2 size={12} /> Table
              </button>
              <button className={`db-view-btn ${viewMode === 'cards' ? 'active' : ''}`} onClick={() => setViewMode('cards')}>
                <LayoutGrid size={12} /> Grid
              </button>
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
                  <th>Meeting & Client</th>
                  <th>Date</th>
                  <th>Time</th>
                  <th>Attendee</th>
                  <th>Status</th>
                  <th style={{ width: 80, textAlign: 'right', paddingRight: 16 }}></th>
                </tr>
              </thead>
              <tbody>
                {paginated.length > 0 ? paginated.map(app => {
                  const name = app.bcl_attendee_name || parseBclAttendees(app.bcl_attendee)[0] || '—';
                  return (
                    <tr key={app.id_main} onClick={() => setSelectedAppointment(app)}>
                      <td style={{ paddingLeft: 18 }}>
                        <div style={{ width: 16, height: 16, borderRadius: 4, border: '1.5px solid #d0dfe1', background: '#fff' }} />
                      </td>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          <div className={`db-type-icon ${app.meeting_type === 'virtual' ? 'db-type-virtual' : 'db-type-physical'}`}>
                            {app.meeting_type === 'virtual' ? <Video size={15} /> : <MapPin size={15} />}
                          </div>
                          <div>
                            <div className="db-cell-main">{app.meeting_agenda || `${app.client_name} Meeting`}</div>
                            <div className="db-cell-sub">#{app.id_main} · {app.client_name}</div>
                          </div>
                        </div>
                      </td>
                      <td><div className="db-cell-date">{new Date(app.meeting_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</div></td>
                      <td><div className="db-cell-time"><Clock size={12} />{formatTime(app.meeting_start_time)}</div></td>
                      <td>
                        <div className="db-attendee">
                          <div className="db-avatar-sm">{initials(name)}</div>
                          <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: 120 }}>{name}</span>
                        </div>
                      </td>
                      <td><span className={getPillClass(app.status)}>{app.status}</span></td>
                      <td style={{ textAlign: 'right', paddingRight: 12 }} onClick={e => e.stopPropagation()}>
                        <div className="db-row-actions">
                          {app.google_meet_link && (
                            <button className="db-row-btn" style={{ color: '#7c3aed' }} onClick={() => window.open(app.google_meet_link, '_blank')} title="Join meeting">
                              <Video size={14} />
                            </button>
                          )}
                          <button className="db-row-btn" onClick={() => setSelectedAppointment(app)} title="View details">
                            <MoreHorizontal size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                }) : (
                  <tr>
                    <td colSpan={7}>
                      <div className="db-empty">
                        <div className="db-empty-icon"><Calendar size={20} color="#8ca4a8" /></div>
                        <div className="db-empty-title">No meetings found</div>
                        <div className="db-empty-sub">No meetings match this filter</div>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="db-cards-grid">
            {paginated.map(app => (
              <AppointmentCard key={app.id_main} appointment={app} onClick={() => setSelectedAppointment(app)} />
            ))}
            {paginated.length === 0 && (
              <div style={{ gridColumn: '1/-1' }}>
                <div className="db-empty">
                  <div className="db-empty-icon"><Calendar size={20} color="#8ca4a8" /></div>
                  <div className="db-empty-title">No meetings found</div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* PAGINATION */}
        <div className="db-pagination">
          <div className="db-pagination-info">
            Showing <b>{activeAppointments.length > 0 ? currentPage * itemsPerPage + 1 : 0}</b> to <b>{Math.min((currentPage + 1) * itemsPerPage, activeAppointments.length)}</b> of <b>{activeAppointments.length}</b>
          </div>
          <div className="db-page-btns">
            <button className="db-page-btn" onClick={() => setCurrentPage(p => p - 1)} disabled={currentPage === 0}>
              <ChevronLeft size={14} />
            </button>
            {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
              const page = totalPages <= 5 ? i : Math.max(0, Math.min(currentPage - 2, totalPages - 5)) + i;
              return (
                <button key={page} className={`db-page-btn ${currentPage === page ? 'active' : ''}`} onClick={() => setCurrentPage(page)}>
                  {page + 1}
                </button>
              );
            })}
            <button className="db-page-btn" onClick={() => setCurrentPage(p => p + 1)} disabled={currentPage >= totalPages - 1}>
              <ChevronRight size={14} />
            </button>
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
                    <div className="db-sync-title" style={{ color: apt.google_event_id ? '#14532d' : '#003038' }}>{apt.google_event_id ? 'Calendar Synced' : 'Not Synced'}</div>
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
                <button className="db-action-btn db-action-confirm" onClick={handleConfirm} disabled={!!actionLoading || apt?.badge_status === 'Confirmed'}>
                  {actionLoading === 'confirm' ? <Loader2 size={12} className="animate-spin" /> : <UserCheck size={12} />} Confirm
                </button>
              )}
              {canChangeStatus && (
                <button className="db-action-btn db-action-done" onClick={handleMarkDone} disabled={!!actionLoading}>
                  {actionLoading === 'done' ? <Loader2 size={12} className="animate-spin" /> : <CheckCircle2 size={12} />} Mark Done
                </button>
              )}
              {canChangeStatus && (
                <button className="db-action-btn db-action-neutral" onClick={openReschedule} disabled={!!actionLoading}>
                  <CalendarClock size={12} /> Reschedule
                </button>
              )}
              {canChangeStatus && (
                <button className="db-action-btn db-action-danger" onClick={handleCancel} disabled={!!actionLoading}>
                  {actionLoading === 'cancel' ? <Loader2 size={12} className="animate-spin" /> : <Ban size={12} />} Cancel
                </button>
              )}
            </div>
            <div className="db-action-group">
              <button className="db-action-btn db-action-neutral" onClick={handleSyncToCalendar} disabled={!!actionLoading || calendarConnectionStatus !== 'connected'}>
                {actionLoading === 'sync' ? <Loader2 size={12} className="animate-spin" /> : <Cloud size={12} />} Sync
              </button>
              <button className="db-action-btn db-action-neutral" onClick={openEdit} disabled={!!actionLoading}>
                <Edit2 size={12} /> Edit
              </button>
              <button className="db-action-btn db-action-danger" onClick={() => setDeleteOpen(true)} disabled={!!actionLoading}>
                <Trash2 size={12} /> Delete
              </button>
              <button className="db-action-btn db-action-close" onClick={() => setSelectedAppointment(null)}>Close</button>
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
            <AlertDialogTitle style={{ fontFamily: 'Inter,sans-serif', fontSize: 16, fontWeight: 800, color: '#003038' }}>Delete Permanently</AlertDialogTitle>
            <AlertDialogDescription style={{ fontFamily: 'Inter,sans-serif', fontSize: 13, color: '#64868c', lineHeight: 1.6 }}>
              This will permanently remove the booking for <strong style={{ color: '#003038' }}>{apt?.client_name}</strong>. This cannot be undone.
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
            <div><label className="db-field-label">New Date</label><input type="date" className="db-input" value={rescheduleData.meeting_date} onChange={e => setRescheduleData(d => ({ ...d, meeting_date: e.target.value }))} /></div>
            <div><label className="db-field-label">Start Time</label><input type="time" className="db-input" value={rescheduleData.meeting_start_time} onChange={e => setRescheduleData(d => ({ ...d, meeting_start_time: e.target.value }))} /></div>
            <div>
              <label className="db-field-label">Duration</label>
              <Select value={rescheduleData.meeting_duration} onValueChange={v => setRescheduleData(d => ({ ...d, meeting_duration: v }))}>
                <SelectTrigger className="db-select-trigger"><SelectValue /></SelectTrigger>
                <SelectContent>{[30, 45, 60, 90, 120].map(m => <SelectItem key={m} value={String(m)}>{m} minutes</SelectItem>)}</SelectContent>
              </Select>
            </div>
          </div>
          <div className="db-form-footer">
            <button className="db-form-cancel" onClick={() => setRescheduleOpen(false)}>Cancel</button>
            <button className="db-form-submit" onClick={handleReschedule} disabled={!rescheduleData.meeting_date || !rescheduleData.meeting_start_time || actionLoading === 'reschedule'}>
              {actionLoading === 'reschedule' ? <Loader2 size={14} className="animate-spin" /> : 'Save Changes'}
            </button>
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
              <div key={k}><label className="db-field-label">{l}</label><input className="db-input" value={editData[k]} onChange={e => setEditData(d => ({ ...d, [k]: e.target.value }))} /></div>
            ))}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div><label className="db-field-label">Date</label><input type="date" className="db-input" value={editData.meeting_date} onChange={e => setEditData(d => ({ ...d, meeting_date: e.target.value }))} /></div>
              <div><label className="db-field-label">Start Time</label><input type="time" className="db-input" value={editData.meeting_start_time} onChange={e => setEditData(d => ({ ...d, meeting_start_time: e.target.value }))} /></div>
            </div>
            <div>
              <label className="db-field-label">Duration</label>
              <Select value={editData.meeting_duration} onValueChange={v => setEditData(d => ({ ...d, meeting_duration: v }))}>
                <SelectTrigger className="db-select-trigger"><SelectValue /></SelectTrigger>
                <SelectContent>{[30, 45, 60, 90, 120].map(m => <SelectItem key={m} value={String(m)}>{m} minutes</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><label className="db-field-label">Agenda</label><textarea className="db-textarea" value={editData.meeting_agenda} onChange={e => setEditData(d => ({ ...d, meeting_agenda: e.target.value }))} /></div>
          </div>
          <div className="db-form-footer">
            <button className="db-form-cancel" onClick={() => setEditOpen(false)}>Cancel</button>
            <button className="db-form-submit" onClick={handleEdit} disabled={actionLoading === 'edit'}>
              {actionLoading === 'edit' ? <Loader2 size={14} className="animate-spin" /> : 'Save Changes'}
            </button>
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