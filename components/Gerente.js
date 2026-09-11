'use client';

import * as M from '../lib/modelo';
import { useDatos } from './App';
import { Costura, Plazo } from './ui';

function Barras({ filas, max, fmt, color }) {
  return (
    <div className="bars">
      {filas.map(([l, v]) => (
        <div key={l} className="bar-row" style={{ '--c': color }}>
          <span>{l}</span>
          <div className="tr"><b style={{ width: `${max ? (v / max) * 100 : 0}%` }} /></div>
          <span className="n">{fmt(v)}</span>
        </div>
      ))}
    </div>
  );
}

export default function Gerente() {
  const { db, error } = useDatos();
  if (!db) return <div className="gerente"><div className="cargando">{error || 'Cargando…'}</div></div>;

  const lista = M.proyectos(db);
  const idx = M.indice(lista);
  const L = db.LICITACIONES, C = db.CLIENTES, R = db.PRODUCCION;
  const vivas = L.filter((l) => l.limpieza !== 'pendiente');
  const curso = vivas.filter((l) => M.LIC_EN_CURSO.includes(l.estado));
  const montoCurso = curso.reduce((s, l) => s + (M.num(l.presupuesto) > 1 ? M.num(l.presupuesto) : 0), 0);
  const pend = vivas.filter((l) => l.estado === 'Por decidir');
  const urgentes = pend.filter((l) => { const d = M.diasHasta(l.fecha_limite); return d !== null && d <= 3; });
  const etapa = (c) => Math.max(0, M.CLI_ETAPAS.indexOf(c.etapa));
  const pipe = C.reduce((s, c) => s + M.num(c.monto), 0);
  const pond = C.reduce((s, c) => s + M.num(c.monto) * M.CLI_PROB[etapa(c)], 0);
  const w = M.semana(db, idx);
  const pv = w.total ? Math.round(((w.val + w.dec) / w.total) * 100) : 0;
  const nLimpia = L.length - vivas.length;

  const alertas = [];
  if (nLimpia) alertas.push(['warn', `${nLimpia} licitaciones sin poner al día`, 'Ya pasó su fecha y no se sabe qué pasó. Se resuelve desde el aviso azul en la app.']);
  urgentes.forEach((l) => alertas.push(['crit', `${M.corto(l.institucion)}: falta decidir si participamos`, `${M.montoTxt(l.presupuesto)} · vence ${M.cuando(l.fecha_limite).toLowerCase()}`]));
  vivas.filter((l) => l.estado === 'Preparando').forEach((l) => {
    const d = M.diasHasta(l.fecha_limite);
    const vis = M.lvisibles(l), a = M.lpasos(l), n = vis.filter((i) => a[i]).length;
    if (d !== null && d < 0) alertas.push(['crit', `${M.corto(l.institucion)}: se pasó la fecha y sigue en preparación`, `${n} de ${vis.length} pasos · vencía ${M.fechaCorta(l.fecha_limite)}`]);
    else if (d !== null && d <= 5 && n < vis.length) alertas.push(['warn', `${M.corto(l.institucion)}: oferta incompleta`, `${n} de ${vis.length} pasos · vence ${M.cuando(l.fecha_limite).toLowerCase()}`]);
  });
  R.forEach((p) => {
    const a = M.pasosArr(p.pasos, 6), d = M.diasHasta(p.fecha_entrega);
    if (d !== null && d <= 3 && !a.every(Boolean) && a.filter(Boolean).length < 3) alertas.push(['crit', `${M.corto(p.institucion)}: entrega ${M.cuando(p.fecha_entrega).toLowerCase()} con poco avance`, `${a.filter(Boolean).length} de 6 pasos · ${p.descripcion}`]);
  });
  C.forEach((c) => {
    const q = -(M.diasHasta(c.ultimo_mov || c.creado) ?? 0);
    if (q > 7) alertas.push(['warn', `${M.corto(c.institucion)}: sin movimiento hace ${q} días`, `${M.CLI_ETAPAS[etapa(c)]} · ${M.fmt(c.monto)}`]);
  });

  const porEstado = M.LIC_ESTADOS.map((e) => [e, vivas.filter((l) => l.estado === e).length]).filter(([, n]) => n);
  const razones = {};
  vivas.filter((l) => l.razon && (l.estado === 'No participamos' || l.estado === 'No se presentó')).forEach((l) => { razones[l.razon] = (razones[l.razon] || 0) + 1; });
  const filasRazon = Object.entries(razones).sort((a, b) => b[1] - a[1]);
  const porEtapa = M.CLI_ETAPAS.map((e, i) => [e, C.filter((c) => etapa(c) === i).reduce((s, c) => s + M.num(c.monto), 0)]);
  const entregas = R.filter((p) => !M.pasosArr(p.pasos, 6).every(Boolean)).sort((a, b) => String(a.fecha_entrega || '9999').localeCompare(String(b.fecha_entrega || '9999')));
  const veces = (n) => `${n} ${n === 1 ? 'vez' : 'veces'}`;

  return (
    <div className="gerente">
      <div className="gerente-top">
        <div><span className="eyebrow">{M.fechaLarga(M.hoy())}</span><h1>Panel del gerente</h1></div>
        <a href="/">← Volver a la app</a>
      </div>

      <div className="kpis">
        <div className="kpi"><small>Licitaciones en curso</small><b>{M.fmt(montoCurso)}</b><span className="note">{curso.length} ofertas vivas</span></div>
        <div className={`kpi${urgentes.length ? ' crit' : ''}`}><small>Por decidir</small><b>{pend.length}</b><span className="note">{urgentes.length} vencen en 3 días o menos</span></div>
        <div className="kpi"><small>Pipeline clientes</small><b>{M.fmt(pipe)}</b><span className="note">Ponderado {M.fmt(pond)}</span></div>
        <div className={`kpi${pv >= 70 ? ' ok' : ''}`}><small>Acciones con valor</small><b>{pv}%</b><span className="note">{w.total} acciones en 7 días</span></div>
      </div>

      <div className="grid2">
        <section className="card">
          <div className="sec-h"><h3>Atención</h3><span className="meta">{alertas.length}</span></div>
          {alertas.map(([s, t, d], i) => (
            <div key={i} className="flag"><span className="sev" style={{ '--c': `var(--${s})` }} /><div className="grow">{t}<small>{d}</small></div></div>
          ))}
          {!alertas.length && <div className="empty">Todo al día.</div>}
        </section>
        <section className="card">
          <div className="sec-h"><h3>Semana del vendedor</h3><span className="meta">racha {M.racha(db)} días</span></div>
          <p className="lbl" style={{ margin: '0 0 10px' }}>Movió <b>{M.fmt(w.monto)}</b> en {w.nproj} oportunidades</p>
          <div className="split" aria-hidden="true">
            {w.val > 0 && <b style={{ flex: w.val }} />}{w.dec > 0 && <u style={{ flex: w.dec }} />}{w.none > 0 && <i style={{ flex: w.none }} />}
          </div>
          <div className="legend" style={{ marginTop: 10 }}>
            <span style={{ '--c': 'var(--value)' }}>Genera valor {w.val}</span>
            <span style={{ '--c': 'var(--accent)' }}>Decisiones {w.dec}</span>
            <span style={{ '--c': 'var(--none)' }}>Interno {w.none}</span>
          </div>
          <p className="note" style={{ margin: '12px 0 0', fontSize: 13, color: 'var(--ink-3)' }}>
            Revisión de 15 minutos el lunes: abran esto juntos, celebren lo cerrado y elijan las 3 del día. Es acompañamiento, no auditoría.
          </p>
        </section>
      </div>

      <div className="grid2">
        <section className="card">
          <div className="sec-h"><h3>Licitaciones por estado</h3><span className="meta">{vivas.length} revisadas</span></div>
          {porEstado.length ? <Barras filas={porEstado} max={Math.max(...porEstado.map((x) => x[1]))} fmt={(n) => n} color="var(--t-lic)" /> : <div className="empty">Sin datos todavía.</div>}
        </section>
        <section className="card">
          <div className="sec-h"><h3>Por qué no llegamos</h3><span className="meta">no participamos / no se presentó</span></div>
          {filasRazon.length ? <Barras filas={filasRazon} max={filasRazon[0][1]} fmt={veces} color="var(--warn)" /> : <div className="empty">Todavía no hay razones registradas.</div>}
        </section>
      </div>

      <div className="grid2">
        <section className="card">
          <div className="sec-h"><h3>Pipeline por etapa</h3><span className="meta">{M.fmt(pipe)}</span></div>
          {C.length ? <Barras filas={porEtapa} max={Math.max(...porEtapa.map((x) => x[1]), 1)} fmt={M.fmt} color="var(--t-cli)" /> : <div className="empty">Todavía no hay clientes cargados.</div>}
        </section>
        <section className="card">
          <div className="sec-h"><h3>Próximas entregas</h3><span className="meta">{entregas.length} en producción</span></div>
          {entregas.map((p) => {
            const a = M.pasosArr(p.pasos, 6);
            return (
              <div key={p.id} className="flag" style={{ flexDirection: 'column', gap: 8 }}>
                <div className="p-top" style={{ width: '100%' }}><div>{M.corto(p.institucion)}<small>{p.descripcion}{p.taller ? ` · ${p.taller}` : ''}</small></div>
                  {p.fecha_entrega ? <Plazo fecha={p.fecha_entrega} verbo="Entrega" /> : <span className="due">Sin fecha</span>}</div>
                <Costura pct={(a.filter(Boolean).length / 6) * 100} />
              </div>
            );
          })}
          {!entregas.length && <div className="empty">No hay producciones en curso.</div>}
        </section>
      </div>
    </div>
  );
}
