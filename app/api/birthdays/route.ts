import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '../meetings/_shared';
import { processIndividualsByPrincipalStrategy } from '@/components/general-functions/principalDependantUtils';

function parseBirthday(raw: any) {
  try {
    const cat = typeof raw === 'string' ? JSON.parse(raw) : raw || {};
    return {
      gets_wish: cat.gets_wish === 'Yes',
      gets_cake: cat.gets_cake === 'Yes',
      gets_gift: cat.gets_gift === 'Yes',
    };
  } catch {
    return { gets_wish: false, gets_cake: false, gets_gift: false };
  }
}

function getDaysUntil(dob: string): number | null {
  if (!dob) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  let day: number, month: number;

  if (/^\d{2}\/\d{2}\/\d{4}$/.test(dob)) {
    const p = dob.split('/');
    day = parseInt(p[0]);
    month = parseInt(p[1]);
  } else {
    const p = dob.split('-');
    if (p.length < 3) return null;
    if (p[0].length === 4) {
      month = parseInt(p[1]);
      day = parseInt(p[2]);
    } else {
      month = parseInt(p[0]);
      day = parseInt(p[1]);
    }
  }

  let next = new Date(today.getFullYear(), month - 1, day);
  if (next < today) next = new Date(today.getFullYear() + 1, month - 1, day);
  return Math.round((next.getTime() - today.getTime()) / 86400000);
}

// GET /api/birthdays
export async function GET(_request: NextRequest) {
  try {
    const [
      { data: rawIndividuals, error: indErr },
      { data: specialClients, error: scErr },
      { data: companies, error: compErr },
      { data: messageLogs, error: logErr },
      { data: registryEmployees, error: empErr },
    ] = await Promise.all([
      supabase
        .from('registry_individuals')
        .select('id, full_name, first_name, last_name, date_of_birth, birthday_group_category, employment_data, relationships, contact_details'),
      supabase
        .from('client_associations')
        .select('id, name, date_of_birth, birthday_group_category, category, relationship, related_to'),
      supabase
        .from('acc_portal_company_duplicate')
        .select('id, company_name'),
      supabase
        .from('birthday_message_logs')
        .select('registry_individual_id, response_status, sent_at, google_calendar_sync')
        .order('sent_at', { ascending: false }),
      supabase.from('registry_employees').select('*'),
    ]);

    if (indErr) return NextResponse.json({ error: indErr.message }, { status: 500 });
    if (scErr) return NextResponse.json({ error: scErr.message }, { status: 500 });
    if (compErr) return NextResponse.json({ error: compErr.message }, { status: 500 });

    const companyMap = new Map((companies || []).map((c: any) => [String(c.id), c.company_name]));

    const enrichedIndividuals = (rawIndividuals || []).map((ind: any) => {
      const empRecords = (registryEmployees || []).filter(
        (e: any) => String(e.individual_id) === String(ind.id)
      );
      const existingAssociations = ind.employment_data?.associations ?? [];
      const existingEmpCompanyIds = new Set(
        existingAssociations
          .filter((a: any) => String(a.individual_type).toLowerCase() === 'employee')
          .map((a: any) => String(a.company_id))
      );
      const newAssociations = empRecords
        .filter((emp: any) => !existingEmpCompanyIds.has(String(emp.company_id)))
        .map((emp: any) => ({
          individual_type: 'Employee',
          company_id: emp.company_id,
          is_current: emp.employment_status === 'active',
          position: emp.position || emp.job_title || '',
        }));
      return {
        ...ind,
        employment_data: {
          ...(ind.employment_data ?? {}),
          associations: [...existingAssociations, ...newAssociations],
        },
      };
    });

    const processedIndividuals = processIndividualsByPrincipalStrategy(enrichedIndividuals, companyMap, []);
    const allRows: any[] = [];

    processedIndividuals.forEach((ind: any) => {
      const flags = parseBirthday(ind.birthday_group_category);
      const days = getDaysUntil(ind.date_of_birth);
      if (days === null || days > 30) return;

      const log = (messageLogs || []).find(
        (l: any) => String(l.registry_individual_id) === String(ind.id)
      );
      let compName = 'Not Allocated';
      let principalName = '';
      const associations = ind.employment_data?.associations || [];

      if (ind.isDependant) {
        const rel = Array.isArray(ind.relationships)
          ? ind.relationships.find((r: any) => r.is_principal && r.individual_id)
          : null;
        if (rel) {
          const principal = processedIndividuals.find(
            (p: any) => String(p.id) === String(rel.individual_id)
          );
          principalName = principal?.full_name || '';
          const pAssocs = principal?.employment_data?.associations || [];
          const pPrimary =
            pAssocs.find((a: any) => a.individual_type === 'Principal') || pAssocs[0];
          if (pPrimary) compName = companyMap.get(String(pPrimary.company_id)) || 'Not Allocated';
        }
      } else {
        const rolePriority = ['Principal', 'Director', 'Shareholder', 'Employee'];
        let primaryAssoc = null;
        for (const role of rolePriority) {
          primaryAssoc = associations.find((a: any) => a.individual_type === role);
          if (primaryAssoc) break;
        }
        if (!primaryAssoc && associations.length > 0) primaryAssoc = associations[0];
        if (primaryAssoc) compName = companyMap.get(String(primaryAssoc.company_id)) || 'Not Allocated';
      }

      allRows.push({
        id: String(ind.id),
        name: ind.full_name || `${ind.first_name || ''} ${ind.last_name || ''}`.trim(),
        company: compName,
        principalName,
        dob: ind.date_of_birth,
        daysUntil: days,
        ...flags,
        messageSent: !!log?.sent_at,
        calendarSynced: !!log?.google_calendar_sync,
        isDependant: !!ind.isDependant,
      });
    });

    (specialClients || []).forEach((sc: any) => {
      const flags = parseBirthday(sc.birthday_group_category);
      const days = getDaysUntil(sc.date_of_birth);
      if (days === null || days > 30) return;
      const log = (messageLogs || []).find(
        (l: any) => String(l.registry_individual_id) === String(sc.id)
      );
      allRows.push({
        id: String(sc.id),
        name: sc.name || '',
        company: sc.category || 'Third Party',
        principalName: sc.related_to || '',
        dob: sc.date_of_birth,
        daysUntil: days,
        ...flags,
        messageSent: !!log?.sent_at,
        calendarSynced: !!log?.google_calendar_sync,
        isSpecialClient: true,
        isDependant: false,
      });
    });

    allRows.sort((a, b) => a.daysUntil - b.daysUntil);
    return NextResponse.json(allRows);
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to fetch birthdays' }, { status: 500 });
  }
}
