import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const email = request.cookies.get("google_user_email")?.value || null;
  return NextResponse.json({ email });
}
