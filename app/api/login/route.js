import { NextResponse } from 'next/server';
import { COOKIE, tokenFor } from '../../../lib/auth';

export const dynamic = 'force-dynamic';

export async function POST(req) {
  const password = process.env.APP_PASSWORD;
  if (!password) {
    return Response.json({ error: 'Falta configurar APP_PASSWORD en el servidor.' }, { status: 500 });
  }

  const { clave } = await req.json().catch(() => ({}));
  if (clave !== password) {
    // Frena los intentos de adivinar la contraseña a fuerza de probar.
    await new Promise((r) => setTimeout(r, 1000));
    return Response.json({ error: 'Contraseña incorrecta.' }, { status: 401 });
  }

  const res = NextResponse.json({ ok: true });
  res.cookies.set(COOKIE, await tokenFor(password), {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 24 * 365,
  });
  return res;
}
