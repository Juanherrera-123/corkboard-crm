'use client';
export const dynamic = 'force-dynamic';

import React, { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import {
  fetchTemplates,
  createTemplate,
  createClient,
  saveClientRecord,
  addNote,
  fetchNotes,
} from '@/lib/db';
import { subscribeClientLive } from '@/lib/realtime';

type FieldType = 'text' | 'number' | 'select' | 'multiselect' | 'currency' | 'note';

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

/** IDs deterministas para evitar hydration mismatch */
function computeRecommendations(answers: Answers, tpl: Template | null) {
  const get = (label: string) => {
    if (!tpl) return undefined;
    const f = tpl.fields.find((x) => x.label.trim() === label.trim());
    if (!f) return undefined;
    return answers[f.id];
  };
  const pain: string[] = Array.isArray(get('Pain points')) ? get('Pain points') : [];
  const vol: number = Number(get('Volumen mensual (USD)') ?? 0);
  const budget: number = Number(get('Presupuesto / Ticket medio (USD)') ?? 0);
  const instruments: string[] = Array.isArray(get('Instrumentos principales')) ? get('Instrumentos principales') : [];
  const clientType: string = String(get('Tipo de cliente (IB / Copytrader / Cuenta)') ?? '');

  const recs: { id: string; title: string; reason: string; score: number }[] = [];
  const mk = (title: string, reason: string, score: number) => ({ id: `${title}-${score}`, title, reason, score });

  if (pain.includes('spreads altos')) recs.push(mk('Plan Spreads Bajos', 'Reporta spreads altos', 20));
  if (pain.includes('ejecución lenta')) recs.push(mk('Servidor Pro + VPS', 'Menor latencia', 18));
  if (vol >= 50_000) recs.push(mk('Cuenta ECN + Rebate', `Volumen ≈ $${vol.toLocaleString()}`, 25));
  if (budget >= 5000 && clientType === 'Copytrader') recs.push(mk('Programa Copy Pro', 'Copytrader con presupuesto', 22));
  if (instruments.includes('XAU')) recs.push(mk('Rutas XAU baja latencia', 'Opera oro', 12));
  if (!recs.length) recs.push(mk('Onboarding + Diagnóstico', 'Sin señales fuertes', 8));

  return recs.sort((a, b) => b.score - a.score);
}

const Badge = ({ children }: { children: React.ReactNode }) => (
  <span className="px-2 py-0.5 rounded-full text-xs bg-slate-800 text-white/90">{children}</span>
);

function FieldCard({
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
  onAddNote: (fieldId: string, text: string) => void;
}) {
  const cardStyle: React.CSSProperties = { gridColumn: `${field.x} / span ${field.w}`, gridRow: `${field.y} / span ${field.h}` };

  const Input = () => {
    if (field.type === 'text')
      return (
        <textarea
          className="w-full h-24 resize-none rounded-lg border border-slate-200 bg-white/70 p-2 focus:outline-none focus:ring-2 focus:ring-sky-400"
          placeholder="Escribe..."
          value={typeof value === 'string' ? value : value ?? ''}
          onChange={(e) => onChange(field.id, e.target.value)}
        />
      );
    if (field.type === 'number' || field.type === 'currency')
      return (
        <input
          type="number"
          className="w-full rounded-lg border border-slate-200 bg-white/70 p-2 focus:outline-none focus:ring-2 focus:ring-sky-400"
          placeholder={field.type === 'currency' ? '$' : '0'}
          value={value === '' ? '' : typeof value === 'number' ? value : value || ''}
          onChange={(e) => onChange(field.id, e.target.value === '' ? '' : Number(e.target.value))}
        />
      );
    if (field.type === 'select')
      return (
        <select
          className="w-full rounded-lg border border-slate-200 bg-white/70 p-2"
          value={typeof value === 'string' ? value : ''}
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
    if (field.type === 'multiselect')
      return (
        <div className="flex flex-wrap gap-2">
          {(field.options || []).map((op) => {
            const active = Array.isArray(value) ? value.includes(op) : false;
            return (
              <button
                key={op}
                onClick={() => {
                  const set = new Set<string>(Array.isArray(value) ? value : []);
                  active ? set.delete(op) : set.add(op);
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
    if (field.type === 'note')
      return (
        <div className="space-y-2">
          <button
            className="text-sm px-2 py-1 rounded-lg bg-amber-400/80 hover:bg-amber-400"
            onClick={() => {
              const t = prompt('Escribe la nota');
              if (t) onAddNote(field.id, t);
            }}
          >
            Agregar nota +
          </button>
          <div className="flex flex-wrap gap-2">
            {(notes || []).map((n) => (
              <div key={n.id} className="w-36 h-28 bg-amber-200 rounded shadow rotate-[-1deg] p-2 text-[12px] overflow-hidden">
                {n.text}
              </div>
            ))}
          </div>
        </div>
      );
    return null;
  };

  return (
    <div style={cardStyle} className="relative rounded-2xl shadow-sm border border-slate-200 bg-white/80 backdrop-blur p-3 flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <div className="font-semibold text-slate-800">{field.label}</div>
        <Badge>{field.type}</Badge>
      </div>
      <Input />
    </div>
  );
}

export default function HomePage() {
  /** Protección de ruta: si no hay sesión, redirige a /login */
  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (!data.user) window.location.href = '/login';
    });
  }, []);

  const [templates, setTemplates] = useState<Template[]>([]);
  const [tpl, setTpl] = useState<Template | null>(null);

  const [clientId, setClientId] = useState<string>('');
  const [clientName, setClientName] = useState('');
  const [clientTag, setClientTag] = useState('Lead');

  const [answers, setAnswers] = useState<Answers>({});
  const [notes, setNotesState] = useState<Record<string, Note[]>>({});

  const [zoom, setZoom] = useState(1);
  const [userEmail, setUserEmail] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const { data: u } = await supabase.auth.getUser();
      setUserEmail(u.user?.email ?? null);
      const list = await fetchTemplates();
      setTemplates(list as any);
      if (list.length) setTpl(list[0] as any);
    })();
  }, []);

  const recommendations = useMemo(() => computeRecommendations(answers, tpl), [answers, tpl]);
  const totalScore = useMemo(() => recommendations.reduce((a, b) => a + b.score, 0), [recommendations]);

  const updateAnswer = (id: string, val: any) => setAnswers((prev) => ({ ...prev, [id]: val }));

  const addNoteLocalAndRemote = async (fieldId: string, text: string) => {
    if (!clientId) {
      alert('Primero crea el cliente');
      return;
    }
    await addNote(clientId, fieldId, text);
    const list = await fetchNotes(clientId);
    const byField: Record<string, Note[]> = {};
    list.forEach((n) => {
      (byField[n.field_id] ||= []).push(n as any);
    });
    setNotesState(byField);
  };

  const saveTemplateBtn = async () => {
    if (!tpl) return;
    const name = prompt('Nombre de la plantilla', tpl.name) || tpl.name;
    await createTemplate(name, tpl.fields);
    const list = await fetchTemplates();
    setTemplates(list as any);
    alert('Plantilla guardada en Supabase');
  };

  const createClientBtn = async () => {
    const name = clientName || prompt('Nombre del cliente') || 'Sin nombre';
    const id = await createClient(name, clientTag);
    setClientId(id);
    const unsub = subscribeClientLive(
      id,
      () => {},
      async () => {
        const list = await fetchNotes(id);
        const byField: Record<string, Note[]> = {};
        list.forEach((n) => {
          (byField[n.field_id] ||= []).push(n as any);
        });
        setNotesState(byField);
      }
    );
    // Nota: guarda unsub si luego quieres limpiar la suscripción al desmontar
    alert(`Cliente creado (${id})`);
  };

  const saveRecordBtn = async () => {
    if (!tpl) {
      alert('Elige plantilla');
      return;
    }
    if (!clientId) {
      alert('Crea el cliente primero');
      return;
    }
    await saveClientRecord(clientId, tpl.id, answers, totalScore, recommendations);
    alert('Ficha guardada en Supabase');
  };

  const logout = async () => {
    await supabase.auth.signOut();
    window.location.href = '/login';
  };

  const corkBg: React.CSSProperties = {
    backgroundImage:
      'radial-gradient(#c7a574 1px, transparent 1px), radial-gradient(#c7a574 1px, transparent 1px)',
    backgroundSize: '16px 16px, 16px 16px',
    backgroundPosition: '0 0, 8px 8px',
  };

  return (
    <div className="min-h-screen w-full bg-slate-100">
      <div className="sticky top-0 z-20 backdrop-blur bg-white/70 border-b border-slate-200">
        <div className="mx-auto max-w-[1400px] px-4 py-3 flex items-center gap-3">
          <div className="font-semibold text-slate-800 text-lg">Corkboard CRM</div>
          <div className="hidden md:flex items-center gap-2">
            <input
              className="rounded-lg border px-2 py-1"
              placeholder="Nombre del cliente"
              value={clientName}
              onChange={(e) => setClientName(e.target.value)}
            />
            <select className="rounded-lg border px-2 py-1" value={clientTag} onChange={(e) => setClientTag(e.target.value)}>
              {['Lead', 'MQL', 'SQL', 'Won', 'Lost'].map((t) => (
                <option key={t}>{t}</option>
              ))}
            </select>
            <span className="text-sm text-slate-600">Score:</span>
            <Badge>{totalScore}</Badge>
          </div>
          <div className="ml-auto flex items-center gap-2">
            {userEmail && <span className="text-sm text-slate-600">Hola, {userEmail}</span>}
            <label className="text-sm text-slate-600">Zoom</label>
            <input type="range" min={0.7} max={1.2} step={0.05} value={zoom} onChange={(e) => setZoom(Number(e.target.value))} />
            <button className="px-3 py-1.5 rounded-xl border bg-white hover:bg-slate-50" onClick={saveTemplateBtn}>
              Guardar plantilla
            </button>
            <button className="px-3 py-1.5 rounded-xl border bg-white hover:bg-slate-50" onClick={createClientBtn}>
              Crear cliente
            </button>
            <button className="px-3 py-1.5 rounded-xl border bg-white hover:bg-slate-50" onClick={saveRecordBtn}>
              Guardar ficha
            </button>
            <button className="px-3 py-1.5 rounded-xl border bg-white hover:bg-slate-50" onClick={logout}>
              Salir
            </button>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-[1400px] px-4 py-6 grid grid-cols-12 gap-4">
        <div className="col-span-8 rounded-3xl p-4 border border-slate-200 shadow-sm" style={{ ...corkBg }}>
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
                onAddNote={addNoteLocalAndRemote}
              />
            ))}
          </div>
        </div>

        <div className="col-span-4 flex flex-col gap-4">
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

          <div className="rounded-3xl bg-white shadow-sm border border-slate-200 p-4">
            <h3 className="font-semibold text-slate-800">Plantillas</h3>
            <p className="text-sm text-slate-600">Cámbialas al vuelo (desde Supabase).</p>
            <div className="mt-2 grid grid-cols-2 gap-2">
              {templates.map((t) => (
                <button
                  key={t.id}
                  onClick={() => setTpl(t as any)}
                  className={`text-left rounded-xl border p-2 hover:bg-slate-50 ${tpl?.id === t.id ? 'border-sky-600 ring-1 ring-sky-300' : ''}`}
                >
                  <div className="font-medium text-slate-800 truncate">{t.name}</div>
                  <div className="text-[11px] text-slate-500">{(t.fields || []).length} preguntas</div>
                </button>
              ))}
            </div>
          </div>

          <div className="rounded-3xl bg-white shadow-sm border border-slate-200 p-4">
            <h3 className="font-semibold text-slate-800">Consejos</h3>
            <ul className="list-disc list-inside text-sm text-slate-600 space-y-1">
              <li>Crea el cliente y guarda su ficha para registrar respuestas.</li>
              <li>Usa tarjetas <b>note</b> para stickies y quedan guardadas.</li>
            </ul>
          </div>
        </div>
      </div>

      <footer className="py-6 text-center text-xs text-slate-500">Corkboard CRM • Supabase</footer>
    </div>
  );
}
