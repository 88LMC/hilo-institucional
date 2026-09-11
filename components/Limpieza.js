'use client';

import { useEffect, useState } from 'react';
import * as M from '../lib/modelo';
import { Costura } from './ui';

/** Repaso guiado, una por una, de las licitaciones que ya pasaron su fecha. */
export default function Limpieza({ db, acc, cerrar }) {
  const [saltadas, setSaltadas] = useState([]);
  const [modo, setModo] = useState(null);
  const [fecha, setFecha] = useState('');
  const [otra, setOtra] = useState('');
  const [hechas, setHechas] = useState(0);

  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = prev; };
  }, []);

  const cola = db.LICITACIONES.filter((l) => l.limpieza === 'pendiente')
    .sort((a, b) => String(b.fecha_limite || '').localeCompare(String(a.fecha_limite || '')));
  const orden = [...cola.filter((l) => !saltadas.includes(l.id)), ...cola.filter((l) => saltadas.includes(l.id))];
  const l = orden[0];
  const total = hechas + cola.length;

  const listo = (set) => {
    acc.limpiar(l, { ultimo_mov: M.hoy(), ...set });
    setHechas((h) => h + 1);
    setModo(null);
    setFecha('');
    setOtra('');
    window.scrollTo(0, 0);
  };

  if (!l) {
    return (
      <div className="limpia"><div className="limpia-in">
        <div className="fin">
          <div className="big">¡Al día!</div>
          <p className="lbl">{hechas ? `Puso al día ${hechas} licitaciones.` : 'No hay licitaciones pendientes de revisar.'} Desde ahora cada una se va actualizando sola con el uso.</p>
          <button className="btn pri" onClick={cerrar}>Volver</button>
        </div>
      </div></div>
    );
  }

  const razones = modo === 'no' ? M.RAZONES_NO : M.RAZONES_NO_SE_PRESENTO;
  const estadoNo = modo === 'no' ? 'No participamos' : 'No se presentó';
  const muestra = String(l.muestras).toUpperCase();

  return (
    <div className="limpia" role="dialog" aria-modal="true" aria-label="Poner al día las licitaciones">
      <div className="limpia-in">
        <div className="limpia-top">
          <div><span className="eyebrow">Poner al día · {hechas + 1} de {total}</span><h2>¿Qué pasó con esta?</h2></div>
          <button className="btn sm ghost" onClick={cerrar}>Seguir después</button>
        </div>
        <Costura pct={(hechas / total) * 100} />

        <article className="card pcard">
          <div className="p-top"><div><div className="p-num">{l.numero}</div><div className="p-inst">{M.bonito(l.institucion)}</div></div>
            <span className="due">{l.fecha_limite ? M.hace(l.fecha_limite) : 'Sin fecha'}</span></div>
          <div className="p-obj">{M.frase(l.objeto)}</div>
          <div className="facts">
            <div>Presupuesto<b>{M.montoTxt(l.presupuesto)}</b></div>
            <div>Fecha para presentar<b>{M.fechaCorta(l.fecha_limite)}</b></div>
            <div>Muestra física<b className="txt">{muestra === 'SI' ? 'Sí' : muestra === 'NO' ? 'No' : '—'}</b></div>
            <div>Conveniencia<b>{l.conveniencia || '—'}</b></div>
          </div>
          {l.notas && <div className="p-nota">{l.notas}</div>}
        </article>

        {!modo && (
          <div className="opciones">
            <button onClick={() => listo({ estado: 'Presentada' })}>La presentamos<small>Esperando resultado</small></button>
            <button onClick={() => listo({ estado: 'Adjudicada' })}>Ganamos<small>Nos la adjudicaron</small></button>
            <button onClick={() => listo({ estado: 'Perdida' })}>Perdimos<small>Se la dieron a otro</small></button>
            <button onClick={() => setModo('no')}>No participamos<small>Decidimos no entrar</small></button>
            <button onClick={() => setModo('nose')}>No se presentó<small>Se pasó o no dio tiempo</small></button>
            <button onClick={() => listo({ estado: 'Objetada' })}>Está objetada<small>Esperando nuevo cartel</small></button>
            <button className="full" onClick={() => setModo('fecha')}>Sigue abierta<small>Le cambiaron la fecha</small></button>
          </div>
        )}

        {(modo === 'no' || modo === 'nose') && (
          <div className="field">
            <span className="label">{modo === 'no' ? '¿Por qué no participamos?' : '¿Por qué no se presentó?'}</span>
            <div className="picks">
              {razones.filter((r) => r !== 'Otro').map((r) => <button key={r} className="pick" onClick={() => listo({ estado: estadoNo, razon: r })}>{r}</button>)}
            </div>
            <div className="inrow">
              <input type="text" placeholder="Otra razón" value={otra} onChange={(e) => setOtra(e.target.value)} />
              <button className="btn sm pri" disabled={!otra.trim()} onClick={() => listo({ estado: estadoNo, razon: otra.trim() })}>Guardar</button>
            </div>
            <button className="btn link" onClick={() => setModo(null)}>← Volver</button>
          </div>
        )}

        {modo === 'fecha' && (
          <div className="field">
            <label htmlFor="lp-fecha">Nueva fecha para presentar</label>
            <input id="lp-fecha" type="date" value={fecha} onChange={(e) => setFecha(e.target.value)} />
            <button className="btn pri" disabled={!fecha} onClick={() => listo({ estado: l.estado === 'Por decidir' ? 'Por decidir' : 'Preparando', fecha_limite: fecha, pasos: l.pasos || (l.estado === 'Por decidir' ? '' : '0,0,0,0,0') })}>Guardar fecha</button>
            <button className="btn link" onClick={() => setModo(null)}>← Volver</button>
          </div>
        )}

        {!modo && <button className="more" onClick={() => setSaltadas((s) => [...s, l.id])}>No sé todavía · saltar</button>}
      </div>
    </div>
  );
}
