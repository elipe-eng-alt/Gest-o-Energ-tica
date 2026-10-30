import type { ReactNode } from 'react';
import { AlertTriangle, Search } from 'lucide-react';
import type { AlertItem } from '../types';

type UnitSelectProps = { id: string; value: string; options: string[]; onChange: (value: string) => void };

export function UnitSelect({ id, value, options, onChange }: UnitSelectProps) {
  return (
    <div className="select-wrap">
      <label htmlFor={id}>Unidade</label>
      <select id={id} value={value} onChange={(event) => onChange(event.target.value)}>
        {options.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
    </div>
  );
}

export function SearchBox({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  return (
    <div className="search-box">
      <Search size={15} />
      <input
        type="search"
        placeholder="Buscar oportunidade"
        aria-label="Buscar oportunidade"
        value={value}
        onChange={(event) => onChange(event.target.value)}
      />
    </div>
  );
}

export function AlertList({ alerts }: { alerts: Pick<AlertItem, 'title' | 'detail' | 'level'>[] }) {
  if (!alerts.length) {
    return <p className="empty-state">Nenhum alerta no momento.</p>;
  }

  return (
    <div className="alert-list">
      {alerts.map((alert) => (
        <div key={alert.title} className="alert-item">
          <div className={`alert-icon ${alert.level}`}>
            <AlertTriangle size={16} />
          </div>
          <div>
            <strong>{alert.title}</strong>
            <p>{alert.detail}</p>
          </div>
        </div>
      ))}
    </div>
  );
}

export function PanelHead({ label, title, children }: { label: string; title: string; children?: ReactNode }) {
  return (
    <div className="panel-head">
      <div>
        <p className="label">{label}</p>
        <h3>{title}</h3>
      </div>
      {children}
    </div>
  );
}
