import { memo } from 'react';
import { CURRENCY, formatMWh } from '../lib/format';
import type { Unit } from '../types';

function UnitTable({ units }: { units: Unit[] }) {
  return (
    <div className="unit-table">
      {units.map((unit) => (
        <div key={unit.id} className="unit-row">
          <div>
            <strong>{unit.name}</strong>
            <small>{unit.area}</small>
          </div>
          <div>
            <strong>{formatMWh(unit.consumed)}</strong>
            <small>Consumo</small>
          </div>
          <div>
            <strong>{CURRENCY.format(unit.cost)}</strong>
            <small>Custo</small>
          </div>
          <div>
            <strong>{unit.efficiency}%</strong>
            <small>Eficiência</small>
          </div>
          <span className={`signal ${unit.status}`}>{unit.status}</span>
        </div>
      ))}
    </div>
  );
}

export default memo(UnitTable);
