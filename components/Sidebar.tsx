// @ts-nocheck
"use client"

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { UserButton } from '@clerk/nextjs';
import {
    LayoutDashboard,
    Calendar,
    PlusCircle,
    Users,
    Settings,
    HelpCircle,
    Menu,
    X
} from 'lucide-react';

const Sidebar = () => {
    const pathname = usePathname();
    const [expanded, setExpanded] = useState(false);

    const toggleSidebar = () => {
        setExpanded(!expanded);
    };

    const navigation = [
        // { name: 'Dashboard', href: '/', icon: LayoutDashboard },
        { name: 'Appointments', href: '/', icon: Calendar},
        { name: 'Calendar View', href: '/calendar', icon: Calendar },
        { name: 'Schedule Meeting', href: '/schedule', icon: PlusCircle },
        // { name: 'Settings', href: '/settings', icon: Settings },
        // { name: 'Help', href: '/help', icon: HelpCircle },
    ];

    return (
        <>
            {/* Mobile sidebar toggle */}
            <button
                onClick={toggleSidebar}
                className="fixed z-50 bottom-4 right-4 lg:hidden bg-teal-500 text-white p-3 rounded-full shadow-lg"
            >
                {expanded ? <X size={24} /> : <Menu size={24} />}
            </button>

            <div
                className={`fixed inset-y-0 left-0 z-40 transition-all duration-300 transform bg-white shadow-lg lg:shadow-none lg:translate-x-0 lg:static lg:inset-auto lg:flex-shrink-0 w-64 ${expanded ? 'translate-x-0' : '-translate-x-full'
                    }`}
            >
                <div className="flex flex-col h-full">
                    {/* Brand/Logo */}
                    <div className="flex items-center p-4 border-b">
                        <div className="bg-teal-500 text-white p-2 rounded-md mr-2">
                            <Calendar size={20} />
                        </div>
                        <h1 className="text-lg font-bold text-gray-800">BCL Appointments</h1>
                    </div>

                    {/* Navigation */}
                    <nav className="flex-1 px-2 py-4 space-y-1">
                        {navigation.map((item) => {
                            const isActive = pathname === item.href;
                            return (
                                <Link
                                    key={item.name}
                                    href={item.href}
                                    className={`flex items-center px-4 py-3 text-sm rounded-md transition-colors ${isActive
                                            ? 'bg-teal-50 text-teal-600'
                                            : 'text-gray-600 hover:bg-gray-100'
                                        }`}
                                >
                                    <item.icon
                                        size={18}
                                        className={`mr-3 ${isActive ? 'text-teal-500' : 'text-gray-400'}`}
                                    />
                                    <span>{item.name}</span>
                                    {/* {item.badge && (
                                        <span className="ml-auto bg-red-500 text-white text-xs font-bold px-2 py-0.5 rounded-full">
                                            {item.badge}
                                        </span>
                                    )} */}
                                </Link>
                            );
                        })}
                    </nav>

                    {/* New Appointment Button */}
                    <div className="px-4 py-4 border-t">
                        <Link
                            href="/schedule"
                            className="flex items-center justify-center w-full px-4 py-2 text-sm font-medium text-white bg-teal-500 rounded-md hover:bg-teal-600 transition-colors"
                        >
                            <PlusCircle size={18} className="mr-2" />
                            New Appointment
                        </Link>
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
                    className="fixed inset-0 z-30 bg-black/50 lg:hidden"
                    onClick={toggleSidebar}
                ></div>
            )}
        </>
    );
};

export default Sidebar;