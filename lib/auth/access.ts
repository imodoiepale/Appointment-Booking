import "server-only";
import {
  getUserAppAccess,
  isCompleteAccess,
  listAllUsersAppAccess,
  markComplete,
  patchUserAppAccess,
  patchUsersAppAccessByRole,
  replaceUserAppAccess,
  type AppAccessDocument,
} from "@/lib/auth/app-access";
import { PERMISSION_KEYS, defaultPermissionsForRole, type PermissionKey } from "@/lib/auth/permissions";

// Access lives entirely in scanner_users.meetings_access: { permissions: { key: bool } } holds
// each user's complete BCL Meetings permissions. A role is the users who have it — editing a
// role writes into every one of them.

export type PermissionMap = Record<PermissionKey, boolean>;

const allOn = () => Object.fromEntries(PERMISSION_KEYS.map((k) => [k, true])) as PermissionMap;

export function defaultPermissionMap(role: string): PermissionMap {
  const defaults = new Set(defaultPermissionsForRole(role));
  return Object.fromEntries(PERMISSION_KEYS.map((k) => [k, defaults.has(k)])) as PermissionMap;
}

/** Stored values, with the role default for any key missing (e.g. a page added later). */
function toPermissionMap(role: string, document: AppAccessDocument): PermissionMap {
  const defaults = defaultPermissionMap(role);
  const stored = document.permissions ?? {};
  return Object.fromEntries(
    PERMISSION_KEYS.map((k) => [k, typeof stored[k] === "boolean" ? stored[k] : defaults[k]])
  ) as PermissionMap;
}

export const toKeys = (map: PermissionMap) => PERMISSION_KEYS.filter((k) => map[k]);

/** Returns a user's complete permissions, filling an empty column from the role defaults once. */
async function ensureComplete(user: { id: string; role: string }, document: AppAccessDocument): Promise<PermissionMap> {
  if (isCompleteAccess(document)) return toPermissionMap(user.role, document);
  const map = toPermissionMap(user.role, document);
  await replaceUserAppAccess(user.id, "meetings", markComplete({ permissions: map }));
  return map;
}

/** What a signed-in scanner user can open. Super Admins always have everything. */
export async function getPermissionsForUser(user: { id: string; role: string }): Promise<PermissionKey[]> {
  if (user.role === "SuperAdmin") return [...PERMISSION_KEYS];
  return toKeys(await ensureComplete(user, await getUserAppAccess(user.id, "meetings")));
}

export interface UserMeetingsAccess {
  id: string;
  role: string;
  isActive: boolean;
  permissions: PermissionMap;
}

/** Every user with their complete permissions (filling any empty columns). */
export async function listUsersMeetingsAccess(): Promise<UserMeetingsAccess[]> {
  const rows = await listAllUsersAppAccess("meetings");
  const result: UserMeetingsAccess[] = [];
  for (let i = 0; i < rows.length; i += 10) {
    const batch = rows.slice(i, i + 10);
    result.push(
      ...(await Promise.all(
        batch.map(async (r) => ({
          id: r.id,
          role: r.role,
          isActive: r.isActive,
          permissions: r.role === "SuperAdmin" ? allOn() : await ensureComplete(r, r.document),
        }))
      ))
    );
  }
  return result;
}

export interface RoleSummary {
  role: string;
  userCount: number;
  permissions: PermissionKey[];
  partial: PermissionKey[];
}

export async function getRoleSummaries(roles: string[]): Promise<RoleSummary[]> {
  const users = await listUsersMeetingsAccess();
  return roles.map((role) => {
    const members = users.filter((u) => u.role === role);
    const permissions: PermissionKey[] = [];
    const partial: PermissionKey[] = [];
    for (const key of PERMISSION_KEYS) {
      const count = members.filter((m) => m.permissions[key]).length;
      if (members.length > 0 && count === members.length) permissions.push(key);
      else if (count > 0) partial.push(key);
    }
    return { role, userCount: members.length, permissions, partial };
  });
}

/** Bulk edit: sets these keys for every user with the role. */
export async function setRolePermissionChanges(role: string, changes: Partial<PermissionMap>): Promise<void> {
  if (Object.keys(changes).length === 0) return;
  await listUsersMeetingsAccess(); // fill empty columns first, so the patch lands on complete ones
  await patchUsersAppAccessByRole(role, "meetings", { permissions: changes });
}

export async function setUserPermissionChanges(
  user: { id: string; role: string },
  changes: Partial<PermissionMap>
): Promise<void> {
  await ensureComplete(user, await getUserAppAccess(user.id, "meetings"));
  await patchUserAppAccess(user.id, "meetings", { permissions: changes });
}

export async function resetUserToRoleDefaults(user: { id: string; role: string }): Promise<void> {
  await replaceUserAppAccess(user.id, "meetings", markComplete({ permissions: defaultPermissionMap(user.role) }));
}
