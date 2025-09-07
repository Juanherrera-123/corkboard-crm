'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';

type Mode = 'login' | 'signup';

export default function LoginPage() {
  const router = useRouter();

  const [mode, setMode] = useState<Mode>('login');
  const [email, setEmail] = useState('');
  const [pass, setPass] = useState('');
  const [pass2, setPass2] = useState('');
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data } = await supabase.auth.getSession();
      if (!cancelled && data.session) {
        router.replace('/home');
      } else if (!cancelled) {
        setReady(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [router]);

  const submit = async () => {
    setMsg(null);
    setLoading(true);
    try {
      if (mode === 'signup') {
        if (pass.length < 6) throw new Error('La contraseña debe tener al menos 6 caracteres.');
        if (pass !== pass2) throw new Error('Las contraseñas no coinciden.');
        const { data, error } = await supabase.auth.signUp({ email, password: pass });
        if (error) throw error;
        if (data.session) {
          router.replace('/home');
          return;
        }
      } else {
        const { data, error } = await supabase.auth.signInWithPassword({ email, password: pass });
        if (error) throw error;
        if (data.session) {
          router.replace('/home');
          return;
        }
      }
      setMsg('Revisa tu correo si la verificación está habilitada.');
    } catch (e: any) {
      setMsg(`❌ ${e?.message ?? 'Error al autenticar'}`);
    } finally {
      setLoading(false);
    }
  };

  if (!ready) {
    return (
      <div className="min-h-screen grid place-items-center bg-slate-50">
        <div className="text-slate-500 text-sm">Cargando…</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 px-4">
      <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h1 className="text-xl font-semibold text-slate-800">
          {mode === 'login' ? 'Iniciar sesión' : 'Crear cuenta'}
        </h1>
        <p className="text-sm text-slate-500 mt-1">
          {mode === 'login'
            ? 'Ingresa con tu correo y contraseña.'
            : 'Registro sin verificación de email por ahora.'}
        </p>

        <div className="mt-4 space-y-3">
          <input
            type="email"
            autoComplete="email"
            placeholder="tu@email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-sky-400"
          />
          <input
            type="password"
            autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
            placeholder="Contraseña"
            value={pass}
            onChange={(e) => setPass(e.target.value)}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-sky-400"
          />
          {mode === 'signup' && (
            <input
              type="password"
              autoComplete="new-password"
              placeholder="Repite contraseña"
              value={pass2}
              onChange={(e) => setPass2(e.target.value)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-sky-400"
            />
          )}
          <button
            onClick={submit}
            disabled={loading}
            className="w-full rounded-lg bg-sky-600 text-white py-2 font-medium hover:bg-sky-700 disabled:opacity-60"
          >
            {loading ? 'Procesando…' : mode === 'login' ? 'Entrar' : 'Crear y entrar'}
          </button>
        </div>

        {msg && <p className="mt-3 text-sm text-slate-600">{msg}</p>}

        <div className="mt-4 text-sm text-slate-600">
          {mode === 'login' ? (
            <>
              ¿No tienes cuenta?{' '}
              <button
                className="text-sky-700 hover:underline"
                onClick={() => {
                  setMsg(null);
                  setMode('signup');
                }}
              >
                Crear una
              </button>
            </>
          ) : (
            <>
              ¿Ya tienes cuenta?{' '}
              <button
                className="text-sky-700 hover:underline"
                onClick={() => {
                  setMsg(null);
                  setMode('login');
                }}
              >
                Inicia sesión
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
