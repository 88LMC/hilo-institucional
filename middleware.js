import { NextResponse } from 'next/server';
import { COOKIE, tokenFor } from './lib/auth';

const PUBLICAS = ['/login', '/api/login', '/manifest.webmanifest', '/icon', '/apple-icon'];

export async function middleware(req) {
  const { pathname } = req.nextUrl;
  if (PUBLICAS.includes(pathname)) return NextResponse.next();

  // Sin APP_PASSWORD configurada la app queda cerrada, nunca abierta.
  const password = process.env.APP_PASSWORD;
  const sesion = req.cookies.get(COOKIE)?.value;
  if (password && sesion && sesion === (await tokenFor(password))) return NextResponse.next();

  if (pathname.startsWith('/api/')) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }
  const url = req.nextUrl.clone();
  url.pathname = '/login';
  url.search = '';
  return NextResponse.redirect(url);
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
