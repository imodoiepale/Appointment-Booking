import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import {
  listUsersMeetingsAccess,
  resetUserToRoleDefaults,
  setUserPermissionChanges,
  toKeys,
} from "@/lib/auth/access";
import { PERMISSION_KEYS, type PermissionKey } from "@/lib/auth/permissions";
import { accessErrorResponse, requireSuperAdmin } from "../_auth";

// BCL Meetings users and their access (scanner_users.meetings_access).
//   GET                 — the user list (with companies, for the BCL Staff / All Users switch)
//   GET ?userIds=a,b    — those users' permissions
//   PATCH { userIds, permissions: { key: bool } } · DELETE ?userIds=a,b (reset to role defaults)

const KEYS = new Set<string>(PERMISSION_KEYS);

const supabase = () => createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

function idsFrom(request: NextRequest): string[] {
  return Array.from(new Set((request.nextUrl.searchParams.get("userIds") ?? "").split(",").map((id) => id.trim()).filter(Boolean)));
}

async function accessByUser(userIds: string[]) {
  const wanted = new Set(userIds);
  const users = (await listUsersMeetingsAccess()).filter((u) => wanted.has(u.id));
  return Object.fromEntries(users.map((u) => [u.id, { role: u.role, permissions: toKeys(u.permissions) }]));
}

export async function GET(request: NextRequest) {
  try {
    await requireSuperAdmin(request);

    const userIds = idsFrom(request);
    if (userIds.length > 0) {
      return NextResponse.json({ success: true, accessByUser: await accessByUser(userIds) });
    }

    const { data, error } = await supabase()
      .from("scanner_users")
      .select("id, first_name, last_name, username, email, role, is_active, company_id, company_ids")
      .order("first_name", { ascending: true });
    if (error) throw error;

    return NextResponse.json({
      success: true,
      users: (data ?? []).map((u: Record<string, any>) => ({
        id: String(u.id),
        displayName: [u.first_name, u.last_name].filter(Boolean).join(" ") || u.username || u.email || "User",
        email: u.email ?? null,
        role: String(u.role ?? ""),
        isActive: u.is_active !== false,
        companyIds: [...(Array.isArray(u.company_ids) ? u.company_ids : [u.company_ids]), u.company_id].filter((v) => v != null),
        hasAllCompanyAccess:
          u.role === "SuperAdmin" ||
          (Array.isArray(u.company_ids) && u.company_ids.some((v: unknown) => String(v).toLowerCase() === "all")),
      })),
    });
  } catch (error) {
    return accessErrorResponse(error, "Failed to load user access");
  }
}

export async function PATCH(request: NextRequest) {
  try {
    await requireSuperAdmin(request);
    const body = (await request.json()) as { userIds?: unknown; permissions?: Record<string, unknown> };
    const userIds = Array.isArray(body.userIds) ? body.userIds.filter((id): id is string => typeof id === "string") : [];
    if (userIds.length === 0) return NextResponse.json({ success: false, error: "userIds is required." }, { status: 400 });

    const changes: Partial<Record<PermissionKey, boolean>> = {};
    for (const [key, value] of Object.entries(body.permissions ?? {})) {
      if (!KEYS.has(key) || typeof value !== "boolean") {
        return NextResponse.json({ success: false, error: `Invalid permission change: ${key}` }, { status: 400 });
      }
      changes[key as PermissionKey] = value;
    }

    const wanted = new Set(userIds);
    const targets = (await listUsersMeetingsAccess()).filter((u) => wanted.has(u.id) && u.role !== "SuperAdmin");
    await Promise.all(targets.map((u) => setUserPermissionChanges(u, changes)));
    return NextResponse.json({ success: true, accessByUser: await accessByUser(userIds) });
  } catch (error) {
    return accessErrorResponse(error, "Failed to save user access");
  }
}

export async function DELETE(request: NextRequest) {
  try {
    await requireSuperAdmin(request);
    const userIds = idsFrom(request);
    if (userIds.length === 0) return NextResponse.json({ success: false, error: "userIds is required." }, { status: 400 });

    const wanted = new Set(userIds);
    const targets = (await listUsersMeetingsAccess()).filter((u) => wanted.has(u.id) && u.role !== "SuperAdmin");
    await Promise.all(targets.map((u) => resetUserToRoleDefaults(u)));
    return NextResponse.json({ success: true, accessByUser: await accessByUser(userIds) });
  } catch (error) {
    return accessErrorResponse(error, "Failed to reset user access");
  }
}
