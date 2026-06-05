import { createClient } from "@supabase/supabase-js";
import { type NextRequest } from "next/server";
import { getAppSessionFromRequest } from "@/lib/auth/session";

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

  if (allIds.size === 0) return meetings;

  const { data: users } = await supabase
    .from("scanner_users")
    .select("id, first_name, last_name, username")
    .in("id", Array.from(allIds));

  const nameMap: Record<string, string> = {};
  for (const u of users ?? []) {
    nameMap[u.id] =
      [u.first_name, u.last_name].filter(Boolean).join(" ") || u.username || u.id;
  }

  return meetings.map((m) => {
    const ids = normaliseBclAttendee(m.bcl_attendee);
    const info = ids.map((id) => ({ id, name: nameMap[id] ?? id }));
    return {
      ...m,
      bcl_attendees_info: info,
      bcl_attendee_name: info[0]?.name ?? null,
    };
  });
}

export const ADMIN_ROLES = new Set(["company_admin", "SuperAdmin", "administrator"]);

export type CallerUser = { id: string; email: string; role: string };

/**
 * Resolve the calling user from mobile scanner headers OR Firebase session cookie.
 * Returns null when the caller cannot be identified.
 */
export async function resolveCallerUser(request: NextRequest): Promise<CallerUser | null> {
  // 1. Mobile app — custom request headers
  const mobileId = request.headers.get("x-scanner-user-id") ?? "";
  if (mobileId) {
    return {
      id: mobileId,
      email: request.headers.get("x-scanner-user-email") ?? "",
      role: request.headers.get("x-scanner-user-role") ?? "user",
    };
  }

  // 2. Web app — Firebase session cookie
  try {
    const session = await getAppSessionFromRequest(request);
    if (!session) return null;

    const { data } = await supabase
      .from("scanner_users")
      .select("id, email, role")
      .eq("firebase_uid", session.user.firebaseUid)
      .single();

    if (data) return { id: String(data.id), email: data.email ?? "", role: data.role ?? "user" };
  } catch {}

  return null;
}
