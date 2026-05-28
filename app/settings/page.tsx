// @ts-nocheck
"use client";

import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { useTheme } from "next-themes";
import {
  User,
  Mail,
  Shield,
  Calendar,
  Bell,
  Moon,
  Sun,
  Monitor,
  LogOut,
  ChevronRight,
  CheckCircle,
  XCircle,
  MessageSquare,
  Smartphone,
  Info,
  Lock,
} from "lucide-react";
import { useRouter } from "next/navigation";

interface UserProfile {
  id?: string;
  first_name?: string;
  last_name?: string;
  username?: string;
  email?: string;
  role?: string;
}

interface CalendarStatus {
  connected: boolean;
  email?: string;
}

interface NotifPrefs {
  meetingReminders: boolean;
  meetingUpdates: boolean;
  cancellations: boolean;
  whatsapp: boolean;
  email: boolean;
  sms: boolean;
}

export default function SettingsPage() {
  const router = useRouter();
  const { theme, setTheme } = useTheme();

  const [user, setUser] = useState<UserProfile>({});
  const [calStatus, setCalStatus] = useState<CalendarStatus>({ connected: false });
  const [loadingUser, setLoadingUser] = useState(true);
  const [loadingCal, setLoadingCal] = useState(true);
  const [notifPrefs, setNotifPrefs] = useState<NotifPrefs>({
    meetingReminders: true,
    meetingUpdates: true,
    cancellations: true,
    whatsapp: false,
    email: true,
    sms: false,
  });

  useEffect(() => {
    fetch("/api/users/me")
      .then((r) => r.json())
      .then((data) => setUser(data || {}))
      .catch(() => {})
      .finally(() => setLoadingUser(false));

    fetch("/api/auth/google/status")
      .then((r) => r.json())
      .then((data) => setCalStatus(data || { connected: false }))
      .catch(() => {})
      .finally(() => setLoadingCal(false));
  }, []);

  const handleCalConnect = () => router.push("/api/auth/google");
  const handleCalDisconnect = async () => {
    await fetch("/api/auth/google/disconnect", { method: "POST" });
    setCalStatus({ connected: false });
  };
  const handleLogout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
  };

  const displayName =
    user.first_name && user.last_name
      ? `${user.first_name} ${user.last_name}`
      : user.username || user.email || "BCL User";

  const initials = displayName
    .split(" ")
    .map((w: string) => w[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  const roleLabel = (role: string) => {
    if (!role) return "Staff";
    if (role === "super_admin") return "Super Admin";
    if (role === "admin") return "Admin";
    return "Staff";
  };

  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight text-slate-950">Settings</h1>
        <p className="mt-1 text-sm text-slate-500">
          Manage your account, integrations, and preferences.
        </p>
      </div>

      {/* Profile card */}
      <section className="mb-5">
        <div className="premium-surface overflow-hidden rounded-2xl">
          <div className="h-16 bg-gradient-to-r from-indigo-600 via-teal-500 to-slate-950" />
          <div className="px-5 pb-5">
            <div className="-mt-8 flex items-end justify-between">
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl border-4 border-white bg-blue-600 text-xl font-bold text-white shadow-sm">
                {loadingUser ? "…" : initials}
              </div>
              {user.role && (
                <Badge className="mb-1 border-blue-200 bg-blue-50 text-blue-700">
                  {roleLabel(user.role)}
                </Badge>
              )}
            </div>

            <div className="mt-3">
              <p className="text-lg font-semibold text-slate-950">
                {loadingUser ? "Loading…" : displayName}
              </p>
              {user.email && (
                <p className="mt-0.5 flex items-center gap-1.5 text-sm text-slate-500">
                  <Mail className="h-3.5 w-3.5" />
                  {user.email}
                </p>
              )}
              {user.username && (
                <p className="mt-0.5 flex items-center gap-1.5 text-xs text-slate-400">
                  <User className="h-3 w-3" />@{user.username}
                </p>
              )}
            </div>
          </div>
        </div>
      </section>

      <div className="grid gap-5 lg:grid-cols-[1.1fr_0.9fr]">

      {/* Google Calendar */}
      <section>
        <SectionHeader icon={Calendar} title="Google Calendar" />
        <div className="premium-panel rounded-2xl">
          <div className="flex items-center justify-between p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-50">
                <Calendar className="h-4 w-4 text-blue-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-slate-900">Calendar sync</p>
                {loadingCal ? (
                  <p className="text-xs text-slate-400">Checking status…</p>
                ) : calStatus.connected ? (
                  <p className="flex items-center gap-1 text-xs text-blue-600">
                    <CheckCircle className="h-3 w-3" />
                    Connected{calStatus.email ? ` · ${calStatus.email}` : ""}
                  </p>
                ) : (
                  <p className="flex items-center gap-1 text-xs text-slate-500">
                    <XCircle className="h-3 w-3" />
                    Not connected
                  </p>
                )}
              </div>
            </div>
            {!loadingCal &&
              (calStatus.connected ? (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleCalDisconnect}
                  className="border-red-200 text-red-600 hover:bg-red-50"
                >
                  Disconnect
                </Button>
              ) : (
                <Button
                  size="sm"
                  onClick={handleCalConnect}
                  className="bg-blue-600 text-white hover:bg-blue-700"
                >
                  Connect
                </Button>
              ))}
          </div>
          <div className="border-t border-slate-100 px-4 py-3">
            <p className="text-xs text-slate-400">
              Meetings you create are automatically synced to your Google Calendar when connected.
            </p>
          </div>
        </div>
      </section>

      {/* Notification preferences */}
      <section>
        <SectionHeader icon={Bell} title="Notifications" />
        <div className="premium-panel divide-y divide-slate-100 overflow-hidden rounded-2xl">
          <NotifToggle
            icon={Bell}
            iconBg="bg-blue-50"
            iconColor="text-blue-600"
            label="Meeting reminders"
            description="Get reminded 30 min before a meeting"
            checked={notifPrefs.meetingReminders}
            onChange={(v) => setNotifPrefs((p) => ({ ...p, meetingReminders: v }))}
          />
          <NotifToggle
            icon={Info}
            iconBg="bg-slate-100"
            iconColor="text-slate-500"
            label="Meeting updates"
            description="Notified when a meeting is edited or rescheduled"
            checked={notifPrefs.meetingUpdates}
            onChange={(v) => setNotifPrefs((p) => ({ ...p, meetingUpdates: v }))}
          />
          <NotifToggle
            icon={XCircle}
            iconBg="bg-red-50"
            iconColor="text-red-500"
            label="Cancellations"
            description="Alerts when a meeting is cancelled"
            checked={notifPrefs.cancellations}
            onChange={(v) => setNotifPrefs((p) => ({ ...p, cancellations: v }))}
          />
        </div>
      </section>

      {/* Channel preferences */}
      <section>
        <SectionHeader icon={MessageSquare} title="Notification Channels" />
        <div className="premium-panel divide-y divide-slate-100 overflow-hidden rounded-2xl">
          <NotifToggle
            icon={MessageSquare}
            iconBg="bg-green-50"
            iconColor="text-green-600"
            label="WhatsApp"
            description="Receive meeting alerts via WhatsApp"
            checked={notifPrefs.whatsapp}
            onChange={(v) => setNotifPrefs((p) => ({ ...p, whatsapp: v }))}
          />
          <NotifToggle
            icon={Mail}
            iconBg="bg-blue-50"
            iconColor="text-blue-600"
            label="Email"
            description="Receive meeting alerts via email"
            checked={notifPrefs.email}
            onChange={(v) => setNotifPrefs((p) => ({ ...p, email: v }))}
          />
          <NotifToggle
            icon={Smartphone}
            iconBg="bg-slate-100"
            iconColor="text-slate-500"
            label="SMS"
            description="Receive meeting alerts via SMS"
            checked={notifPrefs.sms}
            onChange={(v) => setNotifPrefs((p) => ({ ...p, sms: v }))}
          />
        </div>
      </section>

      {/* Appearance */}
      <section>
        <SectionHeader icon={Sun} title="Appearance" />
        <div className="premium-panel overflow-hidden rounded-2xl">
          <div className="p-4">
            <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-400">
              Theme
            </p>
            <div className="grid grid-cols-3 gap-2">
              {(["light", "dark", "system"] as const).map((t) => {
                const Icon = t === "light" ? Sun : t === "dark" ? Moon : Monitor;
                const active = theme === t;
                return (
                  <button
                    key={t}
                    onClick={() => setTheme(t)}
                    className={`flex flex-col items-center gap-2 rounded-xl border p-3 text-xs font-medium transition-all ${
                      active
                        ? "border-blue-600 bg-blue-600/5 text-blue-600 ring-1 ring-blue-600/20"
                        : "border-slate-200 text-slate-500 hover:border-slate-300 hover:text-slate-700"
                    }`}
                  >
                    <Icon className="h-4 w-4" />
                    <span className="capitalize">{t}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </section>

      {/* Security */}
      <section>
        <SectionHeader icon={Shield} title="Security" />
        <div className="premium-panel divide-y divide-slate-100 overflow-hidden rounded-2xl">
          <SettingsRow icon={Lock} label="Change password" />
          <SettingsRow icon={Shield} label="Active sessions" />
        </div>
      </section>

      {/* About */}
      <section>
        <SectionHeader icon={Info} title="About" />
        <div className="premium-panel divide-y divide-slate-100 overflow-hidden rounded-2xl">
          <div className="flex items-center justify-between px-4 py-3">
            <p className="text-sm text-slate-700">App name</p>
            <p className="text-sm font-medium text-slate-950">BCL Meetings</p>
          </div>
          <div className="flex items-center justify-between px-4 py-3">
            <p className="text-sm text-slate-700">Version</p>
            <p className="text-sm font-medium text-slate-950">v1.0.0</p>
          </div>
          <div className="flex items-center justify-between px-4 py-3">
            <p className="text-sm text-slate-700">Organisation</p>
            <p className="text-sm font-medium text-slate-950">Booksmart Consult Limited</p>
          </div>
        </div>
      </section>
      </div>

      {/* Sign out */}
      <Button
        variant="outline"
        className="mt-5 w-full gap-2 border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700"
        onClick={handleLogout}
      >
        <LogOut className="h-4 w-4" />
        Sign out
      </Button>
    </div>
  );
}

function SectionHeader({ icon: Icon, title }: { icon: React.ElementType; title: string }) {
  return (
    <div className="mb-2 flex items-center gap-2 px-1">
      <Icon className="h-3.5 w-3.5 text-slate-400" />
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">{title}</p>
    </div>
  );
}

function NotifToggle({
  icon: Icon,
  iconBg,
  iconColor,
  label,
  description,
  checked,
  onChange,
}: {
  icon: React.ElementType;
  iconBg: string;
  iconColor: string;
  label: string;
  description: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <div className="flex items-center gap-3 px-4 py-3">
      <div className={`flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg ${iconBg}`}>
        <Icon className={`h-4 w-4 ${iconColor}`} />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium text-slate-900">{label}</p>
        <p className="text-xs text-slate-500">{description}</p>
      </div>
      <Switch checked={checked} onCheckedChange={onChange} />
    </div>
  );
}

function SettingsRow({ icon: Icon, label }: { icon: React.ElementType; label: string }) {
  return (
    <div className="flex cursor-pointer items-center gap-3 px-4 py-3 transition-colors hover:bg-slate-50">
      <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-slate-100">
        <Icon className="h-4 w-4 text-slate-500" />
      </div>
      <p className="flex-1 text-sm font-medium text-slate-900">{label}</p>
      <ChevronRight className="h-4 w-4 text-slate-400" />
    </div>
  );
}
