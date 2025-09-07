'use client';
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';

export default function Login() {
  const [email, setEmail] = useState('');
  const [pass, setPass] = useState('');
  const [msg, setMsg] = useState('');

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) window.location.href = '/home';
    });
  }, []);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    const { error } = await supabase.auth.signInWithPassword({ email, password: pass });
    if (error) setMsg('❌ ' + error.message);
    else window.location.href = '/home';
  }

  return (
    <div className="min-h-screen grid place-items-center bg-slate-50">
      <form onSubmit={handleLogin} className="w-full max-w-md bg-white p-6 rounded-2xl border shadow-sm">
        <h1 className="text-xl font-semibold text-slate-800">Iniciar sesión</h1>

        <label className="block mt-4 text-sm">Correo</label>
        <input className="w-full border rounded-lg px-3 py-2" type="email"
               value={email} onChange={(e) => setEmail(e.target.value)} placeholder="tu@email" />

        <label className="block mt-3 text-sm">Contraseña</label>
        <input className="w-full border rounded-lg px-3 py-2" type="password"
               value={pass} onChange={(e) => setPass(e.target.value)} placeholder="••••••••" />

        <button type="submit" className="mt-5 w-full rounded-lg bg-sky-600 text-white py-2 hover:bg-sky-700">
          Entrar
        </button>

        <p className="text-sm mt-3 text-slate-600">{msg}</p>
        <div className="text-sm mt-4 text-slate-600">
          ¿No tienes cuenta? <a className="text-sky-700" href="/signup">Crear una</a>
        </div>
      </form>
    </div>
  );
}
