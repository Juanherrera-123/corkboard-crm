'use client';
import React from 'react';

export default function ModalAlert({
  open,
  message,
  onClose,
}: {
  open: boolean;
  message: string;
  onClose: () => void;
}) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-slate-900/40" onClick={onClose} />
      <div className="relative w-full max-w-sm rounded-2xl bg-white p-5 shadow-lg border border-slate-200">
        <p className="text-slate-800">{message}</p>
        <div className="mt-5 flex justify-end">
          <button
            onClick={onClose}
            className="px-3 py-2 rounded-lg bg-sky-600 text-white hover:bg-sky-700"
          >
            Aceptar
          </button>
        </div>
      </div>
    </div>
  );
}
