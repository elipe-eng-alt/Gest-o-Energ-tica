import { Activity, ArrowUpRight, CircleDollarSign, Leaf, Zap } from 'lucide-react';
import { ConsumptionChart, ConsumptionMixChart, CostChart } from '../components/Charts';
import { AlertList, PanelHead, SearchBox, UnitSelect } from '../components/Controls';
import OpportunityList from '../components/OpportunityList';
import UnitTable from '../components/UnitTable';
import { ALERTS, CONSUMPTION_MIX } from '../data/demo';
import { CURRENCY, formatMWh, formatPercent } from '../lib/format';
import type { EnergyPoint, Opportunity, Summary, Unit } from '../types';

type Props = {
  series: EnergyPoint[];
  summary: Summary;
  units: Unit[];
  opportunities: Opportunity[];
  unitFilter: string;
  onUnitFilterChange: (value: string) => void;
  search: string;
  onSearchChange: (value: string) => void;
  onAdvance: (id: number) => void;
};

function trendLabel(series: EnergyPoint[]) {
  if (series.length < 2 || !series[0].consumo) return 'Sem histórico suficiente';
  const change = ((series[series.length - 1].consumo - series[0].consumo) / series[0].consumo) * 100;
  return `${change >= 0 ? '+' : ''}${formatPercent(change)} do início ao fim do período`;
}

export default function DashboardSection({
  series,
  summary,
  units,
  opportunities,
  unitFilter,
  onUnitFilterChange,
  search,
  onSearchChange,
  onAdvance,
}: Props) {
  const kpis = [
    { label: 'Consumo total', value: formatMWh(summary.totalConsumption), detail: trendLabel(series), icon: <Zap size={18} />, tone: 'green' },
    {
      label: 'Custo energético',
      value: CURRENCY.format(summary.totalCost),
      detail: 'Custos com contratos e demanda',
      icon: <CircleDollarSign size={18} />,
      tone: 'amber',
    },
    {
      label: 'Desperdício estimado',
      value: formatMWh(summary.totalWaste),
      detail: `${formatPercent(summary.wasteRate)} da operação`,
      icon: <Activity size={18} />,
      tone: 'red',
    },
    {
      label: 'Potencial de economia',
      value: CURRENCY.format(summary.savingsPotential),
      detail: `${CURRENCY.format(summary.savingsRealized)} já realizados`,
      icon: <Leaf size={18} />,
      tone: 'blue',
    },
  ];

  return (
    <>
      <section className="kpi-grid">
        {kpis.map((kpi) => (
          <article key={kpi.label} className={`kpi-card ${kpi.tone}`}>
            <div className="kpi-icon">{kpi.icon}</div>
            <div>
              <span>{kpi.label}</span>
              <strong>{kpi.value}</strong>
              <small>{kpi.detail}</small>
            </div>
          </article>
        ))}
      </section>

      <section className="panel-grid main-panel-grid">
        <article className="panel large-panel">
          <PanelHead label="Evolução de consumo" title="Energia x desperdício">
            <UnitSelect id="dashboard-unit" value={unitFilter} onChange={onUnitFilterChange} />
          </PanelHead>
          <div className="chart-wrap">
            <ConsumptionChart data={series} />
          </div>
        </article>

        <article className="panel side-panel">
          <PanelHead label="Mix de consumo" title="Distribuição" />
          <div className="pie-chart-wrap">
            <ConsumptionMixChart />
          </div>
          <ul className="legend-list">
            {CONSUMPTION_MIX.map((item) => (
              <li key={item.name}>
                <span className="legend-dot" style={{ background: item.color }} />
                {item.name}
                <strong>{item.value}%</strong>
              </li>
            ))}
          </ul>
        </article>
      </section>

      <section className="panel-row">
        <article className="panel large-panel">
          <PanelHead label="Oportunidades" title="Prioridade de ação">
            <SearchBox value={search} onChange={onSearchChange} />
          </PanelHead>
          <OpportunityList opportunities={opportunities} onAdvance={onAdvance} />
        </article>

        <article className="panel side-panel">
          <PanelHead label="Alertas ativos" title="Monitoramento" />
          <AlertList alerts={ALERTS} />
        </article>
      </section>

      <section className="bottom-grid">
        <article className="panel">
          <PanelHead label="Unidades" title="Performance por setor" />
          <UnitTable units={units} />
        </article>

        <article className="panel">
          <PanelHead label="Custo por período" title="Comparativo financeiro" />
          <div className="chart-wrap small-chart">
            <CostChart data={series} />
          </div>
        </article>
      </section>

      <footer className="footer-row">
        <div className="footer-balance">
          <ArrowUpRight size={16} />
          <span>
            Economia potencial identificada: <strong>{CURRENCY.format(summary.savingsPotential)}</strong>
          </span>
        </div>
      </footer>
    </>
  );
}
