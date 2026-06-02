// @ts-nocheck
"use client";

import React, { useState } from "react";
import { useNotifications } from "@/context/NotificationContext";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Bell,
  Check,
  CheckCheck,
  Trash2,
  Info,
  AlertCircle,
  CheckCircle,
  Calendar,
  Filter,
  Inbox,
  Clock,
  Activity,
} from "lucide-react";
import type { Notification } from "@/context/NotificationContext";

type FilterTab = "all" | "unread" | "meetings" | "reminders";

export default function NotificationsPage() {
  const {
    notifications,
    unreadCount,
    markAsRead,
    markAllAsRead,
    removeNotification,
    clearNotifications,
  } = useNotifications();
  const router = useRouter();
  const [activeFilter, setActiveFilter] = useState<FilterTab>("all");

  const getIcon = (type: Notification["type"]) => {
    switch (type) {
      case "success":
        return <CheckCircle className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />;
      case "warning":
        return <Bell className="h-5 w-5 text-amber-600 dark:text-amber-400" />;
      case "error":
        return <AlertCircle className="h-5 w-5 text-red-600 dark:text-red-400" />;
      default:
        return <Info className="h-5 w-5 text-primary" />;
    }
  };

  const getIconBg = (type: Notification["type"]) => {
    switch (type) {
      case "success":
        return "bg-emerald-50 dark:bg-emerald-500/10";
      case "warning":
        return "bg-amber-50 dark:bg-amber-500/10";
      case "error":
        return "bg-red-50 dark:bg-red-500/10";
      default:
        return "bg-secondary";
    }
  };

  const formatTimestamp = (date: Date) => {
    const now = new Date();
    const diffMs = now.getTime() - new Date(date).getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins} m ago`;
    if (diffHours < 24) return `${diffHours} h ago`;
    if (diffDays === 1) return "Yesterday";
    return new Date(date).toLocaleDateString("en-GB", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  };

  const filtered = notifications.filter((n) => {
    if (activeFilter === "unread") return !n.read;
    if (activeFilter === "meetings") return !!n.meetingId;
    if (activeFilter === "reminders") return n.type === "warning";
    return true;
  });

  const handleClick = (n: Notification) => {
    if (!n.read) markAsRead(n.id);
    if (n.link) router.push(n.link);
  };

  const tabs: { key: FilterTab; label: string; icon: any; count?: number }[] = [
    { key: "all", label: "All Activity", icon: Inbox, count: notifications.length },
    { key: "unread", label: "Unread", icon: CheckCheck, count: unreadCount },
    { key: "meetings", label: "Meetings", icon: Calendar },
    { key: "reminders", label: "Reminders", icon: Clock },
  ];

  return (
    <div className="premium-page mx-auto w-full px-4 py-8 sm:px-6 md:py-12 lg:px-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight text-foreground">
          Notifications
        </h1>
        <p className="mt-2 text-base text-muted-foreground">
          Stay updated on your meetings, alerts, and reminders.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-10">

        {/* === LEFT COLUMN (Stats & Filters) === */}
        <div className="flex flex-col gap-8 lg:col-span-4">

          {/* Overview Stats */}
          {notifications.length > 0 && (
            <section>
              <SectionHeader icon={Activity} title="Overview" />
              <div className="premium-panel divide-y divide-border overflow-hidden rounded-xl border">

                <div className="flex items-center justify-between px-5 py-4">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-secondary text-muted-foreground">
                      <Bell className="h-5 w-5" />
                    </div>
                    <p className="text-sm font-semibold text-foreground">Total Activity</p>
                  </div>
                  <p className="text-lg font-bold text-foreground">{notifications.length}</p>
                </div>

                <div className="flex items-center justify-between px-5 py-4 relative overflow-hidden">
                  {unreadCount > 0 && <div className="absolute left-0 top-0 h-full w-1 bg-primary" />}
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-secondary text-primary">
                      <CheckCheck className="h-5 w-5" />
                    </div>
                    <p className="text-sm font-semibold text-foreground">Unread</p>
                  </div>
                  <p className="text-lg font-bold text-foreground">{unreadCount}</p>
                </div>

                <div className="flex items-center justify-between px-5 py-4">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-secondary text-muted-foreground">
                      <Calendar className="h-5 w-5" />
                    </div>
                    <p className="text-sm font-semibold text-foreground">Meeting Updates</p>
                  </div>
                  <p className="text-lg font-bold text-foreground">
                    {notifications.filter((n) => n.meetingId).length}
                  </p>
                </div>

              </div>
            </section>
          )}

          {/* Filters / Views */}
          <section>
            <SectionHeader icon={Filter} title="Views" />
            <div className="premium-panel flex flex-col gap-1 rounded-xl border p-2">
              {tabs.map((tab) => {
                const Icon = tab.icon;
                const active = activeFilter === tab.key;
                return (
                  <Button
                    key={tab.key}
                    onClick={() => setActiveFilter(tab.key)}
                    variant="ghost"
                    className={`h-auto w-full justify-between rounded-xl px-4 py-3 transition-all ${active
                        ? "bg-secondary text-primary font-semibold shadow-sm"
                        : "text-muted-foreground hover:bg-secondary hover:text-foreground font-medium"
                      }`}
                  >
                    <div className="flex items-center gap-3">
                      <Icon className="h-5 w-5" />
                      <span className="text-sm">{tab.label}</span>
                    </div>
                    {tab.count !== undefined && tab.count > 0 && (
                      <Badge
                        variant="secondary"
                        className={active ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground"}
                      >
                        {tab.count}
                      </Badge>
                    )}
                  </Button>
                );
              })}
            </div>
          </section>

        </div>

        {/* === RIGHT COLUMN (Notification List) === */}
        <div className="flex flex-col gap-4 lg:col-span-8">

          {/* Actions Bar */}
          {notifications.length > 0 && (
            <div className="flex items-center justify-end gap-3 mb-2">
              {unreadCount > 0 && (
                <Button
                  variant="outline"
                  onClick={markAllAsRead}
                  className="gap-2 border-border bg-background text-foreground shadow-sm hover:bg-secondary"
                >
                  <CheckCheck className="h-4 w-4" />
                  Mark all read
                </Button>
              )}
              <Button
                variant="outline"
                onClick={clearNotifications}
                className="gap-2 border-red-100 bg-background text-red-600 shadow-sm hover:border-red-200 hover:bg-red-50"
              >
                <Trash2 className="h-4 w-4" />
                Clear all
              </Button>
            </div>
          )}

          {/* List Panel */}
          <div className="premium-panel flex min-h-[500px] flex-col overflow-hidden rounded-xl border">
            {filtered.length === 0 ? (
              <div className="flex flex-1 flex-col items-center justify-center py-20 px-6 text-center">
                <div className="mb-5 flex h-16 w-16 items-center justify-center rounded-xl border border-border bg-secondary">
                  <Bell className="h-8 w-8 text-muted-foreground" />
                </div>
                <p className="text-lg font-semibold text-foreground">
                  {activeFilter === "unread" ? "You're all caught up!" : "No notifications yet"}
                </p>
                <p className="mt-2 max-w-sm text-sm leading-relaxed text-muted-foreground">
                  {activeFilter === "unread"
                    ? "There are no unread notifications right now. Enjoy your day!"
                    : "When you receive meeting invites, system alerts, or reminders, they will appear here."}
                </p>
              </div>
            ) : (
              <div className="divide-y divide-slate-100 dark:divide-slate-800/60">
                {filtered.map((n) => (
                  <div
                    key={n.id}
                    onClick={() => handleClick(n)}
                    className={`group flex items-start gap-4 px-6 py-5 transition-colors hover:bg-secondary/70 sm:items-center ${n.link ? "cursor-pointer" : "cursor-default"
                      } ${!n.read ? "bg-secondary/50" : ""}`}
                  >
                    {/* Unread Indicator */}
                    <div className="mt-1.5 sm:mt-0 flex-shrink-0 w-2 flex justify-center">
                      {!n.read && <div className="h-2.5 w-2.5 rounded-full bg-primary shadow-sm" />}
                    </div>

                    {/* Icon */}
                    <div
                      className={`mt-1 flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-lg border border-border sm:mt-0 ${getIconBg(
                        n.type
                      )}`}
                    >
                      {getIcon(n.type)}
                    </div>

                    {/* Content */}
                    <div className="min-w-0 flex-1 pr-4">
                      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1 sm:gap-4">
                        <p
                          className={`text-sm leading-tight ${!n.read
                              ? "font-bold text-foreground"
                              : "font-semibold text-foreground/80"
                            }`}
                        >
                          {n.title}
                        </p>
                        <p className="whitespace-nowrap text-xs font-medium text-muted-foreground">
                          {formatTimestamp(n.timestamp)}
                        </p>
                      </div>
                      <p
                        className={`mt-1.5 line-clamp-2 text-sm leading-relaxed ${!n.read ? "text-foreground/80" : "text-muted-foreground"
                          }`}
                      >
                        {n.message}
                      </p>
                    </div>

                    {/* Actions (visible on group hover) */}
                    <div className="flex flex-shrink-0 items-center gap-2 opacity-0 transition-opacity group-hover:opacity-100">
                      {!n.read && (
                        <Button
                          onClick={(e) => {
                            e.stopPropagation();
                            markAsRead(n.id);
                          }}
                          title="Mark as read"
                          variant="ghost"
                          size="icon"
                          className="h-9 w-9 rounded-lg text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
                        >
                          <Check className="h-4 w-4" />
                        </Button>
                      )}
                      <Button
                        onClick={(e) => {
                          e.stopPropagation();
                          removeNotification(n.id);
                        }}
                        title="Delete"
                        variant="ghost"
                        size="icon"
                        className="h-9 w-9 rounded-lg text-slate-400 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-500/10 dark:hover:text-red-400 transition-colors"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function SectionHeader({ icon: Icon, title }: { icon: React.ElementType; title: string }) {
  return (
    <div className="mb-3 flex items-center gap-2 px-1">
      <Icon className="h-4 w-4 text-muted-foreground" />
      <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">{title}</p>
    </div>
  );
}
