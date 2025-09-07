'use client';
export const dynamic = 'force-dynamic';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';

export default function Debug() {
  const [status, setStatus] = useState<'idle'|'ok'|'err'>('idle');

  useEffect(() => {
    try {
      // ...tu lógica de debug aquí (suscripciones, etc.)
      void supabase;
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
