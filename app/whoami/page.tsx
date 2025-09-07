'use client';
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';

export default function WhoAmI() {
  const [text, setText] = useState('Cargando...');

  useEffect(() => {
    (async () => {
      const { data: userResp } = await supabase.auth.getUser();
      if (!userResp.user) {
        setText('Sin sesión. Ve a /login');
        return;
      }
      const uid = userResp.user.id;
      const email = userResp.user.email;
      const { data: prof } = await supabase
        .from('profiles')
        .select('org_id, role')
        .eq('user_id', uid)
        .single();
      setText(`UID: ${uid}\nEmail: ${email}\nPerfil: ${JSON.stringify(prof)}`);
    })();
  }, []);

  return <pre style={{padding:16}}>{text}</pre>;
}
