// @ts-nocheck
"use client"

import React, { useEffect, useState, useCallback } from 'react';
import SpeechRecognition, { useSpeechRecognition } from 'react-speech-recognition';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Toaster } from "@/components/ui/toaster";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Calendar, Clock, Mic, MicOff, Building, User, Phone, Mail, MapPin, Check, ChevronRight, ChevronLeft, Loader2, Info, X } from 'lucide-react';
import supabase from '@/utils/supabaseClient';

const steps = [
    { id: 0, name: 'Basic Info', icon: Info },
    { id: 1, name: 'Client Details', icon: User },
    { id: 2, name: 'Scheduling', icon: Clock },
    { id: 3, name: 'Confirmation', icon: Check },
];

const BookingScheduler = () => {
    const { toast } = useToast();
    const [isListening, setIsListening] = useState(false);
    const [activeStep, setActiveStep] = useState(0);
    const [progress, setProgress] = useState(0);
    const [loadingCompanies, setLoadingCompanies] = useState(true);
    const [companyOptions, setCompanyOptions] = useState([]);
    const [showOtherMeetingVenueInput, setShowOtherMeetingVenueInput] = useState(false);
    const [showOtherClientCompanyInput, setShowOtherClientCompanyInput] = useState(false);
    const [showOtherAgendaInput, setShowOtherAgendaInput] = useState(false);
    const [formStatus, setFormStatus] = useState('idle');
    const [invalidFields, setInvalidFields] = useState<string[]>([]);
    const initialFormData = {
        bookingDate: '',
        bookingDay: '',
        meetingDate: '',
        meetingDay: '',
        meetingType: '',
        meetingVenueArea: '',
        clientName: '',
        clientCompany: '',
        otherClientCompany: '',
        clientMobile: '',
        clientEmail: '',
        companyType: '',
        bclAttendees: [],
        bclAttendeeNames: [],
        bclAttendeeMobile: '+254700298298',
        meetingAgenda: '',
        otherMeetingAgenda: '',
        meetingDuration: '',
        venueDistance: '10',
        meetingStartTime: '',
        meetingEndTime: '',
        meetingSlotStartTime: '',
        meetingSlotEndTime: '',
    };
    const [formData, setFormData] = useState(initialFormData);
    const [bclAttendees, setBclAttendees] = useState<{ id: string; displayName: string }[]>([]);
    const [loadingBclAttendees, setLoadingBclAttendees] = useState(true);
    const [currentUserId, setCurrentUserId] = useState<string | null>(null);
    const [attendeePickerOpen, setAttendeePickerOpen] = useState(false);

    const toggleListening = () => {
        if (!browserSupportsSpeechRecognition) {
            toast({ variant: "destructive", title: "Browser Not Supported", description: "Speech recognition is not available in this browser." });
            return;
        }
        if (listening) {
            SpeechRecognition.stopListening();
            setIsListening(false);
        } else {
            resetTranscript();
            SpeechRecognition.startListening({ continuous: true });
            setIsListening(true);
            toast({ title: "Voice Control Active", description: "Listening for commands..." });
        }
    };

    const fetchCompanies = useCallback(async () => {
        setLoadingCompanies(true);
        try {
            const { data, error } = await supabase.from('acc_portal_company_duplicate').select('company_name').order('company_name');
            if (error) throw error;
            const companyNames = data?.map((c) => c.company_name).filter(name => name && name.trim() !== '') ?? [];
            setCompanyOptions(companyNames);
        } catch (error: any) {
            console.error('Error fetching companies:', error.message);
            toast({ variant: "destructive", title: "Error", description: "Could not load company list." });
        } finally {
            setLoadingCompanies(false);
        }
    }, [toast]);


    const fetchBclAttendees = useCallback(async () => {
        setLoadingBclAttendees(true);
        try {
            const res = await fetch('/api/users/bcl-attendees');
            if (!res.ok) throw new Error('Failed to load attendees');
            const data = await res.json();
            setBclAttendees(data);
        } catch (error: any) {
            console.error('Error fetching BCL attendees:', error.message);
            toast({ variant: "destructive", title: "Error", description: "Could not load BCL attendee list." });
        } finally {
            setLoadingBclAttendees(false);
        }
    }, [toast]);

    const fetchCurrentUser = useCallback(async () => {
        try {
            const res = await fetch('/api/users/me');
            if (!res.ok) return;
            const data = await res.json();
            setCurrentUserId(data.id ?? null);
        } catch { }
    }, []);

    useEffect(() => {
        const currentDate = new Date();
        setFormData((prev) => ({
            ...prev,
            bookingDate: currentDate.toISOString().split('T')[0],
            bookingDay: currentDate.toLocaleDateString('en-US', { weekday: 'long' }),
        }));
        fetchCompanies();
        fetchBclAttendees();
        fetchCurrentUser();
    }, [fetchCompanies, fetchBclAttendees, fetchCurrentUser]);

    useEffect(() => {
        if (invalidFields.length > 0) {
            setInvalidFields([]);
        }
        setProgress(activeStep * (100 / (steps.length - 1)));
    }, [formData, activeStep, invalidFields.length]);



    const fetchClientDetails = async (clientCompanyName: string) => {
        if (!clientCompanyName || clientCompanyName === 'Other') {
            setFormData((prev) => ({ ...prev, clientMobile: '', clientEmail: '' }));
            return;
        }
        try {
            const { data, error } = await supabase
                .from('acc_portal_company_duplicate')
                .select('*')
                .eq('company_name', clientCompanyName)
                .single();

            if (error && error.code !== 'PGRST116') {
                throw error;
            }

            const phone = data?.phone_number || data?.phone || data?.mobile || data?.contact_number || '';
            const email = data?.email || data?.email_address || '';

            setFormData((prev) => ({
                ...prev,
                clientMobile: phone,
                clientEmail: email,
            }));
        } catch (error: any) {
            console.error('Error fetching client details:', error.message);
            toast({ variant: "default", title: "Info", description: `Could not auto-fill details for ${clientCompanyName}. Please enter manually.` });
            setFormData((prev) => ({ ...prev, clientMobile: '', clientEmail: '' }));
        }
    };

    const handleMeetingDateChange = (date: Date | null) => {
        if (date && !isNaN(date.getTime())) {
            setFormData({
                ...formData,
                meetingDate: date.toISOString().split('T')[0],
                meetingDay: date.toLocaleDateString('en-US', { weekday: 'long' }),
            });
        } else {
            setFormData({ ...formData, meetingDate: '', meetingDay: '' });
        }
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        setFormData((prev) => ({ ...prev, [name]: value }));

        if (name === 'companyType') {
            setFormData((prev) => ({
                ...prev,
                clientCompany: '',
                otherClientCompany: '',
                clientMobile: '',
                clientEmail: '',
            }));
            setShowOtherClientCompanyInput(value === 'new');
        }
    };

    const toggleAttendee = (id: string, displayName: string, checked: boolean) => {
        setFormData((prev) => {
            const ids = prev.bclAttendees as string[];
            const names = prev.bclAttendeeNames as string[];
            if (checked) {
                return { ...prev, bclAttendees: [...ids, id], bclAttendeeNames: [...names, displayName] };
            }
            const idx = ids.indexOf(id);
            return {
                ...prev,
                bclAttendees: ids.filter((_, i) => i !== idx),
                bclAttendeeNames: names.filter((_, i) => i !== idx),
            };
        });
    };

    const handleSelectChange = (name: string, value: string) => {
        setFormData((prev) => ({ ...prev, [name]: value }));

        if (name === 'clientCompany') {
            setShowOtherClientCompanyInput(value === 'Other');
            if (value !== 'Other') {
                fetchClientDetails(value);
                setFormData((prev) => ({ ...prev, otherClientCompany: '' }));
            }
        }
        if (name === 'meetingVenueArea') {
            setShowOtherMeetingVenueInput(value === 'Other');
        }
        if (name === 'meetingAgenda') {
            setShowOtherAgendaInput(value === 'Other');
            if (value !== 'Other') {
                setFormData((prev) => ({ ...prev, otherMeetingAgenda: '' }));
            }
        }
        if (name === 'companyType') {
            setShowOtherClientCompanyInput(value === 'new');
            setFormData((prev) => ({
                ...prev,
                clientCompany: '',
                otherClientCompany: '',
                clientMobile: '',
                clientEmail: '',
            }));
        }
    };

    const handleMeetingStartTimeChange = (value: string) => {
        const newStartTime = value;
        const duration = parseInt(formData.meetingDuration);
        const travelTime = parseInt(formData.venueDistance);

        const newEndTime = calculateEndTime(newStartTime, duration);
        const newSlotStartTime = calculateSlotTime(newStartTime, -travelTime);
        const newSlotEndTime = calculateSlotTime(newEndTime, travelTime);

        setFormData(prev => ({
            ...prev,
            meetingStartTime: newStartTime,
            meetingEndTime: newEndTime,
            meetingSlotStartTime: newSlotStartTime,
            meetingSlotEndTime: newSlotEndTime,
        }));
    };

    const handleDurationChange = (value: string) => {
        const duration = parseInt(value);
        const startTime = formData.meetingStartTime;
        const travelTime = parseInt(formData.venueDistance);

        const newEndTime = calculateEndTime(startTime, duration);
        const newSlotEndTime = calculateSlotTime(newEndTime, travelTime);

        setFormData(prev => ({
            ...prev,
            meetingDuration: value,
            meetingEndTime: newEndTime,
            meetingSlotEndTime: newSlotEndTime,
        }));
    };

    const handleTravelTimeChange = (value: string) => {
        const travelTime = parseInt(value);
        const startTime = formData.meetingStartTime;
        const endTime = formData.meetingEndTime;

        const newSlotStartTime = calculateSlotTime(startTime, -travelTime);
        const newSlotEndTime = calculateSlotTime(endTime, travelTime);

        setFormData(prev => ({
            ...prev,
            venueDistance: value,
            meetingSlotStartTime: newSlotStartTime,
            meetingSlotEndTime: newSlotEndTime,
        }));
    };

    const calculateSlotTime = (baseTime: string, minutesToAdd: number): string => {
        if (!baseTime || isNaN(minutesToAdd)) return '';
        try {
            const [hours, minutes] = baseTime.split(':').map(Number);
            if (isNaN(hours) || isNaN(minutes)) return '';

            const baseDate = new Date();
            baseDate.setHours(hours, minutes, 0, 0);

            const slotDate = new Date(baseDate.getTime() + minutesToAdd * 60000);

            return slotDate.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
        } catch (e) {
            console.error("Error calculating slot time:", e);
            return '';
        }
    };

    const calculateEndTime = (startTime: string, durationMinutes: number): string => {
        if (!startTime || isNaN(durationMinutes) || durationMinutes <= 0) return '';
        try {
            const [startHour, startMinute] = startTime.split(':').map(Number);
            if (isNaN(startHour) || isNaN(startMinute)) return '';

            let totalMinutes = startHour * 60 + startMinute + durationMinutes;
            const endHour = Math.floor(totalMinutes / 60) % 24;
            const endMinute = totalMinutes % 60;

            return `${endHour.toString().padStart(2, '0')}:${endMinute.toString().padStart(2, '0')}`;
        } catch (e) {
            console.error("Error calculating end time:", e);
            return '';
        }
    };

    const validateStep = (stepIndex: number): boolean => {
        const fieldsToValidate: { [key: number]: string[] } = {
            0: ['meetingDate', 'meetingType', 'meetingVenueArea'],
            1: ['clientName', 'companyType', 'clientMobile', 'bclAttendees'],
            2: ['meetingStartTime', 'meetingDuration', 'meetingAgenda', 'venueDistance'],
        };

        let requiredFields = fieldsToValidate[stepIndex] || [];

        if (stepIndex === 1) {
            if (formData.companyType === 'existing') {
                requiredFields.push('clientCompany');
            } else if (formData.companyType === 'new') {
                requiredFields.push('otherClientCompany');
            }
        }
        if (stepIndex === 2 && formData.meetingAgenda === 'Other') {
            requiredFields.push('otherMeetingAgenda');
        }

        const currentInvalidFields = requiredFields.filter(field => {
            const value = formData[field as keyof typeof formData];
            if (field === 'bclAttendees') return !Array.isArray(value) || value.length === 0;
            return !value || (typeof value === 'string' && value.trim() === '');
        });

        setInvalidFields(currentInvalidFields);
        return currentInvalidFields.length === 0;
    };

    const handleSubmit = async (e?: React.FormEvent) => {
        if (e) e.preventDefault();

        let allValid = true;
        const finalInvalidFields: string[] = [];
        for (let i = 0; i < steps.length - 1; i++) {
            if (!validateStep(i)) {
                allValid = false;
                const stepInvalid = (fieldsToValidate[i] || []).filter(field => {
                    if (i === 1) {
                        if (formData.companyType === 'existing' && field === 'clientCompany' && (!formData.clientCompany || formData.clientCompany === 'Other')) return true;
                        if (formData.companyType === 'new' && field === 'otherClientCompany' && !formData.otherClientCompany) return true;
                        if (field !== 'clientCompany' && field !== 'otherClientCompany' && !formData[field as keyof typeof formData]) return true;
                    } else if (i === 2 && field === 'meetingAgenda' && formData.meetingAgenda === 'Other' && !formData.otherMeetingAgenda) {
                        return true;
                    } else if (!formData[field as keyof typeof formData]) {
                        return true;
                    }
                    return false;
                });
                finalInvalidFields.push(...stepInvalid);
            }
        }

        if (!allValid) {
            const uniqueInvalidFields = [...new Set(finalInvalidFields)];
            setInvalidFields(uniqueInvalidFields);
            const firstErrorStep = steps.findIndex((_, index) =>
                uniqueInvalidFields.some(field => (fieldsToValidate[index] || []).includes(field) ||
                    (index === 1 && formData.companyType === 'existing' && field === 'clientCompany') ||
                    (index === 1 && formData.companyType === 'new' && field === 'otherClientCompany') ||
                    (index === 2 && formData.meetingAgenda === 'Other' && field === 'otherMeetingAgenda'))
            );

            if (firstErrorStep !== -1 && firstErrorStep < activeStep) {
                setActiveStep(firstErrorStep);
            }

            toast({
                variant: "destructive",
                title: "Validation Error",
                description: `Please fill in all required fields. Check fields: ${uniqueInvalidFields.join(', ')}`
            });
            return;
        }

        setFormStatus('submitting');
        setProgress(100);

        const finalClientCompany = formData.companyType === 'new' ? formData.otherClientCompany : formData.clientCompany;
        const finalAgenda = formData.meetingAgenda === 'Other' ? formData.otherMeetingAgenda : formData.meetingAgenda;

        const dataToSubmit = {
            ...formData,
            clientCompany: finalClientCompany,
            meetingAgenda: finalAgenda,
            otherClientCompany: undefined,
            otherMeetingAgenda: undefined,
        };

        try {
            const { data: existingMeetings, error: fetchError } = await supabase
                .from('bcl_meetings_meetings')
                .select('id_main, meeting_date, meeting_start_time, meeting_end_time, meeting_slot_start_time, meeting_slot_end_time, client_name')
                .eq('meeting_date', dataToSubmit.meetingDate)
                .in('status', ['upcoming', 'rescheduled']);

            if (fetchError) {
                console.error('Error checking for conflicts:', fetchError);
                throw new Error('Failed to check for meeting conflicts');
            }

            if (existingMeetings && existingMeetings.length > 0) {
                const newSlotStart = dataToSubmit.meetingSlotStartTime;
                const newSlotEnd = dataToSubmit.meetingSlotEndTime;

                const [newStartHour, newStartMin] = newSlotStart.split(':').map(Number);
                const [newEndHour, newEndMin] = newSlotEnd.split(':').map(Number);
                const newStartMinutes = newStartHour * 60 + newStartMin;
                const newEndMinutes = newEndHour * 60 + newEndMin;

                for (const meeting of existingMeetings) {
                    const existingSlotStart = meeting.meeting_slot_start_time;
                    const existingSlotEnd = meeting.meeting_slot_end_time;

                    const [existingStartHour, existingStartMin] = existingSlotStart.split(':').map(Number);
                    const [existingEndHour, existingEndMin] = existingSlotEnd.split(':').map(Number);
                    const existingStartMinutes = existingStartHour * 60 + existingStartMin;
                    const existingEndMinutes = existingEndHour * 60 + existingEndMin;

                    if (newStartMinutes < existingEndMinutes && existingStartMinutes < newEndMinutes) {
                        setFormStatus('error');
                        toast({
                            variant: "destructive",
                            title: "Meeting Conflict Detected",
                            description: `This time slot conflicts with an existing meeting for ${meeting.client_name} (${existingSlotStart} - ${existingSlotEnd}). Please choose a different time.`
                        });
                        return;
                    }
                }
            }

            const { data: insertedData, error } = await supabase.from('bcl_meetings_meetings').insert([
                {
                    booking_date: dataToSubmit.bookingDate,
                    booking_day: dataToSubmit.bookingDay,
                    meeting_date: dataToSubmit.meetingDate,
                    meeting_day: dataToSubmit.meetingDay,
                    meeting_type: dataToSubmit.meetingType,
                    meeting_venue_area: dataToSubmit.meetingVenueArea,
                    client_name: dataToSubmit.clientName,
                    client_company: dataToSubmit.clientCompany,
                    client_mobile: dataToSubmit.clientMobile,
                    bcl_attendee: dataToSubmit.bclAttendees,
                    bcl_attendee_mobile: dataToSubmit.bclAttendeeMobile,
                    created_by: currentUserId,
                    meeting_agenda: dataToSubmit.meetingAgenda,
                    meeting_duration: parseInt(dataToSubmit.meetingDuration),
                    venue_distance: parseInt(dataToSubmit.venueDistance),
                    meeting_start_time: dataToSubmit.meetingStartTime,
                    meeting_end_time: dataToSubmit.meetingEndTime,
                    meeting_slot_start_time: dataToSubmit.meetingSlotStartTime,
                    meeting_slot_end_time: dataToSubmit.meetingSlotEndTime,
                    badge_status: 'Open',
                    status: 'upcoming',
                    google_event_id: null,
                    google_meet_link: null,
                },
            ]).select();

            if (error) throw error;

            if (insertedData?.[0]?.id_main) {
                try {
                    const syncResponse = await fetch('/api/auto-sync-calendar', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                        },
                        body: JSON.stringify(insertedData[0]),
                    });

                    if (!syncResponse.ok) {
                        throw new Error(await syncResponse.text());
                    }
                } catch (syncError) {
                    console.error('Automatic calendar sync failed:', syncError);
                    toast({
                        variant: "destructive",
                        title: "Warning",
                        description: "Meeting was created, but automatic calendar sync failed.",
                    });
                }
            }

            try {
                await fetch(
                    `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/booking-confirmation`,
                    {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            'Authorization': `Bearer ${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY}`
                        },
                        body: JSON.stringify({
                            id_main: insertedData?.[0]?.id_main,
                            client_name: dataToSubmit.clientName,
                            client_company: dataToSubmit.clientCompany,
                            client_mobile: dataToSubmit.clientMobile,
                            client_email: dataToSubmit.clientEmail,
                            meeting_date: dataToSubmit.meetingDate,
                            meeting_day: dataToSubmit.meetingDay,
                            meeting_start_time: dataToSubmit.meetingStartTime,
                            meeting_end_time: dataToSubmit.meetingEndTime,
                            meeting_duration: parseInt(dataToSubmit.meetingDuration),
                            meeting_type: dataToSubmit.meetingType,
                            meeting_venue_area: dataToSubmit.meetingVenueArea,
                            meeting_agenda: dataToSubmit.meetingAgenda,
                            bcl_attendee: (dataToSubmit.bclAttendeeNames as string[]).join(', ') || '',
                            bcl_attendee_mobile: dataToSubmit.bclAttendeeMobile,
                            venue_distance: parseInt(dataToSubmit.venueDistance),
                            meeting_slot_start_time: dataToSubmit.meetingSlotStartTime,
                            meeting_slot_end_time: dataToSubmit.meetingSlotEndTime,
                            booking_date: dataToSubmit.bookingDate,
                            booking_day: dataToSubmit.bookingDay
                        })
                    }
                );
            } catch (confirmError) { }

            setFormStatus('success');
            toast({ title: "Success!", description: "Meeting scheduled successfully." });

            setTimeout(() => {
                setFormData(initialFormData);
                const currentDate = new Date();
                setFormData((prev) => ({
                    ...initialFormData,
                    bookingDate: currentDate.toISOString().split('T')[0],
                    bookingDay: currentDate.toLocaleDateString('en-US', { weekday: 'long' }),
                    bclAttendees: [],
                    bclAttendeeNames: [],
                    bclAttendeeMobile: '+254700298298',
                    venueDistance: '10',
                }));
                setActiveStep(0);
                setProgress(0);
                setFormStatus('idle');
                setInvalidFields([]);
                setShowOtherAgendaInput(false);
                setShowOtherClientCompanyInput(false);
                setShowOtherMeetingVenueInput(false);
            }, 2500);

        } catch (error: any) {
            console.error('Error scheduling meeting:', error.message);
            toast({ variant: "destructive", title: "Scheduling Failed", description: error.message || "An unexpected error occurred." });
            setFormStatus('error');
            setProgress(activeStep * (100 / (steps.length - 1)));
        }
    };

    const nextStep = () => {
        if (validateStep(activeStep)) {
            if (activeStep < steps.length - 1) {
                setActiveStep(activeStep + 1);
            }
        } else {
            toast({
                variant: "destructive",
                title: "Missing Information",
                description: "Please fill in all required fields for this step before proceeding."
            });
        }
    };

    const prevStep = () => {
        if (activeStep > 0) {
            setActiveStep(activeStep - 1);
            setInvalidFields([]);
        }
    };

    const generateTimeOptions = () => {
        const options = [];
        for (let i = 7; i <= 21; i++) {
            const hour = i.toString().padStart(2, '0');
            options.push({ value: `${hour}:00`, label: `${hour}:00` });
            if (i < 21) {
                options.push({ value: `${hour}:30`, label: `${hour}:30` });
            }
        }
        return options;
    };

    const renderInputField = (id: string, label: string, options: { placeholder?: string, type?: string, icon?: React.ElementType, readOnly?: boolean, isInvalid?: boolean, children?: React.ReactNode, className?: string } = {}) => {
        const { placeholder, type = 'text', icon: Icon, readOnly = false, isInvalid = false, children, className } = options;
        const Tag = type === 'textarea' ? Textarea : Input;
        return (
            <div className="space-y-1.5">
                <Label htmlFor={id} className={`text-[11px] font-bold uppercase tracking-widest ${isInvalid ? 'text-red-600 dark:text-red-400' : 'text-slate-500 dark:text-slate-400'}`}>{label}</Label>
                <div className="relative">
                    {Icon && <Icon className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />}
                    <Tag
                        id={id}
                        name={id}
                        type={type}
                        value={formData[id as keyof typeof formData] || ''}
                        onChange={handleChange}
                        placeholder={placeholder || `Enter ${label.toLowerCase()}`}
                        readOnly={readOnly}
                        className={`h-11 rounded-xl text-sm font-medium transition-all shadow-sm ${Icon ? 'pl-10' : ''} ${readOnly ? 'bg-slate-50 text-slate-500 dark:bg-white/5 dark:text-slate-400 cursor-not-allowed' : 'bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100'} ${isInvalid ? 'border-red-500 focus:border-red-500 focus:ring-red-500/20' : 'border-slate-200/80 dark:border-white/10 focus:border-blue-500 focus:ring-blue-500/20 dark:focus:border-blue-500/50'} ${className}`}
                        rows={type === 'textarea' ? 3 : undefined}
                    />
                    {children}
                </div>
                {isInvalid && <p className="text-xs font-medium text-red-500 dark:text-red-400 mt-1.5">This field is required.</p>}
            </div>
        );
    };

    const renderSelectField = (id: string, label: string, options: { placeholder: string, items: { value: string, label: string }[], icon?: React.ElementType, isInvalid?: boolean, loading?: boolean, loadingPlaceholder?: string, onValueChange: (value: string) => void }) => {
        const { placeholder, items, icon: Icon, isInvalid = false, loading = false, loadingPlaceholder = "Loading...", onValueChange } = options;
        return (
            <div className="space-y-1.5">
                <Label htmlFor={id} className={`text-[11px] font-bold uppercase tracking-widest ${isInvalid ? 'text-red-600 dark:text-red-400' : 'text-slate-500 dark:text-slate-400'}`}>{label}</Label>
                <div className="relative">
                    {Icon && <Icon className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 z-10 pointer-events-none" />}
                    {loading ? (
                        <Button variant="outline" disabled className={`h-11 w-full justify-start rounded-xl shadow-sm border-slate-200/80 dark:border-white/10 bg-slate-50 dark:bg-white/5 font-medium text-slate-500 dark:text-slate-400 ${Icon ? 'pl-10' : ''}`}>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            {loadingPlaceholder}
                        </Button>
                    ) : (
                        <Select
                            value={formData[id as keyof typeof formData] || ''}
                            onValueChange={onValueChange}
                            name={id}
                        >
                            <SelectTrigger className={`h-11 rounded-xl text-sm font-medium shadow-sm transition-all ${Icon ? 'pl-10' : ''} ${isInvalid ? 'border-red-500 text-red-600 focus:border-red-500 focus:ring-red-500/20' : 'border-slate-200/80 dark:border-white/10 text-slate-900 dark:text-slate-100 focus:border-blue-500 focus:ring-blue-500/20 bg-white dark:bg-slate-900'}`}>
                                <SelectValue placeholder={placeholder} />
                            </SelectTrigger>
                            <SelectContent className="rounded-xl border-slate-200/80 dark:border-white/10 bg-white dark:bg-slate-950 shadow-lg">
                                {items.map((item) => (
                                    <SelectItem key={item.value} value={item.value} className="focus:bg-slate-50 dark:focus:bg-white/5 font-medium cursor-pointer">
                                        {item.label}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    )}
                </div>
                {isInvalid && <p className="text-xs font-medium text-red-500 dark:text-red-400 mt-1.5">This field is required.</p>}
            </div>
        );
    };

    const commands = [
        { command: ['set meeting type *', 'meeting type *'], callback: (type: string) => handleSelectChange('meetingType', type.toLowerCase() === 'in person' ? 'inPerson' : 'virtual') },
        { command: ['set meeting date *', 'meeting date *'], callback: (dateStr: string) => { try { const d = new Date(dateStr); if (!isNaN(d.getTime())) handleMeetingDateChange(d); } catch (e) { console.error(e); toast({ variant: "destructive", title: "Invalid Date", description: `Could not parse date: ${dateStr}` }); } } },
        { command: ['set venue *', 'venue *', 'meeting venue *'], callback: (venue: string) => handleSelectChange('meetingVenueArea', venue) },

        { command: ['set client name *', 'client name *'], callback: (name: string) => handleChange({ target: { name: 'clientName', value: name } }) },
        { command: ['set company type *', 'company type *'], callback: (type: string) => handleSelectChange('companyType', type.toLowerCase() === 'new' ? 'new' : 'existing') },
        { command: ['set company *', 'company *', 'client company *'], callback: (company: string) => handleSelectChange('clientCompany', company) },
        { command: ['set client mobile *', 'client phone *', 'mobile *'], callback: (mobile: string) => handleChange({ target: { name: 'clientMobile', value: mobile } }) },
        { command: ['set client email *', 'email *'], callback: (email: string) => handleChange({ target: { name: 'clientEmail', value: email } }) },
        { command: ['set attendee *', 'bcl attendee *'], callback: (attendee: string) => handleSelectChange('bclAttendee', attendee) },

        { command: ['set start time *', 'start time *'], callback: (time: string) => handleMeetingStartTimeChange(time) },
        { command: ['set duration *', 'duration *'], callback: (duration: string) => { const val = duration.match(/\d+/)?.[0]; if (val) handleDurationChange(val); } },
        { command: ['set agenda *', 'agenda *'], callback: (agenda: string) => handleSelectChange('meetingAgenda', agenda) },

        { command: ['next', 'next step', 'continue', 'next page'], callback: nextStep },
        { command: ['back', 'previous', 'previous step', 'go back'], callback: prevStep },
        { command: ['submit', 'submit form', 'schedule', 'schedule meeting', 'book appointment'], callback: () => handleSubmit() }
    ];

    const { transcript, listening, resetTranscript, browserSupportsSpeechRecognition } = useSpeechRecognition({ commands });

    return (
        <div className="min-h-screen px-4 py-6 sm:px-6 lg:px-8 bg-transparent">
            <Toaster />

            <div className="mx-auto max-w-5xl">
                <Card className="overflow-hidden rounded-2xl border border-slate-200/80 dark:border-white/10 bg-white/95 dark:bg-slate-950/95 shadow-xl backdrop-blur-xl">
                    <CardHeader className="border-b border-slate-200/80 dark:border-white/10 bg-slate-50/50 dark:bg-white/[0.02] p-6 sm:p-8">
                        <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
                            <div>
                                <div className="inline-flex items-center gap-1.5 rounded-full bg-blue-50 dark:bg-blue-500/10 px-3 py-1 mb-4 text-[10px] font-bold uppercase tracking-widest text-blue-600 dark:text-blue-400 border border-blue-200/50 dark:border-blue-500/20 shadow-sm">
                                    <Calendar className="h-3 w-3" />
                                    Booksmart Scheduler
                                </div>
                                <CardTitle className="text-2xl font-bold tracking-tight text-slate-950 dark:text-slate-50 sm:text-3xl">
                                    Schedule New Meeting
                                </CardTitle>
                                <CardDescription className="mt-2 text-sm font-medium text-slate-500 dark:text-slate-400 max-w-lg">
                                    Capture the client, attendee, slot, and agenda details in one guided flow.
                                </CardDescription>
                            </div>
                            <div className="grid grid-cols-2 gap-3 text-xs sm:flex">
                                <div className="rounded-xl border border-slate-200/60 dark:border-white/5 bg-white dark:bg-slate-900 px-4 py-2.5 shadow-sm">
                                    <p className="font-bold text-slate-950 dark:text-slate-100">{formData.meetingDate || 'No date'}</p>
                                    <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-400 dark:text-slate-500 mt-0.5">Meeting date</p>
                                </div>
                                <div className="rounded-xl border border-slate-200/60 dark:border-white/5 bg-white dark:bg-slate-900 px-4 py-2.5 shadow-sm">
                                    <p className="font-bold text-slate-950 dark:text-slate-100">{formData.meetingStartTime || '--:--'}</p>
                                    <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-400 dark:text-slate-500 mt-0.5">Start time</p>
                                </div>
                            </div>
                        </div>
                    </CardHeader>

                    {/* Progress & Step Indicator Section */}
                    <div className="border-b border-slate-200/80 dark:border-white/10 bg-slate-50/30 dark:bg-slate-950/30 px-6 pb-4 pt-5">
                        <div className="flex items-center justify-between overflow-x-auto pb-2 scrollbar-hide">
                            {steps.map((step, index) => (
                                <React.Fragment key={step.id}>
                                    <div
                                        className={`min-w-[80px] flex flex-col items-center cursor-pointer transition-colors duration-300 ${activeStep >= step.id ? 'text-blue-600 dark:text-blue-400' : 'text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300'}`}
                                        onClick={() => {
                                            if (activeStep > step.id || validateStep(step.id - 1)) {
                                                setActiveStep(step.id);
                                            } else if (activeStep !== step.id) {
                                                toast({ variant: "default", title: "Step Locked", description: "Please complete previous steps first." });
                                            }
                                        }}
                                    >
                                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center border-2 mb-2 relative transition-all duration-300 ${activeStep === step.id
                                                ? 'bg-blue-600 border-blue-600 text-white shadow-md shadow-blue-600/20'
                                                : activeStep > step.id
                                                    ? 'bg-blue-50 border-blue-200 text-blue-600 dark:bg-blue-500/10 dark:border-blue-500/20 dark:text-blue-400'
                                                    : 'bg-white border-slate-200/80 text-slate-400 dark:bg-slate-900 dark:border-white/10 dark:text-slate-500 shadow-sm'
                                            }`}>
                                            {activeStep > step.id ? <Check className="h-5 w-5" /> : <step.icon className="h-5 w-5" />}
                                        </div>
                                        <span className="hidden text-center text-xs font-bold uppercase tracking-wider sm:block">{step.name}</span>
                                    </div>
                                    {index < steps.length - 1 && (
                                        <div className={`mx-3 h-[2px] min-w-[32px] flex-1 rounded-full transition-colors duration-300 ${activeStep > index ? 'bg-blue-600 dark:bg-blue-500' : 'bg-slate-200 dark:bg-slate-800'}`}></div>
                                    )}
                                </React.Fragment>
                            ))}
                        </div>
                    </div>

                    <CardContent className="p-6 sm:p-8">
                        <form onSubmit={handleSubmit} noValidate>
                            <div className="min-h-[340px]">
                                {/* Step 1: Basic Info */}
                                {activeStep === 0 && (
                                    <div className="animate-fadeIn space-y-6">
                                        <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100 border-b border-slate-200/80 dark:border-white/10 pb-3">Basic Information</h3>
                                        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                                            {renderInputField('bookingDate', 'Booking Date', { readOnly: true, icon: Calendar })}
                                            {renderInputField('bookingDay', 'Booking Day', { readOnly: true, icon: Calendar })}
                                            <div className="space-y-1.5">
                                                <Label htmlFor="meetingDate" className={`text-[11px] font-bold uppercase tracking-widest ${invalidFields.includes('meetingDate') ? 'text-red-600 dark:text-red-400' : 'text-slate-500 dark:text-slate-400'}`}>Meeting Date *</Label>
                                                <div className="relative">
                                                    <Calendar className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
                                                    <Input
                                                        id="meetingDate"
                                                        name="meetingDate"
                                                        type="date"
                                                        min={new Date().toISOString().split('T')[0]}
                                                        value={formData.meetingDate}
                                                        onChange={(e) => handleMeetingDateChange(e.target.value ? new Date(e.target.value) : null)}
                                                        className={`h-11 rounded-xl pl-10 text-sm font-medium shadow-sm transition-all ${invalidFields.includes('meetingDate') ? 'border-red-500 focus:border-red-500 focus:ring-red-500/20' : 'border-slate-200/80 dark:border-white/10 focus:border-blue-500 focus:ring-blue-500/20 dark:focus:border-blue-500/50 bg-white dark:bg-slate-900'}`}
                                                    />
                                                </div>
                                                {invalidFields.includes('meetingDate') && <p className="text-xs font-medium text-red-500 dark:text-red-400 mt-1.5">This field is required.</p>}
                                            </div>
                                            {renderInputField('meetingDay', 'Meeting Day', { readOnly: true, icon: Calendar })}
                                            {renderSelectField('meetingType', 'Meeting Type *', {
                                                placeholder: 'Select Meeting Type',
                                                items: [{ value: 'virtual', label: 'Virtual' }, { value: 'inPerson', label: 'In Person' }],
                                                isInvalid: invalidFields.includes('meetingType'),
                                                onValueChange: (value) => handleSelectChange('meetingType', value)
                                            })}
                                            {renderSelectField('meetingVenueArea', 'Meeting Venue *', {
                                                placeholder: 'Select or Enter Venue',
                                                items: [
                                                    { value: 'BCL BR', label: 'BCL Boardroom' },
                                                    { value: 'Client Office', label: 'Client Office' },
                                                    { value: 'Virtual', label: 'Virtual / Online' },
                                                    { value: 'Other', label: 'Other (Specify Below)' }
                                                ],
                                                icon: MapPin,
                                                isInvalid: invalidFields.includes('meetingVenueArea'),
                                                onValueChange: (value) => handleSelectChange('meetingVenueArea', value)
                                            })}
                                            {showOtherMeetingVenueInput && renderInputField('otherMeetingVenueArea', 'Specify Venue *', {
                                                placeholder: 'E.g., Cafe Name, Specific Address',
                                                icon: MapPin,
                                                isInvalid: invalidFields.includes('otherMeetingVenueArea')
                                            })}
                                        </div>
                                    </div>
                                )}

                                {/* Step 2: Client Details */}
                                {activeStep === 1 && (
                                    <div className="animate-fadeIn space-y-6">
                                        <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100 border-b border-slate-200/80 dark:border-white/10 pb-3">Client Information</h3>
                                        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                                            {renderInputField('clientName', 'Client Name *', { icon: User, isInvalid: invalidFields.includes('clientName') })}
                                            {renderSelectField('companyType', 'Company Type *', {
                                                placeholder: 'Select Company Type',
                                                items: [{ value: 'existing', label: 'Existing Company' }, { value: 'new', label: 'New Company' }],
                                                isInvalid: invalidFields.includes('companyType'),
                                                onValueChange: (value) => handleSelectChange('companyType', value)
                                            })}

                                            {formData.companyType === 'existing' && renderSelectField('clientCompany', 'Client Company *', {
                                                placeholder: 'Select Existing Company',
                                                items: companyOptions.map(c => ({ value: c, label: c })),
                                                icon: Building,
                                                isInvalid: invalidFields.includes('clientCompany'),
                                                loading: loadingCompanies,
                                                loadingPlaceholder: "Loading companies...",
                                                onValueChange: (value) => handleSelectChange('clientCompany', value)
                                            })}

                                            {formData.companyType === 'new' && renderInputField('otherClientCompany', 'New Company Name *', {
                                                placeholder: 'Enter new company name',
                                                icon: Building,
                                                isInvalid: invalidFields.includes('otherClientCompany')
                                            })}

                                            {renderInputField('clientMobile', 'Client Mobile *', { icon: Phone, isInvalid: invalidFields.includes('clientMobile'), type: 'tel' })}
                                            {renderInputField('clientEmail', 'Client Email', { icon: Mail, type: 'email' })}

                                            {/* BCL Attendee multi-select */}
                                            <div className="space-y-1.5">
                                                <Label className={`text-[11px] font-bold uppercase tracking-widest ${invalidFields.includes('bclAttendees') ? 'text-red-600 dark:text-red-400' : 'text-slate-500 dark:text-slate-400'}`}>BCL Attendee(s) *</Label>
                                                {loadingBclAttendees ? (
                                                    <Button variant="outline" disabled className="h-11 w-full justify-start rounded-xl border-slate-200/80 dark:border-white/10 bg-slate-50 dark:bg-white/5 font-medium text-slate-500 shadow-sm">
                                                        <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Loading attendees...
                                                    </Button>
                                                ) : (
                                                    <Popover open={attendeePickerOpen} onOpenChange={setAttendeePickerOpen}>
                                                        <PopoverTrigger asChild>
                                                            <Button
                                                                variant="outline"
                                                                className={`h-auto min-h-[44px] w-full justify-start rounded-xl text-sm font-medium shadow-sm transition-all hover:bg-slate-50 dark:hover:bg-slate-900 ${invalidFields.includes('bclAttendees') ? 'border-red-500 text-red-600 focus:ring-red-500/20' : 'border-slate-200/80 dark:border-white/10 bg-white dark:bg-slate-900'}`}
                                                            >
                                                                <User className="mr-2.5 h-4 w-4 shrink-0 text-slate-400" />
                                                                {formData.bclAttendees.length === 0 ? (
                                                                    <span className="text-slate-400 dark:text-slate-500 font-normal">Select BCL Attendee(s)</span>
                                                                ) : (
                                                                    <div className="flex flex-wrap gap-1.5 py-1">
                                                                        {(formData.bclAttendeeNames as string[]).map((name, i) => (
                                                                            <Badge key={i} variant="secondary" className="flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-semibold bg-slate-100 dark:bg-white/10 text-slate-700 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-white/20 transition-colors">
                                                                                {name}
                                                                                <X className="h-3.5 w-3.5 cursor-pointer text-slate-400 hover:text-slate-700 dark:hover:text-white" onClick={(e) => { e.stopPropagation(); toggleAttendee((formData.bclAttendees as string[])[i], name, false); }} />
                                                                            </Badge>
                                                                        ))}
                                                                    </div>
                                                                )}
                                                            </Button>
                                                        </PopoverTrigger>
                                                        <PopoverContent className="w-72 p-3 rounded-xl border-slate-200/80 dark:border-white/10 bg-white dark:bg-slate-950 shadow-xl" align="start">
                                                            <p className="mb-3 px-1 text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest">Select Attendees</p>
                                                            <div className="max-h-60 overflow-y-auto space-y-1">
                                                                {bclAttendees.map((a) => {
                                                                    const isSelected = (formData.bclAttendees as string[]).includes(a.id);
                                                                    return (
                                                                        <div key={a.id} className="flex items-center gap-3 rounded-lg px-2 py-2 hover:bg-slate-50 dark:hover:bg-white/5 cursor-pointer transition-colors" onClick={() => toggleAttendee(a.id, a.displayName, !isSelected)}>
                                                                            <Checkbox
                                                                                checked={isSelected}
                                                                                onCheckedChange={(checked) => toggleAttendee(a.id, a.displayName, !!checked)}
                                                                                onClick={(e) => e.stopPropagation()}
                                                                            />
                                                                            <span className="text-sm font-medium text-slate-800 dark:text-slate-200">{a.displayName}</span>
                                                                        </div>
                                                                    );
                                                                })}
                                                            </div>
                                                        </PopoverContent>
                                                    </Popover>
                                                )}
                                                {invalidFields.includes('bclAttendees') && <p className="text-xs font-medium text-red-500 dark:text-red-400 mt-1.5">Please select at least one BCL attendee.</p>}
                                            </div>
                                            {renderInputField('bclAttendeeMobile', 'BCL Attendee Mobile', { readOnly: true, icon: Phone })}
                                        </div>
                                    </div>
                                )}

                                {/* Step 3: Scheduling */}
                                {activeStep === 2 && (
                                    <div className="animate-fadeIn space-y-6">
                                        <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100 border-b border-slate-200/80 dark:border-white/10 pb-3">Scheduling Details</h3>
                                        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                                            <div className="space-y-1.5">
                                                <Label htmlFor="meetingStartTime" className={`text-[11px] font-bold uppercase tracking-widest ${invalidFields.includes('meetingStartTime') ? 'text-red-600 dark:text-red-400' : 'text-slate-500 dark:text-slate-400'}`}>Meeting Start Time *</Label>
                                                <div className="relative">
                                                    <Clock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
                                                    <Input
                                                        id="meetingStartTime"
                                                        name="meetingStartTime"
                                                        type="time"
                                                        value={formData.meetingStartTime}
                                                        onChange={(e) => handleMeetingStartTimeChange(e.target.value)}
                                                        className={`h-11 rounded-xl pl-10 text-sm font-medium shadow-sm transition-all ${invalidFields.includes('meetingStartTime') ? 'border-red-500 focus:border-red-500 focus:ring-red-500/20' : 'border-slate-200/80 dark:border-white/10 focus:border-blue-500 focus:ring-blue-500/20 dark:focus:border-blue-500/50 bg-white dark:bg-slate-900'}`}
                                                        placeholder="Enter time (HH:MM)"
                                                    />
                                                </div>
                                                <div className="mt-1.5 text-[10px] font-medium text-slate-400 dark:text-slate-500">
                                                    Enter in 24-hour format (e.g., 09:00, 14:30)
                                                </div>
                                                {invalidFields.includes('meetingStartTime') && <p className="text-xs font-medium text-red-500 dark:text-red-400 mt-1.5">This field is required.</p>}
                                            </div>
                                            {renderSelectField('meetingDuration', 'Meeting Duration *', {
                                                placeholder: 'Select Duration',
                                                items: [
                                                    { value: '15', label: '15 min' }, { value: '30', label: '30 min' }, { value: '45', label: '45 min' },
                                                    { value: '60', label: '1 hour' }, { value: '90', label: '1.5 hours' }, { value: '120', label: '2 hours' },
                                                    { value: '180', label: '3 hours' }, { value: '240', label: '4 hours' }, { value: '300', label: '5 hours' }
                                                ],
                                                isInvalid: invalidFields.includes('meetingDuration'),
                                                onValueChange: handleDurationChange
                                            })}
                                            {renderInputField('meetingEndTime', 'Meeting End Time', { readOnly: true, icon: Clock })}
                                            {renderSelectField('venueDistance', 'Travel Time - Slot Time (Each Way) *', {
                                                placeholder: 'Select travel time',
                                                items: [
                                                    { value: '0', label: '0 min (Virtual/On-site)' }, { value: '10', label: '10 min' }, { value: '15', label: '15 min' },
                                                    { value: '30', label: '30 min' }, { value: '45', label: '45 min' }, { value: '60', label: '1 hour' },
                                                    { value: '90', label: '1.5 hours' }, { value: '120', label: '2 hours' }
                                                ],
                                                isInvalid: invalidFields.includes('venueDistance'),
                                                onValueChange: handleTravelTimeChange
                                            })}
                                            {renderInputField('meetingSlotStartTime', 'Calendar Slot Start', { readOnly: true, icon: Calendar })}
                                            {renderInputField('meetingSlotEndTime', 'Calendar Slot End', { readOnly: true, icon: Calendar })}

                                            <div className="sm:col-span-2 space-y-1.5 mt-2">
                                                {renderSelectField('meetingAgenda', 'Meeting Agenda *', {
                                                    placeholder: 'Select or Describe Agenda',
                                                    items: [
                                                        { value: 'Introduction & Needs Discovery', label: 'Introduction & Needs Discovery' },
                                                        { value: 'Proposal Review', label: 'Proposal Review' },
                                                        { value: 'Project Kick-off', label: 'Project Kick-off' },
                                                        { value: 'Project Update/Review', label: 'Project Update/Review' },
                                                        { value: 'Product/Service Demo', label: 'Product/Service Demo' },
                                                        { value: 'Support/Training', label: 'Support/Training' },
                                                        { value: 'Partnership Discussion', label: 'Partnership Discussion' },
                                                        { value: 'General Catch-up', label: 'General Catch-up' },
                                                        { value: 'Other', label: 'Other (Specify Below)' }
                                                    ],
                                                    isInvalid: invalidFields.includes('meetingAgenda'),
                                                    onValueChange: (value) => handleSelectChange('meetingAgenda', value)
                                                })}
                                            </div>

                                            {showOtherAgendaInput && (
                                                <div className="sm:col-span-2 space-y-1.5">
                                                    {renderInputField('otherMeetingAgenda', 'Specify Agenda *', {
                                                        placeholder: 'Briefly describe the meeting purpose...',
                                                        type: 'textarea',
                                                        isInvalid: invalidFields.includes('otherMeetingAgenda')
                                                    })}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                )}

                                {/* Step 4: Confirmation */}
                                {activeStep === 3 && (
                                    <div className="animate-fadeIn space-y-6">
                                        <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100 border-b border-slate-200/80 dark:border-white/10 pb-3">Confirm Meeting Details</h3>

                                        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                                            <ConfirmationItem label="Client" value={formData.clientName} />
                                            <ConfirmationItem label="Company" value={formData.companyType === 'new' ? formData.otherClientCompany : formData.clientCompany} />
                                            <ConfirmationItem label="Client Mobile" value={formData.clientMobile} />
                                            <ConfirmationItem label="Client Email" value={formData.clientEmail || '-'} />
                                            <ConfirmationItem label="Meeting Date" value={formData.meetingDate ? new Date(formData.meetingDate).toLocaleDateString('en-GB') : '-'} />
                                            <ConfirmationItem label="Meeting Time" value={`${formData.meetingStartTime || '--:--'} - ${formData.meetingEndTime || '--:--'}`} />
                                            <ConfirmationItem label="Duration" value={formData.meetingDuration ? `${formData.meetingDuration} min` : '-'} />
                                            <ConfirmationItem label="Type" value={formData.meetingType === 'inPerson' ? 'In Person' : 'Virtual'} />
                                            <ConfirmationItem label="Venue" value={formData.meetingVenueArea === 'Other' ? formData.otherMeetingVenueArea : formData.meetingVenueArea} />
                                            <ConfirmationItem label="Agenda" value={formData.meetingAgenda === 'Other' ? formData.otherMeetingAgenda : formData.meetingAgenda} />
                                            <ConfirmationItem label="BCL Attendee(s)" value={(formData.bclAttendeeNames as string[]).join(', ') || '—'} />
                                            <ConfirmationItem label="Travel Time" value={`${formData.venueDistance} min`} />
                                        </div>

                                        {/* Status Messages */}
                                        {formStatus === 'success' && (
                                            <div className="mt-6 flex items-center rounded-xl border border-emerald-200/60 dark:border-emerald-500/20 bg-emerald-50 dark:bg-emerald-500/10 px-5 py-4 text-emerald-800 dark:text-emerald-400 shadow-sm" role="alert">
                                                <Check className="h-6 w-6 mr-3 text-emerald-600 dark:text-emerald-500" />
                                                <p><strong className="font-bold">Success!</strong> Meeting scheduled successfully.</p>
                                            </div>
                                        )}
                                        {formStatus === 'error' && (
                                            <div className="mt-6 flex items-center rounded-xl border border-red-200/60 dark:border-red-500/20 bg-red-50 dark:bg-red-500/10 px-5 py-4 text-red-800 dark:text-red-400 shadow-sm" role="alert">
                                                <Info className="h-6 w-6 mr-3 text-red-600 dark:text-red-500" />
                                                <p><strong className="font-bold">Error!</strong> Failed to schedule. Please try again.</p>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        </form>
                    </CardContent>

                    <CardFooter className="flex items-center justify-between gap-4 border-t border-slate-200/80 dark:border-white/10 bg-slate-50/50 dark:bg-white/[0.02] p-6">
                        <Button
                            type="button"
                            variant="outline"
                            onClick={prevStep}
                            disabled={activeStep === 0 || formStatus === 'submitting'}
                            className="flex h-11 items-center rounded-xl border-slate-200/80 dark:border-white/10 bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 shadow-sm px-5 font-bold"
                        >
                            <ChevronLeft className="h-4 w-4 mr-1.5" />
                            Previous
                        </Button>

                        {activeStep < steps.length - 1 ? (
                            <Button
                                type="button"
                                onClick={nextStep}
                                disabled={formStatus === 'submitting'}
                                className="flex h-11 items-center rounded-xl bg-blue-600 text-white hover:bg-blue-700 shadow-md shadow-blue-600/20 px-6 font-bold active:scale-[0.98] transition-all"
                            >
                                Next Step
                                <ChevronRight className="h-4 w-4 ml-1.5" />
                            </Button>
                        ) : (
                            <Button
                                type="button"
                                onClick={handleSubmit}
                                disabled={formStatus === 'submitting' || formStatus === 'success'}
                                className={`flex h-11 items-center rounded-xl px-8 font-bold active:scale-[0.98] transition-all shadow-md ${formStatus === 'submitting' ? 'bg-slate-400 dark:bg-slate-700 text-white cursor-not-allowed shadow-none' : 'bg-blue-600 text-white hover:bg-blue-700 shadow-blue-600/20'}`}
                            >
                                {formStatus === 'submitting' ? (
                                    <>
                                        <Loader2 className="h-4 w-4 mr-2.5 animate-spin" />
                                        Scheduling...
                                    </>
                                ) : formStatus === 'success' ? (
                                    <>
                                        <Check className="h-4 w-4 mr-2.5" />
                                        Scheduled!
                                    </>
                                ) : (
                                    'Confirm & Schedule'
                                )}
                            </Button>
                        )}
                    </CardFooter>
                </Card>
            </div>
        </div>
    );
};

const ConfirmationItem = ({ label, value }: { label: string, value: string | undefined | null }) => (
    <div className="rounded-xl border border-slate-200/60 dark:border-white/5 bg-slate-50/50 dark:bg-white/[0.02] px-4 py-3.5 text-sm shadow-sm">
        <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500">{label}</p>
        <p className="mt-1.5 break-words font-bold text-slate-900 dark:text-slate-100">{value ? String(value) : '-'}</p>
    </div>
);

export default BookingScheduler;