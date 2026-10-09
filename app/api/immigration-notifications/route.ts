import { NextRequest, NextResponse } from "next/server";
import { supabase, resolveCallerUser, unauthorized } from "../meetings/_shared";

/**
 * GET /api/immigration-notifications[?limit=500]
 *
 * The EFNS immigration notifications and payment invoices for the BCL mobile app: the two tables the
 * EFNS automation writes (immigration_notifications, immigration_payments) and posts to its WhatsApp
 * group, newest first. Rows read the same as on accounting-task-manager's Immigration Notifications
 * page (lib/immigrationNotifications.ts there): the same short statuses, permit-type groups and PDFs.
 */

const BUCKET = "immigration";
const NOTIFICATION_PDF_PREFIX = "daily-extractions/notification_pdfs";
const PAYMENT_PDF_PREFIX = "daily-extractions/payment_instructions";
const MAX_LIMIT = 2000;

// The automation's UtilityHelpers.getShortMessage, so a status reads as it does in the WhatsApp group.
function shortNotifStatus(full: string): string {
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

function paymentPermitGroup(category: string): string {
  const key = category.trim().toLowerCase();
  if (!key) return "OTHER";
  return PAYMENT_PERMIT_GROUP[key] ?? key.toUpperCase();
}

/** "2026-10-08…" → "08/10/2026". */
function displayDate(raw: unknown): string {
  const m = /^(\d{4})[/-](\d{2})[/-](\d{2})/.exec(String(raw ?? "").trim());
  return m ? `${m[3]}/${m[2]}/${m[1]}` : "";
}

function pdfUrl(prefix: string, name: unknown): string | null {
  if (!name) return null;
  return supabase.storage.from(BUCKET).getPublicUrl(`${prefix}/${name}`).data?.publicUrl ?? null;
}

export async function GET(request: NextRequest) {
  const caller = await resolveCallerUser(request);
  if (!caller) return unauthorized();

  const requested = parseInt(request.nextUrl.searchParams.get("limit") ?? "500", 10);
  const limit = Math.min(Math.max(Number.isFinite(requested) ? requested : 500, 1), MAX_LIMIT);

  const [notifications, payments] = await Promise.all([
    supabase.from("immigration_notifications").select("*").order("created_at", { ascending: false }).limit(limit),
    supabase.from("immigration_payments").select("*").order("created_at", { ascending: false }).limit(limit),
  ]);
  if (notifications.error || payments.error) {
    return NextResponse.json({ error: (notifications.error ?? payments.error)!.message }, { status: 500 });
  }

  const items = [
    ...(notifications.data ?? []).map((row: any) => {
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
        pdf_url: pdfUrl(NOTIFICATION_PDF_PREFIX, row.pdf_file_name),
        created_at: row.created_at ?? null,
      };
    }),
    ...(payments.data ?? []).map((row: any) => {
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
        pdf_url: pdfUrl(PAYMENT_PDF_PREFIX, row.payment_instructions_file_name),
        created_at: row.created_at ?? null,
      };
    }),
  ]
    .sort((a, b) => String(b.created_at ?? "").localeCompare(String(a.created_at ?? "")))
    .slice(0, limit);

  return NextResponse.json({ items });
}
