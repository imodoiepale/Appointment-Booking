import { createClient } from "@supabase/supabase-js";

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
