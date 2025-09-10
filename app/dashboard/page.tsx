'use client';

import { useEffect, useState, useCallback } from 'react';
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
  const [orgId, setOrgId] = useState<string | null>(null);
  const [openCreate, setOpenCreate] = useState(false);

  const loadClients = useCallback(async (oId: string) => {
    try {
      const rows = await fetchClients({ orgId: oId });
      setClients(rows);
      setMsg(null);
    } catch (e: any) {
      setMsg(e?.message ?? 'No se pudieron cargar las fichas');
    } finally {
      setLoading(false);
    }
  }, []);

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
        setOrgId(org_id);
        await ensureDefaultTemplates(org_id);
        await loadClients(org_id);
      } catch (e: any) {
        setMsg(e?.message ?? 'No se pudieron cargar las fichas');
        setLoading(false);
      }
    })();
  }, [router, loadClients]);

  async function onRetry() {
    if (!orgId) return;
    setMsg(null);
    setLoading(true);
    await loadClients(orgId);
  }

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

          {msg && (
            <div className="mt-3 rounded-lg border border-rose-200 bg-rose-50 p-4 text-rose-700">
              <p className="text-sm">{msg}</p>
              <button
                className="mt-3 rounded bg-rose-600 px-3 py-1 text-sm text-white hover:bg-rose-700"
                onClick={onRetry}
              >
                Reintentar
              </button>
            </div>
          )}

          {loading ? (
            <ClientsSkeleton />
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

function ClientsSkeleton() {
  return (
    <div className="mt-6 grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {[...Array(4)].map((_, i) => (
        <div
          key={i}
          className="rounded-2xl border border-slate-200 bg-white p-4 animate-pulse"
        >
          <div className="h-4 w-3/4 rounded bg-slate-200" />
          <div className="mt-2 h-3 w-1/2 rounded bg-slate-200" />
        </div>
      ))}
    </div>
  );
}
