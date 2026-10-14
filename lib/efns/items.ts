import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Turning the two EFNS tables' rows into the items the mobile app and the push signal agree on.
 *
 * Split out of the GET route so /api/push/efns can ask the same question ("is there anything new?")
 * using exactly the same tables and cursor fields — one definition of what an EFNS item is.
 */

export const IMMIGRATION_BUCKET = "immigration";
export const NOTIFICATION_PDF_PREFIX = "daily-extractions/notification_pdfs";
export const PAYMENT_PDF_PREFIX = "daily-extractions/payment_instructions";

export const NOTIFICATIONS_TABLE = "immigration_notifications";
export const PAYMENTS_TABLE = "immigration_payments";

/** The automation's UtilityHelpers.getShortMessage, so a status reads as it does in the WhatsApp group. */
export function shortNotifStatus(full: string): string {
  const m = (full || "").toLowerCase();
  if (m.includes("received")) return "APPLICATION RECEIVED";
  if (m.includes("deferred")) return "APPLICATION DEFERRED";
  if (m.includes("issued")) return "ISSUED";
  if (m.includes("invoice")) return "INVOICE";
  if (m.includes("cancellation")) return "CANCELLED";
  if (m.includes("reminder")) return "REMINDER";
  if (m.includes("approved")) return "APPROVED";
  if (m.includes("upload")) return "UPLOAD REQUIRED";
  if (m.includes("progress")) return "IN PROGRESS";
  if (m.includes("complied")) return "COMPILED";
  if (m.includes("edit")) return "TO BE EDITED";
  return "NOTIFICATION";
}

// Payments carry an application category; map it onto the notifications' permit groups.
const PAYMENT_PERMIT_GROUP: Record<string, string> = {
  "permit issuance/renewal": "PERMIT",
  "permit renewal": "PERMIT",
  "permit issuance": "PERMIT",
  "dependent's pass": "DEPENDANT PASS",
  "dependant pass": "DEPENDANT PASS",
  "dependant's pass": "DEPENDANT PASS",
  "children & dependants": "DEPENDANT PASS",
  "special pass": "SPECIAL PASS",
  "foreign national application": "FNS",
  "foreign national certificate": "FNS",
  "permanent residence": "PERMANENT RESIDENCE",
  "extension of a visitor's pass": "VISITOR'S PASS",
  "re-entry pass application": "RE-ENTRY PASS",
  "lawful residents": "LAWFUL RESIDENT",
  "citizenship by marriage": "CITIZENSHIP",
  "persons with disability": "OTHER",
};

export function paymentPermitGroup(category: string): string {
  const key = category.trim().toLowerCase();
  if (!key) return "OTHER";
  return PAYMENT_PERMIT_GROUP[key] ?? key.toUpperCase();
}

/** "2026-10-08…" → "08/10/2026". */
export function displayDate(raw: unknown): string {
  const m = /^(\d{4})[/-](\d{2})[/-](\d{2})/.exec(String(raw ?? "").trim());
  return m ? `${m[3]}/${m[2]}/${m[1]}` : "";
}

function pdfUrl(supabase: SupabaseClient, prefix: string, name: unknown): string | null {
  if (!name) return null;
  return supabase.storage.from(IMMIGRATION_BUCKET).getPublicUrl(`${prefix}/${name}`).data?.publicUrl ?? null;
}

export type EfnsItem = {
  key: string;
  kind: "notification" | "payment";
  name: string;
  application_type: string;
  permit_group: string;
  status: string;
  date: string;
  message: string;
  fee_type: string;
  amount: string;
  pdf_url: string | null;
  created_at: string | null;
};

export function notificationRowToItem(supabase: SupabaseClient, row: any): EfnsItem {
  const permitType = String(row.permit_type || row.case_type || "").trim();
  return {
    key: `n-${row.id}`,
    kind: "notification",
    name: String(row.name || "Unknown"),
    application_type: permitType || "Notification",
    permit_group: permitType ? permitType.toUpperCase() : "NOTIFICATION",
    status: shortNotifStatus(String(row.message || "")),
    date: displayDate(row.date),
    message: String(row.message || ""),
    fee_type: "",
    amount: "",
    pdf_url: pdfUrl(supabase, NOTIFICATION_PDF_PREFIX, row.pdf_file_name),
    created_at: row.created_at ?? null,
  };
}

export function paymentRowToItem(supabase: SupabaseClient, row: any): EfnsItem {
  const category = String(row.application_category || row.application_name || "").trim();
  const amount = row.payment_amount ?? row.amount;
  return {
    key: `p-${row.id}`,
    kind: "payment",
    name: String(row.applicant_name || row.application_name || "Unknown"),
    application_type: category || "Payment",
    permit_group: paymentPermitGroup(category),
    status: String(row.invoice_status || "Not Paid").toUpperCase(),
    date: displayDate(row.date_issued),
    message: String(row.fee_type || ""),
    fee_type: String(row.fee_type || ""),
    amount: amount != null && amount !== "" ? String(amount) : "",
    pdf_url: pdfUrl(supabase, PAYMENT_PDF_PREFIX, row.payment_instructions_file_name),
    created_at: row.created_at ?? null,
  };
}

/** Both tables, merged and newest first, capped at [limit] — the GET route's response body. */
/** Newest first. [since] (an ISO time): only rows written after it — the app's push-triggered check. */
export async function fetchEfnsItems(supabase: SupabaseClient, limit: number, since?: string | null): Promise<EfnsItem[]> {
  const recent = (table: string) => {
    let q = supabase.from(table).select("*").order("created_at", { ascending: false }).limit(limit);
    if (since) q = q.gt("created_at", since);
    return q;
  };
  const [notifications, payments] = await Promise.all([recent(NOTIFICATIONS_TABLE), recent(PAYMENTS_TABLE)]);
  if (notifications.error || payments.error) {
    throw new Error((notifications.error ?? payments.error)!.message);
  }

  return [
    ...(notifications.data ?? []).map((row: any) => notificationRowToItem(supabase, row)),
    ...(payments.data ?? []).map((row: any) => paymentRowToItem(supabase, row)),
  ]
    .sort((a, b) => String(b.created_at ?? "").localeCompare(String(a.created_at ?? "")))
    .slice(0, limit);
}
