import { ALL_UNITS } from '../data/demo';
import type { AlertItem, CompanyData, EnergyPoint, MixItem, PeriodOption, Reading, Unit } from '../types';
import { formatPercent } from './format';

export const COMPANY_PERIODS: (PeriodOption & { months: number })[] = [
  { id: '3m', short: '3m', label: 'Últimos 3 meses', months: 3 },
  { id: '6m', short: '6m', label: 'Últimos 6 meses', months: 6 },
  { id: '12m', short: '12m', label: 'Últimos 12 meses', months: 12 },
  { id: 'tudo', short: 'Tudo', label: 'Todo o histórico', months: Number.POSITIVE_INFINITY },
];

const MONTH_NAMES = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];

/** '2026-08' → 'ago/26' */
export const monthLabel = (month: string) => `${MONTH_NAMES[Number(month.slice(5, 7)) - 1]}/${month.slice(2, 4)}`;
const monthIndex = (month: string) => Number(month.slice(0, 4)) * 12 + Number(month.slice(5, 7)) - 1;

/** Eficiência = parcela do consumo que não foi desperdiçada (fora do expediente/standby). */
const efficiencyOf = (consumption: number, waste: number) => (consumption ? Math.round((1 - waste / consumption) * 100) : 0);

function statusOf(efficiency: number, hasData: boolean): Unit['status'] {
  if (!hasData) return 'sem-dados';
  if (efficiency >= 85) return 'ok';
  return efficiency >= 75 ? 'alerta' : 'risco';
}

/** Lançamentos dentro da janela do período (contada a partir do mês mais recente da empresa) e da unidade filtrada. */
export function readingsInPeriod(data: CompanyData, periodId: string, unitFilter: string): Reading[] {
  if (!data.readings.length) return [];
  const period = COMPANY_PERIODS.find((item) => item.id === periodId) ?? COMPANY_PERIODS[2];
  const latest = Math.max(...data.readings.map((reading) => monthIndex(reading.month)));
  const unit = unitFilter === ALL_UNITS ? null : data.units.find((item) => item.name === unitFilter);

  return data.readings.filter(
    (reading) => latest - monthIndex(reading.month) < period.months && (!unit || reading.unitId === unit.id),
  );
}

export function buildSeries(readings: Reading[]): EnergyPoint[] {
  const byMonth = new Map<string, EnergyPoint>();
  for (const reading of [...readings].sort((a, b) => a.month.localeCompare(b.month))) {
    const point = byMonth.get(reading.month) ?? { month: monthLabel(reading.month), consumo: 0, desperdicio: 0, custo: 0 };
    point.consumo += reading.consumptionKwh;
    point.desperdicio += reading.offHoursKwh ?? 0;
    point.custo += reading.cost;
    byMonth.set(reading.month, point);
  }
  return [...byMonth.values()];
}

export function buildUnitStats(data: CompanyData, readings: Reading[]): Unit[] {
  return data.units.map((unit) => {
    let consumed = 0;
    let cost = 0;
    let waste = 0;
    let count = 0;
    for (const reading of readings) {
      if (reading.unitId !== unit.id) continue;
      consumed += reading.consumptionKwh;
      cost += reading.cost;
      waste += reading.offHoursKwh ?? 0;
      count += 1;
    }
    const efficiency = efficiencyOf(consumed, waste);
    return {
      id: String(unit.id),
      name: unit.name,
      area: unit.sector || 'Sem setor',
      consumed,
      cost,
      efficiency,
      status: statusOf(efficiency, count > 0),
    };
  });
}

export function buildMix(series: EnergyPoint[]): MixItem[] {
  const consumption = series.reduce((total, point) => total + point.consumo, 0);
  if (!consumption) return [];
  const waste = series.reduce((total, point) => total + point.desperdicio, 0);
  const wasteShare = Math.round((waste / consumption) * 100);
  return [
    { name: 'Uso produtivo', value: 100 - wasteShare, color: '#38b984' },
    { name: 'Fora do expediente / standby', value: wasteShare, color: '#ef6d5a' },
  ];
}

/** Alertas calculados a partir do lançamento mais recente de cada unidade. */
export function buildAlerts(data: CompanyData): AlertItem[] {
  const alerts: AlertItem[] = [];
  const push = (level: AlertItem['level'], title: string, detail: string) => alerts.push({ id: alerts.length + 1, level, title, detail });

  for (const unit of data.units) {
    const readings = data.readings.filter((reading) => reading.unitId === unit.id).sort((a, b) => a.month.localeCompare(b.month));
    const latest = readings[readings.length - 1];
    const previous = readings[readings.length - 2];

    if (!latest) {
      push('médio', `Sem lançamentos: ${unit.name}`, 'Lance o consumo mensal para acompanhar esta unidade.');
      continue;
    }

    const wasteShare = ((latest.offHoursKwh ?? 0) / latest.consumptionKwh) * 100;
    if (wasteShare > 20) {
      push('crítico', `Desperdício elevado: ${unit.name}`, `${formatPercent(wasteShare)} do consumo de ${monthLabel(latest.month)} foi fora do expediente ou em standby.`);
    }

    if (previous && latest.consumptionKwh > previous.consumptionKwh * 1.1) {
      const growth = (latest.consumptionKwh / previous.consumptionKwh - 1) * 100;
      push('alto', `Consumo em alta: ${unit.name}`, `${formatPercent(growth)} acima de ${monthLabel(previous.month)} em ${monthLabel(latest.month)}.`);
    }

    const peakShare = ((latest.peakKwh ?? 0) / latest.consumptionKwh) * 100;
    if (peakShare > 25) {
      push('médio', `Uso alto no horário de ponta: ${unit.name}`, `${formatPercent(peakShare)} do consumo de ${monthLabel(latest.month)} ocorreu na ponta, quando a tarifa é mais cara.`);
    }
  }

  const order = { crítico: 0, alto: 1, médio: 2 };
  return alerts.sort((a, b) => order[a.level] - order[b.level]);
}
