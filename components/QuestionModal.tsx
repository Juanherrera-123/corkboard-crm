'use client';
import { useEffect, useState } from 'react';
import { uid } from '@/lib/uid';
import type { FieldType } from '@/lib/types';

export type Question = {
  id: string;
  label: string;
  type: FieldType;
  options?: string[];
};

export default function QuestionModal({
  open,
  field,
  onClose,
  onSubmit,
}: {
  open: boolean;
  field: Question | null;
  onClose: () => void;
  onSubmit: (field: Question) => void;
}) {
  const [label, setLabel] = useState('');
  const [type, setType] = useState<FieldType>('text');
  const [options, setOptions] = useState('');

  useEffect(() => {
    if (open) {
      setLabel(field?.label ?? '');
      setType(field?.type ?? 'text');
      setOptions(field?.options?.join(',') ?? '');
    }
  }, [open, field]);

  const handleSubmit = () => {
    if (!label.trim() || !type) {
      alert('Label y tipo requeridos');
      return;
    }
    const payload: Question = {
      id: field?.id ?? uid(),
      label: label.trim(),
      type,
      ...(type === 'select' || type === 'multiselect'
        ? { options: options.split(',').map((s) => s.trim()).filter(Boolean) }
        : {}),
    };
    onSubmit(payload);
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 bg-black/50 z-50 grid place-items-center">
      <div className="bg-white rounded-xl p-4 w-80 space-y-3">
        <h2 className="text-lg font-semibold text-slate-800">
          {field ? 'Editar pregunta' : 'Agregar pregunta'}
        </h2>
        <div className="space-y-2">
          <div className="flex flex-col gap-1">
            <label className="text-sm text-slate-600">Label</label>
            <input
              className="rounded-lg border border-slate-200 p-2"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-sm text-slate-600">Tipo</label>
            <select
              className="rounded-lg border border-slate-200 p-2"
              value={type}
              onChange={(e) => setType(e.target.value as FieldType)}
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
          {(type === 'select' || type === 'multiselect') && (
            <div className="flex flex-col gap-1">
              <label className="text-sm text-slate-600">Opciones (separadas por coma)</label>
              <textarea
                className="rounded-lg border border-slate-200 p-2"
                value={options}
                onChange={(e) => setOptions(e.target.value)}
              />
            </div>
          )}
        </div>
        <div className="flex justify-end gap-2 pt-2">
          <button
            className="px-3 py-1.5 rounded-xl border bg-white hover:bg-slate-50"
            onClick={onClose}
          >
            Cancelar
          </button>
          <button
            className="px-3 py-1.5 rounded-xl bg-sky-600 text-white hover:bg-sky-700"
            onClick={handleSubmit}
          >
            Guardar
          </button>
        </div>
      </div>
    </div>
  );
}

