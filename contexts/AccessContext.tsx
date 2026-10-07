"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { usePathname, useRouter } from "next/navigation";
import {
  PERMISSIONS,
  USER_ACCESS_PATH,
  findPermissionForPath,
  type PermissionKey,
} from "@/lib/auth/permissions";
import type { AuthUser } from "@/lib/auth/types";

// Who is signed in and which pages they can open (from /api/auth/session, which reads
// scanner_users.meetings_access). Keeps people off pages they don't have, and lets the
// sidebar hide them. Re-checked on tab focus and every minute so admin changes apply quickly.

interface AccessContextValue {
  user: AuthUser | null;
  loading: boolean;
  can: (key: PermissionKey) => boolean;
  /** Whether the user may open this path (Super Admin-only pages included). */
  canOpen: (path: string) => boolean;
}

const AccessContext = createContext<AccessContextValue | undefined>(undefined);

const REFRESH_MS = 60_000;

export function AccessProvider({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [user, setUser] = useState<AuthUser | null>(null);
  const [permissions, setPermissions] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      const res = await fetch("/api/auth/session", { cache: "no-store", credentials: "include" });
      const json = await res.json();
      if (!json?.authenticated) {
        window.location.replace("/login");
        return;
      }
      setUser(json.user);
      setPermissions(new Set(json.permissions ?? []));
    } catch (error) {
      console.error("[access] Failed to load session", error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
    const onVisible = () => {
      if (document.visibilityState === "visible") refresh();
    };
    window.addEventListener("focus", onVisible);
    document.addEventListener("visibilitychange", onVisible);
    const timer = window.setInterval(onVisible, REFRESH_MS);
    return () => {
      window.removeEventListener("focus", onVisible);
      document.removeEventListener("visibilitychange", onVisible);
      window.clearInterval(timer);
    };
  }, [refresh]);

  const can = useCallback(
    (key: PermissionKey) => Boolean(user?.isSuperAdmin) || permissions.has(key),
    [user, permissions]
  );

  const canOpen = useCallback(
    (path: string) => {
      const bare = path.split("?")[0];
      if (bare === USER_ACCESS_PATH || bare.startsWith(`${USER_ACCESS_PATH}/`)) return Boolean(user?.isSuperAdmin);
      const permission = findPermissionForPath(bare);
      return !permission || can(permission.key);
    },
    [user, can]
  );

  // Route guard: leave a page the user can't open for the first page they can.
  useEffect(() => {
    if (loading || !user || !pathname || canOpen(pathname)) return;
    const fallback = PERMISSIONS.find((p) => can(p.key))?.paths[0];
    router.replace(fallback && fallback !== pathname ? fallback : "/login");
  }, [loading, user, pathname, canOpen, can, router]);

  const value = useMemo(() => ({ user, loading, can, canOpen }), [user, loading, can, canOpen]);
  return <AccessContext.Provider value={value}>{children}</AccessContext.Provider>;
}

export function useAccess() {
  const ctx = useContext(AccessContext);
  if (!ctx) throw new Error("useAccess must be used within AccessProvider");
  return ctx;
}
