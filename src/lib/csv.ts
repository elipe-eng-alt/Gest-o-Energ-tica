/** Leitura de planilhas CSV de lançamentos, aceitando o formato que o Excel em português gera. */

export type ImportRow = {
  line: number;
  unit: string;
  month: string;
  consumptionKwh: number;
  cost: number;
  peakKwh: number | null;
  demandKw: number | null;
  offHoursKwh: number | null;
  notes: string;
};

export type ImportError = { line: number; message: string };

type Field = Exclude<keyof ImportRow, 'line'>;

const COLUMNS: { field: Field; label: string; aliases: string[]; required: boolean }[] = [
  { field: 'unit', label: 'unidade', aliases: ['unidade', 'unit', 'local', 'filial'], required: true },
  { field: 'month', label: 'mes', aliases: ['mes', 'mes_referencia', 'mes_de_referencia', 'referencia', 'competencia'], required: true },
  { field: 'consumptionKwh', label: 'consumo_kwh', aliases: ['consumo_kwh', 'consumo', 'consumo_total', 'consumo_total_kwh', 'kwh'], required: true },
  { field: 'cost', label: 'valor_fatura', aliases: ['valor_fatura', 'valor', 'valor_r', 'valor_da_fatura', 'fatura', 'custo'], required: true },
  { field: 'peakKwh', label: 'consumo_ponta_kwh', aliases: ['consumo_ponta_kwh', 'consumo_ponta', 'ponta', 'ponta_kwh'], required: false },
  { field: 'demandKw', label: 'demanda_kw', aliases: ['demanda_kw', 'demanda', 'demanda_maxima', 'demanda_maxima_kw'], required: false },
  {
    field: 'offHoursKwh',
    label: 'fora_expediente_kwh',
    aliases: ['fora_expediente_kwh', 'fora_do_expediente_kwh', 'fora_expediente', 'fora_do_expediente', 'standby', 'standby_kwh'],
    required: false,
  },
  { field: 'notes', label: 'observacoes', aliases: ['observacoes', 'observacao', 'obs', 'notas'], required: false },
];

export const TEMPLATE_HEADER = COLUMNS.map((column) => column.label);

const MONTHS = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];

const normalizeHeader = (value: string) =>
  value
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_|_$/g, '');

/** Excel em português costuma salvar CSV em Windows-1252; tenta UTF-8 primeiro. */
export function decodeFile(buffer: ArrayBuffer) {
  try {
    return new TextDecoder('utf-8', { fatal: true }).decode(buffer).replace(/^﻿/, '');
  } catch {
    return new TextDecoder('windows-1252').decode(buffer);
  }
}

/** Divide o CSV em linhas e células, respeitando aspas. Detecta ; , ou tabulação pelo cabeçalho. */
export function parseCsv(text: string): string[][] {
  const firstLine = text.split(/\r?\n/, 1)[0] ?? '';
  const delimiter = [';', '\t', ','].reduce((best, candidate) =>
    firstLine.split(candidate).length > firstLine.split(best).length ? candidate : best,
  );

  const rows: string[][] = [];
  let row: string[] = [];
  let cell = '';
  let quoted = false;

  for (let i = 0; i < text.length; i += 1) {
    const char = text[i];
    if (quoted) {
      if (char === '"' && text[i + 1] === '"') {
        cell += '"';
        i += 1;
      } else if (char === '"') {
        quoted = false;
      } else {
        cell += char;
      }
    } else if (char === '"') {
      quoted = true;
    } else if (char === delimiter) {
      row.push(cell);
      cell = '';
    } else if (char === '\n' || char === '\r') {
      if (char === '\r' && text[i + 1] === '\n') i += 1;
      row.push(cell);
      rows.push(row);
      row = [];
      cell = '';
    } else {
      cell += char;
    }
  }
  if (cell || row.length) {
    row.push(cell);
    rows.push(row);
  }
  return rows;
}

/** "18.200" → 18200 · "15.900,50" → 15900.5 · "R$ 1.234,56" → 1234.56 · "" → null · inválido → NaN */
export function parseNumber(raw: string): number | null {
  let value = raw.trim().replace(/^R\$\s*/i, '').replace(/\s/g, '');
  if (!value) return null;
  if (value.includes(',') && value.includes('.')) {
    value = value.lastIndexOf(',') > value.lastIndexOf('.') ? value.replace(/\./g, '').replace(',', '.') : value.replace(/,/g, '');
  } else if (value.includes(',')) {
    value = value.replace(',', '.');
  } else if (/^\d{1,3}(\.\d{3})+$/.test(value)) {
    value = value.replace(/\./g, '');
  }
  return /^-?\d+(\.\d+)?$/.test(value) ? Number(value) : Number.NaN;
}

/** Aceita 2026-08, 08/2026, 8/26, ago/26, agosto/2026 ou uma data 15/08/2026. Devolve "2026-08" ou null. */
export function parseMonth(raw: string): string | null {
  const value = raw.trim().toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
  const build = (year: number, month: number) => {
    const fullYear = year < 100 ? 2000 + year : year;
    return month >= 1 && month <= 12 && fullYear >= 2000 && fullYear <= 2100 ? `${fullYear}-${String(month).padStart(2, '0')}` : null;
  };

  let match = value.match(/^(\d{4})-(\d{1,2})(?:-\d{1,2})?$/);
  if (match) return build(Number(match[1]), Number(match[2]));
  match = value.match(/^\d{1,2}\/(\d{1,2})\/(\d{2,4})$/);
  if (match) return build(Number(match[2]), Number(match[1]));
  match = value.match(/^(\d{1,2})[/-](\d{2,4})$/);
  if (match) return build(Number(match[2]), Number(match[1]));
  match = value.match(/^([a-z]{3})[a-z]*[/\- ]+(?:de )?(\d{2,4})$/);
  if (match && MONTHS.includes(match[1])) return build(Number(match[2]), MONTHS.indexOf(match[1]) + 1);
  return null;
}

/** Converte o texto da planilha em linhas de lançamento, com erros por linha (numeração igual à do Excel). */
export function parseReadingsCsv(text: string): { rows: ImportRow[]; errors: ImportError[] } {
  const table = parseCsv(text).filter((cells) => cells.some((cell) => cell.trim()));
  if (table.length < 2) return { rows: [], errors: [{ line: 1, message: 'A planilha está vazia ou só tem o cabeçalho.' }] };

  const headers = table[0].map(normalizeHeader);
  const indexOf = new Map<Field, number>();
  for (const column of COLUMNS) {
    const index = headers.findIndex((header) => column.aliases.includes(header));
    if (index >= 0) indexOf.set(column.field, index);
  }
  const missing = COLUMNS.filter((column) => column.required && !indexOf.has(column.field)).map((column) => column.label);
  if (missing.length) {
    return { rows: [], errors: [{ line: 1, message: `Colunas obrigatórias não encontradas: ${missing.join(', ')}. Use o modelo.` }] };
  }

  const rows: ImportRow[] = [];
  const errors: ImportError[] = [];
  table.slice(1).forEach((cells, index) => {
    const line = index + 2;
    const get = (field: Field) => {
      const position = indexOf.get(field);
      return position === undefined ? '' : (cells[position] ?? '').trim();
    };
    const fail = (message: string) => errors.push({ line, message });

    const unit = get('unit');
    if (!unit) return fail('Unidade não informada.');
    const month = parseMonth(get('month'));
    if (!month) return fail(`Mês "${get('month')}" não reconhecido. Use, por exemplo, 08/2026.`);

    const numbers = {} as Record<'consumptionKwh' | 'cost' | 'peakKwh' | 'demandKw' | 'offHoursKwh', number | null>;
    for (const field of ['consumptionKwh', 'cost', 'peakKwh', 'demandKw', 'offHoursKwh'] as const) {
      const parsed = parseNumber(get(field));
      if (Number.isNaN(parsed) || (parsed !== null && parsed < 0)) {
        return fail(`Valor "${get(field)}" inválido na coluna ${COLUMNS.find((column) => column.field === field)?.label}.`);
      }
      numbers[field] = parsed;
    }
    if (!numbers.consumptionKwh) return fail('Consumo (kWh) deve ser maior que zero.');
    if (numbers.cost === null) return fail('Valor da fatura não informado.');

    rows.push({
      line,
      unit,
      month,
      consumptionKwh: numbers.consumptionKwh,
      cost: numbers.cost,
      peakKwh: numbers.peakKwh,
      demandKw: numbers.demandKw,
      offHoursKwh: numbers.offHoursKwh,
      notes: get('notes'),
    });
  });

  return { rows, errors };
}

/** Modelo para preencher no Excel: separador ";" e BOM para os acentos abrirem certo. */
export function downloadTemplate(unitNames: string[]) {
  const units = unitNames.length ? unitNames : ['Fábrica Centro'];
  const now = new Date();
  const months = [2, 1].map((back) => {
    const date = new Date(now.getFullYear(), now.getMonth() - back, 1);
    return `${String(date.getMonth() + 1).padStart(2, '0')}/${date.getFullYear()}`;
  });
  const lines = [TEMPLATE_HEADER.join(';')];
  for (const unit of units.slice(0, 3)) {
    lines.push([unit, months[0], '18.200', '15.900,50', '2.600', '92', '2.900', ''].join(';'));
    lines.push([unit, months[1], '18.900', '16.450,00', '2.750', '95', '3.100', 'Exemplo: apague estas linhas'].join(';'));
  }
  const blob = new Blob(['﻿' + lines.join('\r\n')], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = 'modelo-lancamentos-energia-viva.csv';
  link.click();
  URL.revokeObjectURL(url);
}
