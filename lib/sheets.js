import { google } from 'googleapis';
import { completarFilas, columnLetter } from './completar';

const SHEET_ID = process.env.SHEET_ID;
export const TABS = ['LICITACIONES', 'CLIENTES', 'PRODUCCION', 'TAREAS', 'MOVIMIENTOS'];

function client() {
  const auth = new google.auth.JWT({
    email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
    key: (process.env.GOOGLE_PRIVATE_KEY || '').replace(/\\n/g, '\n'),
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
  });
  return google.sheets({ version: 'v4', auth });
}

function toObjects(values) {
  const [header = [], ...rows] = values || [];
  const keys = header.map((h) => String(h).trim());
  return rows
    .filter((r) => r.some((c) => String(c).trim() !== ''))
    .map((r) => Object.fromEntries(keys.map((k, i) => [k, r[i] ?? ''])));
}

async function getTabs(sheets, tabs) {
  const res = await sheets.spreadsheets.values.batchGet({
    spreadsheetId: SHEET_ID,
    ranges: tabs.map((t) => `'${t}'!A1:Z5000`),
    valueRenderOption: 'UNFORMATTED_VALUE',
  });
  return res.data.valueRanges.map((r) => r.values || []);
}

/** Every app tab as arrays of objects keyed by the header row. */
export async function readAll() {
  const sheets = client();
  const values = await getTabs(sheets, TABS);
  // Filas agregadas a mano en el Sheet: se les pone id y fechas antes de usarlas.
  const cambios = TABS.flatMap((t, i) => completarFilas(t, values[i]));
  if (cambios.length) {
    await sheets.spreadsheets.values.batchUpdate({
      spreadsheetId: SHEET_ID,
      requestBody: { valueInputOption: 'RAW', data: cambios },
    });
  }
  return Object.fromEntries(TABS.map((t, i) => [t, toObjects(values[i])]));
}

/**
 * Applies a batch of changes coming from the app.
 *   { tab, add: {...} }        appends a row
 *   { tab, id, set: {...} }    overwrites fields of the row with that id
 * Values are written RAW, so dates stay as AAAA-MM-DD text.
 */
export async function applyOps(ops) {
  if (!Array.isArray(ops) || !ops.length) return;
  const tabs = [...new Set(ops.map((o) => o.tab))];
  const bad = tabs.find((t) => !TABS.includes(t));
  if (bad) throw new Error(`Pestaña no permitida: ${bad}`);

  const sheets = client();
  const values = await getTabs(sheets, tabs);
  const info = Object.fromEntries(tabs.map((t, i) => {
    const header = (values[i][0] || []).map((h) => String(h).trim());
    return [t, { header, rows: values[i], idCol: header.indexOf('id') }];
  }));

  const appends = {};
  const data = [];
  for (const op of ops) {
    const { header, rows, idCol } = info[op.tab];
    const unknown = Object.keys(op.add || op.set || {}).find((k) => !header.includes(k));
    if (unknown) throw new Error(`La columna "${unknown}" no existe en ${op.tab}`);

    if (op.add) {
      (appends[op.tab] ||= []).push(header.map((k) => op.add[k] ?? ''));
    } else if (op.set) {
      const r = rows.findIndex((row, i) => i > 0 && String(row[idCol]) === String(op.id));
      if (r === -1) throw new Error(`No existe ${op.id} en ${op.tab}`);
      for (const [k, v] of Object.entries(op.set)) {
        data.push({ range: `'${op.tab}'!${columnLetter(header.indexOf(k))}${r + 1}`, values: [[v ?? '']] });
      }
    }
  }

  for (const [tab, rows] of Object.entries(appends)) {
    await sheets.spreadsheets.values.append({
      spreadsheetId: SHEET_ID,
      range: `'${tab}'!A1`,
      valueInputOption: 'RAW',
      insertDataOption: 'INSERT_ROWS',
      requestBody: { values: rows },
    });
  }
  if (data.length) {
    await sheets.spreadsheets.values.batchUpdate({
      spreadsheetId: SHEET_ID,
      requestBody: { valueInputOption: 'RAW', data },
    });
  }
}
