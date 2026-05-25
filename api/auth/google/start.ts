import { NextRequest, NextResponse } from "next/server";

export const GET = async (request: NextRequest) => {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  const redirectUri = `${baseUrl}/api/auth/google/callback`;
  const scope = "https://www.googleapis.com/auth/calendar https://www.googleapis.com/auth/userinfo.email";

  if (!clientId) {
    return NextResponse.json({ error: "Google Client ID not configured" }, { status: 500 });
  }

  const authUrl =
    `https://accounts.google.com/o/oauth2/v2/auth?` +
    `client_id=${encodeURIComponent(clientId)}&` +
    `redirect_uri=${encodeURIComponent(redirectUri)}&` +
    `response_type=code&` +
    `scope=${encodeURIComponent(scope)}&` +
    `access_type=offline&` +
    `prompt=consent`;

  return NextResponse.redirect(authUrl);
};
