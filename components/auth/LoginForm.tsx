"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { signInWithCustomToken } from "firebase/auth";
import { Eye, EyeOff, Lock, Mail } from "lucide-react";
import { getFirebaseAuthClient, isFirebaseClientReady } from "@/lib/firebase/client";

const SIGN_IN_UNAVAILABLE_MESSAGE =
  "Sign-in is not available right now. Please try again later or contact support.";

const REMEMBERED_LOGIN_KEY = "meetings-login-identifier";

function toFriendlyLoginMessage(error: unknown) {
  if (!(error instanceof Error) || !error.message.trim()) return "Unable to sign in right now.";
  if (
    error.message.includes("Missing required environment variable") ||
    error.message.toLowerCase().includes("firebase") ||
    error.message.toLowerCase().includes("internal server error")
  ) {
    return SIGN_IN_UNAVAILABLE_MESSAGE;
  }
  return error.message;
}

export function LoginForm() {
  const [identifier, setIdentifier]     = useState("");
  const [password, setPassword]         = useState("");
  const [rememberMe, setRememberMe]     = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError]               = useState<string | null>(null);
  const [isMounted, setIsMounted]       = useState(false);
  const isSignInAvailable = isFirebaseClientReady();

  useEffect(() => {
    setIsMounted(true);
    return () => setIsMounted(false);
  }, []);

  useEffect(() => {
    try {
      const remembered = window.localStorage.getItem(REMEMBERED_LOGIN_KEY);
      if (remembered) { setIdentifier(remembered); setRememberMe(true); }
    } catch { /* ignore */ }
  }, []);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    if (!isSignInAvailable) { setError(SIGN_IN_UNAVAILABLE_MESSAGE); return; }
    setIsSubmitting(true);

    try {
      const loginResponse = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ identifier, password }),
      });
      const loginJson = await loginResponse.json() as { success?: boolean; customToken?: string; error?: string };
      if (!loginResponse.ok || !loginJson.customToken) {
        throw new Error(loginJson.error ?? "Login failed.");
      }

      const firebaseAuth = getFirebaseAuthClient();
      if (!firebaseAuth) throw new Error(SIGN_IN_UNAVAILABLE_MESSAGE);

      const credential = await signInWithCustomToken(firebaseAuth, loginJson.customToken);
      const idToken    = await credential.user.getIdToken();

      const sessionResponse = await fetch("/api/auth/session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ idToken }),
      });
      const sessionJson = await sessionResponse.json() as { success?: boolean; error?: string };
      if (!sessionResponse.ok) throw new Error(sessionJson.error ?? "Failed to create session.");

      try {
        if (rememberMe) window.localStorage.setItem(REMEMBERED_LOGIN_KEY, identifier);
        else            window.localStorage.removeItem(REMEMBERED_LOGIN_KEY);
      } catch { /* ignore */ }

      window.location.replace("/");
    } catch (submitError) {
      setError(toFriendlyLoginMessage(submitError));
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <>
      {isMounted && isSubmitting
        ? createPortal(
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 backdrop-blur-sm">
              <div className="flex min-w-[260px] items-center gap-3 rounded-xl border border-white/20 bg-white px-5 py-4 shadow-2xl">
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-slate-200 border-t-blue-600" />
                <span className="text-sm font-semibold text-slate-800">Signing in...</span>
              </div>
            </div>,
            document.body
          )
        : null}

      <form onSubmit={handleSubmit} className="space-y-5">
        {!isSignInAvailable && (
          <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
            {SIGN_IN_UNAVAILABLE_MESSAGE}
          </div>
        )}
        {error && (
          <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        <div className="space-y-1.5">
          <label htmlFor="login-identifier" className="text-sm font-medium text-slate-700">
            Email or Username
          </label>
          <div className="relative">
            <Mail className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              id="login-identifier"
              type="text"
              value={identifier}
              onChange={(e) => setIdentifier(e.target.value)}
              autoComplete="username"
              placeholder="you@company.com"
              required
              className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 pl-10 text-slate-900 placeholder-slate-400 transition-all focus:border-blue-600 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-600/20"
            />
          </div>
        </div>

        <div className="space-y-1.5">
          <label htmlFor="login-password" className="text-sm font-medium text-slate-700">
            Password
          </label>
          <div className="relative">
            <Lock className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              id="login-password"
              type={showPassword ? "text" : "password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
              placeholder="Enter your password"
              required
              className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 pl-10 pr-10 text-slate-900 placeholder-slate-400 transition-all focus:border-blue-600 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-600/20"
            />
            <button
              type="button"
              onClick={() => setShowPassword((v) => !v)}
              className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 transition-colors hover:text-slate-600"
              aria-label={showPassword ? "Hide password" : "Show password"}
            >
              {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            id="remember-me"
            checked={rememberMe}
            onChange={(e) => setRememberMe(e.target.checked)}
            className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-600"
          />
          <label htmlFor="remember-me" className="text-sm text-slate-600">
            Remember me on this device
          </label>
        </div>

        <button
          type="submit"
          disabled={isSubmitting || !isSignInAvailable}
          className="w-full rounded-xl bg-blue-600 px-4 py-3 font-semibold text-white shadow-lg shadow-blue-600/25 transition-all hover:bg-[#0B9579] focus:outline-none focus:ring-2 focus:ring-blue-600 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isSubmitting ? (
            <span className="flex items-center justify-center gap-2">
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
              Signing in...
            </span>
          ) : (
            "Sign in to Meeting Dashboard"
          )}
        </button>
      </form>
    </>
  );
}
