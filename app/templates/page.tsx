'use client';
import { useEffect, useState, type CSSProperties } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';
import Sidebar from '@/components/Sidebar';
import {
  ensureDefaultTemplates,
  fetchTemplates,
  getMyProfile,
  createTemplate,
  updateTemplateFields,
} from '@/lib/db';
import { uid } from '@/lib/uid';
import { DndContext, closestCenter, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import { SortableContext, arrayMove, useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

export default function TemplatesPage() {
  const router = useRouter();
  const [ready, setReady] = useState(false);
  const [templates, setTemplates] = useState<any[]>([]);
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState('');
  const [editingTpl, setEditingTpl] = useState<any | null>(null);
  const [fields, setFields] = useState<any[]>([]);
  const [tplDirty, setTplDirty] = useState(false);
  const [fieldModalOpen, setFieldModalOpen] = useState(false);
  const [fieldLabel, setFieldLabel] = useState('');
  const [fieldType, setFieldType] = useState('text');
  const [fieldOptions, setFieldOptions] = useState('');
  const [editingFieldId, setEditingFieldId] = useState<string | null>(null);

  const sensors = useSensors(useSensor(PointerSensor));

  const handleDeleteField = (id: string) => {
    if (!confirm('¿Eliminar esta pregunta?')) return;
    setFields((prev) => {
      const filtered = prev.filter((x) => x.id !== id);
      return filtered.map((fld, idx) => ({ ...fld, order: idx }));
    });
    setTplDirty(true);
  };

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
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-semibold text-slate-800">Plantillas</h1>
          <button
            className="px-3 py-1.5 rounded-xl bg-sky-600 text-white hover:bg-sky-700"
            onClick={() => setShowCreate(true)}
          >
            Crear Plantilla
          </button>
        </div>
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
                  onClick={() => {
                    setEditingTpl(t);
                    setFields(t.fields || []);
                    setTplDirty(false);
                  }}
                >
                  Editar
                </button>
              </div>
            ))}
          </div>
        )}
        {editingTpl && (
          <div className="mt-8">
            <h2 className="text-lg font-medium text-slate-800 mb-4">Editando: {editingTpl.name}</h2>
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={({ active, over }) => {
                if (over && active.id !== over.id) {
                  setFields((items) => {
                    const oldIndex = items.findIndex((i) => i.id === active.id);
                    const newIndex = items.findIndex((i) => i.id === over.id);
                    const moved = arrayMove(items, oldIndex, newIndex);
                    return moved.map((fld, idx) => ({ ...fld, order: idx }));
                  });
                  setTplDirty(true);
                }
              }}
            >
              <SortableContext items={fields.map((f) => f.id)}>
                <div className="flex flex-col gap-2">
                  {fields.map((f) => (
                    <FieldItem
                      key={f.id}
                      field={f}
                      onEdit={() => {
                        setEditingFieldId(f.id);
                        setFieldLabel(f.label);
                        setFieldType(f.type);
                        setFieldOptions((f.options || []).join(', '));
                        setFieldModalOpen(true);
                      }}
                      onDelete={() => handleDeleteField(f.id)}
                    />
                  ))}
                </div>
              </SortableContext>
            </DndContext>
            <div className="mt-4 flex gap-2">
              <button
                className="px-3 py-1.5 rounded-xl border bg-white hover:bg-slate-50"
                onClick={() => {
                  setEditingFieldId(null);
                  setFieldLabel('');
                  setFieldType('text');
                  setFieldOptions('');
                  setFieldModalOpen(true);
                }}
              >
                Agregar pregunta
              </button>
              <button
                className="px-3 py-1.5 rounded-xl bg-sky-600 text-white hover:bg-sky-700 disabled:opacity-50"
                disabled={!tplDirty}
                onClick={async () => {
                  const ordered = fields.map((f, idx) => ({
                    ...f,
                    x: f.x ?? 1,
                    y: f.y ?? 1,
                    w: f.w ?? 3,
                    h: f.h ?? 2,
                    order: idx,
                  }));
                  await updateTemplateFields(editingTpl.id, ordered);
                  setTemplates((prev) =>
                    prev.map((t) =>
                      t.id === editingTpl.id ? { ...t, fields: ordered } : t
                    )
                  );
                  setEditingTpl({ ...editingTpl, fields: ordered });
                  setFields(ordered);
                  setTplDirty(false);
                }}
              >
                Guardar cambios
              </button>
            </div>
          </div>
        )}
      </main>
      {showCreate && (
        <div className="fixed inset-0 bg-black/50 grid place-items-center">
          <div className="bg-white rounded-2xl p-4 w-full max-w-sm">
            <h2 className="text-lg font-medium mb-2">Nueva plantilla</h2>
            <input
              className="w-full border border-slate-200 rounded-lg p-2"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
            />
            <div className="flex justify-end gap-2 mt-4">
              <button
                className="px-3 py-1.5 rounded-xl border bg-white hover:bg-slate-50"
                onClick={() => {
                  setShowCreate(false);
                  setNewName('');
                }}
              >
                Cancelar
              </button>
              <button
                className="px-3 py-1.5 rounded-xl bg-sky-600 text-white hover:bg-sky-700"
                onClick={async () => {
                  if (!newName.trim()) return;
                  const tpl = await createTemplate(newName.trim(), []);
                  setTemplates((prev) => [tpl, ...prev]);
                  setShowCreate(false);
                  setNewName('');
                }}
              >
                Crear
              </button>
            </div>
          </div>
        </div>
      )}
      {fieldModalOpen && (
        <div className="fixed inset-0 bg-black/50 grid place-items-center">
          <div className="bg-white rounded-2xl p-4 w-full max-w-md">
            <h2 className="text-lg font-medium mb-2">
              {editingFieldId ? 'Editar pregunta' : 'Nueva pregunta'}
            </h2>
            <div className="flex flex-col gap-2">
              <div className="flex flex-col gap-1">
                <label className="text-sm text-slate-600">Label</label>
                <input
                  className="rounded-lg border border-slate-200 p-2"
                  value={fieldLabel}
                  onChange={(e) => setFieldLabel(e.target.value)}
                />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-sm text-slate-600">Tipo</label>
                <select
                  className="rounded-lg border border-slate-200 p-2"
                  value={fieldType}
                  onChange={(e) => setFieldType(e.target.value)}
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
              {(fieldType === 'select' || fieldType === 'multiselect') && (
                <div className="flex flex-col gap-1">
                  <label className="text-sm text-slate-600">
                    Opciones (separadas por coma)
                  </label>
                  <textarea
                    className="rounded-lg border border-slate-200 p-2"
                    value={fieldOptions}
                    onChange={(e) => setFieldOptions(e.target.value)}
                  />
                </div>
              )}
            </div>
            <div className="flex justify-end gap-2 mt-4">
              <button
                className="px-3 py-1.5 rounded-xl border bg-white hover:bg-slate-50"
                onClick={() => setFieldModalOpen(false)}
              >
                Cancelar
              </button>
              <button
                className="px-3 py-1.5 rounded-xl bg-sky-600 text-white hover:bg-sky-700"
                onClick={() => {
                  if (!fieldLabel.trim()) return;
                  const opts =
                    fieldType === 'select' || fieldType === 'multiselect'
                      ? fieldOptions.split(',').map((s) => s.trim()).filter(Boolean)
                      : undefined;
                  if (editingFieldId) {
                    setFields((prev) =>
                      prev.map((f) =>
                        f.id === editingFieldId
                          ? { ...f, label: fieldLabel.trim(), type: fieldType, ...(opts ? { options: opts } : { options: undefined }) }
                          : f
                      )
                    );
                  } else {
                    setFields((prev) => [
                      ...prev,
                      {
                        id: uid(),
                        label: fieldLabel.trim(),
                        type: fieldType,
                        ...(opts ? { options: opts } : {}),
                        x: 1,
                        y: prev.length + 1,
                        w: 3,
                        h: 2,
                        order: prev.length,
                      },
                    ]);
                  }
                  setTplDirty(true);
                  setFieldModalOpen(false);
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

function FieldItem({
  field,
  onEdit,
  onDelete,
}: {
  field: any;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id: field.id });
  const style: CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
  };
  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className="rounded-2xl border border-slate-200 bg-white p-4 flex justify-between items-start"
    >
      <div>
        <div className="font-medium text-slate-800">{field.label}</div>
        <div className="text-xs text-slate-500">{field.type}</div>
      </div>
      <div className="flex gap-2 text-sm">
        <button className="text-sky-700 hover:underline" onClick={onEdit}>
          Editar
        </button>
        <button className="text-rose-600 hover:underline" onClick={onDelete}>
          Eliminar
        </button>
      </div>
    </div>
  );
}
