import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const accessToken = request.cookies.get("google_access_token")?.value;
  const refreshToken = request.cookies.get("google_refresh_token")?.value;

  return NextResponse.json({
    connected: Boolean(accessToken || refreshToken),
  });
}
