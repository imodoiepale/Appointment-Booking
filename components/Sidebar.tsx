// @ts-nocheck
"use client"

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';
import {
    Calendar,
    PlusCircle,
    HelpCircle,
    Menu,
    X,
    CalendarDays,
    User,
    Users,
    LayoutDashboard,
    ChevronDown,
    ChevronRight,
} from 'lucide-react';

const Sidebar = () => {
    const pathname = usePathname();
    const searchParams = useSearchParams();
    const currentScope = searchParams.get('scope') ?? 'all';

    const [expanded, setExpanded] = useState(false);
    const [meetingsExpanded, setMeetingsExpanded] = useState(true);

    const toggleSidebar = () => setExpanded(!expanded);

    const topNavigation = [
        { name: 'All Meetings', href: '/', icon: LayoutDashboard },
        { name: 'Calendar View', href: '/calendar', icon: CalendarDays },
        { name: 'Schedule Meeting', href: '/schedule', icon: PlusCircle },
        { name: 'Help', href: '/help', icon: HelpCircle },
    ];

    const scopeLinks = [
        {
            name: 'Assigned to Me',
            href: '/?scope=assigned',
            icon: User,
            scope: 'assigned',
            description: 'Meetings where I am an attendee',
        },
        {
            name: 'Created by Me',
            href: '/?scope=created',
            icon: Users,
            scope: 'created',
            description: 'Meetings I booked',
        },
    ];

    const isScopeActive = (scope: string) =>
        pathname === '/' && currentScope === scope;

    const isNavActive = (href: string) => {
        if (href === '/') return pathname === '/' && !searchParams.get('scope');
        return pathname === href;
    };

    return (
        <>
            {/* Mobile toggle */}
            <button
                onClick={toggleSidebar}
                className="fixed bottom-4 right-4 z-50 rounded-full bg-blue-600 p-3 text-white shadow-lg shadow-blue-600/25 transition-colors hover:bg-blue-700 lg:hidden"
            >
                {expanded ? <X size={24} /> : <Menu size={24} />}
            </button>

            <div
                className={`fixed inset-y-0 left-0 z-40 w-72 transform border-r border-slate-200 bg-white/95 shadow-xl backdrop-blur transition-all duration-300 ease-in-out lg:static lg:inset-auto lg:w-68 lg:flex-shrink-0 lg:translate-x-0 lg:shadow-none ${expanded ? 'translate-x-0' : '-translate-x-full'}`}
            >
                <div className="flex flex-col h-screen max-h-screen overflow-hidden">
                    {/* Brand */}
                    <div className="border-b border-slate-100 p-4">
                        <div className="flex items-center gap-3">
                            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-600 text-white shadow-lg shadow-blue-600/20">
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
                        {topNavigation.map((item) => {
                            const isActive = isNavActive(item.href);
                            return (
                                <Link
                                    key={item.name}
                                    href={item.href}
                                    onClick={() => setExpanded(false)}
                                    className={`group flex items-center rounded-xl px-3 py-2.5 text-sm font-medium transition-all ${isActive
                                        ? 'bg-blue-600/10 text-blue-600 ring-1 ring-blue-600/15'
                                        : 'text-slate-600 hover:bg-slate-100 hover:text-slate-950'
                                        }`}
                                >
                                    <item.icon size={18} className={`mr-3 ${isActive ? 'text-blue-600' : 'text-slate-400 group-hover:text-slate-600'}`} />
                                    <span>{item.name}</span>
                                </Link>
                            );
                        })}

                        {/* My Meetings section */}
                        <div className="pt-3">
                            <button
                                onClick={() => setMeetingsExpanded(!meetingsExpanded)}
                                className="flex w-full items-center justify-between rounded-xl px-3 py-2 text-xs font-semibold uppercase tracking-wide text-slate-400 hover:text-slate-600"
                            >
                                <span>My Meetings</span>
                                {meetingsExpanded
                                    ? <ChevronDown size={14} />
                                    : <ChevronRight size={14} />}
                            </button>

                            {meetingsExpanded && (
                                <div className="mt-1 space-y-0.5">
                                    {scopeLinks.map((item) => {
                                        const isActive = isScopeActive(item.scope);
                                        return (
                                            <Link
                                                key={item.scope}
                                                href={item.href}
                                                onClick={() => setExpanded(false)}
                                                title={item.description}
                                                className={`group flex items-center rounded-xl px-3 py-2.5 text-sm font-medium transition-all ${isActive
                                                    ? 'bg-blue-600/10 text-blue-600 ring-1 ring-blue-600/15'
                                                    : 'text-slate-600 hover:bg-slate-100 hover:text-slate-950'
                                                    }`}
                                            >
                                                <item.icon size={16} className={`mr-3 ${isActive ? 'text-blue-600' : 'text-slate-400 group-hover:text-slate-600'}`} />
                                                <span>{item.name}</span>
                                            </Link>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    </nav>

                    {/* CTA + status */}
                    <div className="border-t border-slate-100 p-4">
                        <Link
                            href="/schedule"
                            onClick={() => setExpanded(false)}
                            className="flex w-full items-center justify-center rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-blue-600/20 transition-colors hover:bg-blue-700"
                        >
                            <PlusCircle size={18} className="mr-2" />
                            New Appointment
                        </Link>
                        <div className="mt-3 flex items-center gap-2 rounded-xl bg-slate-50 px-3 py-2 text-xs text-slate-500">
                            <CalendarDays className="h-4 w-4 text-blue-600" />
                            Synced scheduling workspace
                        </div>
                    </div>
                </div>
            </div>

            {/* Mobile overlay */}
            {expanded && (
                <div
                    className="fixed inset-0 z-30 bg-slate-950/50 backdrop-blur-sm lg:hidden"
                    onClick={toggleSidebar}
                />
            )}
        </>
    );
};

export default Sidebar;
