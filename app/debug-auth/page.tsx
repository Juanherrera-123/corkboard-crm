'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';

export default function DebugAuth() {
  const [out, setOut] = useState<any>(null);

  useEffect(() => {
    (async () => {
      const a = await supabase.auth.getSession();
      const b = await supabase.auth.getUser();
      setOut({ session: a.data.session, user: b.data.user });
      console.log('getSession', a);
      console.log('getUser', b);
    })();
  }, []);

  return (
    <pre style={{ padding: 16, background: '#f6f6f6', overflow: 'auto' }}>
      {JSON.stringify(out, null, 2)}
    </pre>
  );
}
