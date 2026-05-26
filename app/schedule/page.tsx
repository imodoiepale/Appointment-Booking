// @ts-nocheck
"use client"

import React, { useEffect, useState, useCallback } from 'react';
import { createClient } from '@supabase/supabase-js';
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

const supabaseUrl = 'https://zyszsqgdlrpnunkegipk.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inp5c3pzcWdkbHJwbnVua2VnaXBrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MDgzMjc4OTQsImV4cCI6MjAyMzkwMzg5NH0.fK_zR8wR6Lg8HeK7KBTTnyF0zoyYBqjkeWeTKqi32ws';
const supabase = createClient(supabaseUrl, supabaseKey);

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
    const [showOtherAgendaInput, setShowOtherAgendaInput] = useState(false); // State for other agenda
    const [formStatus, setFormStatus] = useState('idle'); // idle, submitting, success, error
    const [invalidFields, setInvalidFields] = useState<string[]>([]); // Explicitly typed
    const initialFormData = {
        bookingDate: '',
        bookingDay: '',
        meetingDate: '',
        meetingDay: '',
        meetingType: '', // virtual | inPerson
        meetingVenueArea: '', // Defaulting to empty, user must select/enter
        clientName: '',
        clientCompany: '', // Can be selected or 'Other' or new input
        otherClientCompany: '', // For new company input
        clientMobile: '',
        clientEmail: '',
        companyType: '', // existing | new
        bclAttendees: [],      // array of selected UUIDs
        bclAttendeeNames: [],  // parallel array of display names
        bclAttendeeMobile: '+254700298298', // Default BCL mobile
        meetingAgenda: '', // Can be selected or 'Other'
        otherMeetingAgenda: '', // For custom agenda input
        meetingDuration: '', // in minutes
        venueDistance: '10', // Default travel time
        meetingStartTime: '', // HH:MM format
        meetingEndTime: '', // HH:MM format (calculated)
        meetingSlotStartTime: '', // HH:MM format (calculated)
        meetingSlotEndTime: '', // HH:MM format (calculated)
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
    // --- Data Fetching ---
    const fetchCompanies = useCallback(async () => {
        setLoadingCompanies(true);
        try {
            const { data, error } = await supabase.from('acc_portal_company_duplicate').select('company_name').order('company_name');
            if (error) throw error;
            const companyNames = data?.map((c) => c.company_name).filter(name => name && name.trim() !== '') ?? [];
            setCompanyOptions(companyNames); // Just the names
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
        } catch {
            // Not critical — created_by will be null
        }
    }, []);

    // --- Effects ---
    useEffect(() => {
        // Initialize form with current date
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
        // Reset validation errors when data changes
        if (invalidFields.length > 0) {
            setInvalidFields([]);
        }
        // Recalculate progress based on the *current* step's potential completion
        // Or simply base it on the active step number until the final confirmation
        setProgress(activeStep * (100 / (steps.length - 1))); // Progress based on step number

    }, [formData, activeStep, invalidFields.length]); // Removed steps.length as it's a constant



    const fetchClientDetails = async (clientCompanyName: string) => {
        // Avoid fetching if 'Other' or empty is selected
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

            if (error && error.code !== 'PGRST116') { // PGRST116: Row not found, which is okay
                throw error;
            }

            // Handle different possible column names for phone and email
            const phone = data?.phone_number || data?.phone || data?.mobile || data?.contact_number || '';
            const email = data?.email || data?.email_address || '';

            setFormData((prev) => ({
                ...prev,
                clientMobile: phone,
                clientEmail: email,
            }));
        } catch (error: any) {
            console.error('Error fetching client details:', error.message);
            // Optionally notify user, but maybe not critical if details aren't found
            toast({ variant: "default", title: "Info", description: `Could not auto-fill details for ${clientCompanyName}. Please enter manually.` });
            setFormData((prev) => ({ ...prev, clientMobile: '', clientEmail: '' })); // Clear fields if fetch fails
        }
    };

    // --- Form Handling ---
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

        // Reset dependent fields or fetch data if needed
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

        // Specific logic for selects
        if (name === 'clientCompany') {
            setShowOtherClientCompanyInput(value === 'Other');
            if (value !== 'Other') {
                fetchClientDetails(value);
                // Clear the 'other' field if a real company is selected
                setFormData((prev) => ({ ...prev, otherClientCompany: '' }));
            }
        }
        if (name === 'meetingVenueArea') {
            setShowOtherMeetingVenueInput(value === 'Other');
            if (value !== 'Other') {
                // Clear the 'other' field if a predefined venue is selected
                // Assuming you might add an 'otherMeetingVenueArea' field later if needed
            }
        }
        if (name === 'meetingAgenda') {
            setShowOtherAgendaInput(value === 'Other');
            if (value !== 'Other') {
                // Clear the 'other' field if a predefined agenda is selected
                setFormData((prev) => ({ ...prev, otherMeetingAgenda: '' }));
            }
        }
        if (name === 'companyType') {
            setShowOtherClientCompanyInput(value === 'new');
            setFormData((prev) => ({
                ...prev,
                clientCompany: '', // Reset company selection when type changes
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
        const newSlotEndTime = calculateSlotTime(newEndTime, travelTime); // Slot end depends on meeting end

        setFormData(prev => ({
            ...prev,
            meetingDuration: value,
            meetingEndTime: newEndTime,
            // Slot start time doesn't change with duration
            meetingSlotEndTime: newSlotEndTime,
        }));
    };

    const handleTravelTimeChange = (value: string) => {
        const travelTime = parseInt(value);
        const startTime = formData.meetingStartTime;
        const endTime = formData.meetingEndTime; // Use existing end time

        const newSlotStartTime = calculateSlotTime(startTime, -travelTime);
        const newSlotEndTime = calculateSlotTime(endTime, travelTime);

        setFormData(prev => ({
            ...prev,
            venueDistance: value,
            meetingSlotStartTime: newSlotStartTime,
            meetingSlotEndTime: newSlotEndTime,
        }));
    };


    // --- Time Calculations ---
    const calculateSlotTime = (baseTime: string, minutesToAdd: number): string => {
        if (!baseTime || isNaN(minutesToAdd)) return '';
        try {
            const [hours, minutes] = baseTime.split(':').map(Number);
            if (isNaN(hours) || isNaN(minutes)) return '';

            const baseDate = new Date();
            baseDate.setHours(hours, minutes, 0, 0); // Set seconds and ms to 0

            const slotDate = new Date(baseDate.getTime() + minutesToAdd * 60000);

            return slotDate.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }); // Use en-GB for HH:MM
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
            const endHour = Math.floor(totalMinutes / 60) % 24; // Use modulo 24 for hours
            const endMinute = totalMinutes % 60;

            return `${endHour.toString().padStart(2, '0')}:${endMinute.toString().padStart(2, '0')}`;
        } catch (e) {
            console.error("Error calculating end time:", e);
            return '';
        }
    };

    // --- Validation & Submission ---
    const validateStep = (stepIndex: number): boolean => {
        const fieldsToValidate: { [key: number]: string[] } = {
            0: ['meetingDate', 'meetingType', 'meetingVenueArea'],
            1: ['clientName', 'companyType', 'clientMobile', 'bclAttendees'], // Base client fields
            2: ['meetingStartTime', 'meetingDuration', 'meetingAgenda', 'venueDistance'],
        };

        let requiredFields = fieldsToValidate[stepIndex] || [];

        // Add conditional fields for step 1
        if (stepIndex === 1) {
            if (formData.companyType === 'existing') {
                requiredFields.push('clientCompany');
            } else if (formData.companyType === 'new') {
                requiredFields.push('otherClientCompany'); // Validate the input for new company name
            }
        }
        // Add conditional field for step 2 (Agenda)
        if (stepIndex === 2 && formData.meetingAgenda === 'Other') {
            requiredFields.push('otherMeetingAgenda');
        }
        // Add conditional field for step 0 (Venue) - if you add an 'other' input
        // if (stepIndex === 0 && formData.meetingVenueArea === 'Other') {
        //     requiredFields.push('otherMeetingVenueArea');
        // }


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

        // Validate all steps before final submission
        let allValid = true;
        const finalInvalidFields: string[] = [];
        for (let i = 0; i < steps.length - 1; i++) { // Validate steps 0, 1, 2
            if (!validateStep(i)) {
                allValid = false;
                // Collect invalid fields from all steps
                const stepInvalid = (fieldsToValidate[i] || []).filter(field => {
                    // Add conditional checks again here if needed
                    if (i === 1) {
                        if (formData.companyType === 'existing' && field === 'clientCompany' && (!formData.clientCompany || formData.clientCompany === 'Other')) return true;
                        if (formData.companyType === 'new' && field === 'otherClientCompany' && !formData.otherClientCompany) return true;
                        if (field !== 'clientCompany' && field !== 'otherClientCompany' && !formData[field as keyof typeof formData]) return true; // check other base fields
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
            const uniqueInvalidFields = [...new Set(finalInvalidFields)]; // Remove duplicates
            setInvalidFields(uniqueInvalidFields);
            // Find the first step with an error and navigate to it
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
        setProgress(100); // Show full progress on submit attempt

        // Prepare final data (handle 'Other' cases)
        const finalClientCompany = formData.companyType === 'new' ? formData.otherClientCompany : formData.clientCompany;
        const finalAgenda = formData.meetingAgenda === 'Other' ? formData.otherMeetingAgenda : formData.meetingAgenda;
        // const finalVenue = formData.meetingVenueArea === 'Other' ? formData.otherMeetingVenueArea : formData.meetingVenueArea; // If you add other venue input

        const dataToSubmit = {
            ...formData,
            clientCompany: finalClientCompany,
            meetingAgenda: finalAgenda,
            // meetingVenueArea: finalVenue, // Uncomment if using other venue
            // Remove temporary 'other' fields if they exist in formData object
            otherClientCompany: undefined,
            otherMeetingAgenda: undefined,
            // otherMeetingVenueArea: undefined,
        };

        try {
            // Check for meeting conflicts before proceeding
            const { data: existingMeetings, error: fetchError } = await supabase
                .from('bcl_meetings_meetings')
                .select('id_main, meeting_date, meeting_start_time, meeting_end_time, meeting_slot_start_time, meeting_slot_end_time, client_name')
                .eq('meeting_date', dataToSubmit.meetingDate)
                .in('status', ['upcoming', 'rescheduled']);

            if (fetchError) {
                console.error('Error checking for conflicts:', fetchError);
                throw new Error('Failed to check for meeting conflicts');
            }

            // Check for time slot conflicts (including travel time)
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

                    // Check if time slots overlap
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

            // No conflicts, proceed with scheduling
            const { data: insertedData, error } = await supabase.from('bcl_meetings_meetings').insert([
                {
                    booking_date: dataToSubmit.bookingDate,
                    booking_day: dataToSubmit.bookingDay,
                    meeting_date: dataToSubmit.meetingDate,
                    meeting_day: dataToSubmit.meetingDay,
                    meeting_type: dataToSubmit.meetingType,
                    meeting_venue_area: dataToSubmit.meetingVenueArea, // Use the potentially updated venue
                    client_name: dataToSubmit.clientName,
                    client_company: dataToSubmit.clientCompany, // Use the final company name
                    client_mobile: dataToSubmit.clientMobile,
                    // client_email: dataToSubmit.clientEmail, // Add if email is in your DB schema
                    bcl_attendee: dataToSubmit.bclAttendees,      // JSON array of attendee UUIDs
                    bcl_attendee_mobile: dataToSubmit.bclAttendeeMobile,
                    created_by: currentUserId,
                    meeting_agenda: dataToSubmit.meetingAgenda, // Use the final agenda
                    meeting_duration: parseInt(dataToSubmit.meetingDuration), // Ensure integer
                    venue_distance: parseInt(dataToSubmit.venueDistance), // Ensure integer
                    meeting_start_time: dataToSubmit.meetingStartTime,
                    meeting_end_time: dataToSubmit.meetingEndTime,
                    meeting_slot_start_time: dataToSubmit.meetingSlotStartTime,
                    meeting_slot_end_time: dataToSubmit.meetingSlotEndTime,
                    badge_status: 'Open', // Default status
                    status: 'upcoming', // Default status
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
            } catch (confirmError) {
                console.error('Booking confirmation failed:', confirmError);
                // Don't throw - booking was successful
            }

            setFormStatus('success');
            toast({ title: "Success!", description: "Meeting scheduled successfully." });

            // Redirect to calendar page after a short delay
            // setTimeout(() => {
            //     window.location.href = '/calendar';
            // }, 1500);

            // Reset form (this will happen if user navigates back)
            setTimeout(() => {
                setFormData(initialFormData);
                // Re-initialize booking date/day
                const currentDate = new Date();
                setFormData((prev) => ({
                    ...initialFormData, // Reset all fields first
                    bookingDate: currentDate.toISOString().split('T')[0],
                    bookingDay: currentDate.toLocaleDateString('en-US', { weekday: 'long' }),
                    bclAttendees: [],
                    bclAttendeeNames: [],
                    bclAttendeeMobile: '+254700298298',
                    venueDistance: '10', // Reset travel time default
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
            setProgress(activeStep * (100 / (steps.length - 1))); // Reset progress to current step
        }
    };

    // --- Navigation ---
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
            // Clear validation errors when going back
            setInvalidFields([]);
        }
    };

    // --- Render Helpers ---
    const generateTimeOptions = () => {
        const options = [];
        for (let i = 7; i <= 21; i++) { // 7 AM to 9 PM
            const hour = i.toString().padStart(2, '0');
            options.push({ value: `${hour}:00`, label: `${hour}:00` });
            if (i < 21) { // Don't add 9:30 PM if loop ends at 9 PM
                options.push({ value: `${hour}:30`, label: `${hour}:30` });
            }
        }
        return options;
    };

    const renderInputField = (id: string, label: string, options: { placeholder?: string, type?: string, icon?: React.ElementType, readOnly?: boolean, isInvalid?: boolean, children?: React.ReactNode, className?: string } = {}) => {
        const { placeholder, type = 'text', icon: Icon, readOnly = false, isInvalid = false, children, className } = options;
        const Tag = type === 'textarea' ? Textarea : Input; // Use Textarea if type is 'textarea'
        return (
            <div className="space-y-1.5">
                <Label htmlFor={id} className={`text-xs font-semibold uppercase tracking-wide ${isInvalid ? 'text-red-600' : 'text-slate-500'}`}>{label}</Label>
                <div className="relative">
                    {Icon && <Icon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />}
                    <Tag
                        id={id}
                        name={id}
                        type={type}
                        value={formData[id as keyof typeof formData] || ''}
                        onChange={handleChange}
                        placeholder={placeholder || `Enter ${label.toLowerCase()}`}
                        readOnly={readOnly}
                        className={`h-11 rounded-lg text-sm ${Icon ? 'pl-9' : ''} ${readOnly ? 'bg-slate-50 text-slate-500 cursor-not-allowed' : 'bg-white'} ${isInvalid ? 'border-red-500 focus:border-red-500 focus:ring-red-500' : 'border-slate-200 focus:border-[#0DAA8A] focus:ring-[#0DAA8A]/20'} ${className}`}
                        rows={type === 'textarea' ? 3 : undefined} // Add rows prop for Textarea
                    />
                    {children}
                </div>
                {isInvalid && <p className="text-xs text-red-500 mt-1">This field is required.</p>}
            </div>
        );
    };

    const renderSelectField = (id: string, label: string, options: { placeholder: string, items: { value: string, label: string }[], icon?: React.ElementType, isInvalid?: boolean, loading?: boolean, loadingPlaceholder?: string, onValueChange: (value: string) => void }) => {
        const { placeholder, items, icon: Icon, isInvalid = false, loading = false, loadingPlaceholder = "Loading...", onValueChange } = options;
        return (
            <div className="space-y-1.5">
                <Label htmlFor={id} className={`text-xs font-semibold uppercase tracking-wide ${isInvalid ? 'text-red-600' : 'text-slate-500'}`}>{label}</Label>
                <div className="relative">
                    {Icon && <Icon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 z-10 pointer-events-none" />}
                    {loading ? (
                        <Button variant="outline" disabled className={`h-11 w-full justify-start rounded-lg border-slate-200 bg-slate-50 font-normal text-slate-500 ${Icon ? 'pl-9' : ''}`}>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            {loadingPlaceholder}
                        </Button>
                    ) : (
                        <Select
                            value={formData[id as keyof typeof formData] || ''}
                            onValueChange={onValueChange}
                            name={id} // Add name prop for potential form handling libraries
                        >
                            <SelectTrigger className={`h-11 rounded-lg text-sm ${Icon ? 'pl-9' : ''} ${isInvalid ? 'border-red-500 text-red-600 focus:border-red-500 focus:ring-red-500' : 'border-slate-200 focus:border-[#0DAA8A] focus:ring-[#0DAA8A]/20'}`}>
                                <SelectValue placeholder={placeholder} />
                            </SelectTrigger>
                            <SelectContent className="rounded-lg">
                                {items.map((item) => (
                                    <SelectItem key={item.value} value={item.value}>
                                        {item.label}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    )}
                </div>
                {isInvalid && <p className="text-xs text-red-500 mt-1">This field is required.</p>}
            </div>
        );
    };


    // --- Voice Recognition Setup ---
    const commands = [
        // Basic Info Step
        { command: ['set meeting type *', 'meeting type *'], callback: (type: string) => handleSelectChange('meetingType', type.toLowerCase() === 'in person' ? 'inPerson' : 'virtual') },
        { command: ['set meeting date *', 'meeting date *'], callback: (dateStr: string) => { try { const d = new Date(dateStr); if (!isNaN(d.getTime())) handleMeetingDateChange(d); } catch (e) { console.error(e); toast({ variant: "destructive", title: "Invalid Date", description: `Could not parse date: ${dateStr}` }); } } },
        { command: ['set venue *', 'venue *', 'meeting venue *'], callback: (venue: string) => handleSelectChange('meetingVenueArea', venue) }, // Assuming direct input for venue now

        // Client Details Step
        { command: ['set client name *', 'client name *'], callback: (name: string) => handleChange({ target: { name: 'clientName', value: name } }) },
        { command: ['set company type *', 'company type *'], callback: (type: string) => handleSelectChange('companyType', type.toLowerCase() === 'new' ? 'new' : 'existing') },
        { command: ['set company *', 'company *', 'client company *'], callback: (company: string) => handleSelectChange('clientCompany', company) }, // Needs logic if companyType is 'new'
        { command: ['set client mobile *', 'client phone *', 'mobile *'], callback: (mobile: string) => handleChange({ target: { name: 'clientMobile', value: mobile } }) },
        { command: ['set client email *', 'email *'], callback: (email: string) => handleChange({ target: { name: 'clientEmail', value: email } }) },
        { command: ['set attendee *', 'bcl attendee *'], callback: (attendee: string) => handleSelectChange('bclAttendee', attendee) },

        // Scheduling Step
        { command: ['set start time *', 'start time *'], callback: (time: string) => handleMeetingStartTimeChange(time) }, // Expects HH:MM format
        { command: ['set duration *', 'duration *'], callback: (duration: string) => { const val = duration.match(/\d+/)?.[0]; if (val) handleDurationChange(val); } }, // Extracts number
        { command: ['set agenda *', 'agenda *'], callback: (agenda: string) => handleSelectChange('meetingAgenda', agenda) }, // Needs logic for 'Other'

        // Navigation & Submission
        { command: ['next', 'next step', 'continue', 'next page'], callback: nextStep },
        { command: ['back', 'previous', 'previous step', 'go back'], callback: prevStep },
        { command: ['submit', 'submit form', 'schedule', 'schedule meeting', 'book appointment'], callback: () => handleSubmit() }
    ];

    const { transcript, listening, resetTranscript, browserSupportsSpeechRecognition } = useSpeechRecognition({ commands });

    // --- Main Return ---
    return (
        <div className="min-h-screen bg-slate-50 px-3 py-4 sm:px-5 lg:px-8">
            <Toaster />

            {/* Voice control indicator */}
            {/* <div className="fixed top-4 right-4 z-50">
                <TooltipProvider delayDuration={100}>
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <Button
                                variant={isListening ? "destructive" : "secondary"}
                                size="icon"
                                onClick={toggleListening}
                                className="rounded-full shadow-lg"
                                aria-label={isListening ? "Stop Voice Control" : "Start Voice Control"}
                            >
                                {isListening ? <MicOff className="h-5 w-5" /> : <Mic className="h-5 w-5" />}
                            </Button>
                        </TooltipTrigger>
                        <TooltipContent side="left">
                            {!browserSupportsSpeechRecognition ? <p className="text-red-600">Browser not supported</p> :
                                <p>{isListening ? "Stop Voice Control" : "Start Voice Control"}</p>}
                        </TooltipContent>
                    </Tooltip>
                </TooltipProvider>
            </div> */}

            <div className="mx-auto max-w-6xl">
                <Card className="overflow-hidden rounded-lg border-slate-200 bg-white shadow-sm">
                    <CardHeader className="border-b border-slate-100 bg-white p-4 sm:p-6">
                        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                            <div>
                                <div className="mb-3 inline-flex items-center gap-2 rounded-lg bg-[#0DAA8A]/10 px-2.5 py-1 text-xs font-semibold text-[#087963] ring-1 ring-[#0DAA8A]/15">
                                    <Calendar className="h-3.5 w-3.5" />
                                    Booksmart Scheduler
                                </div>
                                <CardTitle className="text-2xl font-bold tracking-tight text-slate-950 sm:text-3xl">
                                    Schedule New Meeting
                                </CardTitle>
                                <CardDescription className="mt-1 text-sm text-slate-500">
                                    Capture the client, attendee, slot, and agenda details in one guided flow.
                                </CardDescription>
                            </div>
                            <div className="grid grid-cols-2 gap-2 text-xs sm:flex">
                                <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
                                    <p className="font-semibold text-slate-950">{formData.meetingDate || 'No date'}</p>
                                    <p className="text-slate-500">Meeting date</p>
                                </div>
                                <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
                                    <p className="font-semibold text-slate-950">{formData.meetingStartTime || '--:--'}</p>
                                    <p className="text-slate-500">Start time</p>
                                </div>
                            </div>
                        </div>
                    </CardHeader>

                    {/* Progress & Step Indicator Section */}
                    <div className="border-b border-slate-100 bg-slate-50/70 px-4 pb-3 pt-4 sm:px-6">
                        {/* Step indicators */}
                        <div className="mb-1 flex items-center justify-between overflow-x-auto pb-1">
                            {steps.map((step, index) => (
                                <React.Fragment key={step.id}>
                                    <div
                                        className={`min-w-[72px] flex flex-col items-center cursor-pointer transition-colors duration-300 ${activeStep >= step.id ? 'text-[#0DAA8A]' : 'text-slate-400 hover:text-slate-500'}`}
                                        onClick={() => {
                                            // Allow navigation only to completed or current steps
                                            if (activeStep > step.id || validateStep(step.id - 1)) { // Check if previous step is valid
                                                setActiveStep(step.id);
                                            } else if (activeStep === step.id) {
                                                // Already on this step
                                            } else {
                                                toast({ variant: "default", title: "Step Locked", description: "Please complete previous steps first." });
                                            }
                                        }}
                                    >
                                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center border mb-1 relative transition-all duration-300 ${activeStep === step.id ? 'bg-[#0DAA8A] border-[#0DAA8A] text-white shadow-sm' :
                                            activeStep > step.id ? 'bg-[#0DAA8A]/10 border-[#0DAA8A]/30 text-[#087963]' :
                                                'bg-white border-slate-200 text-slate-400'
                                            }`}>
                                            {activeStep > step.id ? <Check className="h-5 w-5" /> : <step.icon className="h-4 w-4" />}
                                        </div>
                                        <span className="hidden text-center text-xs font-semibold sm:block">{step.name}</span>
                                    </div>
                                    {/* Connector Line */}
                                    {index < steps.length - 1 && (
                                        <div className={`mx-2 h-px min-w-8 flex-1 transition-colors duration-300 ${activeStep > index ? 'bg-[#0DAA8A]' : 'bg-slate-200'}`}></div>
                                    )}
                                </React.Fragment>
                            ))}
                        </div>
                        {/* Progress bar */}
                        {/* <Progress value={progress} className="h-1.5 mb-2" /> */}
                    </div>


                    {/* Voice transcript display */}
                    {/* {isListening && (
                        <div className="mx-4 sm:mx-6 mt-4 bg-blue-50 border border-blue-200 text-gray-700 p-3 rounded-lg shadow-sm">
                            <div className="flex items-center space-x-2 mb-1">
                                <div className="w-2.5 h-2.5 bg-red-500 rounded-full animate-pulse"></div>
                                <p className="text-xs font-medium text-blue-600">Listening...</p>
                            </div>
                            <p className="text-sm italic ml-4">"{transcript || 'Say a command...'}"</p>
                        </div>
                    )} */}

                    <CardContent className="p-4 sm:p-6">
                        <form onSubmit={handleSubmit} noValidate>
                            {/* Step Content */}
                            <div className="min-h-[300px]"> {/* Ensure minimum height for content area */}
                                {/* Step 1: Basic Info */}
                                {activeStep === 0 && (
                                    <div className="animate-fadeIn space-y-4">
                                        <h3 className="mb-3 text-base font-bold text-slate-900">Basic Information</h3>
                                        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                                            {renderInputField('bookingDate', 'Booking Date', { readOnly: true, icon: Calendar })}
                                            {renderInputField('bookingDay', 'Booking Day', { readOnly: true, icon: Calendar })}
                                            <div className="space-y-1.5">
                                                <Label htmlFor="meetingDate" className={`text-xs font-semibold uppercase tracking-wide ${invalidFields.includes('meetingDate') ? 'text-red-600' : 'text-slate-500'}`}>Meeting Date *</Label>
                                                <div className="relative">
                                                    <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
                                                    <Input
                                                        id="meetingDate"
                                                        name="meetingDate"
                                                        type="date"
                                                        min={new Date().toISOString().split('T')[0]}
                                                        value={formData.meetingDate}
                                                        onChange={(e) => handleMeetingDateChange(e.target.value ? new Date(e.target.value) : null)}
                                                        className={`h-11 rounded-lg pl-9 text-sm ${invalidFields.includes('meetingDate') ? 'border-red-500 focus:border-red-500 focus:ring-red-500' : 'border-slate-200 focus:border-[#0DAA8A] focus:ring-[#0DAA8A]/20'}`}
                                                    />
                                                </div>
                                                {invalidFields.includes('meetingDate') && <p className="text-xs text-red-500 mt-1">This field is required.</p>}
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
                                                items: [ // Add predefined venues + Other
                                                    { value: 'BCL BR', label: 'BCL Boardroom' },
                                                    { value: 'Client Office', label: 'Client Office' },
                                                    { value: 'Virtual', label: 'Virtual / Online' },
                                                    { value: 'Other', label: 'Other (Specify Below)' }
                                                ],
                                                icon: MapPin,
                                                isInvalid: invalidFields.includes('meetingVenueArea'),
                                                onValueChange: (value) => handleSelectChange('meetingVenueArea', value)
                                            })}
                                            {/* Conditional Input for Other Venue */}
                                            {showOtherMeetingVenueInput && renderInputField('otherMeetingVenueArea', 'Specify Venue *', {
                                                placeholder: 'E.g., Cafe Name, Specific Address',
                                                icon: MapPin,
                                                isInvalid: invalidFields.includes('otherMeetingVenueArea') // Assuming you add validation for this
                                            })}
                                        </div>
                                    </div>
                                )}

                                {/* Step 2: Client Details */}
                                {activeStep === 1 && (
                                    <div className="animate-fadeIn space-y-4">
                                        <h3 className="mb-3 text-base font-bold text-slate-900">Client Information</h3>
                                        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                                            {renderInputField('clientName', 'Client Name *', { icon: User, isInvalid: invalidFields.includes('clientName') })}
                                            {renderSelectField('companyType', 'Company Type *', {
                                                placeholder: 'Select Company Type',
                                                items: [{ value: 'existing', label: 'Existing Company' }, { value: 'new', label: 'New Company' }],
                                                isInvalid: invalidFields.includes('companyType'),
                                                onValueChange: (value) => handleSelectChange('companyType', value)
                                            })}

                                            {formData.companyType === 'existing' && renderSelectField('clientCompany', 'Client Company *', {
                                                placeholder: 'Select Existing Company',
                                                items: companyOptions.map(c => ({ value: c, label: c })), // Add 'Other' if needed
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
                                            {renderInputField('clientEmail', 'Client Email', { icon: Mail, type: 'email' })} {/* Optional? */}

                                            {/* BCL Attendee multi-select */}
                                            <div className="space-y-1.5">
                                                <Label className={`text-xs font-semibold uppercase tracking-wide ${invalidFields.includes('bclAttendees') ? 'text-red-600' : 'text-slate-500'}`}>BCL Attendee(s) *</Label>
                                                {loadingBclAttendees ? (
                                                    <Button variant="outline" disabled className="h-11 w-full justify-start rounded-lg border-slate-200 bg-slate-50 font-normal text-slate-500">
                                                        <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Loading attendees...
                                                    </Button>
                                                ) : (
                                                    <Popover open={attendeePickerOpen} onOpenChange={setAttendeePickerOpen}>
                                                        <PopoverTrigger asChild>
                                                            <Button
                                                                variant="outline"
                                                                className={`h-auto min-h-[44px] w-full justify-start rounded-lg text-sm font-normal ${invalidFields.includes('bclAttendees') ? 'border-red-500 text-red-600' : 'border-slate-200'}`}
                                                            >
                                                                <User className="mr-2 h-4 w-4 shrink-0 text-slate-400" />
                                                                {formData.bclAttendees.length === 0 ? (
                                                                    <span className="text-slate-400">Select BCL Attendee(s)</span>
                                                                ) : (
                                                                    <div className="flex flex-wrap gap-1">
                                                                        {(formData.bclAttendeeNames as string[]).map((name, i) => (
                                                                            <Badge key={i} variant="secondary" className="flex items-center gap-1 rounded-md text-xs">
                                                                                {name}
                                                                                <X className="h-3 w-3 cursor-pointer" onClick={(e) => { e.stopPropagation(); toggleAttendee((formData.bclAttendees as string[])[i], name, false); }} />
                                                                            </Badge>
                                                                        ))}
                                                                    </div>
                                                                )}
                                                            </Button>
                                                        </PopoverTrigger>
                                                        <PopoverContent className="w-72 p-2" align="start">
                                                            <p className="mb-2 px-1 text-xs font-semibold text-slate-500 uppercase tracking-wide">Select Attendees</p>
                                                            <div className="max-h-60 overflow-y-auto space-y-1">
                                                                {bclAttendees.map((a) => {
                                                                    const isSelected = (formData.bclAttendees as string[]).includes(a.id);
                                                                    return (
                                                                        <div key={a.id} className="flex items-center gap-2 rounded-lg px-2 py-2 hover:bg-slate-50 cursor-pointer" onClick={() => toggleAttendee(a.id, a.displayName, !isSelected)}>
                                                                            <Checkbox
                                                                                checked={isSelected}
                                                                                onCheckedChange={(checked) => toggleAttendee(a.id, a.displayName, !!checked)}
                                                                                onClick={(e) => e.stopPropagation()}
                                                                            />
                                                                            <span className="text-sm text-slate-800">{a.displayName}</span>
                                                                        </div>
                                                                    );
                                                                })}
                                                            </div>
                                                        </PopoverContent>
                                                    </Popover>
                                                )}
                                                {invalidFields.includes('bclAttendees') && <p className="text-xs text-red-500 mt-1">Please select at least one BCL attendee.</p>}
                                            </div>
                                            {renderInputField('bclAttendeeMobile', 'BCL Attendee Mobile', { readOnly: true, icon: Phone })}
                                        </div>
                                    </div>
                                )}

                                {/* Step 3: Scheduling */}
                                {activeStep === 2 && (
                                    <div className="animate-fadeIn space-y-4">
                                        <h3 className="mb-3 text-base font-bold text-slate-900">Scheduling Details</h3>
                                        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                                            {/* Modified Meeting Start Time with single flexible input */}
                                            <div className="space-y-1.5">
                                                <Label htmlFor="meetingStartTime" className={`text-xs font-semibold uppercase tracking-wide ${invalidFields.includes('meetingStartTime') ? 'text-red-600' : 'text-slate-500'}`}>Meeting Start Time *</Label>
                                                <div className="relative">
                                                    <Clock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
                                                    <Input
                                                        id="meetingStartTime"
                                                        name="meetingStartTime"
                                                        type="time"
                                                        value={formData.meetingStartTime}
                                                        onChange={(e) => handleMeetingStartTimeChange(e.target.value)}
                                                        className={`h-11 rounded-lg pl-9 text-sm ${invalidFields.includes('meetingStartTime') ? 'border-red-500 focus:border-red-500 focus:ring-red-500' : 'border-slate-200 focus:border-[#0DAA8A] focus:ring-[#0DAA8A]/20'}`}
                                                        placeholder="Enter time (HH:MM)"
                                                    />
                                                </div>
                                                <div className="mt-1 text-xs text-slate-500">
                                                    Enter in 24-hour format (e.g., 09:00, 14:30)
                                                </div>
                                                {invalidFields.includes('meetingStartTime') && <p className="text-xs text-red-500 mt-1">This field is required.</p>}
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
                                                onValueChange: handleTravelTimeChange // Use dedicated handler
                                            })}
                                            {renderInputField('meetingSlotStartTime', 'Calendar Slot Start', { readOnly: true, icon: Calendar })}
                                            {renderInputField('meetingSlotEndTime', 'Calendar Slot End', { readOnly: true, icon: Calendar })}

                                            {/* Agenda Selection */}
                                            <div className="sm:col-span-2 space-y-1.5">
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

                                            {/* Conditional Input for Other Agenda */}
                                            {showOtherAgendaInput && (
                                                <div className="sm:col-span-2 space-y-1.5">
                                                    {renderInputField('otherMeetingAgenda', 'Specify Agenda *', {
                                                        placeholder: 'Briefly describe the meeting purpose...',
                                                        type: 'textarea', // Use textarea for more space
                                                        isInvalid: invalidFields.includes('otherMeetingAgenda')
                                                    })}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                )}

                                {/* Step 4: Confirmation */}
                                {activeStep === 3 && (
                                    <div className="animate-fadeIn space-y-5">
                                        <h3 className="mb-3 text-base font-bold text-slate-900">Confirm Meeting Details</h3>

                                        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                                            {/* Simplified Confirmation Display */}
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
                                            <ConfirmationItem label="Travel Time (Each Way)" value={`${formData.venueDistance} min`} />
                                            <ConfirmationItem label="Calendar Slot" value={`${formData.meetingSlotStartTime || '--:--'} - ${formData.meetingSlotEndTime || '--:--'}`} />
                                        </div>

                                        {/* Status Messages */}
                                        {formStatus === 'success' && (
                                            <div className="mt-4 flex items-center rounded-lg border border-[#0DAA8A]/25 bg-[#0DAA8A]/10 px-4 py-3 text-[#087963]" role="alert">
                                                <Check className="h-5 w-5 mr-2 text-[#0DAA8A]" />
                                                <p><strong className="font-semibold">Success!</strong> Meeting scheduled.</p>
                                            </div>
                                        )}
                                        {formStatus === 'error' && (
                                            <div className="mt-4 flex items-center rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-red-700" role="alert">
                                                <Info className="h-5 w-5 mr-2 text-red-600" />
                                                <p><strong className="font-semibold">Error!</strong> Failed to schedule. Please try again.</p>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        </form>
                    </CardContent>

                    <CardFooter className="flex items-center justify-between gap-3 border-t border-slate-100 bg-slate-50/80 p-4">
                        <Button
                            type="button"
                            variant="outline"
                            onClick={prevStep}
                            disabled={activeStep === 0 || formStatus === 'submitting'}
                            className="flex h-10 items-center rounded-lg border-slate-200 text-slate-600 hover:bg-white"
                        >
                            <ChevronLeft className="h-4 w-4 mr-1" />
                            Previous
                        </Button>

                        {activeStep < steps.length - 1 ? (
                            <Button
                                type="button"
                                onClick={nextStep}
                                disabled={formStatus === 'submitting'}
                                className="flex h-10 items-center rounded-lg bg-[#0DAA8A] text-white hover:bg-[#0B9579]"
                            >
                                Next
                                <ChevronRight className="h-4 w-4 ml-1" />
                            </Button>
                        ) : (
                            <Button
                                type="button" // Changed from submit to prevent default form submission
                                onClick={handleSubmit} // Trigger validation and submission logic
                                disabled={formStatus === 'submitting' || formStatus === 'success'}
                                className={`flex h-10 items-center rounded-lg ${formStatus === 'submitting' ? 'bg-slate-400 cursor-not-allowed' : 'bg-[#0DAA8A] text-white hover:bg-[#0B9579]'}`}
                            >
                                {formStatus === 'submitting' ? (
                                    <>
                                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                        Scheduling...
                                    </>
                                ) : formStatus === 'success' ? (
                                    <>
                                        <Check className="h-4 w-4 mr-2" />
                                        Scheduled!
                                    </>
                                ) : (
                                    'Schedule Meeting'
                                )}
                            </Button>
                        )}
                    </CardFooter>
                </Card>
            </div>
        </div>
    );
};

// Helper component for confirmation items
const ConfirmationItem = ({ label, value }: { label: string, value: string | undefined | null }) => (
    <div className="rounded-lg border border-slate-100 bg-slate-50 px-3 py-2 text-sm">
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">{label}</p>
        <p className="mt-1 break-words font-medium text-slate-900">{value ? String(value) : '-'}</p>
    </div>
);

// Add this CSS for the fade-in animation (e.g., in your global CSS file or a style tag)
/*
@keyframes fadeIn {
  from { opacity: 0; transform: translateY(10px); }
  to { opacity: 1; transform: translateY(0); }
}
.animate-fadeIn {
  animation: fadeIn 0.5s ease-out forwards;
}
*/


export default BookingScheduler;
