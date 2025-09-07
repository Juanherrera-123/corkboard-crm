import test from 'node:test';
import assert from 'node:assert/strict';
import { computeRecommendations } from './recommendations.js';

function computeRecommendationsOld(answers, tpl) {
  const get = (label) => {
    if (!tpl) return undefined;
    const f = tpl.fields.find((x) => x.label.trim() === label.trim());
    if (!f) return undefined;
    return answers[f.id];
  };
  const pain = Array.isArray(get('Pain points')) ? get('Pain points') : [];
  const vol = Number(get('Volumen mensual (USD)') ?? 0);
  const budget = Number(get('Presupuesto / Ticket medio (USD)') ?? 0);
  const instruments = Array.isArray(get('Instrumentos principales')) ? get('Instrumentos principales') : [];
  const clientType = String(get('Tipo de cliente (IB / Copytrader / Cuenta)') ?? '');

  const recs = [];
  const mk = (title, reason, score) => ({ id: `${title}-${score}`, title, reason, score });

  if (pain.includes('spreads altos')) recs.push(mk('Plan Spreads Bajos', 'Reporta spreads altos', 20));
  if (pain.includes('ejecución lenta')) recs.push(mk('Servidor Pro + VPS', 'Menor latencia', 18));
  if (vol >= 50_000) recs.push(mk('Cuenta ECN + Rebate', `Volumen ≈ $${vol.toLocaleString()}`, 25));
  if (budget >= 5000 && clientType === 'Copytrader') recs.push(mk('Programa Copy Pro', 'Copytrader con presupuesto', 22));
  if (instruments.includes('XAU')) recs.push(mk('Rutas XAU baja latencia', 'Opera oro', 12));
  if (!recs.length) recs.push(mk('Onboarding + Diagnóstico', 'Sin señales fuertes', 8));

  return recs.sort((a, b) => b.score - a.score);
}

test('computeRecommendations matches previous implementation', () => {
  const tpl = {
    fields: [
      { id: 'f1', label: 'Pain points' },
      { id: 'f2', label: 'Volumen mensual (USD)' },
      { id: 'f3', label: 'Presupuesto / Ticket medio (USD)' },
      { id: 'f4', label: 'Instrumentos principales' },
      { id: 'f5', label: 'Tipo de cliente (IB / Copytrader / Cuenta)' },
    ],
  };
  const answers = {
    f1: ['spreads altos', 'ejecución lenta'],
    f2: 60000,
    f3: 6000,
    f4: ['XAU'],
    f5: 'Copytrader',
  };
  const labelMap = {
    'Pain points': 'f1',
    'Volumen mensual (USD)': 'f2',
    'Presupuesto / Ticket medio (USD)': 'f3',
    'Instrumentos principales': 'f4',
    'Tipo de cliente (IB / Copytrader / Cuenta)': 'f5',
  };
  const oldRes = computeRecommendationsOld(answers, tpl);
  const newRes = computeRecommendations(answers, labelMap);
  assert.deepEqual(newRes, oldRes);
});
