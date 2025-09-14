import { Broker } from './data';

const regMap: Record<string, number> = {
  High: 1,
  Medium: 0.6,
  Low: 0.3,
  EU: 0.8,
};

const parseSpread = (s: string) => {
  const m = (s.match(/[\d.]+/g) || []).map(Number);
  return m.length ? Math.min(...m) : 1.5;
};

const parseComm = (s: string) => {
  const m = (s.match(/[\d.]+/g) || []).map(Number);
  return m.length ? Math.min(...m) : 6;
};

const parseLeverage = (s: string) => {
  const m = /1:(\d+)/.exec(s);
  return m ? Number(m[1]) : 500;
};

const parseRegulation = (s: string) => {
  for (const key of Object.keys(regMap)) {
    if (s.includes(key)) return regMap[key];
  }
  return 0.3;
};

export function scoreBroker(b: Broker) {
  const spread = parseSpread(b.minSpreadEURUSD);
  const comm = parseComm(b.commissionsForexUSD);
  const lev = parseLeverage(b.leverage);
  const regScore = parseRegulation(b.regulationLatam);
  const instrMatch = /([\d,]+)/.exec(b.instruments);
  const instrNum = instrMatch ? Number(instrMatch[1].replace(/,/g, '')) : 0;
  const instrScore = Math.min(100, (instrNum / 20000) * 100);

  const spreadScore = 100 * (1 / (1 + spread));
  const commScore = 100 * (1 / (1 + comm));
  const levScore = Math.min(100, (lev / 5000) * 100);

  const total = Math.round(
    spreadScore * 0.25 +
    commScore * 0.2 +
    levScore * 0.15 +
    instrScore * 0.15 +
    regScore * 100 * 0.15 +
    50 * 0.1
  );

  return {
    total,
    subs: { spreadScore, commScore, levScore, instrScore, regScore: regScore * 100 }
  };
}
