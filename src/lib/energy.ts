import { ALL_UNITS, UNITS } from '../data/demo';
import type { EnergyPoint, Opportunity, Status, Summary } from '../types';

export const STATUS_ORDER: Status[] = ['pendente', 'em andamento', 'concluída'];

const TOTAL_UNIT_CONSUMPTION = UNITS.reduce((total, unit) => total + unit.consumed, 0);

/** Proporção do consumo total atribuída à unidade selecionada (1 para "Todos"). */
export function unitShare(unitName: string) {
  if (unitName === ALL_UNITS) return 1;
  const unit = UNITS.find((item) => item.name === unitName);
  return unit ? unit.consumed / TOTAL_UNIT_CONSUMPTION : 1;
}

export function scaleSeries(series: EnergyPoint[], share: number): EnergyPoint[] {
  if (share === 1) return series;
  return series.map((point) => ({
    month: point.month,
    consumo: Math.round(point.consumo * share),
    desperdicio: Math.round(point.desperdicio * share),
    custo: Math.round(point.custo * share),
  }));
}

export function matchesUnit(opportunity: Opportunity, unitName: string) {
  return unitName === ALL_UNITS || opportunity.unit === unitName;
}

export function computeSummary(series: EnergyPoint[], opportunities: Opportunity[]): Summary {
  let totalConsumption = 0;
  let totalWaste = 0;
  let totalCost = 0;
  for (const point of series) {
    totalConsumption += point.consumo;
    totalWaste += point.desperdicio;
    totalCost += point.custo;
  }

  let savingsPotential = 0;
  let savingsRealized = 0;
  for (const opportunity of opportunities) {
    savingsPotential += opportunity.savings;
    if (opportunity.status === 'concluída') savingsRealized += opportunity.savings;
  }

  return {
    totalConsumption,
    totalWaste,
    totalCost,
    savingsPotential,
    savingsRealized,
    wasteRate: totalConsumption ? (totalWaste / totalConsumption) * 100 : 0,
  };
}

export function nextStatus(status: Status): Status {
  return STATUS_ORDER[(STATUS_ORDER.indexOf(status) + 1) % STATUS_ORDER.length];
}

export function savingsByStatus(opportunities: Opportunity[]) {
  const totals: Record<Status, number> = { pendente: 0, 'em andamento': 0, concluída: 0 };
  for (const opportunity of opportunities) totals[opportunity.status] += opportunity.savings;
  return totals;
}

export function isOpportunityList(value: unknown): value is Opportunity[] {
  return (
    Array.isArray(value) &&
    value.length > 0 &&
    value.every(
      (item) =>
        typeof item === 'object' &&
        item !== null &&
        typeof item.id === 'number' &&
        typeof item.title === 'string' &&
        typeof item.savings === 'number' &&
        STATUS_ORDER.includes(item.status),
    )
  );
}
