import { NextRequest, NextResponse } from "next/server";
import { resolveCallerUser, unauthorized } from "@/app/api/meetings/_shared";
import { readIndividualBasicInfo, saveIndividualBasicInfo } from "@/lib/profileBasicInfo";

/**
 * GET   /api/registry/individuals/:id/basic-info — the individual's Basic Info sections for the mobile app's
 *       profile, as the registry profile page shows them (see lib/profileBasicInfo.ts).
 * PATCH /api/registry/individuals/:id/basic-info { values: { <field key>: <value> } } — saves edits to
 *       registry_individuals with the registry form's rules; returns the refreshed sections.
 *
 * Editing needs a staff account (not a client) whose identity is proven by a signed mobile token
 * or a web session — never the old unsigned header, since this writes registry records.
 */

function canEdit(req: NextRequest, caller: { role: string; source: string }) {
  const strongIdentity = /^Bearer\s+/i.test(req.headers.get("authorization") ?? "") || caller.source === "web";
  const role = String(caller.role ?? "").toLowerCase();
  return strongIdentity && role !== "client" && role !== "customer";
}

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const caller = await resolveCallerUser(req);
  if (!caller) return unauthorized();
  const { id } = await params;
  try {
    const payload = await readIndividualBasicInfo(id, canEdit(req, caller));
    if (!payload) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json(payload, { headers: { "Cache-Control": "no-store" } });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || "Failed to load basic info" }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const caller = await resolveCallerUser(req);
  if (!caller) return unauthorized();
  if (!canEdit(req, caller)) return NextResponse.json({ error: "You can't edit this profile" }, { status: 403 });
  const { id } = await params;
  try {
    const body = await req.json().catch(() => ({}));
    const values = body?.values && typeof body.values === "object" ? body.values : {};
    await saveIndividualBasicInfo(id, values);
    console.info(`[registry/individuals/basic-info] ${id} edited by user=${caller.id}: ${Object.keys(values).join(", ")}`);
    return NextResponse.json(await readIndividualBasicInfo(id, true), { headers: { "Cache-Control": "no-store" } });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || "Failed to save" }, { status: 500 });
  }
}
