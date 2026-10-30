import { useMemo, useState, type FormEvent } from 'react';
import { Pencil, Trash2 } from 'lucide-react';
import { PanelHead } from '../components/Controls';
import { errorMessage } from '../lib/api';
import { monthLabel } from '../lib/company';
import { CURRENCY } from '../lib/format';
import type { CompanyData, Reading } from '../types';

type Props = {
  data: CompanyData;
  mutate: (method: string, path: string, body?: unknown) => Promise<CompanyData>;
};

type ReadingDraft = {
  unitId: string;
  month: string;
  consumptionKwh: string;
  cost: string;
  peakKwh: string;
  demandKw: string;
  offHoursKwh: string;
  notes: string;
  /** Lançamento já salvo cujos valores estão no formulário. */
  loadedId?: number;
};

type Feedback = { type: 'success' | 'error'; message: string } | null;

const NUMBER = new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 0 });
const PRICE = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: 2 });

function previousMonth() {
  const date = new Date();
  date.setDate(1);
  date.setMonth(date.getMonth() - 1);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
}

const emptyReading = (unitId: string): ReadingDraft => ({
  unitId,
  month: previousMonth(),
  consumptionKwh: '',
  cost: '',
  peakKwh: '',
  demandKw: '',
  offHoursKwh: '',
  notes: '',
});

const toDraft = (reading: Reading): ReadingDraft => ({
  unitId: String(reading.unitId),
  month: reading.month,
  consumptionKwh: String(reading.consumptionKwh),
  cost: String(reading.cost),
  peakKwh: reading.peakKwh === null ? '' : String(reading.peakKwh),
  demandKw: reading.demandKw === null ? '' : String(reading.demandKw),
  offHoursKwh: reading.offHoursKwh === null ? '' : String(reading.offHoursKwh),
  notes: reading.notes,
  loadedId: reading.id,
});

export default function DataEntrySection({ data, mutate }: Props) {
  const [unitName, setUnitName] = useState('');
  const [unitSector, setUnitSector] = useState('');
  const [unitFeedback, setUnitFeedback] = useState<Feedback>(null);
  const [draft, setDraft] = useState<ReadingDraft>(() => emptyReading(data.units[0] ? String(data.units[0].id) : ''));
  const [readingFeedback, setReadingFeedback] = useState<Feedback>(null);
  const [historyUnit, setHistoryUnit] = useState('todas');
  const [busy, setBusy] = useState(false);

  const unitById = useMemo(() => new Map(data.units.map((unit) => [unit.id, unit])), [data.units]);
  const readingCount = useMemo(() => {
    const counts = new Map<number, number>();
    for (const reading of data.readings) counts.set(reading.unitId, (counts.get(reading.unitId) ?? 0) + 1);
    return counts;
  }, [data.readings]);

  // Unidade do rascunho, ou a primeira se ela ainda não existe (ou foi excluída).
  const selectedUnitId = data.units.some((unit) => String(unit.id) === draft.unitId)
    ? draft.unitId
    : data.units[0]
      ? String(data.units[0].id)
      : '';
  // Se já existe lançamento para a unidade e mês escolhidos, o envio atualiza esse lançamento.
  const existing = data.readings.find((reading) => String(reading.unitId) === selectedUnitId && reading.month === draft.month);

  const history = useMemo(
    () =>
      [...data.readings]
        .filter((reading) => historyUnit === 'todas' || String(reading.unitId) === historyUnit)
        .sort((a, b) => b.month.localeCompare(a.month) || a.unitId - b.unitId),
    [data.readings, historyUnit],
  );

  const run = async (action: () => Promise<unknown>, setFeedback: (feedback: Feedback) => void, success: string) => {
    setBusy(true);
    setFeedback(null);
    try {
      await action();
      setFeedback({ type: 'success', message: success });
      return true;
    } catch (reason) {
      setFeedback({ type: 'error', message: errorMessage(reason) });
      return false;
    } finally {
      setBusy(false);
    }
  };

  const handleAddUnit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const name = unitName.trim();
    const created = await run(() => mutate('POST', '/units', { name, sector: unitSector }), setUnitFeedback, `Unidade "${name}" cadastrada.`);
    if (created) {
      setUnitName('');
      setUnitSector('');
    }
  };

  const handleDeleteUnit = async (id: number, name: string) => {
    const count = readingCount.get(id) ?? 0;
    const warning = count ? ` Os ${count} lançamentos dela também serão apagados.` : '';
    if (!window.confirm(`Excluir a unidade "${name}"?${warning}`)) return;
    await run(() => mutate('DELETE', `/units/${id}`), setUnitFeedback, `Unidade "${name}" excluída.`);
  };

  const update = (field: Exclude<keyof ReadingDraft, 'loadedId'>, value: string) => setDraft((current) => ({ ...current, [field]: value }));

  // Ao escolher unidade/mês já lançados, carrega os valores salvos para não apagar campos opcionais sem querer.
  const selectTarget = (unitId: string, month: string) => {
    const match = data.readings.find((reading) => String(reading.unitId) === unitId && reading.month === month);
    setDraft((current) => {
      if (match) return toDraft(match);
      if (current.loadedId !== undefined) return { ...emptyReading(unitId), month };
      return { ...current, unitId, month };
    });
  };

  const handleSaveReading = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const label = `${unitById.get(Number(selectedUnitId))?.name ?? ''} · ${monthLabel(draft.month)}`;
    const saved = await run(
      () => mutate('PUT', '/readings', { ...draft, unitId: Number(selectedUnitId) }),
      setReadingFeedback,
      existing ? `Lançamento de ${label} atualizado.` : `Lançamento de ${label} salvo.`,
    );
    if (saved) setDraft(emptyReading(selectedUnitId));
  };

  const handleEditReading = (reading: Reading) => {
    setDraft(toDraft(reading));
    setReadingFeedback(null);
    document.getElementById('reading-form')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const handleDeleteReading = async (reading: Reading) => {
    const label = `${unitById.get(reading.unitId)?.name ?? ''} · ${monthLabel(reading.month)}`;
    if (!window.confirm(`Excluir o lançamento de ${label}?`)) return;
    await run(() => mutate('DELETE', `/readings/${reading.id}`), setReadingFeedback, `Lançamento de ${label} excluído.`);
  };

  return (
    <>
      <section className="panel section-gap">
        <PanelHead label="Passo 1" title="Unidades da empresa" />
        <p className="muted section-intro">
          Cadastre cada local com conta de energia própria: fábrica, filial, escritório, armazém...
        </p>

        {data.units.length > 0 && (
          <div className="unit-table section-gap">
            {data.units.map((unit) => (
              <div key={unit.id} className="unit-row compact-row">
                <div>
                  <strong>{unit.name}</strong>
                  <small>{unit.sector || 'Sem setor'}</small>
                </div>
                <div>
                  <strong>{readingCount.get(unit.id) ?? 0}</strong>
                  <small>Lançamentos</small>
                </div>
                <button
                  type="button"
                  className="icon-button"
                  aria-label={`Excluir ${unit.name}`}
                  title="Excluir unidade"
                  onClick={() => handleDeleteUnit(unit.id, unit.name)}
                  disabled={busy}
                >
                  <Trash2 size={16} />
                </button>
              </div>
            ))}
          </div>
        )}

        <form className="register-form inline-form" onSubmit={handleAddUnit}>
          <div className="field-grid three-columns align-end">
            <label>
              <span>Nome da unidade</span>
              <input type="text" value={unitName} onChange={(event) => setUnitName(event.target.value)} placeholder="Ex.: Fábrica Centro" required maxLength={80} />
            </label>
            <label>
              <span>Setor / atividade</span>
              <input type="text" value={unitSector} onChange={(event) => setUnitSector(event.target.value)} placeholder="Ex.: Produção" maxLength={80} />
            </label>
            <button type="submit" className="secondary-button add-unit-button" disabled={busy}>
              Adicionar unidade
            </button>
          </div>
          {unitFeedback && (
            <div className={`form-message ${unitFeedback.type}`} role={unitFeedback.type === 'error' ? 'alert' : 'status'}>
              {unitFeedback.message}
            </div>
          )}
        </form>
      </section>

      <section className="panel section-gap" id="reading-form">
        <PanelHead label="Passo 2" title={existing ? 'Atualizar lançamento do mês' : 'Lançar consumo do mês'} />
        <p className="muted section-intro">
          Use os dados da fatura de energia de cada unidade. Campos com * são obrigatórios; os demais melhoram os alertas e a análise de
          desperdício.
        </p>

        {data.units.length === 0 ? (
          <p className="form-message info">Cadastre ao menos uma unidade no passo 1 para lançar o consumo.</p>
        ) : (
          <form className="register-form" onSubmit={handleSaveReading}>
            <div className="field-grid three-columns">
              <label>
                <span>Unidade *</span>
                <select value={selectedUnitId} onChange={(event) => selectTarget(event.target.value, draft.month)}>
                  {data.units.map((unit) => (
                    <option key={unit.id} value={unit.id}>
                      {unit.name}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                <span>Mês de referência *</span>
                <input type="month" value={draft.month} onChange={(event) => selectTarget(selectedUnitId, event.target.value)} required />
              </label>
              <label>
                <span>Consumo total (kWh) *</span>
                <input type="number" min={0.01} step="any" inputMode="decimal" value={draft.consumptionKwh} onChange={(event) => update('consumptionKwh', event.target.value)} required />
              </label>
              <label>
                <span>Valor da fatura (R$) *</span>
                <input type="number" min={0} step="0.01" inputMode="decimal" value={draft.cost} onChange={(event) => update('cost', event.target.value)} required />
              </label>
              <label>
                <span>Consumo no horário de ponta (kWh)</span>
                <input type="number" min={0} step="any" inputMode="decimal" value={draft.peakKwh} onChange={(event) => update('peakKwh', event.target.value)} />
                <small className="field-hint">Na fatura, “consumo ponta”: 3 horas do fim da tarde definidas pela distribuidora, com tarifa mais cara.</small>
              </label>
              <label>
                <span>Demanda máxima medida (kW)</span>
                <input type="number" min={0} step="any" inputMode="decimal" value={draft.demandKw} onChange={(event) => update('demandKw', event.target.value)} />
                <small className="field-hint">Para clientes de média/alta tensão (grupo A).</small>
              </label>
              <label className="span-2">
                <span>Consumo fora do expediente / standby (kWh)</span>
                <input type="number" min={0} step="any" inputMode="decimal" value={draft.offHoursKwh} onChange={(event) => update('offHoursKwh', event.target.value)} />
                <small className="field-hint">
                  Estimativa da energia usada sem produção (noites, fins de semana, máquinas ociosas). É o que o sistema considera desperdício.
                </small>
              </label>
              <label>
                <span>Observações</span>
                <input type="text" value={draft.notes} onChange={(event) => update('notes', event.target.value)} maxLength={500} placeholder="Ex.: feriado prolongado" />
              </label>
            </div>

            {readingFeedback && (
              <div className={`form-message ${readingFeedback.type}`} role={readingFeedback.type === 'error' ? 'alert' : 'status'}>
                {readingFeedback.message}
              </div>
            )}

            <div className="form-actions">
              <button type="submit" className="primary-button" disabled={busy}>
                {existing ? 'Atualizar lançamento' : 'Salvar lançamento'}
              </button>
              {existing && (
                <button type="button" className="secondary-button" onClick={() => setDraft(emptyReading(selectedUnitId))}>
                  Novo lançamento
                </button>
              )}
            </div>
          </form>
        )}
      </section>

      <section className="panel">
        <PanelHead label="Histórico" title="Lançamentos registrados">
          {data.units.length > 1 && (
            <div className="select-wrap">
              <label htmlFor="history-unit">Unidade</label>
              <select id="history-unit" value={historyUnit} onChange={(event) => setHistoryUnit(event.target.value)}>
                <option value="todas">Todas</option>
                {data.units.map((unit) => (
                  <option key={unit.id} value={unit.id}>
                    {unit.name}
                  </option>
                ))}
              </select>
            </div>
          )}
        </PanelHead>

        {history.length === 0 ? (
          <p className="empty-state">Nenhum lançamento ainda. Os meses que você lançar aparecem aqui.</p>
        ) : (
          <div className="table-scroll">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Mês</th>
                  <th>Unidade</th>
                  <th className="numeric">Consumo</th>
                  <th className="numeric">Fatura</th>
                  <th className="numeric">R$/kWh</th>
                  <th className="numeric">Ponta</th>
                  <th className="numeric">Fora do expediente</th>
                  <th aria-label="Ações" />
                </tr>
              </thead>
              <tbody>
                {history.map((reading) => (
                  <tr key={reading.id}>
                    <td>{monthLabel(reading.month)}</td>
                    <td>{unitById.get(reading.unitId)?.name}</td>
                    <td className="numeric">{NUMBER.format(reading.consumptionKwh)} kWh</td>
                    <td className="numeric">{CURRENCY.format(reading.cost)}</td>
                    <td className="numeric">{PRICE.format(reading.cost / reading.consumptionKwh)}</td>
                    <td className="numeric">{reading.peakKwh === null ? '—' : `${NUMBER.format(reading.peakKwh)} kWh`}</td>
                    <td className="numeric">{reading.offHoursKwh === null ? '—' : `${NUMBER.format(reading.offHoursKwh)} kWh`}</td>
                    <td>
                      <div className="row-actions">
                        <button type="button" className="icon-button" aria-label="Editar lançamento" title="Editar" onClick={() => handleEditReading(reading)}>
                          <Pencil size={15} />
                        </button>
                        <button
                          type="button"
                          className="icon-button"
                          aria-label="Excluir lançamento"
                          title="Excluir"
                          onClick={() => handleDeleteReading(reading)}
                          disabled={busy}
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </>
  );
}
