import { NextRequest, NextResponse } from 'next/server';

export const GET = async () => {
  const clientId = '212503648547-qtjsnktuguq3ts0vkkbh1o6pubhk23b0.apps.googleusercontent.com';
  const redirectUri = 'http://localhost:3000/api/auth/google/callback';
  const scope = 'https://www.googleapis.com/auth/calendar https://www.googleapis.com/auth/userinfo.email';
  
  const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?` +
    `client_id=${encodeURIComponent(clientId)}&` +
    `redirect_uri=${encodeURIComponent(redirectUri)}&` +
    `response_type=code&` +
    `scope=${encodeURIComponent(scope)}&` +
    `access_type=offline&` +
    `prompt=consent`;

  return NextResponse.redirect(authUrl);
};
