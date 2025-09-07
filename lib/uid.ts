export function uid(): string {
  // Navegador moderno
  if (typeof crypto !== 'undefined' && typeof (crypto as any).randomUUID === 'function') {
    return (crypto as any).randomUUID();
  }
  // Node 18+ (SSR / rutas server)
  try {
    // evito cargar 'node:crypto' en el cliente
    // @ts-ignore
    const { randomUUID } = require('node:crypto');
    if (typeof randomUUID === 'function') return randomUUID();
  } catch {}
  // Fallback
  return Math.random().toString(36).slice(2) + Math.random().toString(36).slice(2);
}
