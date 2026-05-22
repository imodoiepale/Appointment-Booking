// @ts-nocheck
"use client"

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
// import { UserButton } from '@clerk/nextjs';
import {
    Calendar,
    PlusCircle,
    HelpCircle,
    Menu,
    X,
    CalendarDays,
} from 'lucide-react';

const Sidebar = () => {
    const pathname = usePathname();
    const [expanded, setExpanded] = useState(false);

    const toggleSidebar = () => {
        setExpanded(!expanded);
    };

    const navigation = [
        // { name: 'Dashboard', href: '/', icon: LayoutDashboard },
        { name: 'Appointments', href: '/', icon: Calendar },
        { name: 'Calendar View', href: '/calendar', icon: Calendar },
        { name: 'Schedule Meeting', href: '/schedule', icon: PlusCircle },
        // { name: 'Settings', href: '/settings', icon: Settings },
        { name: 'Help', href: '/help', icon: HelpCircle },
    ];

    return (
        <>
            {/* Mobile sidebar toggle */}
            <button
                onClick={toggleSidebar}
                className="fixed bottom-4 right-4 z-50 rounded-full bg-[#0DAA8A] p-3 text-white shadow-lg shadow-[#0DAA8A]/25 transition-colors hover:bg-[#0B9579] lg:hidden"
            >
                {expanded ? <X size={24} /> : <Menu size={24} />}
            </button>

            <div
                className={`fixed inset-y-0 left-0 z-40 w-72 transform border-r border-slate-200 bg-white/95 shadow-xl backdrop-blur transition-all duration-300 ease-in-out lg:static lg:inset-auto lg:w-68 lg:flex-shrink-0 lg:translate-x-0 lg:shadow-none ${expanded ? 'translate-x-0' : '-translate-x-full'
                    }`}
            >
                <div className="flex flex-col h-screen max-h-screen overflow-hidden">
                    {/* Brand/Logo */}
                    <div className="border-b border-slate-100 p-4">
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#0DAA8A] text-white shadow-lg shadow-[#0DAA8A]/20">
                            <Calendar size={20} />
                        </div>
                        <div className="min-w-0">
                          <h1 className="truncate text-base font-bold text-slate-950">BCL Appointments</h1>
                          <p className="text-xs text-slate-500">Meetings control center</p>
                        </div>
                      </div>
                    </div>

                    {/* Navigation */}
                    <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-4">
                        {navigation.map((item) => {
                            const isActive = pathname === item.href;
                            return (
                                <Link
                                    key={item.name}
                                    href={item.href}
                                    className={`group flex items-center rounded-xl px-3 py-2.5 text-sm font-medium transition-all ${isActive
                                        ? 'bg-[#0DAA8A]/10 text-[#087963] ring-1 ring-[#0DAA8A]/15'
                                        : 'text-slate-600 hover:bg-slate-100 hover:text-slate-950'
                                        }`}
                                >
                                    <item.icon
                                        size={18}
                                        className={`mr-3 ${isActive ? 'text-[#0DAA8A]' : 'text-slate-400 group-hover:text-slate-600'}`}
                                    />
                                    <span>{item.name}</span>
                                </Link>
                            );
                        })}
                    </nav>

                    {/* New Appointment Button */}
                    <div className="border-t border-slate-100 p-4">
                        <Link
                            href="/schedule"
                            className="flex w-full items-center justify-center rounded-xl bg-[#0DAA8A] px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-[#0DAA8A]/20 transition-colors hover:bg-[#0B9579]"
                        >
                            <PlusCircle size={18} className="mr-2" />
                            New Appointment
                        </Link>
                        <div className="mt-3 flex items-center gap-2 rounded-xl bg-slate-50 px-3 py-2 text-xs text-slate-500">
                          <CalendarDays className="h-4 w-4 text-[#0DAA8A]" />
                          Synced scheduling workspace
                        </div>
                    </div>

                    {/* User Profile */}
                    {/* <div className="flex items-center p-4 border-t">
                        <UserButton afterSignOutUrl="/" />
                        <div className="ml-3">
                            <p className="text-sm font-medium text-gray-800">Jim Lindsay</p>
                            <p className="text-xs text-gray-500">lindsay@gmail.com</p>
                        </div>
                    </div> */}
                </div>
            </div>

            {/* Overlay for mobile */}
            {expanded && (
                <div
                    className="fixed inset-0 z-30 bg-slate-950/50 backdrop-blur-sm lg:hidden"
                    onClick={toggleSidebar}
                ></div>
            )}
        </>
    );
};

export default Sidebar;
