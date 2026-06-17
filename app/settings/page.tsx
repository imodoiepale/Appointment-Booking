// @ts-nocheck
"use client";

import React, { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
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
  Plus,
  X,
  Save,
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

interface NotifSettings {
  meeting_enabled: boolean;
  meeting_custom_reminders: number[];
  meeting_end_alert: boolean;
  birthday_enabled: boolean;
  birthday_days_before: number;
  birthday_day_of: boolean;
  birthday_filter: string;
  event_enabled: boolean;
  event_custom_reminders: number[];
  // delivery channels (local state only — extend to DB if needed)
  whatsapp: boolean;
  email_channel: boolean;
  sms: boolean;
}

const DEFAULT_NOTIF: NotifSettings = {
  meeting_enabled: true,
  meeting_custom_reminders: [60, 30, 0],
  meeting_end_alert: true,
  birthday_enabled: true,
  birthday_days_before: 2,
  birthday_day_of: true,
  birthday_filter: "all",
  event_enabled: true,
  event_custom_reminders: [60, 30],
  whatsapp: false,
  email_channel: true,
  sms: false,
};

export default function SettingsPage() {
  const router = useRouter();
  const { theme, setTheme } = useTheme();

  const [user, setUser] = useState<UserProfile>({});
  const [calStatus, setCalStatus] = useState<CalendarStatus>({ connected: false });
  const [loadingUser, setLoadingUser] = useState(true);
  const [loadingCal, setLoadingCal] = useState(true);
  const [loadingNotif, setLoadingNotif] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savedOk, setSavedOk] = useState(false);

  const [notif, setNotif] = useState<NotifSettings>(DEFAULT_NOTIF);

  // Reminder input state
  const [meetingInput, setMeetingInput] = useState("");
  const [eventInput, setEventInput] = useState("");

  useEffect(() => {
    fetch("/api/users/me")
      .then((r) => r.json())
      .then((d) => setUser(d || {}))
      .catch(() => { })
      .finally(() => setLoadingUser(false));

    fetch("/api/auth/google/status")
      .then((r) => r.json())
      .then((d) => setCalStatus(d || { connected: false }))
      .catch(() => { })
      .finally(() => setLoadingCal(false));

    fetch("/api/users/notification-settings")
      .then((r) => r.json())
      .then((d) => {
        if (d && !d.error) {
          setNotif((prev) => ({
            ...prev,
            meeting_enabled: d.meeting_enabled ?? true,
            meeting_custom_reminders: Array.isArray(d.meeting_custom_reminders) ? d.meeting_custom_reminders : [60, 30, 0],
            meeting_end_alert: d.meeting_end_alert ?? true,
            birthday_enabled: d.birthday_enabled ?? true,
            birthday_days_before: typeof d.birthday_days_before === "number" ? d.birthday_days_before : 2,
            birthday_day_of: d.birthday_day_of ?? true,
            birthday_filter: d.birthday_filter ?? "all",
            event_enabled: d.event_enabled ?? true,
            event_custom_reminders: Array.isArray(d.event_custom_reminders) ? d.event_custom_reminders : [60, 30],
          }));
        }
      })
      .catch(() => { })
      .finally(() => setLoadingNotif(false));
  }, []);

  const saveNotifSettings = useCallback(async () => {
    setSaving(true);
    setSavedOk(false);
    try {
      const res = await fetch("/api/users/notification-settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          meeting_enabled: notif.meeting_enabled,
          meeting_custom_reminders: notif.meeting_custom_reminders,
          meeting_end_alert: notif.meeting_end_alert,
          birthday_enabled: notif.birthday_enabled,
          birthday_days_before: notif.birthday_days_before,
          birthday_day_of: notif.birthday_day_of,
          birthday_filter: notif.birthday_filter,
          event_enabled: notif.event_enabled,
          event_custom_reminders: notif.event_custom_reminders,
        }),
      });
      if (res.ok) setSavedOk(true);
    } catch { }
    setSaving(false);
    setTimeout(() => setSavedOk(false), 3000);
  }, [notif]);

  const addMeetingReminder = () => {
    const m = parseInt(meetingInput.trim(), 10);
    if (!isNaN(m) && m >= 0 && !notif.meeting_custom_reminders.includes(m)) {
      setNotif((p) => ({
        ...p,
        meeting_custom_reminders: [...p.meeting_custom_reminders, m].sort((a, b) => b - a),
      }));
    }
    setMeetingInput("");
  };

  const removeMeetingReminder = (m: number) =>
    setNotif((p) => ({ ...p, meeting_custom_reminders: p.meeting_custom_reminders.filter((x) => x !== m) }));

  const addEventReminder = () => {
    const m = parseInt(eventInput.trim(), 10);
    if (!isNaN(m) && m >= 0 && !notif.event_custom_reminders.includes(m)) {
      setNotif((p) => ({
        ...p,
        event_custom_reminders: [...p.event_custom_reminders, m].sort((a, b) => b - a),
      }));
    }
    setEventInput("");
  };

  const removeEventReminder = (m: number) =>
    setNotif((p) => ({ ...p, event_custom_reminders: p.event_custom_reminders.filter((x) => x !== m) }));

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
    <div className="premium-page mx-auto w-full px-4">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 lg:gap-7 lg:items-start">
        {/* ── LEFT COLUMN (sticky) ──────────────────────────────────── */}
        <div className="flex flex-col gap-5 lg:col-span-5 xl:col-span-4 lg:sticky lg:top-6">
          <div className="mb-5">
            <h1 className="text-2xl font-bold tracking-tight text-foreground">Settings</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Manage your account, integrations, and preferences.
            </p>
          </div>
          {/* Profile card */}
          <section>
            <div className="premium-surface overflow-hidden rounded-xl border">
              <div className="h-14 bg-[#1d4ed8]" />
              <div className="px-4 pb-4">
                <div className="-mt-8 flex items-end justify-between">
                  <div className="flex h-16 w-16 items-center justify-center rounded-xl border-4 border-background bg-primary text-xl font-bold text-primary-foreground shadow-sm">
                    {loadingUser ? "…" : initials}
                  </div>
                  {user.role && (
                    <Badge className="mb-1 border-border bg-secondary px-2 py-0.5 text-xs text-primary">
                      {roleLabel(user.role)}
                    </Badge>
                  )}
                </div>
                <div className="mt-3">
                  <p className="text-lg font-bold text-foreground">
                    {loadingUser ? "Loading…" : displayName}
                  </p>
                  {user.email && (
                    <p className="mt-1 flex items-center gap-2 text-sm text-muted-foreground">
                      <Mail className="h-4 w-4" />
                      {user.email}
                    </p>
                  )}
                  {user.username && (
                    <p className="mt-1 flex items-center gap-2 text-sm text-muted-foreground">
                      <User className="h-4 w-4" />@{user.username}
                    </p>
                  )}
                </div>
              </div>
            </div>
          </section>

          {/* Appearance */}
          <section>
            <SectionHeader icon={Sun} title="Appearance" />
            <div className="premium-panel overflow-hidden rounded-xl border">
              <div className="p-3">
                <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Theme</p>
                <div className="grid grid-cols-3 gap-2">
                  {(["light", "dark", "system"] as const).map((t) => {
                    const Icon = t === "light" ? Sun : t === "dark" ? Moon : Monitor;
                    const active = theme === t;
                    return (
                      <Button
                        key={t}
                        onClick={() => setTheme(t)}
                        variant="outline"
                        suppressHydrationWarning
                        className={`h-auto flex-col items-center gap-1.5 rounded-lg border p-3 text-xs font-medium transition-all ${active
                          ? "border-primary bg-secondary text-primary ring-1 ring-ring/20"
                          : "border-border text-muted-foreground hover:border-primary/30 hover:text-foreground"
                          }`}
                      >
                        <Icon className="h-4 w-4" suppressHydrationWarning />
                        <span className="capitalize" suppressHydrationWarning>{t}</span>
                      </Button>
                    );
                  })}
                </div>
              </div>
            </div>
          </section>

          {/* Security */}
          <section>
            <SectionHeader icon={Shield} title="Security" />
            <div className="premium-panel divide-y divide-border overflow-hidden rounded-xl border">
              <SettingsRow icon={Lock} label="Change password" />
              <SettingsRow icon={Shield} label="Active sessions" />
            </div>
          </section>

          {/* About */}
          <section>
            <SectionHeader icon={Info} title="About" />
            <div className="premium-panel divide-y divide-border overflow-hidden rounded-xl border">
              <InfoRow label="App name" value="BCL Meetings" />
              <InfoRow label="Version" value="v1.0.0" />
              <InfoRow label="Organisation" value="Booksmart Consult Limited" />
            </div>
          </section>

          <Button
            variant="outline"
            className="w-full gap-2 border-red-200 bg-background py-3 text-red-600 shadow-sm transition-colors hover:bg-red-50 hover:text-red-700"
            onClick={handleLogout}
          >
            <LogOut className="h-4 w-4" />
            Sign out
          </Button>
        </div>

        {/* ── RIGHT COLUMN ──────────────────────────────────────────── */}
        <div className="flex flex-col gap-5 lg:col-span-7 xl:col-span-8 lg:max-h-[calc(100vh-6rem)] lg:overflow-y-auto lg:pr-2 py-6">

          {/* Google Calendar */}
          <section>
            <SectionHeader icon={Calendar} title="Integrations" />
            <div className="premium-panel overflow-hidden rounded-xl border">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between p-4 gap-3">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-secondary">
                    <Calendar className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <p className="text-base font-semibold text-foreground">Google Calendar Sync</p>
                    {loadingCal ? (
                      <p className="mt-1 text-sm text-muted-foreground">Checking status…</p>
                    ) : calStatus.connected ? (
                      <p className="mt-1 flex items-center gap-1.5 text-sm font-medium text-primary">
                        <CheckCircle className="h-4 w-4" />
                        Connected{calStatus.email ? ` · ${calStatus.email}` : ""}
                      </p>
                    ) : (
                      <p className="mt-1 flex items-center gap-1.5 text-sm text-muted-foreground">
                        <XCircle className="h-4 w-4" />
                        Not connected
                      </p>
                    )}
                  </div>
                </div>
                {!loadingCal && (calStatus.connected ? (
                  <Button variant="outline" onClick={handleCalDisconnect} className="border-red-200 text-red-600 hover:bg-red-50">
                    Disconnect
                  </Button>
                ) : (
                  <Button onClick={handleCalConnect} className="bg-primary text-primary-foreground hover:bg-primary/90">
                    Connect Calendar
                  </Button>
                ))}
              </div>
              <div className="border-t border-border bg-secondary/50 px-4 py-3">
                <p className="text-xs text-muted-foreground">
                  Meetings you create are automatically synced to your Google Calendar when connected.
                </p>
              </div>
            </div>
          </section>

          {/* ── NOTIFICATION SETTINGS ───────────────────────────────── */}
          <section>
            <div className="mb-2 flex items-center justify-between px-1">
              <div className="flex items-center gap-1.5">
                <Bell className="h-3.5 w-3.5 text-muted-foreground" />
                <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Configure Alerts</p>
              </div>
              <Button
                size="sm"
                onClick={saveNotifSettings}
                disabled={saving || loadingNotif}
                className="h-8 gap-1.5 px-3 text-xs"
              >
                <Save className="h-3.5 w-3.5" />
                {saving ? "Saving…" : savedOk ? "Saved ✓" : "Save"}
              </Button>
            </div>

            <div className="premium-panel overflow-hidden rounded-xl border divide-y divide-border">

              {/* ── Meetings ──────────────────────────────────────────── */}
              <div className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-semibold text-foreground">Meeting Alerts</p>
                    <p className="mt-0.5 text-xs text-muted-foreground">Reminders for booked meetings</p>
                  </div>
                  <Switch
                    checked={notif.meeting_enabled}
                    onCheckedChange={(v) => setNotif((p) => ({ ...p, meeting_enabled: v }))}
                  />
                </div>

                {notif.meeting_enabled && (
                  <div className="mt-3 space-y-3 pl-2 border-l-2 border-primary/20">
                    <div>
                      <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                        Reminders before slot / departure time
                      </p>
                      <ReminderChips
                        reminders={notif.meeting_custom_reminders}
                        onRemove={removeMeetingReminder}
                      />
                      <AddReminderInput
                        value={meetingInput}
                        onChange={setMeetingInput}
                        onAdd={addMeetingReminder}
                        placeholder="e.g. 5, 15, 120 minutes"
                      />
                    </div>

                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-foreground">End Alert</p>
                        <p className="text-xs text-muted-foreground">10 min before end</p>
                      </div>
                      <Switch
                        checked={notif.meeting_end_alert}
                        onCheckedChange={(v) => setNotif((p) => ({ ...p, meeting_end_alert: v }))}
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* ── Events ────────────────────────────────────────────── */}
              <div className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-semibold text-foreground">Event Alerts</p>
                    <p className="mt-0.5 text-xs text-muted-foreground">Reminders for registered events</p>
                  </div>
                  <Switch
                    checked={notif.event_enabled}
                    onCheckedChange={(v) => setNotif((p) => ({ ...p, event_enabled: v }))}
                  />
                </div>

                {notif.event_enabled && (
                  <div className="mt-3 pl-2 border-l-2 border-primary/20 space-y-2">
                    <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                      Reminders before event start
                    </p>
                    <ReminderChips
                      reminders={notif.event_custom_reminders}
                      onRemove={removeEventReminder}
                    />
                    <AddReminderInput
                      value={eventInput}
                      onChange={setEventInput}
                      onAdd={addEventReminder}
                      placeholder="e.g. 5, 15, 120 minutes"
                    />
                  </div>
                )}
              </div>

              {/* ── Birthdays ─────────────────────────────────────────── */}
              <div className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-semibold text-foreground">Birthday Alerts</p>
                    <p className="mt-0.5 text-xs text-muted-foreground">Reminders for contacts' birthdays</p>
                  </div>
                  <Switch
                    checked={notif.birthday_enabled}
                    onCheckedChange={(v) => setNotif((p) => ({ ...p, birthday_enabled: v }))}
                  />
                </div>

                {notif.birthday_enabled && (
                  <div className="mt-3 space-y-3 pl-2 border-l-2 border-primary/20">

                    {/* ── Who to notify filter ─────────────────────────── */}
                    <div>
                      <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                        Who to notify about
                      </p>
                      <div className="flex flex-wrap gap-1.5">
                        {(["all", "wishes", "no_wish"] as const).map((value) => {
                          const label = value === "all" ? "All" : value === "wishes" ? "With Wishes" : "Without Wishes";
                          const active = notif.birthday_filter === value;
                          return (
                            <button
                              key={value}
                              onClick={() => setNotif((p) => ({ ...p, birthday_filter: value }))}
                              className={`rounded-lg border px-2.5 py-1 text-xs font-medium transition-all ${
                                active
                                  ? "border-pink-400 bg-pink-500/10 text-pink-500"
                                  : "border-border bg-secondary/50 text-muted-foreground hover:border-pink-400/30 hover:text-foreground"
                              }`}
                            >
                              {label}
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* ── Prep days selector ───────────────────────────── */}
                    <div>
                      <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                        Preparation reminder (business days before)
                      </p>
                      <div className="flex flex-wrap gap-1.5">
                        {[0, 1, 2, 3, 5, 7].map((days) => {
                          const active = notif.birthday_days_before === days;
                          return (
                            <button
                              key={days}
                              onClick={() => setNotif((p) => ({ ...p, birthday_days_before: days }))}
                              className={`rounded-lg border px-2.5 py-1 text-xs font-medium transition-all ${
                                active
                                  ? "border-pink-400 bg-pink-500/10 text-pink-500"
                                  : "border-border bg-secondary/50 text-muted-foreground hover:border-pink-400/30 hover:text-foreground"
                              }`}
                            >
                              {days === 0 ? "Off" : days}
                            </button>
                          );
                        })}
                      </div>
                      <p className="mt-1 text-[11px] text-muted-foreground">
                        {notif.birthday_days_before === 0
                          ? "Disabled"
                          : `At 9 AM, ${notif.birthday_days_before} business day${notif.birthday_days_before > 1 ? "s" : ""} before (cake/gift only)`}
                      </p>
                    </div>

                    {/* ── Day of toggle ────────────────────────────────── */}
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-foreground">Day Of</p>
                        <p className="text-xs text-muted-foreground">Birthday greeting at 9:00 AM</p>
                      </div>
                      <Switch
                        checked={notif.birthday_day_of}
                        onCheckedChange={(v) => setNotif((p) => ({ ...p, birthday_day_of: v }))}
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>
          </section>

          {/* ── DELIVERY CHANNELS ─────────────────────────────────────── */}
          <section>
            <SectionHeader icon={MessageSquare} title="Notification Channels" />
            <div className="premium-panel divide-y divide-border overflow-hidden rounded-xl border">
              <NotifToggle
                icon={MessageSquare}
                iconBg="bg-green-50"
                iconColor="text-green-600"
                label="WhatsApp Alerts"
                description="Receive meeting alerts and updates instantly via WhatsApp."
                checked={notif.whatsapp}
                onChange={(v) => setNotif((p) => ({ ...p, whatsapp: v }))}
              />
              <NotifToggle
                icon={Mail}
                iconBg="bg-secondary"
                iconColor="text-primary"
                label="Email Notifications"
                description="Receive detailed meeting invites and alerts via your registered email."
                checked={notif.email_channel}
                onChange={(v) => setNotif((p) => ({ ...p, email_channel: v }))}
              />
              <NotifToggle
                icon={Smartphone}
                iconBg="bg-secondary"
                iconColor="text-muted-foreground"
                label="SMS Texts"
                description="Receive standard text messages for urgent meeting alerts."
                checked={notif.sms}
                onChange={(v) => setNotif((p) => ({ ...p, sms: v }))}
              />
            </div>
          </section>

        </div>
      </div>
    </div>
  );
}

// ── Sub-components ────────────────────────────────────────────────────────────

function ReminderChips({ reminders, onRemove }: { reminders: number[]; onRemove: (m: number) => void }) {
  if (reminders.length === 0) {
    return <p className="text-xs text-muted-foreground italic">No reminders set — add one below.</p>;
  }
  return (
    <div className="flex flex-wrap gap-1.5 mb-2">
      {reminders.map((m) => (
        <span
          key={m}
          className="inline-flex items-center gap-1 rounded-full border border-primary/30 bg-primary/10 px-2 py-0.5 text-xs font-semibold text-primary"
        >
          {formatMinutes(m)}
          <button
            onClick={() => onRemove(m)}
            className="ml-0.5 rounded-full p-0.5 hover:bg-primary/20 transition-colors"
            aria-label={`Remove ${formatMinutes(m)} reminder`}
          >
            <X className="h-3 w-3" />
          </button>
        </span>
      ))}
    </div>
  );
}

function AddReminderInput({
  value,
  onChange,
  onAdd,
  placeholder,
}: {
  value: string;
  onChange: (v: string) => void;
  onAdd: () => void;
  placeholder: string;
}) {
  const valid = !isNaN(parseInt(value.trim(), 10)) && parseInt(value.trim(), 10) >= 0;
  return (
    <div className="flex items-center gap-2">
      <Input
        type="number"
        min={0}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={(e) => e.key === "Enter" && valid && onAdd()}
        placeholder={placeholder}
        className="h-8 max-w-[200px] text-xs"
      />
      <Button
        size="sm"
        onClick={onAdd}
        disabled={!valid}
        className="h-8 gap-1 px-2.5 text-xs"
      >
        <Plus className="h-3.5 w-3.5" />
        Add
      </Button>
    </div>
  );
}

function formatMinutes(mins: number): string {
  if (mins === 0) return "At start";
  if (mins < 60) return `${mins} min`;
  if (mins === 60) return "1 hour";
  if (mins % 60 === 0) return `${mins / 60} hours`;
  return `${Math.floor(mins / 60)}h ${mins % 60}m`;
}

function SectionHeader({ icon: Icon, title }: { icon: React.ElementType; title: string }) {
  return (
    <div className="mb-2 flex items-center gap-1.5 px-1">
      <Icon className="h-3.5 w-3.5 text-muted-foreground" />
      <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">{title}</p>
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
    <div className="flex items-start gap-3 px-4 py-3 transition-colors hover:bg-secondary/60 sm:items-center">
      <div className={`mt-0.5 sm:mt-0 flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg ${iconBg}`}>
        <Icon className={`h-4 w-4 ${iconColor}`} />
      </div>
      <div className="min-w-0 flex-1 pr-3">
        <p className="text-sm font-semibold text-foreground">{label}</p>
        <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">{description}</p>
      </div>
      <div className="mt-1 sm:mt-0">
        <Switch checked={checked} onCheckedChange={onChange} />
      </div>
    </div>
  );
}

function SettingsRow({ icon: Icon, label }: { icon: React.ElementType; label: string }) {
  return (
    <div className="flex cursor-pointer items-center gap-3 px-4 py-3 transition-colors hover:bg-secondary/60">
      <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-secondary">
        <Icon className="h-4 w-4 text-muted-foreground" />
      </div>
      <p className="flex-1 text-sm font-semibold text-foreground">{label}</p>
      <ChevronRight className="h-5 w-5 text-muted-foreground" />
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between px-4 py-3">
      <p className="text-sm text-muted-foreground">{label}</p>
      <p className="text-sm font-medium text-foreground">{value}</p>
    </div>
  );
}
