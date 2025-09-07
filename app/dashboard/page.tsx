'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';
import Sidebar from '@/components/Sidebar';
import ModalCreateClient from '@/components/ModalCreateClient';
import { fetchClients } from '@/lib/clients';
import { createClient, logout, ensureDefaultTemplates, getMyProfile } from '@/lib/db';
import type { ClientRow } from '@/lib/clients';

export default function DashboardPage() {
  const router = useRouter();
  const [email, setEmail] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [clients, setClients] = useState<ClientRow[]>([]);
  const [msg, setMsg] = useState<string | null>(null);
  const [openCreate, setOpenCreate] = useState(false);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.auth.getUser();
      if (!data.user) {
        router.replace('/login');
        return;
      }
      setEmail(data.user.email ?? null);
      try {
        const { org_id } = await getMyProfile();
        await ensureDefaultTemplates(org_id);
        const rows = await fetchClients();
        setClients(rows);
      } catch (e: any) {
        setMsg(e?.message ?? 'No se pudieron cargar las fichas');
      } finally {
        setLoading(false);
      }
    })();
  }, [router]);

  async function onCreate(name: string, tag: string) {
    const id = await createClient(name, tag);
    router.push(`/home?client=${id}`);
  }

  return (
    <>
      <div className="min-h-screen bg-slate-50 flex">
        <Sidebar />
        <main className="flex-1 p-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-xl font-semibold text-slate-800">Tus fichas</h1>
              {email && <p className="text-sm text-slate-600">Hola, {email}</p>}
            </div>
            <div className="flex items-center gap-2">
              <button
                className="rounded-lg bg-sky-600 text-white px-4 py-2 hover:bg-sky-700"
                onClick={() => setOpenCreate(true)}
                aria-label="Crear nuevo cliente"
              >
                Crear nuevo cliente
              </button>
              <button
                className="rounded-lg border bg-white px-4 py-2 hover:bg-slate-50"
                onClick={logout}
              >
                Salir
              </button>
            </div>
          </div>

          {msg && <p className="mt-3 text-sm text-rose-600">{msg}</p>}

          {loading ? (
            <div className="mt-8 text-slate-600">Cargando…</div>
          ) : clients.length === 0 ? (
            <div className="mt-8 text-slate-600">Aún no hay fichas. Crea la primera.</div>
          ) : (
            <div className="mt-6 grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {clients.map((c) => (
                <button
                  key={c.id}
                  onClick={() => router.push(`/home?client=${c.id}`)}
                  className="text-left rounded-2xl border border-slate-200 bg-white p-4 hover:shadow-sm"
                  aria-label={`Abrir cliente ${c.name}`}
                >
                  <div className="font-medium text-slate-800">{c.name}</div>
                  <div className="mt-1 text-xs text-slate-500">
                    {c.tag} • {new Date(c.created_at).toLocaleDateString()}
                  </div>
                </button>
              ))}
            </div>
          )}
        </main>
      </div>
      <ModalCreateClient
        open={openCreate}
        onClose={() => setOpenCreate(false)}
        onCreate={onCreate}
      />
    </>
  );
}
