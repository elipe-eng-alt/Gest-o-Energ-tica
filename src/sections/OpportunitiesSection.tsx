import { useMemo, useState } from 'react';
import { Plus, RotateCcw } from 'lucide-react';
import { PanelHead, SearchBox, UnitSelect } from '../components/Controls';
import OpportunityForm from '../components/OpportunityForm';
import OpportunityList from '../components/OpportunityList';
import { STATUS_ORDER } from '../lib/energy';
import { CURRENCY } from '../lib/format';
import type { Opportunity, Priority, Status } from '../types';

type Props = {
  opportunities: Opportunity[];
  unitFilter: string;
  onUnitFilterChange: (value: string) => void;
  search: string;
  onSearchChange: (value: string) => void;
  onAdvance: (id: number) => void;
  onRemove: (id: number) => void;
  onCreate: (opportunity: Omit<Opportunity, 'id'>) => void;
  onReset: () => void;
};

const PRIORITIES: Priority[] = ['alta', 'media', 'baixa'];

export default function OpportunitiesSection({
  opportunities,
  unitFilter,
  onUnitFilterChange,
  search,
  onSearchChange,
  onAdvance,
  onRemove,
  onCreate,
  onReset,
}: Props) {
  const [statusFilter, setStatusFilter] = useState<Status | 'todos'>('todos');
  const [priorityFilter, setPriorityFilter] = useState<Priority | 'todas'>('todas');
  const [showForm, setShowForm] = useState(false);

  const visible = useMemo(
    () =>
      opportunities.filter(
        (item) => (statusFilter === 'todos' || item.status === statusFilter) && (priorityFilter === 'todas' || item.priority === priorityFilter),
      ),
    [opportunities, statusFilter, priorityFilter],
  );

  const statusCounts = useMemo(() => {
    const counts: Record<Status, number> = { pendente: 0, 'em andamento': 0, concluída: 0 };
    for (const item of opportunities) counts[item.status] += 1;
    return counts;
  }, [opportunities]);

  const visibleSavings = visible.reduce((total, item) => total + item.savings, 0);

  const handleCreate = (opportunity: Omit<Opportunity, 'id'>) => {
    onCreate(opportunity);
    setShowForm(false);
  };

  const handleReset = () => {
    if (window.confirm('Restaurar as oportunidades de demonstração? As alterações locais serão perdidas.')) onReset();
  };

  return (
    <section className="panel">
      <PanelHead label="Oportunidades" title="Prioridade de ação">
        <div className="toolbar">
          <SearchBox value={search} onChange={onSearchChange} />
          <UnitSelect id="opportunities-unit" value={unitFilter} onChange={onUnitFilterChange} />
        </div>
      </PanelHead>

      <div className="filter-row">
        <div className="chip-group" role="group" aria-label="Filtrar por status">
          <button type="button" className={`chip ${statusFilter === 'todos' ? 'selected' : ''}`} onClick={() => setStatusFilter('todos')}>
            Todos ({opportunities.length})
          </button>
          {STATUS_ORDER.map((status) => (
            <button
              key={status}
              type="button"
              className={`chip ${statusFilter === status ? 'selected' : ''}`}
              onClick={() => setStatusFilter(status)}
            >
              {status} ({statusCounts[status]})
            </button>
          ))}
        </div>
        <div className="select-wrap">
          <label htmlFor="priority-filter">Prioridade</label>
          <select id="priority-filter" value={priorityFilter} onChange={(event) => setPriorityFilter(event.target.value as Priority | 'todas')}>
            <option value="todas">Todas</option>
            {PRIORITIES.map((priority) => (
              <option key={priority} value={priority}>
                {priority}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="list-actions">
        <span className="muted">
          {visible.length} {visible.length === 1 ? 'oportunidade' : 'oportunidades'} · {CURRENCY.format(visibleSavings)} em economia estimada
        </span>
        <div className="footer-actions">
          <button type="button" className="secondary-button with-icon" onClick={handleReset}>
            <RotateCcw size={15} /> Restaurar demo
          </button>
          {!showForm && (
            <button type="button" className="primary-button with-icon" onClick={() => setShowForm(true)}>
              <Plus size={16} /> Nova oportunidade
            </button>
          )}
        </div>
      </div>

      {showForm && <OpportunityForm onCreate={handleCreate} onCancel={() => setShowForm(false)} />}

      <OpportunityList opportunities={visible} onAdvance={onAdvance} onRemove={onRemove} />
    </section>
  );
}
