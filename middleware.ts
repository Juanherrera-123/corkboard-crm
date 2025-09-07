import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const PUBLIC_FILE = /\.(.*)$/;

export function middleware(req: NextRequest) {
  const { nextUrl, cookies, headers } = req;
  const url = nextUrl.clone();
  const { pathname } = url;

  // allow public assets and auth pages to bypass the check
  if (
    pathname === '/' ||
    pathname.startsWith('/login') ||
    pathname.startsWith('/signup') ||
    pathname.startsWith('/_next') ||
    PUBLIC_FILE.test(pathname)
  ) {
    return NextResponse.next();
  }

  // read Supabase session cookie or auth header
  const supabaseToken =
    cookies.get('sb:token')?.value ||
    cookies.get('sb-access-token')?.value ||
    headers.get('authorization')?.replace('Bearer ', '');

  // redirect unauthenticated users trying to access protected routes
  if (!supabaseToken) {
    url.pathname = '/login';
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next).*)'],
};
