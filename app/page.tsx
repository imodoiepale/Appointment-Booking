"use client"


import React, { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';
import { Tab, Tabs, TabList, TabPanel } from 'react-tabs';
import 'react-tabs/style/react-tabs.css';
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"

const supabaseUrl = 'https://qnfoxdfnevcjxqpkjcwm.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFuZm94ZGZuZXZjanhxcGtqY3dtIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTY5OTk2MTE1OCwiZXhwIjoyMDE1NTM3MTU4fQ.-U2eC5IP7Xr6Uc4EXCKjXUIbJq9srz7pDf7b1UbYiJo';
const supabase = createClient(supabaseUrl, supabaseKey);

const Dashboard = () => {
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedAppointment, setSelectedAppointment] = useState(null);
  const [activeTab, setActiveTab] = useState(0);

  const [isRescheduleClicked, setRescheduleClicked] = useState(false);
  
  const [setRescheduleMode, setSetRescheduleMode] = useState(false);


   const [rescheduleFormData, setRescheduleFormData] = useState({
    venueDistance: '',
    meetingStartTime: '',
    meetingDuration: '',
    meetingEndTime: '',
    meetingSlotStartTime: '',
    meetingSlotEndTime: '',
  });

  const handleRescheduleClick = () => {
  console.log("Reschedule clicked");
  setRescheduleClicked(true);
};


  const handleFinalReschedule = async () => {
    try {
      // Update the appointment details in the database
      const { data, error } = await supabase
        .from('events')
        .update({
          venue_distance: rescheduleFormData.venueDistance,
          meeting_start_time: rescheduleFormData.meetingStartTime,
          meeting_duration: rescheduleFormData.meetingDuration,
          meeting_end_time: rescheduleFormData.meetingEndTime,
          meeting_slot_start_time: rescheduleFormData.meetingSlotStartTime,
          meeting_slot_end_time: rescheduleFormData.meetingSlotEndTime,
          status: 'rescheduled',
        })
        .eq('id', selectedAppointment.id);

      if (error) {
        throw error;
      }

      console.log(`Successfully rescheduled appointment with ID ${selectedAppointment.id}`);

      // Update the local state to reflect the change
      setAppointments((prevAppointments) => {
        const updatedAppointments = prevAppointments.map((appointment) =>
          appointment.id === selectedAppointment.id ? { ...appointment, status: 'rescheduled' } : appointment
        );
        return updatedAppointments;
      });
    } catch (error) {
      console.error('Error rescheduling appointment:', error.message);
    } finally {
      handleCloseModal();
    }
  };

  const renderRescheduleFields = () => {

    if (!isRescheduleClicked) {
    return null; // Do not render anything if reschedule is not clicked
  }
  return (
    <div>
      <div className="mb-4">
        <label htmlFor="venueDistance" className="block text-sm font-medium text-gray-600">
          Venue Distance:
        </label>
        <input
          type="text"
          id="venueDistance"
          name="venueDistance"
          value={rescheduleFormData.venueDistance}
          onChange={handleRescheduleInputChange}
          className="mt-1 p-2 border rounded-md w-full"
        />
      </div>

      <div className="mb-4">
        <label htmlFor="meetingStartTime" className="block text-sm font-medium text-gray-600">
          Meeting Start Time:
        </label>
        <input
          type="text"
          id="meetingStartTime"
          name="meetingStartTime"
          value={rescheduleFormData.meetingStartTime}
          onChange={handleRescheduleInputChange}
          className="mt-1 p-2 border rounded-md w-full"
        />
      </div>

      <div className="mb-4">
        <label htmlFor="meetingDuration" className="block text-sm font-medium text-gray-600">
          Meeting Duration:
        </label>
        <input
          type="text"
          id="meetingDuration"
          name="meetingDuration"
          value={rescheduleFormData.meetingDuration}
          onChange={handleRescheduleInputChange}
          className="mt-1 p-2 border rounded-md w-full"
        />
      </div>

      <div className="mb-4">
        <label htmlFor="meetingEndTime" className="block text-sm font-medium text-gray-600">
          Meeting End Time:
        </label>
        <input
          type="text"
          id="meetingEndTime"
          name="meetingEndTime"
          value={rescheduleFormData.meetingEndTime}
          onChange={handleRescheduleInputChange}
          className="mt-1 p-2 border rounded-md w-full"
        />
      </div>

      <div className="mb-4">
        <label htmlFor="meetingSlotStartTime" className="block text-sm font-medium text-gray-600">
          Slot Start Time:
        </label>
        <input
          type="text"
          id="meetingSlotStartTime"
          name="meetingSlotStartTime"
          value={rescheduleFormData.meetingSlotStartTime}
          onChange={handleRescheduleInputChange}
          className="mt-1 p-2 border rounded-md w-full"
        />
      </div>

      <div className="mb-4">
        <label htmlFor="meetingSlotEndTime" className="block text-sm font-medium text-gray-600">
          Slot End Time:
        </label>
        <input
          type="text"
          id="meetingSlotEndTime"
          name="meetingSlotEndTime"
          value={rescheduleFormData.meetingSlotEndTime}
          onChange={handleRescheduleInputChange}
          className="mt-1 p-2 border rounded-md w-full"
        />
      </div>

      {/* Final Reschedule Button */}
      <button className="bg-green-500 text-white rounded px-4 py-2 mt-2" onClick={handleFinalReschedule}>
        Final Reschedule
      </button>
    </div>
  );
};

  const handleRescheduleInputChange = (e) => {
  const { name, value } = e.target;
  console.log(`Updating ${name} to ${value}`);
  setRescheduleFormData({
    ...rescheduleFormData,
    [name]: value,
  });
};



  useEffect(() => {
    const fetchEvents = async () => {
      try {
        const { data, error } = await supabase
          .from('events')
          .select('*');

        if (error) {
          throw error;
        }

        setAppointments(data ?? []);
      } catch (error) {
        console.error('Error fetching events:', error.message);
      } finally {
        setLoading(false);
      }
    };

    fetchEvents();
  }, []);

  if (loading) {
    return <p>Loading...</p>;
  }

  const handleAppointmentClick = (appointment) => {
    setSelectedAppointment(appointment);
  };

  const handleCloseModal = () => {
    setSelectedAppointment(null);
    setSetRescheduleMode(false);
  };

  const handleReschedule = async () => {
    setSetRescheduleMode(true);
    try {
      // Update the appointment status to 'canceled' in the database
      const { data, error } = await supabase
        .from('events')
        .update({ status: 'rescheduled' })
        .eq('id', selectedAppointment.id);

      if (error) {
        throw error;
      }

      console.log(`Successfully canceled appointment with ID ${selectedAppointment.id}`);

      // Update the local state to reflect the change
      setAppointments((prevAppointments) => {
        const updatedAppointments = prevAppointments.map((appointment) =>
          appointment.id === selectedAppointment.id ? { ...appointment, status: 'rescheduled' } : appointment
        );
        return updatedAppointments;
      });
    } catch (error) {
      console.error('Error canceling appointment:', error.message);
    } finally {
      handleCloseModal();
    }
  };

  const handleCancel = async () => {
    try {
      // Update the appointment status to 'canceled' in the database
      const { data, error } = await supabase
        .from('events')
        .update({ status: 'canceled' })
        .eq('id', selectedAppointment.id);

      if (error) {
        throw error;
      }

      console.log(`Successfully canceled appointment with ID ${selectedAppointment.id}`);

      // Update the local state to reflect the change
      setAppointments((prevAppointments) => {
        const updatedAppointments = prevAppointments.map((appointment) =>
          appointment.id === selectedAppointment.id ? { ...appointment, status: 'canceled' } : appointment
        );
        return updatedAppointments;
      });
    } catch (error) {
      console.error('Error canceling appointment:', error.message);
    } finally {
      handleCloseModal();
    }
  };

  const handleComplete = async () => {
    try {
      // Update the appointment status to 'completed' in the database
      const { data, error } = await supabase
        .from('events')
        .update({ status: 'completed' })
        .eq('id', selectedAppointment.id);

      if (error) {
        throw error;
      }

      console.log(`Successfully completed appointment with ID ${selectedAppointment.id}`);

      // Update the local state to reflect the change
      setAppointments((prevAppointments) => {
        const updatedAppointments = prevAppointments.map((appointment) =>
          appointment.id === selectedAppointment.id ? { ...appointment, status: 'completed' } : appointment
        );
        return updatedAppointments;
      });
    } catch (error) {
      console.error('Error completing appointment:', error.message);
    } finally {
      handleCloseModal();
    }
  };

  const today = new Date().toISOString().split('T')[0];

  const totalAppointmentsToday = appointments.filter((appointment) => appointment.meeting_date === today).length;

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: value,
    });
  };


  
  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">Dashboard</h1>

      <div className="fixed right-0 top-20 m-6">
        <div className="animate-bounce bg-white shadow-lg rounded-lg p-6 w-24 h-24 flex items-center justify-center flex-col">
          <p className="text-4xl">{totalAppointmentsToday}</p>
          <h2 className="text-xs font-semibold mb-2 text-center">Meetings Today</h2>
        </div>
      </div>

      <Tabs selectedIndex={activeTab} onSelect={tabIndex => setActiveTab(tabIndex)}>
        <TabList>
          <Tab>Upcoming</Tab>
          <Tab>Rescheduled</Tab>
          <Tab>Canceled</Tab>
          <Tab>Completed</Tab>
        </TabList>

        {[appointments.filter(appointment => appointment.status === 'upcoming' || appointment.status === 'rescheduled'),
          appointments.filter(appointment => appointment.status === 'rescheduled'),
          appointments.filter(appointment => appointment.status === 'canceled'),
          appointments.filter(appointment => appointment.status === 'completed')].map((filteredAppointments, index) => (
            <TabPanel key={index}>
              <Table>
                <TableCaption>{`List of ${filteredAppointments.length} appointments`}</TableCaption>
                <TableHeader>
                  <TableRow>
                    <TableCell>ID</TableCell>
                    <TableCell>Client Name</TableCell>
                    <TableCell>Date</TableCell>
                    <TableCell>Start Time</TableCell>
                    <TableCell>End Time</TableCell>
                    <TableCell>Type</TableCell>
                    <TableCell>Agenda</TableCell>
                    <TableCell>Status</TableCell>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredAppointments.map(appointment => (
                    <TableRow key={appointment.id} onClick={() => handleAppointmentClick(appointment)}>
                      <TableCell>{appointment.id}</TableCell>
                      <TableCell>{appointment.client_name}</TableCell>
                      <TableCell>{appointment.meeting_date}</TableCell>
                      <TableCell>{appointment.meeting_start_time}</TableCell>
                      <TableCell>{appointment.meeting_end_time}</TableCell>
                      <TableCell>{appointment.meeting_type}</TableCell>
                      <TableCell>{appointment.meeting_agenda}</TableCell>
                      <TableCell>{appointment.status}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TabPanel>
          ))}
      </Tabs>

      {selectedAppointment && (
        <div className="fixed z-10 inset-0 overflow-y-auto">
          <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            <div className="fixed inset-0 transition-opacity" aria-hidden="true">
              <div className="absolute inset-0 bg-gray-500 opacity-75"></div>
            </div>

            <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
              <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                <div className="sm:flex sm:items-start">
                  <div className="mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left">
                    <h3 className="text-lg leading-6 font-medium text-gray-900" id="modal-title">
                      Appointment Details for {selectedAppointment.client_name}
                    </h3>
                    <div className="mt-2">
                      <p className="text-sm text-gray-600">Client Name: {selectedAppointment.client_name}</p>
                      <p className="text-sm text-gray-600">Date:{selectedAppointment.meeting_day}, {selectedAppointment.meeting_date}</p>
                      <p className="text-sm text-gray-600"> Meeting Time : {selectedAppointment.meeting_start_time} - {selectedAppointment.meeting_end_time}</p>
                      <p className="text-sm text-gray-600">Meeting Type: {selectedAppointment.meeting_type}</p>
                      <p className="text-sm text-gray-600">Agenda: {selectedAppointment.meeting_agenda}</p>
                      <p className="text-sm text-gray-600">Status: {selectedAppointment.status}</p>
                      <p className="text-sm text-gray-600">Booking Date: {selectedAppointment.booking_date}</p>
                      <p className="text-sm text-gray-600">Booking Day: {selectedAppointment.booking_day}</p>
                      <p className="text-sm text-gray-600">Meeting Venue Area: {selectedAppointment.meeting_venue_area}</p>
                      <p className="text-sm text-gray-600">Client Company: {selectedAppointment.client_company}</p>
                      <p className="text-sm text-gray-600">Client Mobile: {selectedAppointment.client_mobile}</p>
                      <p className="text-sm text-gray-600">BCL Attendee: {selectedAppointment.bcl_attendee}</p>
                      <p className="text-sm text-gray-600">BCL Attendee Mobile: {selectedAppointment.bcl_attendee_mobile}</p>
                      <p className="text-sm text-gray-600">Meeting Duration: {selectedAppointment.meeting_duration} Minutes</p>
                      <p className="text-sm text-gray-600">Venue Distance: {selectedAppointment.venue_distance} Minutes</p>
                      <p className="text-sm text-gray-600">Meeting Slot Start Time: {selectedAppointment.meeting_slot_start_time}</p>
                      <p className="text-sm text-gray-600">Meeting Slot End Time: {selectedAppointment.meeting_slot_end_time}</p>
                      <p>  </p>
                      <p>  </p>
                    </div>

                    {isRescheduleClicked && renderRescheduleFields()}

                    <div className="mt-2">
                      <button className="bg-blue-500 text-white rounded px-4 py-2" onClick={handleRescheduleClick}>
                        Reschedule
                      </button>
                      <button className="bg-red-500 text-white rounded px-4 py-2 ml-2" onClick={handleCancel}>
                        Cancel
                      </button>
                      <button className="bg-green-500 text-white rounded px-4 py-2 ml-2" onClick={handleComplete}>
                        Complete
                      </button>
                    </div>
                  </div>
                </div>
              </div>
              <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
                <button
                  type="button"
                  className="mt-3 w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-blue-600 text-base font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm"
                  onClick={handleCloseModal}
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;