import { createClient } from "@supabase/supabase-js";

/**
 * Basic info for the BCL mobile app's Individual and Company profiles — the same sections,
 * fields, storage paths and save rules as the registry's profile "Basic Info" modules:
 *   - individuals: bcl-registry app/individuals/[id]/components/basic-info.tsx with the fields of
 *     components/formfields/individuals-form-fields.tsx (contact / address JSON is a one-element
 *     array; older rows hold a plain object — both are read, saves write element 0);
 *   - companies: app/companies/[id]/components/basic-info.tsx with company-form-fields.tsx
 *     (contact / address / accountant JSON are per-branch arrays; the main branch's entry is read
 *     and replaced; "Manufacturer's Details" fields come from KRA and are read-only).
 * The full residential / physical / postal addresses are generated as the registry's
 * lib/utils/addressUtils does. Credentials sections are not included (see the company route).
 *
 * The field lists are mirrored here (not imported) because the registry's definitions live in
 * "use client" React modules of another app; keep them in step when those change.
 */

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

type FieldType = "text" | "email" | "date" | "select";
interface FieldDef {
  key: string;
  label: string;
  type?: FieldType;
  /** dropdown_settings.category_name for selects. */
  category?: string;
  /** Filled by the system (KRA fetch, generated address…): shown, never written. */
  auto?: boolean;
}
interface SectionDef { title: string; fields: FieldDef[] }

export interface BasicInfoPayload {
  canEdit: boolean;
  sections: Array<{
    title: string;
    fields: Array<{ key: string; label: string; type: FieldType; value: string; editable: boolean; options?: string[] }>;
  }>;
}

// ── Individuals (individuals-form-fields.tsx: General, Contact, Residential, Postal, Additional) ──
// key = the field's dataPath (or column name). Scanned "(Doc)" values and the computed age are left out.
const INDIVIDUAL_SECTIONS: SectionDef[] = [
  {
    title: "General Information",
    fields: [
      { key: "first_name", label: "First Name" },
      { key: "middle_name", label: "Middle Name" },
      { key: "last_name", label: "Last Name" },
      { key: "full_name", label: "Full Name" },
      { key: "passport_no", label: "Passport No" },
      { key: "id_number", label: "Kenyan ID No" },
      { key: "alien_no", label: "Alien No" },
      { key: "nationality", label: "Nationality", type: "select", category: "nationality" },
      { key: "country_of_birth", label: "Country of Birth", type: "select", category: "country_of_birth" },
      { key: "date_of_birth", label: "Date of Birth", type: "date" },
      { key: "gender", label: "Gender", type: "select", category: "gender" },
    ],
  },
  {
    title: "Contact Details",
    fields: [
      { key: "contact_details.phone.kenyan.primary", label: "Kenyan Mobile Number 1" },
      { key: "contact_details.phone.kenyan.secondary", label: "Kenyan Mobile Number 2" },
      { key: "contact_details.phone.abroad.primary", label: "Abroad Mobile Number 1" },
      { key: "contact_details.phone.abroad.secondary", label: "Abroad Mobile Number 2" },
      { key: "contact_details.phone.whatsapp", label: "WhatsApp Number" },
      { key: "contact_details.email.primary", label: "Current Communication Email", type: "email" },
      { key: "contact_details.email.alternative", label: "Alternative Email Address", type: "email" },
      { key: "contact_details.website", label: "Website" },
    ],
  },
  {
    title: "Residential / Physical Address",
    fields: [
      { key: "residential_address_details.country", label: "Country", type: "select", category: "country_of_residence" },
      { key: "residential_address_details.city", label: "City", type: "select", category: "city" },
      { key: "residential_address_details.town", label: "Town", type: "select", category: "town" },
      { key: "residential_address_details.county", label: "County", type: "select", category: "county" },
      { key: "residential_address_details.sub_county", label: "Sub County", type: "select", category: "sub_county" },
      { key: "residential_address_details.road_name", label: "Road Name" },
      { key: "residential_address_details.area_name", label: "Area Name" },
      { key: "residential_address_details.apartment_name", label: "Building / Apartment Name" },
      { key: "residential_address_details.apartment_number", label: "Office / House Number" },
      { key: "residential_address_details.full_residential_address", label: "Full Residential / Physical Address", auto: true },
    ],
  },
  {
    title: "Postal Address",
    fields: [
      { key: "postal_address_details.postal_address", label: "P.O. Box" },
      { key: "postal_address_details.postal_code", label: "Postal Code" },
      { key: "postal_address_details.postal_town", label: "Postal Town", type: "select", category: "postal_town" },
      { key: "postal_address_details.full_postal_address", label: "Full Postal Address", auto: true },
    ],
  },
  {
    title: "Additional Information",
    fields: [
      { key: "r_number", label: "R Number" },
      { key: "marital_status", label: "Marital Status", type: "select", category: "maritalStatus" },
    ],
  },
];

// ── Companies (company-form-fields.tsx: General … Site Accountant) ──
// key = the form's field name; where it's stored is resolved by readCompany / writeCompany.
const COMPANY_SECTIONS: SectionDef[] = [
  {
    title: "General Information",
    fields: [
      { key: "company_name", label: "Company Name" },
      { key: "company_prefix", label: "Company Prefix" },
      { key: "company_type", label: "Company Type", type: "select", category: "company_type", auto: true },
      { key: "itax_business_reg_cert_no", label: "Registration Number", auto: true },
      { key: "company_classification", label: "Company Classification", type: "select", category: "company_classification" },
      { key: "itax_business_commencement_date", label: "Business Commencement Date", type: "date", auto: true },
      { key: "itax_business_reg_date", label: "Registration Date", type: "date", auto: true },
    ],
  },
  {
    title: "Contact Details",
    fields: [
      { key: "office_phone_number", label: "Office Phone Number" },
      { key: "broadcast_whatsapp_number", label: "WhatsApp Number" },
      { key: "whatsapp_group_id", label: "WhatsApp Group ID" },
      { key: "current_communication_email", label: "Current Communication Email", type: "email" },
      { key: "alternative_email_address", label: "Alternative Email Address", type: "email" },
      { key: "website", label: "Website" },
    ],
  },
  {
    title: "Residential / Physical Address",
    fields: [
      { key: "country", label: "Country", type: "select", category: "country_of_operation" },
      { key: "city", label: "City", type: "select", category: "city" },
      { key: "town", label: "Town", type: "select", category: "town" },
      { key: "county", label: "County", type: "select", category: "county" },
      { key: "sub_county", label: "Sub County", type: "select", category: "sub_county" },
      { key: "road_name", label: "Road Name" },
      { key: "nearest_landmark", label: "Nearest Landmark" },
      { key: "building_name", label: "Building / Apartment Name" },
      { key: "floor_number", label: "Floor Number" },
      { key: "office_number", label: "Office / House Number" },
      { key: "full_physical_address", label: "Full Residential / Physical Address", auto: true },
    ],
  },
  {
    title: "Postal Address",
    fields: [
      { key: "postal_address", label: "P.O. Box" },
      { key: "postal_code", label: "Postal Code" },
      { key: "postal_town", label: "Postal Town", type: "select", category: "postal_town" },
      { key: "full_postal_address", label: "Full Postal Address", auto: true },
    ],
  },
  {
    title: "Additional Information",
    fields: [
      { key: "industry", label: "Industry", type: "select", category: "industry" },
      { key: "nature_of_business", label: "Nature Of Business" },
      { key: "source_of_income_employment", label: "Source Of Income Employment" },
      { key: "source_of_income_interest_dividends", label: "Source Of Income Interest Dividends" },
      { key: "source_of_income_rental", label: "Source Of Income Rental" },
    ],
  },
  {
    title: "BCL Account Manager Details",
    fields: [
      { key: "account_manager_name", label: "BCL Account Manager Name" },
      { key: "account_manager_email", label: "BCL Account Manager Email", type: "email" },
      { key: "account_manager_phone_number", label: "BCL Account Manager Phone Number" },
    ],
  },
  {
    title: "Site Accountant Details",
    fields: [
      { key: "office_accountant_name", label: "Site Accountant Name" },
      { key: "office_accountant_email", label: "Site Accountant Email", type: "email" },
      { key: "office_accountant_phone_number", label: "Site Accountant Phone Number" },
    ],
  },
];

const CONTACT_KEYS = ["office_phone_number", "current_communication_email", "alternative_email_address", "broadcast_whatsapp_number", "whatsapp_group_id", "website"];
const PHYSICAL_KEYS = ["country", "city", "town", "county", "sub_county", "road_name", "nearest_landmark", "building_name", "floor_number", "office_number", "full_physical_address"];
const POSTAL_KEYS = ["postal_address", "postal_code", "postal_town", "full_postal_address"];
const MANUFACTURER_KEYS = ["company_type", "itax_business_reg_cert_no", "itax_business_commencement_date", "itax_business_reg_date"];
const ARRAY_ROOTS = ["contact_details", "residential_address_details", "postal_address_details"];

// ── helpers ──
const text = (v: unknown) => (v === null || v === undefined ? "" : String(v).trim());
const filled = (v: unknown) => text(v) !== "" && text(v) !== "null";

function getPath(obj: any, path: string): unknown {
  return path.split(".").reduce((o, k) => (o == null ? undefined : o[k]), obj);
}
function setPath(obj: any, path: string, value: unknown) {
  const keys = path.split(".");
  let o = obj;
  keys.slice(0, -1).forEach((k) => {
    if (o[k] == null || typeof o[k] !== "object") o[k] = {};
    o = o[k];
  });
  o[keys[keys.length - 1]] = value;
}
const clone = <T>(v: T): T => JSON.parse(JSON.stringify(v ?? null));

// The registry's lib/utils/addressUtils (same parts, same order).
function fullResidentialAddress(d: Record<string, unknown>) {
  return ["country", "city", "town", "county", "sub_county", "road_name", "area_name", "apartment_name", "apartment_number", "plot_number"]
    .map((k) => text(d[k])).filter(Boolean).join(", ");
}
function fullPhysicalAddress(d: Record<string, unknown>, companyName: string) {
  const v = (k: string) => text(d[k]);
  return [
    companyName,
    v("office_number") && `Office ${v("office_number")}`,
    v("floor_number") && `Floor ${v("floor_number")}`,
    v("building_name"),
    v("nearest_landmark") && `Near ${v("nearest_landmark")}`,
    v("road_name"), v("estate"), v("area"), v("town"), v("city"), v("county"), v("sub_county"), v("country"),
  ].filter(Boolean).join(", ");
}
function fullPostalAddress(d: Record<string, unknown>) {
  const box = text(d.postal_address);
  if (!box) return "";
  return [`P.O. Box ${box}`, text(d.postal_code), text(d.postal_town)].filter(Boolean).join(", ");
}

// Each dropdown category's master field (tm_job_fields.id), as the registry form fields declare it
// (dataSource: { category, masterFieldId }).
const MASTER_FIELD_BY_CATEGORY: Record<string, number> = {
  nationality: 10, country_of_birth: 74, gender: 9, country_of_residence: 74, country_of_operation: 76,
  city: 31, town: 14, county: 59, sub_county: 13, postal_town: 65, maritalStatus: 94,
  company_type: 44, company_classification: 130, industry: 134,
};

const optionValues = (raw: unknown): string[] => {
  const list = Array.isArray(raw) ? raw : typeof raw === "string" ? (() => { try { return JSON.parse(raw); } catch { return []; } })() : [];
  return (Array.isArray(list) ? list : [])
    .filter((o: any) => !(o && typeof o === "object" && o.is_visible === false))
    .map((o: any) => (o && typeof o === "object" ? text(o.label ?? o.value) : text(o)))
    .filter(Boolean);
};

/**
 * Options per dropdown category, resolved like the registry (schemaDropdownOptions / basic-info):
 * the dropdown_settings row for the category (matched ignoring case), else the field's master field
 * in tm_job_fields — its static options, or for a dependent field (sub county…) every option under
 * any parent.
 */
async function dropdownOptions(sections: SectionDef[]): Promise<Record<string, string[]>> {
  const categories = Array.from(new Set(sections.flatMap((s) => s.fields).map((f) => f.category).filter(Boolean))) as string[];
  if (!categories.length) return {};
  const out: Record<string, string[]> = {};

  const { data: settings } = await supabase.from("dropdown_settings").select("category_name, options");
  const byName = new Map((settings ?? []).map((r: any) => [String(r.category_name ?? "").trim().toLowerCase(), r.options]));
  for (const cat of categories) {
    const values = optionValues(byName.get(cat.toLowerCase()));
    if (values.length) out[cat] = values;
  }

  const missingIds = Array.from(new Set(categories.filter((c) => !out[c] && MASTER_FIELD_BY_CATEGORY[c]).map((c) => MASTER_FIELD_BY_CATEGORY[c])));
  if (missingIds.length) {
    const { data: masters } = await supabase.from("tm_job_fields").select("id, options").in("id", missingIds);
    const masterById = new Map((masters ?? []).map((m: any) => [Number(m.id), m.options]));
    for (const cat of categories) {
      if (out[cat]) continue;
      const opts: any = masterById.get(MASTER_FIELD_BY_CATEGORY[cat]);
      let values: string[] = [];
      if (Array.isArray(opts)) values = optionValues(opts);
      else if (opts?.isDependencyConfig && opts.manualMapping && typeof opts.manualMapping === "object") {
        const labelKey = opts.dependencyConfig?.labelKey || "label";
        values = Object.values(opts.manualMapping).flatMap((list: any) =>
          (Array.isArray(list) ? list : []).map((o: any) => text(o && typeof o === "object" ? o[labelKey] ?? o.value : o)),
        ).filter(Boolean);
      }
      if (values.length) out[cat] = Array.from(new Set(values)).sort((a, b) => a.localeCompare(b));
    }
  }
  return out;
}

async function toPayload(sections: SectionDef[], values: Record<string, string>, canEdit: boolean, locked: Set<string> = new Set()): Promise<BasicInfoPayload> {
  const options = await dropdownOptions(sections);
  return {
    canEdit,
    sections: sections.map((s) => ({
      title: s.title,
      fields: s.fields.map((f) => ({
        key: f.key,
        label: f.label,
        type: f.type ?? "text",
        value: values[f.key] ?? "",
        editable: canEdit && !f.auto && !locked.has(f.key),
        ...(f.category && options[f.category]?.length ? { options: options[f.category] } : {}),
      })),
    })),
  };
}

// ── Individuals ──
function flattenIndividual(row: any) {
  const flat = clone(row) ?? {};
  ARRAY_ROOTS.forEach((root) => { if (Array.isArray(flat[root])) flat[root] = flat[root][0] ?? {}; });
  return flat;
}

export async function readIndividualBasicInfo(id: string, canEdit: boolean): Promise<BasicInfoPayload | null> {
  const { data: row, error } = await supabase.from("registry_individuals").select("*").eq("id", id).maybeSingle();
  if (error) throw error;
  if (!row) return null;
  const flat = flattenIndividual(row);
  const values: Record<string, string> = {};
  INDIVIDUAL_SECTIONS.forEach((s) => s.fields.forEach((f) => { values[f.key] = text(getPath(flat, f.key)); }));
  if (!values["residential_address_details.full_residential_address"]) {
    values["residential_address_details.full_residential_address"] = fullResidentialAddress(flat.residential_address_details ?? {});
  }
  if (!values["postal_address_details.full_postal_address"]) {
    values["postal_address_details.full_postal_address"] = fullPostalAddress(flat.postal_address_details ?? {});
  }
  return toPayload(INDIVIDUAL_SECTIONS, values, canEdit);
}

export async function saveIndividualBasicInfo(id: string, edits: Record<string, unknown>) {
  const { data: row, error } = await supabase.from("registry_individuals").select("*").eq("id", id).maybeSingle();
  if (error) throw error;
  if (!row) throw new Error("Individual not found");
  const editable = new Set(INDIVIDUAL_SECTIONS.flatMap((s) => s.fields).filter((f) => !f.auto).map((f) => f.key));
  const payload = clone(row);
  // Element 0 of the array roots, as the web form writes them.
  const writePath = (path: string, value: unknown) => {
    const [root, ...rest] = path.split(".");
    if (rest.length && ARRAY_ROOTS.includes(root)) {
      if (!Array.isArray(payload[root])) payload[root] = [payload[root] && typeof payload[root] === "object" ? payload[root] : {}];
      if (!payload[root][0] || typeof payload[root][0] !== "object") payload[root][0] = {};
      setPath(payload[root][0], rest.join("."), value);
    } else {
      setPath(payload, path, value);
    }
  };
  let touched = 0;
  for (const [key, raw] of Object.entries(edits)) {
    if (!editable.has(key)) continue;
    writePath(key, filled(raw) ? text(raw) : null);
    touched++;
  }
  if (!touched) return;
  const flat = flattenIndividual(payload);
  writePath("residential_address_details.full_residential_address", fullResidentialAddress(flat.residential_address_details ?? {}) || null);
  writePath("postal_address_details.full_postal_address", fullPostalAddress(flat.postal_address_details ?? {}) || null);
  // Only the columns this form owns.
  const update: Record<string, unknown> = { updated_at: new Date().toISOString() };
  const roots = new Set(Object.keys(edits).filter((k) => editable.has(k)).map((k) => k.split(".")[0]));
  roots.add("residential_address_details");
  roots.add("postal_address_details");
  roots.forEach((r) => { update[r] = payload[r]; });
  const { error: updateError } = await supabase.from("registry_individuals").update(update).eq("id", id);
  if (updateError) throw updateError;
}

// ── Companies ──
const mainBranchOf = (company: any) => {
  const branches = Array.isArray(company?.branch) ? company.branch : [];
  return branches.find((b: any) => b?.is_main === true) ?? branches[0] ?? null;
};
const branchEntry = (arr: any, branchId: unknown) =>
  Array.isArray(arr) ? arr.find((e: any) => e && String(e.branch_id) === String(branchId)) ?? null : null;

export async function readCompanyBasicInfo(id: string, canEdit: boolean): Promise<BasicInfoPayload | null> {
  const { data: company, error } = await supabase.from("acc_portal_company_duplicate").select("*").eq("id", id).maybeSingle();
  if (error) throw error;
  if (!company) return null;
  const main = mainBranchOf(company);
  const contact = main ? branchEntry(company.contact_details, main.branch_id) ?? {} : {};
  const physical = main ? branchEntry(company.physical_address_details, main.branch_id) ?? {} : {};
  const postal = main ? branchEntry(company.postal_address_details, main.branch_id) ?? {} : {};
  const accountant = main ? branchEntry(company.accountants_history, main.branch_id) ?? {} : {};
  const manager = company.acc_managers_history?.current ?? {};
  const mfg = company.manufacturer_details ?? {};

  const values: Record<string, string> = {};
  for (const f of COMPANY_SECTIONS.flatMap((s) => s.fields)) {
    const k = f.key;
    let v: unknown;
    if (CONTACT_KEYS.includes(k)) v = contact[k];
    else if (PHYSICAL_KEYS.includes(k)) v = physical[k];
    else if (POSTAL_KEYS.includes(k)) v = postal[k];
    else if (MANUFACTURER_KEYS.includes(k)) v = filled(mfg[k]) ? mfg[k] : company[k];
    else if (k === "account_manager_name") v = manager.name;
    else if (k.startsWith("account_manager_")) v = manager[k];
    else if (k.startsWith("office_accountant_")) v = accountant[k.replace("office_accountant_", "accountant_")];
    else v = company[k];
    // Older rows kept some of these as plain columns — fall back to them, as the old profile did.
    values[k] = filled(v) ? text(v) : text(company[k]);
  }
  if (!values.full_physical_address) values.full_physical_address = fullPhysicalAddress(physical, text(company.company_name));
  if (!values.full_postal_address) values.full_postal_address = fullPostalAddress(postal);
  // Branch-stored fields can't be saved without a branch (the web form refuses too).
  const locked = new Set(main ? [] : [...CONTACT_KEYS, ...PHYSICAL_KEYS, ...POSTAL_KEYS, "office_accountant_name", "office_accountant_email", "office_accountant_phone_number"]);
  return toPayload(COMPANY_SECTIONS, values, canEdit, locked);
}

export async function saveCompanyBasicInfo(id: string, edits: Record<string, unknown>) {
  const { data: company, error } = await supabase.from("acc_portal_company_duplicate").select("*").eq("id", id).maybeSingle();
  if (error) throw error;
  if (!company) throw new Error("Company not found");
  const editable = new Set(COMPANY_SECTIONS.flatMap((s) => s.fields).filter((f) => !f.auto).map((f) => f.key));
  const changes = Object.fromEntries(Object.entries(edits).filter(([k]) => editable.has(k)).map(([k, v]) => [k, filled(v) ? text(v) : null]));
  if (!Object.keys(changes).length) return;

  const main = mainBranchOf(company);
  const update: Record<string, unknown> = {};
  // Plain columns.
  for (const k of ["company_name", "company_prefix", "company_classification", "industry", "nature_of_business", "source_of_income_employment", "source_of_income_interest_dividends", "source_of_income_rental"]) {
    if (k in changes) update[k] = changes[k];
  }
  // Per-branch arrays: replace the main branch's entry (the web form's updateBranchArray).
  const replaceBranch = (column: string, keys: string[], rename: (k: string) => string = (k) => k, extra?: (entry: any) => void) => {
    if (!keys.some((k) => k in changes)) return;
    if (!main) throw new Error("This company has no branch, so its contact and address details can't be saved");
    const current = branchEntry(company[column], main.branch_id) ?? {};
    const entry: any = { ...current, branch_id: main.branch_id };
    keys.forEach((k) => { if (k in changes) entry[rename(k)] = changes[k]; });
    extra?.(entry);
    const others = (Array.isArray(company[column]) ? company[column] : []).filter((e: any) => e && String(e.branch_id) !== String(main.branch_id));
    update[column] = [...others, entry];
  };
  replaceBranch("contact_details", CONTACT_KEYS);
  replaceBranch("physical_address_details", PHYSICAL_KEYS.filter((k) => k !== "full_physical_address"), (k) => k, (e) => {
    e.full_physical_address = fullPhysicalAddress(e, text(changes.company_name ?? company.company_name)) || null;
  });
  replaceBranch("postal_address_details", POSTAL_KEYS.filter((k) => k !== "full_postal_address"), (k) => k, (e) => {
    e.full_postal_address = fullPostalAddress(e) || null;
  });
  replaceBranch("accountants_history", ["office_accountant_name", "office_accountant_email", "office_accountant_phone_number"], (k) => k.replace("office_accountant_", "accountant_"));
  // Account manager: acc_managers_history.current, keeping its history.
  if (["account_manager_name", "account_manager_email", "account_manager_phone_number"].some((k) => k in changes)) {
    const prev = company.acc_managers_history ?? {};
    const current = { ...(prev.current ?? {}) };
    if ("account_manager_name" in changes) current.name = changes.account_manager_name;
    if ("account_manager_email" in changes) current.account_manager_email = changes.account_manager_email;
    if ("account_manager_phone_number" in changes) current.account_manager_phone_number = changes.account_manager_phone_number;
    update.acc_managers_history = { ...prev, current };
  }
  if (!Object.keys(update).length) return;
  const { error: updateError } = await supabase.from("acc_portal_company_duplicate").update(update).eq("id", id);
  if (updateError) throw updateError;
}
