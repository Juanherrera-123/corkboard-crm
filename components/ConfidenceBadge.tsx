import React from 'react';
import { scoreToFace, scoreToColor } from '@/lib/confidence';

export default function ConfidenceBadge({ score }: { score: number }) {
  const color = scoreToColor(score);
  const face = scoreToFace(score);
  return (
    <div className="flex items-center gap-1" title="Probabilidad de cierre">
      <span className="text-xl" aria-hidden style={{ color }}>
        {face}
      </span>
      <span
        className="px-2 py-0.5 rounded-full text-sm text-white"
        style={{ backgroundColor: color }}
      >
        {score}%
      </span>
    </div>
  );
}
