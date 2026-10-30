import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { CURRENCY, formatKWh } from '../lib/format';
import type { EnergyPoint, MixItem, Unit } from '../types';

const compactNumber = new Intl.NumberFormat('pt-BR', { notation: 'compact' });
const formatAxis = (value: number) => compactNumber.format(value);

const SERIES_LABELS: Record<string, string> = { consumo: 'Consumo', desperdicio: 'Desperdício' };

export function ConsumptionChart({ data }: { data: EnergyPoint[] }) {
  return (
    <ResponsiveContainer width="100%" height={280}>
      <AreaChart data={data}>
        <defs>
          <linearGradient id="energyFill" x1="0" x2="0" y1="0" y2="1">
            <stop offset="5%" stopColor="#38b984" stopOpacity={0.5} />
            <stop offset="95%" stopColor="#38b984" stopOpacity={0.04} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="4 4" vertical={false} />
        <XAxis dataKey="month" tickLine={false} axisLine={false} />
        <YAxis tickLine={false} axisLine={false} tickFormatter={formatAxis} width={60} />
        <Tooltip formatter={(value: number, name: string) => [formatKWh(value), SERIES_LABELS[name] ?? name]} />
        <Legend formatter={(name: string) => SERIES_LABELS[name] ?? name} iconType="circle" />
        <Area type="monotone" dataKey="consumo" stroke="#2b8a67" fill="url(#energyFill)" strokeWidth={3} />
        <Area type="monotone" dataKey="desperdicio" stroke="#ef6d5a" fill="transparent" strokeWidth={2} />
      </AreaChart>
    </ResponsiveContainer>
  );
}

export function ConsumptionMixChart({ data }: { data: MixItem[] }) {
  return (
    <ResponsiveContainer width="100%" height={200}>
      <PieChart>
        <Pie data={data} dataKey="value" innerRadius={50} outerRadius={76} paddingAngle={4}>
          {data.map((entry) => (
            <Cell key={entry.name} fill={entry.color} />
          ))}
        </Pie>
        <Tooltip formatter={(value: number) => `${value}%`} />
      </PieChart>
    </ResponsiveContainer>
  );
}

export function CostChart({ data }: { data: EnergyPoint[] }) {
  return (
    <ResponsiveContainer width="100%" height={220}>
      <BarChart data={data}>
        <CartesianGrid strokeDasharray="4 4" vertical={false} />
        <XAxis dataKey="month" tickLine={false} axisLine={false} />
        <YAxis tickLine={false} axisLine={false} tickFormatter={formatAxis} width={60} />
        <Tooltip formatter={(value: number) => [CURRENCY.format(value), 'Custo']} />
        <Bar dataKey="custo" radius={[10, 10, 0, 0]} fill="#6a7cff" />
      </BarChart>
    </ResponsiveContainer>
  );
}

const EFFICIENCY_COLORS: Record<Unit['status'], string> = {
  ok: '#38b984',
  alerta: '#f6b14a',
  risco: '#ef6d5a',
  'sem-dados': '#9cb0a8',
};

export function EfficiencyChart({ units }: { units: Unit[] }) {
  return (
    <ResponsiveContainer width="100%" height={220}>
      <BarChart data={units} layout="vertical" margin={{ left: 8, right: 16 }}>
        <CartesianGrid strokeDasharray="4 4" horizontal={false} />
        <XAxis type="number" domain={[0, 100]} tickLine={false} axisLine={false} unit="%" />
        <YAxis type="category" dataKey="name" tickLine={false} axisLine={false} width={140} />
        <Tooltip formatter={(value: number) => [`${value}%`, 'Eficiência']} />
        <Bar dataKey="efficiency" radius={[0, 10, 10, 0]} barSize={22}>
          {units.map((unit) => (
            <Cell key={unit.id} fill={EFFICIENCY_COLORS[unit.status]} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
