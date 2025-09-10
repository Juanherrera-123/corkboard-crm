'use client';
import { useState } from 'react';

export default function ModalCreateClient({
  open,
  onClose,
  onCreate,
}: {
  open: boolean;
  onClose: () => void;
  onCreate: (name: string, tag: string) => Promise<void> | void;
}) {
  const [name, setName] = useState('');
  const [tag, setTag] = useState<'Lead' | 'MQL' | 'SQL' | 'Won' | 'Lost'>('Lead');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  if (!open) return null;

  async function submit() {
    setBusy(true);
    setErr(null);
    try {
      await onCreate(name.trim() || 'Sin nombre', tag);
      onClose();
      setName('');
    } catch (e: any) {
      setErr(e?.message ?? 'No se pudo crear el cliente');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-slate-900/40" onClick={onClose} />
      <div className="relative w-full max-w-md rounded-2xl bg-white p-5 shadow-lg border border-slate-200">
        <h3 className="text-lg font-semibold text-slate-800">Crear nuevo cliente</h3>
        <div className="mt-4 space-y-3">
          <div>
            <label className="text-sm text-slate-600">Nombre</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-sky-400"
              placeholder="Ej: Juan Pérez"
            />
          </div>
          <div>
            <label className="text-sm text-slate-600">Estado</label>
            <select
              value={tag}
              onChange={(e) => setTag(e.target.value as any)}
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-sky-400"
            >
              {['Lead', 'MQL', 'SQL', 'Won', 'Lost'].map((t) => (
                <option key={t}>{t}</option>
              ))}
            </select>
          </div>
          {err && <p className="text-sm text-rose-600">{err}</p>}
        </div>
        <div className="mt-5 flex justify-end gap-2">
          <button className="px-3 py-2 rounded-lg border hover:bg-slate-50" onClick={onClose}>
            Cancelar
          </button>
          <button
            onClick={submit}
            disabled={busy}
            className="px-3 py-2 rounded-lg bg-sky-600 text-white hover:bg-sky-700 disabled:opacity-60"
          >
            {busy ? 'Creando…' : 'Crear'}
          </button>
        </div>
      </div>
    </div>
  );
}

