export const COOKIE = 'hilo_sesion';

/** Value stored in the session cookie. Changing APP_PASSWORD invalidates every open session. */
export async function tokenFor(password) {
  const data = new TextEncoder().encode(`hilo:${password}`);
  const hash = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(hash), (b) => b.toString(16).padStart(2, '0')).join('');
}
