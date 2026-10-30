export type Period = '7d' | '30d' | '90d' | '12m';
export type Status = 'pendente' | 'em andamento' | 'concluída';
export type Priority = 'alta' | 'media' | 'baixa';
export type NavSection = 'dashboard' | 'oportunidades' | 'unidades' | 'relatorios' | 'cadastro';

export type Unit = {
  id: string;
  name: string;
  area: string;
  consumed: number;
  cost: number;
  efficiency: number;
  status: 'ok' | 'alerta' | 'risco';
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

export type Summary = {
  totalConsumption: number;
  totalWaste: number;
  totalCost: number;
  savingsPotential: number;
  savingsRealized: number;
  wasteRate: number;
};
