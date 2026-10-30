import { useState, type FormEvent } from 'react';
import type { Opportunity, Priority, UnitOption } from '../types';

type Draft = {
  title: string;
  unit: string;
  potential: string;
  savings: string;
  priority: Priority;
  due: string;
  description: string;
};

const emptyDraft = (unit: string): Draft => ({
  title: '',
  unit,
  potential: '',
  savings: '',
  priority: 'media',
  due: '',
  description: '',
});

type Props = {
  units: UnitOption[];
  onCreate: (opportunity: Omit<Opportunity, 'id'>) => void;
  onCancel: () => void;
};

export default function OpportunityForm({ units, onCreate, onCancel }: Props) {
  const [draft, setDraft] = useState<Draft>(() => emptyDraft(units[0]?.name ?? ''));

  const update = <K extends keyof Draft>(field: K, value: Draft[K]) => setDraft((current) => ({ ...current, [field]: value }));

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const unit = units.find((item) => item.name === draft.unit) ?? units[0];
    if (!unit) return;
    onCreate({
      title: draft.title.trim(),
      unit: unit.name,
      sector: unit.sector,
      potential: Number(draft.potential),
      savings: Number(draft.savings),
      priority: draft.priority,
      status: 'pendente',
      due: draft.due ? new Date(`${draft.due}T00:00:00`).toLocaleDateString('pt-BR') : 'A definir',
      description: draft.description.trim(),
    });
    setDraft(emptyDraft(units[0]?.name ?? ''));
  };

  return (
    <form className="register-form opportunity-form" onSubmit={handleSubmit}>
      <div className="field-grid">
        <label className="span-2">
          <span>Título</span>
          <input type="text" value={draft.title} onChange={(event) => update('title', event.target.value)} required maxLength={120} />
        </label>
        <label>
          <span>Unidade</span>
          <select value={draft.unit} onChange={(event) => update('unit', event.target.value)}>
            {units.map((unit) => (
              <option key={unit.name} value={unit.name}>
                {unit.name}
              </option>
            ))}
          </select>
        </label>
        <label>
          <span>Prioridade</span>
          <select value={draft.priority} onChange={(event) => update('priority', event.target.value as Priority)}>
            <option value="alta">Alta</option>
            <option value="media">Média</option>
            <option value="baixa">Baixa</option>
          </select>
        </label>
        <label>
          <span>Impacto estimado (%)</span>
          <input
            type="number"
            min={0}
            max={100}
            value={draft.potential}
            onChange={(event) => update('potential', event.target.value)}
            required
          />
        </label>
        <label>
          <span>Economia estimada (R$)</span>
          <input type="number" min={0} step={100} value={draft.savings} onChange={(event) => update('savings', event.target.value)} required />
        </label>
        <label>
          <span>Prazo</span>
          <input type="date" value={draft.due} onChange={(event) => update('due', event.target.value)} />
        </label>
        <label className="span-2">
          <span>Descrição</span>
          <textarea rows={3} value={draft.description} onChange={(event) => update('description', event.target.value)} required />
        </label>
      </div>
      <div className="form-actions">
        <button type="submit" className="primary-button">
          Adicionar oportunidade
        </button>
        <button type="button" className="secondary-button" onClick={onCancel}>
          Cancelar
        </button>
      </div>
    </form>
  );
}
