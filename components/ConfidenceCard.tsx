'use client';

import React, { useEffect, useRef, useState } from 'react';
import { updateClientConfidence } from '@/lib/db';
import { scoreToColor, scoreToChip } from '@/lib/confidence';

interface Props {
  clientId: string;
  score: number;
  note: string;
  onScoreChange: (s: number) => void;
  onNoteChange: (n: string) => void;
}

export default function ConfidenceCard({
  clientId,
  score,
  note,
  onScoreChange,
  onNoteChange,
}: Props) {
  const [status, setStatus] = useState<'saved' | 'saving' | 'error'>('saved');
  const saveRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const first = useRef(true);

  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    if (saveRef.current) clearTimeout(saveRef.current);
    setStatus('saving');
    saveRef.current = setTimeout(async () => {
      try {
        await updateClientConfidence(clientId, score, note);
        setStatus('saved');
      } catch (err) {
        console.error(err);
        setStatus('error');
      }
    }, 600);
    return () => {
      if (saveRef.current) clearTimeout(saveRef.current);
    };
  }, [clientId, score, note]);

  const color = scoreToColor(score);
  const chip = scoreToChip(score);

  const handleKey = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
      e.preventDefault();
      const delta = e.shiftKey ? 10 : 1;
      let next = score + (e.key === 'ArrowRight' ? delta : -delta);
      next = Math.max(0, Math.min(100, next));
      onScoreChange(next);
    }
  };

  return (
    <div className="rounded-3xl bg-white shadow-sm border border-slate-200 p-4">
      <h3 className="font-semibold text-slate-800 mb-2">Probabilidad</h3>
      <input
        type="range"
        min={0}
        max={100}
        step={1}
        value={score}
        onChange={(e) => onScoreChange(Number(e.target.value))}
        aria-label="Probabilidad de cierre"
        onKeyDown={handleKey}
        className="w-full h-2 rounded-lg appearance-none cursor-pointer"
        style={{ background: 'linear-gradient(to right, #ef4444, #facc15, #22c55e)', accentColor: color }}
      />
      <div className="mt-2 flex items-center gap-2">
        <span className="text-2xl font-semibold" style={{ color }}>
          {score}%
        </span>
        <span className={`px-2 py-0.5 rounded-full text-xs ${chip.className}`}>{chip.label}</span>
      </div>
      <textarea
        className="mt-3 w-full rounded-lg border border-slate-200 bg-white p-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-400"
        aria-label="Notas de probabilidad"
        value={note}
        onChange={(e) => onNoteChange(e.target.value)}
      />
      <div className="mt-2 text-sm text-slate-600">
        {status === 'saving' && 'Guardando…'}
        {status === 'saved' && 'Guardado'}
        {status === 'error' && <span className="text-red-600">Error al guardar</span>}
      </div>
    </div>
  );
}
