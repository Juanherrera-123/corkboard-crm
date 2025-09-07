'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';
import Sidebar from '@/components/Sidebar';
import { ensureDefaultTemplates, fetchTemplates, getMyProfile } from '@/lib/db';

export default function TemplatesPage() {
  const router = useRouter();
  const [ready, setReady] = useState(false);
  const [templates, setTemplates] = useState<any[]>([]);

  useEffect(() => {
    let active = true;
    (async () => {
      const { data } = await supabase.auth.getUser();
      if (!data.user) {
        router.replace('/login');
        return;
      }
      const { org_id } = await getMyProfile();
      await ensureDefaultTemplates(org_id);
      const rows = await fetchTemplates();
      if (!active) return;
      setTemplates(rows);
      setReady(true);
    })();
    return () => {
      active = false;
    };
  }, [router]);

  if (!ready) {
    return (
      <div className="min-h-screen grid place-items-center bg-slate-50">
        <div className="text-slate-600">Cargando…</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex">
      <Sidebar />
      <main className="flex-1 p-6">
        <h1 className="text-xl font-semibold text-slate-800">Plantillas</h1>
        {templates.length === 0 ? (
          <p className="mt-4 text-slate-600">Aún no hay plantillas.</p>
        ) : (
          <div className="mt-6 grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {templates.map((t) => (
              <div key={t.id} className="rounded-2xl border border-slate-200 bg-white p-4">
                <div className="font-medium text-slate-800">{t.name}</div>
                <div className="mt-1 text-xs text-slate-500">{t.fields.length} campos</div>
                <button
                  className="mt-3 text-sm text-sky-700 hover:underline"
                  onClick={() => router.push(`/home?template=${t.id}`)}
                >
                  Usar en ficha
                </button>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
