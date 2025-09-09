'use client';
export const dynamic = 'force-dynamic';

import React, { useCallback, useEffect, useMemo, useRef, useState, memo } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';
import {
  fetchTemplates,
  addNote,
  fetchNotes,
  deleteClient,
  saveClientRecord,
  fetchLatestRecord,
  hideFieldForClient,
  fetchClientFieldOverrides,
  upsertClientFieldLayout,
} from '@/lib/db';
import ModalText from '@/components/ModalText';
import QuestionModal from '@/components/QuestionModal';
import { subscribeClientLive } from '@/lib/realtime';
import { computeRecommendations } from '@/lib/recommendations';
import { fetchClient } from '@/lib/clients';
import type { ClientRow } from '@/lib/clients';
import DropdownMenu from '@/components/DropdownMenu';
import GridLayout, { WidthProvider, type Layout } from 'react-grid-layout';
import 'react-grid-layout/css/styles.css';
import 'react-resizable/css/styles.css';

const ReactGridLayout = WidthProvider(GridLayout);

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

const sortTplFields = (tpl: Template): Template => ({
  ...tpl,
  fields: tpl.fields.slice().sort((a, b) => a.y - b.y),
});

const Badge = ({ children }: { children: React.ReactNode }) => (
  <span className="px-2 py-0.5 rounded-full text-xs bg-slate-800 text-white/90">{children}</span>
);

const GripIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" {...props}>
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M8 6h.01M8 12h.01M8 18h.01M16 6h.01M16 12h.01M16 18h.01"
    />
  </svg>
);

const FieldCard = memo(function FieldCard({
  field,
  value,
  onChange,
  notes,
  onAddNote,
  editLayout,
  onHide,
  onEdit,
}: {
  field: Field;
  value: any;
  onChange: (id: string, val: any) => void;
  notes: Note[];
  onAddNote: (fieldId: string) => void;
  editLayout: boolean;
  onHide: () => void;
  onEdit: (field: Field) => void;
}) {
  const valueStr = value == null ? '' : Array.isArray(value) ? value : String(value);

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
    <div className="relative h-full rounded-2xl shadow-sm border border-slate-200 bg-white/80 backdrop-blur p-3 flex flex-col gap-2">
      {editLayout && (
        <div className="absolute -left-4 top-2">
          <DropdownMenu
            trigger={
              <button className="drag-handle p-1 text-slate-400 hover:text-slate-600 cursor-grab">
                <GripIcon className="w-4 h-4" />
              </button>
            }
          >
            <button
              className="block w-full text-left px-3 py-2 text-sm hover:bg-slate-100"
              onClick={onHide}
            >
              Ocultar en esta ficha
            </button>
          </DropdownMenu>
        </div>
      )}
      <div className="flex items-center justify-between">
        <div className="font-semibold text-slate-800">{field.label}</div>
        <div className="flex items-center gap-1">
          <Badge>{field.type}</Badge>
          <button
            type="button"
            onClick={() => onEdit(field)}
            className="text-xs text-slate-500 hover:text-slate-800"
          >
            ✎
          </button>
        </div>
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


  const [templates, setTemplates] = useState<Template[]>([]);
  const [tpl, setTpl] = useState<Template | null>(null);

  const [clientId, setClientId] = useState<string>('');
  const [client, setClient] = useState<ClientRow | null>(null);

  const [answers, setAnswers] = useState<Answers>({});
  const [notes, setNotesState] = useState<Record<string, Note[]>>({});
  const lastSavedRef = useRef('');
  const [saving, setSaving] = useState(false);
  const [autoMsg, setAutoMsg] = useState('');
  const latestAnswers = useRef<Answers>({});
  useEffect(() => {
    latestAnswers.current = answers;
  }, [answers]);

  const [noteField, setNoteField] = useState<string | null>(null);
  const [zoom, setZoom] = useState(1);
  const [editLayout, setEditLayout] = useState(false);
  const [hiddenFields, setHiddenFields] = useState<string[]>([]);
  const visibleFields = useMemo(
    () => tpl?.fields.filter((f) => !hiddenFields.includes(f.id)) || [],
    [tpl?.fields, hiddenFields],
  );
  const layout = useMemo(
    () => visibleFields.map((f) => ({ i: f.id, x: f.x, y: f.y, w: f.w, h: f.h })),
    [visibleFields],
  );

  const [tplMenuOpen, setTplMenuOpen] = useState(false);
  const [questionModalOpen, setQuestionModalOpen] = useState(false);
  const [editingField, setEditingField] = useState<Field | null>(null);
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
      const sorted = (list as any).map((t: any) => sortTplFields(t));
      setTemplates(sorted as any);
      if (sorted.length) {
        setTpl(sorted[0] as any);
      }
    })();
  }, []);

  useEffect(() => {
    if (!clientId) return;
    (async () => {
      try {
        const rec = await fetchLatestRecord(clientId);
        if (rec?.answers) {
          setAnswers(rec.answers);
          lastSavedRef.current = JSON.stringify(rec.answers);
        }
        if (rec?.template_id) {
          const t = templates.find((t) => t.id === rec.template_id);
          if (t) {
            setTpl(sortTplFields(t as any));
          }
        }
      } catch (err) {
        console.error(err);
      }
    })();
  }, [clientId, templates]);

  useEffect(() => {
    if (!clientId || !tpl?.id) return;
    (async () => {
      try {
        const overrides = await fetchClientFieldOverrides(clientId);
        setHiddenFields(overrides.filter((o: any) => o.hidden).map((o: any) => o.field_id));
        if (overrides.length) {
          setTpl((prev) =>
            prev
              ? {
                  ...prev,
                  fields: prev.fields.map((f) => {
                    const ov = overrides.find((o: any) => o.field_id === f.id);
                    return ov
                      ? {
                          ...f,
                          x: ov.x ?? f.x,
                          y: ov.y ?? f.y,
                          w: ov.w ?? f.w,
                          h: ov.h ?? f.h,
                        }
                      : f;
                  }),
                }
              : prev,
          );
        }
      } catch (err) {
        console.error(err);
      }
    })();
  }, [clientId, tpl?.id]);

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
  const handleHideField = useCallback(
    async (fieldId: string) => {
      if (!clientId) return;
      try {
        await hideFieldForClient(clientId, fieldId);
        setHiddenFields((prev) => [...prev, fieldId]);
      } catch (err: any) {
        alert(err.message || 'Error al ocultar el campo');
      }
    },
    [clientId]
  );
  const save = useCallback(
    async (force = false) => {
      if (!clientId || !tpl) return;
      const current = JSON.stringify(answers);
      if (!force && current === lastSavedRef.current) return;
      setSaving(true);
      console.debug('Saving...', {
        tplId: tpl?.id,
        fieldsCount: tpl?.fields.length,
        answersKeys: Object.keys(answers).length,
      });
      try {
        const recs = computeRecommendations(answers, labelMap);
        const score = recs.reduce((s, r) => s + r.score, 0);
        await saveClientRecord(clientId, tpl.id, answers, score, recs, tpl.fields);
        lastSavedRef.current = current;
        setAutoMsg('Guardado');
      } catch (err: any) {
        console.error('save error', err);
        setAutoMsg(err.message || 'Error al guardar');
        throw err;
      } finally {
        setSaving(false);
      }
    },
    [clientId, tpl, answers, labelMap]
  );

  const onSaveClick = useCallback(async () => {
    try {
      await save(true);
      alert('Guardado');
    } catch (e: any) {
      alert(`Error al guardar: ${e.message}`);
    }
  }, [save]);

  const handleLayoutChange = useCallback((layout: Layout[]) => {
    setTpl((prev) => {
      if (!prev) return prev;
      const map = Object.fromEntries(layout.map((l) => [l.i, l]));
      const newFields = prev.fields.map((f) => {
        const l = map[f.id];
        return l ? { ...f, x: l.x, y: l.y, w: l.w, h: l.h } : f;
      });
      return { ...prev, fields: newFields };
    });
  }, []);

  const commitLayout = useCallback(
    async (_: Layout[], __: Layout, item: Layout) => {
      if (!clientId) return;
      try {
        await upsertClientFieldLayout(clientId, item.i, item.x, item.y, item.w, item.h);
      } catch (err) {
        console.error(err);
      }
    },
    [clientId],
  );

  useEffect(() => {
    if (!clientId || !tpl?.id) return;
    const h = setTimeout(async () => {
      const current = JSON.stringify(latestAnswers.current);
      if (current === lastSavedRef.current) return;
      try {
        await save();
        setAutoMsg('Guardado automático');
      } catch (e) {
        console.warn('Autosave error', e);
        setAutoMsg('No se pudo auto-guardar');
      }
    }, 700);
    return () => clearTimeout(h);
  }, [answers, clientId, tpl?.id, save]);

  useEffect(() => {
    const handler = () => {
      save(true).catch(() => {});
      supabase.auth.signOut().catch(() => {});
    };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [save]);

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
      async () => {
        try {
          const rec = await fetchLatestRecord(clientId);
          if (rec?.answers) {
            setAnswers(rec.answers);
            lastSavedRef.current = JSON.stringify(rec.answers);
          }
        } catch (err) {
          console.error(err);
        }
      },
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
            className={`px-3 py-1.5 rounded-xl border ${
              editLayout ? 'bg-sky-600 text-white hover:bg-sky-700' : 'bg-white hover:bg-slate-50'
            }`}
            onClick={() => setEditLayout((o) => !o)}
          >
            {editLayout ? 'Listo' : 'Editar layout'}
          </button>
          <button
            className="px-3 py-1.5 rounded-xl bg-sky-600 text-white hover:bg-sky-700 disabled:opacity-60"
            onClick={onSaveClick}
            disabled={!clientId || !tpl?.id || saving}
          >
            {saving ? 'Guardando…' : 'Guardar ficha'}
          </button>
          {autoMsg && <span className="text-sm text-slate-600">{autoMsg}</span>}
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
            onClick={async () => {
              await save(true);
              router.push('/dashboard');
            }}
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
                      setTpl(sortTplFields(t as any));
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
            onClick={() => {
              setEditingField(null);
              setQuestionModalOpen(true);
            }}
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
            style={
              editLayout
                ? undefined
                : {
                    transform: `scale(${zoom})`,
                    transformOrigin: 'top left',
                  }
            }
          >
            <ReactGridLayout
              layout={layout}
              cols={gridCols}
              rowHeight={80}
              isDraggable={editLayout}
              isResizable={editLayout}
              onLayoutChange={handleLayoutChange}
              onDragStop={commitLayout}
              onResizeStop={commitLayout}
              draggableHandle=".drag-handle"
              compactType={null}
              margin={[12, 12]}
            >
              {visibleFields.map((f) => (
                <div key={f.id}>
                  <FieldCard
                    field={f}
                    value={answers[f.id]}
                    onChange={updateAnswer}
                    notes={notes[f.id] || []}
                    onAddNote={(id) => setNoteField(id)}
                    editLayout={editLayout}
                    onHide={() => handleHideField(f.id)}
                    onEdit={setEditingField}
                  />
                </div>
              ))}
            </ReactGridLayout>
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

      <QuestionModal
        open={questionModalOpen}
        field={editingField}
        onClose={() => {
          setQuestionModalOpen(false);
          setEditingField(null);
        }}
        onSubmit={(data) => {
          if (editingField) {
            setTpl((prev) =>
              prev
                ? {
                    ...prev,
                    fields: prev.fields.map((f) =>
                      f.id === data.id
                        ? {
                            ...f,
                            label: data.label,
                            type: data.type,
                            ...(data.options
                              ? { options: data.options }
                              : { options: undefined }),
                          }
                        : f
                    ),
                  }
                : prev
            );
          } else {
            const maxY = tpl?.fields.reduce(
              (m, f) => Math.max(m, f.y + f.h),
              0
            ) || 0;
            const field: Field = {
              ...data,
              x: 1,
              y: maxY + 1,
              w: 3,
              h: 2,
            };
            setTpl((prev) =>
              prev ? { ...prev, fields: [...prev.fields, field] } : prev
            );
          }
          setQuestionModalOpen(false);
          setEditingField(null);
        }}
      />
    </div>
  );
}
