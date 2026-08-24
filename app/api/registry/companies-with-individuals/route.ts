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
        .select("individual_id, company_id, effective_start_date, effective_end_date"),
    ]);

    if (companiesRes.error) throw companiesRes.error;
    if (individualsRes.error) throw individualsRes.error;
    if (employeesRes.error) console.error("[registry/companies-with-individuals] registry_employees fetch failed:", employeesRes.error.message);
    const employeesData = employeesRes.data ?? [];

    // Build individual lookup for quick name/contact access
    const individualMap = new Map<string, any>();
    for (const ind of individualsRes.data ?? []) {
      const contacts = extractIndividualContacts(ind.contact_details);
      const fullName = ind.full_name || [ind.first_name, ind.last_name].filter(Boolean).join(" ");
      individualMap.set(String(ind.id), { id: String(ind.id), name: fullName, hasContactDetails: !!(contacts.email || contacts.mobile), ...contacts });
    }

    // Build company → individuals map from employment_data.associations (with roles).
    // Employee-type associations are excluded here — registry_employees is the canonical
    // source for that relationship (mirrors the registry app's /api/registry-individuals).
    const companyIndividualsMap = new Map<string, Map<string, any>>();

    for (const ind of individualsRes.data ?? []) {
      const associations: any[] = ind.employment_data?.associations ?? [];
      for (const assoc of associations) {
        if (!assoc?.company_id) continue;
        if (String(assoc.individual_type ?? "").trim().toLowerCase() === "employee") continue;
        const cid = String(assoc.company_id);
        if (!companyIndividualsMap.has(cid)) companyIndividualsMap.set(cid, new Map());
        const indBase = individualMap.get(String(ind.id));
        if (!indBase) continue;
        const existing = companyIndividualsMap.get(cid)!.get(indBase.id) ?? { ...indBase, roles: [] };
        const roles: string[] = existing.roles ?? [];
        if (assoc.individual_type && !roles.includes(assoc.individual_type)) {
          roles.push(assoc.individual_type);
        }
        companyIndividualsMap.get(cid)!.set(indBase.id, { ...existing, roles });
      }
    }

    // Merge registry_employees — the canonical source for the Employee relationship.
    // Employment status isn't filtered here: a past effective_end_date means the
    // person is no longer current, not that the record should disappear from the list.
    // employeeStatus is 'active' if any of the individual's employee rows for this
    // company is currently within its effective date range, else 'inactive'.
    const today = new Date();
    for (const emp of employeesData) {
      const cid = String(emp.company_id);
      const iid = String(emp.individual_id);
      const indData = individualMap.get(iid);
      if (!indData) continue;
      const start = emp.effective_start_date ? new Date(emp.effective_start_date) : null;
      const end = emp.effective_end_date ? new Date(emp.effective_end_date) : null;
      const isCurrent = (!start || start <= today) && (!end || end >= today);
      if (!companyIndividualsMap.has(cid)) companyIndividualsMap.set(cid, new Map());
      const existing = companyIndividualsMap.get(cid)!.get(indData.id) ?? { ...indData, roles: [] };
      const roles: string[] = existing.roles ?? [];
      if (!roles.includes("Employee")) roles.push("Employee");
      const employeeStatus = existing.employeeStatus === "active" || isCurrent ? "active" : "inactive";
      companyIndividualsMap.get(cid)!.set(indData.id, { ...existing, roles, employeeStatus });
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
