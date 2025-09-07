import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(req: NextRequest) {
  const url = req.nextUrl.clone();

  // deja pasar login y static files
  if (url.pathname.startsWith('/login') || url.pathname.startsWith('/_next')) {
    return NextResponse.next();
  }

  // aquí no hagas chequeo manual de cookies, deja que el cliente maneje la sesión
  return NextResponse.next();
}
