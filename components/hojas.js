'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import * as M from '../lib/modelo';
import { ICONOS, colorTipo } from './ui';

function Marco({ cerrar, titulo, children }) {
  useEffect(() => {
    const k = (e) => { if (e.key === 'Escape') cerrar(); };
    window.addEventListener('keydown', k);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { window.removeEventListener('keydown', k); document.body.style.overflow = prev; };
  }, [cerrar]);
  return (
    <div className="sheet-back" onClick={(e) => { if (e.target === e.currentTarget) cerrar(); }}>
      <div className="sheet" role="dialog" aria-modal="true" aria-label={titulo}>
        <div className="grip" />
        <h3>{titulo}</h3>
        {children}
      </div>
    </div>
  );
}

const soloDigitos = (v) => String(v).replace(/[^\d]/g, '');
const aMonto = (v) => (soloDigitos(v) ? Number(soloDigitos(v)) : '');

/* ---------- Anotar una tarea ---------- */
function Capturar({ hoja, cerrar, lista, acc }) {
  const fijo = !!hoja.pid;
  const [texto, setTexto] = useState('');
  const [pid, setPid] = useState(hoja.pid || null);
  const [auto, setAuto] = useState(false);
  const [fecha, setFecha] = useState(M.hoy());
  const [todos, setTodos] = useState(false);
  const [aviso, setAviso] = useState(null);
  const [hayVoz, setHayVoz] = useState(false);
  const [grabando, setGrabando] = useState(false);
  const rec = useRef(null);
  const estado = useRef({});
  estado.current = { pid, auto };

  useEffect(() => { setHayVoz('webkitSpeechRecognition' in window || 'SpeechRecognition' in window); }, []);
  useEffect(() => () => rec.current?.abort?.(), []);

  const cambiar = (v) => {
    setTexto(v);
    const f = M.fechaDelTexto(v);
    if (f) setFecha(f);
    const { pid: p, auto: a } = estado.current;
    if (fijo || (p && !a)) return;
    const m = M.buscar(v, lista);
    if (m.length && m[0].s >= 2 && (m.length === 1 || m[0].s > m[1].s)) { setPid(m[0].p.id); setAuto(true); }
    else if (a) { setPid(null); setAuto(false); }
  };

  const dictar = () => {
    if (rec.current) { rec.current.stop(); return; }
    const R = window.SpeechRecognition || window.webkitSpeechRecognition;
    try {
      const r = new R();
      r.lang = 'es-CR';
      r.interimResults = true;
      const base = texto ? `${texto} ` : '';
      r.onresult = (e) => cambiar(base + Array.from(e.results).map((x) => x[0].transcript).join(' '));
      r.onerror = (e) => setAviso(e.error === 'not-allowed' ? 'Hay que permitir el micrófono en el navegador.' : 'No se pudo usar el micrófono. Use el micrófono del teclado.');
      r.onend = () => { rec.current = null; setGrabando(false); };
      rec.current = r;
      setGrabando(true);
      r.start();
    } catch {
      setAviso('No se pudo usar el micrófono. Use el micrófono del teclado.');
    }
  };

  const sugeridos = useMemo(() => (fijo ? [] : M.buscar(texto, lista).slice(0, 3).map((x) => x.p)), [texto, lista, fijo]);
  const vistos = new Set(sugeridos.map((p) => p.id));
  const elegido = pid && !vistos.has(pid) && pid !== 'INTERNO' ? lista.filter((p) => p.id === pid) : [];
  elegido.forEach((p) => vistos.add(p.id));
  const resto = lista.filter((p) => p.activo && p.tipo !== 'int' && !vistos.has(p.id)).sort((a, b) => String(b.mov || '').localeCompare(String(a.mov || '')));
  const restoVis = todos ? resto : resto.slice(0, sugeridos.length ? 3 : 6);

  const boton = (p, sug) => (
    <button key={p.id} className={`pick${sug ? ' sug' : ''}`} aria-pressed={pid === p.id} onClick={() => { setPid(p.id); setAuto(false); setAviso(null); }}>
      <i style={{ '--c': colorTipo(p.tipo) }} />
      {p.tipo === 'int' ? 'Interno · no genera valor' : `${p.corto} · ${M.cap(String(p.nombre).split(/[,.(]/)[0].split(' ').slice(0, 4).join(' ').toLowerCase())}`}
    </button>
  );

  const guardar = () => {
    if (!texto.trim()) { setAviso('Escriba o dicte qué hay que hacer.'); return; }
    if (!pid) { setAviso('Elija para qué es. Así se sabe si genera valor.'); return; }
    acc.nuevaTarea({ texto: M.limpiarTexto(texto), proyecto_id: pid, fecha });
    cerrar();
  };

  return (
    <Marco cerrar={cerrar} titulo={hoja.titulo || 'Anotar'}>
      <div className="field">
        <label htmlFor="cap-texto">¿Qué hay que hacer?</label>
        <div className="inrow">
          <textarea id="cap-texto" rows={2} autoFocus value={texto} onChange={(e) => cambiar(e.target.value)} placeholder="Ej.: llevar muestras a la UCR mañana" />
          {hayVoz && <button className={`mic${grabando ? ' rec' : ''}`} onClick={dictar} aria-label={grabando ? 'Detener dictado' : 'Dictar'}>{ICONOS.mic}</button>}
        </div>
      </div>
      <div className="field">
        <span className="label">¿Para qué es?</span>
        <div className="picks">
          {sugeridos.map((p) => boton(p, true))}
          {elegido.map((p) => boton(p))}
          {restoVis.map((p) => boton(p))}
          {boton(M.INTERNO)}
          {!todos && resto.length > restoVis.length && <button className="pick" onClick={() => setTodos(true)}>Ver todos ({resto.length - restoVis.length} más)</button>}
        </div>
        <span className={`hint${aviso ? ' warn' : ''}`}>{aviso || 'Toda tarea va hilada a algo. Las punteadas son sugerencias según lo que escribió.'}</span>
      </div>
      <div className="field">
        <span className="label">¿Cuándo?</span>
        <div className="seg">
          {[['Hoy', 0], ['Mañana', 1], ['Esta semana', 3]].map(([l, d]) => (
            <button key={d} aria-pressed={fecha === M.enDias(d)} onClick={() => setFecha(M.enDias(d))}>{l}</button>
          ))}
        </div>
      </div>
      <button className="btn pri" onClick={guardar}>Guardar</button>
    </Marco>
  );
}

/* ---------- Razón del no ---------- */
function RazonNo({ hoja, cerrar, acc }) {
  const { l, estado } = hoja;
  const [razon, setRazon] = useState(null);
  const [otra, setOtra] = useState('');
  const [aviso, setAviso] = useState(false);
  const opciones = estado === 'No participamos' ? M.RAZONES_NO : M.RAZONES_NO_SE_PRESENTO;
  const guardar = () => {
    if (!razon) { setAviso(true); return; }
    acc.licNo(l, estado, razon === 'Otro' ? otra.trim() || 'Otro' : razon);
    cerrar();
  };
  return (
    <Marco cerrar={cerrar} titulo={estado === 'No participamos' ? '¿Por qué no participamos?' : '¿Por qué no se presentó?'}>
      <div className="p-obj">{M.corto(l.institucion)} · {M.frase(l.objeto)}</div>
      <div className="picks">
        {opciones.map((r) => <button key={r} className="pick" aria-pressed={razon === r} onClick={() => setRazon(r)}>{r}</button>)}
      </div>
      {razon === 'Otro' && <input type="text" placeholder="¿Cuál?" value={otra} onChange={(e) => setOtra(e.target.value)} />}
      <span className={`hint${aviso ? ' warn' : ''}`}>{aviso ? 'Elija una razón.' : 'Queda registrado. Así se ve qué estamos dejando pasar y por qué.'}</span>
      <div className="actions"><button className="btn ghost" onClick={cerrar}>Cancelar</button><button className="btn pri" onClick={guardar}>Guardar</button></div>
    </Marco>
  );
}

/* ---------- Nueva licitación ---------- */
const CONVENIENCIA = [['Baja', 40], ['Media', 60], ['Alta', 80], ['Muy alta', 100]];
function NuevaLic({ cerrar, acc }) {
  const [pegado, setPegado] = useState('');
  const [f, setF] = useState({ numero: '', institucion: '', objeto: '', presupuesto: '', fecha_apertura: '', fecha_limite: '', muestras: '', conveniencia: '', notas: '' });
  const [aviso, setAviso] = useState(null);
  const [leido, setLeido] = useState(false);
  const set = (k) => (e) => setF((v) => ({ ...v, [k]: e.target.value }));
  const leer = (texto) => {
    const x = M.leerAlerta(texto);
    if (!x.numero && !x.institucion) { setAviso('No encontré número ni institución en el texto. Llene los datos a mano.'); setLeido(false); return; }
    setF((v) => ({ ...v, ...Object.fromEntries(Object.entries(x).filter(([, val]) => val !== '')) }));
    setAviso(null);
    setLeido(true);
  };
  const cambiarPegado = (v) => {
    setPegado(v);
    if (M.NUMERO_SICOP.test(v)) leer(v);
  };
  const pegarDelCorreo = async () => {
    try {
      const t = await navigator.clipboard.readText();
      if (!t.trim()) throw new Error('vacío');
      cambiarPegado(t);
      if (!M.NUMERO_SICOP.test(t)) leer(t);
    } catch {
      setAviso('No pude leer lo copiado. Mantenga presionado el cuadro de abajo y toque Pegar.');
      document.getElementById('nl-pegar')?.focus();
    }
  };
  const guardar = () => {
    if (!f.institucion.trim() || !f.objeto.trim() || !f.fecha_limite) { setAviso('Faltan la institución, qué piden o la fecha para presentar.'); return; }
    acc.licNueva({ ...f, numero: f.numero.trim(), institucion: f.institucion.trim(), objeto: f.objeto.trim(), presupuesto: aMonto(f.presupuesto), conveniencia: f.conveniencia === '' ? '' : Number(f.conveniencia) });
    cerrar();
  };
  return (
    <Marco cerrar={cerrar} titulo="Nueva licitación">
      <div className="field">
        <button className="btn pri" onClick={pegarDelCorreo}>Pegar alerta copiada del correo</button>
        <textarea id="nl-pegar" rows={3} value={pegado} onChange={(e) => cambiarPegado(e.target.value)} placeholder="…o pegue aquí el texto del correo de SICOP" />
        {pegado.trim() && !leido && <button className="btn sm" onClick={() => leer(pegado)}>Leer alerta</button>}
        {leido && <span className="hint">Listo, se llenaron los datos. Revise y, si lo sabe, agregue el presupuesto.</span>}
      </div>
      <div className="field"><label htmlFor="nl-inst">Institución</label><input id="nl-inst" type="text" value={f.institucion} onChange={set('institucion')} /></div>
      <div className="field"><label htmlFor="nl-obj">¿Qué piden?</label><textarea id="nl-obj" rows={2} value={f.objeto} onChange={set('objeto')} /></div>
      <div className="field"><label htmlFor="nl-num">Número de licitación</label><input id="nl-num" type="text" className="mono" value={f.numero} onChange={set('numero')} placeholder="2026LD-000000-0000000000" /></div>
      <div className="row2">
        <div className="field"><label htmlFor="nl-pres">Presupuesto ₡</label><input id="nl-pres" type="text" inputMode="numeric" value={f.presupuesto} onChange={set('presupuesto')} /></div>
        <div className="field"><label htmlFor="nl-fecha">Presentar antes de</label><input id="nl-fecha" type="date" value={f.fecha_limite} onChange={set('fecha_limite')} /></div>
      </div>
      <div className="field">
        <span className="label">¿Piden muestra física?</span>
        <div className="seg">{[['SI', 'Sí'], ['NO', 'No']].map(([v, l]) => <button key={v} aria-pressed={f.muestras === v} onClick={() => setF((x) => ({ ...x, muestras: v }))}>{l}</button>)}</div>
      </div>
      <div className="field">
        <span className="label">¿Qué tanto nos conviene?</span>
        <div className="seg">{CONVENIENCIA.map(([l, v]) => <button key={v} aria-pressed={Number(f.conveniencia) === v} onClick={() => setF((x) => ({ ...x, conveniencia: v }))}>{l}</button>)}</div>
      </div>
      {aviso && <span className="hint warn">{aviso}</span>}
      <button className="btn pri" onClick={guardar}>Guardar en Por decidir</button>
    </Marco>
  );
}

/* ---------- Nuevo cliente ---------- */
function NuevoCli({ cerrar, acc }) {
  const [f, setF] = useState({ institucion: '', oportunidad: '', monto: '', etapa: M.CLI_ETAPAS[0], siguiente_paso: '' });
  const [aviso, setAviso] = useState(null);
  const set = (k) => (e) => setF((v) => ({ ...v, [k]: e.target.value }));
  const guardar = () => {
    if (!f.institucion.trim() || !f.oportunidad.trim()) { setAviso('Faltan el cliente o la oportunidad.'); return; }
    acc.cliNuevo({ ...f, institucion: f.institucion.trim(), oportunidad: f.oportunidad.trim(), monto: aMonto(f.monto) });
    cerrar();
  };
  return (
    <Marco cerrar={cerrar} titulo="Nueva oportunidad">
      <div className="field"><label htmlFor="nc-inst">Cliente</label><input id="nc-inst" type="text" value={f.institucion} onChange={set('institucion')} placeholder="Ej.: Hospital Clínica Bíblica" /></div>
      <div className="field"><label htmlFor="nc-op">¿Qué le vamos a vender?</label><input id="nc-op" type="text" value={f.oportunidad} onChange={set('oportunidad')} placeholder="Ej.: uniformes quirúrgicos" /></div>
      <div className="field"><label htmlFor="nc-monto">Monto aproximado ₡</label><input id="nc-monto" type="text" inputMode="numeric" value={f.monto} onChange={set('monto')} /></div>
      <div className="field">
        <span className="label">Etapa</span>
        <div className="picks">{M.CLI_ETAPAS.map((e) => <button key={e} className="pick" aria-pressed={f.etapa === e} onClick={() => setF((x) => ({ ...x, etapa: e }))}>{e}</button>)}</div>
      </div>
      <div className="field"><label htmlFor="nc-sig">Siguiente paso</label><input id="nc-sig" type="text" value={f.siguiente_paso} onChange={set('siguiente_paso')} placeholder="Ej.: llevar muestras de tela" /></div>
      {aviso && <span className="hint warn">{aviso}</span>}
      <button className="btn pri" onClick={guardar}>Guardar</button>
    </Marco>
  );
}

/* ---------- Producción (nueva o editar) ---------- */
function NuevaProd({ hoja, cerrar, acc }) {
  const p = hoja.p;
  const [f, setF] = useState({
    institucion: p?.institucion || '', descripcion: p?.descripcion || '', piezas: p?.piezas ?? '',
    monto: p?.monto ?? '', taller: p?.taller || '', fecha_entrega: p?.fecha_entrega || '',
  });
  const [aviso, setAviso] = useState(null);
  const set = (k) => (e) => setF((v) => ({ ...v, [k]: e.target.value }));
  const guardar = () => {
    if (!String(f.institucion).trim() || !String(f.descripcion).trim()) { setAviso('Faltan el cliente o la descripción.'); return; }
    const datos = { ...f, piezas: aMonto(f.piezas), monto: aMonto(f.monto) };
    if (p) acc.prodEditar(p, datos); else acc.prodNueva(datos);
    cerrar();
  };
  return (
    <Marco cerrar={cerrar} titulo={p ? 'Datos de la producción' : 'Nueva producción'}>
      <div className="field"><label htmlFor="np-inst">Cliente</label><input id="np-inst" type="text" value={f.institucion} onChange={set('institucion')} /></div>
      <div className="field"><label htmlFor="np-desc">¿Qué se produce?</label><input id="np-desc" type="text" value={f.descripcion} onChange={set('descripcion')} /></div>
      <div className="row2">
        <div className="field"><label htmlFor="np-pz">Piezas</label><input id="np-pz" type="text" inputMode="numeric" value={f.piezas} onChange={set('piezas')} /></div>
        <div className="field"><label htmlFor="np-monto">Monto ₡</label><input id="np-monto" type="text" inputMode="numeric" value={f.monto} onChange={set('monto')} /></div>
      </div>
      <div className="row2">
        <div className="field"><label htmlFor="np-taller">Taller</label><input id="np-taller" type="text" value={f.taller} onChange={set('taller')} /></div>
        <div className="field"><label htmlFor="np-fecha">Fecha de entrega</label><input id="np-fecha" type="date" value={f.fecha_entrega} onChange={set('fecha_entrega')} /></div>
      </div>
      {aviso && <span className="hint warn">{aviso}</span>}
      <button className="btn pri" onClick={guardar}>Guardar</button>
    </Marco>
  );
}

/* ---------- Salió nuevo cartel ---------- */
function NuevaFecha({ hoja, cerrar, acc }) {
  const { l } = hoja;
  const [fecha, setFecha] = useState('');
  return (
    <Marco cerrar={cerrar} titulo="Salió el nuevo cartel">
      <div className="p-obj">{M.corto(l.institucion)} · {M.frase(l.objeto)}</div>
      <div className="field"><label htmlFor="nf-fecha">Nueva fecha para presentar</label><input id="nf-fecha" type="date" value={fecha} onChange={(e) => setFecha(e.target.value)} /></div>
      <button className="btn pri" disabled={!fecha} onClick={() => { acc.licEstado(l, 'Preparando', { fecha_limite: fecha, pasos: l.pasos || '0,0,0,0,0' }); cerrar(); }}>
        Volver a preparar la oferta
      </button>
    </Marco>
  );
}

export default function Hoja(props) {
  switch (props.hoja.tipo) {
    case 'tarea': return <Capturar {...props} />;
    case 'no': return <RazonNo {...props} />;
    case 'nuevaLic': return <NuevaLic {...props} />;
    case 'nuevoCli': return <NuevoCli {...props} />;
    case 'nuevaProd': return <NuevaProd {...props} />;
    case 'fecha': return <NuevaFecha {...props} />;
    default: return null;
  }
}
