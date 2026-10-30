export const CURRENCY = new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL',
  maximumFractionDigits: 0,
});

const DECIMAL = new Intl.NumberFormat('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 });

export const formatMWh = (kwh: number) => `${DECIMAL.format(kwh / 1000)} MWh`;
export const formatPercent = (value: number) => `${DECIMAL.format(value)}%`;
export const formatKWh = (kwh: number) => `${Math.round(kwh).toLocaleString('pt-BR')} kWh`;
