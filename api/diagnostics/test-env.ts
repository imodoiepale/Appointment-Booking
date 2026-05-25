import { NextResponse } from "next/server";

export const GET = async () => {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  const appUrl = process.env.NEXT_PUBLIC_APP_URL;

  return NextResponse.json({
    clientId: clientId ? "SET" : "NOT SET",
    clientSecret: clientSecret ? "SET" : "NOT SET", 
    appUrl: appUrl || "NOT SET",
    allEnvVars: {
      GOOGLE_CLIENT_ID: !!clientId,
      GOOGLE_CLIENT_SECRET: !!clientSecret,
      NEXT_PUBLIC_APP_URL: !!appUrl
    }
  });
};
