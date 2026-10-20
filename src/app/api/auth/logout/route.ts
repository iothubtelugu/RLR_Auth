import { NextResponse } from 'next/server';
import { AUTH_COOKIE_NAME } from '@/lib/auth/session';
import { serialize } from 'cookie';

export async function POST() {
  const cookieHeader = serialize(AUTH_COOKIE_NAME, '', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 0,
  });

  const response = NextResponse.json({ success: true, message: 'Logged out successfully' });
  response.headers.set('Set-Cookie', cookieHeader);
  return response;
}
