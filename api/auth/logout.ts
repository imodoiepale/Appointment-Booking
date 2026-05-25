import { NextRequest, NextResponse } from "next/server";
import { AUTH_SESSION_COOKIE_NAME } from "@/lib/auth/session";

export async function POST(req: NextRequest) {
  const response = NextResponse.json({ success: true });
  response.cookies.delete(AUTH_SESSION_COOKIE_NAME);
  return response;
}
