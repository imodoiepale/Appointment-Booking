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
    const linkBaseClass = "group flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-all duration-200 w-full";
    const getLinkClass = (isActive: boolean) =>
        `${linkBaseClass} ${isActive
            ? 'bg-zinc-100 text-zinc-900 dark:bg-white/10 dark:text-white'
            : 'text-zinc-500 hover:bg-zinc-50 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-white/5 dark:hover:text-white'
        } ${isCollapsed ? 'justify-center px-0' : ''}`;

    const getIconClass = (isActive: boolean) =>
        `flex-shrink-0 transition-colors ${isActive ? 'text-zinc-900 dark:text-white' : 'text-zinc-400 group-hover:text-zinc-900 dark:group-hover:text-white'}`;

    return (
        <>
            {/* Mobile Floating Toggle */}
            <button
                onClick={toggleMobile}
                className="lg:hidden fixed top-4 left-4 z-50 flex h-10 w-10 items-center justify-center rounded-lg bg-white/80 dark:bg-zinc-900/80 backdrop-blur-md border border-zinc-200 dark:border-zinc-800 text-zinc-700 dark:text-zinc-300 shadow-sm transition-active active:scale-95"
            >
                {isMobileOpen ? <X size={20} /> : <Menu size={20} />}
            </button>

            {/* Sidebar Container */}
            <aside
                className={`fixed inset-y-0 left-0 z-40 flex flex-col border-r border-zinc-200 bg-white dark:border-white/10 dark:bg-zinc-950 transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] lg:sticky lg:top-0 h-screen
                ${isCollapsed ? 'w-[72px]' : 'w-64'} 
                ${isMobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}`}
            >
                {/* Desktop Collapse Toggle */}
                <button
                    onClick={() => setIsCollapsed(!isCollapsed)}
                    className="absolute -right-3.5 top-8 z-50 hidden h-7 w-7 items-center justify-center rounded-full border border-zinc-200 bg-white text-zinc-400 transition-all hover:text-zinc-900 hover:shadow-md dark:border-white/10 dark:bg-zinc-900 dark:hover:text-white lg:flex"
                >
                    {isCollapsed ? <PanelLeftOpen size={14} /> : <PanelLeftClose size={14} />}
                </button>

                {/* Top Section: User Profile & Brand */}
                <div className="flex flex-col gap-4 p-4">
                    <div className={`flex items-center gap-3 ${isCollapsed ? 'justify-center' : 'justify-between'} rounded-lg p-2 transition-colors hover:bg-zinc-50 dark:hover:bg-white/5 cursor-pointer`}>
                        <div className="flex items-center gap-3">
                            <div className="relative flex h-16 w-16 flex-shrink-0 items-center justify-center overflow-hidden rounded-md bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700">
                                <Image src="/logo.png" alt="Logo" width={40} height={40}/>
                            </div>
                            {!isCollapsed && (
                                <div className="flex flex-col">
                                    <span className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 leading-none">BCL Meetings</span>
                                    <span className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">Booksmart</span>
                                </div>
                            )}
                        </div>
                        {!isCollapsed && <MoreVertical size={16} className="text-zinc-400" />}
                    </div>

                    {/* Primary Action Button */}
                    <Link
                        href="/schedule"
                        onClick={() => setIsMobileOpen(false)}
                        className={`flex items-center justify-center gap-2 rounded-lg bg-zinc-900 dark:bg-white px-3 py-2 text-sm font-medium text-white dark:text-zinc-900 transition-all hover:bg-zinc-800 dark:hover:bg-zinc-200 active:scale-[0.98] ${isCollapsed ? 'px-0' : ''}`}
                        title="New Meeting"
                    >
                        <PlusCircle size={18} />
                        {!isCollapsed && <span>New Meeting</span>}
                    </Link>
                </div>

                {/* Scrollable Navigation */}
                <div className="flex-1 overflow-y-auto px-3 py-2 space-y-6 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">

                    {/* Main Nav */}
                    <div>
                        {!isCollapsed && <p className="mb-2 px-3 text-xs font-semibold text-zinc-400 dark:text-zinc-500">Menu</p>}
                        <nav className="space-y-1">
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
                        {!isCollapsed && <p className="mb-2 px-3 text-xs font-semibold text-zinc-400 dark:text-zinc-500">Views</p>}
                        <nav className="space-y-1">
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
                <div className="mt-auto border-t border-zinc-200 dark:border-white/10 p-3 space-y-4">
                    <nav className="space-y-1">
                        {utilityNav.map((item) => (
                            <Link key={item.name} href={item.href} onClick={() => setIsMobileOpen(false)} title={item.name} className={getLinkClass(isNavActive(item.href))}>
                                <item.icon size={18} className={getIconClass(isNavActive(item.href))} />
                                {!isCollapsed && <span>{item.name}</span>}
                            </Link>
                        ))}
                    </nav>

                    {/* Theme Toggle */}
                    {mounted && (
                        <div className={`flex items-center gap-1 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/50 p-1 ${isCollapsed ? 'flex-col' : ''}`}>
                            {[
                                { value: 'light', icon: Sun },
                                { value: 'system', icon: Monitor },
                                { value: 'dark', icon: Moon }
                            ].map(({ value, icon: Icon }) => (
                                <button
                                    key={value}
                                    onClick={() => setTheme(value)}
                                    title={`${value.charAt(0).toUpperCase() + value.slice(1)} Mode`}
                                    className={`flex w-full items-center justify-center rounded-md p-1.5 transition-all 
                                    ${theme === value
                                            ? 'bg-white text-zinc-900 shadow-sm dark:bg-zinc-800 dark:text-white'
                                            : 'text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-white'}`}
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
                    className="fixed inset-0 z-30 bg-black/20 backdrop-blur-sm lg:hidden transition-opacity"
                    onClick={() => setIsMobileOpen(false)}
                />
            )}
        </>
    );
};

export default Sidebar;