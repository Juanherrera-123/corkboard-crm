'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import type { Session } from '@supabase/supabase-js';
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

  const syncSessionCookies = (session: Session | null) => {
    const expires = session?.expires_at
      ? new Date(session.expires_at * 1000).toUTCString()
      : '0';
    document.cookie = `sb-access-token=${session?.access_token ?? ''}; path=/; expires=${expires}; SameSite=Lax`;
    document.cookie = `sb-refresh-token=${session?.refresh_token ?? ''}; path=/; expires=${expires}; SameSite=Lax`;
  };

  // On first load, if already authenticated, go to /home (once)
  useEffect(() => {
    let cancelled = false;

    (async () => {
      const { data } = await supabase.auth.getSession();
      if (!cancelled && data.session) {
        // Ensure auth cookies exist before redirecting so middleware lets the
        // request through.  Without syncing the cookies, a stale local session
        // could trigger an infinite redirect between /login and /home.
        syncSessionCookies(data.session);
        router.replace('/home');
      }
    })();

    // Also listen for auth state changes while this page is open
    const { data: sub } = supabase.auth.onAuthStateChange((_ev, session) => {
      syncSessionCookies(session);
      if (session) router.replace('/home'); // <-- never redirect back to /login
    });

    return () => {
      cancelled = true;
      sub.subscription.unsubscribe();
    };
  }, [router]);

  const submit = async () => {
    setMsg(null);
    setLoading(true);
    try {
      if (mode === 'signup') {
        if (pass.length < 6) {
          setMsg('La contraseña debe tener al menos 6 caracteres.');
          return;
        }
        if (pass !== pass2) {
          setMsg('Las contraseñas no coinciden.');
          return;
        }
        const { error } = await supabase.auth.signUp({
          email,
          password: pass,
        });
        if (error) throw error;
        // Si confirmación de email está desactivada, ya hay sesión.
        // Si estuviera activada, el onAuthStateChange manejará el redirect
        // cuando el usuario confirme y vuelva.
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password: pass,
        });
        if (error) throw error;
      }

      // Intento de sesión inmediata (evita esperar al listener)
      const { data } = await supabase.auth.getSession();
      if (data.session) {
        syncSessionCookies(data.session);
        router.replace('/home');
      }
    } catch (e: any) {
      setMsg(`❌ ${e?.message ?? 'Error al autenticar'}`);
    } finally {
      setLoading(false);
    }
  };

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
