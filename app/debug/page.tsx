'use client';
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';

export default function DebugPage() {
  const [status, setStatus] = useState('⏳ Probando conexión...');

  useEffect(() => {
    (async () => {
      const { data, error } = await supabase.from('orgs').select('*').limit(1);
      if (error) setStatus('❌ Error: ' + error.message);
      else setStatus('✅ Conectado a Supabase: ' + JSON.stringify(data));
    })();
  }, []);

  return <div style={{ padding: 20, fontSize: '18px' }}>{status}</div>;
}

