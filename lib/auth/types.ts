export type UserRole = "admin" | "user";

export interface AuthUser {
  id: string;
  firebaseUid: string | null;
  role: UserRole;
  username: string | null;
  email: string | null;
  displayName: string;
  isActive: boolean;
}

export interface AppSession {
  tokenUid: string;
  user: AuthUser;
}
