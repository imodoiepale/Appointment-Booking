"use client"


import React, { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://qnfoxdfnevcjxqpkjcwm.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFuZm94ZGZuZXZjanhxcGtqY3dtIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTY5OTk2MTE1OCwiZXhwIjoyMDE1NTM3MTU4fQ.-U2eC5IP7Xr6Uc4EXCKjXUIbJq9srz7pDf7b1UbYiJo';
const supabase = createClient(supabaseUrl, supabaseKey);

const Dashboard = () => {
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedAppointment, setSelectedAppointment] = useState(null);

  useEffect(() => {
    // Fetch events from Supabase
    const fetchEvents = async () => {
      try {
        const { data, error } = await supabase
          .from('events')
          .select('*'); // Fetch all fields

        if (error) {
          throw error;
        }
        console.log('Fetched data:', data);
        setAppointments(data ?? []); // Handle potential null or undefined
      } catch (error) {
        console.error('Error fetching events:', error.message);
      } finally {
        setLoading(false);
      }
    };

    fetchEvents();
  }, []); // Empty dependency array ensures the effect runs only once on mount

  if (loading) {
    return <p>Loading...</p>;
  }

  const handleAppointmentClick = (appointment) => {
    setSelectedAppointment(appointment);
  };

  const handleCloseModal = () => {
    setSelectedAppointment(null);
  };

  const handleActionClick = (action) => {
    // Implement logic based on the selected action (reschedule, cancel, complete)
    console.log(`Selected action: ${action}`);
    handleCloseModal();
  };

  const today = new Date().toISOString().split('T')[0];

  const totalAppointmentsToday = appointments.filter(appointment => appointment.meeting_date === today).length;


  console.log('Appointments:', appointments);
  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">Dashboard</h1>

      {/* Display total appointments for today */}
      <div className="fixed right-0 top-20 m-6">
        <div className="animate-bounce bg-white shadow-lg rounded-lg p-6 w-24 h-24 flex items-center justify-center flex-col">
          <p className="text-4xl">{totalAppointmentsToday}</p>
          <h2 className="text-xs font-semibold mb-2 text-center">Meetings Today</h2>
        </div>
      </div>

      {/* Display appointments based on status */}
      <div className="grid grid-cols-3 gap-4 mt-4">
        {['upcoming', 'rescheduled', 'canceled'].map(status => (
          <div key={status} className="col-span-1">
            <h2 className="text-xl font-semibold mb-2">{status.charAt(0).toUpperCase() + status.slice(1)} Appointments</h2>
            {appointments.filter(appointment => appointment.status === status).map(appointment => (
              <div key={appointment.id} className="border p-2 mb-2 cursor-pointer" onClick={() => handleAppointmentClick(appointment)}>
                <p><strong>Client:</strong> {appointment.client_name}</p>
                <p><strong>Date:</strong> {appointment.meeting_date}</p>
                <p><strong>Time:</strong> {appointment.meeting_start_time} - {appointment.meeting_end_time}</p>
                <p><strong>Meeting Type:</strong> {appointment.meeting_type}</p>
                <p><strong>Agenda:</strong> {appointment.meeting_agenda}</p>
              </div>
            ))}
          </div>
        ))}
      </div>

      {/* Display modal for selected appointment */}
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
                      Choose an action for {selectedAppointment.client_name}'s Appointment
                    </h3>
                    <div className="mt-2">
                      {/* Action buttons */}
                      <button className="bg-blue-500 text-white rounded px-4 py-2" onClick={() => handleActionClick('Reschedule')}>
                        Reschedule
                      </button>
                      <button className="bg-red-500 text-white rounded px-4 py-2 ml-2" onClick={() => handleActionClick('Cancel')}>
                        Cancel
                      </button>
                      <button className="bg-green-500 text-white rounded px-4 py-2 ml-2" onClick={() => handleActionClick('Complete')}>
                        Complete
                      </button>
                    </div>
                  </div>
                </div>
              </div>
              {/* Close button */}
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
