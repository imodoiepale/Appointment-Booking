"use client"


import React, { useEffect, useState } from 'react';
import { createClient } from '@supabase/supabase-js';
import { addEvent } from './send';
import { DateTimeFormatOptions } from 'intl';
import { ChangeEvent } from 'react';



const supabaseUrl = 'https://qnfoxdfnevcjxqpkjcwm.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFuZm94ZGZuZXZjanhxcGtqY3dtIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTY5OTk2MTE1OCwiZXhwIjoyMDE1NTM3MTU4fQ.-U2eC5IP7Xr6Uc4EXCKjXUIbJq9srz7pDf7b1UbYiJo';
const supabase = createClient(supabaseUrl, supabaseKey);

const Page = () => {

    const [showOtherMeetingVenueInput, setShowOtherMeetingVenueInput] = useState(false);

    const [formData, setFormData] = useState({
        bookingDate: '',
        bookingDay: '',
        meetingDate: '',
        meetingDay: '',
        meetingType: '',
        meetingVenueArea: 'BCL BR',
        clientName: '',
        clientCompany: '',
        clientMobile: '',
        clientEmail: '',
        companyType: '',
        bclAttendee: '',
        bclAttendeeMobile: '',
        meetingAgenda: '',
        meetingDuration: '',
        venueDistance: '10',
        meetingStartTime: '',
        meetingEndTime: '',
        meetingSlotStartTime: '',
        meetingSlotEndTime: '',
    });

    useEffect(() => {
        const currentDate = new Date();
        const options: DateTimeFormatOptions = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
        const formattedDate = currentDate.toLocaleDateString(undefined, options);


        setFormData((prevFormData) => ({
            ...prevFormData,
            bookingDate: currentDate.toISOString().split('T')[0],
            bookingDay: currentDate.toLocaleDateString('en-US', { weekday: 'long' }),
        }));
    }, []);

    const handleMeetingDateChange = (date: Date) => {
        setFormData({
            ...formData,
            meetingDate: date.toISOString().split('T')[0],
            meetingDay: date.toLocaleDateString('en-US', { weekday: 'long' }),
        });
    };

    const generateTimeOptions = () => {
        const options = [
            <option key="placeholder" value="" disabled>Select Start Time</option>
        ];

        for (let i = 7; i <= 21; i++) {
            const hour = i < 10 ? `0${i}` : `${i}`;
            options.push(
            <option key={`${hour}:00`} value={`${hour}:00`}>
                {`${hour}:00`}
            </option>,
            <option key={`${hour}:30`} value={`${hour}:30`}>
                {`${hour}:30`}
            </option>
            );
        }

        return options;
    };


    const handleMeetingStartTimeChange = (e: ChangeEvent<HTMLSelectElement>) => {
        const startTime = e.target.value;
        setFormData({
            ...formData,
            meetingStartTime: startTime,
            meetingSlotStartTime: calculateSlotTime(startTime, -formData.venueDistance),
        });
    };

    const handleMeetingEndTimeChange = (e: ChangeEvent<HTMLSelectElement>) => {
        const endTime = e.target.value;
        const slotEndTime = calculateSlotTime(endTime, formData.venueDistance);

        setFormData((prevFormData) => ({
            ...prevFormData,
            meetingEndTime: endTime,
            meetingSlotEndTime: slotEndTime,
        }));
    };


    const calculateSlotTime = (baseTime: string, minutesToAdd: number): string => {
        const [hours, minutes] = baseTime.split(':');
        const baseDate = new Date();
        baseDate.setHours(hours, minutes);
        const slotDate = new Date(baseDate.getTime() + minutesToAdd * 60000);
        return slotDate.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
    };

    const [companyOptions, setCompanyOptions] = useState([]);
    const [loadingCompanies, setLoadingCompanies] = useState(true);


    useEffect(() => {
        // Fetch the list of companies from Supabase
        fetchCompanies();
    }, []);

    const [invalidFields, setInvalidFields] = useState([]);
    const [errorMessage, setErrorMessage] = useState('');

    useEffect(() => {
        // Reset error state when the form data changes
        setInvalidFields([]);
        setErrorMessage('');
    }, [formData]);

    const fetchCompanies = async () => {
        try {
            // Fetch companies from your Supabase database
            const response = await supabase.from('clients').select('name');
            const companies = response.data.map((company) => company.name);

            // Add "Other" as the first option
            setCompanyOptions(['Select Company', ...companies]);
            setLoadingCompanies(false);
        } catch (error) {
            console.error('Error fetching companies:', error.message);
        }
    };

   const handleChange = (e: ChangeEvent<HTMLSelectElement>) => {
    const { name, value } = e.target;

    if (name === 'companyType') {
        // Reset client company when company type changes
        setFormData((prevFormData) => ({
            ...prevFormData,
            companyType: value,
            clientCompany: '',
            clientMobile: '',
            clientEmail: '',
        }));
    } else if (name === 'clientCompany' && value !== 'Other') {
        // Fetch client details from the database when an existing client is selected
        fetchClientDetails(value);
    }

    if (name === 'meetingVenueArea' && value === 'Other') {
        // If "Other" is selected for meeting venue, show the input for otherMeetingVenue
        setShowOtherMeetingVenueInput(true);
    } else {
        setShowOtherMeetingVenueInput(false);
    }


    if (name === 'meetingVenueArea') {
        // Update meetingVenueArea based on user input or default value
        setFormData((prevFormData) => ({
            ...prevFormData,
            [name]: value,
            otherClientCompany: name === 'clientCompany' && value !== 'Other' ? '' : prevFormData.otherClientCompany,
        }));
    } else {
        // For other fields, update normally
        setFormData((prevFormData) => ({
            ...prevFormData,
            [name]: value,
        }));
    }

    if (name === 'clientCompany' && value === 'Other') {
        // If "Other" is selected for client company, show the input for otherClientCompany
        setShowOtherClientCompanyInput(true);
    } else {
        setShowOtherClientCompanyInput(false);
    }
};



    const [formStatus, setFormStatus] = useState('idle');

    const fetchClientDetails = async (clientCompanyName:string) => {
        try {
            // Fetch client details from Supabase based on the selected client company
            const { data, error } = await supabase
                .from('clients')
                .select('phone_number, email')
                .eq('name', clientCompanyName)
                .single();

            if (error) {
                throw error;
            }

            // Update client mobile and email in the form data
            setFormData((prevFormData) => ({
                ...prevFormData,
                clientMobile: data.phone_number || '',
                clientEmail: data.email || '',
            }));
        } catch (error) {
            console.error('Error fetching client details:', error.message);
        }
    };


    const [agendaOptions, setAgendaOptions] = useState([
        'Select Agenda',
        'Client Meeting',
        'Project Discussion',
        'Team Collaboration',
        'Other',
    ]);

    const handleAgendaChange = (e: ChangeEvent<HTMLSelectElement>) => {
        const { value } = e.target;
        setFormData({
            ...formData,
            meetingAgenda: value,
        });
    };

    const handleDurationChange = (e: ChangeEvent<HTMLSelectElement>) => {
        const { value } = e.target;
        const duration = parseInt(value);

        // Calculate end time based on selected duration
        const meetingEndTime = calculateEndTime(formData.meetingStartTime, duration);

        setFormData((prevFormData) => ({
            ...prevFormData,
            meetingDuration: value,
            meetingEndTime,
        }));

        // Trigger the function to update meeting slot end time
        handleMeetingEndTimeChange({ target: { value: meetingEndTime } });
    };

    const calculateEndTime = (startTime: string, duration: string): string => {
        const [startHour, startMinute] = startTime.split(':');
        let totalMinutes = parseInt(startHour) * 60 + parseInt(startMinute) + duration;

        // Convert total minutes back to hours and minutes
        const endHour = Math.floor(totalMinutes / 60);
        const endMinute = totalMinutes % 60;

        // Format the end time
        const endTime = `${endHour.toString().padStart(2, '0')}:${endMinute.toString().padStart(2, '0')}`;

        return endTime;
  };
  
    const handleSubmit = async (e: ChangeEvent<HTMLSelectElement>) => {
    e.preventDefault();

    // Call addEvent and get the event ID
    const eventId = await addEvent(formData);

    // Check for empty fields
    const emptyFields = Object.entries(formData).filter(([key, value]) => {
        return value === '' && key !== 'otherClientCompany';
    });

    if (emptyFields.length > 0) {
        // Update state to mark invalid fields and show error message
        setInvalidFields(emptyFields.map(([key]) => key));
        setErrorMessage('Please fill in all required fields.');
        console.log('Empty fields:', emptyFields);
        return;
    }

    setFormStatus('submitting');

    try {
        // Insert form data into the "events" table
        const { data, error } = await supabase.from('events').insert([
            {
                booking_date: formData.bookingDate,
                booking_day: formData.bookingDay,
                meeting_date: formData.meetingDate,
                meeting_day: formData.meetingDay,
                meeting_type: formData.meetingType,
                meeting_venue_area: formData.meetingVenueArea,
                client_name: formData.clientName,
                client_company: formData.clientCompany,
                client_mobile: formData.clientMobile,
                bcl_attendee: formData.bclAttendee,
                bcl_attendee_mobile: formData.bclAttendeeMobile,
                meeting_agenda: formData.meetingAgenda,
                meeting_duration: formData.meetingDuration,
                venue_distance: formData.venueDistance,
                meeting_start_time: formData.meetingStartTime,
                meeting_end_time: formData.meetingEndTime,
                meeting_slot_start_time: formData.meetingSlotStartTime,
                meeting_slot_end_time: formData.meetingSlotEndTime,
                status: 'upcoming',
                google_event_id: eventId, // Use the event ID from Google Calendar
            },
        ]);

        if (error) {
            throw error;
        }

        // Reset error state after successful submission
        setInvalidFields([]);
        setErrorMessage('');
        // Update form status to 'success'
        setFormStatus('success');

        setTimeout(() => {
            setFormStatus('idle');
        }, 3000);

    } catch (error) {
        console.error('Error inserting form data:', error.message);
        setErrorMessage('Error submitting the form. Please try again.');
        // Update form status to 'error'
        setFormStatus('error');
    }
};



    return (
        <div className="max-w-3xl mx-auto bg-white p-8 rounded-md shadow-md">
            <h2 className="text-2xl font-semibold mb-6 text-center">Appointment Scheduling Form</h2>

            {formStatus === 'success' && (
                <div className="text-green-600 mt-4">
                    Appointment scheduled successfully!
                </div>
            )}
            {formStatus === 'error' && (
                <div className="text-red-600 mt-4">
                    {errorMessage}
                </div>
            )}

            <form onSubmit={handleSubmit} className="grid grid-cols-4 gap-4">
                {/* Column 1 */}
                <div className="mb-4 col-span-1">
                    <label htmlFor="bookingDate" className="block text-sm font-medium text-gray-600">Booking Date:</label>
                    <input
                        type="text"
                        id="bookingDate"
                        name="bookingDate"
                        value={formData.bookingDate}
                        readOnly
                        className="mt-1 p-2 border rounded-md w-full bg-gray-200"
                    />
                </div>

                <div className="mb-4 col-span-1">
                    <label htmlFor="bookingDay" className="block text-sm font-medium text-gray-600">Booking Day:</label>
                    <input
                        type="text"
                        id="bookingDay"
                        name="bookingDay"
                        value={formData.bookingDay}
                        readOnly
                        className="mt-1 p-2 border rounded-md w-full bg-gray-200"
                    />
                </div>

                <div className="mb-4 col-span-1">
                    <label htmlFor="meetingDate" className="block text-sm font-medium text-gray-600">Meeting Date:</label>
                    <input
                        type="date"
                        id="meetingDate"
                        name="meetingDate"
                        min={new Date().toISOString().split('T')[0]}
                        value={formData.meetingDate}
                        onChange={(e: ChangeEvent<HTMLSelectElement>) => handleMeetingDateChange(new Date(e.target.value))}
                        className="mt-1 p-2 border rounded-md w-full"
                    />
                </div>

                <div className="mb-4 col-span-1">
                    <label htmlFor="meetingDay" className="block text-sm font-medium text-gray-600">Meeting Day:</label>
                    <input
                        type="text"
                        id="meetingDay"
                        name="meetingDay"
                        value={formData.meetingDay}
                        readOnly
                        className="mt-1 p-2 border rounded-md bg-gray-200 w-full"
                    />
                </div>

                {/* Column 2 */}
                <div className="mb-4 col-span-1">
                    <label htmlFor="meetingType" className="block text-sm font-medium text-gray-600">Meeting Type:</label>
                    <select
                        id="meetingType"
                        name="meetingType"
                        value={formData.meetingType}
                        onChange={handleChange}
                        className="mt-1 p-2 border rounded-md w-full"
                    >
                        <option value="">Select Meeting Type</option>
                        <option value="virtual">Virtual</option>
                        <option value="inPerson">In Person</option>
                    </select>
                </div>
                <div className="mb-4 col-span-1">
                    <label htmlFor="meetingVenueArea" className="block text-sm font-medium text-gray-600">
                        Meeting Venue:
                    </label>

                    <div className="mb-4 col-span-1">
                        <input
                            type="text"
                            id="meetingVenueArea"
                            name="meetingVenueArea"
                            value={formData.meetingVenueArea}
                            onChange={handleChange}
                            className="mt-1 p-2 border rounded-md w-full"
                            placeholder="Enter Meeting Venue"
                        />
                    </div>
                </div>


                <div className="mb-4 col-span-1">
                    <label htmlFor="clientName" className="block text-sm font-medium text-gray-600">Client Name:</label>
                    <input
                        type="text"
                        id="clientName"
                        name="clientName"
                        value={formData.clientName}
                        onChange={handleChange}
                        className="mt-1 p-2 border rounded-md w-full"
                    />
                </div>

                <div className="mb-4 col-span-1">
                    <label htmlFor="companyType" className="block text-sm font-medium text-gray-600">Company Type:</label>
                    <select
                        id="companyType"
                        name="companyType"
                        value={formData.companyType}
                        onChange={handleChange}
                        className="mt-1 p-2 border rounded-md w-full"
                    >
                        <option value="">Select Company Type</option>
                        <option value="existing">Existing Company</option>
                        <option value="new">New Company</option>
                    </select>
                </div>

                {formData.companyType === 'existing' && (
                <div className="mb-4 col-span-1">
                    <label htmlFor="clientCompany" className="block text-sm font-medium text-gray-600 items-center">
                        Client Company:
                    </label>
                    {loadingCompanies ? (
                        <p>Loading companies...</p>
                    ) : (
                        <select
                            id="clientCompany"
                            name="clientCompany"
                            value={formData.clientCompany}
                            onChange={handleChange}
                            className="mt-1 p-2 border rounded-md w-full"
                        >
                            {companyOptions.map((option) => (
                                <option key={option} value={option}>
                                    {option}
                                </option>
                            ))}
                        </select>
                    )}
                </div>
            )}

            {formData.companyType === 'new' && (
                <div className="mb-4 col-span-1">
                    <label htmlFor="clientCompany" className="block text-sm font-medium text-gray-600">New Client Company:</label>
                    <input
                        type="text"
                        id="clientCompany"
                        name="clientCompany"
                        value={formData.clientCompany}
                        onChange={handleChange}
                        className="mt-1 p-2 border rounded-md w-full"
                    />
                </div>
            )}


                {/* Column 3 */}
                <div className="mb-4 col-span-1">
                    <label htmlFor="clientMobile" className="block text-sm font-medium text-gray-600">Client Mobile:</label>
                    <input
                        type="text"
                        id="clientMobile"
                        name="clientMobile"
                        value={formData.clientMobile}
                        onChange={handleChange}
                        className="mt-1 p-2 border rounded-md w-full"
                    />
                </div>

                <div className="mb-4 col-span-1">
                    <label htmlFor="clientEmail" className="block text-sm font-medium text-gray-600">Client Email:</label>
                    <input
                        type="email"
                        id="clientEmail"
                        name="clientEmail"
                        value={formData.clientEmail}
                        onChange={handleChange}
                        className="mt-1 p-2 border rounded-md w-full"
                    />
                </div>

                <div className="mb-4 col-span-1">
                    <label htmlFor="bclAttendee" className="block text-sm font-medium text-gray-600">BCL Attendee:</label>
                    <select
                        id="bclAttendee"
                        name="bclAttendee"
                        value={formData.bclAttendee}
                        onChange={handleChange}
                        className="mt-1 p-2 border rounded-md w-full"
                    >
                        <option value="">Select BCL Attendee</option>
                        <option value="James">James</option>
                        <option value="Fariya">Fariya</option>
                        <option value="Sandip">Sandip</option>
                        <option value="Edwin">Edwin</option>
                        <option value="Tushar">Tushar</option>
                    </select>
                </div>

                <div className="mb-4 col-span-1">
                    <label htmlFor="bclAttendeeMobile" className="block text-sm font-medium text-gray-600">BCL Attendee Mobile:</label>
                    <input
                        type="text"
                        id="bclAttendeeMobile"
                        name="bclAttendeeMobile"
                        value={formData.bclAttendeeMobile}
                        onChange={handleChange}
                        className="mt-1 p-2 border rounded-md w-full"
                    />
                </div>
                
                <div className="mb-4 col-span-1">
                    <label htmlFor="venueDistance" className="block text-sm font-medium text-gray-600">Venue Distance:</label>
                    <select
                        id="venueDistance"
                        name="venueDistance"
                        value={formData.venueDistance}
                        onChange={handleChange}
                        className="mt-1 p-2 border rounded-md w-full"
                    >
                        <option >Select distance time</option>
                        <option value="15">15 minutes</option>
                        <option value="30">30 minutes</option>
                        <option value="45">45 minutes</option>
                        <option value="60">1 hour</option>
                        <option value="90">1.5 hours</option>
                        <option value="120">2 hours</option>
                        <option value="150">2.5 hours</option>
                        <option key="180" value="180">3 hours</option>,
                        <option key="240" value="240">4 hours</option>,
                        <option key="300" value="300">5 hours</option>,
                        <option key="360" value="360">6 hours</option>,
                        <option key="420" value="420">7 hours</option>,
                        <option key="480" value="480">8 hours</option>,
                        <option key="540" value="540">9 hours</option>,
                        <option key="600" value="600">10 hours</option>,
                        <option key="660" value="660">11 hours</option>,
                        <option key="720" value="720">12 hours</option>,
                        <option key="780" value="780">13 hours</option>,
                        <option key="840" value="840">14 hours</option>,
                        <option key="900" value="900">15 hours</option>,
                        <option key="960" value="960">16 hours</option>,
                        <option key="1020" value="1020">17 hours</option>,
                        <option key="1080" value="1080">18 hours</option>,
                        <option key="1140" value="1140">19 hours</option>,
                        <option key="1200" value="1200">20 hours</option>,
                        <option key="1260" value="1260">21 hours</option>,
                        <option key="1320" value="1320">22 hours</option>,
                        <option key="1380" value="1380">23 hours</option>,
                        <option key="1440" value="1440">24 hours</option>,
                    </select>
                </div>

                {/* Column 4 */}
                <div className="mb-4 col-span-1">
                    <label htmlFor="meetingStartTime" className="block text-sm font-medium text-gray-600">Meeting Start Time:</label>
                    <select
                        id="meetingStartTime"
                        name="meetingStartTime"
                        value={formData.meetingStartTime}
                        onChange={handleMeetingStartTimeChange}
                        className="mt-1 p-2 border rounded-md w-full"
                    >
                        {generateTimeOptions()}
                    </select>
                </div>

                <div className="mb-4 col-span-1">
                    <label htmlFor="meetingDuration" className="block text-sm font-medium text-gray-600">Meeting Duration:</label>
                    <select
                        id="meetingDuration"
                        name="meetingDuration"
                        value={formData.meetingDuration}
                        onChange={handleDurationChange}
                        className="mt-1 p-2 border rounded-md w-full"
                    >
                        <option value="">Select Duration</option>
                        <option value="15">15 minutes</option>
                        <option value="30">30 minutes</option>
                        <option value="45">45 minutes</option>
                        <option value="60">1 hour</option>
                        <option value="90">1.5 hours</option>
                        <option value="120">2 hours</option>
                        <option value="150">2.5 hours</option>
                        <option key="180" value="180">3 hours</option>,
                        <option key="240" value="240">4 hours</option>,
                        <option key="300" value="300">5 hours</option>,
                        <option key="360" value="360">6 hours</option>,
                        <option key="420" value="420">7 hours</option>,
                        <option key="480" value="480">8 hours</option>,
                        <option key="540" value="540">9 hours</option>,
                        <option key="600" value="600">10 hours</option>,
                        <option key="660" value="660">11 hours</option>,
                        <option key="720" value="720">12 hours</option>,
                        <option key="780" value="780">13 hours</option>,
                        <option key="840" value="840">14 hours</option>,
                        <option key="900" value="900">15 hours</option>,
                        <option key="960" value="960">16 hours</option>,
                        <option key="1020" value="1020">17 hours</option>,
                        <option key="1080" value="1080">18 hours</option>,
                        <option key="1140" value="1140">19 hours</option>,
                        <option key="1200" value="1200">20 hours</option>,
                        <option key="1260" value="1260">21 hours</option>,
                        <option key="1320" value="1320">22 hours</option>,
                        <option key="1380" value="1380">23 hours</option>,
                        <option key="1440" value="1440">24 hours</option>,
                    </select>
                </div>

                <div className="mb-4 col-span-1">
                    <label htmlFor="meetingEndTime"  className="block text-sm font-medium text-gray-600" >Meeting End Time:</label>
                    <input
                        id="meetingEndTime"
                        name="meetingEndTime"
                        readOnly
                        value={formData.meetingEndTime}
                        onChange={handleMeetingEndTimeChange}
                        className="mt-1 p-2 border rounded-md w-full bg-gray-200"
                    >
                    </input>
                </div>

                <div className="mb-4 col-span-1">
                    <label htmlFor="meetingSlotStartTime" className="block text-sm font-medium text-gray-600">Slot Start Time:</label>
                    <input
                        type="text"
                        id="meetingSlotStartTime"
                        name="meetingSlotStartTime"
                        value={formData.meetingSlotStartTime}
                        readOnly
                        className="mt-1 p-2 border rounded-md w-full bg-gray-200"
                    />
                </div>

                <div className="mb-4 col-span-1">
                    <label htmlFor="meetingSlotEndTime" className="block text-sm font-medium text-gray-600">Slot End Time:</label>
                    <input type="text" id="meetingSlotEndTime" name="meetingSlotEndTime" value={formData.meetingSlotEndTime} readOnly className="mt-1 p-2 border rounded-md w-full bg-gray-200" />
                </div>

                <div className="mb-4 col-span-1">
                    <label htmlFor="meetingAgenda" className="block text-sm font-medium text-gray-600">Meeting Agenda:</label>
                    <select
                        id="meetingAgenda"
                        name="meetingAgenda"
                        value={formData.meetingAgenda}
                        onChange={handleAgendaChange}
                        className="mt-1 p-2 border rounded-md w-full"
                    >
                        {agendaOptions.map((option) => (
                            <option key={option} value={option}>
                                {option}
                            </option>
                        ))}
                    </select>
                </div>


                {/* Submit Button */}
                <button type="submit" onClick={handleSubmit} className="bg-blue-500 text-white items-center p-2 rounded-md hover:bg-blue-600">
                    Submit
                </button>
            </form>

            {/* Display error message */}
            {errorMessage && (
                <div className="text-red-600 mt-4">
                    {errorMessage}
                </div>
            )}
        </div>
    );
};

export default Page;
