export function scoreToColor(score: number): string {
  if (score <= 20) return '#ef4444'; // red-500
  if (score <= 40) return '#f97316'; // orange-500
  if (score <= 60) return '#facc15'; // yellow-400
  if (score <= 80) return '#a3e635'; // lime-400
  return '#22c55e'; // green-500
}

export function scoreToFace(score: number): string {
  if (score <= 20) return '😡';
  if (score <= 40) return '😕';
  if (score <= 60) return '😐';
  if (score <= 80) return '🙂';
  return '😄';
}

export function scoreToChip(score: number): { label: string; className: string } {
  if (score < 40) {
    return { label: 'Rojo', className: 'bg-red-100 text-red-600' };
  }
  if (score < 70) {
    return { label: 'Ámbar', className: 'bg-yellow-100 text-yellow-700' };
  }
  return { label: 'Verde', className: 'bg-green-100 text-green-600' };
}
