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
  fetchTemplate,
  fetchLastClientRecord,
  hideFieldForClient,
  fetchClientLayoutOverrides,
  saveClientLayoutOverrides,
  type LayoutOverride,
  getMyProfile,
  fetchScriptsForOrg,
} from '@/lib/db';
import ModalText from '@/components/ModalText';
import QuestionModal from '@/components/QuestionModal';
import ModalAlert from '@/components/ModalAlert';
import ConfidenceBadge from '@/components/ConfidenceBadge';
import ConfidenceCard from '@/components/ConfidenceCard';
import { subscribeClientLive } from '@/lib/realtime';
import { computeRecommendations } from '@/lib/recommendations';
import { fetchClient, updateClientName } from '@/lib/clients';
import type { ClientRow } from '@/lib/clients';
import GridLayout, { WidthProvider, type Layout } from 'react-grid-layout';
import 'react-grid-layout/css/styles.css';
import 'react-resizable/css/styles.css';
import type { ResizeHandleAxis } from 'react-resizable';
import {
  gridCols,
  DEFAULT_W,
  DEFAULT_H,
  minW,
  maxW,
  minH,
  maxH,
  normalizeLayout,
} from '@/lib/layout';
import { mergeAnswers } from '@/lib/answers';
import { normalizeTemplate, type Script } from '@/lib/types';

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
  order: number;
  /** Width in grid columns. Defaults to DEFAULT_W. */
  w?: number;
  /** Height in grid rows. Defaults to DEFAULT_H. */
  h?: number;
};

type Template = {
  id: string;
  name: string;
  fields: Field[];
};

type Answers = Record<string, any>;
type Note = { id: string; field_id: string; text: string; created_at?: string; created_by?: string };

const sortTplFields = (tpl: Template): Template => ({
  ...tpl,
  fields: tpl.fields.slice().sort((a, b) => a.order - b.order),
});

function debounce<T extends (...args: any[]) => void>(fn: T, delay: number) {
  let t: ReturnType<typeof setTimeout> | null;
  return (...args: Parameters<T>) => {
    if (t) clearTimeout(t);
    t = setTimeout(() => fn(...args), delay);
  };
}


const Badge = ({ children }: { children: React.ReactNode }) => (
  <span className="px-2 py-0.5 rounded-full text-xs bg-slate-800 text-white/90">{children}</span>
);

const XIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" {...props}>
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M6 18L18 6M6 6l12 12"
    />
  </svg>
);

const Spinner = () => (
  <div
    className="h-8 w-8 animate-spin rounded-full border-4 border-slate-300 border-t-transparent"
    aria-label="Cargando"
  />
);

const FieldCard = memo(function FieldCard({
  field,
  value,
  onChange,
  notes,
  onAddNote,
  editLayout,
  onDelete,
  onEdit,
  disabled,
}: {
  field: Field;
  value: any;
  onChange: (id: string, val: any) => void;
  notes: Note[];
  onAddNote: (fieldId: string) => void;
  editLayout: boolean;
  onDelete: () => void;
  onEdit: (field: Field) => void;
  disabled?: boolean;
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
      disabled={disabled}
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
          disabled={disabled}
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
          disabled={disabled}
        />
      );
      break;
    case 'select':
      Input = (
        <select
          className="w-full rounded-lg border border-slate-200 bg-white/70 p-2"
          value={valueStr as string}
          onChange={(e) => onChange(field.id, e.target.value)}
          disabled={disabled}
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
                disabled={disabled}
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
            disabled={disabled}
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
        <>
          <div className="absolute -left-4 top-2 flex flex-col gap-1">
            <button
              className="p-1 text-rose-600 hover:text-rose-700"
              onClick={onDelete}
              disabled={disabled}
            >
              <XIcon className="w-4 h-4" />
            </button>
            <button
              className="drag-handle group p-1 cursor-grab"
              disabled={disabled}
              aria-label="Mover campo"
            >
              <span className="block w-3 h-3 rounded-full bg-slate-400 group-hover:bg-slate-600" />
            </button>
          </div>
        </>
      )}
      <div className="flex items-center justify-between">
        <div className="font-semibold text-slate-800">{field.label}</div>
        <div className="flex items-center gap-1">
          <Badge>{field.type}</Badge>
          <button
            type="button"
            onClick={() => onEdit(field)}
            className="text-xs text-slate-500 hover:text-slate-800"
            disabled={disabled}
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
  const [scripts, setScripts] = useState<Script[]>([]);
  const [selectedScriptId, setSelectedScriptId] = useState<string | null>(null);
  const [scriptsLoading, setScriptsLoading] = useState(false);
  const [scriptsError, setScriptsError] = useState<string | null>(null);

  // Initialize clientId from the query string to avoid extra renders
  const clientId = searchParams?.client || '';
  const [client, setClient] = useState<ClientRow | null>(null);

  const [loading, setLoading] = useState(false);
  const [isSwitching, setIsSwitching] = useState(false);
  const [tplLoading, setTplLoading] = useState(false);
  const [tplError, setTplError] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [answers, setAnswers] = useState<Answers>({});
  const [notes, setNotesState] = useState<Record<string, Note[]>>({});
  const lastSavedRef = useRef('');
  const [saving, setSaving] = useState(false);
  const [autoMsg, setAutoMsg] = useState('');
  const [alertMsg, setAlertMsg] = useState<string | null>(null);
  const latestAnswers = useRef<Answers>({});
  useEffect(() => {
    latestAnswers.current = answers;
  }, [answers]);

  const mounted = useRef(true);
  useEffect(() => {
    return () => {
      mounted.current = false;
    };
  }, []);

  const [noteField, setNoteField] = useState<string | null>(null);
  const handleRename = useCallback(async () => {
    if (!client) return;
    // eslint-disable-next-line no-alert
    const newName = prompt('Nuevo nombre del cliente', client.name);
    if (!newName || newName.trim() === '' || newName === client.name) return;
    try {
      const updated = await updateClientName(client.id, newName.trim());
      setClient(updated);
    } catch (e: any) {
      setAlertMsg(e.message || 'No se pudo renombrar el cliente');
    }
  }, [client]);
  const [zoom, setZoom] = useState(1);
  const [editLayout, setEditLayout] = useState(false);
  const [hiddenFields, setHiddenFields] = useState<string[]>([]);
  // Preference for grid compaction. Set to `null` to disable and skip normalization.
  const [compactType] = useState<'vertical' | null>('vertical');
  const visibleFields = useMemo(
    () => tpl?.fields.filter((f) => !hiddenFields.includes(f.id)) || [],
    [tpl?.fields, hiddenFields],
  );
  const layout = useMemo(
    () =>
      visibleFields.map((f) => ({
        i: f.id,
        x: f.x,
        y: f.y,
        w: f.w ?? DEFAULT_W,
        h: f.h ?? DEFAULT_H,
        minW,
        maxW,
        minH,
        maxH,
      })),
    [visibleFields],
  );

  const [tplMenuOpen, setTplMenuOpen] = useState(false);
  const [questionModalOpen, setQuestionModalOpen] = useState(false);
  const [editingField, setEditingField] = useState<Field | null>(null);
  const [recsOpen, setRecsOpen] = useState(true);
  const [confidenceScore, setConfidenceScore] = useState(50);
  const [confidenceNote, setConfidenceNote] = useState('');

  const [layoutSaved, setLayoutSaved] = useState(false);
  const layoutSaveRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const saveClientLayoutDebounced = useCallback(
    (layout: Layout[]) => {
      if (!clientId) return;
      if (layoutSaveRef.current) clearTimeout(layoutSaveRef.current);
      layoutSaveRef.current = setTimeout(async () => {
        try {
          const sorted = layout
            .slice()
            .sort((a, b) => (a.y - b.y) || (a.x - b.x));
          const map: Record<string, LayoutOverride> = {};
          sorted.forEach((l, idx) => {
            map[l.i] = { x: l.x, y: l.y, w: l.w, h: l.h, order: idx };
          });
          await saveClientLayoutOverrides(clientId, map);
          setLayoutSaved(true);
        } catch (err) {
          console.error(err);
        }
      }, 500);
    },
    [clientId],
  );

  useEffect(() => {
    if (!layoutSaved) return;
    const t = setTimeout(() => setLayoutSaved(false), 2000);
    return () => clearTimeout(t);
  }, [layoutSaved]);

  const unsub = useRef<(() => void) | null>(null);

  const subscribeClient = useCallback(() => {
    if (!clientId) return;

    const refetchRecord = debounce(async () => {
      try {
        const rec = await fetchLatestRecord(clientId);
        if (rec?.answers) {
          setAnswers(rec.answers);
          lastSavedRef.current = JSON.stringify(rec.answers);
        }
      } catch (err) {
        console.error(err);
      }
    }, 500);

    const refetchNotes = debounce(async () => {
      const list = await fetchNotes(clientId);
      const byField: Record<string, Note[]> = {};
      list.forEach((n: any) => {
        (byField[n.field_id] ||= []).push(n as any);
      });
      setNotesState(byField);
    }, 500);

    unsub.current?.();

    const u = subscribeClientLive(
      clientId,
      (payload) => {
        const rec = payload.new;
        if (rec?.answers) {
          setAnswers(rec.answers);
          lastSavedRef.current = JSON.stringify(rec.answers);
        } else {
          refetchRecord();
        }
      },
      (payload) => {
        const { eventType, new: newNote, old: oldNote } = payload;
        const note = (newNote || oldNote) as Note | null;
        if (note && note.field_id) {
          setNotesState((prev) => {
            const copy = { ...prev };
            const arr = copy[note.field_id] ? [...copy[note.field_id]] : [];
            const idx = arr.findIndex((n) => n.id === note.id);
            if (eventType === 'DELETE') {
              if (idx !== -1) arr.splice(idx, 1);
            } else {
              if (idx !== -1) arr[idx] = note;
              else arr.push(note);
            }
            copy[note.field_id] = arr;
            return copy;
          });
        } else {
          refetchNotes();
        }
      }
    );
    unsub.current = u;
  }, [clientId]);

  const loadAll = useCallback(async () => {
    if (!clientId) {
      if (mounted.current) setClient(null);
      setConfidenceScore(50);
      setConfidenceNote('');
      return;
    }
    if (!mounted.current) return;
    setLoading(true);
    setError(null);
    try {
      const [c, list, rec, overrides, notesList] = await Promise.all([
        fetchClient(clientId),
        fetchTemplates(),
        fetchLatestRecord(clientId),
        fetchClientLayoutOverrides(clientId),
        fetchNotes(clientId),
      ]);

      if (!mounted.current) return;
      setClient(c);
      setConfidenceScore(c?.confidence_score ?? 50);
      setConfidenceNote(c?.confidence_note ?? '');

      const sorted: Template[] = (list as Template[]).map((t) =>
        sortTplFields(normalizeTemplate(t)),
      );
      setTemplates(sorted);

      let chosen: Template | null = sorted.length ? sorted[0] : null;
      if (rec?.template_id) {
        const t = sorted.find((tpl) => tpl.id === rec.template_id);
        if (t) chosen = t;
      }

      if (rec?.answers) {
        setAnswers(rec.answers);
        lastSavedRef.current = JSON.stringify(rec.answers);
      } else {
        setAnswers({});
        lastSavedRef.current = '';
      }

      setHiddenFields(
        Object.entries(overrides)
          .filter(([, ov]) => ov.hidden)
          .map(([fid]) => fid),
      );

      if (chosen) {
        const normalizedChosen = normalizeTemplate(chosen as any);
        const mergedFields = normalizedChosen.fields
          .map((f) => {
            const ov = overrides[f.id];
            return ov
              ? {
                  ...f,
                  order: ov.order ?? f.order,
                  x: ov.x ?? f.x,
                  y: ov.y ?? f.y,
                  w: ov.w ?? f.w,
                  h: ov.h ?? f.h,
                }
              : f;
          })
          .sort((a, b) => {
            const ao = a.order ?? 0;
            const bo = b.order ?? 0;
            if (ao !== bo) return ao - bo;
            const ay = a.y ?? 0;
            const by = b.y ?? 0;
            if (ay !== by) return ay - by;
            const ax = a.x ?? 0;
            const bx = b.x ?? 0;
            return ax - bx;
          });
        setTpl({ ...normalizedChosen, fields: mergedFields });
      }

      const byField: Record<string, Note[]> = {};
      (notesList as any).forEach((n: any) => {
        (byField[n.field_id] ||= []).push(n as any);
      });
      setNotesState(byField);
    } catch (err: any) {
      console.error(err);
      if (mounted.current) setError(err.message || 'Error al cargar los datos');
    } finally {
      if (mounted.current) setLoading(false);
    }
  }, [clientId]);

  const loadScripts = useCallback(async () => {
    setScriptsLoading(true);
    setScriptsError(null);
    try {
      const { org_id } = await getMyProfile();
      const list = await fetchScriptsForOrg(org_id);
      setScripts(list);
    } catch (err) {
      console.error(err);
      setScriptsError('No se pudieron cargar los guiones.');
    } finally {
      setScriptsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadScripts();
  }, [loadScripts]);

  useEffect(() => {
    if (!clientId) {
      setSelectedScriptId(null);
      return;
    }
    const stored = localStorage.getItem(`scriptSel:${clientId}`);
    if (stored && scripts.some((s) => s.id === stored)) {
      setSelectedScriptId(stored);
    } else {
      setSelectedScriptId(null);
    }
  }, [clientId, scripts]);

  const selectedScript = useMemo(
    () => scripts.find((s) => s.id === selectedScriptId) || null,
    [scripts, selectedScriptId],
  );

  const handleScriptChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value;
    setSelectedScriptId(val || null);
    if (clientId) {
      if (val) localStorage.setItem(`scriptSel:${clientId}`, val);
      else localStorage.removeItem(`scriptSel:${clientId}`);
    }
  };

  const onSelectTemplate = useCallback(
    async (tplId: string) => {
      if (!clientId || !mounted.current) return;
      console.debug('switchTemplate start', { clientId, tplId });
      setIsSwitching(true);
      setTplLoading(true);
      setTplError(null);
      unsub.current?.();
      unsub.current = null;
      if (layoutSaveRef.current) {
        clearTimeout(layoutSaveRef.current);
        layoutSaveRef.current = null;
      }
      try {
        const [tplData, record] = await Promise.all([
          fetchTemplate(tplId),
          fetchLastClientRecord(clientId, tplId),
        ]);
        if (!mounted.current) return;
        const sorted = sortTplFields(normalizeTemplate(tplData as any));
        console.debug('switchTemplate success', {
          clientId,
          tplId,
          fieldsCount: sorted.fields.length,
        });
        setTpl(sorted);
        setTemplates((prev) =>
          prev.map((t) => (t.id === sorted.id ? sorted : t)),
        );
        const merged = mergeAnswers(
          record?.answers || {},
          latestAnswers.current,
          sorted.fields,
        );
        setAnswers(merged);
        lastSavedRef.current = record?.answers
          ? JSON.stringify(record.answers)
          : '';
        subscribeClient();
        setTplMenuOpen(false);
        setAutoMsg('Plantilla cargada');
      } catch (err: any) {
        console.error(err);
        if (mounted.current) setTplError(err.message || 'Error al cargar plantilla');
      } finally {
        if (mounted.current) setTplLoading(false);
        if (mounted.current) setIsSwitching(false);
        console.debug('switchTemplate end', { clientId, tplId });
      }
    },
    [clientId, subscribeClient],
  );

  useEffect(() => {
    if (ready) {
      loadAll();
    }
  }, [ready, loadAll]);

  useEffect(() => {
    if (loading || !clientId || !tpl?.id) return;
    (async () => {
      try {
        const overrides = await fetchClientLayoutOverrides(clientId);
        setHiddenFields(
          Object.entries(overrides)
            .filter(([, ov]) => ov.hidden)
            .map(([fid]) => fid),
        );
        if (Object.keys(overrides).length) {
          setTpl((prev) =>
            prev
              ? {
                  ...prev,
                  fields: prev.fields
                    .map((f) => {
                      const ov = overrides[f.id];
                      return ov
                        ? {
                            ...f,
                            order: ov.order ?? f.order,
                            x: ov.x ?? f.x,
                            y: ov.y ?? f.y,
                            w: ov.w ?? f.w,
                            h: ov.h ?? f.h,
                          }
                        : f;
                    })
                    .sort((a, b) => {
                      const ao = a.order ?? 0;
                      const bo = b.order ?? 0;
                      if (ao !== bo) return ao - bo;
                      const ay = a.y ?? 0;
                      const by = b.y ?? 0;
                      if (ay !== by) return ay - by;
                      const ax = a.x ?? 0;
                      const bx = b.x ?? 0;
                      return ax - bx;
                    }),
                }
              : prev,
          );
        }
      } catch (err) {
        console.error(err);
      }
    })();
  }, [clientId, tpl?.id, loading]);

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
        setAlertMsg(err.message || 'Error al ocultar el campo');
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
      setAlertMsg('Guardado');
    } catch (e: any) {
      setAlertMsg(`Error al guardar: ${e.message}`);
    }
  }, [save]);

  const applyLayoutChanges = useCallback(
    (layout: Layout[]) => {
      const normalized = compactType ? normalizeLayout(layout, gridCols) : layout;
      setTpl((prev) => {
        if (!prev) return prev;
        const map = Object.fromEntries(normalized.map((l) => [l.i, l]));
        const newFields = prev.fields.map((f) => {
          const l = map[f.id];
          return l ? { ...f, x: l.x, y: l.y, w: l.w, h: l.h } : f;
        });
        return { ...prev, fields: newFields };
      });
      saveClientLayoutDebounced(normalized);
    },
    [compactType, saveClientLayoutDebounced],
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
      setAlertMsg('Cliente no válido');
      return;
    }
    try {
      await addNote(clientId, fieldId, text);
    } catch (err: any) {
      setAlertMsg(err.message || 'Error al agregar la nota');
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
    subscribeClient();
    return () => unsub.current?.();
  }, [clientId, subscribeClient]);

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

  if (loading) {
    return (
      <div className="min-h-screen grid place-items-center bg-slate-50">
        <Spinner />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen grid place-items-center bg-slate-50">
        <div className="text-center">
          <p className="text-slate-600">{error}</p>
          <button
            className="mt-4 rounded bg-rose-600 px-3 py-1 text-sm text-white hover:bg-rose-700"
            onClick={loadAll}
          >
            Reintentar
          </button>
        </div>
      </div>
    );
  }
  return (
    <div className="min-h-screen w-full bg-slate-100 relative">
      {isSwitching && (
        <div className="absolute inset-0 z-30 grid place-items-center bg-white/60">
          <Spinner />
        </div>
      )}
      <div className="sticky top-0 z-20 flex items-center justify-between p-2 bg-white/70 backdrop-blur border-b border-slate-200">
        <button
          onClick={handleRename}
          className="px-3 py-1 rounded-lg border border-slate-200 bg-white text-slate-800 font-semibold"
        >
          {client?.name}
        </button>
        <div className="flex items-center gap-2">
          <label className="text-sm text-slate-600">Zoom</label>
          <input
            type="range"
            min={0.7}
            max={1.2}
            step={0.05}
            value={zoom}
            onChange={(e) => setZoom(Number(e.target.value))}
            disabled={isSwitching}
          />
          <button
            className={`px-3 py-1.5 rounded-xl border ${
              editLayout ? 'bg-sky-600 text-white hover:bg-sky-700' : 'bg-white hover:bg-slate-50'
            }`}
            onClick={() => setEditLayout((o) => !o)}
            disabled={isSwitching}
          >
            {editLayout ? 'Listo' : 'Editar layout'}
          </button>
          <ConfidenceBadge score={confidenceScore} />
          <button
            className="px-3 py-1.5 rounded-xl bg-sky-600 text-white hover:bg-sky-700 disabled:opacity-60"
            onClick={onSaveClick}
            disabled={!clientId || !tpl?.id || saving || isSwitching}
          >
            {saving ? 'Guardando…' : 'Guardar ficha'}
          </button>
          {autoMsg && <span className="text-sm text-slate-600">{autoMsg}</span>}
          {tplError && (
            <span className="px-3 py-1.5 rounded-xl bg-red-100 text-red-600 text-sm">
              {tplError}
            </span>
          )}
          <button
            className="px-3 py-1.5 rounded-xl border border-red-200 text-red-600 hover:bg-red-50"
            onClick={async () => {
              if (!clientId) return;
              if (confirm('¿Eliminar este cliente?')) {
                try {
                  await deleteClient(clientId);
                  router.push('/dashboard');
                } catch (err: any) {
                  setAlertMsg(err.message || 'Error al eliminar el cliente');
                }
              }
            }}
            disabled={isSwitching}
          >
            Eliminar cliente
          </button>
          <button
            className="px-3 py-1.5 rounded-xl border bg-white hover:bg-slate-50"
            onClick={async () => {
              await save(true);
              router.push('/dashboard');
            }}
            disabled={isSwitching}
          >
            Salir
          </button>
          <div className="relative">
            <button
              className="px-3 py-1.5 rounded-xl border bg-white hover:bg-slate-50"
              onClick={() => setTplMenuOpen((o) => !o)}
              disabled={isSwitching || tplLoading}
            >
              Cargar plantilla
            </button>
            {tplMenuOpen && (
              <div className="absolute right-0 mt-2 w-48 bg-white border rounded-xl shadow-md z-10">
                {templates.map((t) => (
                  <button
                    key={t.id}
                    onClick={() => onSelectTemplate(t.id)}
                    className="block w-full text-left px-3 py-2 hover:bg-slate-50 disabled:opacity-60"
                    disabled={isSwitching || tplLoading}
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
            disabled={isSwitching}
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
              onDragStop={applyLayoutChanges}
              onResizeStop={applyLayoutChanges}
              draggableHandle=".drag-handle"
              compactType={compactType}
              margin={[12, 12]}
              resizeHandle={
                editLayout
                  ? (_axis: ResizeHandleAxis, ref: React.Ref<HTMLSpanElement>) => (
                      <span ref={ref} className="react-resizable-handle custom-resize-handle" />
                    )
                  : undefined
              }
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
                    onDelete={() => handleHideField(f.id)}
                    onEdit={setEditingField}
                    disabled={tplLoading}
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
          <div className="col-span-3 transition-all duration-300 space-y-4">
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

            <ConfidenceCard clientId={clientId} score={confidenceScore} note={confidenceNote} onScoreChange={setConfidenceScore} onNoteChange={setConfidenceNote} />

            <div className="rounded-3xl bg-white shadow-sm border border-slate-200 p-4">
              <h3 className="font-semibold text-slate-800">Guiones</h3>
              {scriptsLoading ? (
                <div className="mt-2 text-sm text-slate-600">Cargando guiones…</div>
              ) : scriptsError ? (
                <div className="mt-2 text-sm text-red-600">
                  No se pudieron cargar los guiones.
                  <button
                    className="ml-2 underline"
                    onClick={loadScripts}
                  >
                    Reintentar
                  </button>
                </div>
              ) : scripts.length === 0 ? (
                <div className="mt-2 text-sm text-slate-600">
                  Aún no hay guiones
                  <div className="mt-2">
                    <button
                      className="px-3 py-1.5 rounded-xl border bg-white hover:bg-slate-50 text-sm"
                      onClick={() => router.push('/scripts')}
                    >
                      Crear guion
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  <select
                    className="mt-3 w-full rounded-lg border border-slate-200 bg-white p-2"
                    value={selectedScriptId ?? ''}
                    onChange={handleScriptChange}
                  >
                    <option value="">Selecciona un guion…</option>
                    {scripts.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.title}
                      </option>
                    ))}
                  </select>
                  <div className="mt-3 max-h-[480px] overflow-auto text-sm text-slate-700 whitespace-pre-wrap">
                    {selectedScript ? (
                      selectedScript.content
                    ) : (
                      <span className="text-slate-500">Selecciona un guion para verlo aquí</span>
                    )}
                  </div>
                </>
              )}
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
            const maxY =
              tpl?.fields.reduce(
                (m, f) => Math.max(m, f.y + (f.h ?? DEFAULT_H)),
                0,
              ) || 0;
            const field: Field = {
              ...data,
              x: 1,
              y: maxY + 1,
              w: DEFAULT_W,
              h: DEFAULT_H,
              order: tpl?.fields.length ?? 0,
            };
            setTpl((prev) =>
              prev ? { ...prev, fields: [...prev.fields, field] } : prev,
            );
          }
          setQuestionModalOpen(false);
          setEditingField(null);
        }}
      />
      {layoutSaved && (
        <div className="fixed bottom-4 right-4 px-3 py-2 rounded-lg bg-slate-800 text-white text-sm shadow">
          Layout guardado
        </div>
      )}
      <ModalAlert open={!!alertMsg} message={alertMsg || ''} onClose={() => setAlertMsg(null)} />
    </div>
  );
}
