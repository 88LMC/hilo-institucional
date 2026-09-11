/**
 * Hilo · carga automática de invitaciones de SICOP
 *
 * Cada 15 minutos busca en este Gmail los correos "…le invita a participar en el concurso…".
 * Un correo puede traer varias invitaciones: cada una se evalúa por separado.
 *   - Si el objeto menciona ropa, uniformes, calzado, textiles… (pestaña FILTRO, columna "incluir"),
 *     entra a LICITACIONES como "Por decidir".
 *   - Si no, va a la pestaña ALERTAS DESCARTADAS. Marcando la casilla "pasar_a_hilo" de una fila,
 *     en la siguiente vuelta se pasa a LICITACIONES.
 * No duplica números de licitación. Los correos procesados quedan con la etiqueta "hilo-cargada".
 *
 * Instalación (una sola vez): Extensiones → Apps Script en el Sheet, pegar este archivo,
 * guardar, elegir la función "instalar" y tocar Ejecutar. Google pide permiso para
 * leer el correo y editar el Sheet.
 */

const SHEET_ID = '1G7nNpcJ809Vp-xdFcX4FoxI_LBXp-qcBb5B_fh-wgnU';
const ETIQUETA = 'hilo-cargada';
const BUSQUEDA = '"le invita a participar en el concurso" -label:' + ETIQUETA + ' newer_than:30d';
const TAB_FILTRO = 'FILTRO';
const TAB_DESCARTADAS = 'ALERTAS DESCARTADAS';
const COLS_DESCARTADAS = ['fecha_alerta', 'numero', 'institucion', 'objeto', 'tipo', 'fecha_limite', 'fecha_apertura', 'motivo', 'pasar_a_hilo', 'resultado'];

// Raíces de palabra: "camis" encuentra camisa, camisas, camiseta. Se comparan sin tildes.
const FILTRO_INICIAL = {
  incluir: ['uniform', 'camis', 'pantal', 'overol', 'gabach', 'chalec', 'zapat', 'calzad', 'botas', 'textil', 'tela', 'confecc',
    'prenda', 'ropa', 'vestuario', 'vestimenta', 'scrub', 'delantal', 'cofia', 'gorr', 'sueter', 'chaqueta', 'jacket', 'abrigo',
    'impermeable', 'guante', 'bolso', 'bordad', 'sublimad', 'polo', 'traje', 'blusa', 'enagua', 'falda', 'sabana', 'toalla', 'lenceria', 'blancos de tiro'],
  excluir: ['construcci', 'obra', 'remodelac', 'asfalt', 'edific', 'vehicul', 'computad', 'medicament', 'aliment', 'mantenimiento',
    'reparaci', 'infraestructura', 'software', 'combustible'],
};

function instalar() {
  ScriptApp.getProjectTriggers()
    .filter((t) => t.getHandlerFunction() === 'cargarAlertas')
    .forEach((t) => ScriptApp.deleteTrigger(t));
  ScriptApp.newTrigger('cargarAlertas').timeBased().everyMinutes(15).create();
  const r = cargarAlertas();
  Logger.log('Instalado. Entraron a Hilo: ' + r.entraron + ' · descartadas por el filtro: ' + r.descartadas + ' · rescatadas: ' + r.rescatadas);
}

function cargarAlertas() {
  const ss = SpreadsheetApp.openById(SHEET_ID);
  const hoja = ss.getSheetByName('LICITACIONES');
  const filtro = leerFiltro(ss);
  const desc = ss.getSheetByName(TAB_DESCARTADAS) || crearDescartadas(ss);
  const hoy = Utilities.formatDate(new Date(), 'America/Costa_Rica', 'yyyy-MM-dd');

  const datos = hoja.getDataRange().getValues();
  const enc = datos[0].map((h) => String(h).trim());
  const enHilo = new Set(datos.slice(1).map((r) => String(r[enc.indexOf('numero')]).trim()).filter(Boolean));
  const dDatos = desc.getDataRange().getValues();
  const dCol = (k) => COLS_DESCARTADAS.indexOf(k);
  const enDescartadas = new Set(dDatos.slice(1).map((r) => String(r[dCol('numero')]).trim()).filter(Boolean));

  const nuevas = [];
  const descartadas = [];
  const fila = (a, nota) => {
    const f = {
      id: 'L' + Date.now().toString(36) + Math.random().toString(36).slice(2, 5),
      numero: a.numero, institucion: a.institucion, objeto: a.objeto,
      fecha_apertura: a.fecha_apertura, fecha_limite: a.fecha_limite,
      estado: 'Por decidir', notas: [a.tipo, nota].filter(Boolean).join(' · '),
      ultimo_mov: hoy, creado: hoy,
    };
    return enc.map((k) => (f[k] == null ? '' : f[k]));
  };

  // 1) Correos nuevos
  GmailApp.search(BUSQUEDA, 0, 50).forEach((hilo) => {
    hilo.getMessages().forEach((msg) => {
      leerAlertas(msg.getPlainBody()).forEach((a) => {
        if (!a.numero || enHilo.has(a.numero) || enDescartadas.has(a.numero)) return;
        const c = clasificar(a.objeto, filtro);
        if (c.entra) {
          enHilo.add(a.numero);
          nuevas.push(fila(a, ['Cargada del correo', c.nota].filter(Boolean).join(' · ')));
        } else {
          enDescartadas.add(a.numero);
          descartadas.push([hoy, a.numero, a.institucion, a.objeto, a.tipo, a.fecha_limite, a.fecha_apertura, c.motivo, false, '']);
        }
      });
    });
    hilo.addLabel(etiqueta());
  });

  // 2) Descartadas que alguien marcó para pasar a Hilo
  let rescatadas = 0;
  dDatos.slice(1).forEach((r, i) => {
    if (r[dCol('pasar_a_hilo')] !== true || String(r[dCol('resultado')])) return;
    const a = { numero: String(r[dCol('numero')]).trim(), institucion: r[dCol('institucion')], objeto: r[dCol('objeto')], tipo: r[dCol('tipo')], fecha_limite: String(r[dCol('fecha_limite')]), fecha_apertura: String(r[dCol('fecha_apertura')]) };
    if (!enHilo.has(a.numero)) { enHilo.add(a.numero); nuevas.push(fila(a, 'Rescatada del filtro')); rescatadas++; }
    desc.getRange(i + 2, dCol('resultado') + 1).setValue('Pasada a Hilo ' + hoy);
  });

  // Como texto, para que las fechas queden AAAA-MM-DD igual que las escribe la app.
  if (nuevas.length) {
    const rango = hoja.getRange(hoja.getLastRow() + 1, 1, nuevas.length, enc.length);
    rango.setNumberFormat('@');
    rango.setValues(nuevas);
  }
  if (descartadas.length) {
    const inicio = desc.getLastRow() + 1;
    const rango = desc.getRange(inicio, 1, descartadas.length, COLS_DESCARTADAS.length);
    rango.setNumberFormat('@');
    rango.setValues(descartadas);
    desc.getRange(inicio, dCol('pasar_a_hilo') + 1, descartadas.length, 1).setNumberFormat('General').insertCheckboxes();
  }
  return { entraron: nuevas.length - rescatadas, descartadas: descartadas.length, rescatadas };
}

function etiqueta() {
  return GmailApp.getUserLabelByName(ETIQUETA) || GmailApp.createLabel(ETIQUETA);
}

/* ---------- filtro ---------- */
const sinTildes = (s) => String(s || '').normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase();
const tiene = (texto, raiz) => new RegExp('\\b' + raiz.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).test(texto);

function clasificar(objeto, filtro) {
  const t = sinTildes(objeto);
  const si = filtro.incluir.find((w) => tiene(t, w));
  const no = filtro.excluir.find((w) => tiene(t, w));
  if (si) return { entra: true, nota: no ? 'Revisar: también menciona "' + no + '"' : '' };
  return { entra: false, motivo: no ? 'Menciona "' + no + '"' : 'No menciona ropa, uniformes ni calzado' };
}

function leerFiltro(ss) {
  let h = ss.getSheetByName(TAB_FILTRO);
  if (!h) {
    h = ss.insertSheet(TAB_FILTRO);
    const n = Math.max(FILTRO_INICIAL.incluir.length, FILTRO_INICIAL.excluir.length);
    const filas = [['incluir', 'excluir', 'Cómo funciona']];
    for (let i = 0; i < n; i++) filas.push([FILTRO_INICIAL.incluir[i] || '', FILTRO_INICIAL.excluir[i] || '', '']);
    filas[1][2] = 'Si el objeto de la licitación contiene alguna palabra de "incluir", entra a Hilo.';
    filas[2][2] = 'Si no, va a ALERTAS DESCARTADAS. "excluir" solo sirve para explicar el motivo.';
    filas[3][2] = 'Escriba el inicio de la palabra, sin tildes: "camis" encuentra camisa y camiseta.';
    h.getRange(1, 1, filas.length, 3).setValues(filas);
    h.getRange(1, 1, 1, 3).setFontWeight('bold').setBackground('#E3E9FC');
    h.setFrozenRows(1);
    h.setColumnWidth(3, 520);
  }
  const v = h.getDataRange().getValues().slice(1);
  const col = (i) => v.map((r) => sinTildes(String(r[i]).trim())).filter(Boolean);
  return { incluir: col(0), excluir: col(1) };
}

function crearDescartadas(ss) {
  const h = ss.insertSheet(TAB_DESCARTADAS);
  h.getRange(1, 1, 1, COLS_DESCARTADAS.length).setValues([COLS_DESCARTADAS]).setFontWeight('bold').setBackground('#E3E9FC');
  h.setFrozenRows(1);
  h.setColumnWidth(3, 260);
  h.setColumnWidth(4, 380);
  h.setColumnWidth(8, 260);
  return h;
}

/* ---------- lectura del correo ---------- */
/** Un correo puede traer varias invitaciones: se separan por "SICOP le informa que". */
function leerAlertas(cuerpo) {
  const txt = String(cuerpo || '').replace(/\*/g, '');
  const partes = txt.split(/(?=SICOP le informa que)/i).filter((p) => /le invita a participar/i.test(p));
  return (partes.length ? partes : [txt]).map(leerAlerta);
}

/** Misma lectura que usa la app al pegar una alerta (lib/modelo.js). */
function leerAlerta(t) {
  const txt = String(t || '').replace(/\r/g, '').replace(/\*/g, '').replace(/[ \t ]+/g, ' ');
  const g = (re) => { const m = txt.match(re); return m ? m[1].trim() : ''; };
  const pad = (n) => String(n).padStart(2, '0');
  const numero = (txt.match(/\d{4}[A-Z]{2,3}-\d{6}-\d{6,12}/) || [''])[0];
  // En un solo renglón: los correos reenviados parten la frase en varias líneas.
  const plano = txt.replace(/\s+/g, ' ');
  const inv = plano.match(/informa que\s+(.+?)\s+le invita a participar en el concurso\s+(.+?)\s+N[oº°]\.?\s*\S+\s+para\s+(.+?)\.?\s*(?:Fecha|Las condiciones|$)/i);
  const limpio = (s) => (s || '').replace(/\s+/g, ' ').trim();
  const tipo = inv ? limpio(inv[2]).toLowerCase() : '';
  const f = (s) => {
    const m = s.match(/(\d{1,2})[/-](\d{1,2})[/-](\d{2,4})/);
    if (!m) return '';
    const y = m[3].length === 2 ? '20' + m[3] : m[3];
    return y + '-' + pad(m[2]) + '-' + pad(m[1]);
  };
  const apertura = f(g(/apertura[^:\n]*:\s*([^\n]+)/i));
  return {
    numero,
    institucion: inv ? limpio(inv[1]) : '',
    objeto: inv ? limpio(inv[3]) : '',
    tipo: tipo ? tipo.charAt(0).toUpperCase() + tipo.slice(1) : '',
    fecha_apertura: apertura,
    fecha_limite: f(g(/(?:recepci[oó]n de ofertas|l[ií]mite|presentaci[oó]n)[^:\n]*:\s*([^\n]+)/i)) || apertura,
  };
}
