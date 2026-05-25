// --- Helper Function for Formatting ---
export const formatTime = (timeString?: string | null) => {
  if (!timeString || typeof timeString !== 'string') return 'N/A';
  const parts = timeString.split(':');
  if (parts.length < 2) return timeString; // Return original if format is unexpected
  return `${parts[0]}:${parts[1]}`; // Format as HH:MM
};

