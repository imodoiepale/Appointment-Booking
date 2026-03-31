import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const code = searchParams.get("code");

  // Try alternative extraction method
  if (!code) {
    const url = new URL(request.url);
    const altCode = url.searchParams.get("code");

    if (!altCode) {
      return NextResponse.json({ error: "Authorization code is required" }, { status: 400 });
    }

    // Use the alternative code
    return await handleOAuthCode(altCode, request);
  }

  return await handleOAuthCode(code, request);
}

async function handleOAuthCode(code: string, request: NextRequest) {
  try {
    const existingRefreshToken = request.cookies.get("google_refresh_token")?.value;
    const response = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded"
      },
      body: new URLSearchParams({
        client_id: process.env.GOOGLE_CLIENT_ID!,
        client_secret: process.env.GOOGLE_CLIENT_SECRET!,
        code: code,
        grant_type: "authorization_code",
        redirect_uri: process.env.GOOGLE_REDIRECT_URI || "http://localhost:3000/api/auth/google/callback"
      }).toString()
    });

    const data = await response.json();

    if (data.error) {
      console.error("OAuth error:", data.error);
      return NextResponse.json({ error: data.error_description || data.error || "Authentication failed" }, { status: 400 });
    }

    // Store tokens securely (in production, use httpOnly cookies)
    const redirectResponse = NextResponse.redirect(new URL("/calendar-auth-success", request.url));

    // Set the access token in a secure cookie
    redirectResponse.cookies.set("google_access_token", data.access_token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 60
    });

    const refreshToken = data.refresh_token || existingRefreshToken;

    if (refreshToken) {
      redirectResponse.cookies.set("google_refresh_token", refreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        maxAge: 60 * 60 * 24 * 180
      });
    }

    return redirectResponse;
  } catch (error) {
    console.error("Google OAuth callback error:", error);
    return NextResponse.json({ error: "Authentication failed" }, { status: 500 });
  }
}
