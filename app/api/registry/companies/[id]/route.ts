import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { resolveCallerUser, unauthorized } from "@/app/api/meetings/_shared";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

/**
 * GET /api/registry/companies/:id
 *
 * A company's profile for the mobile app: basic details (the registry company page's General /
 * Contact / Account manager / Address sections) and, for BCL staff, its Platform Credentials
 * (iTax, NSSF, SHIF, eCitizen…). Directors come from /api/registry/companies-with-individuals.
 *
 * Credentials are government-portal passwords, so they are returned only when:
 *   - the caller is BCL staff (any role except client / customer — no longer admins only), and
 *   - their identity is proven by a signed mobile token or a web session — never by the old
 *     unsigned x-scanner-user-id header (a guessable user id must not unlock passwords).
 * Every credentials read is logged.
 */

// Platform Credentials sections (components/formfields/company-form-fields.tsx), by column prefix.
const PLATFORMS: Array<{ title: string; prefix: string }> = [
  { title: "KRA iTax", prefix: "kra" },
  { title: "NSSF", prefix: "nssf" },
  { title: "NHIF", prefix: "nhif" },
  { title: "SHIF", prefix: "shif" },
  { title: "EFNS", prefix: "efns" },
  { title: "eCitizen", prefix: "ecitizen" },
  { title: "QuickBooks", prefix: "quickbooks" },
  { title: "KEBS", prefix: "kebs" },
  { title: "NITA", prefix: "nita" },
  { title: "NCC", prefix: "ncc" },
  { title: "NEA", prefix: "nea" },
];

// Basic details shown on the profile, as [section, column, label].
const BASIC_FIELDS: Array<[string, string, string]> = [
  ["General", "company_prefix", "Prefix"],
  ["General", "company_type", "Company type"],
  ["General", "company_classification", "Classification"],
  ["General", "itax_business_reg_cert_no", "Registration cert. no."],
  ["General", "itax_business_reg_date", "Registration date"],
  ["General", "industry", "Industry"],
  ["General", "nature_of_business", "Nature of business"],
  ["Contact", "office_phone_number", "Office phone"],
  ["Contact", "current_communication_email", "Email"],
  ["Contact", "alternative_email_address", "Alternative email"],
  ["Contact", "broadcast_whatsapp_number", "WhatsApp"],
  ["Contact", "website", "Website"],
  ["Account manager", "account_manager_name", "Name"],
  ["Account manager", "account_manager_email", "Email"],
  ["Account manager", "account_manager_phone_number", "Phone"],
  ["Office accountant", "office_accountant_name", "Name"],
  ["Office accountant", "office_accountant_email", "Email"],
  ["Office accountant", "office_accountant_phone_number", "Phone"],
  ["Address", "full_physical_address", "Physical address"],
  ["Address", "town", "Town"],
  ["Address", "full_postal_address", "Postal address"],
];

// The registry's "Company Logo" document type (acc_portal_kyc) — the logo the web company page shows.
const COMPANY_LOGO_DOC_ID = "f7a75607-bff9-4995-8bde-0256e86da435";
const KYC_BUCKET = "kyc-documents";

// Client categories, as the registry's lib/categoryUtils categoryMeta.
const CLIENT_CATEGORIES: Array<{ label: string; value: string }> = [
  { label: "ACC", value: "acc" },
  { label: "IMM", value: "imm" },
  { label: "Audit", value: "audit" },
  { label: "Sheria", value: "sheria" },
];

/** yyyy-mm-dd, dd/mm/yyyy or dd.mm.yyyy (the registry stores both). */
function parseDate(s: string): Date | null {
  if (!s || s === "N/A") return null;
  const dmy = s.match(/^(\d{1,2})[./-](\d{1,2})[./-](\d{4})$/);
  const d = dmy ? new Date(Number(dmy[3]), Number(dmy[2]) - 1, Number(dmy[1])) : new Date(s);
  return isNaN(d.getTime()) ? null : d;
}

/** The registry's calculateStatus: Active within [from, to], else Inactive; N/A without a start. */
function clientStatus(from: string, to: string): "Active" | "Inactive" | "N/A" {
  const f = parseDate(from);
  if (!f) return "N/A";
  const t = parseDate(to);
  const now = new Date();
  if (t) return now >= f && now <= t ? "Active" : "Inactive";
  return now >= f ? "Active" : "Inactive";
}

function text(v: unknown): string {
  if (v === null || v === undefined) return "";
  const s = String(v).trim();
  return s === "null" || s === "undefined" ? "" : s;
}

/** "nssf_otp_recovery_email_address" → "OTP recovery email address" (prefix dropped). */
function labelFor(column: string, prefix: string): string {
  if (column === "kra_pin") return "KRA PIN";
  return column
    .slice(prefix.length + 1)
    .replace(/_/g, " ")
    .replace(/\botp\b/i, "OTP")
    .replace(/^\w/, (c) => c.toUpperCase());
}

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const caller = await resolveCallerUser(req);
  if (!caller) return unauthorized();

  const { id } = await params;
  try {
    const { data: company, error } = await supabase
      .from("acc_portal_company_duplicate")
      .select("*")
      .eq("id", id)
      .maybeSingle();
    if (error) throw error;
    if (!company) return NextResponse.json({ error: "Company not found" }, { status: 404 });

    const details = BASIC_FIELDS
      .map(([section, column, label]) => ({ section, label, value: text((company as any)[column]) }))
      .filter((f) => f.value);
    // KRA PIN is an identifier, not a secret — shown with the basics (the iTax password stays in credentials).
    const kraPin = text((company as any).kra_pin);
    if (kraPin) details.unshift({ section: "General", label: "KRA PIN", value: kraPin });

    // Client categories BCL serves this company under, with the registry's Active/Inactive rule.
    const categories = CLIENT_CATEGORIES.map(({ label, value }) => {
      const from = text((company as any)[`${value}_client_effective_from`]);
      const to = text((company as any)[`${value}_client_effective_to`]);
      return { label, status: clientStatus(from, to), from, to };
    }).filter((c) => c.status !== "N/A");

    // The logo, as the web company page loads it: the active "Company Logo" upload, signed for an hour.
    let logoUrl: string | null = null;
    try {
      const { data: logoRows } = await supabase
        .from("acc_portal_kyc_uploads")
        .select("file_path")
        .eq("company_id", id)
        .eq("document_id", COMPANY_LOGO_DOC_ID)
        .eq("status", "active")
        .limit(1);
      const path = logoRows?.[0]?.file_path;
      if (path) {
        const { data: signed } = await supabase.storage.from(KYC_BUCKET).createSignedUrl(path, 3600);
        logoUrl = signed?.signedUrl ?? null;
      }
    } catch (e) {
      console.warn(`[registry/companies] logo for ${id}:`, e); // the profile still loads without it
    }

    const strongIdentity = /^Bearer\s+/i.test(req.headers.get("authorization") ?? "") || caller.source === "web";
    const role = String(caller.role ?? "").trim().toLowerCase();
    const canSeeCredentials = role !== "client" && role !== "customer" && strongIdentity;

    let credentials: Array<{ platform: string; fields: Array<{ label: string; value: string; secret: boolean }> }> | null = null;
    if (canSeeCredentials) {
      credentials = PLATFORMS.map(({ title, prefix }) => ({
        platform: title,
        fields: Object.keys(company)
          .filter((k) => k.startsWith(`${prefix}_`) && text((company as any)[k]))
          .map((k) => ({
            label: labelFor(k, prefix),
            value: text((company as any)[k]),
            secret: /password|otp_code/.test(k),
          })),
      })).filter((p) => p.fields.length > 0);
      console.info(`[registry/companies] credentials read: company=${id} by user=${caller.id}`);
    }

    return NextResponse.json(
      {
        id: String(company.id),
        name: text(company.company_name),
        logoUrl,
        categories,
        details,
        credentials,
        credentialsHidden: !canSeeCredentials,
      },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Failed to load company" }, { status: 500 });
  }
}
