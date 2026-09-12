'use client';

import { useState } from 'react';
import * as M from '../lib/modelo';
import { CHECK, Chip, Valor, Costura, Plazo, Pasos, Seg } from './ui';

const porFecha = (k) => (a, b) => String(a[k] || '9999').localeCompare(String(b[k] || '9999'));
const dentro = (d, a, b) => d !== null && d >= a && d <= b;

function TareaFila({ t, idx, acc }) {
  const p = idx.get(t.proyecto_id);
  const h = M.hoy();
  const tarde = !t.hecha && t.fecha < h;
  return (
    <div className={`task${t.hecha ? ' done' : ''}`}>
      <button className="check" onClick={() => acc.tarea(t)} aria-label={t.hecha ? 'Desmarcar' : 'Marcar como hecha'}>{CHECK}</button>
      <div>
        <div className="t-text">{t.texto}</div>
        <div className="t-meta">
          <Chip p={p} /><Valor p={p} />
          {!t.hecha && t.fecha !== h && <span className="chip">{M.cuando(t.fecha)}</span>}
          {tarde && <button className="btn sm ghost" onClick={() => acc.aManana(t)}>Pasar a mañana</button>}
        </div>
      </div>
    </div>
  );
}

function AvisoLimpieza({ n, limpiar }) {
  if (!n) return null;
  return (
    <button className="alert info" onClick={limpiar}>
      <div><b>Pongamos al día {n} licitaciones</b><br /><span>Ya pasó su fecha y no sabemos qué pasó. Unos 10 minutos.</span></div>
      <span className="arrow" aria-hidden="true">→</span>
    </button>
  );
}

/* ---------- Hoy ---------- */
export function Hoy({ db, idx, acc, ir, limpiar }) {
  const [mas, setMas] = useState(false);
  const [despues, setDespues] = useState(false);
  const h = M.hoy();
  const abiertas = db.TAREAS.filter((t) => !t.hecha && t.fecha && t.fecha <= h).sort(porFecha('fecha'));
  const hechasHoy = db.TAREAS.filter((t) => t.hecha === h);
  const luego = db.TAREAS.filter((t) => !t.hecha && t.fecha > h).sort(porFecha('fecha'));
  const visibles = mas ? abiertas : abiertas.slice(0, 3);
  const involucrados = [...new Set([...abiertas, ...hechasHoy].map((t) => t.proyecto_id))].map((id) => idx.get(id)).filter((p) => M.valorDe(p).k === 'val');
  const enJuego = involucrados.reduce((s, p) => s + p.monto, 0);
  const total = abiertas.length + hechasHoy.length;

  const L = db.LICITACIONES;
  const nLimpia = L.filter((l) => l.limpieza === 'pendiente').length;
  const porDecidir = L.filter((l) => l.estado === 'Por decidir' && l.limpieza !== 'pendiente').sort(porFecha('fecha_limite'));
  const prontoLic = L.filter((l) => l.limpieza !== 'pendiente' && l.estado === 'Preparando' && dentro(M.diasHasta(l.fecha_limite), 0, 5)).sort(porFecha('fecha_limite'));
  const prontoProd = db.PRODUCCION.filter((p) => dentro(M.diasHasta(p.fecha_entrega), -60, 3) && !M.pasosArr(p.pasos, 6).every(Boolean)).sort(porFecha('fecha_entrega'));

  return (
    <>
      <AvisoLimpieza n={nLimpia} limpiar={limpiar} />
      {total > 0 ? (
        <div className="hero">
          <span className="eyebrow">En juego hoy</span>
          <div className="big">{M.fmt(enJuego)}</div>
          <div className="lbl">Sus tareas de hoy están hiladas a {involucrados.length} oportunidad{involucrados.length === 1 ? '' : 'es'}.</div>
          <Costura pct={(hechasHoy.length / total) * 100} />
          <div className="lbl"><b>{hechasHoy.length} de {total}</b> hechas hoy</div>
        </div>
      ) : (
        <div className="hero">
          <span className="eyebrow">Hoy</span>
          <div className="lbl">Nada anotado para hoy. Toque <b>Anotar</b> cuando tenga algo que hacer; queda hilado a su licitación o cliente.</div>
        </div>
      )}
      {porDecidir.length > 0 && (
        <button className="alert" onClick={() => ir('lic', 'dec')}>
          <div><b>{porDecidir.length} licitaci{porDecidir.length === 1 ? 'ón' : 'ones'} por decidir</b><br />
            <span>La de {M.corto(porDecidir[0].institucion)} vence {M.cuando(porDecidir[0].fecha_limite).toLowerCase()}</span></div>
          <span className="arrow" aria-hidden="true">→</span>
        </button>
      )}

      <section className="sec">
        <div className="sec-h"><h3>{abiertas.length ? 'Las 3 de hoy' : 'Tareas de hoy'}</h3><span className="meta">{abiertas.length} pendiente{abiertas.length === 1 ? '' : 's'}</span></div>
        <div className="list">
          {visibles.map((t) => <TareaFila key={t.id} t={t} idx={idx} acc={acc} />)}
          {!abiertas.length && !hechasHoy.length && <div className="empty">Sin tareas pendientes.</div>}
          {abiertas.length > 3 && <button className="more" onClick={() => setMas(!mas)}>{mas ? 'Mostrar solo 3' : `+${abiertas.length - 3} más para hoy`}</button>}
          {hechasHoy.map((t) => <TareaFila key={t.id} t={t} idx={idx} acc={acc} />)}
        </div>
      </section>

      {(prontoLic.length > 0 || prontoProd.length > 0) && (
        <section className="sec">
          <div className="sec-h"><h3>Se vence pronto</h3></div>
          <div className="list">
            {prontoLic.map((l) => {
              const vis = M.lvisibles(l), a = M.lpasos(l), n = vis.filter((i) => a[i]).length;
              return (
                <button key={l.id} className="card pcard tap" onClick={() => ir('lic', 'curso')}>
                  <div className="p-top"><div className="p-inst">{M.corto(l.institucion)}</div><Plazo fecha={l.fecha_limite} verbo="Vence" /></div>
                  <div className="p-obj">{M.frase(l.objeto)}</div>
                  <Costura pct={(n / vis.length) * 100} />
                  <div className="lbl">{n} de {vis.length} pasos de la oferta</div>
                </button>
              );
            })}
            {prontoProd.map((p) => {
              const a = M.pasosArr(p.pasos, 6), n = a.filter(Boolean).length;
              return (
                <button key={p.id} className="card pcard tap" onClick={() => ir('prod')}>
                  <div className="p-top"><div className="p-inst">{M.corto(p.institucion)}</div><Plazo fecha={p.fecha_entrega} verbo="Entrega" /></div>
                  <div className="p-obj">{p.descripcion}</div>
                  <Costura pct={(n / 6) * 100} />
                  <div className="lbl">{n} de 6 pasos de producción</div>
                </button>
              );
            })}
          </div>
        </section>
      )}

      <section className="sec">
        <div className="sec-h"><h3>Después</h3><span className="meta">{luego.length} tarea{luego.length === 1 ? '' : 's'}</span></div>
        {despues && <div className="list">{luego.map((t) => <TareaFila key={t.id} t={t} idx={idx} acc={acc} />)}</div>}
        {luego.length > 0 && <button className="more" onClick={() => setDespues(!despues)}>{despues ? 'Ocultar' : 'Ver lo que viene'}</button>}
      </section>
    </>
  );
}

/* ---------- Licitaciones ---------- */
function Datos({ l }) {
  const conv = M.num(l.conveniencia);
  return (
    <div className="facts">
      <div>Presupuesto<b>{M.montoTxt(l.presupuesto)}</b></div>
      <div>Presentar<b>{M.fechaCorta(l.fecha_limite)}</b></div>
      <div>Muestra física<b className="txt">{String(l.muestras).toUpperCase() === 'SI' ? 'Sí, piden muestra' : String(l.muestras).toUpperCase() === 'NO' ? 'No' : '—'}</b></div>
      <div>Conveniencia<b>{conv ? <span className="meter"><i><b style={{ width: `${conv}%` }} /></i>{conv}</span> : '—'}</b></div>
    </div>
  );
}

function LicCard({ l, acc, abrir }) {
  const inst = M.bonito(l.institucion);
  const obj = M.frase(l.objeto);
  const cab = (derecha) => (
    <div className="p-top"><div><div className="p-num">{l.numero}</div><div className="p-inst">{inst}</div></div>{derecha}</div>
  );
  const nota = l.notas ? <div className="p-nota">{l.notas}</div> : null;

  if (l.estado === 'Por decidir') {
    return (
      <article className="card pcard">
        {cab(<Plazo fecha={l.fecha_limite} verbo="Vence" />)}
        <div className="p-obj">{obj}</div>
        <Datos l={l} />
        {nota}
        <div className="actions">
          <button className="btn ghost" onClick={() => abrir({ tipo: 'no', l, estado: 'No participamos' })}>No participar</button>
          <button className="btn pri" onClick={() => acc.licSi(l)}>Sí, participar</button>
        </div>
      </article>
    );
  }
  if (l.estado === 'Preparando') {
    const vis = M.lvisibles(l), a = M.lpasos(l), n = vis.filter((i) => a[i]).length;
    return (
      <article className="card pcard">
        {cab(<Plazo fecha={l.fecha_limite} verbo="Vence" />)}
        <div className="p-obj">{obj} · <span className="mono">{M.montoTxt(l.presupuesto)}</span></div>
        <Costura pct={(n / vis.length) * 100} />
        <Pasos nombres={M.LIC_PASOS} hechos={a} indices={vis} onToggle={(i) => acc.licPaso(l, i)} />
        {nota}
        {n === vis.length && <button className="btn pri" onClick={() => acc.licEstado(l, 'Presentada')}>Marcar como presentada</button>}
        <div className="actions">
          <button className="btn sm ghost" onClick={() => acc.licEstado(l, 'Objetada')}>La objetaron</button>
          <button className="btn sm ghost" onClick={() => abrir({ tipo: 'no', l, estado: 'No se presentó' })}>No se presentó</button>
        </div>
      </article>
    );
  }
  if (l.estado === 'Objetada') {
    return (
      <article className="card pcard">
        {cab(<span className="due warn">Objetada</span>)}
        <div className="p-obj">{obj} · <span className="mono">{M.montoTxt(l.presupuesto)}</span></div>
        {nota}
        <div className="actions">
          <button className="btn ghost" onClick={() => abrir({ tipo: 'no', l, estado: 'No participamos' })}>No participar</button>
          <button className="btn pri" onClick={() => abrir({ tipo: 'fecha', l })}>Salió nuevo cartel</button>
        </div>
      </article>
    );
  }
  if (l.estado === 'Presentada') {
    return (
      <article className="card pcard">
        {cab(<span className="due">Presentada</span>)}
        <div className="p-obj">{obj}</div>
        <div className="facts"><div>Presupuesto<b>{M.montoTxt(l.presupuesto)}</b></div><div>Presentada para<b>{M.fechaCorta(l.fecha_limite)}</b></div></div>
        {nota}
        <div className="actions">
          <button className="btn ghost" onClick={() => acc.licEstado(l, 'Perdida')}>Perdimos</button>
          <button className="btn pri" onClick={() => acc.licEstado(l, 'Adjudicada')}>Nos adjudicaron</button>
        </div>
      </article>
    );
  }
  const cls = l.estado === 'Adjudicada' ? 'ok' : '';
  return (
    <article className="card pcard">
      {cab(<span className={`due ${cls}`}>{l.estado}</span>)}
      <div className="p-obj">{obj} · <span className="mono">{M.montoTxt(l.presupuesto)}</span></div>
      {l.razon && <div className="lbl">Razón: <b>{l.razon}</b></div>}
    </article>
  );
}

export function Licitaciones({ db, acc, abrir, seg, setSeg, limpiar }) {
  const L = db.LICITACIONES.filter((l) => l.limpieza !== 'pendiente');
  const nLimpia = db.LICITACIONES.length - L.length;
  const orden = { Preparando: 0, Objetada: 1, Presentada: 2 };
  const grupos = {
    dec: L.filter((l) => l.estado === 'Por decidir').sort((a, b) => porFecha('fecha_limite')(a, b) || M.num(b.conveniencia) - M.num(a.conveniencia)),
    curso: L.filter((l) => M.LIC_EN_CURSO.includes(l.estado)).sort((a, b) => orden[a.estado] - orden[b.estado] || porFecha('fecha_limite')(a, b)),
    cerr: L.filter((l) => M.LIC_CERRADAS.includes(l.estado)).sort((a, b) => String(b.ultimo_mov).localeCompare(String(a.ultimo_mov))),
  };
  const s = grupos[seg.lic] ? seg.lic : 'dec';
  const vacio = { dec: 'Nada por decidir. Las licitaciones nuevas caen aquí.', curso: 'No hay ofertas en preparación.', cerr: 'Todavía no hay licitaciones cerradas.' }[s];
  return (
    <>
      <button className="btn" onClick={() => abrir({ tipo: 'nuevaLic' })}>+ Nueva licitación · pegar alerta de SICOP</button>
      <AvisoLimpieza n={nLimpia} limpiar={limpiar} />
      <Seg label="Estado" valor={s} onChange={(k) => setSeg((x) => ({ ...x, lic: k }))}
        opciones={[['dec', 'Por decidir', grupos.dec.length], ['curso', 'En curso', grupos.curso.length], ['cerr', 'Cerradas', grupos.cerr.length]]} />
      <div className="list">
        {grupos[s].map((l) => <LicCard key={l.id} l={l} acc={acc} abrir={abrir} />)}
        {!grupos[s].length && <div className="empty">{vacio}</div>}
      </div>
    </>
  );
}

/* ---------- Clientes ---------- */
export function Clientes({ db, acc, abrir, seg, setSeg }) {
  const C = db.CLIENTES;
  const etapa = (c) => Math.max(0, M.CLI_ETAPAS.indexOf(c.etapa));
  const quieto = (c) => -(M.diasHasta(c.ultimo_mov || c.creado) ?? 0);
  const total = C.reduce((s, c) => s + M.num(c.monto), 0);
  const nQuietos = C.filter((c) => quieto(c) > 7).length;
  const chips = [[-1, 'Todas', C]].concat(M.CLI_ETAPAS.map((n, i) => [i, n, C.filter((c) => etapa(c) === i)]));
  const lista = C.filter((c) => seg.cli < 0 || etapa(c) === seg.cli).sort((a, b) => quieto(b) - quieto(a));
  return (
    <>
      <button className="btn" onClick={() => abrir({ tipo: 'nuevoCli' })}>+ Nueva oportunidad</button>
      {C.length > 0 && (
        <>
          <div className="hero">
            <span className="eyebrow">Pipeline de clientes</span>
            <div className="big">{M.fmt(total)}</div>
            <div className="lbl">{C.length} oportunidades{nQuietos > 0 && <> · <b style={{ color: 'var(--crit)' }}>{nQuietos} sin movimiento en más de 7 días</b></>}</div>
          </div>
          <div className="stages" role="group" aria-label="Etapa">
            {chips.map(([i, n, a]) => (
              <button key={i} aria-pressed={seg.cli === i} onClick={() => setSeg((x) => ({ ...x, cli: i }))}>
                <span>{n}</span><small>{a.length} · {M.fmt(a.reduce((s, c) => s + M.num(c.monto), 0))}</small>
              </button>
            ))}
          </div>
        </>
      )}
      <div className="list">
        {lista.map((c) => {
          const e = etapa(c), q = quieto(c), corto = M.corto(c.institucion);
          return (
            <article key={c.id} className="card pcard">
              <div className="p-top"><div><div className="p-inst">{M.bonito(c.institucion)}</div><div className="p-obj">{c.oportunidad}</div></div><span className="mono" style={{ fontWeight: 600 }}>{M.fmt(c.monto)}</span></div>
              <div className="ladder" aria-hidden="true">{M.CLI_ETAPAS.map((_, i) => <i key={i} className={i <= e ? 'on' : ''} />)}</div>
              <div className="p-top"><span className="stage-name">{M.CLI_ETAPAS[e]}</span>{q > 7 && <span className="stale">Sin movimiento hace {q} días</span>}</div>
              <div className="next"><em>Siguiente:</em> {c.siguiente_paso || 'Sin definir'}</div>
              {c.notas && <div className="p-nota">{c.notas}</div>}
              <div className="actions">
                <button className="btn sm" onClick={() => abrir({ tipo: 'tarea', pid: c.id, titulo: `Tarea para ${corto}` })}>+ Tarea</button>
                {e < M.CLI_ETAPAS.length - 1 && (
                  <button className="btn sm pri" onClick={() => { acc.cliAvanzar(c); abrir({ tipo: 'tarea', pid: c.id, titulo: `¿Cuál es el siguiente paso con ${corto}?` }); }}>
                    Pasar a {M.CLI_ETAPAS[e + 1]}
                  </button>
                )}
              </div>
            </article>
          );
        })}
        {!C.length && <div className="empty">Todavía no hay clientes. Agregue la primera oportunidad con su etapa y monto.</div>}
        {C.length > 0 && !lista.length && <div className="empty">No hay oportunidades en esta etapa.</div>}
      </div>
    </>
  );
}

/* ---------- Producción ---------- */
export function Produccion({ db, acc, abrir }) {
  const [verListas, setVerListas] = useState(false);
  const R = db.PRODUCCION.map((r) => ({ r, a: M.pasosArr(r.pasos, M.PROD_PASOS.length) }));
  const enCurso = R.filter((x) => !x.a.every(Boolean)).sort((x, y) => porFecha('fecha_entrega')(x.r, y.r));
  const listas = R.filter((x) => x.a.every(Boolean));
  const tarjeta = ({ r, a }) => (
    <article key={r.id} className="card pcard">
      <div className="p-top"><div><div className="p-inst">{M.bonito(r.institucion)}</div><div className="p-obj">{r.descripcion}</div></div>
        {r.fecha_entrega ? <Plazo fecha={r.fecha_entrega} verbo="Entrega" /> : <span className="due">Sin fecha</span>}</div>
      <div className="facts">
        <div>Taller<b className="txt">{r.taller || 'Sin asignar'}</b></div>
        <div>Monto<b>{M.fmt(r.monto)}</b></div>
        {r.piezas !== '' && <div>Piezas<b>{r.piezas}</b></div>}
      </div>
      <Costura pct={(a.filter(Boolean).length / a.length) * 100} />
      <Pasos nombres={M.PROD_PASOS} hechos={a} onToggle={(i) => acc.prodPaso(r, i)} />
      <div className="actions"><button className="btn sm ghost" onClick={() => abrir({ tipo: 'nuevaProd', p: r })}>Editar datos</button></div>
    </article>
  );
  return (
    <>
      <button className="btn" onClick={() => abrir({ tipo: 'nuevaProd' })}>+ Nueva producción</button>
      <div className="list">
        {enCurso.map(tarjeta)}
        {!enCurso.length && <div className="empty">No hay producciones en curso. Cuando una licitación se adjudica, aparece aquí sola.</div>}
      </div>
      {listas.length > 0 && (
        <section className="sec">
          <div className="sec-h"><h3>Entregadas</h3><span className="meta">{listas.length}</span></div>
          {verListas && <div className="list">{listas.map(tarjeta)}</div>}
          <button className="more" onClick={() => setVerListas(!verListas)}>{verListas ? 'Ocultar' : 'Ver entregadas'}</button>
        </section>
      )}
    </>
  );
}

/* ---------- Semana ---------- */
export function Semana({ db, idx }) {
  const w = M.semana(db, idx);
  const pc = (n) => (w.total ? Math.round((n / w.total) * 100) : 0);
  const msg = !w.total ? 'Cada tarea o paso que marque aparece aquí.'
    : pc(w.none) > 30 ? 'Casi un tercio de la semana se fue en tareas internas. ¿Alguna se puede delegar?'
      : 'Buen balance: la mayor parte de la semana movió oportunidades reales.';
  const dias = {};
  w.d.forEach((m) => { (dias[m.fecha] ||= []).push(m); });
  return (
    <>
      <div className="hero">
        <span className="eyebrow">Movió esta semana</span>
        <div className="big">{M.fmt(w.monto)}</div>
        <div className="lbl">{w.total} acciones en {w.nproj} oportunidades distintas</div>
        <div className="split" aria-hidden="true">
          {w.val > 0 && <b style={{ flex: w.val }} />}{w.dec > 0 && <u style={{ flex: w.dec }} />}{w.none > 0 && <i style={{ flex: w.none }} />}
        </div>
        <div className="legend">
          <span style={{ '--c': 'var(--value)' }}>Genera valor {pc(w.val)}%</span>
          <span style={{ '--c': 'var(--accent)' }}>Decisiones {pc(w.dec)}%</span>
          <span style={{ '--c': 'var(--none)' }}>No genera valor {pc(w.none)}%</span>
        </div>
        <div className="lbl">{msg}</div>
      </div>
      <section className="sec">
        <div className="sec-h"><h3>Lo que ya hizo</h3></div>
        {Object.keys(dias).sort().reverse().map((d) => (
          <div key={d} className="card day">
            <h4>{d === M.hoy() ? 'Hoy' : M.fechaLarga(d)}</h4>
            {dias[d].map((m) => {
              const p = idx.get(m.proyecto_id);
              return (
                <div key={m.id} className="done-row">
                  <div>{m.accion}<div className="p">{p ? (p.tipo === 'int' ? 'Interno' : `${M.TIPO_NOMBRE[p.tipo]} · ${p.corto}`) : ''}</div></div>
                  <Valor p={p} />
                </div>
              );
            })}
          </div>
        ))}
        {!w.total && <div className="empty">Todavía nada esta semana.</div>}
      </section>
      <a className="btn link" href="/gerente">Ver panel del gerente →</a>
    </>
  );
}
