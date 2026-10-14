import { NextRequest, NextResponse } from "next/server";
import { supabase, resolveCallerUser, unauthorized } from "../meetings/_shared";
import { fetchEfnsItems } from "@/lib/efns/items";

/**
 * GET /api/immigration-notifications[?limit=500][&since=<ISO time>]
 *
 * since: only rows written after that moment. The app's push-triggered check sends the newest
 * created_at it has seen, so a ping downloads a row or two instead of the whole recent list.
 *
 * The EFNS immigration notifications and payment invoices for the BCL mobile app: the two tables the
 * EFNS automation writes (immigration_notifications, immigration_payments) and posts to its WhatsApp
 * group, newest first. Rows read the same as on accounting-task-manager's Immigration Notifications
 * page (lib/immigrationNotifications.ts there): the same short statuses, permit-type groups and PDFs.
 *
 * Row → item shaping lives in lib/efns/items.ts so the push signal can ask the same tables the same
 * way.
 */

const MAX_LIMIT = 2000;

export async function GET(request: NextRequest) {
  const caller = await resolveCallerUser(request);
  if (!caller) return unauthorized();

  const requested = parseInt(request.nextUrl.searchParams.get("limit") ?? "500", 10);
  const limit = Math.min(Math.max(Number.isFinite(requested) ? requested : 500, 1), MAX_LIMIT);

  try {
    const sinceRaw = request.nextUrl.searchParams.get("since");
    const since = sinceRaw && !Number.isNaN(Date.parse(sinceRaw)) ? new Date(sinceRaw).toISOString() : null;
    return NextResponse.json({ items: await fetchEfnsItems(supabase, limit, since) });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message ?? "Failed to load EFNS notifications" }, { status: 500 });
  }
}
