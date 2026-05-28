// @ts-nocheck
"use client";

import React, { useState } from "react";
import { useNotifications } from "@/context/NotificationContext";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
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
        return <CheckCircle className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />;
      case "warning":
        return <Bell className="h-4 w-4 text-amber-600 dark:text-amber-400" />;
      case "error":
        return <AlertCircle className="h-4 w-4 text-red-600 dark:text-red-400" />;
      default:
        return <Info className="h-4 w-4 text-zinc-600 dark:text-zinc-400" />;
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
        return "bg-zinc-100 dark:bg-white/10";
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

  const tabs: { key: FilterTab; label: string; count?: number }[] = [
    { key: "all", label: "All", count: notifications.length },
    { key: "unread", label: "Unread", count: unreadCount },
    { key: "meetings", label: "Meetings" },
    { key: "reminders", label: "Reminders" },
  ];

  return (
    <div className="mx-auto max-w-5xl px-4 sm:px-6 py-8">
      {/* Header */}
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-100">
            Notifications
          </h1>
          <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
            Stay updated on your meetings and reminders.
          </p>
        </div>

        {notifications.length > 0 && (
          <div className="flex items-center gap-2">
            {unreadCount > 0 && (
              <Button
                variant="outline"
                size="sm"
                onClick={markAllAsRead}
                className="h-8 gap-1.5 border-zinc-200 dark:border-white/10 bg-white dark:bg-zinc-900 text-zinc-600 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-white/5 text-xs font-medium"
              >
                <CheckCheck className="h-3.5 w-3.5" />
                Mark all read
              </Button>
            )}
            <Button
              variant="outline"
              size="sm"
              onClick={clearNotifications}
              className="h-8 gap-1.5 border-zinc-200 dark:border-white/10 bg-white dark:bg-zinc-900 text-zinc-600 dark:text-zinc-300 hover:text-red-600 hover:border-red-200 dark:hover:text-red-400 dark:hover:border-red-500/30 text-xs font-medium transition-colors"
            >
              <Trash2 className="h-3.5 w-3.5" />
              Clear all
            </Button>
          </div>
        )}
      </div>

      {/* Stats row */}
      {notifications.length > 0 && (
        <div className="mb-6 grid gap-4 grid-cols-2 md:grid-cols-3">
          <div className="flex flex-col gap-3 rounded-xl border border-zinc-200 dark:border-white/10 bg-white dark:bg-zinc-900/50 p-4 shadow-sm">
            <div className="flex items-center gap-2 text-zinc-500 dark:text-zinc-400">
              <Bell className="h-4 w-4" />
              <p className="text-[10px] font-semibold uppercase tracking-wider">Total Activity</p>
            </div>
            <p className="text-2xl font-semibold text-zinc-900 dark:text-zinc-100">{notifications.length}</p>
          </div>

          <div className="flex flex-col gap-3 rounded-xl border border-zinc-200 dark:border-white/10 bg-white dark:bg-zinc-900/50 p-4 shadow-sm relative overflow-hidden">
            {unreadCount > 0 && <div className="absolute top-0 left-0 w-full h-1 bg-zinc-900 dark:bg-white" />}
            <div className="flex items-center gap-2 text-zinc-500 dark:text-zinc-400">
              <CheckCheck className="h-4 w-4" />
              <p className="text-[10px] font-semibold uppercase tracking-wider">Unread</p>
            </div>
            <p className="text-2xl font-semibold text-zinc-900 dark:text-zinc-100">{unreadCount}</p>
          </div>

          <div className="hidden md:flex flex-col gap-3 rounded-xl border border-zinc-200 dark:border-white/10 bg-white dark:bg-zinc-900/50 p-4 shadow-sm">
            <div className="flex items-center gap-2 text-zinc-500 dark:text-zinc-400">
              <Calendar className="h-4 w-4" />
              <p className="text-[10px] font-semibold uppercase tracking-wider">Meeting Updates</p>
            </div>
            <p className="text-2xl font-semibold text-zinc-900 dark:text-zinc-100">
              {notifications.filter((n) => n.meetingId).length}
            </p>
          </div>
        </div>
      )}

      {/* Filter tabs */}
      <div className="mb-4 flex items-center gap-1 rounded-lg border border-zinc-200 dark:border-white/10 bg-zinc-50/50 dark:bg-white/[0.02] p-1 w-full overflow-x-auto scrollbar-hide">
        <Filter className="ml-2 mr-1 h-3.5 w-3.5 flex-shrink-0 text-zinc-400" />
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveFilter(tab.key)}
            className={`flex items-center justify-center gap-2 rounded-md px-3 py-1.5 text-xs font-medium transition-all whitespace-nowrap ${activeFilter === tab.key
                ? "bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white shadow-sm"
                : "text-zinc-500 dark:text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200"
              }`}
          >
            {tab.label}
            {tab.count !== undefined && tab.count > 0 && (
              <span
                className={`rounded-full px-1.5 py-0.5 text-[9px] font-bold leading-none ${activeFilter === tab.key
                    ? "bg-zinc-100 text-zinc-900 dark:bg-white/10 dark:text-white"
                    : "bg-zinc-200/50 dark:bg-white/10 text-zinc-500 dark:text-zinc-400"
                  }`}
              >
                {tab.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Notification list */}
      <div className="rounded-xl border border-zinc-200 dark:border-white/10 bg-white dark:bg-zinc-950 shadow-sm overflow-hidden flex flex-col min-h-[400px]">
        {filtered.length === 0 ? (
          <div className="flex flex-1 flex-col items-center justify-center py-16 text-center px-4">
            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-zinc-50 dark:bg-white/[0.02] border border-zinc-100 dark:border-white/5">
              <Bell className="h-5 w-5 text-zinc-300 dark:text-zinc-600" />
            </div>
            <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
              {activeFilter === "unread" ? "You're all caught up" : "No notifications"}
            </p>
            <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400 max-w-xs">
              {activeFilter === "unread"
                ? "There are no unread notifications right now."
                : "When you get updates, meeting requests, or reminders, they'll show up here."}
            </p>
          </div>
        ) : (
          <div className="divide-y divide-zinc-100 dark:divide-white/5">
            {filtered.map((n) => (
              <div
                key={n.id}
                onClick={() => handleClick(n)}
                className={`group flex items-start gap-4 px-5 py-4 transition-colors hover:bg-zinc-50 dark:hover:bg-white/[0.02] ${n.link ? "cursor-pointer" : "cursor-default"
                  } ${!n.read ? "bg-zinc-50/50 dark:bg-white/[0.01]" : ""}`}
              >
                {/* Unread indicator */}
                <div className="mt-2 flex-shrink-0 w-2 flex justify-center">
                  {!n.read && <div className="h-1.5 w-1.5 rounded-full bg-zinc-900 dark:bg-white shadow-sm" />}
                </div>

                {/* Icon */}
                <div className={`mt-0.5 flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-md border border-zinc-200/50 dark:border-white/5 ${getIconBg(n.type)}`}>
                  {getIcon(n.type)}
                </div>

                {/* Content */}
                <div className="min-w-0 flex-1">
                  <div className="flex items-start justify-between gap-2">
                    <p className={`text-sm leading-tight ${!n.read ? "font-semibold text-zinc-900 dark:text-zinc-100" : "font-medium text-zinc-700 dark:text-zinc-300"}`}>
                      {n.title}
                    </p>
                    <p className="text-[10px] font-medium text-zinc-400 dark:text-zinc-500 whitespace-nowrap pt-0.5">
                      {formatTimestamp(n.timestamp)}
                    </p>
                  </div>
                  <p className={`mt-1 text-xs leading-relaxed line-clamp-2 ${!n.read ? "text-zinc-600 dark:text-zinc-400" : "text-zinc-500 dark:text-zinc-500"}`}>
                    {n.message}
                  </p>
                </div>

                {/* Actions */}
                <div className="flex flex-shrink-0 items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                  {!n.read && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        markAsRead(n.id);
                      }}
                      title="Mark as read"
                      className="flex h-7 w-7 items-center justify-center rounded-md text-zinc-400 hover:bg-zinc-100 hover:text-zinc-900 dark:hover:bg-white/10 dark:hover:text-white transition-colors"
                    >
                      <Check className="h-3.5 w-3.5" />
                    </button>
                  )}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      removeNotification(n.id);
                    }}
                    title="Delete"
                    className="flex h-7 w-7 items-center justify-center rounded-md text-zinc-400 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-500/10 dark:hover:text-red-400 transition-colors"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}