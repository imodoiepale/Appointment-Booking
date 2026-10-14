import "server-only";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { getFirebaseAdminMessaging, isFirebaseMessagingConfigured } from "@/lib/firebase/admin";
import { NOTIFICATIONS_TABLE, PAYMENTS_TABLE } from "@/lib/efns/items";

/**
 * The EFNS rows land whenever the automation's hourly scrape writes them, so there is no clock to
 * schedule a notification against — the phone has to be told as the rows appear. This is the telling.
 *
 * A row insert (pg_net trigger, see supabase/migrations/20261014_efns_push.sql) POSTs to
 * /api/push/efns, which calls signalEfnsUpdate(): it looks for rows newer than bcl_push_cursor and —
 * if there are any — sends ONE tiny high-priority FCM data message to every registered device.
 *
 * The message carries no content on purpose. The phone reacts by running its existing
 * EfnsAlerts.check(), which fetches the list, drops anything already announced and posts a grouped
 * notification. So the payload stays a few dozen bytes, and a duplicate signal costs one wasted
 * request instead of a second notification.
 */

export const PUSH_DEVICES_TABLE = "bcl_push_devices";
export const PUSH_CURSOR_TABLE = "bcl_push_cursor";
/** Our rows in bcl_push_devices, so a broadcast can't reach another product's tokens. */
export const MEETINGS_ANDROID_APP = "bcl-meetings-android";

/** FCM caps a multicast at 500 registration tokens. */
const TOKEN_BATCH = 500;

/** Error codes that mean "throw this token away". */
const DEAD_TOKEN_CODES = new Set([
  "messaging/registration-token-not-registered",
  "messaging/invalid-registration-token",
  "messaging/argument-invalid",
]);
// Deliberately not "messaging/authentication-error": that one means OUR credentials are wrong, and
// treating it as dead tokens would quietly wipe every registered device.

export type SignalResult = {
  /** Rows newer than the cursor that this call found. */
  newRows: number;
  /** Devices the signal went out to. */
  sent: number;
  /** Dead tokens dropped from bcl_push_devices. */
  pruned: number;
  /** Set when the signal could not be sent (the 30-minute poll still covers it). */
  error?: string;
};

function db(): SupabaseClient {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
    auth: { persistSession: false },
  });
}

async function latestCreatedAtAfter(
  client: SupabaseClient,
  table: string,
  since: string,
): Promise<string | null> {
  const { data, error } = await client
    .from(table)
    .select("created_at")
    .gt("created_at", since)
    .order("created_at", { ascending: false })
    .limit(1);
  if (error) throw new Error(`${table}: ${error.message}`);
  const value = data?.[0]?.created_at;
  return value ? String(value) : null;
}

/**
 * Reads the cursor, creating it on first use with now() so a fresh install never replays the whole
 * back catalogue as a notification.
 */
async function readCursor(client: SupabaseClient): Promise<{ notification: string; payment: string }> {
  const { error: seedError } = await client
    .from(PUSH_CURSOR_TABLE)
    .upsert({ id: 1 }, { onConflict: "id", ignoreDuplicates: true });
  if (seedError) throw new Error(`cursor seed: ${seedError.message}`);

  const { data, error } = await client.from(PUSH_CURSOR_TABLE).select("*").eq("id", 1).single();
  if (error || !data) throw new Error(`cursor read: ${error?.message ?? "missing row"}`);
  return { notification: String(data.last_notification_pushed_at), payment: String(data.last_payment_pushed_at) };
}

async function writeCursor(
  client: SupabaseClient,
  cursor: { notification: string; payment: string },
): Promise<void> {
  const { error } = await client
    .from(PUSH_CURSOR_TABLE)
    .update({
      last_notification_pushed_at: cursor.notification,
      last_payment_pushed_at: cursor.payment,
      updated_at: new Date().toISOString(),
    })
    .eq("id", 1);
  if (error) throw new Error(`cursor write: ${error.message}`);
}

async function deviceTokens(client: SupabaseClient): Promise<string[]> {
  const { data, error } = await client.from(PUSH_DEVICES_TABLE).select("fcm_token").eq("app", MEETINGS_ANDROID_APP);
  if (error) throw new Error(`tokens: ${error.message}`);
  return (data ?? []).map((row) => String(row.fcm_token)).filter(Boolean);
}

async function dropTokens(client: SupabaseClient, tokens: string[]): Promise<number> {
  if (!tokens.length) return 0;
  const { error } = await client
    .from(PUSH_DEVICES_TABLE)
    .delete()
    .eq("app", MEETINGS_ANDROID_APP)
    .in("fcm_token", tokens);
  if (error) {
    console.warn("[push/efns] could not prune dead tokens:", error.message);
    return 0;
  }
  return tokens.length;
}

async function sendSignal(
  client: SupabaseClient,
  tokens: string[],
): Promise<{ sent: number; pruned: number }> {
  const messaging = getFirebaseAdminMessaging();
  const payload = { type: "efns", at: new Date().toISOString() };
  let sent = 0;
  const dead: string[] = [];

  for (let i = 0; i < tokens.length; i += TOKEN_BATCH) {
    const chunk = tokens.slice(i, i + TOKEN_BATCH);
    const result = await messaging.sendEachForMulticast({
      tokens: chunk,
      // Data-only: the phone renders the notification itself, so it can reuse EfnsAlerts' grouping
      // and mark the items seen — a payload would risk announcing the same row twice.
      data: payload,
      android: { priority: "high" },
    });
    sent += result.successCount;
    result.responses.forEach((response, index) => {
      const code = response.error?.code;
      if (code && DEAD_TOKEN_CODES.has(code)) dead.push(chunk[index]);
    });
  }

  // A signed-out phone or an uninstalled app leaves tokens behind; drop them so they don't
  // accumulate and drag down every later send.
  const pruned = await dropTokens(client, dead);
  return { sent, pruned };
}

/**
 * Looks for EFNS rows written since the last signal and, if there are any, pings every device.
 * Sends before advancing the cursor, so a failed send is retried by the next insert's trigger
 * (and the app's 30-minute poll is the fallback either way).
 */
export async function signalEfnsUpdate(): Promise<SignalResult> {
  const client = db();
  const cursor = await readCursor(client);

  const [latestNotification, latestPayment] = await Promise.all([
    latestCreatedAtAfter(client, NOTIFICATIONS_TABLE, cursor.notification),
    latestCreatedAtAfter(client, PAYMENTS_TABLE, cursor.payment),
  ]);

  const newRows = Number(Boolean(latestNotification)) + Number(Boolean(latestPayment));
  if (newRows === 0) return { newRows: 0, sent: 0, pruned: 0 };

  if (!isFirebaseMessagingConfigured()) {
    // Nothing to send with — advance anyway so every later insert doesn't pile onto this one.
    await writeCursor(client, {
      notification: latestNotification ?? cursor.notification,
      payment: latestPayment ?? cursor.payment,
    });
    console.warn("[push/efns] new EFNS rows but FIREBASE_* service-account vars are missing — skipped");
    return { newRows, sent: 0, pruned: 0, error: "firebase-not-configured" };
  }

  let tokens: string[];
  try {
    tokens = await deviceTokens(client);
  } catch (error: any) {
    return { newRows, sent: 0, pruned: 0, error: error?.message ?? "tokens-failed" };
  }
  if (tokens.length === 0) {
    await writeCursor(client, {
      notification: latestNotification ?? cursor.notification,
      payment: latestPayment ?? cursor.payment,
    });
    return { newRows, sent: 0, pruned: 0, error: "no-devices" };
  }

  try {
    const { sent, pruned } = await sendSignal(client, tokens);
    await writeCursor(client, {
      notification: latestNotification ?? cursor.notification,
      payment: latestPayment ?? cursor.payment,
    });
    console.log(`[push/efns] ${newRows} new row(s) → ${sent}/${tokens.length} device(s)`);
    return { newRows, sent, pruned };
  } catch (error: any) {
    console.error("[push/efns] send failed:", error?.message ?? error);
    return { newRows, sent: 0, pruned: 0, error: error?.message ?? "send-failed" };
  }
}
