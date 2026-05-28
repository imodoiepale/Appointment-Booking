// @ts-nocheck
"use client"

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname, useSearchParams } from 'next/navigation';
import { useTheme } from 'next-themes';
import {
    Calendar,
    CheckCircle,
    PlusCircle,
    HelpCircle,
    Menu,
    X,
    CalendarDays,
    LayoutDashboard,
    Bell,
    Settings,
    Clock,
    XCircle,
    Sun,
    Moon,
    Monitor,
    PanelLeftClose,
    PanelLeftOpen,
    MoreVertical,
    AlertCircle
} from 'lucide-react';

const Sidebar = () => {
    const pathname = usePathname();
    const searchParams = useSearchParams();
    const { theme, setTheme } = useTheme();
    const [mounted, setMounted] = useState(false);

    // Sidebar states
    const [isMobileOpen, setIsMobileOpen] = useState(false);
    const [isCollapsed, setIsCollapsed] = useState(false);

    useEffect(() => setMounted(true), []);

    const toggleMobile = () => setIsMobileOpen(!isMobileOpen);

    // Navigation Groups
    const mainNav = [
        { name: 'Overview', href: '/dashboard', icon: LayoutDashboard },
        { name: 'Calendar', href: '/calendar', icon: CalendarDays },
        { name: 'Notifications', href: '/notifications', icon: Bell },
    ];

    const statusViews = [
        { name: 'Upcoming', href: '/dashboard?status=upcoming', status: 'upcoming', icon: Clock },
        { name: 'Today', href: '/dashboard?status=today', status: 'today', icon: Calendar },
        { name: 'Pending', href: '/dashboard?status=pending', status: 'pending', icon: AlertCircle },
        { name: 'Completed', href: '/dashboard?status=completed', status: 'completed', icon: CheckCircle },
        { name: 'Canceled', href: '/dashboard?status=canceled', status: 'canceled', icon: XCircle },
    ];

    const utilityNav = [
        { name: 'Settings', href: '/settings', icon: Settings },
        { name: 'Support', href: '/help', icon: HelpCircle },
    ];

    // Helper functions for active states
    const isNavActive = (href: string) => {
        if (href === '/dashboard') return pathname === '/dashboard' && !searchParams.get('status');
        return pathname === href;
    };
    const isStatusActive = (status: string) => pathname === '/dashboard' && searchParams.get('status') === status;

    // Component classes
    const linkBaseClass = "group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition-all duration-200 w-full";
    const getLinkClass = (isActive: boolean) =>
        `${linkBaseClass} ${isActive
            ? 'bg-blue-50 text-blue-700 shadow-sm dark:bg-blue-500/10 dark:text-blue-400 font-semibold'
            : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800/50 dark:hover:text-slate-100 font-medium'
        } ${isCollapsed ? 'justify-center px-0' : ''}`;

    const getIconClass = (isActive: boolean) =>
        `flex-shrink-0 transition-colors ${isActive
            ? 'text-blue-600 dark:text-blue-400'
            : 'text-slate-400 group-hover:text-slate-600 dark:group-hover:text-slate-300'
        }`;

    return (
        <>
            {/* Mobile Floating Toggle */}
            <button
                onClick={toggleMobile}
                className="lg:hidden fixed top-4 left-4 z-50 flex h-11 w-11 items-center justify-center rounded-xl bg-white/90 dark:bg-slate-900/90 backdrop-blur-md border border-slate-200/60 dark:border-slate-800 text-slate-700 dark:text-slate-300 shadow-lg shadow-slate-200/50 dark:shadow-slate-950/50 transition-active active:scale-95"
            >
                {isMobileOpen ? <X size={22} /> : <Menu size={22} />}
            </button>

            {/* Sidebar Container */}
            <aside
                className={`fixed inset-y-0 left-0 z-40 flex flex-col border-r border-slate-200/80 bg-white dark:border-slate-800/60 dark:bg-slate-950 shadow-[4px_0_24px_rgba(0,0,0,0.02)] dark:shadow-[4px_0_24px_rgba(0,0,0,0.2)] transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] lg:sticky lg:top-0 h-screen
                ${isCollapsed ? 'w-[76px]' : 'w-64'} 
                ${isMobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}`}
            >
                {/* Desktop Collapse Toggle */}
                <button
                    onClick={() => setIsCollapsed(!isCollapsed)}
                    className="absolute -right-3.5 top-8 z-50 hidden h-7 w-7 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-400 shadow-sm transition-all hover:text-slate-700 hover:shadow-md dark:border-slate-700 dark:bg-slate-900 dark:hover:text-slate-200 lg:flex"
                >
                    {isCollapsed ? <PanelLeftOpen size={14} /> : <PanelLeftClose size={14} />}
                </button>

                {/* Top Section: User Profile & Brand */}
                <div className="flex flex-col gap-6 p-4 pt-6">
                    <div className={`flex items-center gap-3 ${isCollapsed ? 'justify-center' : 'justify-between'} rounded-xl p-1.5 transition-colors hover:bg-slate-50 dark:hover:bg-slate-900/50 cursor-pointer`}>
                        <div className="flex items-center gap-3">
                            <div className="relative flex h-10 w-10 flex-shrink-0 items-center justify-center overflow-hidden rounded-lg bg-gradient-to-br from-blue-50 to-slate-100 dark:from-slate-800 dark:to-slate-900 border border-slate-200/60 dark:border-slate-700 shadow-sm">
                                <Image src="/logo.png" alt="Logo" width={28} height={28} />
                            </div>
                            {!isCollapsed && (
                                <div className="flex flex-col">
                                    <span className="text-sm font-bold tracking-tight text-slate-950 dark:text-slate-50 leading-none">BCL Meetings</span>
                                    <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400 mt-1">Booksmart</span>
                                </div>
                            )}
                        </div>
                        {!isCollapsed && <MoreVertical size={16} className="text-slate-400" />}
                    </div>

                    {/* Primary Action Button */}
                    <Link
                        href="/schedule"
                        onClick={() => setIsMobileOpen(false)}
                        className={`flex items-center justify-center gap-2 rounded-xl bg-blue-600 text-sm font-semibold text-white shadow-md shadow-blue-600/20 transition-all hover:bg-blue-700 hover:shadow-lg hover:shadow-blue-600/30 active:scale-[0.98] dark:bg-blue-600 dark:hover:bg-blue-500 ${isCollapsed ? 'h-11 w-11 p-0' : 'px-4 py-3'}`}
                        title="New Meeting"
                    >
                        <PlusCircle size={18} />
                        {!isCollapsed && <span>New Meeting</span>}
                    </Link>
                </div>

                {/* Scrollable Navigation */}
                <div className="flex-1 overflow-y-auto px-4 py-2 space-y-8 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">

                    {/* Main Nav */}
                    <div>
                        {!isCollapsed && <p className="mb-3 px-2 text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">Menu</p>}
                        <nav className="space-y-1.5">
                            {mainNav.map((item) => {
                                const isActive = isNavActive(item.href);
                                return (
                                    <Link key={item.name} href={item.href} onClick={() => setIsMobileOpen(false)} title={item.name} className={getLinkClass(isActive)}>
                                        <item.icon size={18} className={getIconClass(isActive)} />
                                        {!isCollapsed && <span>{item.name}</span>}
                                    </Link>
                                );
                            })}
                        </nav>
                    </div>

                    {/* Status Views */}
                    <div>
                        {!isCollapsed && <p className="mb-3 px-2 text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">Views</p>}
                        <nav className="space-y-1.5">
                            {statusViews.map((item) => {
                                const isActive = isStatusActive(item.status);
                                return (
                                    <Link key={item.status} href={item.href} onClick={() => setIsMobileOpen(false)} title={item.name} className={getLinkClass(isActive)}>
                                        <item.icon size={18} className={getIconClass(isActive)} />
                                        {!isCollapsed && <span>{item.name}</span>}
                                    </Link>
                                );
                            })}
                        </nav>
                    </div>
                </div>

                {/* Bottom Section */}
                <div className="mt-auto border-t border-slate-200/80 dark:border-slate-800/80 p-4 space-y-4">
                    <nav className="space-y-1.5">
                        {utilityNav.map((item) => (
                            <Link key={item.name} href={item.href} onClick={() => setIsMobileOpen(false)} title={item.name} className={getLinkClass(isNavActive(item.href))}>
                                <item.icon size={18} className={getIconClass(isNavActive(item.href))} />
                                {!isCollapsed && <span>{item.name}</span>}
                            </Link>
                        ))}
                    </nav>

                    {/* Theme Toggle */}
                    {mounted && (
                        <div className={`flex items-center gap-1 rounded-xl border border-slate-200/80 dark:border-slate-800/80 bg-slate-50/50 dark:bg-slate-900/30 p-1 shadow-inner ${isCollapsed ? 'flex-col' : ''}`}>
                            {[
                                { value: 'light', icon: Sun },
                                { value: 'system', icon: Monitor },
                                { value: 'dark', icon: Moon }
                            ].map(({ value, icon: Icon }) => (
                                <button
                                    key={value}
                                    onClick={() => setTheme(value)}
                                    title={`${value.charAt(0).toUpperCase() + value.slice(1)} Mode`}
                                    className={`flex w-full items-center justify-center rounded-lg p-2 transition-all 
                                    ${theme === value
                                            ? 'bg-white text-blue-600 shadow-sm dark:bg-slate-800 dark:text-blue-400 border border-slate-200/50 dark:border-slate-700/50'
                                            : 'text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100 border border-transparent'}`}
                                >
                                    <Icon size={16} />
                                </button>
                            ))}
                        </div>
                    )}
                </div>
            </aside>

            {/* Mobile Backdrop */}
            {isMobileOpen && (
                <div
                    className="fixed inset-0 z-30 bg-slate-900/20 backdrop-blur-sm lg:hidden transition-opacity"
                    onClick={() => setIsMobileOpen(false)}
                />
            )}
        </>
    );
};

export default Sidebar;