// @ts-nocheck
"use client"

import { useEffect, useState } from 'react';
import { Search, User, LogOut, Loader2, Sparkles, LayoutGrid } from 'lucide-react';
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
      } catch { setUser(null); }
    }
    fetchUser();
  }, []);

  const handleLogout = async () => {
    setIsSigningOut(true);
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
      window.location.href = '/login';
    } catch { setIsSigningOut(false); }
  };

  const initials = (user?.firstName?.[0] || user?.email?.[0] || 'U').toUpperCase();

  return (
    <header className="sticky top-0 z-30 flex h-16 w-full shrink-0 items-center border-b border-zinc-200 dark:border-white/10 bg-white/80 dark:bg-zinc-950/80 px-4 md:px-6 backdrop-blur-md transition-colors">
      <div className="flex w-full items-center justify-between gap-4">

        {/* Left: Search (Command Palette Style) */}
        <div className="flex flex-1 items-center gap-4 lg:pl-0 pl-10">
          <div className="relative w-full max-w-md group">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400 dark:text-zinc-500" />
            <input
              type="text"
              placeholder="Search anything..."
              className="h-9 w-full rounded-md border border-zinc-200 dark:border-white/10 bg-zinc-50 dark:bg-white/5 pl-9 pr-12 text-sm text-zinc-900 dark:text-zinc-100 transition-all focus:border-zinc-300 focus:bg-white focus:outline-none focus:ring-4 focus:ring-zinc-100 dark:focus:border-zinc-700 dark:focus:bg-zinc-900 dark:focus:ring-white/5 placeholder:text-zinc-400 dark:placeholder:text-zinc-500"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            {/* Fake Command/Ctrl K Hint */}
            <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1 pointer-events-none">
              <span className="flex h-5 items-center justify-center rounded border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 px-1.5 text-[10px] font-medium text-zinc-400">⌘K</span>
            </div>
          </div>
        </div>

        {/* Right: Actions & Minimal Profile */}
        <div className="flex items-center gap-2 sm:gap-3">
          <button className="flex h-9 w-9 items-center justify-center rounded-md text-zinc-500 hover:bg-zinc-100 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-white/10 dark:hover:text-white transition-colors">
            <LayoutGrid size={18} />
          </button>

          <div className="flex h-9 w-9 items-center justify-center">
            <NotificationBell />
          </div>

          <div className="h-5 w-px bg-zinc-200 dark:bg-white/10 mx-1" />

          {/* User Avatar Dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="relative flex h-8 w-8 items-center justify-center rounded-full bg-zinc-900 text-xs font-semibold text-white ring-2 ring-transparent transition-all hover:ring-zinc-200 dark:bg-white dark:text-zinc-900 dark:hover:ring-zinc-800">
                {initials}
                <div className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full border-2 border-white bg-green-500 dark:border-zinc-950" />
              </button>
            </DropdownMenuTrigger>

            <DropdownMenuContent align="end" className="w-64 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 p-1.5 shadow-xl">
              <DropdownMenuLabel className="px-2 py-2.5">
                <div className="flex flex-col gap-0.5">
                  <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100">{user?.displayName || 'Enterprise User'}</p>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400 truncate">{user?.email || 'admin@bcl-portal.com'}</p>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator className="bg-zinc-100 dark:bg-zinc-800 mb-1" />

              <DropdownMenuItem className="flex items-center gap-2 rounded-md px-2 py-2 text-sm text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-900 cursor-pointer">
                <User size={15} />
                Profile Settings
              </DropdownMenuItem>
                           <DropdownMenuSeparator className="bg-zinc-100 dark:bg-zinc-800 my-1" />

              <DropdownMenuItem
                onClick={handleLogout}
                className="flex items-center gap-2 rounded-md px-2 py-2 text-sm font-medium text-red-600 dark:text-red-500 focus:bg-red-50 dark:focus:bg-red-500/10 focus:text-red-600 cursor-pointer transition-colors"
              >
                {isSigningOut ? <Loader2 size={15} className="animate-spin" /> : <LogOut size={15} />}
                {isSigningOut ? 'Signing Out...' : 'Sign Out'}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Logout Overlay */}
      {isSigningOut && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-white/50 dark:bg-black/50 backdrop-blur-sm">
          <div className="flex flex-col items-center gap-4 rounded-2xl border border-zinc-200 bg-white p-8 shadow-xl dark:border-zinc-800 dark:bg-zinc-950">
            <Loader2 className="h-8 w-8 animate-spin text-zinc-900 dark:text-white" />
            <p className="text-sm font-medium text-zinc-600 dark:text-zinc-400">Securely signing out...</p>
          </div>
        </div>
      )}
    </header>
  );
}