// @ts-nocheck
"use client"

import React, { useEffect, useState, useCallback } from 'react';
import SpeechRecognition, { useSpeechRecognition } from 'react-speech-recognition';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { Toaster } from "@/components/ui/toaster";
import {
    Calendar, Clock, Mic, MicOff, Building, User, Phone, Mail,
    MapPin, Check, ChevronRight, ChevronLeft, Loader2, Info, X, Video
} from 'lucide-react';
import supabase from '@/utils/supabaseClient';

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
    }

    .sch-card {
      max-width: 900px;
      margin: 0 auto;
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
    .sch-header-chips { display: flex; gap: 10px; flex-shrink: 0; }
    .sch-chip {
      background: #ffffff; border: 1px solid #eef2f3;
      border-radius: 9px; padding: 10px 16px;
      box-shadow: 0 8px 20px rgba(0,48,56,0.07);
    }
    .sch-chip-val { font-size: 13px; font-weight: 800; color: #1d4ed8; }
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

// ── CONSTANTS ────────────────────────────────────────────────────
const STEPS = [
    { id: 0, name: 'Basic Info', Icon: Info },
    { id: 1, name: 'Client Details', Icon: User },
    { id: 2, name: 'Scheduling', Icon: Clock },
    { id: 3, name: 'Confirm', Icon: Check },
];

const FIELDS_TO_VALIDATE: Record<number, string[]> = {
    0: ['meetingDate', 'meetingType', 'meetingVenueArea'],
    1: ['clientName', 'companyType', 'clientMobile', 'bclAttendees'],
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
    clientName: '', clientCompany: '', otherClientCompany: '',
    clientMobile: '', clientEmail: '', companyType: '',
    bclAttendees: [] as string[], bclAttendeeNames: [] as string[],
    bclAttendeeMobile: '+254700298298',
    meetingAgenda: '', otherMeetingAgenda: '', meetingDuration: '',
    venueDistance: '10', meetingStartTime: '', meetingEndTime: '',
    meetingSlotStartTime: '', meetingSlotEndTime: '',
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

// ── MAIN COMPONENT ───────────────────────────────────────────────
const BookingScheduler = () => {
    const { toast } = useToast();
    const [activeStep, setActiveStep] = useState(0);
    const [formData, setFormData] = useState({ ...INITIAL_FORM });
    const [invalidFields, setInvalidFields] = useState<string[]>([]);
    const [formStatus, setFormStatus] = useState<'idle' | 'submitting' | 'success' | 'error'>('idle');
    const [isListening, setIsListening] = useState(false);
    const [companyOptions, setCompanyOptions] = useState<string[]>([]);
    const [loadingCompanies, setLoadingCompanies] = useState(true);
    const [bclAttendees, setBclAttendees] = useState<{ id: string; displayName: string }[]>([]);
    const [loadingBclAttendees, setLoadingBclAttendees] = useState(true);
    const [currentUserId, setCurrentUserId] = useState<string | null>(null);
    const [attendeeOpen, setAttendeeOpen] = useState(false);
    const [showOtherVenue, setShowOtherVenue] = useState(false);
    const [showOtherCompany, setShowOtherCompany] = useState(false);
    const [showOtherAgenda, setShowOtherAgenda] = useState(false);

    // voice
    const { transcript, listening, resetTranscript, browserSupportsSpeechRecognition } = useSpeechRecognition({ commands: [] });

    const toggleListening = () => {
        if (!browserSupportsSpeechRecognition) { toast({ variant: 'destructive', title: 'Not supported' }); return; }
        if (listening) { SpeechRecognition.stopListening(); setIsListening(false); }
        else { resetTranscript(); SpeechRecognition.startListening({ continuous: true }); setIsListening(true); toast({ title: 'Voice Control Active' }); }
    };

    // fetch
    const fetchCompanies = useCallback(async () => {
        setLoadingCompanies(true);
        try {
            const { data, error } = await supabase.from('acc_portal_company_duplicate').select('company_name').order('company_name');
            if (error) throw error;
            setCompanyOptions(data?.map(c => c.company_name).filter(Boolean) ?? []);
        } catch { toast({ variant: 'destructive', title: 'Could not load companies' }); }
        finally { setLoadingCompanies(false); }
    }, [toast]);

    const fetchBclAttendees = useCallback(async () => {
        setLoadingBclAttendees(true);
        try {
            const res = await fetch('/api/users/bcl-attendees');
            if (!res.ok) throw new Error();
            setBclAttendees(await res.json());
        } catch { toast({ variant: 'destructive', title: 'Could not load attendees' }); }
        finally { setLoadingBclAttendees(false); }
    }, [toast]);

    const fetchCurrentUser = useCallback(async () => {
        try { const res = await fetch('/api/users/me'); if (res.ok) { const d = await res.json(); setCurrentUserId(d.id ?? null); } } catch { }
    }, []);

    useEffect(() => {
        const now = new Date();
        setFormData(p => ({ ...p, bookingDate: now.toISOString().split('T')[0], bookingDay: now.toLocaleDateString('en-US', { weekday: 'long' }) }));
        fetchCompanies(); fetchBclAttendees(); fetchCurrentUser();
    }, [fetchCompanies, fetchBclAttendees, fetchCurrentUser]);

    // form helpers
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
        if (name === 'meetingVenueArea') setShowOtherVenue(val === 'Other');
        if (name === 'meetingAgenda') { setShowOtherAgenda(val === 'Other'); if (val !== 'Other') set('otherMeetingAgenda', ''); }
        if (name === 'companyType') { setShowOtherCompany(val === 'new'); setFormData(p => ({ ...p, clientCompany: '', otherClientCompany: '', clientMobile: '', clientEmail: '' })); }
        if (name === 'clientCompany') {
            setShowOtherCompany(val === 'Other');
            if (val !== 'Other') fetchClientDetails(val);
            else set('otherClientCompany', '');
        }
    };

    const fetchClientDetails = async (company: string) => {
        if (!company || company === 'Other') { set('clientMobile', ''); set('clientEmail', ''); return; }
        try {
            const { data } = await supabase.from('acc_portal_company_duplicate').select('*').eq('company_name', company).single();
            set('clientMobile', data?.phone_number || data?.phone || data?.mobile || '');
            set('clientEmail', data?.email || data?.email_address || '');
        } catch { set('clientMobile', ''); set('clientEmail', ''); }
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
        if (step === 1) {
            if (formData.companyType === 'existing') req.push('clientCompany');
            if (formData.companyType === 'new') req.push('otherClientCompany');
        }
        if (step === 2 && formData.meetingAgenda === 'Other') req.push('otherMeetingAgenda');
        const bad = req.filter(f => {
            const v = formData[f as keyof typeof formData];
            if (f === 'bclAttendees') return !Array.isArray(v) || v.length === 0;
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
        const finalCompany = formData.companyType === 'new' ? formData.otherClientCompany : formData.clientCompany;
        const finalAgenda = formData.meetingAgenda === 'Other' ? formData.otherMeetingAgenda : formData.meetingAgenda;
        try {
            // conflict check
            const { data: existing } = await supabase.from('bcl_meetings_meetings')
                .select('id_main,meeting_slot_start_time,meeting_slot_end_time,client_name')
                .eq('meeting_date', formData.meetingDate).in('status', ['upcoming', 'rescheduled']);
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
            // insert
            const { data: inserted, error } = await supabase.from('bcl_meetings_meetings').insert([{
                booking_date: formData.bookingDate, booking_day: formData.bookingDay,
                meeting_date: formData.meetingDate, meeting_day: formData.meetingDay,
                meeting_type: formData.meetingType, meeting_venue_area: formData.meetingVenueArea,
                client_name: formData.clientName, client_company: finalCompany,
                client_mobile: formData.clientMobile, bcl_attendee: formData.bclAttendees,
                bcl_attendee_mobile: formData.bclAttendeeMobile, created_by: currentUserId,
                meeting_agenda: finalAgenda, meeting_duration: parseInt(formData.meetingDuration),
                venue_distance: parseInt(formData.venueDistance),
                meeting_start_time: formData.meetingStartTime, meeting_end_time: formData.meetingEndTime,
                meeting_slot_start_time: formData.meetingSlotStartTime, meeting_slot_end_time: formData.meetingSlotEndTime,
                badge_status: 'Open', status: 'upcoming', google_event_id: null, google_meet_link: null,
            }]).select();
            if (error) throw error;
            // auto-sync
            if (inserted?.[0]?.id_main) {
                try { await fetch('/api/auto-sync-calendar', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(inserted[0]) }); } catch { }
            }
            // confirmation
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
                setShowOtherVenue(false); setShowOtherCompany(false); setShowOtherAgenda(false);
            }, 2500);
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
            <Field label="Meeting Type *" error={inv('meetingType')}>
                <SchSelect value={formData.meetingType} onValueChange={v => handleSelect('meetingType', v)}
                    placeholder="Select type" invalid={inv('meetingType')}
                    items={[{ value: 'virtual', label: 'Virtual' }, { value: 'inPerson', label: 'In Person' }]} />
            </Field>
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

    const renderStep1 = () => (
        <div className="sch-grid">
            <Field label="Client Name *" error={inv('clientName')}>
                <TextInput name="clientName" value={formData.clientName} onChange={handleChange} icon={User} invalid={inv('clientName')} />
            </Field>
            <Field label="Company Type *" error={inv('companyType')}>
                <SchSelect value={formData.companyType} onValueChange={v => handleSelect('companyType', v)}
                    placeholder="Select type" invalid={inv('companyType')}
                    items={[{ value: 'existing', label: 'Existing Company' }, { value: 'new', label: 'New Company' }]} />
            </Field>
            {formData.companyType === 'existing' && (
                <Field label="Client Company *" error={inv('clientCompany')}>
                    <SchSelect value={formData.clientCompany} onValueChange={v => handleSelect('clientCompany', v)}
                        placeholder="Select company" invalid={inv('clientCompany')} loading={loadingCompanies}
                        items={companyOptions.map(c => ({ value: c, label: c }))} />
                </Field>
            )}
            {formData.companyType === 'new' && (
                <Field label="New Company Name *" error={inv('otherClientCompany')}>
                    <TextInput name="otherClientCompany" value={formData.otherClientCompany} onChange={handleChange} icon={Building} invalid={inv('otherClientCompany')} />
                </Field>
            )}
            <Field label="Client Mobile *" error={inv('clientMobile')}>
                <TextInput name="clientMobile" value={formData.clientMobile} onChange={handleChange} icon={Phone} type="tel" invalid={inv('clientMobile')} />
            </Field>
            <Field label="Client Email">
                <TextInput name="clientEmail" value={formData.clientEmail} onChange={handleChange} icon={Mail} type="email" />
            </Field>

            {/* BCL Attendee multi-select */}
            <Field label="BCL Attendee(s) *" error={inv('bclAttendees')}>
                {loadingBclAttendees ? (
                    <Button className="sch-attendee-btn h-auto" disabled style={{ opacity: 0.6 }}>
                        <User size={14} className="sch-input-icon" />
                        <Loader2 size={13} className="animate-spin" /> Loading attendees…
                    </Button>
                ) : (
                    <Popover open={attendeeOpen} onOpenChange={setAttendeeOpen}>
                        <PopoverTrigger asChild>
                            <Button className={`sch-attendee-btn h-auto${inv('bclAttendees') ? ' invalid' : ''}`}>
                                <div style={{ position: 'absolute', left: 11, top: '50%', transform: 'translateY(-50%)' }}><User size={14} color="#b0c4c8" /></div>
                                {(formData.bclAttendees as string[]).length === 0
                                    ? <span className="sch-attendee-placeholder">Select attendee(s)</span>
                                    : (formData.bclAttendeeNames as string[]).map((name, i) => (
                                        <span key={i} className="sch-attendee-tag">
                                            {name}
                                            <span className="sch-attendee-tag-x" onClick={e => { e.stopPropagation(); toggleAttendee((formData.bclAttendees as string[])[i], name, false); }}>
                                                <X size={10} />
                                            </span>
                                        </span>
                                    ))
                                }
                            </Button>
                        </PopoverTrigger>
                        <PopoverContent className="sch-select-content" style={{ width: 260, padding: 10 }} align="start">
                            <div style={{ fontSize: 9, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: '#8ca4a8', padding: '0 4px', marginBottom: 8 }}>Select Attendees</div>
                            <div style={{ maxHeight: 220, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 2 }}>
                                {bclAttendees.map(a => {
                                    const sel = (formData.bclAttendees as string[]).includes(a.id);
                                    return (
                                        <div key={a.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 6px', borderRadius: 7, cursor: 'pointer', background: sel ? '#f0f4f5' : 'transparent', transition: 'background 0.12s' }}
                                            onClick={() => toggleAttendee(a.id, a.displayName, !sel)}>
                                            <Checkbox checked={sel} onCheckedChange={c => toggleAttendee(a.id, a.displayName, !!c)} onClick={e => e.stopPropagation()} />
                                            <span style={{ fontSize: 13, fontWeight: 500, color: '#1d4ed8' }}>{a.displayName}</span>
                                        </div>
                                    );
                                })}
                            </div>
                        </PopoverContent>
                    </Popover>
                )}
            </Field>
            <Field label="BCL Attendee Mobile">
                <TextInput name="bclAttendeeMobile" value={formData.bclAttendeeMobile} onChange={handleChange} icon={Phone} readOnly />
            </Field>
        </div>
    );

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
        const finalCompany = formData.companyType === 'new' ? formData.otherClientCompany : formData.clientCompany;
        const finalAgenda = formData.meetingAgenda === 'Other' ? formData.otherMeetingAgenda : formData.meetingAgenda;
        const items = [
            { label: 'Client', value: formData.clientName },
            { label: 'Company', value: finalCompany },
            { label: 'Client Mobile', value: formData.clientMobile },
            { label: 'Client Email', value: formData.clientEmail || '—' },
            { label: 'Meeting Date', value: formData.meetingDate ? new Date(formData.meetingDate).toLocaleDateString('en-GB') : '—' },
            { label: 'Meeting Time', value: `${formData.meetingStartTime || '--:--'} – ${formData.meetingEndTime || '--:--'}` },
            { label: 'Duration', value: formData.meetingDuration ? `${formData.meetingDuration} min` : '—' },
            { label: 'Type', value: formData.meetingType === 'inPerson' ? 'In Person' : 'Virtual' },
            { label: 'Venue', value: formData.meetingVenueArea === 'Other' ? formData.otherMeetingVenueArea : formData.meetingVenueArea },
            { label: 'Agenda', value: finalAgenda },
            { label: 'BCL Attendee(s)', value: (formData.bclAttendeeNames as string[]).join(', ') || '—' },
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
        <div className="sch-shell">
            <SchedulerStyles />
            <Toaster />

            <div className="sch-card">
                {/* HEADER */}
                <div className="sch-header">
                    <div>
                        <div className="sch-badge"><Calendar size={11} /> Booksmart Scheduler</div>
                        <div className="sch-title">Schedule New Meeting</div>
                        <div className="sch-subtitle">Capture client, attendee, slot, and agenda details in one guided flow.</div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, flexWrap: 'wrap' }}>
                        <div className="sch-header-chips">
                            <div className="sch-chip">
                                <div className="sch-chip-val">{formData.meetingDate || 'No date'}</div>
                                <div className="sch-chip-label">Meeting date</div>
                            </div>
                            <div className="sch-chip">
                                <div className="sch-chip-val">{formData.meetingStartTime || '--:--'}</div>
                                <div className="sch-chip-label">Start time</div>
                            </div>
                        </div>
                        <Button className={`sch-voice-btn h-auto ${isListening ? 'sch-voice-on' : 'sch-voice-off'}`} onClick={toggleListening}>
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
        </div>
    );
};

export default BookingScheduler;
