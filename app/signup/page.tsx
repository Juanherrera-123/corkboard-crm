'use client';
import { useState } from 'react';
import { supabase } from '@/lib/supabaseClient';

export default function Signup() {
  const [email, setEmail] = useState('');
  const [pass, setPass] = useState('');
  const [pass2, setPass2] = useState('');
  const [msg, setMsg] = useState('');

  async function handleSignup(e: React.FormEvent) {
    e.preventDefault();
    if (!email || !pass) return setMsg('⚠️ Ingresa correo y contraseña.');
    if (pass !== pass2) return setMsg('⚠️ Las contraseñas no coinciden.');

    const { error: upErr } = await supabase.auth.signUp({ email, password: pass });
    if (upErr) return setMsg('❌ ' + upErr.message);

    const { error: inErr } = await supabase.auth.signInWithPassword({ email, password: pass });
    if (inErr) return setMsg('❌ ' + inErr.message);

    window.location.href = '/home';
  }

  return (
    <div className="min-h-screen grid place-items-center bg-slate-50">
      <form onSubmit={handleSignup} className="w-full max-w-md bg-white p-6 rounded-2xl border shadow-sm">
        <h1 className="text-xl font-semibold text-slate-800">Crear cuenta</h1>
        <p className="text-sm text-slate-600 mt-1">Registro sin verificación de email por ahora.</p>

        <label className="block mt-4 text-sm">Correo</label>
        <input className="w-full border rounded-lg px-3 py-2" type="email"
               value={email} onChange={(e)=>setEmail(e.target.value)} placeholder="tu@email" />

        <label className="block mt-3 text-sm">Contraseña</label>
        <input className="w-full border rounded-lg px-3 py-2" type="password"
               value={pass} onChange={(e)=>setPass(e.target.value)} placeholder="••••••••" />

        <label className="block mt-3 text-sm">Repite contraseña</label>
        <input className="w-full border rounded-lg px-3 py-2" type="password"
               value={pass2} onChange={(e)=>setPass2(e.target.value)} placeholder="••••••••" />

        <button type="submit" className="mt-5 w-full rounded-lg bg-sky-600 text-white py-2 hover:bg-sky-700">
          Crear y entrar
        </button>

        <p className="text-sm mt-3 text-slate-600">{msg}</p>

        <div className="text-sm mt-4 text-slate-600">
          ¿Ya tienes cuenta? <a className="text-sky-700" href="/login">Inicia sesión</a>
        </div>
      </form>
    </div>
  );
}
