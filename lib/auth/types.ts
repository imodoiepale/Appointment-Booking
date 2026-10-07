/** The scanner_users role (e.g. "SuperAdmin", "company_admin"), or "user" for a Firebase-only account. */
export type UserRole = string;

export interface AuthUser {
  id: string;
  firebaseUid: string | null;
  role: UserRole;
  username: string | null;
  email: string | null;
  displayName: string;
  isActive: boolean;
  /** scanner_users.id — null for a Firebase-only account with no scanner_users row. */
  scannerUserId: string | null;
  isSuperAdmin: boolean;
  companyIds: number[];
  hasAllCompanyAccess: boolean;
}

export interface AppSession {
  tokenUid: string;
  user: AuthUser;
}
