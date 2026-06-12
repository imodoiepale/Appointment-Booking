import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

function extractIndividualContacts(contact_details: any) {
  let cd: any = {};
  if (Array.isArray(contact_details) && contact_details.length > 0) {
    cd = contact_details[0];
  } else if (contact_details && typeof contact_details === "object") {
    cd = contact_details;
  }
  const inner = cd.current ?? cd;
  return {
    email: inner.email?.primary || "",
    mobile: inner.phone?.kenyan?.primary || inner.phone?.abroad?.primary || "",
    whatsapp: inner.phone?.whatsapp || "",
  };
}

function extractCompanyContacts(contact_details: any) {
  let cd: any = {};
  if (Array.isArray(contact_details) && contact_details.length > 0) {
    cd = contact_details[0];
  } else if (contact_details && typeof contact_details === "object") {
    cd = contact_details;
  }
  return {
    email: cd.current_communication_email || cd.alternative_email_address || "",
    phone: cd.phone || cd.mobile || "",
  };
}

export async function GET() {
  try {
    const [companiesRes, individualsRes, employeesRes] = await Promise.all([
      supabase
        .from("acc_portal_company_duplicate")
        .select("id, company_name, contact_details")
        .order("company_name"),
      supabase
        .from("registry_individuals")
        .select("id, full_name, first_name, last_name, employment_data, contact_details"),
      supabase
        .from("registry_employees")
        .select("individual_id, company_id, employment_status, effective_start_date, effective_end_date"),
    ]);

    if (companiesRes.error) throw companiesRes.error;
    if (individualsRes.error) throw individualsRes.error;
    const employeesData = employeesRes.data ?? [];

    const today = new Date().toISOString().slice(0, 10);

    // Build individual lookup for quick name/contact access
    const individualMap = new Map<string, any>();
    for (const ind of individualsRes.data ?? []) {
      const contacts = extractIndividualContacts(ind.contact_details);
      const fullName = ind.full_name || [ind.first_name, ind.last_name].filter(Boolean).join(" ");
      individualMap.set(String(ind.id), { id: String(ind.id), name: fullName, hasContactDetails: !!(contacts.email || contacts.mobile), ...contacts });
    }

    // Build company → individuals map from employment_data.associations
    const companyIndividualsMap = new Map<string, Map<string, any>>();

    for (const ind of individualsRes.data ?? []) {
      const associations: any[] = ind.employment_data?.associations ?? [];
      for (const assoc of associations) {
        if (!assoc?.company_id) continue;
        const cid = String(assoc.company_id);
        if (!companyIndividualsMap.has(cid)) companyIndividualsMap.set(cid, new Map());
        const indData = individualMap.get(String(ind.id));
        if (indData) companyIndividualsMap.get(cid)!.set(indData.id, indData);
      }
    }

    // Merge registry_employees — add individuals linked via employees table (same logic as ClientsPage)
    for (const emp of employeesData) {
      const cid = String(emp.company_id);
      const iid = String(emp.individual_id);
      // Derive status
      const start = emp.effective_start_date ?? null;
      const end = emp.effective_end_date ?? null;
      const status =
        !start ? "inactive"
        : start > today ? "inactive"
        : end && end < today ? "terminated"
        : "active";
      if (status === "terminated") continue; // skip terminated employees
      const indData = individualMap.get(iid);
      if (!indData) continue;
      if (!companyIndividualsMap.has(cid)) companyIndividualsMap.set(cid, new Map());
      companyIndividualsMap.get(cid)!.set(indData.id, indData);
    }

    const companies = (companiesRes.data ?? [])
      .filter((c) => c.company_name?.trim())
      .map((c) => {
        const compContacts = extractCompanyContacts(c.contact_details);
        const individualsForCompany = [...(companyIndividualsMap.get(String(c.id))?.values() ?? [])];
        return {
          id: String(c.id),
          name: c.company_name,
          ...compContacts,
          individuals: individualsForCompany,
        };
      });

    return NextResponse.json(companies);
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || "Failed to fetch companies with individuals" },
      { status: 500 }
    );
  }
}
