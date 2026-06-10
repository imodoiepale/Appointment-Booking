// @ts-nocheck
"use client"

import React, { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname, useSearchParams } from "next/navigation";
import { useTheme } from "next-themes";
import {
    AlertCircle,
    Bell,
    Calendar,
    CalendarDays,
    CheckCircle,
    Clipboard,
    Clock,
    HelpCircle,
    LayoutDashboard,
    Moon,
    PanelLeftClose,
    PanelLeftOpen,
    PartyPopper,
    PlusCircle,
    Search,
    Settings,
    Sun,
    Video,
    XCircle,
} from "lucide-react";

import { useSidebar } from "@/contexts/SidebarContext";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from "@/components/ui/tooltip";
import { useRouter } from 'next/navigation';

const Sidebar = () => {
    const pathname = usePathname();
      const router = useRouter();
    const searchParams = useSearchParams();
    const { theme, setTheme } = useTheme();
    const [mounted, setMounted] = useState(false);
    const { isMobileOpen, setIsMobileOpen } = useSidebar();
    const [isCollapsed, setIsCollapsed] = useState(false);
    const [searchQuery, setSearchQuery] = useState("");

    useEffect(() => setMounted(true), []);

    const mainNav = [
        { name: "Overview", href: "/home", icon: LayoutDashboard },
        { name: "Meetings", href: "/dashboard", icon: Video },
        { name: "Events", href: "/events", icon: PartyPopper },
        { name: "Birthdays", href: "/birthdays", icon: PartyPopper },
        { name: "Tasks Reports", href: "/tasks", icon: Clipboard },
        { name: "Calendar", href: "/calendar", icon: CalendarDays },
        { name: "Notifications", href: "/notifications", icon: Bell, count: 3 },
    ];

    const statusViews = [
        { name: "Upcoming", href: "/dashboard?status=upcoming", status: "upcoming", icon: Clock, colorVar: "--status-upcoming", count: 8 },
        { name: "Today", href: "/dashboard?status=today", status: "today", icon: Calendar, colorVar: "--status-today", count: 2 },
        { name: "Pending", href: "/dashboard?status=pending", status: "pending", icon: AlertCircle, colorVar: "--status-pending", count: 5 },
        { name: "Completed", href: "/dashboard?status=completed", status: "completed", icon: CheckCircle, colorVar: "--status-completed" },
        { name: "Canceled", href: "/dashboard?status=canceled", status: "canceled", icon: XCircle, colorVar: "--status-canceled" },
    ];

    const isNavActive = (href: string) =>
        href === "/dashboard"
            ? pathname === "/dashboard" && !searchParams.get("status")
            : pathname === href;

    const isStatusActive = (status: string) =>
        pathname === "/dashboard" && searchParams.get("status") === status;

    const toggleTheme = () => setTheme(theme === "dark" ? "light" : "dark");

    const normalizedSearch = searchQuery.trim().toLowerCase();
    const filteredMainNav = normalizedSearch
        ? mainNav.filter((item) => item.name.toLowerCase().includes(normalizedSearch))
        : mainNav;
    const filteredStatusViews = normalizedSearch
        ? statusViews.filter((item) => item.name.toLowerCase().includes(normalizedSearch))
        : statusViews;
    const hasSearchResults = filteredMainNav.length > 0 || filteredStatusViews.length > 0;

    const NavItem = ({ href, icon: Icon, name, count, statusColorVar }: {
        href: string;
        icon: any;
        name: string;
        count?: number;
        statusColorVar?: string;
    }) => {
        const active = isNavActive(href) || isStatusActive(
            new URLSearchParams(href.split("?")[1] ?? "").get("status") ?? ""
        );

        const inner = (
            <Link
                href={href}
                className={cn(
                    "relative flex items-center gap-3.5 rounded-lg px-4 py-2.5 text-[14px] font-medium transition-colors duration-200",
                    "text-white/70 hover:bg-white/5 hover:text-white",
                    active && "bg-white/10 text-white font-semibold shadow-sm",
                    isCollapsed && "justify-center px-0"
                )}
            >
                <Icon className={cn("h-5 w-5 shrink-0", active ? "text-white" : "text-white/60")} />
                {!isCollapsed && (
                    <>
                        <span className="flex-1 truncate">{name}</span>
                        {count != null ? (
                            <Badge className={cn(
                                "ml-auto h-5 min-w-[20px] justify-center rounded bg-sidebar-primary px-1.5 text-[10px] font-bold text-white",
                                !active && "bg-white/10 text-white/70"
                            )}>
                                {count}
                            </Badge>
                        ) : statusColorVar ? (
                            <span className="ml-auto h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: `hsl(var(${statusColorVar}))` }} />
                        ) : null}
                    </>
                )}
            </Link>
        );

        if (!isCollapsed) return inner;

        return (
            <Tooltip>
                <TooltipTrigger asChild>{inner}</TooltipTrigger>
                <TooltipContent side="right" className="bg-[hsl(var(--sidebar-background))] border-white/10 text-white">{name}</TooltipContent>
            </Tooltip>
        );
    };

    const utilityButtonClass = cn(
        "flex w-full items-center gap-3.5 rounded-lg px-4 py-2.5 text-[13px] font-medium text-white/60 hover:bg-white/5 hover:text-white transition-all",
        isCollapsed && "justify-center px-0"
    );

    return (
        <TooltipProvider delayDuration={100}>
            <aside
                className={cn(
                    "fixed inset-y-0 left-0 z-40 flex h-screen flex-col bg-[hsl(var(--sidebar-background))] text-white transition-all duration-300 ease-in-out lg:sticky lg:top-0",
                    isCollapsed ? "w-[80px]" : "w-[260px]",
                    isMobileOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
                )}
            >
                {/* Header Section */}
                <div className={cn("px-5 pt-8", isCollapsed && "px-3")}>
                    <div className="flex flex-col gap-5">
                        <div className="flex items-start justify-between">
                            <div className="flex items-center gap-3 overflow-hidden">
                                {/* Logo */}
                                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white/10 ring-1 ring-white/10">
                                    <Image
                                        src="/logo.png"
                                        alt="BCL Meetings"
                                        width={28}
                                        height={28}
                                        className="object-contain"
                                    />
                                </div>

                                {/* Company Name */}
                                {!isCollapsed && (
                                    <div className="min-w-0">
                                        <div className="truncate text-[18px] font-semibold leading-tight text-white">
                                            BCL Meetings
                                        </div>

                                        <div className="mt-1 text-[10px] font-semibold uppercase tracking-[0.25em] text-blue-200/70">
                                            Booksmart
                                        </div>
                                    </div>
                                )}
                            </div>

                            <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => setIsCollapsed(!isCollapsed)}
                                className="h-8 w-8 shrink-0 text-white/50 hover:bg-white/10 hover:text-white"
                            >
                                {isCollapsed ? (
                                    <PanelLeftOpen className="h-4 w-4" />
                                ) : (
                                    <PanelLeftClose className="h-4 w-4" />
                                )}
                            </Button>
                        </div>
                    </div>
                </div>

                {/* Search - Integrated styling */}
                {!isCollapsed && (
                    <div className="relative mx-5 mb-4 mt-8">
                        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/40" />
                        <Input
                            type="text"
                            placeholder="Search"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="h-10 rounded-lg border-white/10 bg-white/5 pl-9 text-sm text-white placeholder:text-white/30 focus:bg-white/10 focus:ring-0"
                        />
                    </div>
                )}

                {/* Navigation Content */}
                <div className={cn("sidebar-scroll mt-4 flex-1 overflow-y-auto px-3 pb-4", isCollapsed && "px-2")}>
                    <nav className="space-y-1">
                        {filteredMainNav.map((item) => (
                            <NavItem key={item.name} href={item.href} icon={item.icon} name={item.name} count={item.count} />
                        ))}
                    </nav>

                    <div className="my-6 border-t border-white/5 mx-2" />

                    <nav className="space-y-1">
                        {filteredStatusViews.map((item) => (
                            <NavItem
                                key={item.status}
                                href={item.href}
                                icon={item.icon}
                                name={item.name}
                                count={item.count}
                                statusColorVar={item.colorVar}
                            />
                        ))}
                    </nav>

                    {/* Create Meeting Button - Brand Primary */}
                    <div className="mt-8 px-2">
                        <Button
                            className={cn(
                                "w-full bg-[hsl(var(--sidebar-primary))] font-semibold text-white shadow-lg hover:brightness-110 active:scale-95 transition-all",
                                isCollapsed ? "h-12 w-12 p-0 rounded-xl" : "h-11 rounded-lg"
                            )}
                            onClick={() => router.push('/schedule')}
                        >
                            <PlusCircle className={cn(isCollapsed ? "h-6 w-6" : "mr-2 h-4 w-4")} />
                            {!isCollapsed && <span>Create Meeting</span>}
                        </Button>
                    </div>
                </div>

                {/* Footer Section */}
                <div className={cn("mt-auto bg-black/10 p-4 border-t border-white/5", isCollapsed && "p-2")}>
                    <div className="flex flex-col gap-1">
                        <NavItemComponent isCollapsed={isCollapsed} href="/settings" icon={Settings} label="Settings" className={utilityButtonClass} />
                        <NavItemComponent isCollapsed={isCollapsed} href="/help" icon={HelpCircle} label="Support" className={utilityButtonClass} />

                        {mounted && (
                            <button className={utilityButtonClass} onClick={toggleTheme}>
                                {theme === "dark" ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
                                {!isCollapsed && <span>{theme === "dark" ? "Light Mode" : "Dark Mode"}</span>}
                            </button>
                        )}
                    </div>
                </div>
            </aside>

            {isMobileOpen && (
                <div className="fixed inset-0 z-30 bg-black/60 backdrop-blur-sm lg:hidden" onClick={() => setIsMobileOpen(false)} />
            )}
        </TooltipProvider>
    );
};

const NavItemComponent = ({ isCollapsed, href, icon: Icon, label, className }) => {
    const content = (
        <Link href={href} className={className}>
            <Icon className="h-5 w-5 shrink-0 opacity-70" />
            {!isCollapsed && <span>{label}</span>}
        </Link>
    );

    if (!isCollapsed) return content;

    return (
        <Tooltip>
            <TooltipTrigger asChild>
                <div className="flex justify-center">{content}</div>
            </TooltipTrigger>
            <TooltipContent side="right" className="bg-[hsl(var(--sidebar-background))] border-white/10 text-white">{label}</TooltipContent>
        </Tooltip>
    );
};

export default Sidebar;