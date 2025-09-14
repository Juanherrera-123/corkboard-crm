'use client';

import { useEffect, useMemo, useState } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { BROKERS, Broker } from '@/lib/brokers/data';
import { scoreBroker } from '@/lib/brokers/scoring';

const categories: { key: keyof Broker; label: string; numeric?: boolean; better?: 'higher' | 'lower' }[] = [
  { key: 'instruments', label: 'Instrumentos' },
  { key: 'avgUserProfile', label: 'Perfil' },
  { key: 'accountTypes', label: 'Tipos de cuenta' },
  { key: 'minDeposit', label: 'Depósito mínimo' },
  { key: 'minSpreadEURUSD', label: 'Spreads', numeric: true, better: 'lower' },
  { key: 'commissionsForexUSD', label: 'Comisiones', numeric: true, better: 'lower' },
  { key: 'leverage', label: 'Apalancamiento', numeric: true, better: 'higher' },
  { key: 'regulationLatam', label: 'Regulación LATAM' },
  { key: 'platforms', label: 'Plataformas' },
  { key: 'education', label: 'Educación' },
  { key: 'copyTrading', label: 'Copy Trading' },
  { key: 'liquidityModel', label: 'Liquidez' },
  { key: 'ibOfferings', label: 'IB/Oferta' },
  { key: 'welcomeBonus', label: 'Bonos' },
  { key: 'promoInfo', label: 'Promos' },
  { key: 'referrals', label: 'Referidos' },
  { key: 'trustpilot', label: 'TrustPilot', numeric: true, better: 'higher' },
];

const parseNumber = (s: string) => {
  const m = s.match(/[\d.]+/);
  return m ? parseFloat(m[0]) : 0;
};

function compareMetric(key: keyof Broker, acy: string, other: string): 'win' | 'lose' | 'draw' {
  const cat = categories.find((c) => c.key === key);
  if (!cat?.numeric) return 'draw';
  const a = parseNumber(acy);
  const b = parseNumber(other);
  if (a === b) return 'draw';
  if (cat.better === 'lower') return a < b ? 'win' : 'lose';
  return a > b ? 'win' : 'lose';
}

export default function BrokerCompare({ initialVs }: { initialVs: string[] }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [selected, setSelected] = useState<string[]>(initialVs);

  useEffect(() => {
    setSelected(initialVs);
  }, [initialVs.join(',')]);

  const acy = BROKERS.find((b) => b.id === 'acy')!;
  const others = useMemo(() => BROKERS.filter((b) => selected.includes(b.id)), [selected]);

  const handleSelect = (id: string) => {
    setSelected((prev) => {
      let next = prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id];
      if (next.length > 3) next = next.slice(0, 3);
      if (next.length === 0) next = ['pepperstone'];
      const params = new URLSearchParams(searchParams.toString());
      params.set('vs', next.join(','));
      router.replace(`${pathname}?${params.toString()}`);
      return next;
    });
  };

  const copyLink = () => {
    const url = `${window.location.origin}${pathname}?vs=${selected.join(',')}`;
    navigator.clipboard.writeText(url);
  };

  const exportCSV = () => {
    const headers = ['Metric', 'ACY', ...others.map((o) => o.name)];
    const rows = categories.map((c) => {
      const acyVal = acy[c.key];
      const vals = others.map((o) => o[c.key]);
      return [c.label, acyVal, ...vals].join(',');
    });
    const csv = [headers.join(','), ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'comparison.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  const printPage = () => window.print();

  return (
    <div className="space-y-6">
      <div>
        <div className="text-sm font-medium text-slate-700 mb-2">Selecciona competidores (max 3)</div>
        <div className="flex flex-wrap gap-2">
          {BROKERS.filter((b) => b.id !== 'acy').map((b) => {
            const checked = selected.includes(b.id);
            return (
              <label key={b.id} className="flex items-center gap-1 text-sm">
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={() => handleSelect(b.id)}
                />
                {b.name}
              </label>
            );
          })}
        </div>
      </div>

      <div className="flex flex-wrap gap-4">
        {[acy, ...others].map((b) => {
          const score = scoreBroker(b);
          return (
            <div key={b.id} className="border border-slate-200 rounded-lg p-4 bg-white w-60">
              <div className="font-semibold text-slate-800 mb-2">{b.name}</div>
              <div className="flex flex-wrap gap-1 mb-2 text-xs">
                <span className="px-2 py-0.5 bg-slate-100 rounded">Inst: {b.instruments}</span>
                <span className="px-2 py-0.5 bg-slate-100 rounded">Sp: {b.minSpreadEURUSD}</span>
                <span className="px-2 py-0.5 bg-slate-100 rounded">Com: {b.commissionsForexUSD}</span>
                <span className="px-2 py-0.5 bg-slate-100 rounded">Lev: {b.leverage}</span>
                <span className="px-2 py-0.5 bg-slate-100 rounded">Reg: {b.regulationLatam}</span>
              </div>
              <div className="text-xs text-slate-600 mb-1">Score {score.total}</div>
              <div className="h-2 bg-slate-200 rounded">
                <div className="h-2 bg-sky-500 rounded" style={{ width: `${score.total}%` }} />
              </div>
            </div>
          );
        })}
      </div>

      {/* Desktop table */}
      <div className="hidden md:block overflow-x-auto">
        <table className="table-fixed w-full text-sm" aria-label="Comparador de brokers">
          <thead>
            <tr>
              <th className="w-48 px-2 py-2 text-left sticky left-0 bg-white">Métrica</th>
              <th className="w-56 px-2 py-2 text-left sticky left-48 bg-white border-l">ACY</th>
              {others.map((o) => (
                <th key={o.id} className="w-56 px-2 py-2 text-left border-l">{o.name}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {categories.map((c) => (
              <tr key={c.key} className="border-t">
                <td className="px-2 py-2 font-medium sticky left-0 bg-white">{c.label}</td>
                {[acy, ...others].map((b, idx) => {
                  const comp = idx === 0 ? null : compareMetric(c.key, acy[c.key], b[c.key]);
                  let cls = 'px-2 py-2';
                  if (idx === 0 && comp) {
                    cls += comp === 'win' ? ' bg-green-50' : comp === 'lose' ? ' bg-red-50' : ' bg-slate-50';
                  }
                  if (idx > 0 && comp) {
                    cls += comp === 'win' ? ' bg-red-50' : comp === 'lose' ? ' bg-green-50' : ' bg-slate-50';
                  }
                  if (idx === 1) cls += ' sticky left-48 bg-white border-l';
                  else if (idx > 1) cls += ' border-l';
                  return (
                    <td key={b.id} className={cls}>
                      {b[c.key]}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile stacked view */}
      <div className="md:hidden space-y-6">
        {[acy, ...others].map((b) => (
          <div key={b.id} className="border border-slate-200 rounded-lg bg-white">
            <div className="p-2 font-semibold text-slate-800">{b.name}</div>
            <dl className="divide-y">
              {categories.map((c) => (
                <div key={c.key} className="flex">
                  <dt className="w-1/2 p-2 text-sm bg-slate-50">{c.label}</dt>
                  <dd className="w-1/2 p-2 text-sm">{b[c.key]}</dd>
                </div>
              ))}
            </dl>
          </div>
        ))}
      </div>

      <div className="flex flex-wrap gap-2">
        <button className="px-3 py-1 rounded border bg-white" onClick={copyLink}>
          Copiar enlace de comparación
        </button>
        <button className="px-3 py-1 rounded border bg-white" onClick={exportCSV}>
          Exportar CSV
        </button>
        <button className="px-3 py-1 rounded border bg-white" onClick={printPage}>
          Imprimir / PDF
        </button>
      </div>

      <p className="text-xs text-slate-500">Datos informativos, pueden variar por cuenta/región.</p>
    </div>
  );
}
