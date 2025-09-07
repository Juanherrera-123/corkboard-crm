'use client';
import { useEffect, useState } from 'react';

export default function ModalText({
  open,
  title,
  placeholder,
  defaultValue = '',
  area = false,
  onClose,
  onSubmit,
}: {
  open: boolean;
  title: string;
  placeholder?: string;
  defaultValue?: string;
  area?: boolean;
  onClose: () => void;
  onSubmit: (val: string) => void | Promise<void>;
}) {
  const [value, setValue] = useState(defaultValue);
  useEffect(() => {
    if (open) setValue(defaultValue);
  }, [open, defaultValue]);
  if (!open) return null;
  async function submit() {
    await onSubmit(value);
    onClose();
  }
  const Input = area ? (
    <textarea
      value={value}
      onChange={(e) => setValue(e.target.value)}
      className="mt-4 w-full rounded-lg border border-slate-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-sky-400"
      placeholder={placeholder}
    />
  ) : (
    <input
      value={value}
      onChange={(e) => setValue(e.target.value)}
      className="mt-4 w-full rounded-lg border border-slate-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-sky-400"
      placeholder={placeholder}
    />
  );
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-slate-900/40" onClick={onClose} />
      <div className="relative w-full max-w-md rounded-2xl bg-white p-5 shadow-lg border border-slate-200">
        <h3 className="text-lg font-semibold text-slate-800">{title}</h3>
        {Input}
        <div className="mt-5 flex justify-end gap-2">
          <button className="px-3 py-2 rounded-lg border hover:bg-slate-50" onClick={onClose}>
            Cancelar
          </button>
          <button
            onClick={submit}
            className="px-3 py-2 rounded-lg bg-sky-600 text-white hover:bg-sky-700"
          >
            Confirmar
          </button>
        </div>
      </div>
    </div>
  );
}
