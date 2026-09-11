/**
 * Hilo · carga automática de invitaciones de SICOP
 *
 * Cada 15 minutos busca en este Gmail los correos "…le invita a participar en el concurso…"
 * y los agrega a la pestaña LICITACIONES como "Por decidir". No duplica: si el número
 * de licitación ya existe, lo salta. Los correos procesados quedan con la etiqueta "hilo-cargada".
 *
 * Instalación (una sola vez): Extensiones → Apps Script en el Sheet, pegar este archivo,
 * guardar, elegir la función "instalar" y tocar Ejecutar. Google pide permiso para
 * leer el correo y editar el Sheet.
 */

const SHEET_ID = '1G7nNpcJ809Vp-xdFcX4FoxI_LBXp-qcBb5B_fh-wgnU';
const ETIQUETA = 'hilo-cargada';
const BUSQUEDA = '"le invita a participar en el concurso" -label:' + ETIQUETA + ' newer_than:30d';

function instalar() {
  ScriptApp.getProjectTriggers()
    .filter((t) => t.getHandlerFunction() === 'cargarAlertas')
    .forEach((t) => ScriptApp.deleteTrigger(t));
  ScriptApp.newTrigger('cargarAlertas').timeBased().everyMinutes(15).create();
  const n = cargarAlertas();
  Logger.log('Instalado. Cargadas ahora: ' + n);
}

function cargarAlertas() {
  const hoja = SpreadsheetApp.openById(SHEET_ID).getSheetByName('LICITACIONES');
  const datos = hoja.getDataRange().getValues();
  const enc = datos[0].map((h) => String(h).trim());
  const colNumero = enc.indexOf('numero');
  const existentes = new Set(datos.slice(1).map((r) => String(r[colNumero]).trim()).filter(Boolean));
  const etiqueta = GmailApp.getUserLabelByName(ETIQUETA) || GmailApp.createLabel(ETIQUETA);
  const hoy = Utilities.formatDate(new Date(), 'America/Costa_Rica', 'yyyy-MM-dd');

  const nuevas = [];
  GmailApp.search(BUSQUEDA, 0, 50).forEach((hilo) => {
    hilo.getMessages().forEach((msg) => {
      const a = leerAlerta(msg.getPlainBody());
      if (!a.numero || existentes.has(a.numero)) return;
      existentes.add(a.numero);
      const fila = {
        id: 'L' + Date.now().toString(36) + Math.random().toString(36).slice(2, 5),
        numero: a.numero,
        institucion: a.institucion,
        objeto: a.objeto,
        fecha_apertura: a.fecha_apertura,
        fecha_limite: a.fecha_limite,
        estado: 'Por decidir',
        notas: [a.tipo, 'Cargada del correo'].filter(Boolean).join(' · '),
        ultimo_mov: hoy,
        creado: hoy,
      };
      nuevas.push(enc.map((k) => (fila[k] == null ? '' : fila[k])));
    });
    hilo.addLabel(etiqueta);
  });

  if (nuevas.length) {
    // Como texto, para que las fechas queden AAAA-MM-DD igual que las escribe la app.
    const rango = hoja.getRange(hoja.getLastRow() + 1, 1, nuevas.length, enc.length);
    rango.setNumberFormat('@');
    rango.setValues(nuevas);
  }
  return nuevas.length;
}

/** Misma lectura que usa la app al pegar una alerta (lib/modelo.js). */
function leerAlerta(t) {
  const txt = String(t || '').replace(/\r/g, '').replace(/\*/g, '').replace(/[ \t ]+/g, ' ');
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
