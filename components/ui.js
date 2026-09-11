import { TIPO_NOMBRE, valorDe, fmt, plazo } from '../lib/modelo';

export const CHECK = (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M5 12.5l4.5 4.5L19 7.5" /></svg>
);

const P = { fill: 'none', stroke: 'currentColor', strokeWidth: 2, strokeLinecap: 'round', strokeLinejoin: 'round', viewBox: '0 0 24 24', 'aria-hidden': true };
export const ICONOS = {
  hoy: <svg {...P}><circle cx="12" cy="12" r="4" /><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" /></svg>,
  lic: <svg {...P}><path d="M6 3h8l5 5v13H6z" /><path d="M14 3v5h5M9.5 13h6M9.5 17h6" /></svg>,
  cli: <svg {...P}><circle cx="9" cy="8" r="3.5" /><path d="M2.5 20c.8-3.5 3.4-5.5 6.5-5.5s5.7 2 6.5 5.5M16 4.5a3.5 3.5 0 0 1 0 7M18.5 14.8c1.6.9 2.6 2.7 3 5.2" /></svg>,
  prod: <svg {...P}><circle cx="6" cy="6" r="3" /><circle cx="6" cy="18" r="3" /><path d="M8.2 8.2 20 20M8.2 15.8 20 4" /></svg>,
  sem: <svg {...P}><path d="M5 20V11M11 20V5M17 20v-6M3 20h18" /></svg>,
  mic: <svg {...P}><rect x="9" y="3" width="6" height="11" rx="3" /><path d="M5 11a7 7 0 0 0 14 0M12 18v3" /></svg>,
  mas: <svg {...P} strokeWidth="2.4"><path d="M12 5v14M5 12h14" /></svg>,
};

export const colorTipo = (t) => `var(--t-${t})`;

export function Chip({ p }) {
  if (!p) return null;
  return (
    <span className="chip" style={{ '--c': colorTipo(p.tipo) }}>
      <i />{TIPO_NOMBRE[p.tipo]}{p.tipo !== 'int' ? ` · ${p.corto}` : ''}
    </span>
  );
}

export function Valor({ p }) {
  const v = valorDe(p);
  if (v.k === 'none') return <span className="val none">No genera valor</span>;
  if (v.k === 'dec') return <span className="val dec">Decisión</span>;
  return <span className="val">{v.m ? fmt(v.m) : 'Cuantía abierta'}</span>;
}

export function Costura({ pct }) {
  return (
    <div className="stitch" role="progressbar" aria-valuenow={Math.round(pct)} aria-valuemin={0} aria-valuemax={100}>
      <b style={{ width: `${pct}%` }} />
    </div>
  );
}

export function Plazo({ fecha, verbo }) {
  const p = plazo(fecha, verbo);
  return <span className={`due ${p.cls}`}>{p.txt}</span>;
}

export function Pasos({ nombres, hechos, indices, onToggle }) {
  const idx = indices || nombres.map((_, i) => i);
  return (
    <ul className="steps">
      {idx.map((i) => (
        <li key={i}>
          <button className={hechos[i] ? 'on' : ''} onClick={() => onToggle(i)}>
            <span className="box">{CHECK}</span><span>{nombres[i]}</span>
          </button>
        </li>
      ))}
    </ul>
  );
}

export function Seg({ opciones, valor, onChange, label }) {
  return (
    <div className="seg" role="group" aria-label={label}>
      {opciones.map(([k, l, n]) => (
        <button key={k} aria-pressed={valor === k} onClick={() => onChange(k)}>
          {l}{n != null && <span className="n">{n}</span>}
        </button>
      ))}
    </div>
  );
}
