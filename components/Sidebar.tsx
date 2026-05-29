// @ts-nocheck
"use client"

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname, useSearchParams } from 'next/navigation';
import { useTheme } from 'next-themes';
import { useSidebar } from '@/contexts/SidebarContext';
import {
    Calendar,
    CheckCircle,
    PlusCircle,
    HelpCircle,
    CalendarDays,
    LayoutDashboard,
    Bell,
    Settings,
    Clock,
    XCircle,
    Sun,
    Moon,
    PanelLeftClose,
    PanelLeftOpen,
    AlertCircle,
    Search,
    ChevronDown,
    ChevronUp,
    PartyPopper,
} from 'lucide-react';

/* ─────────────────────────────────────────────────────────────
   Injected Styles - Deep Teal / Cyan UI Scheme
───────────────────────────────────────────────────────────── */
/* ─────────────────────────────────────────────────────────────
   Injected Styles - Deep Teal / Cyan UI Scheme (Themed)
───────────────────────────────────────────────────────────── */
const SidebarStyles = () => (
    <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');

        :root {
            /* Dark Mode (Default) */
            --sb-bg: #003038;
            --sb-active-bg: rgba(255, 255, 255, 0.08);
            --sb-accent: #00d1d1;
            --sb-text: #ffffff;
            --sb-muted: #a3c6cc;
            --sb-border: rgba(255, 255, 255, 0.05);
            --sb-search-bg: rgba(255, 255, 255, 0.1);
            --sb-search-border: rgba(255, 255, 255, 0.1);
            --sb-search-placeholder: rgba(255, 255, 255, 0.4);
            --sb-brand-text: #ffffff;
            --sb-nav-hover: rgba(255, 255, 255, 0.04);
            --sb-section-label: rgba(255, 255, 255, 0.3);
        }

        [data-theme='light'] {
            /* Light Mode */
            --sb-bg: #ffffff;
            --sb-active-bg: rgba(0, 209, 209, 0.1);
            --sb-accent: #00a3a3; /* Slightly deeper cyan for better contrast on white */
            --sb-text: #003038;
            --sb-muted: #64868c;
            --sb-border: #eef2f3;
            --sb-search-bg: #f0f4f5;
            --sb-search-border: #e2e8e9;
            --sb-search-placeholder: #8ca4a8;
            --sb-brand-text: #003038;
            --sb-nav-hover: #f7fafa;
            --sb-section-label: #8ca4a8;
        }

        .sb-shell {
            background-color: var(--sb-bg);
            font-family: 'Inter', sans-serif;
            color: var(--sb-text);
            border-right: 1px solid var(--sb-border);
            transition: background-color 0.3s ease, border-color 0.3s ease;
        }

        /* Branding */
        .sb-brand-name { font-weight: 700; font-size: 15px; color: var(--sb-brand-text); }
        .sb-brand-sub { font-size: 11px; color: var(--sb-muted); }

        /* Search Bar */
        .sb-search-box {
            background: var(--sb-search-bg);
            border: 1px solid var(--sb-search-border);
            border-radius: 8px;
            display: flex;
            align-items: center;
            padding: 8px 12px;
            margin: 0 16px 24px 16px;
        }
        .sb-search-input {
            background: transparent;
            border: none;
            outline: none;
            color: var(--sb-text);
            font-size: 13px;
            width: 100%;
            margin-left: 8px;
        }
        .sb-search-input::placeholder { color: var(--sb-search-placeholder); }

        /* Navigation Links */
        .sb-link {
            display: flex;
            align-items: center;
            gap: 12px;
            padding: 10px 16px;
            color: var(--sb-muted);
            font-size: 14px;
            text-decoration: none;
            transition: all 0.2s ease;
            position: relative;
        }
        .sb-link:hover { color: var(--sb-text); background: var(--sb-nav-hover); }
        
        .sb-link-active {
            color: var(--sb-text);
            background: var(--sb-active-bg);
            font-weight: 500;
        }
        .sb-link-active::before {
            content: '';
            position: absolute;
            left: 0;
            top: 20%;
            bottom: 20%;
            width: 3px;
            background: var(--sb-accent);
            border-radius: 0 4px 4px 0;
        }

        .sb-section-label {
            font-size: 11px;
            text-transform: uppercase;
            letter-spacing: 0.05em;
            color: var(--sb-section-label);
            padding: 20px 16px 8px 16px;
            font-weight: 600;
        }

        /* Create Meeting Button */
        .sb-create-btn {
            margin: 20px 16px;
            background: linear-gradient(135deg, #00d1d1 0%, #00a3a3 100%);
            color: #ffffff; /* Keep white for readability on gradient */
            border: none;
            border-radius: 10px;
            padding: 12px;
            font-weight: 700;
            font-size: 14px;
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 8px;
            cursor: pointer;
            transition: transform 0.2s, box-shadow 0.2s;
            box-shadow: 0 4px 15px rgba(0, 209, 209, 0.2);
        }
        [data-theme='light'] .sb-create-btn {
            color: #ffffff; /* Ensure white text on cyan button in light mode */
        }
        .sb-create-btn:hover { transform: translateY(-1px); box-shadow: 0 6px 20px rgba(0, 209, 209, 0.3); }

        /* Badge/Count */
        .sb-count {
            margin-left: auto;
            background: var(--sb-active-bg);
            font-size: 10px;
            padding: 2px 6px;
            border-radius: 4px;
            color: var(--sb-accent);
            font-weight: 600;
        }

        .sb-status-dot {
            width: 6px;
            height: 6px;
            border-radius: 50%;
            margin-left: auto;
        }

        .sb-utility-border {
            border-top: 1px solid var(--sb-border);
        }
    `}</style>
);

const Sidebar = () => {
    const pathname = usePathname();
    const searchParams = useSearchParams();
    const { theme, setTheme } = useTheme();
    const [mounted, setMounted] = useState(false);
    const { isMobileOpen, setIsMobileOpen } = useSidebar();
    const [isCollapsed, setIsCollapsed] = useState(false);

    useEffect(() => setMounted(true), []);

    const mainNav = [
        { name: 'Overview', href: '/dashboard', icon: LayoutDashboard },
        { name: 'Events', href: '/events', icon: PartyPopper },
        { name: 'Calendar', href: '/calendar', icon: CalendarDays },
        { name: 'Notifications', href: '/notifications', icon: Bell, count: 3 },
    ];

    const statusViews = [
        { name: 'Upcoming', href: '/dashboard?status=upcoming', status: 'upcoming', icon: Clock, color: '#6b8afd', count: 8 },
        { name: 'Today', href: '/dashboard?status=today', status: 'today', icon: Calendar, color: '#00d1d1', count: 2 },
        { name: 'Pending', href: '/dashboard?status=pending', status: 'pending', icon: AlertCircle, color: '#f5a623', count: 5 },
        { name: 'Completed', href: '/dashboard?status=completed', status: 'completed', icon: CheckCircle, color: '#48c78e' },
        { name: 'Canceled', href: '/dashboard?status=canceled', status: 'canceled', icon: XCircle, color: 'rgba(255,255,255,0.2)' },
    ];

    const isNavActive = (href: string) => {
        if (href === '/dashboard') return pathname === '/dashboard' && !searchParams.get('status');
        return pathname === href;
    };
    const isStatusActive = (status: string) => pathname === '/dashboard' && searchParams.get('status') === status;

    const toggleTheme = () => {
        setTheme(theme === 'dark' ? 'light' : 'dark');
    };

    return (
        <>
            <SidebarStyles />

            <aside
                className={`sb-shell fixed inset-y-0 left-0 z-40 flex flex-col h-screen transition-all duration-300
                    ${isCollapsed ? 'w-[70px]' : 'w-[240px]'}
                    ${isMobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
                    lg:sticky lg:top-0`}
            >
                {/* Branding Section */}
                <div className="flex items-center justify-between p-4 mb-2">
                    <div className="flex items-center gap-3 overflow-hidden">
                        <div className="flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center font-bold text-[#003038]">
                            <Image src="/logo.png" alt="Logo" width={40} height={40} />
                        </div>
                        {!isCollapsed && (
                            <div className="whitespace-nowrap">
                                <div className="sb-brand-name">BCL Meetings</div>
                                <div className="sb-brand-sub">Booksmart</div>
                            </div>
                        )}
                    </div>
                    <button
                        onClick={() => setIsCollapsed(!isCollapsed)}
                        className="hidden lg:block text-white/30 hover:text-white"
                    >
                        {isCollapsed ? <PanelLeftOpen size={18} /> : <PanelLeftClose size={18} />}
                    </button>
                </div>

                {/* Search Bar */}
                {!isCollapsed && (
                    <div className="sb-search-box">
                        <Search size={16} className="text-white/40" />
                        <input type="text" placeholder="Search keyword" className="sb-search-input" />
                    </div>
                )}

                {/* Main Navigation */}
                <div className="flex-1 overflow-y-auto scrollbar-hide">
                    {!isCollapsed && <div className="sb-section-label">Navigate</div>}
                    <nav className="space-y-1">
                        {mainNav.map((item) => (
                            <Link
                                key={item.name}
                                href={item.href}
                                className={`sb-link ${isNavActive(item.href) ? 'sb-link-active' : ''}`}
                            >
                                <item.icon size={20} />
                                {!isCollapsed && (
                                    <>
                                        <span className="flex-1">{item.name}</span>
                                        {item.count && <span className="sb-count">{item.count}</span>}
                                    </>
                                )}
                            </Link>
                        ))}
                    </nav>

                    {!isCollapsed && <div className="sb-section-label">Filter by status</div>}
                    <nav className="space-y-1">
                        {statusViews.map((item) => (
                            <Link
                                key={item.status}
                                href={item.href}
                                className={`sb-link ${isStatusActive(item.status) ? 'sb-link-active' : ''}`}
                            >
                                <item.icon size={20} />
                                {!isCollapsed && (
                                    <>
                                        <span className="flex-1">{item.name}</span>
                                        {item.count ? (
                                            <span className="sb-count">{item.count}</span>
                                        ) : (
                                            <span className="sb-status-dot" style={{ backgroundColor: item.color }} />
                                        )}
                                    </>
                                )}
                            </Link>
                        ))}
                    </nav>

                    {/* Create Meeting Button (Replacement for Upgrade Card) */}
                    <button className={`sb-create-btn ${isCollapsed ? 'mx-auto w-10 h-10 p-0' : 'w-[calc(100%-32px)]'}`}>
                        <PlusCircle size={isCollapsed ? 20 : 18} />
                        {!isCollapsed && <span>Create Meeting</span>}
                    </button>
                </div>

                {/* Bottom Utilities */}
                <div className="p-4 border-t border-white/5 space-y-1">
                    <Link href="/settings" className="sb-link">
                        <Settings size={20} />
                        {!isCollapsed && <span>Settings</span>}
                    </Link>
                    <Link href="/help" className="sb-link">
                        <HelpCircle size={20} />
                        {!isCollapsed && <span>Support</span>}
                    </Link>

                    {/* Single Mode Toggle */}
                    {mounted && (
                        <button onClick={toggleTheme} className="sb-link w-full text-left">
                            {theme === 'dark' ? <Sun size={20} /> : <Moon size={20} />}
                            {!isCollapsed && <span>{theme === 'dark' ? 'Light Mode' : 'Dark Mode'}</span>}
                        </button>
                    )}
                </div>
            </aside>

            {/* Mobile backdrop */}
            {isMobileOpen && (
                <div
                    className="fixed inset-0 bg-black/60 z-30 lg:hidden backdrop-blur-sm"
                    onClick={() => setIsMobileOpen(false)}
                />
            )}
        </>
    );
};

export default Sidebar;