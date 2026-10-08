import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import { isAdminRole as isAdminRoleCheck } from "@/lib/auth/roles";

export const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function normaliseBclAttendee(raw: unknown): string[] {
  if (Array.isArray(raw)) return raw.map(String).filter(Boolean);
  if (typeof raw === "string" && raw.trim()) {
    try {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed.map(String).filter(Boolean);
    } catch {
      return [raw.trim()];
    }
  }
  return [];
}

export async function enrichWithAttendeeNames(meetings: any[]): Promise<any[]> {
  const allIds = new Set<string>();
  for (const m of meetings) {
    const ids = normaliseBclAttendee(m.bcl_attendee);
    ids.filter((v) => UUID_RE.test(v)).forEach((v) => allIds.add(v));
  }

  const nameMap: Record<string, string> = {};
  if (allIds.size > 0) {
    const { data: users } = await supabase
      .from("scanner_users")
      .select("id, first_name, last_name, username")
      .in("id", Array.from(allIds));
    for (const u of users ?? []) {
      nameMap[u.id] =
        [u.first_name, u.last_name].filter(Boolean).join(" ") || u.username || u.id;
    }
  }

  return meetings.map((m) => {
    const ids = normaliseBclAttendee(m.bcl_attendee);
    const info = ids.map((id) => ({ id, name: nameMap[id] ?? id }));
    // Meetings from the old system have no attendee ids, only a plain name in bcl_attendee_older.
    const legacyName = typeof m.bcl_attendee_older === "string" ? m.bcl_attendee_older.trim() : "";
    return {
      ...m,
      bcl_attendees_info: info,
      bcl_attendee_name: info[0]?.name ?? (legacyName || null),
    };
  });
}

// ── Auto-end ─────────────────────────────────────────────────────────────────
// A meeting or event whose end time passed AUTO_END_GRACE_MINUTES ago, and that nobody ended,
// extended or completed, is saved as 'ended'. That status says the time ran out, not that the
// meeting happened: users can still mark it completed or no-show afterwards.

export const AUTO_END_GRACE_MINUTES = 30;
// Statuses that are still waiting on someone. Stored values vary in case ('Upcoming').
const AUTO_END_FROM = ["upcoming", "Upcoming", "confirmed", "rescheduled", "pending_confirmation", "pending", "in_progress"];
// Dates and times are stored as local wall-clock values, so the cutoff is taken in the business's zone.
const APP_TIME_ZONE = process.env.APP_TIME_ZONE || "Africa/Nairobi";
const AUTO_END_INTERVAL_MS = 60_000;
const lastAutoEnd: Record<string, number> = {};

/** The local date ('YYYY-MM-DD') and time ('HH:MM') AUTO_END_GRACE_MINUTES ago. */
export function autoEndCutoff(now = new Date()) {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat("en-CA", {
      timeZone: APP_TIME_ZONE, year: "numeric", month: "2-digit", day: "2-digit",
      hour: "2-digit", minute: "2-digit", hourCycle: "h23",
    })
      .formatToParts(new Date(now.getTime() - AUTO_END_GRACE_MINUTES * 60_000))
      .map((p) => [p.type, p.value])
  );
  return { date: `${parts.year}-${parts.month}-${parts.day}`, time: `${parts.hour}:${parts.minute}` };
}

/**
 * Marks past, unclosed rows of `table` as 'ended'. Runs at most once a minute per table per server
 * instance; failures are logged and never block the read that triggered it.
 */
export async function autoEndPast(table: "bcl_meetings_meetings" | "bcl_events") {
  const started = Date.now();
  if (started - (lastAutoEnd[table] ?? 0) < AUTO_END_INTERVAL_MS) return;
  lastAutoEnd[table] = started;

  const [dateCol, endCol] = table === "bcl_events" ? ["event_date", "event_end_time"] : ["meeting_date", "meeting_end_time"];
  const { date, time } = autoEndCutoff();
  const { error } = await supabase
    .from(table)
    .update({ status: "ended" })
    .in("status", AUTO_END_FROM)
    .or(`${dateCol}.lt.${date},and(${dateCol}.eq.${date},${endCol}.lte.${time})`);
  if (error) console.error(`[auto-end] ${table}:`, error.message);
}

// Caller identity and admin rules live in lib/auth (shared with the pages):
//   resolveCallerUser — verified mobile token, web session, or (grace period) the old header
//   isAdminRole       — SuperAdmin, general_admin, company_admin
export { resolveCaller as resolveCallerUser, type CallerUser } from "@/lib/auth/caller";
export { isAdminRole } from "@/lib/auth/roles";

/** 401 for API routes that need to know who is calling. */
export function unauthorized() {
  return NextResponse.json({ error: "Authentication required" }, { status: 401 });
}

/**
 * Whether the caller may see one meeting or event — the same rule as the list scopes: admins see
 * everything; anyone else sees what they created, last updated, or attend.
 */
export function canSeeRecord(
  record: { created_by?: unknown; updated_by?: unknown; bcl_attendee?: unknown } | null,
  caller: { id: string; email: string; role: string }
): boolean {
  if (!record) return false;
  if (isAdminRoleCheck(caller.role)) return true;
  const mine = new Set([caller.id, caller.email].filter(Boolean));
  if (mine.has(String(record.created_by ?? "")) || mine.has(String(record.updated_by ?? ""))) return true;
  return normaliseBclAttendee(record.bcl_attendee).some((a) => mine.has(a));
}
