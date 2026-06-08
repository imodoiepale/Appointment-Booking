// --- Helper Function for Formatting ---
export const formatTime = (timeString?: string | null) => {
  if (!timeString || typeof timeString !== 'string') return 'N/A';
  const parts = timeString.split(':');
  if (parts.length < 2) return timeString; // Return original if format is unexpected
  return `${parts[0]}:${parts[1]}`; // Format as HH:MM
};

/** Parse a YYYY-MM-DD string as a local date (avoids UTC-to-local timezone shift) */
export const parseLocalDate = (dateStr?: string | null): Date | null => {
  if (!dateStr) return null;
  if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
    const [year, month, day] = dateStr.split('-').map(Number);
    return new Date(year, month - 1, day);
  }
  const date = new Date(dateStr);
  return Number.isNaN(date.getTime()) ? null : date;
};

/** Format a date string using en-GB locale, with custom Intl options */
export const formatDate = (dateStr?: string | null, options?: Intl.DateTimeFormatOptions, fallback = '—') => {
  const date = parseLocalDate(dateStr);
  return date ? date.toLocaleDateString('en-GB', options) : fallback;
};

