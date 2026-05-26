import { NextRequest, NextResponse } from "next/server";

export const GET = async (request: NextRequest) => {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  const redirectUri = `${baseUrl}/api/auth/google/callback`;
  const scope = "https://www.googleapis.com/auth/calendar https://www.googleapis.com/auth/userinfo.email";
  const loginHint = request.nextUrl.searchParams.get("login_hint") || request.headers.get("x-scanner-user-email") || "";
  const mobileUserId = request.nextUrl.searchParams.get("mobile_user_id") || request.headers.get("x-scanner-user-id") || "";
  const source = request.nextUrl.searchParams.get("source") || "web";
  const prompt = request.nextUrl.searchParams.get("prompt") || (loginHint ? "select_account consent" : "consent");

  if (!clientId) {
    return NextResponse.json({ error: "Google Client ID not configured" }, { status: 500 });
  }

  const authParams = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: "code",
    scope,
    access_type: "offline",
    prompt,
    state: Buffer.from(JSON.stringify({ loginHint, mobileUserId, source })).toString("base64url"),
  });

  if (loginHint) authParams.set("login_hint", loginHint);

  return NextResponse.redirect(`https://accounts.google.com/o/oauth2/v2/auth?${authParams.toString()}`);
};
