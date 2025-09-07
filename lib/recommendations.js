/** @typedef {Record<string, any>} Answers */

/**
 * Generate recommendations based on provided answers and a label->field.id map.
 * @param {Answers} answers
 * @param {Record<string,string>} labelMap
 * @returns {{id:string,title:string,reason:string,score:number}[]}
 */
function computeRecommendations(answers, labelMap) {
  const get = (label) => {
    const id = labelMap[label.trim()];
    return id ? answers[id] : undefined;
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

module.exports = { computeRecommendations };
