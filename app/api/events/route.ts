import { NextRequest, NextResponse } from 'next/server';
import { supabase, normaliseBclAttendee, enrichWithAttendeeNames, resolveCallerUser, ADMIN_ROLES } from './_shared';

const ACTIVE_STATUSES = ['upcoming', 'confirmed'];

function toInteger(v: unknown, fallback = 0) {
  const n = typeof v === 'number' ? v : parseInt(String(v ?? ''), 10);
  return Number.isFinite(n) ? n : fallback;
}

function escapeOrValue(v: string) { return v.replace(/[(),]/g, ' ').trim(); }

function applyScopeToQuery(query: any, user: { id: string; email: string; role: string } | null) {
  if (!user || ADMIN_ROLES.has(user.role.toLowerCase())) return query;
  const clauses = [
    `created_by.eq.${user.id}`,
    `bcl_attendee.like.%"${user.id}"%`,
    ...(user.email ? [
      `created_by.eq.${escapeOrValue(user.email)}`,
      `updated_by.eq.${escapeOrValue(user.email)}`,
    ] : []),
  ];
  return query.or(clauses.join(','));
}

function timeToMinutes(t: string): number | null {
  const [h, m] = t.split(':').map(Number);
  if (!Number.isFinite(h) || !Number.isFinite(m)) return null;
  return h * 60 + m;
}

function computeDuration(start: string, end: string): number | null {
  const s = timeToMinutes(start);
  const e = timeToMinutes(end);
  return s !== null && e !== null ? e - s : null;
}

function toEventPayload(body: Record<string, any>, callerUser?: { id: string; email: string } | null) {
  const user = callerUser ?? { id: '', email: '' };
  const startTime: string = body.event_start_time;
  const endTime: string = body.event_end_time;
  const duration =
    body.event_duration != null
      ? toInteger(body.event_duration)
      : (computeDuration(startTime, endTime) ?? 0);

  return {
    event_name: body.event_name,
    event_type: body.event_type || 'other',
    event_date: body.event_date,
    event_day:
      body.event_day ||
      (body.event_date
        ? new Date(body.event_date).toLocaleDateString('en-US', { weekday: 'long' })
        : null),
    event_start_time: startTime,
    event_end_time: endTime,
    event_duration: duration,
    event_venue: body.event_venue || '',
    event_venue_area: body.event_venue_area || '',
    event_description: body.event_description || '',
    organizer_name: body.organizer_name || '',
    organizer_company: body.organizer_company || '',
    organizer_email: body.organizer_email || '',
    organizer_mobile: body.organizer_mobile || '',
    bcl_attendee: normaliseBclAttendee(body.bcl_attendee),
    bcl_attendee_mobile: body.bcl_attendee_mobile || '',
    expected_attendees: toInteger(body.expected_attendees, 0),
    status: body.status || 'upcoming',
    badge_status: body.badge_status || 'Open',
    google_event_id: body.google_event_id ?? null,
    created_by: body.created_by ?? (user.id || user.email || null),
    updated_by: body.updated_by ?? null,
  };
}

// ── GET /api/events ──────────────────────────────────────────────────────────
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const date = searchParams.get('date');
    const status = searchParams.get('status');
    const limit = searchParams.get('limit');
    const order = searchParams.get('order') === 'asc' ? 'asc' : 'desc';

    const caller = await resolveCallerUser(request);
    let query = applyScopeToQuery(supabase.from('bcl_events').select('*'), caller);
    if (date) query = query.eq('event_date', date);
    if (status) query = query.eq('status', status);
    if (limit) query = query.limit(toInteger(limit, 100));
    query = query
      .order('event_date', { ascending: order === 'asc' })
      .order('event_start_time', { ascending: order === 'asc' });

    const { data, error } = await query;
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    const enriched = await enrichWithAttendeeNames(data ?? []);
    return NextResponse.json(enriched);
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to fetch events' }, { status: 500 });
  }
}

// ── POST /api/events ─────────────────────────────────────────────────────────
export async function POST(request: NextRequest) {
  try {
    const [body, caller] = await Promise.all([request.json(), resolveCallerUser(request)]);
    const payload = toEventPayload(body, caller);

    if (!payload.event_name || !payload.event_date || !payload.event_start_time || !payload.event_end_time) {
      return NextResponse.json(
        { error: 'event_name, event_date, event_start_time, and event_end_time are required' },
        { status: 400 }
      );
    }

    const newStart = timeToMinutes(payload.event_start_time);
    const newEnd = timeToMinutes(payload.event_end_time);

    if (newStart !== null && newEnd !== null) {
      // ── Conflict: other events on the same date ──────────────────────────
      const { data: existingEvents, error: evErr } = await supabase
        .from('bcl_events')
        .select('id, event_start_time, event_end_time, event_name')
        .eq('event_date', payload.event_date)
        .in('status', ACTIVE_STATUSES);

      if (evErr) return NextResponse.json({ error: evErr.message }, { status: 500 });

      const evConflict = (existingEvents ?? []).find((ev) => {
        const s = timeToMinutes(ev.event_start_time);
        const e = timeToMinutes(ev.event_end_time);
        return s !== null && e !== null && newStart < e && s < newEnd;
      });
      if (evConflict) {
        return NextResponse.json(
          { error: `Time slot conflicts with existing event "${evConflict.event_name}".` },
          { status: 409 }
        );
      }

      // ── Conflict: meetings on the same date ──────────────────────────────
      const { data: existingMeetings, error: mtgErr } = await supabase
        .from('bcl_meetings_meetings')
        .select('id_main, meeting_slot_start_time, meeting_slot_end_time, client_name')
        .eq('meeting_date', payload.event_date)
        .in('status', ['upcoming', 'rescheduled']);

      if (mtgErr) return NextResponse.json({ error: mtgErr.message }, { status: 500 });

      const mtgConflict = (existingMeetings ?? []).find((m) => {
        const s = timeToMinutes(m.meeting_slot_start_time);
        const e = timeToMinutes(m.meeting_slot_end_time);
        return s !== null && e !== null && newStart < e && s < newEnd;
      });
      if (mtgConflict) {
        return NextResponse.json(
          { error: `Time slot conflicts with a meeting for ${mtgConflict.client_name}.` },
          { status: 409 }
        );
      }
    }

    const { data, error } = await supabase
      .from('bcl_events')
      .insert([payload])
      .select()
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    const [enriched] = await enrichWithAttendeeNames([data]);
    return NextResponse.json(enriched ?? data, { status: 201 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to create event' }, { status: 500 });
  }
}
