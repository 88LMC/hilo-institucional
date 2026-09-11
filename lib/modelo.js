// Reglas del negocio y utilidades que usan tanto la app como el panel.

export const LIC_ESTADOS = ['Por decidir', 'Preparando', 'Objetada', 'Presentada', 'Adjudicada', 'Perdida', 'No participamos', 'No se presentó'];
export const LIC_ABIERTAS = ['Por decidir', 'Preparando', 'Objetada', 'Presentada'];
export const LIC_EN_CURSO = ['Preparando', 'Objetada', 'Presentada'];
export const LIC_CERRADAS = ['Adjudicada', 'Perdida', 'No participamos', 'No se presentó'];
export const LIC_PASOS = ['Revisar cartel', 'Hacer muestra física', 'Costear', 'Garantía de participación', 'Subir oferta a SICOP'];
export const CLI_ETAPAS = ['Prospección', 'Cotización', 'Negociación', 'Facturación', 'Producción', 'Post-venta'];
export const CLI_PROB = [0.1, 0.25, 0.5, 0.9, 1, 1];
export const PROD_PASOS = ['Revisar avance en taller', 'Llevar a bordado', 'Retirar de talleres', 'Control de calidad', 'Entregar al cliente', 'Facturar'];
export const RAZONES_NO = ['No es nuestro producto', 'No cumplimos técnicamente', 'Presupuesto muy bajo', 'Plazo muy corto', 'Requisitos o garantías', 'Sin capacidad de producción', 'Otro'];
export const RAZONES_NO_SE_PRESENTO = ['Se nos pasó la fecha', 'No dio tiempo de costear', 'Faltó la muestra', 'Otro'];
export const TIPO_NOMBRE = { lic: 'Licitación', cli: 'Cliente', prod: 'Producción', int: 'Interno' };
export const TAB_DE = { L: 'LICITACIONES', C: 'CLIENTES', P: 'PRODUCCION' };

/* ---------- fechas ---------- */
const pad = (n) => String(n).padStart(2, '0');
const DOW = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];
const MES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
export const iso = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
export const hoy = () => iso(new Date());
export const enDias = (n) => { const d = new Date(); d.setDate(d.getDate() + n); return iso(d); };
const aFecha = (f) => new Date(`${f}T12:00:00`);
export function diasHasta(f) {
  if (!f) return null;
  return Math.round((aFecha(f) - aFecha(hoy())) / 864e5);
}
export function fechaLarga(f) { const d = aFecha(f); return `${cap(DOW[d.getDay()])} ${d.getDate()} de ${MES[d.getMonth()]}`; }
export function fechaCorta(f) { if (!f) return 'Sin fecha'; const d = aFecha(f); return `${d.getDate()} ${MES[d.getMonth()].slice(0, 3)}`; }
export function cuando(f) {
  const n = diasHasta(f);
  if (n === null) return 'Sin fecha';
  if (n < 0) return n === -1 ? 'De ayer' : `De hace ${-n} días`;
  if (n === 0) return 'Hoy';
  if (n === 1) return 'Mañana';
  if (n < 7) return `El ${DOW[aFecha(f).getDay()]}`;
  return fechaCorta(f);
}
export function hace(f) {
  const n = diasHasta(f);
  if (n === null) return 'sin fecha';
  if (n >= 0) return cuando(f).toLowerCase();
  const d = -n;
  if (d < 14) return `hace ${d} días`;
  if (d < 60) return `hace ${Math.round(d / 7)} semanas`;
  return `hace ${Math.round(d / 30)} meses`;
}
/** Texto y severidad del plazo: verbo = "Vence" | "Entrega". */
export function plazo(f, verbo) {
  const n = diasHasta(f);
  if (n === null) return { txt: 'Sin fecha', cls: '' };
  const cls = n <= 2 ? 'crit' : n <= 5 ? 'warn' : '';
  const txt = n < 0 ? (verbo === 'Entrega' ? 'Atrasada' : 'Vencida') : n === 0 ? `${verbo} hoy` : n === 1 ? `${verbo} mañana` : `${verbo} en ${n} días`;
  return { txt, cls };
}

/* ---------- números y texto ---------- */
export const num = (v) => (v === '' || v == null ? 0 : Number(v) || 0);
export function fmt(n) {
  n = num(n);
  if (!n) return '₡0';
  if (n >= 1e6) return `₡${(n / 1e6).toFixed(1).replace(/\.0$/, '').replace('.', ',')} M`;
  if (n >= 1000) return `₡${Math.round(n / 1000)} mil`;
  return `₡${Math.round(n)}`;
}
export function montoTxt(v) {
  if (v === '' || v == null) return 'Sin monto';
  if (num(v) <= 1) return 'Cuantía abierta';
  return fmt(v);
}
export const cap = (s) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : s);
export const norm = (s) => String(s ?? '').normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase();
export const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 5);
export function pasosArr(s, n) {
  const a = String(s ?? '').split(',').map((x) => (x.trim() === '1' ? 1 : 0));
  while (a.length < n) a.push(0);
  return a.slice(0, n);
}

const MENORES = new Set(['de', 'del', 'la', 'las', 'los', 'y', 'e', 'el', 'para', 'por', 'a', 'en', 'al', 'o', 'con', 'sin', 'su', 'sus', 'según']);
const SIGLAS = new Set(['CCSS', 'ICE', 'INA', 'UCR', 'UNED', 'MEP', 'CNP', 'FANAL', 'OIJ', 'SICOP', 'CEN', 'CINAI', 'CEN-CINAI', 'UTGV', 'RECOPE', 'JAPDEVA', 'TEC', 'CTP', 'MOPT', 'AYA', 'INS', 'SST', 'DISA', 'CCDR', 'CCDRG']);
/** Nombres en MAYÚSCULAS a Tipo Título; si ya viene mezclado, se respeta. */
export function bonito(s) {
  s = String(s ?? '').trim();
  if (!s || s !== s.toUpperCase()) return s;
  const w = s.split(/\s+/);
  if (w.length === 1) return s;
  return w.map((word, i) => {
    if (SIGLAS.has(word.replace(/[.,;:]$/, ''))) return word;
    return word.split('-').map((p, j) => {
      const l = p.toLowerCase();
      if (i > 0 && j === 0 && MENORES.has(l)) return l;
      return cap(l);
    }).join('-');
  }).join(' ');
}
/** Descripciones en MAYÚSCULAS a oración normal, respetando siglas. */
export function frase(s) {
  s = String(s ?? '').trim();
  if (!s || s !== s.toUpperCase()) return s;
  return s.toLowerCase()
    .replace(/(^|[.!?]\s+)(\p{L})/gu, (m, a, b) => a + b.toUpperCase())
    .replace(/[\p{L}-]+/gu, (w) => (SIGLAS.has(w.toUpperCase()) ? w.toUpperCase() : w));
}
const CORTOS = [
  [/^universidad de costa rica/, 'UCR'], [/^universidad estatal a distancia/, 'UNED'], [/^instituto nacional de aprendizaje/, 'INA'],
  [/^instituto costarricense de electricidad/, 'ICE'], [/^instituto tecnologico de costa rica/, 'TEC'], [/^consejo nacional de produccion/, 'CNP'],
  [/poder judicial/, 'Poder Judicial'], [/bomberos/, 'Bomberos'], [/^correos de costa rica/, 'Correos'], [/centros de educacion y nutricion|cen-cinai/, 'CEN-CINAI'],
  [/migracion/, 'Migración'], [/^procuraduria/, 'Procuraduría'], [/^consejo de transporte publico/, 'CTP'], [/^caja costarricense/, 'CCSS'],
  [/^banco popular/, 'Banco Popular'], [/^ministerio de justicia/, 'Justicia y Paz'], [/^ministerio de seguridad/, 'Seguridad Pública'],
  [/^ministerio de ciencia/, 'MICITT'], [/^ministerio de educacion/, 'MEP'],
];
/** Nombre corto para chips y listas. */
export function corto(inst) {
  const b = bonito(inst);
  const n = norm(b);
  for (const [re, c] of CORTOS) if (re.test(n)) return c;
  let m = b.match(/^Municipalidad (?:del Cantón )?(?:Central )?(?:de )?(.+)$/i);
  if (m) return `Muni. ${m[1]}`;
  m = b.match(/^Comité Cantonal de Deportes y Recreación de (.+)$/i);
  if (m) return `CCDR ${m[1]}`;
  m = b.match(/^Junta Administrativa de Cementerios de (.+)$/i);
  if (m) return `Cementerios ${m[1]}`;
  return b.length > 30 ? `${b.slice(0, 28)}…` : b;
}

/* ---------- proyectos ---------- */
export const INTERNO = { id: 'INTERNO', tipo: 'int', inst: 'Interno', corto: 'Interno', nombre: 'Administrativo', monto: 0, activo: true };
export const tipoDe = (id) => (id === 'INTERNO' ? 'int' : { L: 'lic', C: 'cli', P: 'prod' }[String(id)[0]] || 'int');
export const lpasos = (r) => pasosArr(r.pasos, LIC_PASOS.length);
export const lvisibles = (r) => LIC_PASOS.map((_, i) => i).filter((i) => i !== 1 || String(r.muestras).toUpperCase() === 'SI');

export function proyectos(db) {
  const L = db.LICITACIONES.map((r) => ({ id: r.id, tipo: 'lic', inst: bonito(r.institucion), corto: corto(r.institucion), nombre: frase(r.objeto), numero: r.numero, monto: num(r.presupuesto) > 1 ? num(r.presupuesto) : 0, activo: LIC_ABIERTAS.includes(r.estado), mov: r.ultimo_mov, r }));
  const C = db.CLIENTES.map((r) => ({ id: r.id, tipo: 'cli', inst: bonito(r.institucion), corto: corto(r.institucion), nombre: r.oportunidad, monto: num(r.monto), activo: true, mov: r.ultimo_mov, r }));
  const P = db.PRODUCCION.map((r) => ({ id: r.id, tipo: 'prod', inst: bonito(r.institucion), corto: corto(r.institucion), nombre: r.descripcion, monto: num(r.monto), activo: !pasosArr(r.pasos, PROD_PASOS.length).every(Boolean), mov: r.ultimo_mov, r }));
  return [...L, ...C, ...P, INTERNO];
}
export const indice = (lista) => new Map(lista.map((p) => [p.id, p]));

export function valorDe(p) {
  if (!p || p.tipo === 'int') return { k: 'none' };
  if (p.tipo === 'lic' && ['No participamos', 'No se presentó', 'Perdida'].includes(p.r.estado)) return { k: 'dec' };
  return { k: 'val', m: p.monto };
}

/** Lo hecho en los últimos 7 días, a partir de MOVIMIENTOS. */
export function semana(db, idx) {
  const desde = enDias(-6);
  const d = db.MOVIMIENTOS.filter((m) => m.fecha && m.fecha >= desde && m.accion).sort((a, b) => (a.creado < b.creado ? 1 : -1));
  let val = 0, none = 0, dec = 0;
  const ps = new Set();
  d.forEach((m) => {
    const p = idx.get(m.proyecto_id);
    const k = valorDe(p).k;
    if (k === 'val') { val++; ps.add(p.id); } else if (k === 'dec') dec++; else none++;
  });
  const monto = [...ps].reduce((s, id) => s + idx.get(id).monto, 0);
  return { d, val, none, dec, monto, nproj: ps.size, total: d.length };
}
export function racha(db) {
  const dias = new Set(db.MOVIMIENTOS.filter((m) => m.fecha && m.accion).map((m) => m.fecha));
  let n = 0;
  let o = dias.has(enDias(0)) ? 0 : -1;
  while (dias.has(enDias(o))) { n++; o--; }
  return n;
}

/* ---------- a qué proyecto va una tarea ---------- */
const STOP = new Set(['para', 'con', 'del', 'las', 'los', 'una', 'que', 'por', 'hoy', 'manana', 'llevar', 'enviar', 'hacer', 'llamar', 'semana', 'esta', 'muestra', 'muestras', 'visita', 'visitar', 'cita', 'tela', 'precio', 'precios', 'pasar', 'revisar', 'cotizar', 'costear', 'licitacion', 'cartel', 'oferta', 'sicop', 'entregar', 'municipalidad', 'muni', 'ministerio', 'comite', 'cantonal', 'instituto', 'consejo', 'junta', 'nacional', 'costa', 'rica', 'uniformes', 'uniforme', 'camisas', 'camisetas', 'compra', 'adquisicion', 'lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado']);
const ALIAS = { caja: 'ccss', judicial: 'poder', oij: 'poder', tecnologico: 'tec', bomberos: 'bomberos', migracion: 'migracion' };
export function buscar(texto, lista) {
  const words = norm(texto).split(/[^a-z0-9ñ-]+/).filter((w) => w.length >= 3 && !STOP.has(w)).map((w) => ALIAS[w] || w);
  if (!words.length) return [];
  return lista.filter((p) => p.tipo !== 'int' && p.activo).map((p) => {
    const c = norm(p.corto).split(/\s+/);
    const i = norm(p.inst);
    const h = `${i} ${norm(p.nombre)} ${norm(p.numero)}`;
    let s = 0;
    words.forEach((w) => { if (c.includes(w)) s += 3; else if (i.includes(w)) s += 2; else if (h.includes(w)) s += 1; });
    return { p, s };
  }).filter((x) => x.s > 0).sort((a, b) => b.s - a.s);
}
export function fechaDelTexto(t) {
  const n = norm(t);
  if (/manana/.test(n)) return enDias(1);
  if (/semana/.test(n)) return enDias(3);
  if (/\bhoy\b/.test(n)) return enDias(0);
  return null;
}
export const limpiarTexto = (t) => cap(String(t).trim().replace(/^(hay que|tengo que|recordar)\s+/i, ''));

/* ---------- leer una alerta pegada ---------- */
export function leerAlerta(t) {
  const g = (re) => { const m = t.match(re); return m ? m[1].trim() : ''; };
  const numero = g(/(\d{4}[A-Z]{2,3}-\d{6}-\d{6,12})/);
  let institucion = g(/Instituci[oó]n\s*:\s*(.+)/i);
  const sigla = institucion.match(/\(([^)]+)\)/);
  if (sigla) institucion = sigla[1];
  const objeto = g(/(?:Descripci[oó]n|Objeto)\s*:\s*(.+)/i);
  const pres = g(/[₡¢]\s*([\d.,\s]+)/);
  const presupuesto = pres ? Math.round(parseFloat(pres.replace(/\s/g, '').replace(/\./g, '').replace(',', '.'))) || '' : '';
  const f = (s) => { const m = s.match(/(\d{1,2})[/-](\d{1,2})[/-](\d{2,4})/); if (!m) return ''; const y = m[3].length === 2 ? `20${m[3]}` : m[3]; return `${y}-${pad(m[2])}-${pad(m[1])}`; };
  const fecha_apertura = f(g(/apertura\s*:\s*([^\n]+)/i));
  const fecha_limite = f(g(/(?:l[ií]mite|recepci[oó]n|presentaci[oó]n|presentar)[^:\n]*:\s*([^\n]+)/i)) || fecha_apertura;
  return { numero, institucion, objeto, presupuesto, fecha_apertura, fecha_limite };
}
