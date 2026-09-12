// Filas que alguien escribió a mano en el Sheet: les faltan id y fechas.

const PREFIJO = { LICITACIONES: 'L', CLIENTES: 'C', PRODUCCION: 'P' };
const DEFECTOS = { LICITACIONES: { estado: 'Por decidir' }, CLIENTES: { etapa: 'Prospección' }, PRODUCCION: {} };

export const hoyCR = () => new Date().toLocaleDateString('en-CA', { timeZone: 'America/Costa_Rica' });

/**
 * Completa en `values` (la pestaña tal como viene del Sheet, encabezado incluido) el id,
 * las fechas y los valores por defecto de las filas sin id. Devuelve las celdas a escribir.
 */
export function completarFilas(tab, values, hoy = hoyCR()) {
  const prefijo = PREFIJO[tab];
  const header = (values[0] || []).map((h) => String(h).trim());
  const idCol = header.indexOf('id');
  if (!prefijo || idCol === -1) return [];

  const cambios = [];
  values.forEach((row, i) => {
    if (i === 0 || !row.some((c) => String(c).trim() !== '') || String(row[idCol] ?? '').trim()) return;
    const id = `${prefijo}${Date.now().toString(36)}${i.toString(36)}${Math.random().toString(36).slice(2, 4)}`;
    const set = { id, creado: hoy, ultimo_mov: hoy, ...DEFECTOS[tab] };
    for (const [k, v] of Object.entries(set)) {
      const c = header.indexOf(k);
      if (c === -1) continue;
      if (k !== 'id' && String(row[c] ?? '').trim() !== '') continue;
      while (row.length <= c) row.push('');
      row[c] = v;
      cambios.push({ range: `'${tab}'!${columnLetter(c)}${i + 1}`, values: [[v]] });
    }
  });
  return cambios;
}

export function columnLetter(index) {
  let s = '';
  let n = index;
  while (n >= 0) {
    s = String.fromCharCode((n % 26) + 65) + s;
    n = Math.floor(n / 26) - 1;
  }
  return s;
}
