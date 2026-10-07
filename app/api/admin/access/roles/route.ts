import { NextRequest, NextResponse } from "next/server";
import { getRoleSummaries, setRolePermissionChanges } from "@/lib/auth/access";
import { PERMISSION_KEYS, type PermissionKey } from "@/lib/auth/permissions";
import { accessErrorResponse, requireSuperAdmin } from "../_auth";

// Roles have no storage of their own: a role is the users who have it. GET summarises their
// scanner_users.meetings_access columns; PUT writes into every one of those users.

const ROLES = ["general_admin", "company_admin", "company_staff", "bcl_staff", "officer", "petty_cash_user"];
const KEYS = new Set<string>(PERMISSION_KEYS);

export async function GET(request: NextRequest) {
  try {
    await requireSuperAdmin(request);
    return NextResponse.json({ success: true, roles: await getRoleSummaries(ROLES) });
  } catch (error) {
    return accessErrorResponse(error, "Failed to load role permissions");
  }
}

/** Body: { role, changes: { [key]: boolean } } — only the keys that changed. */
export async function PUT(request: NextRequest) {
  try {
    await requireSuperAdmin(request);
    const body = (await request.json()) as { role?: string; changes?: Record<string, unknown> };
    if (!body.role || !ROLES.includes(body.role)) {
      return NextResponse.json({ success: false, error: "Invalid or missing role." }, { status: 400 });
    }

    const changes: Partial<Record<PermissionKey, boolean>> = {};
    for (const [key, value] of Object.entries(body.changes ?? {})) {
      if (!KEYS.has(key) || typeof value !== "boolean") {
        return NextResponse.json({ success: false, error: `Invalid permission change: ${key}` }, { status: 400 });
      }
      changes[key as PermissionKey] = value;
    }

    await setRolePermissionChanges(body.role, changes);
    return NextResponse.json({ success: true, roles: await getRoleSummaries(ROLES) });
  } catch (error) {
    return accessErrorResponse(error, "Failed to save role permissions");
  }
}
