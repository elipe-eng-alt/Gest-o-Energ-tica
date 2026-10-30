import { FileSpreadsheet, FileText } from 'lucide-react';
import { AlertList, PanelHead } from '../components/Controls';
import { PERIOD_LABELS } from '../data/demo';
import { STATUS_ORDER, savingsByStatus } from '../lib/energy';
import { CURRENCY, formatMWh, formatPercent } from '../lib/format';
import type { Opportunity, Period, Summary } from '../types';

type Props = {
  period: Period;
  unitFilter: string;
  summary: Summary;
  opportunities: Opportunity[];
  isGenerating: boolean;
  onGeneratePDF: () => void;
  onExportCSV: () => void;
};

export default function ReportsSection({ period, unitFilter, summary, opportunities, isGenerating, onGeneratePDF, onExportCSV }: Props) {
  const byStatus = savingsByStatus(opportunities);
  const realizedRate = summary.savingsPotential ? (summary.savingsRealized / summary.savingsPotential) * 100 : 0;

  return (
    <>
      <section className="panel section-gap">
        <PanelHead label="Relatórios" title="Resumo executivo">
          <div className="toolbar">
            <button type="button" className="secondary-button with-icon" onClick={onExportCSV}>
              <FileSpreadsheet size={16} /> Exportar CSV
            </button>
            <button type="button" className="primary-button with-icon" onClick={onGeneratePDF} disabled={isGenerating}>
              <FileText size={16} /> {isGenerating ? 'Gerando...' : 'Baixar PDF'}
            </button>
          </div>
        </PanelHead>
        <p className="muted report-scope">
          Escopo: {PERIOD_LABELS[period]} · Unidade: {unitFilter}
        </p>

        <AlertList
          alerts={[
            {
              level: 'crítico',
              title: 'Redução potencial identificada',
              detail: `${CURRENCY.format(summary.savingsPotential)} em economia mapeada em ${opportunities.length} ações.`,
            },
            {
              level: 'alto',
              title: 'Desperdício operacional',
              detail: `${formatMWh(summary.totalWaste)} (${formatPercent(summary.wasteRate)} do consumo) associados a perdas e standby.`,
            },
            {
              level: 'médio',
              title: 'Execução do plano',
              detail: `${formatPercent(realizedRate)} da economia potencial já foi capturada com ações concluídas.`,
            },
          ]}
        />
      </section>

      <section className="panel">
        <PanelHead label="Plano de ação" title="Economia por status" />
        <div className="status-bars">
          {STATUS_ORDER.map((status) => {
            const share = summary.savingsPotential ? (byStatus[status] / summary.savingsPotential) * 100 : 0;
            return (
              <div key={status} className="status-bar-row">
                <span className={`status-pill ${status.replace(' ', '-')}`}>{status}</span>
                <div className="progress-bar">
                  <span style={{ width: `${share}%` }} />
                </div>
                <strong>{CURRENCY.format(byStatus[status])}</strong>
              </div>
            );
          })}
        </div>
      </section>
    </>
  );
}
