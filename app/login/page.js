'use client';

import { useState } from 'react';

export default function Login() {
  const [clave, setClave] = useState('');
  const [entrando, setEntrando] = useState(false);
  const [fallo, setFallo] = useState(null);

  const entrar = async (e) => {
    e.preventDefault();
    setEntrando(true);
    setFallo(null);
    try {
      const res = await fetch('/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ clave }),
      });
      const json = await res.json();
      if (json.error) throw new Error(json.error);
      window.location.replace('/');
    } catch (err) {
      setFallo(err.message);
      setEntrando(false);
    }
  };

  return (
    <main>
      {/* method="post": si el JS no llegó a cargar, la contraseña no viaja en la URL. */}
      <form className="acceso" method="post" action="/api/login" onSubmit={entrar}>
        <h1>Hilo</h1>
        <div className="hilo" aria-hidden="true" />
        <label htmlFor="clave">Contraseña · se pide una sola vez en cada teléfono</label>
        <input id="clave" type="password" autoComplete="current-password" value={clave} onChange={(e) => setClave(e.target.value)} autoFocus />
        {fallo && <p className="aviso error">{fallo}</p>}
        <button type="submit" disabled={entrando || !clave}>{entrando ? 'Entrando…' : 'Entrar'}</button>
      </form>
    </main>
  );
}
