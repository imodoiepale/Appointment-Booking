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
        return <CheckCircle className="h-4 w-4 text-blue-600" />;
      case "warning":
        return <Bell className="h-4 w-4 text-amber-500" />;
      case "error":
        return <AlertCircle className="h-4 w-4 text-red-500" />;
      default:
        return <Info className="h-4 w-4 text-blue-600" />;
    }
  };

  const getIconBg = (type: Notification["type"]) => {
    switch (type) {
      case "success":
        return "bg-blue-50";
      case "warning":
        return "bg-amber-50";
      case "error":
        return "bg-red-50";
      default:
        return "bg-blue-50";
    }
  };

  const formatTimestamp = (date: Date) => {
    const now = new Date();
    const diffMs = now.getTime() - new Date(date).getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins} min ago`;
    if (diffHours < 24) return `${diffHours} hr ago`;
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
    <div className="mx-auto max-w-3xl px-4 py-8">
      {/* Header */}
      <div className="mb-6 flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-950">
            Notifications
          </h1>
          <p className="mt-1 text-sm text-slate-500">
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
                className="gap-1.5 border-slate-200 text-slate-600 hover:border-blue-300 hover:text-blue-600"
              >
                <CheckCheck className="h-3.5 w-3.5" />
                Mark all read
              </Button>
            )}
            <Button
              variant="outline"
              size="sm"
              onClick={clearNotifications}
              className="gap-1.5 border-slate-200 text-slate-500 hover:border-red-200 hover:text-red-500"
            >
              <Trash2 className="h-3.5 w-3.5" />
              Clear all
            </Button>
          </div>
        )}
      </div>

      {/* Stats row */}
      {notifications.length > 0 && (
        <div className="mb-5 flex gap-3">
          <div className="flex flex-1 items-center gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-600/10">
              <Bell className="h-4 w-4 text-blue-600" />
            </div>
            <div>
              <p className="text-xs text-slate-500">Total</p>
              <p className="text-lg font-semibold text-slate-950">{notifications.length}</p>
            </div>
          </div>
          <div className="flex flex-1 items-center gap-3 rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 shadow-sm">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-600/15">
              <Bell className="h-4 w-4 text-blue-600" />
            </div>
            <div>
              <p className="text-xs text-blue-600">Unread</p>
              <p className="text-lg font-semibold text-blue-700">{unreadCount}</p>
            </div>
          </div>
          <div className="flex flex-1 items-center gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-100">
              <Calendar className="h-4 w-4 text-slate-500" />
            </div>
            <div>
              <p className="text-xs text-slate-500">Meetings</p>
              <p className="text-lg font-semibold text-slate-950">
                {notifications.filter((n) => n.meetingId).length}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Filter tabs */}
      <div className="mb-4 flex items-center gap-1 rounded-xl border border-slate-200 bg-white p-1 shadow-sm">
        <Filter className="ml-2 h-3.5 w-3.5 flex-shrink-0 text-slate-400" />
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveFilter(tab.key)}
            className={`flex flex-1 items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-xs font-medium transition-all ${
              activeFilter === tab.key
                ? "bg-blue-600 text-white shadow-sm shadow-blue-600/20"
                : "text-slate-500 hover:bg-slate-100 hover:text-slate-700"
            }`}
          >
            {tab.label}
            {tab.count !== undefined && tab.count > 0 && (
              <span
                className={`rounded-full px-1.5 py-0.5 text-[10px] font-semibold ${
                  activeFilter === tab.key
                    ? "bg-white/20 text-white"
                    : "bg-slate-200 text-slate-600"
                }`}
              >
                {tab.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Notification list */}
      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100">
              <Bell className="h-7 w-7 text-slate-300" />
            </div>
            <p className="text-sm font-medium text-slate-700">
              {activeFilter === "unread" ? "All caught up!" : "No notifications"}
            </p>
            <p className="mt-1 text-xs text-slate-400">
              {activeFilter === "unread"
                ? "No unread notifications at the moment."
                : "You'll see meeting updates and reminders here."}
            </p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {filtered.map((n) => (
              <div
                key={n.id}
                onClick={() => handleClick(n)}
                className={`group flex items-start gap-3 p-4 transition-colors hover:bg-slate-50 ${
                  n.link ? "cursor-pointer" : "cursor-default"
                } ${!n.read ? "bg-blue-50/40" : ""}`}
              >
                {/* Unread dot */}
                <div className="mt-1 flex-shrink-0">
                  {!n.read ? (
                    <div className="h-2 w-2 rounded-full bg-blue-600" />
                  ) : (
                    <div className="h-2 w-2 rounded-full bg-transparent" />
                  )}
                </div>

                {/* Icon */}
                <div
                  className={`mt-0.5 flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg ${getIconBg(
                    n.type
                  )}`}
                >
                  {getIcon(n.type)}
                </div>

                {/* Content */}
                <div className="min-w-0 flex-1">
                  <p
                    className={`text-sm ${
                      !n.read
                        ? "font-semibold text-slate-950"
                        : "font-medium text-slate-700"
                    }`}
                  >
                    {n.title}
                  </p>
                  <p className="mt-0.5 line-clamp-2 text-xs text-slate-500">
                    {n.message}
                  </p>
                  <p className="mt-1.5 text-[11px] text-slate-400">
                    {formatTimestamp(n.timestamp)}
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
                      className="flex h-7 w-7 items-center justify-center rounded-lg text-slate-400 hover:bg-blue-100 hover:text-blue-600"
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
                    className="flex h-7 w-7 items-center justify-center rounded-lg text-slate-400 hover:bg-red-100 hover:text-red-500"
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
