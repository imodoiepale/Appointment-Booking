// @ts-nocheck
"use client"

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname, useSearchParams } from 'next/navigation';
import {
    AlertCircle,
    CheckCircle,
    PlusCircle,
    HelpCircle,
    Menu,
    X,
    CalendarDays,
    User,
    Users,
    LayoutDashboard,
    ChevronDown,
    ChevronLeft,
    ChevronRight,
    Bell,
    Settings,
    Clock,
    XCircle,
    Sun,
    Moon,
    Monitor,
    ShieldCheck
} from 'lucide-react';

const Sidebar = () => {
    const pathname = usePathname();
    const searchParams = useSearchParams();
    const currentScope = searchParams.get('scope') ?? 'all';

    const [expanded, setExpanded] = useState(false);
    const [collapsed, setCollapsed] = useState(false);
    const [meetingsExpanded, setMeetingsExpanded] = useState(true);
    const [theme, setTheme] = useState('light'); // light, dark, system

    // Handle Theme Switching
    useEffect(() => {
        const root = window.document.documentElement;
        if (theme === 'dark') {
            root.classList.add('dark');
        } else if (theme === 'light') {
            root.classList.remove('dark');
        } else {
            // System preference
            if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
                root.classList.add('dark');
            } else {
                root.classList.remove('dark');
            }
        }
    }, [theme]);

    const toggleSidebar = () => setExpanded(!expanded);

    const topNavigation = [
        { name: 'Overview', href: '/dashboard', icon: LayoutDashboard },
        { name: 'Calendar', href: '/calendar', icon: CalendarDays },
        { name: 'Schedule', href: '/schedule', icon: PlusCircle },
        { name: 'Notifications', href: '/notifications', icon: Bell },
        { name: 'Settings', href: '/settings', icon: Settings },
        { name: 'Support', href: '/help', icon: HelpCircle },
    ];

    const statusLinks = [
        { name: 'Upcoming', href: '/dashboard?status=upcoming', status: 'upcoming', icon: Clock, color: 'text-blue-500' },
        { name: 'Today', href: '/dashboard?status=today', status: 'today', icon: CalendarDays, color: 'text-sky-500' },
        { name: 'Pending', href: '/dashboard?status=pending', status: 'pending', icon: AlertCircle, color: 'text-amber-500' },
        { name: 'Completed', href: '/dashboard?status=completed', status: 'completed', icon: CheckCircle, color: 'text-emerald-500' },
    ];

    const isNavActive = (href: string) => {
        if (href === '/dashboard') return pathname === '/dashboard' && !searchParams.get('scope') && !searchParams.get('status');
        return pathname === href;
    };

    const isStatusActive = (status: string) => pathname === '/dashboard' && searchParams.get('status') === status;

    const linkClass = (isActive: boolean) =>
        `group flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm font-semibold transition-all duration-200 ${collapsed ? 'justify-center' : ''} ${isActive
            ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/30 ring-1 ring-blue-400'
            : 'text-slate-500 dark:text-slate-400 hover:bg-white dark:hover:bg-slate-800 hover:text-blue-600 dark:hover:text-blue-400 hover:shadow-sm'
        }`;

    return (
        <>
            {/* Mobile Nav Button */}
            <button
                onClick={toggleSidebar}
                className="fixed bottom-6 right-6 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-blue-600 text-white shadow-2xl lg:hidden transition-transform active:scale-90"
            >
                {expanded ? <X size={24} /> : <Menu size={24} />}
            </button>

            <aside
                className={`fixed inset-y-0 left-0 z-40 transform border-r border-slate-200 dark:border-slate-800 bg-[#F8FAFC] dark:bg-[#0F172A] transition-all duration-300 ease-in-out lg:static lg:translate-x-0 ${collapsed ? 'w-20' : 'w-72'} ${expanded ? 'translate-x-0' : '-translate-x-full'}`}
            >
                <div className="flex flex-col h-full overflow-hidden">

                    {/* Header Branding */}
                    <div className={`relative flex items-center h-24 px-6 ${collapsed ? 'justify-center px-0' : ''}`}>
                        <div className="flex items-center gap-3">
                            <div className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white dark:bg-slate-800 shadow-sm border border-slate-100 dark:border-slate-700">
                                <Image src="/logo.png" alt="Logo" width={28} height={28} priority />
                            </div>
                            {!collapsed && (
                                <div className="flex flex-col">
                                    <span className="text-lg font-extrabold tracking-tight text-slate-900 dark:text-white leading-none">BCL Meetings</span>
                                    <span className="mt-1 flex items-center gap-1 text-[10px] font-bold text-blue-500 uppercase tracking-widest">
                                        <ShieldCheck size={12} /> Enterprise
                                    </span>
                                </div>
                            )}
                        </div>
                        {!collapsed && (
                            <button onClick={() => setCollapsed(true)} className="ml-auto hidden lg:flex h-8 w-8 items-center justify-center rounded-full text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors">
                                <ChevronLeft size={18} />
                            </button>
                        )}
                        {collapsed && (
                            <button onClick={() => setCollapsed(false)} className="absolute -right-3.5 top-9 hidden lg:flex h-7 w-7 items-center justify-center rounded-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-blue-600 shadow-sm z-50">
                                <ChevronRight size={14} />
                            </button>
                        )}
                    </div>

                    {/* Navigation Body */}
                    <div className="flex-1 overflow-y-auto px-4 space-y-8 py-4 custom-scrollbar">
                        <nav className="space-y-1">
                            {topNavigation.map((item) => {
                                const isActive = isNavActive(item.href);
                                return (
                                    <Link key={item.name} href={item.href} onClick={() => setExpanded(false)} className={linkClass(isActive)}>
                                        <item.icon size={20} strokeWidth={isActive ? 2.5 : 2} />
                                        {!collapsed && <span>{item.name}</span>}
                                    </Link>
                                );
                            })}
                        </nav>

                        {/* Status Filters */}
                        <div className="pt-2">
                            {!collapsed && <h3 className="px-4 mb-3 text-[11px] font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500">Filters</h3>}
                            <div className="space-y-1">
                                {statusLinks.map((item) => {
                                    const isActive = isStatusActive(item.status);
                                    return (
                                        <Link key={item.status} href={item.href} className={`flex items-center gap-3 rounded-xl px-4 py-2.5 text-sm font-semibold transition-all ${collapsed ? 'justify-center' : ''} ${isActive ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 ring-1 ring-blue-100 dark:ring-blue-900' : 'text-slate-500 hover:text-slate-900 dark:hover:text-slate-200'}`}>
                                            <item.icon size={18} className={isActive ? item.color : 'text-slate-400'} />
                                            {!collapsed && <span>{item.name}</span>}
                                        </Link>
                                    );
                                })}
                            </div>
                        </div>
                    </div>

                    {/* Sidebar Footer */}
                    <div className="p-4 bg-slate-100/50 dark:bg-slate-900/50 border-t border-slate-200 dark:border-slate-800">

                        {/* Theme Toggle */}
                        {!collapsed && (
                            <div className="mb-4 flex items-center justify-between rounded-xl bg-white dark:bg-slate-800 p-1 border border-slate-200 dark:border-slate-700">
                                <button
                                    onClick={() => setTheme('light')}
                                    className={`flex flex-1 items-center justify-center rounded-lg py-1.5 transition-all ${theme === 'light' ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
                                >
                                    <Sun size={16} />
                                </button>
                                <button
                                    onClick={() => setTheme('system')}
                                    className={`flex flex-1 items-center justify-center rounded-lg py-1.5 transition-all ${theme === 'system' ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
                                >
                                    <Monitor size={16} />
                                </button>
                                <button
                                    onClick={() => setTheme('dark')}
                                    className={`flex flex-1 items-center justify-center rounded-lg py-1.5 transition-all ${theme === 'dark' ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
                                >
                                    <Moon size={16} />
                                </button>
                            </div>
                        )}

                        <Link
                            href="/schedule"
                            className={`flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 py-3.5 text-sm font-bold text-white shadow-xl shadow-blue-500/20 hover:bg-blue-700 transition-all active:scale-95 ${collapsed ? 'px-0' : 'px-4'}`}
                        >
                            <PlusCircle size={20} />
                            {!collapsed && <span>New Meeting</span>}
                        </Link>
                    </div>
                </div>
            </aside>

            {/* Mobile Overlay */}
            {expanded && (
                <div
                    className="fixed inset-0 z-30 bg-slate-900/60 backdrop-blur-sm lg:hidden"
                    onClick={toggleSidebar}
                />
            )}
        </>
    );
};

export default Sidebar;