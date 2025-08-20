import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// Basic protection for app routes requiring auth
// You can expand this with role checks using a user lookup if needed
export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const protectedPaths = [
    '/dashboard',
    '/collaborate',
    '/api/documents',
  ];

  const isProtected = protectedPaths.some((p) => pathname.startsWith(p));
  if (!isProtected) return NextResponse.next();

  const hasSessionToken = request.cookies.get('next-auth.session-token') || request.cookies.get('__Secure-next-auth.session-token');
  if (!hasSessionToken) {
    const url = request.nextUrl.clone();
    url.pathname = '/auth/signin';
    url.searchParams.set('callbackUrl', pathname);
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/dashboard',
    '/collaborate',
    '/api/documents/:path*',
  ],
};


