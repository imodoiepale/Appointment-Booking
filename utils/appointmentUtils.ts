// Utility functions for appointment/meeting management

/**
 * Check the status of an appointment and return status information
 * @param appointment The appointment object to check
 * @returns Object with status and color information
 */
export function checkAppointmentStatus(appointment: any) {
  // Default status if not provided
  const status = appointment?.status || 'pending';
  
  // Return the status and a boolean indicating if it's active
  return {
    status,
    isActive: !['canceled', 'completed'].includes(status)
  };
}

/**
 * Get the appropriate Tailwind CSS class for a badge based on status
 * @param status The appointment status
 * @returns Tailwind CSS class string for the badge
 */
export function getBadgeStatusColor(status: string) {
  switch (status.toLowerCase()) {
    case 'confirmed':
      return 'bg-green-100 text-green-800 border-green-200';
    case 'pending':
      return 'bg-yellow-100 text-yellow-800 border-yellow-200';
    case 'canceled':
      return 'bg-red-100 text-red-800 border-red-200';
    case 'completed':
      return 'bg-blue-100 text-blue-800 border-blue-200';
    case 'rescheduled':
      return 'bg-purple-100 text-purple-800 border-purple-200';
    default:
      return 'bg-gray-100 text-gray-800 border-gray-200';
  }
}

/**
 * Get the appropriate icon for a status
 * @param status The appointment status
 * @returns Icon component name (for use with Lucide icons)
 */
export function getStatusIconName(status: string) {
  switch (status.toLowerCase()) {
    case 'confirmed':
      return 'CheckCircle';
    case 'pending':
      return 'Clock';
    case 'canceled':
      return 'XCircle';
    case 'completed':
      return 'CheckSquare';
    case 'rescheduled':
      return 'RefreshCw';
    default:
      return 'HelpCircle';
  }
}
