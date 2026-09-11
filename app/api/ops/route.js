import { applyOps } from '../../../lib/sheets';

export const dynamic = 'force-dynamic';

export async function POST(req) {
  const { ops } = await req.json().catch(() => ({}));
  try {
    await applyOps(ops);
    return Response.json({ ok: true });
  } catch (err) {
    return Response.json({ error: `No se pudo guardar: ${err.message}` }, { status: 500 });
  }
}
