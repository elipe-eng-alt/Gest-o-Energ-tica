import { memo } from 'react';
import { Trash2 } from 'lucide-react';
import { CURRENCY } from '../lib/format';
import type { Opportunity, Priority } from '../types';

const PRIORITY_COLORS: Record<Priority, string> = {
  alta: '#d9452f',
  media: '#b77200',
  baixa: '#1f8a5f',
};

type Props = {
  opportunities: Opportunity[];
  onAdvance: (id: number) => void;
  onRemove?: (id: number) => void;
};

function OpportunityList({ opportunities, onAdvance, onRemove }: Props) {
  if (!opportunities.length) {
    return <p className="empty-state">Nenhuma oportunidade encontrada com os filtros atuais.</p>;
  }

  return (
    <div className="opportunity-list">
      {opportunities.map((opportunity) => (
        <div key={opportunity.id} className="opportunity-item">
          <div className="opportunity-main">
            <div className="title-group">
              <span
                className="badge priority"
                style={{ background: `${PRIORITY_COLORS[opportunity.priority]}1f`, color: PRIORITY_COLORS[opportunity.priority] }}
              >
                {opportunity.priority}
              </span>
              <h4>{opportunity.title}</h4>
            </div>
            <p>{opportunity.description}</p>
          </div>

          <div className="meta-grid">
            <div>
              <small>Unidade</small>
              <strong>{opportunity.unit}</strong>
            </div>
            <div>
              <small>Impacto</small>
              <strong>{opportunity.potential}%</strong>
            </div>
            <div>
              <small>Economia</small>
              <strong>{CURRENCY.format(opportunity.savings)}</strong>
            </div>
            <div>
              <small>Prazo</small>
              <strong>{opportunity.due}</strong>
            </div>
          </div>

          <div className="opportunity-footer">
            <span className={`status-pill ${opportunity.status.replace(' ', '-')}`}>{opportunity.status}</span>
            <div className="footer-actions">
              {onRemove && (
                <button
                  type="button"
                  className="icon-button"
                  aria-label={`Remover ${opportunity.title}`}
                  title="Remover"
                  onClick={() => onRemove(opportunity.id)}
                >
                  <Trash2 size={16} />
                </button>
              )}
              <button type="button" className="secondary-button" onClick={() => onAdvance(opportunity.id)}>
                {opportunity.status === 'concluída' ? 'Reabrir' : 'Avançar status'}
              </button>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

export default memo(OpportunityList);
