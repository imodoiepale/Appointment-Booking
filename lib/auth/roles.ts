// Who counts as an admin in BCL Meetings (sees and manages everyone's meetings and events).
// Uses the real scanner_users role names; shared by the API and the pages so both agree.
// Safe to import from client and server code.

const ADMIN_ROLE_KEYS = new Set(["superadmin", "general_admin", "company_admin"]);

export function isAdminRole(role: string | null | undefined): boolean {
  return ADMIN_ROLE_KEYS.has(String(role ?? "").trim().toLowerCase());
}
