// @ts-nocheck
"use client"

import { useEffect, useState } from 'react';
import { Search, User, ChevronDown, LogOut, Loader2, Sparkles, Bell, LayoutGrid } from 'lucide-react';
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
  const displayName = user?.displayName || user?.firstName || 'User';

  return (
    <header className="sticky top-0 z-30 w-full border-b border-slate-200 dark:border-slate-800 bg-white/80 dark:bg-[#0F172A]/80 px-6 py-3.5 backdrop-blur-xl transition-colors">
      <div className="flex items-center justify-between">

        {/* Left: System Status & Search */}
        <div className="flex flex-1 items-center gap-6">
          <div className="hidden xl:flex items-center gap-2 rounded-full bg-blue-50 dark:bg-blue-900/20 px-4 py-1.5 ring-1 ring-blue-100 dark:ring-blue-900/50">
            <div className="h-2 w-2 rounded-full bg-blue-600 animate-pulse" />
            <span className="text-[11px] font-bold text-blue-600 dark:text-blue-400 uppercase tracking-widest">
              System Online
            </span>
          </div>

          <div className="relative w-full max-w-md">
            <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500" />
            <input
              type="text"
              placeholder="Search appointments, logs or users..."
              className="h-10 w-full rounded-xl border-none bg-slate-100 dark:bg-slate-800/50 pl-11 pr-4 text-sm font-medium text-slate-700 dark:text-slate-200 transition-all focus:bg-white dark:focus:bg-slate-800 focus:ring-2 focus:ring-blue-500/20 placeholder:text-slate-400 dark:placeholder:text-slate-500"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>

        {/* Right: Actions & Profile */}
        <div className="flex items-center gap-2 sm:gap-4">

          {/* Quick Actions */}
          <div className="flex items-center gap-1">
            <button className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-slate-800 rounded-lg transition-colors">
              <LayoutGrid size={20} />
            </button>
            <div className="relative">
              <NotificationBell />
            </div>
          </div>

          <div className="h-6 w-[1px] bg-slate-200 dark:bg-slate-800 mx-1" />

          {/* User Dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="group flex items-center gap-3 rounded-full p-1 pr-3 transition-all hover:bg-slate-100 dark:hover:bg-slate-800">
                <div className="relative flex h-9 w-9 items-center justify-center rounded-full bg-blue-600 text-sm font-bold text-white shadow-lg shadow-blue-500/20 ring-2 ring-white dark:ring-slate-900">
                  {initials}
                  <div className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-white dark:border-slate-900 bg-emerald-500" />
                </div>
                <div className="hidden text-left md:block">
                  <p className="text-sm font-bold text-slate-900 dark:text-white leading-none group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                    {displayName}
                  </p>
                  <p className="mt-1 text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest">
                    {user?.role?.replace('_', ' ') || 'Enterprise User'}
                  </p>
                </div>
                <ChevronDown size={14} className="text-slate-400 group-hover:text-slate-600 transition-colors" />
              </button>
            </DropdownMenuTrigger>

            <DropdownMenuContent align="end" className="w-72 rounded-2xl border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0F172A] p-2 shadow-2xl">
              <DropdownMenuLabel className="p-4">
                <div className="flex flex-col gap-1">
                  <p className="text-[10px] font-bold text-blue-500 uppercase tracking-widest">Signed in as</p>
                  <p className="text-sm font-bold text-slate-900 dark:text-white truncate">{user?.email}</p>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator className="bg-slate-100 dark:bg-slate-800" />

              <div className="p-1">
                <DropdownMenuItem className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer">
                  <User size={16} />
                  Profile Settings
                </DropdownMenuItem>
                <DropdownMenuItem className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer">
                  <Sparkles size={16} />
                  Upgrade Plan
                </DropdownMenuItem>
              </div>

              <DropdownMenuSeparator className="bg-slate-100 dark:bg-slate-800" />

              <div className="p-1">
                <DropdownMenuItem
                  onClick={handleLogout}
                  className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-bold text-red-600 focus:bg-red-50 dark:focus:bg-red-900/20 focus:text-red-700 cursor-pointer transition-colors"
                >
                  {isSigningOut ? <Loader2 size={16} className="animate-spin" /> : <LogOut size={16} />}
                  {isSigningOut ? 'Terminating Session...' : 'Sign Out'}
                </DropdownMenuItem>
              </div>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Logout Overlay */}
      {isSigningOut && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/20 dark:bg-black/40 backdrop-blur-md">
          <div className="flex flex-col items-center gap-4 rounded-3xl bg-white dark:bg-slate-900 p-10 shadow-2xl border border-slate-100 dark:border-slate-800">
            <div className="relative">
              <div className="h-12 w-12 rounded-full border-4 border-blue-100 dark:border-blue-900/30 border-t-blue-600 animate-spin" />
              <LogOut className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-blue-600" size={16} />
            </div>
            <div className="text-center">
              <span className="block text-lg font-bold text-slate-900 dark:text-white">Securely Signing Out</span>
              <p className="text-sm text-slate-500 dark:text-slate-400">Closing your enterprise session...</p>
            </div>
          </div>
        </div>
      )}
    </header>
  );
}