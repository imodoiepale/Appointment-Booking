// ── MEETING STATUS COLORS ────────────────────────────────────────────────

export interface StatusColorConfig {
  light: string;
  dark: string;
  gradient: string;
  bgLight: string;
  bgDark: string;
  textLight: string;
  textDark: string;
  borderLight: string;
  borderDark: string;
}

// Core Status Colors
const CORE_STATUS_COLORS: Record<string, StatusColorConfig> = {
  upcoming: {
    light: '#8B5CF6',
    dark: '#A78BFA',
    gradient: 'linear-gradient(135deg, #8B5CF6, #7C3AED)',
    bgLight: 'rgba(139, 92, 246, 0.1)',
    bgDark: 'rgba(167, 139, 250, 0.15)',
    textLight: '#6D28D9',
    textDark: '#A78BFA',
    borderLight: 'rgba(139, 92, 246, 0.2)',
    borderDark: 'rgba(167, 139, 250, 0.3)',
  },
  confirmed: {
    light: '#06B6D4',
    dark: '#22D3EE',
    gradient: 'linear-gradient(135deg, #06B6D4, #0891B2)',
    bgLight: 'rgba(6, 182, 212, 0.1)',
    bgDark: 'rgba(34, 211, 238, 0.15)',
    textLight: '#0E7490',
    textDark: '#22D3EE',
    borderLight: 'rgba(6, 182, 212, 0.2)',
    borderDark: 'rgba(34, 211, 238, 0.3)',
  },
  completed: {
    light: '#10B981',
    dark: '#34D399',
    gradient: 'linear-gradient(135deg, #10B981, #059669)',
    bgLight: 'rgba(16, 185, 129, 0.1)',
    bgDark: 'rgba(52, 211, 153, 0.15)',
    textLight: '#047857',
    textDark: '#34D399',
    borderLight: 'rgba(16, 185, 129, 0.2)',
    borderDark: 'rgba(52, 211, 153, 0.3)',
  },
  rescheduled: {
    light: '#F59E0B',
    dark: '#FBBF24',
    gradient: 'linear-gradient(135deg, #F59E0B, #D97706)',
    bgLight: 'rgba(245, 158, 11, 0.1)',
    bgDark: 'rgba(251, 191, 36, 0.15)',
    textLight: '#B45309',
    textDark: '#FBBF24',
    borderLight: 'rgba(245, 158, 11, 0.2)',
    borderDark: 'rgba(251, 191, 36, 0.3)',
  },
  cancelled: {
    light: '#EF4444',
    dark: '#F87171',
    gradient: 'linear-gradient(135deg, #EF4444, #DC2626)',
    bgLight: 'rgba(239, 68, 68, 0.1)',
    bgDark: 'rgba(248, 113, 113, 0.15)',
    textLight: '#B91C1C',
    textDark: '#F87171',
    borderLight: 'rgba(239, 68, 68, 0.2)',
    borderDark: 'rgba(248, 113, 113, 0.3)',
  },
};

// Neutral / Informational Status Colors
const NEUTRAL_STATUS_COLORS: Record<string, StatusColorConfig> = {
  draft: {
    light: '#94A3B8',
    dark: '#94A3B8',
    gradient: 'linear-gradient(135deg, #94A3B8, #64748B)',
    bgLight: 'rgba(148, 163, 184, 0.1)',
    bgDark: 'rgba(148, 163, 184, 0.15)',
    textLight: '#475569',
    textDark: '#94A3B8',
    borderLight: 'rgba(148, 163, 184, 0.2)',
    borderDark: 'rgba(148, 163, 184, 0.3)',
  },
  'pending-approval': {
    light: '#F59E0B',
    dark: '#FBBF24',
    gradient: 'linear-gradient(135deg, #F59E0B, #D97706)',
    bgLight: 'rgba(245, 158, 11, 0.1)',
    bgDark: 'rgba(251, 191, 36, 0.15)',
    textLight: '#B45309',
    textDark: '#FBBF24',
    borderLight: 'rgba(245, 158, 11, 0.2)',
    borderDark: 'rgba(251, 191, 36, 0.3)',
  },
  'waiting-response': {
    light: '#6366F1',
    dark: '#818CF8',
    gradient: 'linear-gradient(135deg, #6366F1, #4F46E5)',
    bgLight: 'rgba(99, 102, 241, 0.1)',
    bgDark: 'rgba(129, 140, 248, 0.15)',
    textLight: '#4338CA',
    textDark: '#818CF8',
    borderLight: 'rgba(99, 102, 241, 0.2)',
    borderDark: 'rgba(129, 140, 248, 0.3)',
  },
  'in-review': {
    light: '#8B5CF6',
    dark: '#A78BFA',
    gradient: 'linear-gradient(135deg, #8B5CF6, #7C3AED)',
    bgLight: 'rgba(139, 92, 246, 0.1)',
    bgDark: 'rgba(167, 139, 250, 0.15)',
    textLight: '#6D28D9',
    textDark: '#A78BFA',
    borderLight: 'rgba(139, 92, 246, 0.2)',
    borderDark: 'rgba(167, 139, 250, 0.3)',
  },
  archived: {
    light: '#64748B',
    dark: '#94A3B8',
    gradient: 'linear-gradient(135deg, #64748B, #475569)',
    bgLight: 'rgba(100, 116, 139, 0.1)',
    bgDark: 'rgba(148, 163, 184, 0.15)',
    textLight: '#334155',
    textDark: '#94A3B8',
    borderLight: 'rgba(100, 116, 139, 0.2)',
    borderDark: 'rgba(148, 163, 184, 0.3)',
  },
};

// Active Workflow State Colors
const WORKFLOW_STATUS_COLORS: Record<string, StatusColorConfig> = {
  'live-now': {
    light: '#14B8A6',
    dark: '#2DD4BF',
    gradient: 'linear-gradient(135deg, #14B8A6, #0D9488)',
    bgLight: 'rgba(20, 184, 166, 0.1)',
    bgDark: 'rgba(45, 212, 191, 0.15)',
    textLight: '#0F766E',
    textDark: '#2DD4BF',
    borderLight: 'rgba(20, 184, 166, 0.2)',
    borderDark: 'rgba(45, 212, 191, 0.3)',
  },
  'joining-soon': {
    light: '#0EA5E9',
    dark: '#38BDF8',
    gradient: 'linear-gradient(135deg, #0EA5E9, #0284C7)',
    bgLight: 'rgba(14, 165, 233, 0.1)',
    bgDark: 'rgba(56, 189, 248, 0.15)',
    textLight: '#0369A1',
    textDark: '#38BDF8',
    borderLight: 'rgba(14, 165, 233, 0.2)',
    borderDark: 'rgba(56, 189, 248, 0.3)',
  },
  'check-in-open': {
    light: '#06B6D4',
    dark: '#22D3EE',
    gradient: 'linear-gradient(135deg, #06B6D4, #0891B2)',
    bgLight: 'rgba(6, 182, 212, 0.1)',
    bgDark: 'rgba(34, 211, 238, 0.15)',
    textLight: '#0E7490',
    textDark: '#22D3EE',
    borderLight: 'rgba(6, 182, 212, 0.2)',
    borderDark: 'rgba(34, 211, 238, 0.3)',
  },
  recording: {
    light: '#F43F5E',
    dark: '#FB7185',
    gradient: 'linear-gradient(135deg, #F43F5E, #E11D48)',
    bgLight: 'rgba(244, 63, 94, 0.1)',
    bgDark: 'rgba(251, 113, 133, 0.15)',
    textLight: '#BE123C',
    textDark: '#FB7185',
    borderLight: 'rgba(244, 63, 94, 0.2)',
    borderDark: 'rgba(251, 113, 133, 0.3)',
  },
  'in-progress': {
    light: '#3B82F6',
    dark: '#60A5FA',
    gradient: 'linear-gradient(135deg, #3B82F6, #2563EB)',
    bgLight: 'rgba(59, 130, 246, 0.1)',
    bgDark: 'rgba(96, 165, 250, 0.15)',
    textLight: '#1D4ED8',
    textDark: '#60A5FA',
    borderLight: 'rgba(59, 130, 246, 0.2)',
    borderDark: 'rgba(96, 165, 250, 0.3)',
  },
};

// Legacy meeting type colors for backward compatibility
const MEETING_TYPE_COLORS: Record<string, StatusColorConfig> = {
  virtual: {
    light: '#8B5CF6',
    dark: '#A78BFA',
    gradient: 'linear-gradient(135deg, #8B5CF6, #7C3AED)',
    bgLight: 'rgba(139, 92, 246, 0.1)',
    bgDark: 'rgba(167, 139, 250, 0.15)',
    textLight: '#6D28D9',
    textDark: '#A78BFA',
    borderLight: 'rgba(139, 92, 246, 0.2)',
    borderDark: 'rgba(167, 139, 250, 0.3)',
  },
  physical: {
    light: '#0EA5E9',
    dark: '#38BDF8',
    gradient: 'linear-gradient(135deg, #0EA5E9, #0284C7)',
    bgLight: 'rgba(14, 165, 233, 0.1)',
    bgDark: 'rgba(56, 189, 248, 0.15)',
    textLight: '#0369A1',
    textDark: '#38BDF8',
    borderLight: 'rgba(14, 165, 233, 0.2)',
    borderDark: 'rgba(56, 189, 248, 0.3)',
  },
};

// Combine all status colors
const ALL_STATUS_COLORS = {
  ...CORE_STATUS_COLORS,
  ...NEUTRAL_STATUS_COLORS,
  ...WORKFLOW_STATUS_COLORS,
  ...MEETING_TYPE_COLORS,
};

// Default fallback color
const DEFAULT_STATUS: StatusColorConfig = {
  light: '#64748B',
  dark: '#94A3B8',
  gradient: 'linear-gradient(135deg, #64748B, #475569)',
  bgLight: 'rgba(100, 116, 139, 0.1)',
  bgDark: 'rgba(148, 163, 184, 0.15)',
  textLight: '#334155',
  textDark: '#94A3B8',
  borderLight: 'rgba(100, 116, 139, 0.2)',
  borderDark: 'rgba(148, 163, 184, 0.3)',
};

/**
 * Get status color configuration for a given status
 * @param status - The status string (e.g., 'upcoming', 'confirmed', 'cancelled')
 * @param isDarkMode - Whether dark mode is active (default: false)
 * @returns StatusColorConfig object with all color variants
 */
export function getMeetingStatusColors(status?: string, isDarkMode = false): StatusColorConfig {
  const normalizedStatus = status?.toLowerCase().replace(/[_\s]/g, '-') || '';
  const config = ALL_STATUS_COLORS[normalizedStatus] || DEFAULT_STATUS;
  
  return {
    light: config.light,
    dark: config.dark,
    gradient: config.gradient,
    bgLight: config.bgLight,
    bgDark: config.bgDark,
    textLight: config.textLight,
    textDark: config.textDark,
    borderLight: config.borderLight,
    borderDark: config.borderDark,
  };
}

/**
 * Get the gradient for a status (for event backgrounds, badges, etc.)
 * @param status - The status string
 * @returns CSS gradient string
 */
export function getStatusGradient(status?: string): string {
  const config = getMeetingStatusColors(status);
  return config.gradient;
}

/**
 * Get the background color for a status
 * @param status - The status string
 * @param isDarkMode - Whether dark mode is active
 * @returns CSS background color string
 */
export function getStatusBackground(status?: string, isDarkMode = false): string {
  const config = getMeetingStatusColors(status, isDarkMode);
  return isDarkMode ? config.bgDark : config.bgLight;
}

/**
 * Get the text color for a status
 * @param status - The status string
 * @param isDarkMode - Whether dark mode is active
 * @returns CSS text color string
 */
export function getStatusTextColor(status?: string, isDarkMode = false): string {
  const config = getMeetingStatusColors(status, isDarkMode);
  return isDarkMode ? config.textDark : config.textLight;
}

/**
 * Get the border color for a status
 * @param status - The status string
 * @param isDarkMode - Whether dark mode is active
 * @returns CSS border color string
 */
export function getStatusBorderColor(status?: string, isDarkMode = false): string {
  const config = getMeetingStatusColors(status, isDarkMode);
  return isDarkMode ? config.borderDark : config.borderLight;
}

/**
 * Get the solid color for a status (for icons, dots, etc.)
 * @param status - The status string
 * @param isDarkMode - Whether dark mode is active
 * @returns CSS color string
 */
export function getStatusColor(status?: string, isDarkMode = false): string {
  const config = getMeetingStatusColors(status, isDarkMode);
  return isDarkMode ? config.dark : config.light;
}

/**
 * Get Tailwind CSS classes for a status badge
 * @param status - The status string
 * @param isDarkMode - Whether dark mode is active
 * @returns Object with bg, text, and border classes
 */
export function getStatusBadgeClasses(status?: string, isDarkMode = false) {
  const config = getMeetingStatusColors(status, isDarkMode);
  return {
    bg: isDarkMode ? config.bgDark : config.bgLight,
    text: isDarkMode ? config.textDark : config.textLight,
    border: isDarkMode ? config.borderDark : config.borderLight,
  };
}

/**
 * Get all available status keys
 * @returns Array of all status keys
 */
export function getAllStatusKeys(): string[] {
  return Object.keys(ALL_STATUS_COLORS);
}

/**
 * Check if a status is a core status
 * @param status - The status string
 * @returns Boolean indicating if it's a core status
 */
export function isCoreStatus(status?: string): boolean {
  const normalizedStatus = status?.toLowerCase().replace(/[_\s]/g, '-') || '';
  return Object.keys(CORE_STATUS_COLORS).includes(normalizedStatus);
}

/**
 * Check if a status is a workflow status
 * @param status - The status string
 * @returns Boolean indicating if it's a workflow status
 */
export function isWorkflowStatus(status?: string): boolean {
  const normalizedStatus = status?.toLowerCase().replace(/[_\s]/g, '-') || '';
  return Object.keys(WORKFLOW_STATUS_COLORS).includes(normalizedStatus);
}

/**
 * Check if a status is a neutral status
 * @param status - The status string
 * @returns Boolean indicating if it's a neutral status
 */
export function isNeutralStatus(status?: string): boolean {
  const normalizedStatus = status?.toLowerCase().replace(/[_\s]/g, '-') || '';
  return Object.keys(NEUTRAL_STATUS_COLORS).includes(normalizedStatus);
}
