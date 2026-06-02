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
    XCircle,
} from "lucide-react";

import { useSidebar } from "@/contexts/SidebarContext";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from "@/components/ui/tooltip";

const Sidebar = () => {
    const pathname = usePathname();
    const searchParams = useSearchParams();
    const { theme, setTheme } = useTheme();
    const [mounted, setMounted] = useState(false);
    const { isMobileOpen, setIsMobileOpen } = useSidebar();
    const [isCollapsed, setIsCollapsed] = useState(false);
    const [searchQuery, setSearchQuery] = useState("");

    useEffect(() => setMounted(true), []);

    const mainNav = [
        { name: "Overview", href: "/dashboard", icon: LayoutDashboard },
        { name: "Events", href: "/events", icon: PartyPopper },
        { name: "Calendar", href: "/calendar", icon: CalendarDays },
        { name: "Notifications", href: "/notifications", icon: Bell, count: 3 },
    ];

    const statusViews = [
        { name: "Upcoming", href: "/dashboard?status=upcoming", status: "upcoming", icon: Clock, color: "#ffffff", count: 8 },
        { name: "Today", href: "/dashboard?status=today", status: "today", icon: Calendar, color: "#ffffff", count: 2 },
        { name: "Pending", href: "/dashboard?status=pending", status: "pending", icon: AlertCircle, color: "#ffffff", count: 5 },
        { name: "Completed", href: "/dashboard?status=completed", status: "completed", icon: CheckCircle, color: "#ffffff" },
        { name: "Canceled", href: "/dashboard?status=canceled", status: "canceled", icon: XCircle, color: "rgba(255,255,255,0.45)" },
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

    const NavItem = ({ href, icon: Icon, name, count, statusColor }: {
        href: string;
        icon: any;
        name: string;
        count?: number;
        statusColor?: string;
    }) => {
        const active = isNavActive(href) || isStatusActive(
            new URLSearchParams(href.split("?")[1] ?? "").get("status") ?? ""
        );

        const inner = (
            <Link
                href={href}
                className={cn(
                    "relative flex items-center gap-3.5 rounded-xl px-4 py-3 text-[12px] text-sidebar-foreground transition-all duration-200 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground hover:shadow-sm",
                    active && "bg-sidebar-accent font-semibold text-sidebar-accent-foreground shadow-sm ring-1 ring-sidebar-border/70 before:absolute before:left-0 before:top-1/4 before:bottom-1/4 before:w-[4px] before:rounded-r-full before:bg-sidebar-primary",
                    isCollapsed && "justify-center px-0"
                )}
            >
                <Icon className={cn("h-5 w-5 shrink-0", active ? "text-sidebar-primary" : "opacity-80")} />
                {!isCollapsed && (
                    <>
                        <span className="flex-1 truncate">{name}</span>
                        {count != null ? (
                            <Badge variant="secondary" className="ml-auto h-6 rounded-md border border-sidebar-border bg-background/80 px-2 text-[11px] font-bold text-sidebar-primary shadow-sm dark:bg-white/10 dark:text-white">
                                {count}
                            </Badge>
                        ) : statusColor ? (
                            <span className="ml-auto h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: statusColor }} />
                        ) : null}
                    </>
                )}
            </Link>
        );

        if (!isCollapsed) return inner;

        return (
            <Tooltip>
                <TooltipTrigger asChild>{inner}</TooltipTrigger>
                <TooltipContent side="right" className="text-sm font-medium">{name}</TooltipContent>
            </Tooltip>
        );
    };

    const utilityButtonClass = cn(
        "h-auto w-full justify-start gap-3.5 rounded-xl px-4 py-3 text-[12px] font-medium text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
        isCollapsed && "justify-center px-0"
    );

    return (
        <TooltipProvider delayDuration={100}>
            <aside
                className={cn(
                    "fixed inset-y-0 left-0 z-40 flex h-screen flex-col border-r border-sidebar-border bg-sidebar/95 text-sidebar-foreground shadow-2xl shadow-[#00adcc]/10 backdrop-blur-xl transition-all duration-300 ease-in-out dark:shadow-black/30 lg:sticky lg:top-0",
                    isCollapsed ? "w-[80px]" : "w-[250px]",
                    isMobileOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
                )}
            >
                {/* Header / Logo Section */}
                <div className={cn("px-4 pt-5", isCollapsed && "px-3")}>
                    <div className="rounded-xl border border-sidebar-border/80 bg-background/70 p-3 shadow-sm dark:bg-white/[0.03]">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3 overflow-hidden">
                                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-white shadow-sm ring-1 ring-sidebar-border">
                                    <Image src="/logo.png" alt="Logo" width={32} height={32} />
                                </div>
                                {!isCollapsed && (
                                    <div className="whitespace-nowrap">
                                        <div className="text-[16px] font-black leading-tight tracking-tight text-sidebar-primary">BCL Meetings</div>
                                        <div className="text-[12px] font-medium text-sidebar-foreground/60 uppercase tracking-wider">Booksmart</div>
                                    </div>
                                )}
                            </div>

                            <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => setIsCollapsed(!isCollapsed)}
                                className="hidden h-8 w-8 text-sidebar-foreground hover:bg-sidebar-accent lg:flex"
                                aria-label={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
                            >
                                {isCollapsed ? <PanelLeftOpen className="h-5 w-5" /> : <PanelLeftClose className="h-5 w-5" />}
                            </Button>
                        </div>
                    </div>
                </div>

                {/* Search Section */}
                {!isCollapsed && (
                    <div className="relative mx-4 mb-2 mt-6">
                        <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-sidebar-foreground/50" />
                        <Input
                            type="text"
                            placeholder="Search navigation..."
                            value={searchQuery}
                            onChange={(event) => setSearchQuery(event.target.value)}
                            className="h-11 rounded-xl border-sidebar-border bg-background/80 pl-10 pr-9 text-sm text-sidebar-primary shadow-sm placeholder:text-sidebar-foreground/50 focus-visible:ring-sidebar-ring dark:bg-white/[0.04]"
                        />
                        {searchQuery && (
                            <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => setSearchQuery("")}
                                className="absolute right-1.5 top-1/2 h-8 w-8 -translate-y-1/2 text-sidebar-foreground/50 hover:text-sidebar-foreground"
                            >
                                <XCircle className="h-4 w-4" />
                            </Button>
                        )}
                    </div>
                )}

                {/* Navigation Content */}
                <div className={cn("sidebar-scroll mt-4 flex-1 overflow-y-auto px-3 pb-4", isCollapsed && "px-2")}>
                    {!isCollapsed && (
                        <div className="mb-2 px-3 text-[13px] font-bold uppercase tracking-[0.1em] text-sidebar-foreground/40">
                            Main Menu
                        </div>
                    )}
                    <nav className="space-y-1.5">
                        {filteredMainNav.map((item) => (
                            <NavItem key={item.name} href={item.href} icon={item.icon} name={item.name} count={item.count} />
                        ))}
                    </nav>

                    {!isCollapsed && (
                        <div className="mb-2 mt-8 px-3 text-[13px] font-bold uppercase tracking-[0.1em] text-sidebar-foreground/40">
                            Filter Status
                        </div>
                    )}
                    <nav className="mt-1.5 space-y-1.5">
                        {filteredStatusViews.map((item) => (
                            <NavItem
                                key={item.status}
                                href={item.href}
                                icon={item.icon}
                                name={item.name}
                                count={item.count}
                                statusColor={item.color}
                            />
                        ))}
                    </nav>

                    {!isCollapsed && !hasSearchResults && (
                        <div className="mx-2 mt-6 rounded-xl border border-dashed border-sidebar-border bg-background/40 px-4 py-8 text-center text-sm text-sidebar-foreground/60">
                            No results found.
                        </div>
                    )}

                    {/* Action Button */}
                    <div className="mt-8 px-1">
                        <Button
                            className={cn(
                                "w-full bg-sidebar-primary py-6 text-[12px] font-bold text-sidebar-primary-foreground shadow-lg shadow-[#00adcc]/20 transition-all hover:scale-[1.02] hover:bg-sidebar-primary/90 hover:shadow-xl",
                                isCollapsed ? "h-12 w-12 p-0 rounded-xl" : "rounded-xl"
                            )}
                            aria-label="Create Meeting"
                        >
                            <PlusCircle className={cn(isCollapsed ? "h-6 w-6" : "mr-2 h-5 w-5")} />
                            {!isCollapsed && <span>Create Meeting</span>}
                        </Button>
                    </div>
                </div>

                {/* Footer Section */}
                <div className={cn("mt-auto border-t border-sidebar-border/60 bg-background/50 p-4 backdrop-blur-md", isCollapsed && "p-2")}>
                    <div className="flex flex-col gap-1">
                        <NavItemComponent
                            isCollapsed={isCollapsed}
                            href="/settings"
                            icon={Settings}
                            label="Settings"
                            className={utilityButtonClass}
                        />
                        <NavItemComponent
                            isCollapsed={isCollapsed}
                            href="/help"
                            icon={HelpCircle}
                            label="Support"
                            className={utilityButtonClass}
                        />

                        {mounted && (
                            <Button
                                variant="ghost"
                                className={utilityButtonClass}
                                onClick={toggleTheme}
                                aria-label="Toggle theme"
                            >
                                {theme === "dark" ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
                                {!isCollapsed && <span>{theme === "dark" ? "Light Mode" : "Dark Mode"}</span>}
                            </Button>
                        )}
                    </div>
                </div>
            </aside>

            {/* Mobile Overlay */}
            {isMobileOpen && (
                <div
                    className="fixed inset-0 z-30 bg-black/60 backdrop-blur-sm lg:hidden"
                    onClick={() => setIsMobileOpen(false)}
                />
            )}
        </TooltipProvider>
    );
};

// Helper for Footer Buttons to reduce repetition
const NavItemComponent = ({ isCollapsed, href, icon: Icon, label, className }) => {
    const content = (
        <Link href={href} className={className}>
            <Icon className="h-5 w-5 shrink-0 opacity-80" />
            {!isCollapsed && <span>{label}</span>}
        </Link>
    );

    if (!isCollapsed) return content;

    return (
        <Tooltip>
            <TooltipTrigger asChild>
                <div className="flex justify-center">{content}</div>
            </TooltipTrigger>
            <TooltipContent side="right" className="text-sm font-medium">{label}</TooltipContent>
        </Tooltip>
    );
};

export default Sidebar;