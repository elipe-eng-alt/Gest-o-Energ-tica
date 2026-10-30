import { PERIOD_LABELS, UNITS } from '../data/demo';
import type { Opportunity, Period, Summary } from '../types';
import { CURRENCY, formatMWh, formatPercent } from './format';

type ReportInput = {
  period: Period;
  unitFilter: string;
  summary: Summary;
  opportunities: Opportunity[];
};

const PRIORITY_WEIGHT = { alta: 0, media: 1, baixa: 2 } as const;

/** Gera o PDF executivo. O jsPDF (~350 kB) só é baixado quando o usuário pede o relatório. */
export async function generatePDFReport({ period, unitFilter, summary, opportunities }: ReportInput) {
  const { jsPDF } = await import('jspdf');
  const doc = new jsPDF();
  const pageHeight = doc.internal.pageSize.getHeight();
  const marginX = 16;
  const maxWidth = 178;
  let y = 52;

  const ensureSpace = (needed: number) => {
    if (y + needed > pageHeight - 16) {
      doc.addPage();
      y = 20;
    }
  };

  doc.setFillColor(243, 248, 245);
  doc.rect(0, 0, 210, 40, 'F');
  doc.setTextColor(20, 36, 29);
  doc.setFontSize(18);
  doc.setFont('helvetica', 'bold');
  doc.text('EnergiaViva - Relatório Executivo', marginX, 20);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text(`${PERIOD_LABELS[period]} · Unidade: ${unitFilter} · Emitido em ${new Date().toLocaleDateString('pt-BR')}`, marginX, 30);

  doc.setTextColor(60, 60, 60);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.text('Resumo do desempenho', marginX, y);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  y += 10;
  [
    `Consumo total: ${formatMWh(summary.totalConsumption)}`,
    `Custo energético: ${CURRENCY.format(summary.totalCost)}`,
    `Desperdício estimado: ${formatMWh(summary.totalWaste)} (${formatPercent(summary.wasteRate)} do consumo)`,
    `Potencial de economia: ${CURRENCY.format(summary.savingsPotential)}`,
    `Economia já realizada: ${CURRENCY.format(summary.savingsRealized)}`,
  ].forEach((line) => {
    doc.text(`- ${line}`, marginX + 2, y);
    y += 8;
  });

  y += 6;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.text('Oportunidades (por prioridade)', marginX, y);
  y += 10;
  doc.setFontSize(10);

  const sorted = [...opportunities].sort((a, b) => PRIORITY_WEIGHT[a.priority] - PRIORITY_WEIGHT[b.priority]);
  if (!sorted.length) {
    doc.setFont('helvetica', 'normal');
    doc.text('Nenhuma oportunidade cadastrada para o filtro atual.', marginX + 2, y);
    y += 8;
  }

  sorted.forEach((opportunity) => {
    const description = doc.splitTextToSize(opportunity.description, maxWidth - 4) as string[];
    ensureSpace(14 + description.length * 5);
    doc.setFont('helvetica', 'bold');
    doc.text(doc.splitTextToSize(opportunity.title, maxWidth) as string[], marginX + 2, y);
    y += 5;
    doc.setFont('helvetica', 'normal');
    doc.text(
      `${opportunity.unit} · prioridade ${opportunity.priority} · ${opportunity.status} · ${CURRENCY.format(opportunity.savings)} · prazo ${opportunity.due}`,
      marginX + 2,
      y,
    );
    y += 5;
    doc.setTextColor(110, 110, 110);
    doc.text(description, marginX + 2, y);
    doc.setTextColor(60, 60, 60);
    y += description.length * 5 + 5;
  });

  ensureSpace(14 + UNITS.length * 7);
  y += 4;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.text('Desempenho por unidade', marginX, y);
  y += 10;
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  UNITS.forEach((unit) => {
    doc.text(
      `- ${unit.name}: ${formatMWh(unit.consumed)} · ${CURRENCY.format(unit.cost)} · eficiência ${unit.efficiency}% · ${unit.status}`,
      marginX + 2,
      y,
    );
    y += 7;
  });

  doc.save(`relatorio-energia-viva-${period}.pdf`);
}

const csvCell = (value: string | number) => {
  const text = String(value);
  return /[";\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
};

/** Exporta as oportunidades em CSV (separador ";" para abrir direto no Excel em pt-BR). */
export function exportOpportunitiesCSV(opportunities: Opportunity[]) {
  const header = ['Título', 'Unidade', 'Setor', 'Prioridade', 'Status', 'Impacto (%)', 'Economia (R$)', 'Prazo', 'Descrição'];
  const rows = opportunities.map((item) => [
    item.title,
    item.unit,
    item.sector,
    item.priority,
    item.status,
    item.potential,
    item.savings,
    item.due,
    item.description,
  ]);
  const csv = [header, ...rows].map((row) => row.map(csvCell).join(';')).join('\r\n');
  const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = 'oportunidades-energia-viva.csv';
  link.click();
  URL.revokeObjectURL(url);
}
