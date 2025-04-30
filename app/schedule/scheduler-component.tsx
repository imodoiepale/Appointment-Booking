/* eslint-disable react/no-unescaped-entities */
// @ts-nocheck
"use client"

import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { createClient } from '@supabase/supabase-js';
import { addEvent } from './send'; // Assuming this path is correct
import useSpeechRecognitionSafe from './useSpeechRecognitionSafe';

// ShadCN UI components
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

// Icons
import { Calendar, Clock, Mic, MicOff, Building, User, Phone, Mail, MapPin, Check, ChevronRight, ChevronLeft, Loader2, Info } from 'lucide-react';

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
    const [isClient, setIsClient] = useState(false);
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
    
    const fieldsToValidate: { [key: number]: string[] } = {
        0: ['meetingDate', 'meetingType', 'meetingVenueArea'],
        1: ['clientName', 'companyType', 'clientMobile', 'bclAttendee'], // Base client fields
        2: ['meetingStartTime', 'meetingDuration', 'meetingAgenda', 'venueDistance'],
    };

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
        bclAttendee: '',
        bclAttendeeMobile: '+254700298298', // Default BCL mobile
        meetingAgenda: '', // Can be selected or 'Other'
        otherMeetingAgenda: '', // For custom agenda input
        meetingDuration: '', // in minutes
        venueDistance: '10', // Default travel time
        meetingStartTime: '', // HH:MM format
        meetingEndTime: '', // HH:MM format (calculated)
        meetingSlotStartTime: '', // HH:MM format (calculated)
    };

    const [formData, setFormData] = useState(initialFormData);

    // Command handlers for voice recognition
    const commands = [
        { command: 'set meeting date to *', callback: (dateStr) => {
            try {
                const date = new Date(dateStr);
                if (!isNaN(date.getTime())) {
                    handleMeetingDateChange(date);
                    toast({ title: "Voice Command", description: `Setting meeting date to ${dateStr}` });
                }
            } catch (e) {
                console.error("Error parsing date from voice", e);
            }
        }},
        { command: 'meeting at *', callback: (venue) => handleSelectChange('meetingVenueArea', venue) },
        
        // Client detail commands
        { command: 'client name is *', callback: (name) => handleChange({ target: { name: 'clientName', value: name } }) },
        { command: 'company type *', callback: (type) => handleSelectChange('companyType', type.toLowerCase()) },
        { command: 'client company is *', callback: (company) => handleSelectChange('clientCompany', company) },
        { command: 'mobile number is *', callback: (mobile) => handleChange({ target: { name: 'clientMobile', value: mobile.replace(/\s+/g, '') } }) },
        { command: 'email is *', callback: (email) => handleChange({ target: { name: 'clientEmail', value: email.toLowerCase().replace(/\s+/g, '') } }) },
        { command: 'attendee is *', callback: (attendee) => handleSelectChange('bclAttendee', attendee) },
        
        // Scheduling commands
        { command: 'start time *', callback: (time) => handleMeetingStartTimeChange(time) },
        { command: 'duration *', callback: (duration) => handleDurationChange(duration) },
        { command: 'agenda is *', callback: (agenda) => handleSelectChange('meetingAgenda', agenda) },
        
        // Navigation commands
        { command: ['next', 'next step', 'continue'], callback: () => nextStep() },
        { command: ['back', 'previous', 'go back'], callback: () => prevStep() },
        { command: ['submit', 'submit form', 'schedule', 'schedule meeting', 'book appointment'], callback: () => handleSubmit() }
    ];
    
    // Speech recognition setup - only initialize on client side
    const speechRecognition = useSpeechRecognitionSafe({
        commands
    });

    // Set isClient true once mounted
    useEffect(() => {
        setIsClient(true);
    }, []);

    // Safely extract properties based on client/server environment
    const transcript = isClient ? speechRecognition.transcript : '';
    const listening = isClient ? speechRecognition.listening : false;
    const browserSupportsSpeechRecognition = isClient ? speechRecognition.browserSupportsSpeechRecognition : false;
    
    // Use useMemo to create stable function references
    const startSpeechRecognition = useMemo(
        () => isClient ? speechRecognition.startListening : () => {},
        [isClient, speechRecognition.startListening]
    );
    
    const stopSpeechRecognition = useMemo(
        () => isClient ? speechRecognition.stopListening : () => {},
        [isClient, speechRecognition.stopListening]
    );
    
    const resetTranscript = useMemo(
        () => isClient ? speechRecognition.resetTranscript : () => {},
        [isClient, speechRecognition.resetTranscript]
    );

    useEffect(() => {
        const currentDate = new Date();
        const formattedDate = currentDate.toISOString().split('T')[0];
        const dayOfWeek = new Intl.DateTimeFormat('en-US', { weekday: 'long' }).format(currentDate);
        
        setFormData(prev => ({
            ...prev,
            bookingDate: formattedDate,
            bookingDay: dayOfWeek
        }));
        
        // Fetch companies on mount (client-side only)
        if (isClient) {
            const fetchCompanies = async () => {
                try {
                    const { data, error } = await supabase
                        .from('clients')
                        .select('company')
                        .order('company');
                    
                    if (error) throw error;
                    
                    // Extract unique companies
                    const uniqueCompanies = [...new Set(data.map(item => item.company))];
                    const companyItems = uniqueCompanies.map(company => ({
                        value: company,
                        label: company
                    }));
                    
                    setCompanyOptions([
                        ...companyItems, 
                        { value: 'Other', label: 'Other (Add new company)' }
                    ]);
                    setLoadingCompanies(false);
                } catch (err) {
                    console.error('Error fetching companies:', err);
                    setLoadingCompanies(false);
                }
            };
            
            fetchCompanies();
        }
    }, [isClient]);

    // Calculate progress
    useEffect(() => {
        const totalSteps = steps.length;
        const progressPercent = ((activeStep) / (totalSteps - 1)) * 100;
        setProgress(progressPercent);
        
        // Clear invalid field highlights when switching steps
        setInvalidFields([]);
    }, [activeStep, invalidFields.length]);

    // Toggle listening handler
    const toggleListening = useCallback(() => {
        if (!isClient || !browserSupportsSpeechRecognition) {
            toast({ 
                title: "Speech Recognition Not Available", 
                description: "Your browser doesn't support speech recognition or it's not available yet.",
                variant: "destructive"
            });
            return;
        }
        
        if (listening) {
            stopSpeechRecognition();
            setIsListening(false);
        } else {
            resetTranscript();
            startSpeechRecognition({ continuous: true });
            setIsListening(true);
            toast({ title: "Voice Control Active", description: "Listening for commands..." });
        }
    }, [browserSupportsSpeechRecognition, isClient, listening, resetTranscript, startSpeechRecognition, stopSpeechRecognition, toast]);

    const handleMeetingDateChange = (date: Date | null) => {
        if (date && !isNaN(date.getTime())) {
            const formattedDate = date.toISOString().split('T')[0];
            const dayOfWeek = new Intl.DateTimeFormat('en-US', { weekday: 'long' }).format(date);
            
            setFormData(prev => ({
                ...prev,
                meetingDate: formattedDate,
                meetingDay: dayOfWeek
            }));
        }
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        
        // Remove field from invalid list if it was previously invalid
        if (invalidFields.includes(name)) {
            setInvalidFields(prev => prev.filter(field => field !== name));
        }
        
        setFormData(prev => ({
            ...prev,
            [name]: value
        }));
    };

    const handleSelectChange = (name: string, value: string) => {
        // Remove field from invalid list if it was previously invalid
        if (invalidFields.includes(name)) {
            setInvalidFields(prev => prev.filter(field => field !== name));
        }
        
        // Handle special cases
        if (name === 'companyType') {
            // Reset client company if changing company type
            setFormData(prev => ({
                ...prev,
                [name]: value,
                clientCompany: '',
                otherClientCompany: ''
            }));
            
            // Show/hide the "Other" input based on company type
            setShowOtherClientCompanyInput(false);
        } 
        else if (name === 'clientCompany') {
            setFormData(prev => ({
                ...prev,
                [name]: value,
                otherClientCompany: value === 'Other' ? '' : prev.otherClientCompany
            }));
            
            setShowOtherClientCompanyInput(value === 'Other');
            
            // If selecting existing company, try to prefill other fields
            if (value !== 'Other') {
                fetchClientDetails(value);
            }
        } 
        else if (name === 'meetingAgenda') {
            setFormData(prev => ({
                ...prev,
                [name]: value,
                otherMeetingAgenda: value === 'Other' ? '' : prev.otherMeetingAgenda
            }));
            
            setShowOtherAgendaInput(value === 'Other');
        }
        else if (name === 'meetingVenueArea') {
            setFormData(prev => ({
                ...prev,
                [name]: value
            }));
            
            setShowOtherMeetingVenueInput(value === 'Other');
        } 
        else {
            // Default handling for other select fields
            setFormData(prev => ({
                ...prev,
                [name]: value
            }));
        }
    };

    const handleMeetingStartTimeChange = (value: string) => {
        // Remove field from invalid list if it was previously invalid
        if (invalidFields.includes('meetingStartTime')) {
            setInvalidFields(prev => prev.filter(field => field !== 'meetingStartTime'));
        }
        
        // Calculate end time based on start time and duration
        const endTime = formData.meetingDuration 
            ? calculateEndTime(value, parseInt(formData.meetingDuration)) 
            : '';
        
        // Calculate calendar slot start time (adjusting for travel time if needed)
        const slotStartTime = formData.meetingType === 'inPerson' && formData.venueDistance
            ? calculateSlotTime(value, -parseInt(formData.venueDistance))
            : value;
        
        setFormData(prev => ({
            ...prev,
            meetingStartTime: value,
            meetingEndTime: endTime,
            meetingSlotStartTime: slotStartTime
        }));
    };

    const handleDurationChange = (value: string) => {
        // Remove field from invalid list if it was previously invalid
        if (invalidFields.includes('meetingDuration')) {
            setInvalidFields(prev => prev.filter(field => field !== 'meetingDuration'));
        }
        
        // Calculate end time if we have a start time
        const endTime = formData.meetingStartTime 
            ? calculateEndTime(formData.meetingStartTime, parseInt(value)) 
            : '';
        
        setFormData(prev => ({
            ...prev,
            meetingDuration: value,
            meetingEndTime: endTime
        }));
    };

    const handleTravelTimeChange = (value: string) => {
        // Update the slot start time if meeting type is in-person
        const slotStartTime = formData.meetingType === 'inPerson' && formData.meetingStartTime
            ? calculateSlotTime(formData.meetingStartTime, -parseInt(value))
            : formData.meetingStartTime;
        
        setFormData(prev => ({
            ...prev,
            venueDistance: value,
            meetingSlotStartTime: slotStartTime
        }));
    };

    const calculateSlotTime = (baseTime: string, minutesToAdd: number): string => {
        // Parse base time (format: HH:MM)
        const [hours, minutes] = baseTime.split(':').map(num => parseInt(num));
        
        // Create date object with today's date but specified time
        const date = new Date();
        date.setHours(hours, minutes, 0, 0);
        
        // Add minutes
        date.setMinutes(date.getMinutes() + minutesToAdd);
        
        // Format back to HH:MM
        const newHours = date.getHours().toString().padStart(2, '0');
        const newMinutes = date.getMinutes().toString().padStart(2, '0');
        
        return `${newHours}:${newMinutes}`;
    };

    const calculateEndTime = (startTime: string, durationMinutes: number): string => {
        if (!startTime || !durationMinutes) return '';
        
        // Parse start time (format: HH:MM)
        const [hours, minutes] = startTime.split(':').map(num => parseInt(num));
        
        // Create date object with today's date but specified time
        const date = new Date();
        date.setHours(hours, minutes, 0, 0);
        
        // Add duration
        date.setMinutes(date.getMinutes() + durationMinutes);
        
        // Format to HH:MM
        const endHours = date.getHours().toString().padStart(2, '0');
        const endMinutes = date.getMinutes().toString().padStart(2, '0');
        
        return `${endHours}:${endMinutes}`;
    };

    const validateStep = (stepIndex: number): boolean => {
        const fieldsToCheck = fieldsToValidate[stepIndex] || [];
        const invalidFieldsFound: string[] = [];
        
        for (const field of fieldsToCheck) {
            let isValid = true;
            
            // Special case for client company field
            if (field === 'clientCompany' && formData.companyType === 'new' && formData.otherClientCompany.trim() === '') {
                isValid = false;
            } 
            // For client company of existing type
            else if (field === 'clientCompany' && formData.companyType === 'existing' && formData.clientCompany === '') {
                isValid = false;
            }
            // For meeting venue area with "Other" option
            else if (field === 'meetingVenueArea' && formData.meetingVenueArea === 'Other' && formData.otherMeetingVenue?.trim() === '') {
                isValid = false;
            }
            // Normal field validation
            else if (formData[field] === undefined || formData[field] === '') {
                isValid = false;
            }
            
            if (!isValid) {
                invalidFieldsFound.push(field);
            }
        }
        
        setInvalidFields(invalidFieldsFound);
        return invalidFieldsFound.length === 0;
    };

    const handleSubmit = async (e?: React.FormEvent) => {
        if (e) e.preventDefault();
        
        // Validate current step
        if (!validateStep(activeStep)) {
            toast({
                variant: "destructive",
                title: "Missing Information",
                description: "Please fill in all required fields before proceeding."
            });
            return;
        }
        
        // For last step, submit the form
        if (activeStep === steps.length - 1) {
            setFormStatus('submitting');
            
            try {
                // Prepare data for submission
                const submissionData = {
                    ...formData,
                    // Properly format client company when "Other" is selected
                    clientCompany: formData.clientCompany === 'Other' ? formData.otherClientCompany : formData.clientCompany,
                    // Properly format meeting agenda when "Other" is selected
                    meetingAgenda: formData.meetingAgenda === 'Other' ? formData.otherMeetingAgenda : formData.meetingAgenda,
                    // Format dates and times for calendar event
                    summary: `Meeting with ${formData.clientName} from ${formData.clientCompany === 'Other' ? formData.otherClientCompany : formData.clientCompany}`,
                    description: `Agenda: ${formData.meetingAgenda === 'Other' ? formData.otherMeetingAgenda : formData.meetingAgenda}\nContact: ${formData.clientMobile}`,
                    startDateTime: `${formData.meetingDate}T${formData.meetingSlotStartTime}:00`,
                    endDateTime: `${formData.meetingDate}T${formData.meetingEndTime}:00`, 
                    location: formData.meetingType === 'virtual' ? 'Virtual Meeting' : formData.meetingVenueArea,
                    attendees: [
                        { email: formData.clientEmail || 'client@example.com', name: formData.clientName },
                        // Add BCL attendee if available
                        ...(formData.bclAttendee ? [{ email: 'contact@bcl.com', name: formData.bclAttendee }] : [])
                    ]
                };
                
                // Insert into Supabase
                const { data, error } = await supabase
                    .from('appointments')
                    .insert([{
                        client_name: formData.clientName,
                        client_company: formData.clientCompany === 'Other' ? formData.otherClientCompany : formData.clientCompany,
                        client_mobile: formData.clientMobile,
                        client_email: formData.clientEmail || null,
                        bcl_attendee: formData.bclAttendee,
                        meeting_date: formData.meetingDate,
                        meeting_day: formData.meetingDay,
                        meeting_start_time: formData.meetingStartTime,
                        meeting_end_time: formData.meetingEndTime,
                        meeting_type: formData.meetingType,
                        meeting_venue: formData.meetingType === 'virtual' ? 'Virtual Meeting' : formData.meetingVenueArea,
                        meeting_agenda: formData.meetingAgenda === 'Other' ? formData.otherMeetingAgenda : formData.meetingAgenda,
                        booking_date: formData.bookingDate,
                        booking_day: formData.bookingDay
                    }]);
                
                if (error) throw error;
                
                // Call the Calendar API to add event
                if (isClient) {
                    try {
                        await addEvent(submissionData);
                    } catch (calendarError) {
                        console.error("Error adding to calendar:", calendarError);
                        // We still continue as the DB insert was successful
                    }
                }
                
                // Success!
                toast({
                    title: "Meeting Scheduled",
                    description: "Your meeting has been successfully scheduled."
                });
                
                setFormStatus('success');
                
                // Optionally reset form after success
                setTimeout(() => {
                    setFormData(initialFormData);
                    setActiveStep(0);
                    setFormStatus('idle');
                }, 5000);
                
            } catch (error) {
                console.error("Error submitting form:", error);
                toast({
                    variant: "destructive",
                    title: "Submission Failed",
                    description: "There was an error scheduling your meeting. Please try again."
                });
                setFormStatus('error');
            }
        } else {
            // Not the last step, move to next step
            nextStep();
        }
    };

    const nextStep = () => {
        // Validate current step
        if (!validateStep(activeStep)) {
            toast({
                variant: "destructive",
                title: "Missing Information",
                description: "Please fill in all required fields before proceeding."
            });
            return;
        }
        
        // Move to next step if not at the end
        if (activeStep < steps.length - 1) {
            setActiveStep(prev => prev + 1);
        }
    };

    const prevStep = () => {
        // Move to previous step if not at the beginning
        if (activeStep > 0) {
            setActiveStep(prev => prev - 1);
        }
    };

    const generateTimeOptions = () => {
        const options = [];
        let startHour = 8; // 8 AM
        let endHour = 17; // 5 PM
        
        for (let hour = startHour; hour <= endHour; hour++) {
            for (let minute = 0; minute < 60; minute += 30) {
                const hourStr = hour.toString().padStart(2, '0');
                const minuteStr = minute.toString().padStart(2, '0');
                options.push({ value: `${hourStr}:${minuteStr}`, label: `${hourStr}:${minuteStr}` });
            }
        }
        
        return options;
    };

    const renderInputField = (id: string, label: string, options: { placeholder?: string, type?: string, icon?: React.ElementType, readOnly?: boolean, isInvalid?: boolean, children?: React.ReactNode, className?: string } = {}) => {
        const {
            placeholder = "",
            type = "text",
            icon: Icon,
            readOnly = false,
            isInvalid = false,
            children,
            className = ""
        } = options;
        
        return (
            <div className="space-y-2">
                <Label htmlFor={id} className="text-sm font-medium text-gray-700 flex items-center">
                    {Icon && <Icon className="h-4 w-4 mr-2 text-gray-500" />}
                    {label}
                </Label>
                <div className={`relative rounded-md ${isInvalid ? 'ring-2 ring-red-500' : ''}`}>
                    <Input 
                        type={type} 
                        id={id} 
                        name={id}
                        placeholder={placeholder}
                        value={formData[id] || ""}
                        onChange={handleChange}
                        readOnly={readOnly}
                        className={`w-full ${isInvalid ? 'border-red-500 focus:ring-red-500' : ''} ${className}`}
                    />
                    {children}
                </div>
                {isInvalid && (
                    <p className="text-xs text-red-500 mt-1">This field is required</p>
                )}
            </div>
        );
    };

    const renderSelectField = (id: string, label: string, options: { placeholder: string, items: { value: string, label: string }[], icon?: React.ElementType, isInvalid?: boolean, loading?: boolean, loadingPlaceholder?: string, onValueChange: (value: string) => void }) => {
        const {
            placeholder,
            items,
            icon: Icon,
            isInvalid = false,
            loading = false,
            loadingPlaceholder = "Loading options...",
            onValueChange
        } = options;
        
        return (
            <div className="space-y-2">
                <Label htmlFor={id} className="text-sm font-medium text-gray-700 flex items-center">
                    {Icon && <Icon className="h-4 w-4 mr-2 text-gray-500" />}
                    {label}
                </Label>
                <Select 
                    onValueChange={onValueChange} 
                    value={formData[id] || undefined}
                >
                    <SelectTrigger 
                        id={id} 
                        className={`w-full ${isInvalid ? 'border-red-500 focus:ring-red-500' : ''}`}
                    >
                        <SelectValue placeholder={loading ? loadingPlaceholder : placeholder} />
                    </SelectTrigger>
                    <SelectContent>
                        {items.map(item => (
                            <SelectItem key={item.value} value={item.value}>
                                {item.label}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
                {isInvalid && (
                    <p className="text-xs text-red-500 mt-1">This field is required</p>
                )}
            </div>
        );
    };

    const fetchClientDetails = async (clientCompanyName: string) => {
        if (!clientCompanyName || clientCompanyName === 'Other') return;
        
        try {
            const { data, error } = await supabase
                .from('clients')
                .select('*')
                .eq('company', clientCompanyName)
                .order('created_at', { ascending: false })
                .limit(1);
            
            if (error) throw error;
            
            if (data && data.length > 0) {
                const client = data[0];
                
                // Update form with client details
                setFormData(prev => ({
                    ...prev,
                    clientName: client.name || prev.clientName,
                    clientMobile: client.mobile || prev.clientMobile,
                    clientEmail: client.email || prev.clientEmail
                }));
                
                toast({
                    title: "Client Found",
                    description: "Client details have been filled from previous records."
                });
            }
        } catch (err) {
            console.error('Error fetching client details:', err);
        }
    };

    return (
        <div className="min-h-screen bg-gray-50 py-8">
            <div className="container mx-auto max-w-5xl">
                <Card className="border-0 shadow-lg">
                    <CardHeader className="bg-white border-b border-gray-100">
                        <div className="flex items-center justify-between">
                            <div>
                                <CardTitle className="text-2xl font-bold text-gray-800">Schedule a Meeting</CardTitle>
                                <CardDescription className="text-gray-500">
                                    Fill in the details to book your appointment
                                </CardDescription>
                            </div>
                            <TooltipProvider>
                                <Tooltip>
                                    <TooltipTrigger asChild>
                                        <Button 
                                            variant="outline" 
                                            className={`rounded-full p-2 ${isListening ? 'bg-red-100 text-red-600 hover:bg-red-200' : 'bg-blue-50 text-blue-600 hover:bg-blue-100'}`} 
                                            onClick={toggleListening}
                                        >
                                            {isListening ? <MicOff className="h-5 w-5" /> : <Mic className="h-5 w-5" />}
                                        </Button>
                                    </TooltipTrigger>
                                    <TooltipContent>
                                        <p>{isListening ? 'Stop Voice Recognition' : 'Start Voice Recognition'}</p>
                                    </TooltipContent>
                                </Tooltip>
                            </TooltipProvider>
                        </div>

                        <div className="mt-6">
                            <div className="relative pt-1">
                                <Progress value={progress} className="h-2" />
                            </div>
                            <div className="mt-4 grid grid-cols-4 gap-2">
                                {steps.map(step => (
                                    <div key={step.id} className={`flex items-center ${activeStep >= step.id ? 'text-blue-600' : 'text-gray-400'}`}>
                                        <div className={`flex items-center justify-center h-8 w-8 rounded-full mr-2 ${activeStep >= step.id ? 'bg-blue-100' : 'bg-gray-100'}`}>
                                            <step.icon className="h-4 w-4" />
                                        </div>
                                        <span className={`text-sm ${activeStep === step.id ? 'font-semibold' : ''}`}>{step.name}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </CardHeader>

                    <CardContent className="p-6">
                        <form onSubmit={handleSubmit}>
                            <div className="space-y-6">
                                {/* Step 1: Basic Information */}
                                {activeStep === 0 && (
                                    <div className="space-y-6">
                                        <h3 className="text-lg font-semibold text-gray-800">Meeting Basic Information</h3>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                            <div className="space-y-2">
                                                <Label htmlFor="meetingDate" className="text-sm font-medium text-gray-700 flex items-center">
                                                    <Calendar className="h-4 w-4 mr-2 text-gray-500" />
                                                    Meeting Date
                                                </Label>
                                                <Input 
                                                    type="date" 
                                                    id="meetingDate" 
                                                    name="meetingDate"
                                                    value={formData.meetingDate}
                                                    onChange={handleChange}
                                                    className={invalidFields.includes('meetingDate') ? 'border-red-500 ring-red-500' : ''}
                                                />
                                                {invalidFields.includes('meetingDate') && (
                                                    <p className="text-xs text-red-500 mt-1">Meeting date is required</p>
                                                )}
                                            </div>
                                            {formData.meetingDay && (
                                                <div className="flex items-center">
                                                    <span className="text-sm text-gray-500">Meeting will be on {formData.meetingDay}</span>
                                                </div>
                                            )}
                                        </div>
                                        
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                            {renderSelectField('meetingType', 'Meeting Type', {
                                                placeholder: 'Select meeting type',
                                                items: [
                                                    { value: 'virtual', label: 'Virtual Meeting' },
                                                    { value: 'inPerson', label: 'In-Person Meeting' }
                                                ],
                                                isInvalid: invalidFields.includes('meetingType'),
                                                onValueChange: (value) => handleSelectChange('meetingType', value)
                                            })}
                                            
                                            {formData.meetingType === 'inPerson' && (
                                                <div>
                                                    {renderSelectField('meetingVenueArea', 'Meeting Venue', {
                                                        placeholder: 'Select meeting venue',
                                                        items: [
                                                            { value: 'BCL Office, Nairobi', label: 'BCL Office, Nairobi' },
                                                            { value: 'Client Office', label: 'Client Office' },
                                                            { value: 'Other', label: 'Other (Specify)' }
                                                        ],
                                                        icon: MapPin,
                                                        isInvalid: invalidFields.includes('meetingVenueArea'),
                                                        onValueChange: (value) => handleSelectChange('meetingVenueArea', value)
                                                    })}
                                                    
                                                    {showOtherMeetingVenueInput && (
                                                        <div className="mt-4">
                                                            {renderInputField('otherMeetingVenue', 'Specify Venue', {
                                                                placeholder: 'Enter venue details',
                                                                icon: MapPin,
                                                                isInvalid: invalidFields.includes('meetingVenueArea') && formData.meetingVenueArea === 'Other'
                                                            })}
                                                        </div>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                )}

                                {/* Additional steps would be rendered here... */}
                            </div>
                        </form>
                    </CardContent>

                    <CardFooter className="bg-gray-50 border-t border-gray-200 p-4 flex justify-between items-center">
                        <Button
                            type="button"
                            variant="outline"
                            onClick={prevStep}
                            disabled={activeStep === 0 || formStatus === 'submitting'}
                            className="flex items-center"
                        >
                            <ChevronLeft className="h-4 w-4 mr-1" />
                            Previous
                        </Button>

                        {activeStep < steps.length - 1 ? (
                            <Button
                                type="button"
                                onClick={nextStep}
                                disabled={formStatus === 'submitting'}
                                className="flex items-center bg-blue-600 hover:bg-blue-700 text-white"
                            >
                                Next
                                <ChevronRight className="h-4 w-4 ml-1" />
                            </Button>
                        ) : (
                            <Button
                                type="button" 
                                onClick={handleSubmit} 
                                disabled={formStatus === 'submitting' || formStatus === 'success'}
                                className={`flex items-center ${formStatus === 'submitting' ? 'bg-gray-400 cursor-not-allowed' : 'bg-green-600 hover:bg-green-700 text-white'}`}
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

// Simple component for confirmation screen
const ConfirmationItem = ({ label, value }: { label: string, value: string | undefined | null }) => (
    <div className="text-sm border-b border-gray-100 pb-2">
        <p className="text-gray-500">{label}:</p>
        <p className="font-medium text-gray-800 break-words">{value ? String(value) : '-'}</p>
    </div>
);

export default BookingScheduler;
