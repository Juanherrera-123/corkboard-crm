'use client';
export const dynamic = 'force-dynamic';

import React, { useCallback, useEffect, useMemo, useRef, useState, memo } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';
import { fetchTemplates, addNote, fetchNotes, deleteClient } from '@/lib/db';
import ModalText from '@/components/ModalText';
import { subscribeClientLive } from '@/lib/realtime';
import { computeRecommendations } from '@/lib/recommendations';
import { uid } from '@/lib/uid';
import { fetchClient } from '@/lib/clients';
import type { ClientRow } from '@/lib/clients';

type FieldType =
  | 'text'
  | 'number'
  | 'select'
  | 'multiselect'
  | 'currency'
  | 'note'
  | 'date';

type Field = {
  id: string;
  label: string;
  type: FieldType;
  options?: string[];
  x: number;
  y: number;
  w: number;
  h: number;
};

type Template = {
  id: string;
  name: string;
  fields: Field[];
};

type Answers = Record<string, any>;
type Note = { id: string; field_id: string; text: string; created_at?: string; created_by?: string };

const gridCols = 10;

const Badge = ({ children }: { children: React.ReactNode }) => (
  <span className="px-2 py-0.5 rounded-full text-xs bg-slate-800 text-white/90">{children}</span>
);

const FieldCard = memo(function FieldCard({
  field,
  value,
  onChange,
  notes,
  onAddNote,
}: {
  field: Field;
  value: any;
  onChange: (id: string, val: any) => void;
  notes: Note[];
  onAddNote: (fieldId: string) => void;
}) {
  const valueStr = value == null ? '' : Array.isArray(value) ? value : String(value);

  const cardStyle: React.CSSProperties = {
    gridColumn: `${field.x} / span ${field.w}`,
    gridRow: `${field.y} / span ${field.h}`,
  };

  const renderNumberLike = () => (
    <input
      type="text"
      inputMode="numeric"
      pattern="[0-9.,-]*"
      className="w-full rounded-lg border border-slate-200 bg-white/70 p-2 focus:outline-none focus:ring-2 focus:ring-sky-400"
      placeholder={field.type === 'currency' ? '$' : '0'}
      value={valueStr as string}
      onChange={(e) => onChange(field.id, e.target.value)}
    />
  );

  let Input: React.ReactNode = null;
  switch (field.type) {
    case 'text':
      Input = (
        <textarea
          className="w-full h-24 resize-none rounded-lg border border-slate-200 bg-white/70 p-2 focus:outline-none focus:ring-2 focus:ring-sky-400"
          placeholder="Escribe..."
          value={valueStr as string}
          onChange={(e) => onChange(field.id, e.target.value)}
        />
      );
      break;
    case 'number':
    case 'currency':
      Input = renderNumberLike();
      break;
    case 'date':
      Input = (
        <input
          type="date"
          className="w-full rounded-lg border border-slate-200 bg-white/70 p-2 focus:outline-none focus:ring-2 focus:ring-sky-400"
          value={valueStr as string}
          onChange={(e) => onChange(field.id, e.target.value)}
        />
      );
      break;
    case 'select':
      Input = (
        <select
          className="w-full rounded-lg border border-slate-200 bg-white/70 p-2"
          value={valueStr as string}
          onChange={(e) => onChange(field.id, e.target.value)}
        >
          <option value="">Selecciona...</option>
          {(field.options || []).map((op) => (
            <option key={op} value={op}>
              {op}
            </option>
          ))}
        </select>
      );
      break;
    case 'multiselect':
      Input = (
        <div className="flex flex-wrap gap-2">
          {(field.options || []).map((op) => {
            const set = new Set<string>(Array.isArray(value) ? value : []);
            const active = set.has(op);
            return (
              <button
                type="button"
                key={op}
                onClick={() => {
                  if (active) set.delete(op);
                  else set.add(op);
                  onChange(field.id, Array.from(set));
                }}
                className={`px-2 py-1 rounded-full border ${
                  active ? 'bg-sky-600 text-white border-sky-700' : 'bg-white/70 text-slate-800 border-slate-200'
                }`}
              >
                {op}
              </button>
            );
          })}
        </div>
      );
      break;
    case 'note':
      Input = (
        <div className="space-y-2">
          <button
            type="button"
            className="text-sm px-2 py-1 rounded-lg bg-amber-400/80 hover:bg-amber-400"
            onClick={() => onAddNote(field.id)}
          >
            Agregar nota +
          </button>
          <div className="flex flex-wrap gap-2">
            {(notes || []).map((n) => (
              <div
                key={n.id}
                className="w-36 h-28 bg-amber-200 rounded shadow rotate-[-1deg] p-2 text-[12px] overflow-hidden"
              >
                {n.text}
              </div>
            ))}
          </div>
        </div>
      );
      break;
  }

  return (
    <div
      style={cardStyle}
      className="relative rounded-2xl shadow-sm border border-slate-200 bg-white/80 backdrop-blur p-3 flex flex-col gap-2"
    >
      <div className="flex items-center justify-between">
        <div className="font-semibold text-slate-800">{field.label}</div>
        <Badge>{field.type}</Badge>
      </div>
      {Input}
    </div>
  );
});

export default function HomePage({ searchParams }: { searchParams: { client?: string } }) {
  const router = useRouter();
  // Protección de ruta: esperamos conocer la sesión antes de renderizar el dashboard
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let active = true;
    supabase.auth.getUser().then(({ data }: any) => {
      if (!active) return;
      if (!data.user) {
        router.replace('/login');
      } else {
        setReady(true);
      }
    });
    return () => {
      active = false;
    };
  }, [router]);

  useEffect(() => {
    const handler = () => {
      supabase.auth.signOut().catch(() => {});
    };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, []);

  const [templates, setTemplates] = useState<Template[]>([]);
  const [tpl, setTpl] = useState<Template | null>(null);

  const [clientId, setClientId] = useState<string>('');
  const [client, setClient] = useState<ClientRow | null>(null);

  const [answers, setAnswers] = useState<Answers>({});
  const [notes, setNotesState] = useState<Record<string, Note[]>>({});

  const [noteField, setNoteField] = useState<string | null>(null);
  const [zoom, setZoom] = useState(1);

  const [tplMenuOpen, setTplMenuOpen] = useState(false);
  const [addFieldOpen, setAddFieldOpen] = useState(false);
  const [newLabel, setNewLabel] = useState('');
  const [newType, setNewType] = useState<FieldType>('text');
  const [newOptions, setNewOptions] = useState('');
  const [recsOpen, setRecsOpen] = useState(true);

  const unsub = useRef<(() => void) | null>(null);

  useEffect(() => {
    if (searchParams?.client) setClientId(searchParams.client);
  }, [searchParams?.client]);

  useEffect(() => {
    if (!clientId) {
      setClient(null);
      return;
    }
    (async () => {
      try {
        const c = await fetchClient(clientId);
        setClient(c);
      } catch {
        setClient(null);
      }
    })();
  }, [clientId]);

  useEffect(() => {
    (async () => {
      const list = await fetchTemplates();
      setTemplates(list as any);
      if (list.length) setTpl(list[0] as any);
    })();
  }, []);

  const labelMap = useMemo(() => {
    const map: Record<string, string> = {};
    tpl?.fields.forEach((f) => {
      map[f.label.trim()] = f.id;
    });
    return map;
  }, [tpl]);

  const recommendations = useMemo(() => computeRecommendations(answers, labelMap), [answers, labelMap]);

  const updateAnswer = useCallback((id: string, val: any) => {
    setAnswers((prev) => {
      if (prev[id] === val) return prev;
      return { ...prev, [id]: val };
    });
  }, []);

  const addNoteLocalAndRemote = async (fieldId: string, text: string) => {
    if (!clientId) {
      alert('Cliente no válido');
      return;
    }
    try {
      await addNote(clientId, fieldId, text);
    } catch (err: any) {
      alert(err.message || 'Error al agregar la nota');
      return;
    }
    const list = await fetchNotes(clientId);
    const byField: Record<string, Note[]> = {};
    list.forEach((n: any) => {
      (byField[n.field_id] ||= []).push(n as any);
    });
    setNotesState(byField);
  };

  useEffect(() => {
    if (!clientId) return;

    (async () => {
      const list = await fetchNotes(clientId);
      const byField: Record<string, Note[]> = {};
      list.forEach((n: any) => {
        (byField[n.field_id] ||= []).push(n as any);
      });
      setNotesState(byField);
    })();

    const u = subscribeClientLive(
      clientId,
      () => {},
      async () => {
        const list = await fetchNotes(clientId);
        const byField: Record<string, Note[]> = {};
        list.forEach((n: any) => {
          (byField[n.field_id] ||= []).push(n as any);
        });
        setNotesState(byField);
      }
    );
    unsub.current = u;
    return () => {
      u();
      unsub.current = null;
    };
  }, [clientId]);

  const corkBg: React.CSSProperties = {
    backgroundImage:
      'radial-gradient(#c7a574 1px, transparent 1px), radial-gradient(#c7a574 1px, transparent 1px)',
    backgroundSize: '16px 16px, 16px 16px',
    backgroundPosition: '0 0, 8px 8px',
  };

  if (!ready) {
    return (
      <div className="min-h-screen grid place-items-center bg-slate-50">
        <div className="text-slate-600">Cargando…</div>
      </div>
    );
  }
  return (
    <div className="min-h-screen w-full bg-slate-100">
      <div className="sticky top-0 z-20 flex items-center justify-between p-2 bg-white/70 backdrop-blur border-b border-slate-200">
        <div className="px-3 py-1 rounded-lg border border-slate-200 bg-white text-slate-800 font-semibold">
          {client?.name}
        </div>
        <div className="flex items-center gap-2">
          <label className="text-sm text-slate-600">Zoom</label>
          <input
            type="range"
            min={0.7}
            max={1.2}
            step={0.05}
            value={zoom}
            onChange={(e) => setZoom(Number(e.target.value))}
          />
          <button
            className="px-3 py-1.5 rounded-xl border border-red-200 text-red-600 hover:bg-red-50"
            onClick={async () => {
              if (!clientId) return;
              if (confirm('¿Eliminar este cliente?')) {
                try {
                  await deleteClient(clientId);
                  router.push('/dashboard');
                } catch (err: any) {
                  alert(err.message || 'Error al eliminar el cliente');
                }
              }
            }}
          >
            Eliminar cliente
          </button>
          <button
            className="px-3 py-1.5 rounded-xl border bg-white hover:bg-slate-50"
            onClick={() => router.push('/dashboard')}
          >
            Salir
          </button>
          <div className="relative">
            <button
              className="px-3 py-1.5 rounded-xl border bg-white hover:bg-slate-50"
              onClick={() => setTplMenuOpen((o) => !o)}
            >
              Cargar plantilla
            </button>
            {tplMenuOpen && (
              <div className="absolute right-0 mt-2 w-48 bg-white border rounded-xl shadow-md z-10">
                {templates.map((t) => (
                  <button
                    key={t.id}
                    onClick={() => {
                      setTpl(t as any);
                      setTplMenuOpen(false);
                    }}
                    className="block w-full text-left px-3 py-2 hover:bg-slate-50"
                  >
                    {t.name}
                  </button>
                ))}
              </div>
            )}
          </div>
          <button
            className="px-3 py-1.5 rounded-xl bg-sky-600 text-white hover:bg-sky-700"
            onClick={() => setAddFieldOpen(true)}
          >
            Agregar pregunta
          </button>
        </div>
      </div>

      <div className="mx-auto max-w-[1400px] px-4 py-6 grid grid-cols-12 gap-4">
        <div
          className={`${recsOpen ? 'col-span-9' : 'col-span-12'} relative rounded-3xl p-4 border border-slate-200 shadow-sm transition-all duration-300`}
          style={{ ...corkBg }}
        >
          <div
            className="grid gap-3"
            style={{
              gridTemplateColumns: `repeat(${gridCols}, minmax(0, 1fr))`,
              transform: `scale(${zoom})`,
              transformOrigin: 'top left',
            }}
          >
            {tpl?.fields.map((f) => (
              <FieldCard
                key={f.id}
                field={f}
                value={answers[f.id]}
                onChange={updateAnswer}
                notes={notes[f.id] || []}
                onAddNote={(id) => setNoteField(id)}
              />
            ))}
          </div>
          <button
            onClick={() => setRecsOpen((o) => !o)}
            className="absolute top-4 -right-4 w-8 h-8 rounded-full shadow bg-white flex items-center justify-center"
          >
            {recsOpen ? '<' : '>'}
          </button>
        </div>

        {recsOpen && (
          <div className="col-span-3 transition-all duration-300">
            <div className="rounded-3xl bg-white shadow-sm border border-slate-200 p-4">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-slate-800">Recomendaciones</h3>
                <Badge>{recommendations.length}</Badge>
              </div>
              <p className="text-sm text-slate-600 mt-1">Se actualizan según tus respuestas.</p>
              <div className="mt-3 space-y-2">
                {recommendations.map((r) => (
                  <div key={r.id} className="rounded-xl border p-3 bg-slate-50">
                    <div className="flex items-center justify-between">
                      <div className="font-medium text-slate-800">{r.title}</div>
                      <Badge>+{r.score}</Badge>
                    </div>
                    <div className="text-xs text-slate-600 mt-1">{r.reason}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      <footer className="py-6 text-center text-xs text-slate-500">Corkboard CRM • Supabase</footer>

      <ModalText
        open={noteField !== null}
        title="Agregar nota"
        placeholder="Escribe la nota"
        area
        onClose={() => setNoteField(null)}
        onSubmit={async (text) => {
          if (noteField) await addNoteLocalAndRemote(noteField, text);
        }}
      />

      {addFieldOpen && (
        <div className="fixed inset-0 bg-black/50 z-50 grid place-items-center">
          <div className="bg-white rounded-xl p-4 w-80 space-y-3">
            <h2 className="text-lg font-semibold text-slate-800">Agregar pregunta</h2>
            <div className="space-y-2">
              <div className="flex flex-col gap-1">
                <label className="text-sm text-slate-600">Label</label>
                <input
                  className="rounded-lg border border-slate-200 p-2"
                  value={newLabel}
                  onChange={(e) => setNewLabel(e.target.value)}
                />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-sm text-slate-600">Tipo</label>
                <select
                  className="rounded-lg border border-slate-200 p-2"
                  value={newType}
                  onChange={(e) => setNewType(e.target.value as FieldType)}
                >
                  <option value="text">text</option>
                  <option value="number">number</option>
                  <option value="select">select</option>
                  <option value="multiselect">multiselect</option>
                  <option value="currency">currency</option>
                  <option value="date">date</option>
                  <option value="note">note</option>
                </select>
              </div>
              {(newType === 'select' || newType === 'multiselect') && (
                <div className="flex flex-col gap-1">
                  <label className="text-sm text-slate-600">Opciones (separadas por coma)</label>
                  <textarea
                    className="rounded-lg border border-slate-200 p-2"
                    value={newOptions}
                    onChange={(e) => setNewOptions(e.target.value)}
                  />
                </div>
              )}
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button
                className="px-3 py-1.5 rounded-xl border bg-white hover:bg-slate-50"
                onClick={() => setAddFieldOpen(false)}
              >
                Cancelar
              </button>
              <button
                className="px-3 py-1.5 rounded-xl bg-sky-600 text-white hover:bg-sky-700"
                onClick={() => {
                  if (!newLabel.trim() || !newType) {
                    alert('Label y tipo requeridos');
                    return;
                  }
                  const id = uid();
                  const maxY = tpl?.fields.reduce((m, f) => Math.max(m, f.y + f.h), 0) || 0;
                  const field: Field = {
                    id,
                    label: newLabel.trim(),
                    type: newType,
                    x: 1,
                    y: maxY + 1,
                    w: 3,
                    h: 2,
                    ...(newType === 'select' || newType === 'multiselect'
                      ? { options: newOptions.split(',').map((s) => s.trim()).filter(Boolean) }
                      : {}),
                  };
                  setTpl((prev) => (prev ? { ...prev, fields: [...prev.fields, field] } : prev));
                  setAddFieldOpen(false);
                  setNewLabel('');
                  setNewType('text');
                  setNewOptions('');
                }}
              >
                Guardar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
