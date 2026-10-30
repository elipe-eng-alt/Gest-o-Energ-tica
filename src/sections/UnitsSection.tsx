import { EfficiencyChart } from '../components/Charts';
import { PanelHead, UnitSelect } from '../components/Controls';
import UnitTable from '../components/UnitTable';
import { CURRENCY, formatMWh } from '../lib/format';
import type { Opportunity, Unit } from '../types';

type Props = {
  units: Unit[];
  opportunities: Opportunity[];
  unitOptions: string[];
  unitFilter: string;
  onUnitFilterChange: (value: string) => void;
};

export default function UnitsSection({ units, opportunities, unitOptions, unitFilter, onUnitFilterChange }: Props) {
  return (
    <>
      <section className="panel section-gap">
        <PanelHead label="Unidades" title="Performance por setor">
          <UnitSelect id="units-unit" value={unitFilter} options={unitOptions} onChange={onUnitFilterChange} />
        </PanelHead>
        <UnitTable units={units} />
      </section>

      <section className="bottom-grid">
        <article className="panel">
          <PanelHead label="Eficiência" title="Índice por unidade" />
          <div className="chart-wrap small-chart">
            <EfficiencyChart units={units} />
          </div>
        </article>

        <article className="panel">
          <PanelHead label="Oportunidades" title="Economia por unidade" />
          <div className="unit-table">
            {units.map((unit) => {
              const related = opportunities.filter((item) => item.unit === unit.name);
              const savings = related.reduce((total, item) => total + item.savings, 0);
              return (
                <div key={unit.id} className="unit-row compact-row">
                  <div>
                    <strong>{unit.name}</strong>
                    <small>{formatMWh(unit.consumed)} consumidos</small>
                  </div>
                  <div>
                    <strong>{related.length}</strong>
                    <small>Ações</small>
                  </div>
                  <div>
                    <strong>{CURRENCY.format(savings)}</strong>
                    <small>Economia potencial</small>
                  </div>
                </div>
              );
            })}
          </div>
        </article>
      </section>
    </>
  );
}
