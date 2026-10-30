export type Status = 'pendente' | 'em andamento' | 'concluída';
export type Priority = 'alta' | 'media' | 'baixa';
export type NavSection = 'dashboard' | 'lancamentos' | 'oportunidades' | 'unidades' | 'relatorios' | 'cadastro' | 'entrar' | 'redefinir';

export type PeriodOption = { id: string; short: string; label: string };

export type Unit = {
  id: string;
  name: string;
  area: string;
  consumed: number;
  cost: number;
  efficiency: number;
  status: 'ok' | 'alerta' | 'risco' | 'sem-dados';
};

export type Opportunity = {
  id: number;
  title: string;
  unit: string;
  sector: string;
  potential: number;
  savings: number;
  priority: Priority;
  status: Status;
  due: string;
  description: string;
};

export type AlertItem = {
  id: number;
  title: string;
  level: 'crítico' | 'alto' | 'médio';
  detail: string;
};

export type EnergyPoint = {
  month: string;
  consumo: number;
  desperdicio: number;
  custo: number;
};

export type MixItem = { name: string; value: number; color: string };

export type Summary = {
  totalConsumption: number;
  totalWaste: number;
  totalCost: number;
  savingsPotential: number;
  savingsRealized: number;
  wasteRate: number;
};

export type User = { id: number; name: string; companyName: string; email: string };

export type CompanyUnit = { id: number; name: string; sector: string };

/** Lançamento mensal de uma unidade (dados da fatura de energia). */
export type Reading = {
  id: number;
  unitId: number;
  month: string;
  consumptionKwh: number;
  cost: number;
  peakKwh: number | null;
  demandKw: number | null;
  offHoursKwh: number | null;
  notes: string;
};

export type CompanyOpportunity = Opportunity & { unitId: number | null };

export type CompanyData = {
  units: CompanyUnit[];
  readings: Reading[];
  opportunities: CompanyOpportunity[];
};

/** Unidade como aparece em formulários (nome e setor). */
export type UnitOption = { name: string; sector: string };
