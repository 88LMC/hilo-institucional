'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import * as M from '../lib/modelo';
import { ICONOS } from './ui';
import { Hoy, Licitaciones, Clientes, Produccion, Semana } from './vistas';
import Hoja from './hojas';
import Limpieza from './Limpieza';

function aplicar(db, ops) {
  const next = { ...db };
  for (const op of ops) {
    const arr = [...(next[op.tab] || [])];
    if (op.add) arr.push({ ...op.add });
    else {
      const i = arr.findIndex((r) => String(r.id) === String(op.id));
      if (i >= 0) arr[i] = { ...arr[i], ...op.set };
    }
    next[op.tab] = arr;
  }
  return next;
}

/** Datos del Sheet + cambios optimistas que se guardan en orden. */
export function useDatos() {
  const [db, setDb] = useState(null);
  const [error, setError] = useState(null);
  const [guardando, setGuardando] = useState(0);
  const cola = useRef(Promise.resolve());
  const pend = useRef(0);

  const cargar = useCallback(async () => {
    try {
      const r = await fetch('/api/data', { cache: 'no-store' });
      if (r.status === 401) { window.location.replace('/login'); return; }
      const j = await r.json();
      if (j.error) throw new Error(j.error);
      setDb(j);
    } catch (e) {
      setError(e.message);
    }
  }, []);

  useEffect(() => {
    cargar();
    const alVolver = () => { if (document.visibilityState === 'visible' && !pend.current) cargar(); };
    document.addEventListener('visibilitychange', alVolver);
    return () => document.removeEventListener('visibilitychange', alVolver);
  }, [cargar]);

  const commit = useCallback((ops) => {
    if (!ops.length) return;
    setDb((prev) => aplicar(prev, ops));
    pend.current++;
    setGuardando((g) => g + 1);
    cola.current = cola.current.then(async () => {
      try {
        const r = await fetch('/api/ops', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ops }) });
        if (r.status === 401) { window.location.replace('/login'); return; }
        const j = await r.json().catch(() => ({}));
        if (!r.ok || j.error) throw new Error(j.error || `Error ${r.status}`);
      } catch (e) {
        setError(`No se guardó el último cambio. ${e.message}`);
        await cargar();
      } finally {
        pend.current--;
        setGuardando((g) => g - 1);
      }
    });
  }, [cargar]);

  return { db, error, setError, guardando, commit };
}

const ahora = () => new Date().toISOString();
const movAdd = (proyecto_id, accion, id) => ({ tab: 'MOVIMIENTOS', add: { id: id || `M${M.uid()}`, fecha: M.hoy(), proyecto_id, accion, creado: ahora() } });
const toque = (id) => (id === 'INTERNO' ? [] : [{ tab: M.TAB_DE[id[0]], id, set: { ultimo_mov: M.hoy() } }]);

function acciones(db, commit, avisar, idx) {
  // Un paso o una tarea tiene un movimiento con id fijo, para poder desmarcarlo.
  const movFijo = (id, proyecto_id, accion) => (db.MOVIMIENTOS.some((m) => m.id === id)
    ? { tab: 'MOVIMIENTOS', id, set: { fecha: M.hoy(), proyecto_id, accion, creado: ahora() } }
    : movAdd(proyecto_id, accion, id));
  const movQuitar = (id) => (db.MOVIMIENTOS.some((m) => m.id === id) ? [{ tab: 'MOVIMIENTOS', id, set: { fecha: '', accion: '' } }] : []);
  const avanzo = (monto) => (M.num(monto) > 1 ? `${M.fmt(monto)} avanzó` : null);

  return {
    tarea(t) {
      if (t.hecha) {
        commit([{ tab: 'TAREAS', id: t.id, set: { hecha: '' } }, ...movQuitar(`M-${t.id}`)]);
        return;
      }
      commit([{ tab: 'TAREAS', id: t.id, set: { hecha: M.hoy() } }, movFijo(`M-${t.id}`, t.proyecto_id, `Tarea: ${t.texto}`), ...toque(t.proyecto_id)]);
      const v = M.valorDe(idx.get(t.proyecto_id));
      if (v.k === 'val') avisar('Hecho ·', avanzo(v.m) || 'avanzó');
      else avisar(v.k === 'dec' ? 'Hecho · decisión tomada' : 'Hecho · tarea interna');
    },
    aManana(t) {
      commit([{ tab: 'TAREAS', id: t.id, set: { fecha: M.enDias(1) } }]);
      avisar('Pasada a mañana');
    },
    nuevaTarea({ texto, proyecto_id, fecha }) {
      const ops = [{ tab: 'TAREAS', add: { id: `T${M.uid()}`, texto, proyecto_id, fecha, hecha: '', origen: 'app', creado: ahora() } }];
      if (M.tipoDe(proyecto_id) === 'cli') ops.push({ tab: 'CLIENTES', id: proyecto_id, set: { siguiente_paso: texto } });
      commit(ops);
      const p = idx.get(proyecto_id);
      avisar(`Anotado en ${p ? p.corto : 'Interno'} · ${M.cuando(fecha).toLowerCase()}`);
    },
    licSi(l) {
      commit([{ tab: 'LICITACIONES', id: l.id, set: { estado: 'Preparando', pasos: l.pasos || '0,0,0,0,0', ultimo_mov: M.hoy() } }, movAdd(l.id, 'Decidió participar')]);
      avisar('Participamos · se creó la lista de pasos');
    },
    licNo(l, estado, razon) {
      commit([{ tab: 'LICITACIONES', id: l.id, set: { estado, razon, ultimo_mov: M.hoy() } }, movAdd(l.id, `${estado}: ${razon}`)]);
      avisar(`Registrado: ${estado.toLowerCase()}`);
    },
    licPaso(l, i) {
      const a = M.lpasos(l);
      a[i] = a[i] ? 0 : 1;
      const id = `M-${l.id}-${i}`;
      commit([{ tab: 'LICITACIONES', id: l.id, set: { pasos: a.join(','), ultimo_mov: M.hoy() } }, ...(a[i] ? [movFijo(id, l.id, M.LIC_PASOS[i])] : movQuitar(id))]);
      if (a[i]) avisar('Paso hecho ·', avanzo(l.presupuesto));
    },
    licEstado(l, estado, extra = {}) {
      const ops = [{ tab: 'LICITACIONES', id: l.id, set: { estado, ultimo_mov: M.hoy(), ...extra } }, movAdd(l.id, `Estado: ${estado}`)];
      if (estado === 'Adjudicada') {
        ops.push({ tab: 'PRODUCCION', add: { id: `P${M.uid()}`, institucion: l.institucion, descripcion: M.frase(l.objeto), piezas: '', monto: l.presupuesto, taller: '', fecha_entrega: '', pasos: '0,0,0,0,0,0', origen: l.id, notas: '', ultimo_mov: M.hoy(), creado: ahora() } });
      }
      commit(ops);
      avisar(estado === 'Adjudicada' ? '¡Adjudicada! Ya aparece en Producción' : `Marcada: ${estado.toLowerCase()}`);
    },
    limpiar(l, set) {
      commit([{ tab: 'LICITACIONES', id: l.id, set: { limpieza: '', ...set } }]);
    },
    licNueva(f) {
      commit([{ tab: 'LICITACIONES', add: { ...f, id: `L${M.uid()}`, estado: 'Por decidir', razon: '', pasos: '', limpieza: '', notas: f.notas || '', ultimo_mov: M.hoy(), creado: M.hoy() } }]);
      avisar('Guardada en Por decidir');
    },
    cliNuevo(f) {
      const id = `C${M.uid()}`;
      commit([{ tab: 'CLIENTES', add: { ...f, id, notas: '', ultimo_mov: M.hoy(), creado: M.hoy() } }, movAdd(id, 'Nueva oportunidad')]);
      avisar('Oportunidad agregada');
    },
    cliAvanzar(c) {
      const e = Math.min(M.CLI_ETAPAS.length - 1, Math.max(0, M.CLI_ETAPAS.indexOf(c.etapa)) + 1);
      commit([{ tab: 'CLIENTES', id: c.id, set: { etapa: M.CLI_ETAPAS[e], ultimo_mov: M.hoy() } }, movAdd(c.id, `Pasó a ${M.CLI_ETAPAS[e]}`)]);
    },
    prodNueva(f) {
      commit([{ tab: 'PRODUCCION', add: { ...f, id: `P${M.uid()}`, pasos: '0,0,0,0,0,0', origen: '', notas: '', ultimo_mov: M.hoy(), creado: M.hoy() } }]);
      avisar('Producción agregada');
    },
    prodEditar(p, set) {
      commit([{ tab: 'PRODUCCION', id: p.id, set }]);
      avisar('Guardado');
    },
    prodPaso(p, i) {
      const a = M.pasosArr(p.pasos, M.PROD_PASOS.length);
      a[i] = a[i] ? 0 : 1;
      const id = `M-${p.id}-${i}`;
      commit([{ tab: 'PRODUCCION', id: p.id, set: { pasos: a.join(','), ultimo_mov: M.hoy() } }, ...(a[i] ? [movFijo(id, p.id, M.PROD_PASOS[i])] : movQuitar(id))]);
      if (a[i]) avisar('Paso hecho ·', avanzo(p.monto));
    },
  };
}

const TABS = [['hoy', 'Hoy'], ['lic', 'Licitaciones'], ['cli', 'Clientes'], ['prod', 'Producción'], ['sem', 'Semana']];

export default function App() {
  const { db, error, setError, guardando, commit } = useDatos();
  const [tab, setTab] = useState('hoy');
  const [seg, setSeg] = useState({ lic: 'dec', cli: -1 });
  const [hoja, setHoja] = useState(null);
  const [limpiando, setLimpiando] = useState(false);
  const [toast, setToast] = useState(null);
  const timer = useRef();

  useEffect(() => {
    try { const t = localStorage.getItem('hilo-tab'); if (t && TABS.some(([k]) => k === t)) setTab(t); } catch {}
  }, []);

  const avisar = useCallback((texto, valor) => {
    setToast({ texto, valor, k: Date.now() });
    clearTimeout(timer.current);
    timer.current = setTimeout(() => setToast(null), 2600);
  }, []);

  const lista = useMemo(() => (db ? M.proyectos(db) : []), [db]);
  const idx = useMemo(() => M.indice(lista), [lista]);
  const acc = useMemo(() => (db ? acciones(db, commit, avisar, idx) : null), [db, commit, avisar, idx]);

  const ir = useCallback((k, s) => {
    setTab(k);
    if (s) setSeg((x) => ({ ...x, lic: s }));
    try { localStorage.setItem('hilo-tab', k); } catch {}
    window.scrollTo(0, 0);
  }, []);

  if (!db) {
    return (
      <div className="app">
        <div className="cargando">
          {error ? (<><p>{error}</p><button className="btn" onClick={() => window.location.reload()}>Reintentar</button></>) : 'Cargando…'}
        </div>
      </div>
    );
  }

  const h = M.hoy();
  const pendDec = db.LICITACIONES.filter((l) => l.estado === 'Por decidir' && l.limpieza !== 'pendiente').length;
  const abiertasHoy = db.TAREAS.filter((t) => !t.hecha && t.fecha && t.fecha <= h).length;
  const r = M.racha(db);
  const props = { db, lista, idx, acc, abrir: setHoja, ir, seg, setSeg, limpiar: () => setLimpiando(true) };
  const TIT = {
    hoy: ['Hoy', M.fechaLarga(h)],
    lic: ['Licitaciones', `${pendDec} por decidir`],
    cli: ['Clientes', 'Visitas, muestras y cotizaciones'],
    prod: ['Producción', `${db.PRODUCCION.filter((p) => !M.pasosArr(p.pasos, 6).every(Boolean)).length} en curso`],
    sem: ['Su semana', 'Lo que generó valor y lo que no'],
  }[tab];
  const badge = { hoy: abiertasHoy, lic: pendDec };

  return (
    <div className="app">
      <header className="topbar">
        <div><div className="sub">{TIT[1]}</div><h2>{TIT[0]}</h2></div>
        <div className="right">
          {guardando > 0 && <span className="saving" title="Guardando…" aria-label="Guardando" />}
          {(tab === 'hoy' || tab === 'sem') && r > 0 && <span className="streak">Racha · {r} {r === 1 ? 'día' : 'días'}</span>}
        </div>
      </header>
      {error && <div className="error-bar" role="alert"><span>{error}</span><button onClick={() => setError(null)}>Cerrar</button></div>}
      <main className="view">
        {tab === 'hoy' && <Hoy {...props} />}
        {tab === 'lic' && <Licitaciones {...props} />}
        {tab === 'cli' && <Clientes {...props} />}
        {tab === 'prod' && <Produccion {...props} />}
        {tab === 'sem' && <Semana {...props} />}
      </main>
      <button className="fab" onClick={() => setHoja({ tipo: 'tarea' })}>{ICONOS.mas}Anotar</button>
      <nav className="tabs" aria-label="Secciones">
        {TABS.map(([k, l]) => (
          <button key={k} onClick={() => ir(k)} aria-current={tab === k ? 'page' : undefined}>
            {ICONOS[k]}{l}{badge[k] > 0 && <span className="dot">{badge[k]}</span>}
          </button>
        ))}
      </nav>
      {hoja && <Hoja hoja={hoja} cerrar={() => setHoja(null)} {...props} />}
      {limpiando && <Limpieza {...props} cerrar={() => setLimpiando(false)} />}
      {toast && <div className="toast" key={toast.k} role="status">{toast.texto}{toast.valor && <span className="val">{toast.valor}</span>}</div>}
    </div>
  );
}
