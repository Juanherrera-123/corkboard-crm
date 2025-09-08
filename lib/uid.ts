export function uid(): string {
  if (typeof crypto !== 'undefined' && typeof (crypto as any).randomUUID === 'function') {
    return (crypto as any).randomUUID();
  }
  try {
    // @ts-ignore
    const { randomUUID } = require('node:crypto');
    if (typeof randomUUID === 'function') return randomUUID();
  } catch {}
  return Math.random().toString(36).slice(2) + Math.random().toString(36).slice(2);
}
