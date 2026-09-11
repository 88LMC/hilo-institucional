import { readAll } from '../../../lib/sheets';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    return Response.json(await readAll());
  } catch (err) {
    return Response.json({ error: `No se pudo leer el Sheet: ${err.message}` }, { status: 500 });
  }
}
