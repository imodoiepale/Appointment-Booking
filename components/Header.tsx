// @ts-nocheck
"use client"

import { useEffect, useState } from 'react';
import { Search, User, ChevronDown, LogOut, Loader2, Sparkles } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";
import { NotificationBell } from './NotificationSystem';

export default function Header() {
  const [searchQuery, setSearchQuery] = useState('');
  const [user, setUser] = useState(null);
  const [isSigningOut, setIsSigningOut] = useState(false);

  useEffect(() => {
    async function fetchUser() {
      try {
        const res = await fetch('/api/auth/session');
        const data = await res.json();
        if (data.authenticated && data.user) setUser(data.user);
      } catch {
        setUser(null);
      }
    }

    fetchUser();
  }, []);

  const handleLogout = async () => {
    try {
      setIsSigningOut(true);
      await fetch('/api/auth/logout', { method: 'POST' });
      window.location.href = '/login';
    } catch {
      setIsSigningOut(false);
    }
  };

  const displayName = user?.displayName || user?.email || user?.username || 'User';
  const displayEmail = user?.email || user?.username || '';
  const initials = (user?.firstName?.[0] || user?.displayName?.[0] || user?.email?.[0] || user?.username?.[0] || 'U').toUpperCase();

  return (
    <>
    {isSigningOut && (
      <div className="fixed inset-0 z-[120] flex items-center justify-center bg-slate-950/45 backdrop-blur-sm">
        <div className="flex min-w-[280px] items-center gap-3 rounded-lg border border-white/20 bg-white px-5 py-4 shadow-2xl">
          <Loader2 className="h-5 w-5 animate-spin text-teal-600" />
          <div>
            <p className="text-sm font-semibold text-slate-900">Signing you out</p>
            <p className="text-xs text-slate-500">Closing your session securely.</p>
          </div>
        </div>
      </div>
    )}

    <header className="sticky top-0 z-30 w-full border-b border-slate-200 bg-white/90 px-4 py-3 shadow-sm backdrop-blur-xl">
      <div className="flex items-center justify-between w-full max-w-full">
        <div className="flex min-w-0 flex-1 items-center gap-3">
          <div className="hidden items-center gap-2 rounded-full bg-[#0DAA8A]/10 px-3 py-1.5 text-xs font-semibold text-[#087963] ring-1 ring-[#0DAA8A]/15 sm:flex">
            <Sparkles className="h-3.5 w-3.5" />
            Meetings
          </div>
          <div className="relative w-full max-w-sm min-w-0">
            <Search size={18} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search meetings..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="h-9 w-full min-w-0 rounded-xl border border-slate-200 bg-slate-50 pl-10 pr-4 text-sm text-slate-700 outline-none transition focus:border-[#0DAA8A] focus:bg-white focus:ring-2 focus:ring-[#0DAA8A]/15"
            />
          </div>
        </div>

        <div className="flex items-center gap-3 flex-shrink-0">
          <NotificationBell />

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="flex items-center space-x-2 rounded-xl p-1.5 transition-colors hover:bg-slate-50">
                <div className="w-8 h-8 bg-[#0DAA8A]/10 text-[#087963] rounded-full flex items-center justify-center overflow-hidden flex-shrink-0 text-sm font-semibold">
                  {user ? initials : <User size={16} />}
                </div>
                <div className="hidden md:block text-left min-w-0">
                  <p className="max-w-40 truncate text-sm font-semibold text-slate-800">{displayName}</p>
                  <p className="max-w-40 truncate text-xs text-slate-500">{displayEmail || 'Authenticated'}</p>
                </div>
                <ChevronDown size={16} className="text-slate-500 flex-shrink-0" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-64 rounded-xl border-slate-200 p-2 shadow-xl">
              <DropdownMenuLabel className="px-2 py-2 font-normal">
                <div className="flex items-start gap-3 rounded-xl bg-slate-50 px-3 py-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#0DAA8A] text-sm font-semibold text-white">
                    {initials}
                  </div>
                  <div className="min-w-0 space-y-1">
                    <p className="truncate text-sm font-semibold leading-none text-slate-900">{displayName}</p>
                    <p className="truncate text-xs leading-none text-slate-500">{displayEmail}</p>
                    <p className="text-xs capitalize leading-none text-slate-500">{user?.role?.replace(/_/g, ' ') || 'User'}</p>
                  </div>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={handleLogout}
                disabled={isSigningOut}
                className="rounded-lg px-3 py-2.5 text-red-600 focus:bg-red-50 focus:text-red-700"
              >
                {isSigningOut ? <Loader2 className="h-4 w-4 animate-spin" /> : <LogOut className="h-4 w-4" />}
                {isSigningOut ? 'Signing out...' : 'Sign out'}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
    </>
  );
}
