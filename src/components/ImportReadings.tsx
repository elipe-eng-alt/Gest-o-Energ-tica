import { useRef, useState, type ChangeEvent } from 'react';
import { Download, Upload } from 'lucide-react';
import { ApiError, errorMessage } from '../lib/api';
import { monthLabel } from '../lib/company';
import { decodeFile, downloadTemplate, parseReadingsCsv, type ImportError, type ImportRow } from '../lib/csv';
import type { CompanyData } from '../types';

type Props = {
  data: CompanyData;
  mutate: (method: string, path: string, body?: unknown) => Promise<CompanyData>;
};

type ImportResult = CompanyData & { imported?: { created: number; updated: number; unitsCreated: string[] } };

const NUMBER = new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 2 });
const MONEY = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });
const PREVIEW_ROWS = 8;

export default function ImportReadings({ data, mutate }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [fileName, setFileName] = useState('');
  const [rows, setRows] = useState<ImportRow[]>([]);
  const [errors, setErrors] = useState<ImportError[]>([]);
  const [result, setResult] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const unitKeys = new Set(data.units.map((unit) => unit.name.toLocaleLowerCase('pt-BR')));
  const unitIdByKey = new Map(data.units.map((unit) => [unit.name.toLocaleLowerCase('pt-BR'), unit.id]));
  const existing = new Set(data.readings.map((reading) => `${reading.unitId}|${reading.month}`));
  const newUnits = [...new Set(rows.map((row) => row.unit).filter((unit) => !unitKeys.has(unit.toLocaleLowerCase('pt-BR'))))];
  const updates = rows.filter((row) => existing.has(`${unitIdByKey.get(row.unit.toLocaleLowerCase('pt-BR'))}|${row.month}`)).length;

  const reset = () => {
    setRows([]);
    setErrors([]);
    setFileName('');
    if (inputRef.current) inputRef.current.value = '';
  };

  const handleFile = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setResult(null);
    if (/\.xlsx?$/i.test(file.name)) {
      reset();
      setErrors([{ line: 0, message: 'Arquivo do Excel (.xlsx) não é aceito: no Excel, use "Salvar como" → "CSV (separado por vírgulas)".' }]);
      return;
    }
    const parsed = parseReadingsCsv(decodeFile(await file.arrayBuffer()));
    setFileName(file.name);
    setRows(parsed.rows);
    setErrors(parsed.errors);
  };

  const handleImport = async () => {
    setBusy(true);
    setResult(null);
    try {
      const response = (await mutate('POST', '/readings/import', { rows })) as ImportResult;
      const summary = response.imported;
      const parts = [`${summary?.created ?? 0} lançamento(s) novo(s)`, `${summary?.updated ?? 0} atualizado(s)`];
      if (summary?.unitsCreated.length) parts.push(`unidades criadas: ${summary.unitsCreated.join(', ')}`);
      reset();
      setResult(`Importação concluída: ${parts.join(' · ')}.`);
    } catch (reason) {
      if (reason instanceof ApiError && reason.lineErrors.length) {
        setErrors(reason.lineErrors);
      } else {
        setErrors([{ line: 0, message: errorMessage(reason) }]);
      }
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="panel section-gap">
      <div className="panel-head">
        <div>
          <p className="label">Opcional</p>
          <h3>Importar histórico por planilha</h3>
        </div>
      </div>
      <p className="muted section-intro">
        Tem vários meses para lançar? Baixe o modelo, preencha no Excel (uma linha por unidade e mês) e salve como CSV. Unidades novas são criadas
        automaticamente, e meses já lançados são atualizados.
      </p>

      <div className="import-actions">
        <button type="button" className="secondary-button with-icon" onClick={() => downloadTemplate(data.units.map((unit) => unit.name))}>
          <Download size={16} /> Baixar modelo (CSV)
        </button>
        <label className="file-button">
          <Upload size={16} />
          <span>{fileName || 'Escolher arquivo CSV'}</span>
          <input ref={inputRef} type="file" accept=".csv,text/csv,.xlsx,.xls" onChange={handleFile} aria-label="Arquivo CSV de lançamentos" />
        </label>
      </div>

      {result && (
        <div className="form-message success" role="status">
          {result}
        </div>
      )}

      {errors.length > 0 && (
        <div className="form-message error import-errors" role="alert">
          <strong>
            {rows.length || errors.some((error) => error.line > 1)
              ? `${errors.length} linha(s) com problema — corrija na planilha e escolha o arquivo de novo:`
              : 'Não foi possível ler a planilha:'}
          </strong>
          <ul>
            {errors.slice(0, 15).map((error, index) => (
              <li key={`${error.line}-${index}`}>
                {error.line > 0 && <b>Linha {error.line}: </b>}
                {error.message}
              </li>
            ))}
          </ul>
          {errors.length > 15 && <small>e mais {errors.length - 15}...</small>}
        </div>
      )}

      {rows.length > 0 && errors.length === 0 && (
        <div className="import-preview">
          <p>
            <b>{rows.length}</b> linha(s) prontas · {rows.length - updates} mês(es) novo(s) · {updates} atualizam lançamentos existentes
            {newUnits.length > 0 && <> · unidades novas: {newUnits.join(', ')}</>}
          </p>
          <div className="table-scroll">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Linha</th>
                  <th>Unidade</th>
                  <th>Mês</th>
                  <th className="numeric">Consumo</th>
                  <th className="numeric">Fatura</th>
                  <th className="numeric">Fora do expediente</th>
                </tr>
              </thead>
              <tbody>
                {rows.slice(0, PREVIEW_ROWS).map((row) => (
                  <tr key={row.line}>
                    <td>{row.line}</td>
                    <td>{row.unit}</td>
                    <td>{monthLabel(row.month)}</td>
                    <td className="numeric">{NUMBER.format(row.consumptionKwh)} kWh</td>
                    <td className="numeric">{MONEY.format(row.cost)}</td>
                    <td className="numeric">{row.offHoursKwh === null ? '—' : `${NUMBER.format(row.offHoursKwh)} kWh`}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {rows.length > PREVIEW_ROWS && <small className="muted">e mais {rows.length - PREVIEW_ROWS} linha(s)...</small>}
          <div className="form-actions">
            <button type="button" className="primary-button" onClick={handleImport} disabled={busy}>
              {busy ? 'Importando...' : `Importar ${rows.length} lançamento(s)`}
            </button>
            <button type="button" className="secondary-button" onClick={reset} disabled={busy}>
              Cancelar
            </button>
          </div>
        </div>
      )}
    </section>
  );
}
