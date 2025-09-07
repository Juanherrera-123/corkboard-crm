'use client';
export const dynamic = 'force-dynamic';

import { useEffect, useState } from 'react';
import { createClient } from '@supabase/supabase-js';

export default function Debug() {
  const [status, setStatus] = useState<'idle'|'ok'|'err'>('idle');

  useEffect(() => {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
    try {
      if (!url || !anon) throw new Error('ENV faltantes');
      const supabase = createClient(url, anon);
      // ...tu lógica de debug aquí (suscripciones, etc.)
      setStatus('ok');
    } catch {
      setStatus('err');
    }
  }, []);

  return (
    <div style={{padding:24}}>
      <h1>Realtime Debug</h1>
      <p>Estado: {status}</p>
      <p>Esta página sólo corre en el cliente y no bloquea el build.</p>
    </div>
  );
}
