'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';
import Sidebar from '@/components/Sidebar';
import { fetchScripts, createScript, updateScript } from '@/lib/db';
import type { Script } from '@/lib/types';

export default function ScriptsPage() {
  const router = useRouter();
  const [ready, setReady] = useState(false);
  const [scripts, setScripts] = useState<Script[]>([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [step, setStep] = useState<1 | 2>(1);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    (async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session) {
        router.replace('/login');
        return;
      }
      const list = await fetchScripts();
      if (!active) return;
      setScripts(list);
      setReady(true);
    })();
    return () => {
      active = false;
    };
  }, [router]);

  function openCreate() {
    setEditingId(null);
    setTitle('');
    setContent('');
    setStep(1);
    setModalOpen(true);
  }

  function openEdit(s: Script) {
    setEditingId(s.id);
    setTitle(s.title);
    setContent(s.content);
    setStep(2);
    setModalOpen(true);
  }

  async function save() {
    if (editingId) {
      await updateScript(editingId, title.trim() || 'Sin título', content);
      setScripts((prev) =>
        prev.map((s) =>
          s.id === editingId
            ? { ...s, title: title.trim() || 'Sin título', content }
            : s,
        ),
      );
    } else {
      const inserted = await createScript(title.trim() || 'Sin título', content);
      setScripts((prev) => [inserted, ...prev]);
    }
    setModalOpen(false);
  }

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
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-semibold text-slate-800">Guiones</h1>
          <button
            className="px-3 py-1.5 rounded-xl bg-sky-600 text-white hover:bg-sky-700"
            onClick={openCreate}
          >
            Crear Guion
          </button>
        </div>
        {scripts.length === 0 ? (
          <p className="mt-4 text-slate-600">Aún no hay guiones.</p>
        ) : (
          <div className="mt-6 grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {scripts.map((s) => (
              <div key={s.id} className="rounded-2xl border border-slate-200 bg-white p-4">
                <div className="font-medium text-slate-800 truncate">{s.title}</div>
                <button
                  className="mt-3 text-sm text-sky-700 hover:underline"
                  onClick={() => openEdit(s)}
                >
                  Editar
                </button>
              </div>
            ))}
          </div>
        )}
      </main>

      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-slate-900/40" onClick={() => setModalOpen(false)} />
          <div className="relative w-full max-w-lg rounded-2xl bg-white p-5 shadow-lg border border-slate-200">
            {step === 1 ? (
              <>
                <h3 className="text-lg font-semibold text-slate-800">Nuevo guion</h3>
                <div className="mt-4">
                  <label className="text-sm text-slate-600">Nombre</label>
                  <input
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-sky-400"
                  />
                </div>
                <div className="mt-5 flex justify-end gap-2">
                  <button
                    className="px-3 py-1.5 rounded-xl border bg-white hover:bg-slate-50"
                    onClick={() => setModalOpen(false)}
                  >
                    Cancelar
                  </button>
                  <button
                    className="px-3 py-1.5 rounded-xl bg-sky-600 text-white hover:bg-sky-700 disabled:opacity-60"
                    onClick={() => setStep(2)}
                    disabled={!title.trim()}
                    >
                      Continuar
                    </button>
                </div>
              </>
            ) : (
              <>
                <h3 className="text-lg font-semibold text-slate-800">
                  {editingId ? 'Editar guion' : 'Nuevo guion'}
                </h3>
                <div className="mt-4 space-y-3">
                  <div>
                    <label className="text-sm text-slate-600">Nombre</label>
                    <input
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-sky-400"
                    />
                  </div>
                  <div>
                    <label className="text-sm text-slate-600">Texto</label>
                    <textarea
                      value={content}
                      onChange={(e) => setContent(e.target.value)}
                      className="mt-1 w-full h-64 rounded-lg border border-slate-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-sky-400"
                      placeholder="Escribe el guion completo"
                    />
                  </div>
                </div>
                <div className="mt-5 flex justify-end gap-2">
                  <button
                    className="px-3 py-1.5 rounded-xl border bg-white hover:bg-slate-50"
                    onClick={() => setModalOpen(false)}
                  >
                    Cancelar
                  </button>
                  <button
                    className="px-3 py-1.5 rounded-xl bg-sky-600 text-white hover:bg-sky-700"
                    onClick={save}
                  >
                    Guardar
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

