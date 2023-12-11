"use client"


import React, { useState } from 'react';

export default function Dashboard() {
  const [appointments, setAppointments] = useState([
    { id: 1, clientName: 'James', meetingDate: '2023-12-11', meetingTime: '08:30', status: 'upcoming' },
    { id: 2, clientName: 'Tushar', meetingDate: '2023-12-11', meetingTime: '08:30', status: 'upcoming' },
    { id: 3, clientName: 'Fariya', meetingDate: '2023-12-11', meetingTime: '08:30', status: 'upcoming' },
    { id: 4, clientName: 'Sandy', meetingDate: '2023-12-15', meetingTime: '10:00', status: 'rescheduled' },
    { id: 5, clientName: 'Sandy', meetingDate: '2023-12-15', meetingTime: '10:00', status: 'rescheduled' },
    { id: 6, clientName: 'John', meetingDate: '2023-12-11', meetingTime: '11:30', status: 'canceled' },
    // Add more appointments as needed
  ]);

  // Get today's date
  const today = new Date().toISOString().split('T')[0];

  // Calculate total appointments for today
  const totalAppointmentsToday = appointments.filter(appointment => appointment.meetingDate === today).length;

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">Dashboard</h1>

      <div className="fixed right-0 top-20 m-6">
        <div className="animate-bounce bg-white shadow-lg rounded-lg p-6 w-24 h-24 flex items-center justify-center flex-col">
          <p className="text-4xl">{totalAppointmentsToday}</p>
          <h2 className="text-xs font-semibold mb-2 text-center">Meetings Today</h2>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4 mt-4">
        {['upcoming', 'rescheduled', 'canceled'].map(status => (
          <div key={status} className="col-span-1">
            <h2 className="text-xl font-semibold mb-2">{status.charAt(0).toUpperCase() + status.slice(1)} Appointments</h2>
            {appointments.filter(appointment => appointment.status === status).map(appointment => (
              <div key={appointment.id} className="border p-2 mb-2">
                <p><strong>Client:</strong> {appointment.clientName}</p>
                <p><strong>Date:</strong> {appointment.meetingDate}</p>
                <p><strong>Time:</strong> {appointment.meetingTime}</p>
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
