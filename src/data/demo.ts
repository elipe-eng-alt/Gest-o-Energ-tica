import type { AlertItem, EnergyPoint, MixItem, Opportunity, PeriodOption, Unit } from '../types';

export type DemoPeriod = '7d' | '30d' | '90d' | '12m';

export const UNITS: Unit[] = [
  { id: 'matriz', name: 'Matriz Industrial', area: 'Produção', consumed: 12840, cost: 36420, efficiency: 82, status: 'alerta' },
  { id: 'logistica', name: 'Logística Norte', area: 'Armazém', consumed: 9420, cost: 26170, efficiency: 76, status: 'risco' },
  { id: 'oficina', name: 'Oficina Técnica', area: 'Manutenção', consumed: 6230, cost: 17690, efficiency: 88, status: 'ok' },
  { id: 'cobertura', name: 'Cobertura Comercial', area: 'Vendas', consumed: 4810, cost: 13320, efficiency: 91, status: 'ok' },
];

export const ALL_UNITS = 'Todos';

export const INITIAL_OPPORTUNITIES: Opportunity[] = [
  {
    id: 1,
    title: 'Troca de iluminação por LEDs em linha de produção',
    unit: 'Matriz Industrial',
    sector: 'Produção',
    potential: 18,
    savings: 18400,
    priority: 'alta',
    status: 'em andamento',
    due: '12 dias',
    description: 'Substituição dos pontos de luz antigos por luminárias LED com sensores de presença.',
  },
  {
    id: 2,
    title: 'Ajuste de horário da climatização em armazém',
    unit: 'Logística Norte',
    sector: 'Armazém',
    potential: 26,
    savings: 21600,
    priority: 'alta',
    status: 'pendente',
    due: '4 dias',
    description: 'Redução de operação fora do horário útil e manutenção de filtros.',
  },
  {
    id: 3,
    title: 'Manutenção preventiva em compressores',
    unit: 'Oficina Técnica',
    sector: 'Manutenção',
    potential: 14,
    savings: 9700,
    priority: 'media',
    status: 'concluída',
    due: 'Concluído',
    description: 'Correção de vazamentos e revisão de pressões em compressores.',
  },
  {
    id: 4,
    title: 'Automação de corte de energia em áreas ociosas',
    unit: 'Cobertura Comercial',
    sector: 'Vendas',
    potential: 11,
    savings: 6300,
    priority: 'baixa',
    status: 'pendente',
    due: '20 dias',
    description: 'Programação de desligamento automático em setores sem ocupação.',
  },
];

export const ALERTS: AlertItem[] = [
  { id: 1, title: 'Pico de consumo em armazém', level: 'crítico', detail: 'Consumo 28% acima da média no período noturno.' },
  { id: 2, title: 'Desbalanceamento de demanda', level: 'alto', detail: 'Cargas em horário de pico elevadas em 3 setores.' },
  { id: 3, title: 'Máquinas inativas com energia residual', level: 'médio', detail: 'Trechos de produção em standby sem desligamento automático.' },
];

export const DEMO_PERIODS: (PeriodOption & { id: DemoPeriod })[] = [
  { id: '7d', short: '7d', label: 'Últimos 7 dias' },
  { id: '30d', short: '30d', label: 'Últimos 30 dias' },
  { id: '90d', short: '90d', label: 'Últimos 90 dias' },
  { id: '12m', short: '12m', label: 'Últimos 12 meses' },
];

export const CHART_DATA: Record<DemoPeriod, EnergyPoint[]> = {
  '7d': [
    { month: 'Seg', consumo: 2210, desperdicio: 430, custo: 6340 },
    { month: 'Ter', consumo: 2540, desperdicio: 510, custo: 6960 },
    { month: 'Qua', consumo: 2410, desperdicio: 520, custo: 6650 },
    { month: 'Qui', consumo: 2660, desperdicio: 560, custo: 7190 },
    { month: 'Sex', consumo: 2890, desperdicio: 610, custo: 7840 },
    { month: 'Sáb', consumo: 1970, desperdicio: 360, custo: 5510 },
    { month: 'Dom', consumo: 1820, desperdicio: 280, custo: 5050 },
  ],
  '30d': [
    { month: 'Jan', consumo: 21600, desperdicio: 4200, custo: 61200 },
    { month: 'Fev', consumo: 22840, desperdicio: 4360, custo: 64300 },
    { month: 'Mar', consumo: 24180, desperdicio: 4680, custo: 67100 },
    { month: 'Abr', consumo: 25020, desperdicio: 4920, custo: 70850 },
    { month: 'Mai', consumo: 26330, desperdicio: 5200, custo: 73600 },
    { month: 'Jun', consumo: 27140, desperdicio: 5480, custo: 74980 },
  ],
  '90d': [
    { month: 'Jan', consumo: 67000, desperdicio: 13600, custo: 189000 },
    { month: 'Fev', consumo: 69600, desperdicio: 14120, custo: 193800 },
    { month: 'Mar', consumo: 73500, desperdicio: 15840, custo: 206000 },
    { month: 'Abr', consumo: 75220, desperdicio: 16750, custo: 212400 },
    { month: 'Mai', consumo: 77460, desperdicio: 17220, custo: 218300 },
    { month: 'Jun', consumo: 79800, desperdicio: 18100, custo: 223500 },
  ],
  '12m': [
    { month: 'Jan', consumo: 268400, desperdicio: 50000, custo: 740000 },
    { month: 'Fev', consumo: 274200, desperdicio: 51500, custo: 755000 },
    { month: 'Mar', consumo: 281100, desperdicio: 52900, custo: 769000 },
    { month: 'Abr', consumo: 287600, desperdicio: 54400, custo: 782000 },
    { month: 'Mai', consumo: 293800, desperdicio: 56200, custo: 798000 },
    { month: 'Jun', consumo: 301200, desperdicio: 57900, custo: 812000 },
  ],
};

export const CONSUMPTION_MIX: MixItem[] = [
  { name: 'Uso produtivo', value: 68, color: '#38b984' },
  { name: 'Desperdício', value: 21, color: '#ef6d5a' },
  { name: 'Standby', value: 11, color: '#f4d35e' },
];
