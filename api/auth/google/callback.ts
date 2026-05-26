import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const code = searchParams.get("code");
  const state = parseOAuthState(searchParams.get("state"));

  if (!code) {
    const url = new URL(request.url);
    const altCode = url.searchParams.get("code");

    if (!altCode) {
      return NextResponse.json({ error: "Authorization code is required" }, { status: 400 });
    }

    return await handleOAuthCode(altCode, request, state);
  }

  return await handleOAuthCode(code, request, state);
}

function parseOAuthState(rawState: string | null) {
  if (!rawState) return { loginHint: "", mobileUserId: "", source: "web" };
  try {
    const parsed = JSON.parse(Buffer.from(rawState, "base64url").toString("utf8"));
    return {
      loginHint: typeof parsed.loginHint === "string" ? parsed.loginHint : "",
      mobileUserId: typeof parsed.mobileUserId === "string" ? parsed.mobileUserId : "",
      source: typeof parsed.source === "string" ? parsed.source : "web",
    };
  } catch {
    return { loginHint: "", mobileUserId: "", source: "web" };
  }
}

async function handleOAuthCode(
  code: string,
  request: NextRequest,
  state: { loginHint: string; mobileUserId: string; source: string }
) {
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
        redirect_uri: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/auth/google/callback`
      }).toString()
    });

    const data = await response.json();

    if (data.error) {
      console.error("OAuth error:", data.error);
      return NextResponse.json({ error: data.error_description || data.error || "Authentication failed" }, { status: 400 });
    }

    const refreshToken = data.refresh_token || existingRefreshToken;

    // Fetch the real Google account email so we can track who is authenticated
    let googleUserEmail = '';
    try {
      const userInfoRes = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
        headers: { Authorization: `Bearer ${data.access_token}` },
      });
      const userInfo = await userInfoRes.json();
      googleUserEmail = userInfo.email || '';
    } catch {
      // Non-fatal — email tracking is best-effort
    }

    // Persist refresh token to Supabase so any device can use it without re-connecting
    if (refreshToken) {
      const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
      );
      const accountUserId = state.mobileUserId || googleUserEmail || state.loginHint || "google_calendar_auth";
      const accountEmail = googleUserEmail || state.loginHint || "google_calendar@system";
      await supabase.from("email_accounts").upsert(
        {
          user_id: accountUserId,
          email: accountEmail,
          token: { access_token: data.access_token, refresh_token: refreshToken },
          refresh_token: refreshToken,
          status: "active",
          is_active: true,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "user_id,email" }
      );
    }

    const redirectResponse = NextResponse.redirect(new URL("/calendar-auth-success", request.url));

    if (googleUserEmail) {
      redirectResponse.cookies.set("google_user_email", googleUserEmail, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        maxAge: 60 * 60 * 24 * 180,
      });
    }

    redirectResponse.cookies.set("google_access_token", data.access_token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 60
    });

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
