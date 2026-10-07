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

function extractIndividualContact(ind: any): { email: string; phone: string; altPhone: string; whatsapp: string } {
  const raw = ind?.contact_details;
  const obj = Array.isArray(raw) && raw.length > 0
    ? raw[0]
    : (raw && typeof raw === 'object' && !Array.isArray(raw) ? raw : null);
  return {
    email: obj?.email?.primary || '',
    phone: obj?.phone?.kenyan?.primary || '',
    altPhone: obj?.phone?.kenyan?.secondary || '',
    whatsapp: obj?.phone?.whatsapp || '',
  };
}

function computeMissingFields(email: string, phone: string, whatsapp: string): string[] {
  const missing: string[] = [];
  if (!email) missing.push('email');
  if (!phone && !whatsapp) missing.push('phone');
  return missing;
}

// GET /api/birthdays
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const limitDaysParam = searchParams.get('days');
    const limitDays = limitDaysParam ? parseInt(limitDaysParam, 10) : null;

    const [
      { data: rawIndividuals, error: indErr },
      { data: specialClients, error: scErr },
      { data: companies, error: compErr },
      { data: messageLogs, error: logErr },
      { data: registryEmployees, error: empErr },
    ] = await Promise.all([
      supabase
        .from('registry_individuals')
        .select('id, full_name, first_name, last_name, date_of_birth, birthday_group_category, employment_data, relationships, contact_details, marital_status'),
      supabase
        .from('client_associations')
        .select('id, name, date_of_birth, birthday_group_category, category, relationship, related_to, phone, email'),
      supabase
        .from('acc_portal_company_duplicate')
        .select('id, company_name'),
      supabase
        .from('birthday_message_logs')
        .select('registry_individual_id, special_client_id, response_status, sent_at, google_calendar_sync')
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
      if (days === null || (limitDays !== null && days > limitDays)) return;

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

      const contact = extractIndividualContact(ind);
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
        isSpecialClient: false,
        email: contact.email,
        phone: contact.phone,
        altPhone: contact.altPhone,
        whatsapp: contact.whatsapp,
        maritalStatus: ind.marital_status || '',
        missingFields: computeMissingFields(contact.email, contact.phone, contact.whatsapp),
      });
    });

    (specialClients || []).forEach((sc: any) => {
      const flags = parseBirthday(sc.birthday_group_category);
      const days = getDaysUntil(sc.date_of_birth);
      if (days === null || (limitDays !== null && days > limitDays)) return;
      const log = (messageLogs || []).find(
        (l: any) => String(l.registry_individual_id) === String(sc.id) || String(l.special_client_id) === String(sc.id)
      );
      const email = sc.email || '';
      const phone = sc.phone || '';

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
        email,
        phone,
        altPhone: '',
        whatsapp: '',
        maritalStatus: '',
        missingFields: computeMissingFields(email, phone, ''),
      });
    });

    allRows.sort((a, b) => a.daysUntil - b.daysUntil);
    return NextResponse.json(allRows);
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to fetch birthdays' }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  try {
    const body = await req.json().catch(() => null);
    const id = body?.id ? String(body.id) : '';
    if (!id) {
      return NextResponse.json({ error: 'id is required' }, { status: 400 });
    }
    const { isSpecialClient, email, phone, altPhone, whatsapp, maritalStatus } = body;

    if (isSpecialClient) {
      const updateData: Record<string, any> = {};
      if (email !== undefined) updateData.email = email;
      if (phone !== undefined) updateData.phone = phone;

      if (Object.keys(updateData).length === 0) {
        return NextResponse.json({ error: 'No fields to update' }, { status: 400 });
      }

      const { error } = await supabase.from('client_associations').update(updateData).eq('id', id);
      if (error) throw error;
    } else {
      const { data: existing, error: fetchErr } = await supabase
        .from('registry_individuals')
        .select('contact_details')
        .eq('id', id)
        .single();
      if (fetchErr) throw fetchErr;

      const raw = existing?.contact_details;
      const contactObj: any = Array.isArray(raw) && raw.length > 0
        ? JSON.parse(JSON.stringify(raw[0]))
        : (raw && typeof raw === 'object' && !Array.isArray(raw) ? JSON.parse(JSON.stringify(raw)) : {});

      if (!contactObj.phone) contactObj.phone = {};
      if (!contactObj.phone.kenyan) contactObj.phone.kenyan = {};
      if (!contactObj.email) contactObj.email = {};

      if (email !== undefined) contactObj.email.primary = email;
      if (phone !== undefined) contactObj.phone.kenyan.primary = phone;
      if (altPhone !== undefined) contactObj.phone.kenyan.secondary = altPhone;
      if (whatsapp !== undefined) contactObj.phone.whatsapp = whatsapp;

      const updateData: Record<string, any> = { contact_details: [contactObj] };
      if (maritalStatus !== undefined) updateData.marital_status = maritalStatus;

      const { error } = await supabase.from('registry_individuals').update(updateData).eq('id', id);
      if (error) throw error;
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to update contact details' }, { status: 500 });
  }
}
