import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const PUBLIC_PATHS = ['/login', '/debug-auth', '/favicon.ico', '/robots.txt'];

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Allow public paths to continue
  if (PUBLIC_PATHS.includes(pathname)) {
    return NextResponse.next();
  }

  // Redirect unauthenticated users away from private pages
  const hasAuthCookie =
    req.cookies.get('sb-access-token')?.value ||
    req.cookies.get('sb:token')?.value ||
    req.cookies.get('sb-refresh-token')?.value ||
    req.headers.get('authorization')?.replace('Bearer ', '');

  if (!hasAuthCookie && pathname.startsWith('/home')) {
    const url = req.nextUrl.clone();
    url.pathname = '/login';
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/login', '/home/:path*'],
};
