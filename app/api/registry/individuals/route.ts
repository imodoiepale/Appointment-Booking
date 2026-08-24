import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

function extractContacts(contact_details: any) {
  let cd: any = {};
  if (Array.isArray(contact_details) && contact_details.length > 0) {
    cd = contact_details[0];
  } else if (contact_details && typeof contact_details === "object") {
    cd = contact_details;
  }
  // Handle nested current wrapper used in some records
  const inner = cd.current ?? cd;
  return {
    email: inner.email?.primary || "",
    mobile: inner.phone?.kenyan?.primary || inner.phone?.abroad?.primary || "",
    alt_mobile: inner.phone?.kenyan?.secondary || "",
    whatsapp: inner.phone?.whatsapp || "",
  };
}

export async function GET() {
  try {
    const [individualsRes, companiesRes, employeesRes] = await Promise.all([
      supabase
        .from("registry_individuals")
        .select("id, full_name, first_name, last_name, employment_data, contact_details")
        .order("full_name"),
      supabase
        .from("acc_portal_company_duplicate")
        .select("id, company_name"),
      supabase
        .from("registry_employees")
        .select("individual_id, company_id, job_title, position, effective_start_date, effective_end_date"),
    ]);

    if (individualsRes.error) throw individualsRes.error;
    if (companiesRes.error) throw companiesRes.error;
    if (employeesRes.error) console.error("[registry/individuals] registry_employees fetch failed:", employeesRes.error.message);
    const employeesData = employeesRes.data ?? [];

    const companyMap = new Map(
      (companiesRes.data ?? []).map((c) => [String(c.id), c.company_name ?? ""])
    );

    // registry_employees is the canonical source for the Employee relationship —
    // group by individual regardless of employment status (a past end date means
    // the record isn't current, not that it should be dropped).
    const empByIndividual = new Map<string, any[]>();
    for (const emp of employeesData) {
      const key = String(emp.individual_id);
      if (!empByIndividual.has(key)) empByIndividual.set(key, []);
      empByIndividual.get(key)!.push(emp);
    }

    const individuals = (individualsRes.data ?? []).map((ind) => {
      // Legacy "Employee" entries baked into employment_data.associations are stale —
      // registry_employees is the source of truth for that relationship (mirrors the
      // registry app's /api/registry-individuals).
      const associations: any[] = (ind.employment_data?.associations ?? [])
        .filter((a: any) => String(a?.individual_type ?? "").trim().toLowerCase() !== "employee");

      const empRecords = empByIndividual.get(String(ind.id)) ?? [];
      const employeeCompanies = empRecords.map((emp) => ({ company_id: String(emp.company_id), via_employee: true }));

      // Build final deduped company list
      const allCompanyEntries = [
        ...associations.filter((a: any) => a?.company_id).map((a: any) => ({ company_id: String(a.company_id), via_employee: false })),
        ...employeeCompanies,
      ];

      const seen = new Set<string>();
      const companies: Array<{ id: string; name: string }> = [];
      for (const entry of allCompanyEntries) {
        if (seen.has(entry.company_id)) continue;
        seen.add(entry.company_id);
        const name = companyMap.get(entry.company_id) ?? "";
        if (name) companies.push({ id: entry.company_id, name });
      }

      const contacts = extractContacts(ind.contact_details);
      const fullName =
        ind.full_name ||
        [ind.first_name, ind.last_name].filter(Boolean).join(" ");

      const roles = [
        ...associations
          .filter((a: any) => a?.company_id && a?.individual_type)
          .map((a: any) => ({
            companyId: String(a.company_id),
            companyName: companyMap.get(String(a.company_id)) ?? "",
            role: a.individual_type as string,
          })),
        ...empRecords.map((emp) => ({
          companyId: String(emp.company_id),
          companyName: companyMap.get(String(emp.company_id)) ?? "",
          role: "Employee",
        })),
      ];

      return {
        id: String(ind.id),
        name: fullName,
        companies,
        roles,
        hasContactDetails: !!(contacts.email || contacts.mobile),
        ...contacts,
      };
    });

    return NextResponse.json(individuals);
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || "Failed to fetch individuals" },
      { status: 500 }
    );
  }
}
