import { NextRequest } from "next/server";
import { getFirebaseAdminAuth } from "@/lib/firebase/admin";
import { createClient } from "@supabase/supabase-js";
import bcrypt from "bcryptjs";
import { timingSafeEqual } from "node:crypto";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

function isFirebaseAdminConfigurationError(error: unknown) {
  return error instanceof Error && error.message.includes("Missing required environment variable");
}

function safePlaintextCompare(input: string, stored: string): boolean {
  const left = Buffer.from(input);
  const right = Buffer.from(stored);
  if (left.length !== right.length) return false;
  return timingSafeEqual(left, right);
}

async function verifyPassword(inputPassword: string, storedPassword: string | null): Promise<boolean> {
  if (!storedPassword) return false;
  if (/^\$2[aby]\$/.test(storedPassword)) return bcrypt.compare(inputPassword, storedPassword);
  return safePlaintextCompare(inputPassword, storedPassword);
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const identifier =
      typeof body.identifier === "string" ? body.identifier.trim() :
      typeof body.username  === "string" ? body.username.trim()    :
      typeof body.email     === "string" ? body.email.trim()       : "";
    const password = typeof body.password === "string" ? body.password : "";

    if (!identifier) return Response.json({ success: false, error: "Email or username is required." }, { status: 400 });
    if (!password)   return Response.json({ success: false, error: "Password is required." }, { status: 400 });

    const { data: user, error: userError } = await supabase
      .from("scanner_users")
      .select("*")
      .or(`email.eq.${identifier},username.eq.${identifier}`)
      .single();

    if (userError || !user) {
      return Response.json({ success: false, error: "Invalid login credentials." }, { status: 401 });
    }

    if (!user.is_active) {
      return Response.json({ success: false, error: "This account is inactive." }, { status: 403 });
    }

    const passwordMatches = await verifyPassword(password, user.password);
    if (!passwordMatches) {
      return Response.json({ success: false, error: "Invalid login credentials." }, { status: 401 });
    }

    const firebaseUid = user.firebase_uid ?? `meetings:${user.id}`;
    if (!user.firebase_uid) {
      await supabase.from("scanner_users").update({ firebase_uid: firebaseUid }).eq("id", user.id);
    }

    const customToken = await getFirebaseAdminAuth().createCustomToken(firebaseUid, {
      scannerUserId: user.id,
      role: user.role,
    });

    return Response.json({
      success: true,
      customToken,
      user: {
        id: user.id,
        email: user.email,
        displayName: user.display_name,
        role: user.role,
      },
    });
  } catch (error) {
    if (isFirebaseAdminConfigurationError(error)) {
      return Response.json({ success: false, error: "Sign-in is temporarily unavailable." }, { status: 500 });
    }
    console.error("Login error:", error);
    return Response.json({ success: false, error: "Login failed. Please try again." }, { status: 500 });
  }
}
