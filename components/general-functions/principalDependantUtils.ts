// ─── CONSTANTS ────────────────────────────────────────────────────────────────

// Simple date parser for birthday tracker (replaces registry's parseDateString)
const parseDateString = (dateStr: any): Date | null => {
  if (!dateStr) return null;
  const date = new Date(dateStr);
  return isNaN(date.getTime()) ? null : date;
};
// ─── CONSTANTS ────────────────────────────────────────────────────────────────

// Individual types that appear in the full_name column (top-level rows)
const TOP_LEVEL_TYPES = ['principal', 'director', 'shareholder', 'employee'];

const normalizeType = (type: any): string => {
  if (!type) return '';
  return String(type).trim().toLowerCase();
};

// ─── HELPERS ──────────────────────────────────────────────────────────────────

const calculateAge = (dateOfBirth: any): number | null => {
  if (!dateOfBirth) return null;
  const birthDate = parseDateString(dateOfBirth);
  if (!birthDate) return null;

  const today = new Date();
  let age = today.getFullYear() - birthDate.getFullYear();
  const monthDiff = today.getMonth() - birthDate.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) age--;
  return age >= 0 ? age : null;
};

/**
 * Builds the dependants summary string for a principal row.
 * Reads from principal's relationships[] array:
 *   [{ is_principal: false, relationship: "Wife", individual_id: 1807 }, ...]
 */
const buildDependantsSummary = (
  individual: any,
  individualsById: Map<any, any>
): string => {
  const rels = individual?.relationships;
  if (!Array.isArray(rels)) return '';

  return rels
    .filter((rel: any) => rel?.is_principal === false)
    .map((rel: any) => {
      const dep = individualsById.get(rel?.individual_id);
      if (!dep?.full_name) return null;
      const fullName = dep.full_name || dep.first_name || 'Unknown';
      return `${fullName} (${rel?.relationship || 'Dependant'})`;
    })
    .filter(Boolean)
    .join('; ');
};

/**
 * Derives the display label for this individual's role(s).
 * A person can have multiple associations — we surface all distinct top-level types.
 * e.g. "Principal / Director / Shareholder"
 */
const getCurrentTopLevelTypes = (individual: any): string[] => {
  const associations: any[] = individual?.employment_data?.associations || [];
  const roles = associations
    .filter((a: any) => a?.is_current !== false)
    .map((a: any) => a?.individual_type)
    .filter(Boolean)
    .filter((t: any) => TOP_LEVEL_TYPES.includes(normalizeType(t)));

  return [...new Set(roles)];
};

const deriveRoleLabel = (individual: any): string => {
  const unique = getCurrentTopLevelTypes(individual);
  return unique.length > 0 ? unique.join(' / ') : 'Individual';
};

const getSidebarCategoryLabel = (individual: any): string => {
  if (!individual) return 'Individual';
  if (individual.isUncategorized) return 'Uncategorized';
  if (individual.isDependant && !individual.isTopLevel) {
    return individual.relationship || 'Dependant';
  }

  const roleLabel = deriveRoleLabel(individual);
  if (roleLabel !== 'Individual') return roleLabel;

  if (individual.isTopLevel) return 'Principal';
  if (individual.isDependant) return individual.relationship || 'Dependant';
  return 'Individual';
};

/**
 * Resolves the company name(s) for an individual from their current associations.
 */
const resolveCompanyName = (
  individual: any,
  companyMap: Map<string, string>
): string => {
  const associations: any[] = individual?.employment_data?.associations || [];
  const names = associations
    .filter((a: any) => a?.is_current !== false && a?.company_id)
    .map((a: any) => companyMap.get(String(a.company_id)) || `ID: ${a.company_id}`)
    .filter(Boolean);

  return [...new Set(names)].join(', ');
};

// ─── CLASSIFICATION ───────────────────────────────────────────────────────────

/**
 * Returns true if this person has at least one top-level association type
 * (Principal / Director / Shareholder / Employee).
 */
const isTopLevelIndividual = (person: any): boolean => {
  const associations: any[] = person?.employment_data?.associations || [];
  return associations.some((a: any) =>
    TOP_LEVEL_TYPES.includes(normalizeType(a?.individual_type))
  );
};

/**
 * Returns true if this person is a Dependant — their relationships array contains is_principal: true.
 */
const isDependantIndividual = (person: any): boolean => {
  const rels = person?.relationships;
  if (Array.isArray(rels)) {
    return rels.some((rel: any) => rel?.is_principal === true);
  }
  return false;
};

/**
 * Returns true if this person has NO associations at all — they are uncategorized.
 */
const isUncategorized = (person: any): boolean => {
  const associations: any[] = person?.employment_data?.associations || [];
  return associations.length === 0;
};

// ─── ENRICHMENT ───────────────────────────────────────────────────────────────

const enrich = (
  individual: any,
  overrides: Record<string, any>,
  companyMap: Map<string, string>,
  allFields: any[],
  individualsById: Map<any, any>
): any => {
  const fullName = individual?.full_name || individual?.first_name || 'Unknown';

  return {
    ...individual,
    full_name: fullName,
    age: calculateAge(individual?.date_of_birth),
    relationship: overrides.relationship,
    company_name: resolveCompanyName(individual, companyMap),
    dependants: overrides.buildDependants
      ? buildDependantsSummary(individual, individualsById)
      : '',
    isTopLevel: Boolean(overrides.isTopLevel),
    isDependant: Boolean(overrides.isDependant),
    isUncategorized: Boolean(overrides.isUncategorized),
    // Flag: this dependant row also has their own top-level principal row elsewhere.
    // Useful for UI to show a badge like "Also: Director" to clarify the dual presence.
    isPrincipalElsewhere: Boolean(overrides.isPrincipalElsewhere),
    rowType: overrides.rowType ?? 'principal',
    principal_id: overrides.principal_id ?? individual.id,
    principal_name: overrides.principal_name ?? fullName,
  };
};

// ─── MAIN EXPORT ──────────────────────────────────────────────────────────────

export interface ProcessedIndividual {
  id: any;
  full_name: string;
  age: number | null;
  relationship: string;
  company_name: string;
  dependants: string;
  isTopLevel: boolean;
  isDependant: boolean;
  isUncategorized: boolean;
  /**
   * True when this row is rendered as a dependant but the same person also
   * appears as a top-level principal row elsewhere in the table.
   * Use this flag to render a "Also: Director" style badge in the UI.
   */
  isPrincipalElsewhere: boolean;
  rowType: 'principal' | 'dependant' | 'uncategorized';
  principal_id: any;
  principal_name: string;
  relationships: any;
  employment_data: any;
  [key: string]: any;
}

// Export utility functions for use in other components
export {
  getCurrentTopLevelTypes,
  getSidebarCategoryLabel,
  isDependantIndividual,
  isTopLevelIndividual,
  isUncategorized,
};

export const processIndividualsByPrincipalStrategy = (
  individuals: any[],
  companyMap: Map<string, string>,
  allFields: any[]
): ProcessedIndividual[] => {
  const source = Array.isArray(individuals) ? individuals : [];
  const individualsById = new Map(source.map((p) => [p.id, p]));

  // ── Two separate deduplication sets so a person can appear as BOTH a
  //    top-level principal row AND a dependant row under another principal.
  //    Previously a single `processedIds` set silently dropped the dependant
  //    row for anyone who was already processed as a top-level row.
  const processedAsTopLevel = new Set<any>();   // guards principal rows
  const processedAsDependant = new Set<any>();  // guards dependant rows

  const processed: ProcessedIndividual[] = [];
  const uncategorized: ProcessedIndividual[] = [];

  // ── PASS 1: Top-level individuals (Principal / Director / Shareholder / Employee)
  source.forEach((person) => {
    if (processedAsTopLevel.has(person.id)) return;
    if (!isTopLevelIndividual(person)) return;

    const roleLabel = deriveRoleLabel(person);

    const principalRecord = enrich(
      person,
      {
        relationship: roleLabel,
        isTopLevel: true,
        isDependant: false,
        isUncategorized: false,
        isPrincipalElsewhere: false,
        rowType: 'principal',
        buildDependants: true,
        principal_id: person.id,
        principal_name: person.full_name || person.first_name || 'Unknown',
      },
      companyMap,
      allFields,
      individualsById
    );
    processed.push(principalRecord);
    processedAsTopLevel.add(person.id);

    // ── PASS 1b: Attach dependants listed in this principal's relationships[]
    //    We no longer skip someone just because they have their own top-level row.
    //    A person who is a Director at one company AND a spouse of another Director
    //    should appear BOTH as their own principal row and as a dependant row here.
    const rels: any[] = Array.isArray(person?.relationships)
      ? person.relationships
      : [];

    rels.forEach((rel: any) => {
      if (rel?.is_principal !== false) return;

      const depId = rel?.individual_id;
      if (!depId) return;

      // Guard only against rendering the same dependant row twice under the
      // same principal — NOT against rendering them as a top-level row.
      if (processedAsDependant.has(depId)) return;

      const dependant = individualsById.get(depId);
      if (!dependant) return;

      const relLabel = rel?.relationship || 'Dependant';

      // Check if this dependant is also a principal in their own right so we
      // can set the isPrincipalElsewhere flag for the UI.
      const alsoAPrincipal = isTopLevelIndividual(dependant);

      const dependantRecord = enrich(
        dependant,
        {
          relationship: relLabel,
          isTopLevel: false,
          isDependant: true,
          isUncategorized: false,
          isPrincipalElsewhere: alsoAPrincipal,
          rowType: 'dependant',
          buildDependants: false,
          principal_id: person.id,
          principal_name: person.full_name || person.first_name || 'Unknown',
        },
        companyMap,
        allFields,
        individualsById
      );
      processed.push(dependantRecord);
      processedAsDependant.add(depId);
    });
  });

  // ── PASS 2: Dependants not yet rendered as a dependant row.
  //    These are records whose relationships array contains is_principal: true
  //    but whose principal didn't list them in PASS 1b (data inconsistency edge case).
  source.forEach((person) => {
    // Skip if already rendered as a dependant row — but NOT if only rendered
    // as a top-level row, because they still need a dependant row too.
    if (processedAsDependant.has(person.id)) return;
    if (!isDependantIndividual(person)) return;

    const rels = person?.relationships;
    let principalId = null;
    let relLabel = 'Dependant';

    if (Array.isArray(rels)) {
      const principalRel = rels.find((rel: any) => rel?.is_principal === true);
      if (principalRel) {
        principalId = principalRel?.individual_id;
        relLabel = person.relationship || principalRel?.relationship || 'Dependant';
      }
    }

    const principal = principalId ? individualsById.get(principalId) : null;
    const alsoAPrincipal = isTopLevelIndividual(person);

    const dependantRecord = enrich(
      person,
      {
        relationship: relLabel,
        isTopLevel: false,
        isDependant: true,
        isUncategorized: false,
        isPrincipalElsewhere: alsoAPrincipal,
        rowType: 'dependant',
        buildDependants: false,
        principal_id: principal?.id ?? person.id,
        principal_name: principal?.full_name || principal?.first_name || person.full_name || person.first_name || 'Unknown',
      },
      companyMap,
      allFields,
      individualsById
    );
    processed.push(dependantRecord);
    processedAsDependant.add(person.id);
  });

  // ── PASS 3: Everyone else — no top-level associations and not a dependant.
  //    Check if they might be dependants and group them appropriately.
  source.forEach((person) => {
    // Skip if rendered as either a principal row OR a dependant row already.
    if (processedAsTopLevel.has(person.id) || processedAsDependant.has(person.id)) return;

    let isUncategorizedDependant = false;
    let potentialPrincipalId = null;

    // Check if any processed top-level individual references this person as a dependant.
    for (const processedPerson of processed) {
      if (processedPerson.isTopLevel && Array.isArray(processedPerson.relationships)) {
        const foundRef = processedPerson.relationships.find(
          (rel: any) => rel?.is_principal === false && rel?.individual_id === person.id
        );
        if (foundRef) {
          isUncategorizedDependant = true;
          potentialPrincipalId = processedPerson.id;
          break;
        }
      }
    }

    const record = enrich(
      person,
      {
        relationship: isUncategorizedDependant ? 'Uncategorized Dependant' : 'Uncategorized',
        isTopLevel: false,
        isDependant: isUncategorizedDependant,
        isUncategorized: true,
        isPrincipalElsewhere: false,
        rowType: isUncategorizedDependant ? 'dependant' : 'uncategorized',
        buildDependants: false,
        principal_id: isUncategorizedDependant ? potentialPrincipalId : person.id,
        principal_name: isUncategorizedDependant
          ? individualsById.get(potentialPrincipalId)?.full_name || individualsById.get(potentialPrincipalId)?.first_name || 'Unknown Principal'
          : person.full_name || person.first_name || 'Unknown',
      },
      companyMap,
      allFields,
      individualsById
    );

    if (isUncategorizedDependant) {
      processed.push(record);
      processedAsDependant.add(person.id);
    } else {
      uncategorized.push(record);
    }
  });

  // Return top-level + dependants first, then uncategorized appended at the end.
  return [...processed, ...uncategorized];
};
