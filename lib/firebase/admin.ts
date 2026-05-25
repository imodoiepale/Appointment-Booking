import "server-only";
import { cert, getApps, initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Missing required environment variable: ${name}`);
  return value;
}

function normalizePrivateKey(value: string): string {
  let key = value.trim();

  if (
    (key.startsWith('"') && key.endsWith('"')) ||
    (key.startsWith("'") && key.endsWith("'"))
  ) {
    key = key.slice(1, -1);
  }

  key = key.replace(/\\n/g, "\n");

  if (key.includes("\n")) {
    return key;
  }

  const beginMarker = "-----BEGIN PRIVATE KEY-----";
  const endMarker = "-----END PRIVATE KEY-----";
  const beginIndex = key.indexOf(beginMarker);
  const endIndex = key.indexOf(endMarker);

  if (beginIndex === -1 || endIndex === -1) {
    return key;
  }

  const bodyStart = beginIndex + beginMarker.length;
  const body = key
    .slice(bodyStart, endIndex)
    .replace(/\s+/g, "");

  const lines = body.match(/.{1,64}/g) ?? [];
  return [beginMarker, ...lines, endMarker].join("\n");
}

function getFirebaseAdminApp() {
  const existing = getApps()[0];
  if (existing) return existing;

  return initializeApp({
    credential: cert({
      projectId:   requireEnv("FIREBASE_PROJECT_ID"),
      clientEmail: requireEnv("FIREBASE_CLIENT_EMAIL"),
      privateKey:  normalizePrivateKey(requireEnv("FIREBASE_PRIVATE_KEY")),
    }),
  });
}

export function getFirebaseAdminAuth() {
  return getAuth(getFirebaseAdminApp());
}
