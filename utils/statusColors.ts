export interface StatusColorSet {
  pill: string;
  dot: string;
  event: string;
  accent: string;
}

const STATUS_MAP: Record<string, StatusColorSet> = {
  upcoming: {
    pill: 'bg-slate-50 text-slate-700 border-slate-200 dark:bg-white/10 dark:text-slate-300 dark:border-white/10',
    dot: 'bg-slate-500 dark:bg-slate-400',
    event: 'bg-white text-slate-800 border-l-[3px] border-slate-400 dark:bg-white/5 dark:text-slate-300 dark:border-slate-500',
    accent: 'border-l-blue-500',
  },
  rescheduled: {
    pill: 'bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-500/10 dark:text-indigo-400 dark:border-indigo-500/20',
    dot: 'bg-indigo-500',
    event: 'bg-indigo-50 text-indigo-800 border-l-[3px] border-indigo-500 dark:bg-indigo-500/10 dark:text-indigo-300 dark:border-indigo-500/50',
    accent: 'border-l-indigo-500',
  },
  pending: {
    pill: 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-500/10 dark:text-amber-400 dark:border-amber-500/20',
    dot: 'bg-amber-400',
    event: 'bg-amber-50 text-amber-800 border-l-[3px] border-amber-400 dark:bg-amber-500/10 dark:text-amber-300 dark:border-amber-500/50',
    accent: 'border-l-amber-500',
  },
  canceled: {
    pill: 'bg-red-50 text-red-700 border-red-200 dark:bg-red-500/10 dark:text-red-400 dark:border-red-500/20',
    dot: 'bg-red-500',
    event: 'bg-red-50 text-red-800 border-l-[3px] border-red-500 dark:bg-red-500/10 dark:text-red-300 dark:border-red-500/50',
    accent: 'border-l-red-500',
  },
  cancelled: {
    pill: 'bg-red-50 text-red-700 border-red-200 dark:bg-red-500/10 dark:text-red-400 dark:border-red-500/20',
    dot: 'bg-red-500',
    event: 'bg-red-50 text-red-800 border-l-[3px] border-red-500 dark:bg-red-500/10 dark:text-red-300 dark:border-red-500/50',
    accent: 'border-l-red-500',
  },
  completed: {
    pill: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-500/20',
    dot: 'bg-emerald-500',
    event: 'bg-emerald-50 text-emerald-800 border-l-[3px] border-emerald-500 dark:bg-emerald-500/10 dark:text-emerald-300 dark:border-emerald-500/50',
    accent: 'border-l-emerald-500',
  },
  confirmed: {
    pill: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-500/20',
    dot: 'bg-emerald-500',
    event: 'bg-emerald-50 text-emerald-800 border-l-[3px] border-emerald-500 dark:bg-emerald-500/10 dark:text-emerald-300 dark:border-emerald-500/50',
    accent: 'border-l-emerald-500',
  },
  scheduled: {
    pill: 'bg-slate-50 text-slate-700 border-slate-200 dark:bg-white/10 dark:text-slate-300 dark:border-white/10',
    dot: 'bg-slate-500 dark:bg-slate-400',
    event: 'bg-white text-slate-800 border-l-[3px] border-slate-400 dark:bg-white/5 dark:text-slate-300 dark:border-slate-500',
    accent: 'border-l-slate-300 dark:border-l-slate-700',
  },
  virtual: {
    pill: 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-500/10 dark:text-blue-400 dark:border-blue-500/20',
    dot: 'bg-blue-500',
    event: 'bg-blue-50 text-blue-800 border-l-[3px] border-blue-400 dark:bg-blue-500/10 dark:text-blue-300 dark:border-blue-500/50',
    accent: 'border-l-blue-500',
  },
};

const BADGE_MAP: Record<string, string> = {
  Open: 'bg-slate-50 text-slate-700 border-slate-200 dark:bg-white/10 dark:text-slate-300 dark:border-white/10',
  Confirmed: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-500/20',
  Tentative: 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-500/10 dark:text-amber-400 dark:border-amber-500/20',
  Rejected: 'bg-red-50 text-red-700 border-red-200 dark:bg-red-500/10 dark:text-red-400 dark:border-red-500/20',
};

export function getStatusColors(status?: string): StatusColorSet {
  const key = (status || 'scheduled').toLowerCase();
  return STATUS_MAP[key] ?? STATUS_MAP.scheduled;
}

export function getBadgeStatusColor(badgeStatus?: string): string {
  return BADGE_MAP[badgeStatus ?? ''] ?? BADGE_MAP.Open;
}
