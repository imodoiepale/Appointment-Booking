// @ts-nocheck
"use client"

import React, { useEffect, useState, useCallback } from 'react';
import SpeechRecognition, { useSpeechRecognition } from 'react-speech-recognition';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { Toaster } from "@/components/ui/toaster";
import { Calendar, Clock, Mic, MicOff, Building, User, Phone, Mail, MapPin, Check, ChevronRight, ChevronLeft, Loader2, Info, X, Video, Plus, Link2, Hash } from 'lucide-react';
import supabase from '@/utils/supabaseClient';
import { CREATION_STATUSES } from '@/utils/appointmentStatuses';
import { SearchableSelect } from '@/components/ui/searchable-select';
import { SearchableMultiSelect } from '@/components/ui/searchable-multi-select';

// ── SHARED DESIGN SYSTEM STYLES ──────────────────────────────────
const SchedulerStyles = () => (
    <style>{`
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');

    .sch-shell {
      font-family: 'Inter', sans-serif;
      background: #f4f7f8;
      min-height: 100vh;
      padding: 24px;
      box-sizing: border-box;
      display: flex;
      align-items: flex-start;
      justify-content: center;
    }

    .sch-landing {
      max-width: 560px;
      width: 100%;
      margin-top: 80px;
      text-align: center;
    }

    .sch-landing-icon {
      width: 72px; height: 72px;
      border-radius: 20px;
      background: linear-gradient(135deg, #1d4ed8, #00505e);
      display: flex; align-items: center; justify-content: center;
      margin: 0 auto 24px;
      box-shadow: 0 8px 24px rgba(29,78,216,0.3);
    }

    .sch-landing-title {
      font-size: 26px; font-weight: 800; color: #1d4ed8;
      letter-spacing: -0.02em; margin-bottom: 8px;
    }

    .sch-landing-sub {
      font-size: 14px; color: #64868c; line-height: 1.6; margin-bottom: 32px;
    }

    .sch-landing-btn {
      display: inline-flex; align-items: center; gap: 8px;
      padding: 12px 28px; font-size: 14px; font-weight: 700;
      border-radius: 10px; border: none;
      background: hsl(var(--primary));
      color: hsl(var(--primary-foreground)); cursor: pointer;
      font-family: 'Inter', sans-serif;
      box-shadow: 0 4px 18px hsl(var(--primary) / 0.28);
      transition: all 0.2s ease;
    }
    .sch-landing-btn:hover { transform: translateY(-2px); box-shadow: 0 8px 24px hsl(var(--primary) / 0.35); }

    .sch-card {
      max-width: 900px;
      width: 100%;
      background: #ffffff;
      border-radius: 14px;
      border: 1px solid #eef2f3;
      overflow: hidden;
      box-shadow: 0 22px 55px rgba(0,48,56,0.1);
    }

    /* ── CARD HEADER ── */
    .sch-header {
      padding: 24px 28px;
      background: #f7fafa;
      border-bottom: 1px solid #eef2f3;
      display: flex; align-items: flex-start; justify-content: space-between;
      flex-wrap: wrap; gap: 16px;
    }
    .sch-badge {
      display: inline-flex; align-items: center; gap: 5px;
      padding: 4px 10px; border-radius: 6px;
      background: rgba(0,209,209,0.1); border: 1px solid rgba(0,209,209,0.25);
      font-size: 10px; font-weight: 700; color: #007a7a;
      text-transform: uppercase; letter-spacing: 0.06em;
      margin-bottom: 10px;
    }
    .sch-title { font-size: 22px; font-weight: 800; color: #1d4ed8; letter-spacing: -0.02em; }
    .sch-subtitle { font-size: 13px; color: #64868c; margin-top: 4px; max-width: 420px; line-height: 1.5; }
    .sch-chip-label { font-size: 9px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.06em; color: #8ca4a8; margin-top: 3px; }

    /* ── STEP INDICATOR ── */
    .sch-steps {
      display: flex; align-items: center;
      padding: 16px 28px; border-bottom: 1px solid #eef2f3;
      background: #f7fafa; overflow-x: auto;
    }
    .sch-step { display: flex; flex-direction: column; align-items: center; min-width: 80px; cursor: pointer; }
    .sch-step-circle {
      width: 36px; height: 36px; border-radius: 10px;
      display: flex; align-items: center; justify-content: center;
      border: 2px solid #eef2f3; background: #ffffff;
      transition: all 0.2s ease; position: relative;
    }
    .sch-step-circle.done {
      background: rgba(0,209,209,0.1); border-color: rgba(0,209,209,0.4);
    }
    .sch-step-circle.active {
      background: linear-gradient(135deg, #1d4ed8, #00505e);
      border-color: transparent;
      box-shadow: 0 3px 12px rgba(0,48,56,0.25);
    }
    .sch-step-circle.inactive { background: #f7fafa; border-color: #eef2f3; }
    .sch-step-icon-done { color: #00a3a3; }
    .sch-step-icon-active { color: #ffffff; }
    .sch-step-icon-inactive { color: #c8d6d8; }
    .sch-step-label {
      font-size: 10px; font-weight: 700; text-transform: uppercase;
      letter-spacing: 0.05em; margin-top: 6px; text-align: center;
      white-space: nowrap;
    }
    .sch-step-label.done { color: #00a3a3; }
    .sch-step-label.active { color: #1d4ed8; }
    .sch-step-label.inactive { color: #c8d6d8; }
    .sch-step-connector {
      flex: 1; height: 2px; border-radius: 2px; margin: 0 8px;
      margin-bottom: 22px; min-width: 24px; transition: background 0.2s;
    }
    .sch-step-connector.done { background: rgba(0,209,209,0.4); }
    .sch-step-connector.inactive { background: #eef2f3; }

    /* ── FORM BODY ── */
    .sch-body { padding: 28px; }
    .sch-section-title {
      font-size: 15px; font-weight: 800; color: #1d4ed8;
      letter-spacing: -0.01em; padding-bottom: 14px;
      border-bottom: 1px solid #eef2f3; margin-bottom: 22px;
    }
    .sch-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
    @media (max-width: 640px) { .sch-grid { grid-template-columns: 1fr; } }
    .sch-grid-full { grid-column: 1 / -1; }

    /* ── FIELD ── */
    .sch-field { display: flex; flex-direction: column; gap: 5px; }
    .sch-label {
      font-size: 10px; font-weight: 700; text-transform: uppercase;
      letter-spacing: 0.06em; color: #8ca4a8;
    }
    .sch-label.invalid { color: #dc2626; }
    .sch-input-wrap { position: relative; }
    .sch-input-icon {
      position: absolute; left: 11px; top: 50%; transform: translateY(-50%);
      color: #b0c4c8; pointer-events: none;
    }
    .sch-input {
      width: 100%; height: 40px;
      padding: 0 12px;
      font-size: 13px; font-weight: 500; font-family: 'Inter', sans-serif;
      border: 1px solid #dfe8ea; border-radius: 8px;
      background: #ffffff; color: #1d4ed8; outline: none;
      transition: all 0.15s ease; box-sizing: border-box;
    }
    .sch-input.has-icon { padding-left: 34px; }
    .sch-input:focus { border-color: hsl(var(--ring)); box-shadow: 0 0 0 3px hsl(var(--ring) / 0.14); }
    .sch-input.invalid { border-color: #ef4444; }
    .sch-input.invalid:focus { box-shadow: 0 0 0 3px rgba(239,68,68,0.12); }
    .sch-input:read-only { background: #f7fafa; color: #8ca4a8; cursor: not-allowed; }
    .sch-textarea {
      width: 100%; padding: 10px 12px; min-height: 80px;
      font-size: 13px; font-weight: 500; font-family: 'Inter', sans-serif;
      border: 1px solid #dfe8ea; border-radius: 8px;
      background: #ffffff; color: #1d4ed8; outline: none; resize: vertical;
      transition: all 0.15s ease; box-sizing: border-box;
    }
    .sch-textarea:focus { border-color: hsl(var(--ring)); box-shadow: 0 0 0 3px hsl(var(--ring) / 0.14); }
    .sch-textarea.invalid { border-color: #ef4444; }
    .sch-select-trigger {
      width: 100%; height: 40px;
      font-size: 13px; font-weight: 500; font-family: 'Inter', sans-serif;
      border-radius: 8px; border: 1px solid #dfe8ea;
      background: #ffffff; color: #1d4ed8;
      transition: all 0.15s ease;
    }
    .sch-select-trigger.invalid { border-color: #ef4444; }
    .sch-select-trigger:focus { border-color: hsl(var(--ring)); box-shadow: 0 0 0 3px hsl(var(--ring) / 0.14); }
    .sch-error { font-size: 11px; font-weight: 600; color: #ef4444; margin-top: 2px; }

    /* attendee multi-select trigger */
    .sch-attendee-btn {
      width: 100%; min-height: 40px; padding: 6px 12px 6px 34px;
      font-size: 13px; font-weight: 500; font-family: 'Inter', sans-serif;
      border: 1px solid #e2e8e9; border-radius: 8px;
      background: #ffffff; color: #1d4ed8; cursor: pointer;
      text-align: left; display: flex; align-items: center; flex-wrap: wrap; gap: 5px;
      transition: all 0.15s ease; box-sizing: border-box; position: relative;
    }
    .sch-attendee-btn:focus, .sch-attendee-btn:hover { border-color: hsl(var(--ring)); outline: none; }
    .sch-attendee-btn.invalid { border-color: #ef4444; }
    .sch-attendee-placeholder { color: #b0c4c8; font-weight: 500; }
    .sch-attendee-tag {
      display: inline-flex; align-items: center; gap: 4px;
      background: #eef2f3; border-radius: 5px;
      padding: 2px 8px; font-size: 11px; font-weight: 700; color: #1d4ed8;
    }
    .sch-attendee-tag-x { cursor: pointer; color: #8ca4a8; display: flex; align-items: center; }
    .sch-attendee-tag-x:hover { color: #ef4444; }

    /* ── CONFIRMATION GRID ── */
    .sch-confirm-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
    @media (max-width: 640px) { .sch-confirm-grid { grid-template-columns: 1fr; } }
    .sch-confirm-item {
      background: #f7fafa; border-radius: 9px;
      border: 1px solid #dfe8ea; padding: 12px 14px;
      box-shadow: 0 8px 22px rgba(0,48,56,0.04);
    }
    .sch-confirm-label { font-size: 9px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.06em; color: #8ca4a8; margin-bottom: 4px; }
    .sch-confirm-value { font-size: 13px; font-weight: 700; color: #1d4ed8; word-break: break-word; }

    /* ── SUCCESS / ERROR BANNERS ── */
    .sch-banner {
      display: flex; align-items: center; gap: 10px;
      padding: 14px 16px; border-radius: 10px; border: 1px solid;
      margin-top: 16px; font-size: 13px; font-weight: 600;
    }
    .sch-banner-success { background: #f0fdf4; border-color: #bbf7d0; color: #14532d; }
    .sch-banner-error { background: #fef2f2; border-color: #fecaca; color: #7f1d1d; }

    /* ── FOOTER NAV ── */
    .sch-footer {
      display: flex; align-items: center; justify-content: space-between;
      padding: 16px 28px; border-top: 1px solid #eef2f3;
      background: #f7fafa;
    }
    .sch-btn-prev {
      display: inline-flex; align-items: center; gap: 6px;
      padding: 9px 18px; font-size: 13px; font-weight: 700;
      border-radius: 8px; border: 1px solid #e2e8e9;
      background: hsl(var(--card)); color: hsl(var(--muted-foreground)); cursor: pointer;
      font-family: 'Inter', sans-serif; transition: all 0.15s ease;
    }
    .sch-btn-prev:hover:not(:disabled) { background: hsl(var(--secondary)); color: hsl(var(--foreground)); border-color: hsl(var(--ring) / 0.35); }
    .sch-btn-prev:disabled { opacity: 0.35; cursor: not-allowed; }
    .sch-btn-next {
      display: inline-flex; align-items: center; gap: 6px;
      padding: 9px 22px; font-size: 13px; font-weight: 700;
      border-radius: 8px; border: none;
      background: hsl(var(--primary));
      color: hsl(var(--primary-foreground)); cursor: pointer;
      font-family: 'Inter', sans-serif;
      box-shadow: 0 4px 14px hsl(var(--primary) / 0.22);
      transition: all 0.2s ease;
    }
    .sch-btn-next:hover:not(:disabled) { transform: translateY(-1px); background: hsl(var(--primary) / 0.92); box-shadow: 0 6px 18px hsl(var(--primary) / 0.3); }
    .sch-btn-next:disabled { opacity: 0.5; cursor: not-allowed; transform: none; box-shadow: none; }
    .sch-btn-submit {
      display: inline-flex; align-items: center; gap: 6px;
      padding: 9px 28px; font-size: 13px; font-weight: 700;
      border-radius: 8px; border: none;
      background: hsl(var(--primary));
      color: hsl(var(--primary-foreground)); cursor: pointer;
      font-family: 'Inter', sans-serif;
      box-shadow: 0 4px 14px hsl(var(--primary) / 0.22);
      transition: all 0.2s ease;
    }
    .sch-btn-submit:hover:not(:disabled) { transform: translateY(-1px); background: hsl(var(--primary) / 0.92); box-shadow: 0 6px 18px hsl(var(--primary) / 0.3); }
    .sch-btn-submit:disabled { opacity: 0.5; cursor: not-allowed; transform: none; }
    .sch-btn-success {
      background: linear-gradient(135deg, #22c55e, #16a34a) !important;
      box-shadow: 0 4px 14px rgba(34,197,94,0.3) !important;
    }

    /* voice btn */
    .sch-voice-btn {
      display: inline-flex; align-items: center; gap: 6px;
      padding: 8px 14px; font-size: 12px; font-weight: 700;
      border-radius: 8px; border: 1px solid;
      cursor: pointer; font-family: 'Inter', sans-serif;
      transition: all 0.15s ease;
    }
    .sch-voice-off { background: hsl(var(--card)); border-color: hsl(var(--border)); color: hsl(var(--muted-foreground)); }
    .sch-voice-off:hover { background: hsl(var(--secondary)); color: hsl(var(--foreground)); }
    .sch-voice-on { background: rgba(239,68,68,0.08); border-color: #fecaca; color: #dc2626; animation: sch-pulse 1.5s infinite; }
    @keyframes sch-pulse { 0%,100%{box-shadow:0 0 0 0 rgba(239,68,68,0.2)} 50%{box-shadow:0 0 0 6px rgba(239,68,68,0)} }

    /* select content shared */
    .sch-select-content { border-radius: 10px; border: 1px solid #eef2f3; background: #ffffff; box-shadow: 0 8px 24px rgba(0,48,56,0.1); }
    .sch-select-item { font-size: 13px; font-weight: 500; cursor: pointer; }
    .sch-select-item:focus { background: #f7fafa; }
  `}</style>
);

// ── TYPES ────────────────────────────────────────────────────────
type ClientAttendee = {
    id: string;
    name: string;
    companies: Array<{ id: string; name: string }>;
    selectedCompanyIds: string[];
    email: string;
    mobile: string;
    whatsapp: string;
};

type ThirdPartyAttendee = {
    key: string;
    name: string;
    type: string;
    email: string;
    mobile: string;
    organization: string;
};

// ── CONSTANTS ────────────────────────────────────────────────────
const STEPS = [
    { id: 0, name: 'Basic Info', Icon: Info },
    { id: 1, name: 'Client Details', Icon: User },
    { id: 2, name: 'Scheduling', Icon: Clock },
    { id: 3, name: 'Confirm', Icon: Check },
];

const FIELDS_TO_VALIDATE: Record<number, string[]> = {
    0: ['meetingDate', 'meetingType', 'meetingVenueArea'],
    1: ['clientAttendees', 'bclAttendees'],
    2: ['meetingStartTime', 'meetingDuration', 'meetingAgenda', 'venueDistance'],
};

// ── HELPERS ──────────────────────────────────────────────────────
function calcEndTime(start: string, mins: number): string {
    if (!start || isNaN(mins) || mins <= 0) return '';
    const [h, m] = start.split(':').map(Number);
    if (isNaN(h) || isNaN(m)) return '';
    const total = h * 60 + m + mins;
    return `${String(Math.floor(total / 60) % 24).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`;
}
function calcSlotTime(base: string, offset: number): string {
    if (!base || isNaN(offset)) return '';
    const [h, m] = base.split(':').map(Number);
    if (isNaN(h) || isNaN(m)) return '';
    const d = new Date(); d.setHours(h, m + offset, 0, 0);
    return d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
}

const INITIAL_FORM = {
    bookingDate: '', bookingDay: '', meetingDate: '', meetingDay: '',
    meetingType: '', meetingVenueArea: '', otherMeetingVenueArea: '',
    // legacy derived fields (populated from clientAttendees for DB insert)
    clientName: '', clientCompany: '', clientMobile: '', clientEmail: '',
    // new structured attendee fields
    clientAttendees: [] as ClientAttendee[],
    thirdPartyAttendees: [] as ThirdPartyAttendee[],
    bclAttendees: [] as string[], bclAttendeeNames: [] as string[],
    bclAttendeeEmailMap: {} as Record<string, string>,
    bclAttendeeMobile: '+254700298298',
    meetingAgenda: '', otherMeetingAgenda: '', meetingDuration: '',
    venueDistance: '10', meetingStartTime: '', meetingEndTime: '',
    meetingSlotStartTime: '', meetingSlotEndTime: '',
    virtualMeetingMode: '', meetingLink: '', meetingId: '',
    status: 'confirmed',
};

// ── FIELD COMPONENTS ─────────────────────────────────────────────
function Field({ label, children, error }: { label: string; children: React.ReactNode; error?: boolean }) {
    return (
        <div className="sch-field">
            <label className={`sch-label${error ? ' invalid' : ''}`}>{label}</label>
            {children}
            {error && <span className="sch-error">This field is required.</span>}
        </div>
    );
}

function TextInput({ icon: Icon, value, onChange, placeholder = '', type = 'text', readOnly = false, invalid = false, name = '' }) {
    return (
        <div className="sch-input-wrap">
            {Icon && <Icon size={14} className="sch-input-icon" />}
            <Input
                name={name} type={type} value={value} onChange={onChange}
                placeholder={placeholder} readOnly={readOnly}
                className={`sch-input${Icon ? ' has-icon' : ''}${invalid ? ' invalid' : ''}${readOnly ? ' readonly' : ''}`}
            />
        </div>
    );
}

function SchSelect({ value, onValueChange, placeholder, items, invalid = false, loading = false }) {
    if (loading) return (
        <Button className="sch-select-trigger h-auto" disabled style={{ display: 'flex', alignItems: 'center', gap: 8, opacity: 0.6 }}>
            <Loader2 size={13} className="animate-spin" /> Loading…
        </Button>
    );
    return (
        <Select value={value} onValueChange={onValueChange}>
            <SelectTrigger className={`sch-select-trigger${invalid ? ' invalid' : ''}`}>
                <SelectValue placeholder={placeholder} />
            </SelectTrigger>
            <SelectContent className="sch-select-content">
                {items.map(it => <SelectItem key={it.value} value={it.value} className="sch-select-item">{it.label}</SelectItem>)}
            </SelectContent>
        </Select>
    );
}

// ── SCHEDULER FORM (shared between dialog and page) ──────────────────────────
export function SchedulerForm({ onSuccess }: { onSuccess?: () => void }) {
    const { toast } = useToast();
    const [activeStep, setActiveStep] = useState(0);
    const [formData, setFormData] = useState({ ...INITIAL_FORM });
    const [invalidFields, setInvalidFields] = useState<string[]>([]);
    const [formStatus, setFormStatus] = useState<'idle' | 'submitting' | 'success' | 'error'>('idle');
    const [isListening, setIsListening] = useState(false);
    const [bclAttendees, setBclAttendees] = useState<{ id: string; displayName: string; email?: string }[]>([]);
    const [loadingBclAttendees, setLoadingBclAttendees] = useState(true);
    const [currentUserId, setCurrentUserId] = useState<string | null>(null);
    const [showOtherVenue, setShowOtherVenue] = useState(false);
    const [showOtherAgenda, setShowOtherAgenda] = useState(false);

    // Registry data for client attendees
    const [registryIndividuals, setRegistryIndividuals] = useState<any[]>([]);
    const [registryCompanies, setRegistryCompanies] = useState<any[]>([]);
    const [loadingRegistry, setLoadingRegistry] = useState(true);
    // UI state for adding client attendees
    const [clientSearchMode, setClientSearchMode] = useState<'individual' | 'company'>('individual');
    const [pendingIndividualId, setPendingIndividualId] = useState('');
    const [pendingSelectedCompanyIds, setPendingSelectedCompanyIds] = useState<string[]>([]);
    const [pendingCompanyId, setPendingCompanyId] = useState('');
    const [pendingIndividualIds, setPendingIndividualIds] = useState<string[]>([]);
    // Third party attendee form
    const [tpForm, setTpForm] = useState({ name: '', type: '', email: '', mobile: '', organization: '' });
    const [tpSaveToDB, setTpSaveToDB] = useState<'ask' | 'yes' | 'no' | null>(null);
    const [tpExisting, setTpExisting] = useState<any[]>([]);
    const [loadingTpExisting, setLoadingTpExisting] = useState(false);
    const [tpSelectMode, setTpSelectMode] = useState<'existing' | 'new'>('new');
    const [tpSubmitting, setTpSubmitting] = useState(false);

    // Inline contact detail editing state: individualId → form
    const [editingContactId, setEditingContactId] = useState<string | null>(null);
    const [contactEditForm, setContactEditForm] = useState({ email: '', mobile: '', alt_mobile: '', whatsapp: '' });
    const [savingContact, setSavingContact] = useState(false);

    const { transcript, listening, resetTranscript, browserSupportsSpeechRecognition } = useSpeechRecognition({ commands: [] });

    const toggleListening = () => {
        if (!browserSupportsSpeechRecognition) { toast({ variant: 'destructive', title: 'Not supported' }); return; }
        if (listening) { SpeechRecognition.stopListening(); setIsListening(false); }
        else { resetTranscript(); SpeechRecognition.startListening({ continuous: true }); setIsListening(true); toast({ title: 'Voice Control Active' }); }
    };

    const fetchBclAttendees = useCallback(async () => {
        setLoadingBclAttendees(true);
        try {
            const res = await fetch('/api/users/bcl-attendees');
            if (!res.ok) throw new Error();
            setBclAttendees(await res.json());
        } catch { toast({ variant: 'destructive', title: 'Could not load BCL attendees' }); }
        finally { setLoadingBclAttendees(false); }
    }, [toast]);

    const fetchRegistry = useCallback(async () => {
        setLoadingRegistry(true);
        try {
            const [indRes, compRes] = await Promise.all([
                fetch('/api/registry/individuals'),
                fetch('/api/registry/companies-with-individuals'),
            ]);
            if (indRes.ok) setRegistryIndividuals(await indRes.json());
            if (compRes.ok) setRegistryCompanies(await compRes.json());
        } catch { toast({ variant: 'destructive', title: 'Could not load client registry' }); }
        finally { setLoadingRegistry(false); }
    }, [toast]);

    const fetchThirdPartyExisting = useCallback(async () => {
        setLoadingTpExisting(true);
        try {
            const res = await fetch('/api/third-party-contacts');
            if (res.ok) setTpExisting(await res.json());
        } catch { }
        finally { setLoadingTpExisting(false); }
    }, []);

    const fetchCurrentUser = useCallback(async () => {
        try { const res = await fetch('/api/users/me'); if (res.ok) { const d = await res.json(); setCurrentUserId(d.id ?? null); } } catch { }
    }, []);

    useEffect(() => {
        const now = new Date();
        setFormData(p => ({ ...p, bookingDate: now.toISOString().split('T')[0], bookingDay: now.toLocaleDateString('en-US', { weekday: 'long' }) }));
        fetchBclAttendees(); fetchRegistry(); fetchCurrentUser(); fetchThirdPartyExisting();
    }, [fetchBclAttendees, fetchRegistry, fetchCurrentUser, fetchThirdPartyExisting]);

    const set = (key: string, value: any) => setFormData(p => ({ ...p, [key]: value }));

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        set(e.target.name, e.target.value);
    };

    const handleMeetingDate = (val: string) => {
        if (!val) { set('meetingDate', ''); set('meetingDay', ''); return; }
        const d = new Date(val);
        set('meetingDate', val);
        set('meetingDay', isNaN(d.getTime()) ? '' : d.toLocaleDateString('en-US', { weekday: 'long' }));
    };

    const handleStartTime = (val: string) => {
        const end = calcEndTime(val, parseInt(formData.meetingDuration) || 0);
        const travel = parseInt(formData.venueDistance) || 0;
        setFormData(p => ({ ...p, meetingStartTime: val, meetingEndTime: end, meetingSlotStartTime: calcSlotTime(val, -travel), meetingSlotEndTime: calcSlotTime(end, travel) }));
    };

    const handleDuration = (val: string) => {
        const end = calcEndTime(formData.meetingStartTime, parseInt(val) || 0);
        const travel = parseInt(formData.venueDistance) || 0;
        setFormData(p => ({ ...p, meetingDuration: val, meetingEndTime: end, meetingSlotEndTime: calcSlotTime(end, travel) }));
    };

    const handleTravel = (val: string) => {
        const travel = parseInt(val) || 0;
        setFormData(p => ({ ...p, venueDistance: val, meetingSlotStartTime: calcSlotTime(p.meetingStartTime, -travel), meetingSlotEndTime: calcSlotTime(p.meetingEndTime, travel) }));
    };

    const handleSelect = (name: string, val: string) => {
        setFormData(p => ({ ...p, [name]: val }));
        if (name === 'meetingType' && val !== 'virtual') {
            setFormData(p => ({ ...p, meetingType: val, virtualMeetingMode: '', meetingLink: '', meetingId: '' }));
        }
        if (name === 'virtualMeetingMode' && val !== 'external') {
            setFormData(p => ({ ...p, virtualMeetingMode: val, meetingLink: '', meetingId: '' }));
        }
        if (name === 'meetingVenueArea') setShowOtherVenue(val === 'Other');
        if (name === 'meetingAgenda') { setShowOtherAgenda(val === 'Other'); if (val !== 'Other') set('otherMeetingAgenda', ''); }
    };

    // ── CLIENT ATTENDEE HELPERS ───────────────────────────────────
    const addClientAttendeeFromIndividual = () => {
        if (!pendingIndividualId) return;
        const ind = registryIndividuals.find(i => i.id === pendingIndividualId);
        if (!ind) return;
        // Avoid duplicate
        if ((formData.clientAttendees as ClientAttendee[]).some(a => a.id === ind.id)) {
            setPendingIndividualId(''); setPendingSelectedCompanyIds([]); return;
        }
        const selectedCompanyIds = pendingSelectedCompanyIds.length > 0
            ? pendingSelectedCompanyIds
            : ind.companies.length === 1 ? [ind.companies[0].id] : [];
        const attendee: ClientAttendee = {
            id: ind.id,
            name: ind.name,
            companies: ind.companies,
            selectedCompanyIds,
            email: ind.email,
            mobile: ind.mobile,
            whatsapp: ind.whatsapp,
        };
        const updated = [...(formData.clientAttendees as ClientAttendee[]), attendee];
        setFormData(p => ({ ...p, clientAttendees: updated, ...deriveClientFields(updated) }));
        setPendingIndividualId(''); setPendingSelectedCompanyIds([]);
    };

    const addClientAttendeesFromCompany = () => {
        if (!pendingCompanyId || pendingIndividualIds.length === 0) return;
        const comp = registryCompanies.find(c => c.id === pendingCompanyId);
        if (!comp) return;
        const current = formData.clientAttendees as ClientAttendee[];
        const toAdd = pendingIndividualIds
            .filter(id => !current.some(a => a.id === id))
            .map(id => {
                const ind = comp.individuals.find((i: any) => i.id === id);
                if (!ind) return null;
                return {
                    id: ind.id,
                    name: ind.name,
                    companies: [{ id: comp.id, name: comp.name }],
                    selectedCompanyIds: [comp.id],
                    email: ind.email,
                    mobile: ind.mobile,
                    whatsapp: ind.whatsapp,
                } as ClientAttendee;
            })
            .filter(Boolean) as ClientAttendee[];
        const updated = [...current, ...toAdd];
        setFormData(p => ({ ...p, clientAttendees: updated, ...deriveClientFields(updated) }));
        setPendingCompanyId(''); setPendingIndividualIds([]);
    };

    const removeClientAttendee = (id: string) => {
        const updated = (formData.clientAttendees as ClientAttendee[]).filter(a => a.id !== id);
        setFormData(p => ({ ...p, clientAttendees: updated, ...deriveClientFields(updated) }));
    };

    const toggleClientAttendeeCompany = (attendeeId: string, companyId: string, checked: boolean) => {
        setFormData(p => {
            const updated = (p.clientAttendees as ClientAttendee[]).map(a =>
                a.id !== attendeeId ? a : {
                    ...a,
                    selectedCompanyIds: checked
                        ? [...a.selectedCompanyIds, companyId]
                        : a.selectedCompanyIds.filter(c => c !== companyId),
                }
            );
            return { ...p, clientAttendees: updated, ...deriveClientFields(updated) };
        });
    };

    const deriveClientFields = (attendees: ClientAttendee[]) => {
        const names = attendees.map(a => a.name).join(', ');
        const companies = [...new Set(attendees.flatMap(a =>
            a.companies.filter(c => a.selectedCompanyIds.includes(c.id)).map(c => c.name)
        ))].join(', ');
        const first = attendees[0];
        return { clientName: names, clientCompany: companies, clientMobile: first?.mobile || '', clientEmail: first?.email || '' };
    };

    // ── CONTACT DETAIL EDIT HELPERS ──────────────────────────────
    const startEditContact = (attendee: ClientAttendee) => {
        setEditingContactId(attendee.id);
        setContactEditForm({ email: attendee.email, mobile: attendee.mobile, alt_mobile: '', whatsapp: attendee.whatsapp });
    };

    const saveContactDetails = async (attendeeId: string) => {
        setSavingContact(true);
        try {
            const res = await fetch(`/api/registry/individuals/${attendeeId}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(contactEditForm),
            });
            if (!res.ok) throw new Error(await res.text());
            // Update local attendee card
            setFormData(p => {
                const updated = (p.clientAttendees as ClientAttendee[]).map(a =>
                    a.id !== attendeeId ? a : { ...a, ...contactEditForm }
                );
                return { ...p, clientAttendees: updated, ...deriveClientFields(updated) };
            });
            // Also update registry cache so re-selecting shows new data
            setRegistryIndividuals(prev => prev.map(i =>
                i.id !== attendeeId ? i : { ...i, ...contactEditForm, hasContactDetails: true }
            ));
            setEditingContactId(null);
            toast({ title: 'Contact details saved.' });
        } catch (e: any) {
            toast({ variant: 'destructive', title: 'Save failed', description: e.message });
        } finally {
            setSavingContact(false);
        }
    };

    // ── THIRD PARTY ADD HANDLER ───────────────────────────────────
    const handleAddThirdParty = async (saveToDB: boolean) => {
        if (!tpForm.name.trim()) return;
        setTpSubmitting(true);
        try {
            let dbId: string | undefined;
            if (saveToDB) {
                const res = await fetch('/api/third-party-contacts', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ name: tpForm.name, email: tpForm.email, mobile: tpForm.mobile, type: tpForm.type, organization: tpForm.organization }),
                });
                if (!res.ok) throw new Error((await res.json()).error || 'Save failed');
                const saved = await res.json();
                dbId = saved.id;
                // Add to existing list so it appears in "existing" tab
                setTpExisting(prev => [...prev, saved]);
                toast({ title: 'Saved to database.' });
            }
            const entry: ThirdPartyAttendee = { key: dbId ?? `${Date.now()}`, ...tpForm };
            setFormData(p => ({ ...p, thirdPartyAttendees: [...(p.thirdPartyAttendees as ThirdPartyAttendee[]), entry] }));
            setTpForm({ name: '', type: '', email: '', mobile: '', organization: '' });
            setTpSaveToDB(null);
        } catch (e: any) {
            toast({ variant: 'destructive', title: 'Error', description: e.message });
        } finally {
            setTpSubmitting(false);
        }
    };

    const addExistingThirdParty = (tp: any) => {
        if ((formData.thirdPartyAttendees as ThirdPartyAttendee[]).some(a => a.key === tp.id)) return;
        const entry: ThirdPartyAttendee = { key: tp.id, name: tp.name, type: tp.type, email: tp.email, mobile: tp.mobile, organization: tp.organization || '' };
        setFormData(p => ({ ...p, thirdPartyAttendees: [...(p.thirdPartyAttendees as ThirdPartyAttendee[]), entry] }));
    };

    const toggleAttendee = (id: string, name: string, checked: boolean) => {
        setFormData(p => {
            const ids = p.bclAttendees as string[];
            const names = p.bclAttendeeNames as string[];
            if (checked) return { ...p, bclAttendees: [...ids, id], bclAttendeeNames: [...names, name] };
            const i = ids.indexOf(id);
            return { ...p, bclAttendees: ids.filter((_, j) => j !== i), bclAttendeeNames: names.filter((_, j) => j !== i) };
        });
    };

    const inv = (field: string) => invalidFields.includes(field);

    const validateStep = (step: number): boolean => {
        let req = [...(FIELDS_TO_VALIDATE[step] || [])];
        if (step === 0 && formData.meetingType === 'virtual') {
            req.push('virtualMeetingMode');
            if (formData.virtualMeetingMode === 'external') req.push('meetingLink');
        }
        if (step === 2 && formData.meetingAgenda === 'Other') req.push('otherMeetingAgenda');
        const bad = req.filter(f => {
            const v = formData[f as keyof typeof formData];
            if (f === 'bclAttendees' || f === 'clientAttendees') return !Array.isArray(v) || v.length === 0;
            return !v || (typeof v === 'string' && v.trim() === '');
        });
        setInvalidFields(bad);
        return bad.length === 0;
    };

    const nextStep = () => {
        if (validateStep(activeStep)) setActiveStep(s => s + 1);
        else toast({ variant: 'destructive', title: 'Missing fields', description: 'Please fill in all required fields.' });
    };
    const prevStep = () => { if (activeStep > 0) { setActiveStep(s => s - 1); setInvalidFields([]); } };

    const handleSubmit = async () => {
        setFormStatus('submitting');
        const finalCompany = formData.clientCompany;
        const finalAgenda = formData.meetingAgenda === 'Other' ? formData.otherMeetingAgenda : formData.meetingAgenda;
        try {
            const { data: existing } = await supabase.from('bcl_meetings_meetings')
                .select('id_main,meeting_slot_start_time,meeting_slot_end_time,client_name')
                .eq('meeting_date', formData.meetingDate).in('status', ['upcoming', 'rescheduled', 'confirmed', 'in_progress']);
            if (existing?.length) {
                const [nsh, nsm] = formData.meetingSlotStartTime.split(':').map(Number);
                const [neh, nem] = formData.meetingSlotEndTime.split(':').map(Number);
                const ns = nsh * 60 + nsm, ne = neh * 60 + nem;
                for (const m of existing) {
                    const [esh, esm] = m.meeting_slot_start_time.split(':').map(Number);
                    const [eeh, eem] = m.meeting_slot_end_time.split(':').map(Number);
                    if (ns < eeh * 60 + eem && esh * 60 + esm < ne) {
                        setFormStatus('error');
                        toast({ variant: 'destructive', title: 'Conflict Detected', description: `Conflicts with ${m.client_name} (${m.meeting_slot_start_time}–${m.meeting_slot_end_time})` });
                        return;
                    }
                }
            }
            const { data: inserted, error } = await supabase.from('bcl_meetings_meetings').insert([{
                booking_date: formData.bookingDate, booking_day: formData.bookingDay,
                meeting_date: formData.meetingDate, meeting_day: formData.meetingDay,
                meeting_type: formData.meetingType, meeting_venue_area: formData.meetingVenueArea,
                // Legacy flat fields — derived from clientAttendees for backwards compatibility
                client_name: formData.clientName, client_company: finalCompany,
                client_mobile: formData.clientMobile, client_email: formData.clientEmail,
                // Structured attendee data — IDs only; join source tables for names at read time
                client_attendees: (formData.clientAttendees as ClientAttendee[]).map(a => ({
                    individual_id: a.id,
                    company_ids: a.selectedCompanyIds,
                })),
                third_party_attendees: (formData.thirdPartyAttendees as ThirdPartyAttendee[]).map(tp => ({
                    // key is a UUID when saved to DB, a numeric timestamp when local-only
                    contact_id: /^\d+$/.test(tp.key) ? null : tp.key,
                    name: tp.name,
                    type: tp.type || null,
                    email: tp.email || null,
                    mobile: tp.mobile || null,
                    organization: tp.organization || null,
                })),
                // BCL attendees — IDs only; join users table (company_id=10) for emails at read time
                bcl_attendee: formData.bclAttendees,
                bcl_attendee_mobile: formData.bclAttendeeMobile,
                created_by: currentUserId,
                meeting_agenda: finalAgenda, meeting_duration: parseInt(formData.meetingDuration),
                venue_distance: parseInt(formData.venueDistance),
                meeting_start_time: formData.meetingStartTime, meeting_end_time: formData.meetingEndTime,
                meeting_slot_start_time: formData.meetingSlotStartTime, meeting_slot_end_time: formData.meetingSlotEndTime,
                virtual_meeting_mode: formData.meetingType === 'virtual' ? (formData.virtualMeetingMode || null) : null,
                meeting_link: formData.meetingType === 'virtual' ? formData.meetingLink : '',
                meeting_id: formData.meetingType === 'virtual' ? formData.meetingId : '',
                badge_status: 'Open', status: formData.status || 'upcoming', google_event_id: null, google_meet_link: null,
            }]).select();
            if (error) throw error;
            if (inserted?.[0]?.id_main) {
                try { await fetch('/api/auto-sync-calendar', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(inserted[0]) }); } catch { }
            }
            try {
                await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/booking-confirmation`, {
                    method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY}` },
                    body: JSON.stringify({ id_main: inserted?.[0]?.id_main, client_name: formData.clientName, client_company: finalCompany, client_mobile: formData.clientMobile, client_email: formData.clientEmail, meeting_date: formData.meetingDate, meeting_day: formData.meetingDay, meeting_start_time: formData.meetingStartTime, meeting_end_time: formData.meetingEndTime, meeting_duration: parseInt(formData.meetingDuration), meeting_type: formData.meetingType, meeting_venue_area: formData.meetingVenueArea, meeting_agenda: finalAgenda, bcl_attendee: (formData.bclAttendeeNames as string[]).join(', ') || '', bcl_attendee_mobile: formData.bclAttendeeMobile, venue_distance: parseInt(formData.venueDistance), meeting_slot_start_time: formData.meetingSlotStartTime, meeting_slot_end_time: formData.meetingSlotEndTime, booking_date: formData.bookingDate, booking_day: formData.bookingDay }),
                });
            } catch { }
            setFormStatus('success');
            toast({ title: 'Success!', description: 'Meeting scheduled successfully.' });
            setTimeout(() => {
                const now = new Date();
                setFormData({ ...INITIAL_FORM, bookingDate: now.toISOString().split('T')[0], bookingDay: now.toLocaleDateString('en-US', { weekday: 'long' }) });
                setActiveStep(0); setFormStatus('idle'); setInvalidFields([]);
                setShowOtherVenue(false); setShowOtherAgenda(false);
                setPendingIndividualId(''); setPendingSelectedCompanyIds([]); setPendingCompanyId(''); setPendingIndividualIds([]);
                setTpForm({ name: '', type: '', email: '', mobile: '', organization: '' });
                setTpSaveToDB(null); setTpSelectMode('new'); setEditingContactId(null);
                onSuccess?.();
            }, 2000);
        } catch (e: any) {
            toast({ variant: 'destructive', title: 'Scheduling Failed', description: e.message });
            setFormStatus('error');
        }
    };

    // ── STEP RENDERS ─────────────────────────────────────────────────
    const renderStep0 = () => (
        <div className="sch-grid">
            <Field label="Booking Date">
                <TextInput name="bookingDate" value={formData.bookingDate} onChange={handleChange} readOnly icon={Calendar} />
            </Field>
            <Field label="Booking Day">
                <TextInput name="bookingDay" value={formData.bookingDay} onChange={handleChange} readOnly icon={Calendar} />
            </Field>
            <Field label="Meeting Date *" error={inv('meetingDate')}>
                <div className="sch-input-wrap">
                    <Calendar size={14} className="sch-input-icon" />
                    <Input type="date" name="meetingDate" min={new Date().toISOString().split('T')[0]}
                        value={formData.meetingDate} onChange={e => handleMeetingDate(e.target.value)}
                        className={`sch-input has-icon${inv('meetingDate') ? ' invalid' : ''}`} />
                </div>
            </Field>
            <Field label="Meeting Day">
                <TextInput name="meetingDay" value={formData.meetingDay} onChange={handleChange} readOnly icon={Calendar} />
            </Field>
            <Field label="Meeting Status">
                <SchSelect value={formData.status} onValueChange={v => set('status', v)}
                    placeholder="Select status"
                    items={CREATION_STATUSES.map(s => ({ value: s.value, label: s.label }))} />
            </Field>
            <Field label="Meeting Type *" error={inv('meetingType')}>
                <SchSelect value={formData.meetingType} onValueChange={v => handleSelect('meetingType', v)}
                    placeholder="Select type" invalid={inv('meetingType')}
                    items={[{ value: 'virtual', label: 'Virtual' }, { value: 'inPerson', label: 'In Person' }]} />
            </Field>
            {formData.meetingType === 'virtual' && (
                <Field label="How will this be joined? *" error={inv('virtualMeetingMode')}>
                    <SchSelect value={formData.virtualMeetingMode} onValueChange={v => handleSelect('virtualMeetingMode', v)}
                        placeholder="Select mode" invalid={inv('virtualMeetingMode')}
                        items={[{ value: 'hosted', label: "We'll generate a Google Meet link" }, { value: 'external', label: 'Provide an existing link' }]} />
                </Field>
            )}
            {formData.meetingType === 'virtual' && formData.virtualMeetingMode === 'external' && (
                <>
                    <Field label="Meeting Link *" error={inv('meetingLink')}>
                        <TextInput name="meetingLink" value={formData.meetingLink} onChange={handleChange} placeholder="https://zoom.us/j/..." icon={Link2} invalid={inv('meetingLink')} />
                    </Field>
                    <Field label="Meeting ID">
                        <TextInput name="meetingId" value={formData.meetingId} onChange={handleChange} placeholder="e.g. 123 4567 8901" icon={Hash} />
                    </Field>
                </>
            )}
            <Field label="Meeting Venue *" error={inv('meetingVenueArea')}>
                <SchSelect value={formData.meetingVenueArea} onValueChange={v => handleSelect('meetingVenueArea', v)}
                    placeholder="Select venue" invalid={inv('meetingVenueArea')}
                    items={[{ value: 'BCL BR', label: 'BCL Boardroom' }, { value: 'Client Office', label: 'Client Office' }, { value: 'Virtual', label: 'Virtual / Online' }, { value: 'Other', label: 'Other (Specify)' }]} />
            </Field>
            {showOtherVenue && (
                <Field label="Specify Venue *" error={inv('otherMeetingVenueArea')}>
                    <TextInput name="otherMeetingVenueArea" value={formData.otherMeetingVenueArea} onChange={handleChange} placeholder="e.g. Café name or address" icon={MapPin} invalid={inv('otherMeetingVenueArea')} />
                </Field>
            )}
        </div>
    );

    const renderStep1 = () => {
        const clientAttendees = formData.clientAttendees as ClientAttendee[];
        const thirdPartyAttendees = formData.thirdPartyAttendees as ThirdPartyAttendee[];
        const bclIds = formData.bclAttendees as string[];
        const bclNames = formData.bclAttendeeNames as string[];
        const bclEmailMap = formData.bclAttendeeEmailMap as Record<string, string>;

        // Pending individual for add
        const pendingInd = registryIndividuals.find(i => i.id === pendingIndividualId);
        const pendingComp = registryCompanies.find(c => c.id === pendingCompanyId);

        const secCard: React.CSSProperties = { background: '#fff', border: '1px solid #e2e8f0', borderRadius: 12, overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.06)' };
        const secBody: React.CSSProperties = { padding: '16px 18px' };
        const tabTray: React.CSSProperties = { display: 'flex', background: '#f1f5f9', borderRadius: 8, padding: 3, width: 'fit-content', marginBottom: 14 };
        const tabBtn = (active: boolean, color = '#1d4ed8'): React.CSSProperties => ({
            padding: '5px 14px', borderRadius: 6, fontSize: 11, fontWeight: 700, cursor: 'pointer',
            fontFamily: 'Inter, sans-serif', border: 'none', transition: 'all 0.15s',
            background: active ? '#fff' : 'transparent',
            color: active ? color : '#64868c',
            boxShadow: active ? '0 1px 4px rgba(0,0,0,0.1)' : 'none',
        });

        return (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

                {/* ── SECTION A: CLIENT ATTENDEES ── */}
                <div style={secCard}>
                    {/* Header */}
                    <div style={{ padding: '12px 18px', background: inv('clientAttendees') ? '#fef2f2' : '#f8fafc', borderBottom: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', gap: 10 }}>
                        <div style={{ width: 30, height: 30, borderRadius: 8, background: '#1d4ed8', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                            <User size={14} color="#fff" />
                        </div>
                        <div style={{ flex: 1 }}>
                            <div style={{ fontSize: 12, fontWeight: 800, color: '#1d4ed8', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Client Attendees</div>
                            <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 1 }}>Search the registry to add meeting participants</div>
                        </div>
                        {inv('clientAttendees') && (
                            <span style={{ fontSize: 10, fontWeight: 700, color: '#ef4444', background: '#fee2e2', padding: '3px 8px', borderRadius: 5, flexShrink: 0 }}>Required</span>
                        )}
                    </div>

                    <div style={secBody}>
                        {/* Mode toggle */}
                        <div style={tabTray}>
                            {(['individual', 'company'] as const).map(mode => (
                                <button key={mode} style={tabBtn(clientSearchMode === mode)}
                                    onClick={() => { setClientSearchMode(mode); setPendingIndividualId(''); setPendingSelectedCompanyIds([]); setPendingCompanyId(''); setPendingIndividualIds([]); }}>
                                    {mode === 'individual' ? 'By Individual' : 'By Company'}
                                </button>
                            ))}
                        </div>

                        {/* Individual search */}
                        {clientSearchMode === 'individual' && (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                                <div style={{ display: 'flex', gap: 8, alignItems: 'flex-end' }}>
                                    <div style={{ flex: 1 }}>
                                        <Field label="Search Individual">
                                            {loadingRegistry
                                                ? <Button className="sch-select-trigger h-10" disabled style={{ opacity: 0.6 }}><Loader2 size={13} className="animate-spin" /> Loading…</Button>
                                                : <SearchableSelect
                                                    value={pendingIndividualId}
                                                    onValueChange={v => { setPendingIndividualId(v); setPendingSelectedCompanyIds([]); }}
                                                    options={registryIndividuals.map(i => ({ value: i.id, label: i.name }))}
                                                    placeholder="Type to search by name…"
                                                    searchPlaceholder="Type to search…"
                                                    buttonClassName="sch-select-trigger h-10"
                                                />
                                            }
                                        </Field>
                                    </div>
                                    <Button className="sch-btn-next h-10" style={{ paddingLeft: 16, paddingRight: 16, flexShrink: 0 }} onClick={addClientAttendeeFromIndividual} disabled={!pendingIndividualId}>
                                        <Plus size={13} /> Add
                                    </Button>
                                </div>
                                {pendingInd && (
                                    <div style={{ background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: 9, padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: 8 }}>
                                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, fontSize: 12, color: '#475569', alignItems: 'center' }}>
                                            <span style={{ fontWeight: 700, color: '#1d4ed8', fontSize: 13 }}>{pendingInd.name}</span>
                                            {pendingInd.email && <span style={{ display: 'flex', alignItems: 'center', gap: 3 }}><Mail size={10} />{pendingInd.email}</span>}
                                            {pendingInd.mobile && <span style={{ display: 'flex', alignItems: 'center', gap: 3 }}><Phone size={10} />{pendingInd.mobile}</span>}
                                        </div>
                                        {pendingInd.companies.length > 1 && (
                                            <div>
                                                <div style={{ fontSize: 10, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>Select Companies</div>
                                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 7 }}>
                                                    {pendingInd.companies.map((c: any) => (
                                                        <label key={c.id} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, cursor: 'pointer', fontSize: 12, fontWeight: 600, color: '#374151', background: '#fff', border: '1px solid #dbeafe', borderRadius: 6, padding: '4px 10px' }}>
                                                            <Checkbox checked={pendingSelectedCompanyIds.includes(c.id)} onCheckedChange={ch => setPendingSelectedCompanyIds(prev => ch ? [...prev, c.id] : prev.filter(x => x !== c.id))} />
                                                            {c.name}
                                                        </label>
                                                    ))}
                                                </div>
                                            </div>
                                        )}
                                        {pendingInd.companies.length === 1 && (
                                            <span style={{ fontSize: 12, color: '#475569', display: 'flex', alignItems: 'center', gap: 5 }}><Building size={11} color="#1d4ed8" />{pendingInd.companies[0].name}</span>
                                        )}
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Company search */}
                        {clientSearchMode === 'company' && (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                                <Field label="Search Company">
                                    {loadingRegistry
                                        ? <Button className="sch-select-trigger h-10" disabled style={{ opacity: 0.6 }}><Loader2 size={13} className="animate-spin" /> Loading…</Button>
                                        : <SearchableSelect
                                            value={pendingCompanyId}
                                            onValueChange={v => { setPendingCompanyId(v); setPendingIndividualIds([]); }}
                                            options={registryCompanies.map(c => ({ value: c.id, label: c.name }))}
                                            placeholder="Type to search by company name…"
                                            searchPlaceholder="Type to search…"
                                            buttonClassName="sch-select-trigger h-10"
                                        />
                                    }
                                </Field>
                                {pendingComp && (
                                    <div style={{ background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: 9, padding: '12px 14px' }}>
                                        <div style={{ fontSize: 10, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>Select Individuals</div>
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: 4, maxHeight: 160, overflowY: 'auto' }}>
                                            {pendingComp.individuals.length === 0
                                                ? <span style={{ fontSize: 12, color: '#94a3b8', fontStyle: 'italic' }}>No individuals found for this company.</span>
                                                : pendingComp.individuals.map((ind: any) => (
                                                    <label key={ind.id} style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', padding: '4px 6px', borderRadius: 6, background: pendingIndividualIds.includes(ind.id) ? '#dbeafe' : 'transparent' }}>
                                                        <Checkbox checked={pendingIndividualIds.includes(ind.id)} onCheckedChange={ch => setPendingIndividualIds(prev => ch ? [...prev, ind.id] : prev.filter(x => x !== ind.id))} />
                                                        <span style={{ fontSize: 13, fontWeight: 600, color: '#1d4ed8', flex: 1 }}>{ind.name}</span>
                                                        {ind.email && <span style={{ fontSize: 11, color: '#94a3b8' }}>{ind.email}</span>}
                                                    </label>
                                                ))
                                            }
                                        </div>
                                    </div>
                                )}
                                <Button className="sch-btn-next h-auto" style={{ alignSelf: 'flex-start' }} onClick={addClientAttendeesFromCompany} disabled={!pendingCompanyId || pendingIndividualIds.length === 0}>
                                    <Plus size={13} /> Add Selected {pendingIndividualIds.length > 0 && `(${pendingIndividualIds.length})`}
                                </Button>
                            </div>
                        )}

                        {/* Added attendees */}
                        {clientAttendees.length > 0 && (
                            <div style={{ marginTop: 14, display: 'flex', flexDirection: 'column', gap: 8 }}>
                                <div style={{ fontSize: 10, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                                    Added — {clientAttendees.length} attendee{clientAttendees.length !== 1 ? 's' : ''}
                                </div>
                                {clientAttendees.map(a => (
                                    <div key={a.id} style={{ background: editingContactId === a.id ? '#eff6ff' : '#f8fafc', border: `1px solid ${editingContactId === a.id ? '#bfdbfe' : '#e2e8f0'}`, borderRadius: 9, padding: '10px 14px', display: 'flex', flexDirection: 'column', gap: 0 }}>
                                        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                                            <div style={{ width: 30, height: 30, borderRadius: 8, background: '#dbeafe', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 1 }}>
                                                <User size={13} color="#1d4ed8" />
                                            </div>
                                            <div style={{ flex: 1, minWidth: 0 }}>
                                                <div style={{ fontWeight: 700, fontSize: 13, color: '#1e40af', lineHeight: 1.3 }}>{a.name}</div>
                                                <div style={{ fontSize: 11, color: '#64748b', display: 'flex', flexWrap: 'wrap', gap: 10, marginTop: 3, alignItems: 'center' }}>
                                                    {a.email
                                                        ? <span style={{ display: 'flex', alignItems: 'center', gap: 3 }}><Mail size={9} />{a.email}</span>
                                                        : <span style={{ color: '#f59e0b', fontStyle: 'italic' }}>No email</span>}
                                                    {a.mobile
                                                        ? <span style={{ display: 'flex', alignItems: 'center', gap: 3 }}><Phone size={9} />{a.mobile}</span>
                                                        : <span style={{ color: '#f59e0b', fontStyle: 'italic' }}>No mobile</span>}
                                                    {a.whatsapp && <span style={{ color: '#16a34a', fontWeight: 600 }}>WA: {a.whatsapp}</span>}
                                                </div>
                                                {a.companies.length > 0 && editingContactId !== a.id && (
                                                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 6 }}>
                                                        {a.companies.map(c => (
                                                            <label key={c.id} style={{ display: 'inline-flex', alignItems: 'center', gap: 5, cursor: 'pointer', fontSize: 11, fontWeight: 600, color: '#374151', background: '#fff', border: '1px solid #e2e8f0', borderRadius: 5, padding: '2px 8px' }}>
                                                                <Checkbox checked={a.selectedCompanyIds.includes(c.id)} onCheckedChange={ch => toggleClientAttendeeCompany(a.id, c.id, !!ch)} />
                                                                {c.name}
                                                            </label>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>
                                            <div style={{ display: 'flex', gap: 5, alignItems: 'center', flexShrink: 0 }}>
                                                {editingContactId !== a.id && (
                                                    <button onClick={() => startEditContact(a)} style={{ fontSize: 10, fontWeight: 700, color: '#1d4ed8', cursor: 'pointer', background: '#dbeafe', border: 'none', borderRadius: 5, padding: '3px 9px', whiteSpace: 'nowrap' }}>
                                                        {!a.email && !a.mobile ? '+ Add contact' : 'Edit'}
                                                    </button>
                                                )}
                                                <button onClick={() => removeClientAttendee(a.id)} style={{ color: '#94a3b8', cursor: 'pointer', background: 'none', border: 'none', padding: '3px', display: 'flex', alignItems: 'center', borderRadius: 4 }}>
                                                    <X size={13} />
                                                </button>
                                            </div>
                                        </div>
                                        {/* Inline contact edit */}
                                        {editingContactId === a.id && (
                                            <div style={{ borderTop: '1px solid #bfdbfe', marginTop: 10, paddingTop: 12, display: 'flex', flexDirection: 'column', gap: 10 }}>
                                                <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: '#1d4ed8' }}>Edit Contact Details</div>
                                                <div className="sch-grid">
                                                    <Field label="Email">
                                                        <TextInput icon={Mail} type="email" value={contactEditForm.email} onChange={e => setContactEditForm(p => ({ ...p, email: e.target.value }))} placeholder="email@example.com" name={`ce_email_${a.id}`} />
                                                    </Field>
                                                    <Field label="Mobile">
                                                        <TextInput icon={Phone} type="tel" value={contactEditForm.mobile} onChange={e => setContactEditForm(p => ({ ...p, mobile: e.target.value }))} placeholder="+254..." name={`ce_mob_${a.id}`} />
                                                    </Field>
                                                    <Field label="Alt Mobile">
                                                        <TextInput icon={Phone} type="tel" value={contactEditForm.alt_mobile} onChange={e => setContactEditForm(p => ({ ...p, alt_mobile: e.target.value }))} placeholder="+254..." name={`ce_alt_${a.id}`} />
                                                    </Field>
                                                    <Field label="WhatsApp">
                                                        <TextInput icon={Phone} type="tel" value={contactEditForm.whatsapp} onChange={e => setContactEditForm(p => ({ ...p, whatsapp: e.target.value }))} placeholder="+254..." name={`ce_wa_${a.id}`} />
                                                    </Field>
                                                </div>
                                                <div style={{ display: 'flex', gap: 8 }}>
                                                    <Button className="sch-btn-next h-auto" style={{ fontSize: 11 }} disabled={savingContact} onClick={() => saveContactDetails(a.id)}>
                                                        {savingContact ? <><Loader2 size={12} className="animate-spin" /> Saving…</> : 'Save to registry'}
                                                    </Button>
                                                    <Button className="sch-btn-prev h-auto" style={{ fontSize: 11 }} onClick={() => setEditingContactId(null)}>Cancel</Button>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>

                {/* ── SECTION B: BCL ATTENDEES ── */}
                <div style={secCard}>
                    <div style={{ padding: '12px 18px', background: inv('bclAttendees') ? '#fef2f2' : '#f0fdf9', borderBottom: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', gap: 10 }}>
                        <div style={{ width: 30, height: 30, borderRadius: 8, background: '#0d9488', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                            <Building size={14} color="#fff" />
                        </div>
                        <div style={{ flex: 1 }}>
                            <div style={{ fontSize: 12, fontWeight: 800, color: '#0d9488', textTransform: 'uppercase', letterSpacing: '0.06em' }}>BCL Attendees</div>
                            <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 1 }}>Internal team members joining this meeting</div>
                        </div>
                        {inv('bclAttendees') && (
                            <span style={{ fontSize: 10, fontWeight: 700, color: '#ef4444', background: '#fee2e2', padding: '3px 8px', borderRadius: 5, flexShrink: 0 }}>Required</span>
                        )}
                    </div>
                    <div style={secBody}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                            <Field label="Select BCL Attendee(s) *" error={inv('bclAttendees')}>
                                {loadingBclAttendees
                                    ? <Button className="sch-select-trigger h-10" disabled style={{ opacity: 0.6 }}><Loader2 size={13} className="animate-spin" /> Loading…</Button>
                                    : <SearchableMultiSelect
                                        values={bclIds}
                                        onValuesChange={vals => {
                                            const names = vals.map(id => bclAttendees.find(a => a.id === id)?.displayName ?? id);
                                            setFormData(p => ({ ...p, bclAttendees: vals, bclAttendeeNames: names }));
                                        }}
                                        options={bclAttendees.map(a => ({ value: a.id, label: a.displayName, sublabel: a.email || '' }))}
                                        placeholder="Search and select BCL attendee(s)…"
                                        searchPlaceholder="Search by name…"
                                        invalid={inv('bclAttendees')}
                                        buttonClassName={`sch-select-trigger h-auto min-h-10${inv('bclAttendees') ? ' invalid' : ''}`}
                                    />
                                }
                            </Field>
                            {bclIds.length > 0 && (
                                <div style={{ background: '#f0fdf9', border: '1px solid #99f6e4', borderRadius: 9, padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: 10 }}>
                                    <div style={{ fontSize: 10, fontWeight: 700, color: '#0d9488', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Attendee Emails</div>
                                    <div className="sch-grid">
                                        {bclIds.map((id, i) => {
                                            const attendee = bclAttendees.find(a => a.id === id);
                                            const autoEmail = attendee?.email || '';
                                            return (
                                                <Field key={id} label={bclNames[i]}>
                                                    <TextInput icon={Mail} type="email"
                                                        value={bclEmailMap[id] ?? autoEmail}
                                                        onChange={e => setFormData(p => ({ ...p, bclAttendeeEmailMap: { ...(p.bclAttendeeEmailMap as Record<string, string>), [id]: e.target.value } }))}
                                                        placeholder={autoEmail || 'attendee@bcl.co.ke'}
                                                    />
                                                </Field>
                                            );
                                        })}
                                    </div>
                                </div>
                            )}
                            <Field label="BCL Office Mobile">
                                <TextInput name="bclAttendeeMobile" value={formData.bclAttendeeMobile} onChange={handleChange} icon={Phone} readOnly />
                            </Field>
                        </div>
                    </div>
                </div>

                {/* ── SECTION C: THIRD PARTY ATTENDEES ── */}
                <div style={secCard}>
                    <div style={{ padding: '12px 18px', background: '#faf5ff', borderBottom: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', gap: 10 }}>
                        <div style={{ width: 30, height: 30, borderRadius: 8, background: '#7c3aed', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                            <Building size={14} color="#fff" />
                        </div>
                        <div style={{ flex: 1 }}>
                            <div style={{ fontSize: 12, fontWeight: 800, color: '#7c3aed', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Third Party Attendees</div>
                            <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 1 }}>Banks, vendors, software providers and other external parties</div>
                        </div>
                        <span style={{ fontSize: 10, fontWeight: 700, color: '#94a3b8', background: '#f1f5f9', padding: '3px 8px', borderRadius: 5 }}>Optional</span>
                    </div>
                    <div style={secBody}>
                        {/* Mode toggle */}
                        <div style={tabTray}>
                            {(['existing', 'new'] as const).map(mode => (
                                <button key={mode} style={tabBtn(tpSelectMode === mode, '#7c3aed')}
                                    onClick={() => { setTpSelectMode(mode); setTpSaveToDB(null); }}>
                                    {mode === 'existing' ? 'Saved Contacts' : 'Add New'}
                                </button>
                            ))}
                        </div>

                        {/* Existing contacts */}
                        {tpSelectMode === 'existing' && (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                                {loadingTpExisting
                                    ? <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, color: '#94a3b8', padding: '10px 0' }}><Loader2 size={13} className="animate-spin" /> Loading contacts…</div>
                                    : tpExisting.length === 0
                                        ? <div style={{ fontSize: 12, color: '#94a3b8', fontStyle: 'italic', padding: '10px 0', textAlign: 'center' }}>No saved contacts yet. Use "Add New" to create one.</div>
                                        : tpExisting.map(tp => {
                                            const added = thirdPartyAttendees.some(a => a.key === tp.id);
                                            return (
                                                <div key={tp.id} style={{ background: added ? '#f0fdf4' : '#f8fafc', border: `1px solid ${added ? '#bbf7d0' : '#e2e8f0'}`, borderRadius: 9, padding: '10px 14px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
                                                    <div style={{ flex: 1, minWidth: 0 }}>
                                                        <div style={{ display: 'flex', alignItems: 'center', gap: 7, flexWrap: 'wrap' }}>
                                                            <span style={{ fontWeight: 700, fontSize: 13, color: '#1d4ed8' }}>{tp.name}</span>
                                                            {tp.type && <span style={{ background: '#ede9fe', borderRadius: 4, padding: '1px 7px', fontSize: 10, fontWeight: 700, color: '#7c3aed' }}>{tp.type}</span>}
                                                            {tp.organization && <span style={{ fontSize: 12, color: '#64748b' }}>{tp.organization}</span>}
                                                        </div>
                                                        {(tp.email || tp.mobile) && (
                                                            <div style={{ display: 'flex', gap: 10, marginTop: 4, fontSize: 11, color: '#64748b' }}>
                                                                {tp.email && <span style={{ display: 'flex', alignItems: 'center', gap: 3 }}><Mail size={9} />{tp.email}</span>}
                                                                {tp.mobile && <span style={{ display: 'flex', alignItems: 'center', gap: 3 }}><Phone size={9} />{tp.mobile}</span>}
                                                            </div>
                                                        )}
                                                    </div>
                                                    <button disabled={added} onClick={() => addExistingThirdParty(tp)}
                                                        style={{ fontSize: 11, fontWeight: 700, padding: '5px 12px', borderRadius: 7, border: 'none', cursor: added ? 'default' : 'pointer', background: added ? 'transparent' : '#7c3aed', color: added ? '#16a34a' : '#fff', whiteSpace: 'nowrap', flexShrink: 0 }}>
                                                        {added ? '✓ Added' : '+ Add'}
                                                    </button>
                                                </div>
                                            );
                                        })
                                }
                            </div>
                        )}

                        {/* New contact form */}
                        {tpSelectMode === 'new' && (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                                <div className="sch-grid">
                                    <Field label="Contact Name *">
                                        <TextInput icon={User} value={tpForm.name} onChange={e => setTpForm(p => ({ ...p, name: e.target.value }))} placeholder="e.g. Jane Smith" name="tp_name" />
                                    </Field>
                                    <Field label="Type">
                                        <SchSelect value={tpForm.type} onValueChange={v => setTpForm(p => ({ ...p, type: v }))}
                                            placeholder="Select type"
                                            items={[
                                                { value: 'Bank', label: 'Bank' },
                                                { value: 'Software Provider', label: 'Software Provider' },
                                                { value: 'Vendor', label: 'Vendor' },
                                                { value: 'Legal / Regulatory', label: 'Legal / Regulatory' },
                                                { value: 'Consultant', label: 'Consultant' },
                                                { value: 'Other', label: 'Other' },
                                            ]} />
                                    </Field>
                                    <Field label="Organisation">
                                        <TextInput icon={Building} value={tpForm.organization} onChange={e => setTpForm(p => ({ ...p, organization: e.target.value }))} placeholder="e.g. Equity Bank" name="tp_org" />
                                    </Field>
                                    <Field label="Email">
                                        <TextInput icon={Mail} type="email" value={tpForm.email} onChange={e => setTpForm(p => ({ ...p, email: e.target.value }))} placeholder="email@org.com" name="tp_email" />
                                    </Field>
                                    <Field label="Mobile">
                                        <TextInput icon={Phone} type="tel" value={tpForm.mobile} onChange={e => setTpForm(p => ({ ...p, mobile: e.target.value }))} placeholder="+254..." name="tp_mobile" />
                                    </Field>
                                </div>
                                {tpSaveToDB === 'ask' && tpForm.name.trim() && (
                                    <div style={{ background: '#fffbeb', border: '1px solid #fcd34d', borderRadius: 9, padding: '13px 15px', display: 'flex', flexDirection: 'column', gap: 8 }}>
                                        <div style={{ fontSize: 12, fontWeight: 700, color: '#92400e' }}>Save this contact to the database?</div>
                                        <div style={{ fontSize: 11, color: '#a16207', lineHeight: 1.6 }}>Saving creates a permanent record in <strong>third_party_contacts</strong> so it can be reused in future meetings.</div>
                                        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                                            <Button className="sch-btn-next h-auto" style={{ fontSize: 11 }} disabled={tpSubmitting} onClick={() => handleAddThirdParty(true)}>
                                                {tpSubmitting ? <><Loader2 size={12} className="animate-spin" /> Saving…</> : 'Yes, save to database'}
                                            </Button>
                                            <Button className="sch-btn-prev h-auto" style={{ fontSize: 11 }} disabled={tpSubmitting} onClick={() => handleAddThirdParty(false)}>
                                                Just for this meeting
                                            </Button>
                                            <Button className="sch-btn-prev h-auto" style={{ fontSize: 11 }} onClick={() => setTpSaveToDB(null)}>Cancel</Button>
                                        </div>
                                    </div>
                                )}
                                {tpSaveToDB !== 'ask' && (
                                    <div>
                                        <Button className="sch-btn-next h-auto" style={{ fontSize: 12 }} disabled={!tpForm.name.trim()}
                                            onClick={() => { if (tpForm.name.trim()) setTpSaveToDB('ask'); }}>
                                            <Plus size={13} /> Add Third Party
                                        </Button>
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Added list */}
                        {thirdPartyAttendees.length > 0 && (
                            <div style={{ marginTop: 14, display: 'flex', flexDirection: 'column', gap: 7 }}>
                                <div style={{ fontSize: 10, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                                    Added — {thirdPartyAttendees.length} contact{thirdPartyAttendees.length !== 1 ? 's' : ''}
                                </div>
                                {thirdPartyAttendees.map(tp => (
                                    <div key={tp.key} style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 9, padding: '10px 14px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
                                        <div style={{ flex: 1, minWidth: 0 }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: 7, flexWrap: 'wrap' }}>
                                                <span style={{ fontWeight: 700, fontSize: 13, color: '#1d4ed8' }}>{tp.name}</span>
                                                {tp.type && <span style={{ background: '#ede9fe', borderRadius: 4, padding: '1px 7px', fontSize: 10, fontWeight: 700, color: '#7c3aed' }}>{tp.type}</span>}
                                                {tp.organization && <span style={{ fontSize: 12, color: '#64748b' }}>{tp.organization}</span>}
                                            </div>
                                            {(tp.email || tp.mobile) && (
                                                <div style={{ display: 'flex', gap: 10, marginTop: 4, fontSize: 11, color: '#64748b' }}>
                                                    {tp.email && <span style={{ display: 'flex', alignItems: 'center', gap: 3 }}><Mail size={9} />{tp.email}</span>}
                                                    {tp.mobile && <span style={{ display: 'flex', alignItems: 'center', gap: 3 }}><Phone size={9} />{tp.mobile}</span>}
                                                </div>
                                            )}
                                        </div>
                                        <button onClick={() => setFormData(p => ({ ...p, thirdPartyAttendees: (p.thirdPartyAttendees as ThirdPartyAttendee[]).filter(x => x.key !== tp.key) }))}
                                            style={{ color: '#94a3b8', cursor: 'pointer', background: 'none', border: 'none', padding: '3px', display: 'flex', alignItems: 'center', borderRadius: 4 }}>
                                            <X size={13} />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        );
    };

    const renderStep2 = () => (
        <div className="sch-grid">
            <Field label="Meeting Start Time *" error={inv('meetingStartTime')}>
                <div className="sch-input-wrap">
                    <Clock size={14} className="sch-input-icon" />
                    <Input type="time" className={`sch-input has-icon${inv('meetingStartTime') ? ' invalid' : ''}`}
                        value={formData.meetingStartTime} onChange={e => handleStartTime(e.target.value)} />
                </div>
            </Field>
            <Field label="Meeting Duration *" error={inv('meetingDuration')}>
                <SchSelect value={formData.meetingDuration} onValueChange={handleDuration}
                    placeholder="Select duration" invalid={inv('meetingDuration')}
                    items={[{ value: '15', label: '15 min' }, { value: '30', label: '30 min' }, { value: '45', label: '45 min' }, { value: '60', label: '1 hour' }, { value: '90', label: '1.5 hours' }, { value: '120', label: '2 hours' }, { value: '180', label: '3 hours' }, { value: '240', label: '4 hours' }, { value: '300', label: '5 hours' }]} />
            </Field>
            <Field label="Meeting End Time">
                <TextInput name="meetingEndTime" value={formData.meetingEndTime} onChange={handleChange} icon={Clock} readOnly />
            </Field>
            <Field label="Travel Time (Each Way) *" error={inv('venueDistance')}>
                <SchSelect value={formData.venueDistance} onValueChange={handleTravel}
                    placeholder="Select travel time" invalid={inv('venueDistance')}
                    items={[{ value: '0', label: '0 min (Virtual)' }, { value: '10', label: '10 min' }, { value: '15', label: '15 min' }, { value: '30', label: '30 min' }, { value: '45', label: '45 min' }, { value: '60', label: '1 hour' }, { value: '90', label: '1.5 hours' }, { value: '120', label: '2 hours' }]} />
            </Field>
            <Field label="Calendar Slot Start">
                <TextInput name="meetingSlotStartTime" value={formData.meetingSlotStartTime} onChange={handleChange} icon={Calendar} readOnly />
            </Field>
            <Field label="Calendar Slot End">
                <TextInput name="meetingSlotEndTime" value={formData.meetingSlotEndTime} onChange={handleChange} icon={Calendar} readOnly />
            </Field>
            <div className="sch-grid-full">
                <Field label="Meeting Agenda *" error={inv('meetingAgenda')}>
                    <SchSelect value={formData.meetingAgenda} onValueChange={v => handleSelect('meetingAgenda', v)}
                        placeholder="Select agenda" invalid={inv('meetingAgenda')}
                        items={[{ value: 'Introduction & Needs Discovery', label: 'Introduction & Needs Discovery' }, { value: 'Proposal Review', label: 'Proposal Review' }, { value: 'Project Kick-off', label: 'Project Kick-off' }, { value: 'Project Update/Review', label: 'Project Update/Review' }, { value: 'Product/Service Demo', label: 'Product/Service Demo' }, { value: 'Support/Training', label: 'Support/Training' }, { value: 'Partnership Discussion', label: 'Partnership Discussion' }, { value: 'General Catch-up', label: 'General Catch-up' }, { value: 'Other', label: 'Other (Specify)' }]} />
                </Field>
            </div>
            {showOtherAgenda && (
                <div className="sch-grid-full">
                    <Field label="Specify Agenda *" error={inv('otherMeetingAgenda')}>
                        <Textarea className={`sch-textarea${inv('otherMeetingAgenda') ? ' invalid' : ''}`}
                            value={formData.otherMeetingAgenda} onChange={e => set('otherMeetingAgenda', e.target.value)}
                            placeholder="Briefly describe the meeting purpose…" rows={3} />
                    </Field>
                </div>
            )}
        </div>
    );

    const renderStep3 = () => {
        const finalCompany = formData.clientCompany;
        const finalAgenda = formData.meetingAgenda === 'Other' ? formData.otherMeetingAgenda : formData.meetingAgenda;
        const statusLabel = CREATION_STATUSES.find(s => s.value === formData.status)?.label ?? formData.status;
        const clientAttendees = formData.clientAttendees as ClientAttendee[];
        const thirdPartyAttendees = formData.thirdPartyAttendees as ThirdPartyAttendee[];
        const items = [
            { label: 'Status', value: statusLabel },
            { label: 'Client Attendee(s)', value: clientAttendees.map(a => `${a.name}${a.companies.filter(c => a.selectedCompanyIds.includes(c.id)).length ? ` (${a.companies.filter(c => a.selectedCompanyIds.includes(c.id)).map(c => c.name).join(', ')})` : ''}`).join('; ') || '—' },
            { label: 'Client Mobile', value: formData.clientMobile },
            { label: 'Client Email', value: formData.clientEmail || '—' },
            { label: 'Meeting Date', value: formData.meetingDate ? new Date(formData.meetingDate).toLocaleDateString('en-GB') : '—' },
            { label: 'Meeting Time', value: `${formData.meetingStartTime || '--:--'} – ${formData.meetingEndTime || '--:--'}` },
            { label: 'Calendar Slot', value: `${formData.meetingSlotStartTime || '--:--'} – ${formData.meetingSlotEndTime || '--:--'}` },
            { label: 'Duration', value: formData.meetingDuration ? `${formData.meetingDuration} min` : '—' },
            { label: 'Type', value: formData.meetingType === 'inPerson' ? 'In Person' : 'Virtual' },
            ...(formData.meetingType === 'virtual' ? [
                { label: 'Joining via', value: formData.virtualMeetingMode === 'external' ? 'External link (provided)' : "Google Meet (auto-generated)" },
                ...(formData.virtualMeetingMode === 'external' ? [
                    { label: 'Meeting Link', value: formData.meetingLink || '—' },
                    { label: 'Meeting ID', value: formData.meetingId || '—' },
                ] : []),
            ] : []),
            { label: 'Venue', value: formData.meetingVenueArea === 'Other' ? formData.otherMeetingVenueArea : formData.meetingVenueArea },
            { label: 'Agenda', value: finalAgenda },
            { label: 'BCL Attendee(s)', value: (formData.bclAttendeeNames as string[]).join(', ') || '—' },
            { label: 'Third Party Attendees', value: thirdPartyAttendees.map(tp => `${tp.name}${tp.type ? ` (${tp.type})` : ''}`).join('; ') || '—' },
            { label: 'Travel Time', value: `${formData.venueDistance} min` },
        ];
        return (
            <>
                <div className="sch-confirm-grid">
                    {items.map(it => (
                        <div key={it.label} className="sch-confirm-item">
                            <div className="sch-confirm-label">{it.label}</div>
                            <div className="sch-confirm-value">{it.value || '—'}</div>
                        </div>
                    ))}
                </div>
                {formStatus === 'success' && (
                    <div className="sch-banner sch-banner-success">
                        <Check size={17} /> <span><strong>Success!</strong> Meeting scheduled successfully.</span>
                    </div>
                )}
                {formStatus === 'error' && (
                    <div className="sch-banner sch-banner-error">
                        <Info size={17} /> <span><strong>Error!</strong> Please try again.</span>
                    </div>
                )}
            </>
        );
    };

    return (
        <div className="bg-white">
            {/* HEADER */}
            <div className="flex gap-4 p-4">
                <div>
                    <div className="sch-badge"><Calendar size={11} /> Booksmart Scheduler</div>
                    <h2 className="text-2xl font-bold text-blue-700">Schedule New Meeting</h2>
                    <div className="sch-subtitle">Capture client, attendee, slot, and agenda details in one guided flow.</div>
                </div>
                <div className='flex gap-4 h-full'>
                    <div className="flex gap-4">
                        <div className="p-4 rounded-md bg-white border text-xs shadow-md">
                            <div className="text-blue-700 font-bold text-sm">{formData.meetingDate || 'No date'}</div>
                            <div className="text-[10px] font-bold text-slate-400 uppercase">Meeting date</div>
                        </div>
                        <div className="p-4 rounded-md bg-white border text-xs shadow-md">
                            <div className="text-blue-700 font-bold text-sm">{formData.meetingStartTime || '--:--'}</div>
                            <div className="text-[10px] font-bold text-slate-400 uppercase">Start time</div>
                        </div>
                    </div>
                    <Button className={`p-4 rounded-md bg-white border text-xs shadow-md h-auto ${isListening ? 'sch-voice-on' : 'sch-voice-off'}`} onClick={toggleListening}>
                        {isListening ? <><MicOff size={13} /> Stop</> : <><Mic size={13} /> Voice</>}
                    </Button>
                </div>
            </div>

            {/* STEP INDICATOR */}
            <div className="sch-steps">
                {STEPS.map((step, idx) => {
                    const state = activeStep === step.id ? 'active' : activeStep > step.id ? 'done' : 'inactive';
                    return (
                        <React.Fragment key={step.id}>
                            <div className="sch-step" onClick={() => { if (activeStep > step.id) { setActiveStep(step.id); setInvalidFields([]); } }}>
                                <div className={`sch-step-circle ${state}`}>
                                    {state === 'done'
                                        ? <Check size={16} className="sch-step-icon-done" />
                                        : <step.Icon size={16} className={`sch-step-icon-${state}`} />
                                    }
                                </div>
                                <span className={`sch-step-label ${state}`}>{step.name}</span>
                            </div>
                            {idx < STEPS.length - 1 && (
                                <div className={`sch-step-connector ${activeStep > idx ? 'done' : 'inactive'}`} />
                            )}
                        </React.Fragment>
                    );
                })}
            </div>

            {/* BODY */}
            <div className="sch-body">
                <div className="sch-section-title">
                    {['Basic Information', 'Client Information', 'Scheduling Details', 'Confirm Meeting Details'][activeStep]}
                </div>
                <div style={{ minHeight: 320 }}>
                    {activeStep === 0 && renderStep0()}
                    {activeStep === 1 && renderStep1()}
                    {activeStep === 2 && renderStep2()}
                    {activeStep === 3 && renderStep3()}
                </div>
            </div>

            {/* FOOTER */}
            <div className="sch-footer">
                <Button className="sch-btn-prev h-auto" onClick={prevStep} disabled={activeStep === 0 || formStatus === 'submitting'}>
                    <ChevronLeft size={15} /> Previous
                </Button>

                {activeStep < STEPS.length - 1 ? (
                    <Button className="sch-btn-next h-auto" onClick={nextStep} disabled={formStatus === 'submitting'}>
                        Next Step <ChevronRight size={15} />
                    </Button>
                ) : (
                    <Button
                        className={`sch-btn-submit h-auto${formStatus === 'success' ? ' sch-btn-success' : ''}`}
                        onClick={handleSubmit}
                        disabled={formStatus === 'submitting' || formStatus === 'success'}
                    >
                        {formStatus === 'submitting' ? <><Loader2 size={14} className="animate-spin" /> Scheduling…</>
                            : formStatus === 'success' ? <><Check size={14} /> Scheduled!</>
                                : 'Confirm & Schedule'}
                    </Button>
                )}
            </div>
        </div>
    );
}

// ── SCHEDULE DIALOG (importable by other pages) ───────────────────────────────
export function ScheduleDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (o: boolean) => void }) {
    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent style={{ maxWidth: 960, padding: 0, borderRadius: 14, border: '1px solid #eef2f3', overflow: 'hidden', background: 'transparent', boxShadow: '0 22px 55px rgba(0,48,56,0.15)' }}>
                <SchedulerStyles />
                <div style={{ maxHeight: '90vh', overflowY: 'auto' }}>
                    <SchedulerForm onSuccess={() => onOpenChange(false)} />
                </div>
            </DialogContent>
        </Dialog>
    );
}

// ── PAGE ─────────────────────────────────────────────────────────────────────
const SchedulePage = () => {
    const [open, setOpen] = useState(false);

    return (
        <div className="sch-shell" style={{ fontFamily: 'Inter, sans-serif', background: '#f4f7f8', minHeight: '100vh', padding: 24, display: 'flex', alignItems: 'flex-start', justifyContent: 'center' }}>
            <SchedulerStyles />
            <Toaster />

            <div className="sch-landing">
                <div className="sch-landing-icon">
                    <Calendar size={32} color="#fff" />
                </div>
                <div className="sch-landing-title">Booksmart Scheduler</div>
                <div className="sch-landing-sub">
                    Schedule client meetings with guided steps — capture attendees, slot times, agenda, and sync to your calendar automatically.
                </div>
                <button className="sch-landing-btn" onClick={() => setOpen(true)}>
                    <Plus size={16} /> Schedule New Meeting
                </button>
            </div>

            <ScheduleDialog open={open} onOpenChange={setOpen} />
        </div>
    );
};

export default SchedulePage;
