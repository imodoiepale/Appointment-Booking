export interface StatusColorSet {
  pill: string;
  dot: string;
  event: string;
  accent: string;
}

const STATUS_MAP: Record<string, StatusColorSet> = {
  draft: {
    pill: 'bg-gray-100 text-gray-800 border-gray-200 dark:bg-white/10 dark:text-gray-300 dark:border-white/10',
    dot: 'bg-gray-400 dark:bg-gray-500',
    event: 'bg-gray-100 text-gray-800 border-l-[3px] border-gray-400 dark:bg-white/5 dark:text-gray-300 dark:border-gray-500',
    accent: 'border-l-gray-400',
  },
  pending_confirmation: {
    pill: 'bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-500/10 dark:text-amber-400 dark:border-amber-500/20',
    dot: 'bg-amber-500',
    event: 'bg-amber-100 text-amber-800 border-l-[3px] border-amber-400 dark:bg-amber-500/10 dark:text-amber-300 dark:border-amber-500/50',
    accent: 'border-l-amber-500',
  },
  pending: {
    pill: 'bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-500/10 dark:text-amber-400 dark:border-amber-500/20',
    dot: 'bg-amber-500',
    event: 'bg-amber-100 text-amber-800 border-l-[3px] border-amber-400 dark:bg-amber-500/10 dark:text-amber-300 dark:border-amber-500/50',
    accent: 'border-l-amber-500',
  },
  confirmed: {
    pill: 'bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-500/10 dark:text-blue-400 dark:border-blue-500/20',
    dot: 'bg-blue-500',
    event: 'bg-blue-100 text-blue-800 border-l-[3px] border-blue-500 dark:bg-blue-500/10 dark:text-blue-300 dark:border-blue-500/50',
    accent: 'border-l-blue-500',
  },
  upcoming: {
    pill: 'bg-indigo-100 text-indigo-800 border-indigo-200 dark:bg-indigo-500/10 dark:text-indigo-400 dark:border-indigo-500/20',
    dot: 'bg-indigo-500',
    event: 'bg-indigo-100 text-indigo-800 border-l-[3px] border-indigo-400 dark:bg-indigo-500/10 dark:text-indigo-300 dark:border-indigo-500/50',
    accent: 'border-l-indigo-500',
  },
  in_progress: {
    pill: 'bg-cyan-100 text-cyan-800 border-cyan-200 dark:bg-cyan-500/10 dark:text-cyan-400 dark:border-cyan-500/20',
    dot: 'bg-cyan-500',
    event: 'bg-cyan-100 text-cyan-800 border-l-[3px] border-cyan-500 dark:bg-cyan-500/10 dark:text-cyan-300 dark:border-cyan-500/50',
    accent: 'border-l-cyan-500',
  },
  completed: {
    pill: 'bg-green-100 text-green-800 border-green-200 dark:bg-green-500/10 dark:text-green-400 dark:border-green-500/20',
    dot: 'bg-green-500',
    event: 'bg-green-100 text-green-800 border-l-[3px] border-green-500 dark:bg-green-500/10 dark:text-green-300 dark:border-green-500/50',
    accent: 'border-l-green-500',
  },
  rescheduled: {
    pill: 'bg-orange-100 text-orange-800 border-orange-200 dark:bg-orange-500/10 dark:text-orange-400 dark:border-orange-500/20',
    dot: 'bg-orange-500',
    event: 'bg-orange-100 text-orange-800 border-l-[3px] border-orange-500 dark:bg-orange-500/10 dark:text-orange-300 dark:border-orange-500/50',
    accent: 'border-l-orange-500',
  },
  canceled: {
    pill: 'bg-red-100 text-red-800 border-red-200 dark:bg-red-500/10 dark:text-red-400 dark:border-red-500/20',
    dot: 'bg-red-500',
    event: 'bg-red-100 text-red-800 border-l-[3px] border-red-500 dark:bg-red-500/10 dark:text-red-300 dark:border-red-500/50',
    accent: 'border-l-red-500',
  },
  cancelled: {
    pill: 'bg-red-100 text-red-800 border-red-200 dark:bg-red-500/10 dark:text-red-400 dark:border-red-500/20',
    dot: 'bg-red-500',
    event: 'bg-red-100 text-red-800 border-l-[3px] border-red-500 dark:bg-red-500/10 dark:text-red-300 dark:border-red-500/50',
    accent: 'border-l-red-500',
  },
  no_show: {
    pill: 'bg-rose-100 text-rose-800 border-rose-200 dark:bg-rose-500/10 dark:text-rose-400 dark:border-rose-500/20',
    dot: 'bg-rose-500',
    event: 'bg-rose-100 text-rose-800 border-l-[3px] border-rose-500 dark:bg-rose-500/10 dark:text-rose-300 dark:border-rose-500/50',
    accent: 'border-l-rose-500',
  },
  scheduled: {
    pill: 'bg-indigo-100 text-indigo-800 border-indigo-200 dark:bg-indigo-500/10 dark:text-indigo-400 dark:border-indigo-500/20',
    dot: 'bg-indigo-500',
    event: 'bg-indigo-100 text-indigo-800 border-l-[3px] border-indigo-400 dark:bg-indigo-500/10 dark:text-indigo-300 dark:border-indigo-500/50',
    accent: 'border-l-indigo-400',
  },
  virtual: {
    pill: 'bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-500/10 dark:text-blue-400 dark:border-blue-500/20',
    dot: 'bg-blue-500',
    event: 'bg-blue-100 text-blue-800 border-l-[3px] border-blue-400 dark:bg-blue-500/10 dark:text-blue-300 dark:border-blue-500/50',
    accent: 'border-l-blue-500',
  },
};

const BADGE_MAP: Record<string, string> = {
  Open:      'bg-indigo-100 text-indigo-800 border-indigo-200 dark:bg-indigo-500/10 dark:text-indigo-400 dark:border-indigo-500/20',
  Confirmed: 'bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-500/10 dark:text-blue-400 dark:border-blue-500/20',
  Tentative: 'bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-500/10 dark:text-amber-400 dark:border-amber-500/20',
  Rejected:  'bg-red-100 text-red-800 border-red-200 dark:bg-red-500/10 dark:text-red-400 dark:border-red-500/20',
};

export function getStatusColors(status?: string): StatusColorSet {
  const key = (status || 'upcoming').toLowerCase().trim().replace(/[\s-]+/g, '_');
  return STATUS_MAP[key] ?? STATUS_MAP.upcoming;
}

export function getBadgeStatusColor(badgeStatus?: string): string {
  return BADGE_MAP[badgeStatus ?? ''] ?? BADGE_MAP.Open;
}
