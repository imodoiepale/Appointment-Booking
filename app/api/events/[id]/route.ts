import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '../_shared';

function toInteger(v: unknown, fallback = 0) {
  const n = typeof v === 'number' ? v : parseInt(String(v ?? ''), 10);
  return Number.isFinite(n) ? n : fallback;
}

function toEventPatch(body: Record<string, any>) {
  const allowed = [
    'event_name', 'event_type', 'event_date', 'event_day',
    'event_start_time', 'event_end_time', 'event_duration',
    'event_venue', 'event_venue_area', 'event_description',
    'organizer_name', 'organizer_company', 'organizer_email', 'organizer_mobile',
    'bcl_attendee', 'bcl_attendee_mobile', 'expected_attendees',
    'status', 'badge_status', 'google_event_id', 'updated_by',
  ];
  const patch: Record<string, any> = {};
  for (const k of allowed) {
    if (k in body) patch[k] = body[k];
  }
  if (patch.event_duration != null) patch.event_duration = toInteger(patch.event_duration);
  if (patch.expected_attendees != null) patch.expected_attendees = toInteger(patch.expected_attendees);
  return patch;
}

// ── GET /api/events/[id] ─────────────────────────────────────────────────────
export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const id = parseInt(params.id, 10);
  if (!Number.isFinite(id)) return NextResponse.json({ error: 'Invalid id' }, { status: 400 });

  const { data, error } = await supabase.from('bcl_events').select('*').eq('id', id).single();
  if (error) return NextResponse.json({ error: error.message }, { status: 404 });
  return NextResponse.json(data);
}

// ── PATCH /api/events/[id] ────────────────────────────────────────────────────
export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  const id = parseInt(params.id, 10);
  if (!Number.isFinite(id)) return NextResponse.json({ error: 'Invalid id' }, { status: 400 });

  try {
    const body = await request.json();
    const patch = toEventPatch(body);

    if (Object.keys(patch).length === 0) {
      return NextResponse.json({ error: 'No valid fields to update' }, { status: 400 });
    }

    const { data, error } = await supabase
      .from('bcl_events')
      .update(patch)
      .eq('id', id)
      .select()
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json(data);
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Update failed' }, { status: 500 });
  }
}

// ── DELETE /api/events/[id] ───────────────────────────────────────────────────
export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const id = parseInt(params.id, 10);
  if (!Number.isFinite(id)) return NextResponse.json({ error: 'Invalid id' }, { status: 400 });

  try {
    // If a Google Calendar event exists, delete it first (best-effort)
    const { data: ev } = await supabase
      .from('bcl_events')
      .select('google_event_id')
      .eq('id', id)
      .single();

    if (ev?.google_event_id) {
      try {
        const { deleteGoogleCalendarEntryForEvent } = await import('@/utils/googleCalendarService');
        await deleteGoogleCalendarEntryForEvent(id);
      } catch {
        // Non-fatal — continue with DB deletion
      }
    }

    const { error } = await supabase.from('bcl_events').delete().eq('id', id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Delete failed' }, { status: 500 });
  }
}
