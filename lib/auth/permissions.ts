// BCL Meetings permissions. A user's complete set lives in scanner_users.meetings_access
// ({ permissions: { key: bool } }); a "role" is just the users who have it (shared model with
// BCL Registry, Task Manager and KRA Tools). Safe to import from client and server code.

export type PermissionKey =
  | "home.view"
  | "meetings.view"
  | "events.view"
  | "birthdays.view"
  | "tasks_reports.view"
  | "calendar.view"
  | "notifications.view"
  | "schedule.view"
  | "settings.view";

export interface PermissionDefinition {
  key: PermissionKey;
  label: string;
  group: string;
  /** Pages this permission opens (longest matching prefix wins). */
  paths: string[];
}

export const PERMISSIONS: PermissionDefinition[] = [
  { key: "home.view", label: "Overview", group: "Workspace", paths: ["/home"] },
  { key: "meetings.view", label: "Meetings", group: "Workspace", paths: ["/dashboard"] },
  { key: "schedule.view", label: "Schedule Meeting", group: "Workspace", paths: ["/schedule"] },
  { key: "calendar.view", label: "Calendar", group: "Workspace", paths: ["/calendar"] },
  { key: "events.view", label: "Events", group: "Team", paths: ["/events"] },
  { key: "birthdays.view", label: "Birthdays", group: "Team", paths: ["/birthdays"] },
  { key: "tasks_reports.view", label: "Tasks Reports", group: "Team", paths: ["/tasks"] },
  { key: "notifications.view", label: "Notifications", group: "Account", paths: ["/notifications"] },
  { key: "settings.view", label: "Settings", group: "Account", paths: ["/settings"] },
];

export const PERMISSION_KEYS = PERMISSIONS.map((p) => p.key);

/**
 * Built-in defaults used to fill an empty column (new users, or after a role change). Every
 * role starts with every page — what everyone had before access control existed — and admins
 * narrow it from the User Access page.
 */
export function defaultPermissionsForRole(_role: string): PermissionKey[] {
  return [...PERMISSION_KEYS];
}

/** The permission guarding a path, or null for paths nobody needs a permission for. */
export function findPermissionForPath(pathname: string): PermissionDefinition | null {
  const path = pathname.replace(/\/+$/, "") || "/";
  let best: { definition: PermissionDefinition; length: number } | null = null;
  for (const definition of PERMISSIONS) {
    for (const prefix of definition.paths) {
      if ((path === prefix || path.startsWith(`${prefix}/`)) && (!best || prefix.length > best.length)) {
        best = { definition, length: prefix.length };
      }
    }
  }
  return best?.definition ?? null;
}

/** The User Access admin page is for Super Admins only, regardless of permissions. */
export const USER_ACCESS_PATH = "/settings/user-access";
