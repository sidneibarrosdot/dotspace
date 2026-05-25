import Papa from 'papaparse';
import type { PortfolioItem } from '../types';
import baseCsv from './krs-base.csv?raw';
import configCsv from './krs-config.csv?raw';

type CsvRow = Record<string, string>;

export interface KrInventoryEntry {
  id: string;
  sourceIndex: number;
  metaArea: string;
  objetivo: string;
  keyResult: string;
  responsavelKR: string;
  funcao: string;
  timeSquad: string;
  periodo: string;
  valorBase: string;
  valorAlvo: string;
  valorAtual: string;
  evolucao: string;
  status: string;
  sinergia: string;
  frenteParceira: string;
  planoAcao: string;
  ultimaAtualizacao: string;
  observacoes: string;
  sourceSheetRow: number;
  pinned: boolean;
}

export interface KRsItem extends PortfolioItem {
  sourceIndex: number;
  metaArea: string;
  keyResult: string;
  responsavelKR: string;
  funcao: string;
  timeSquad: string;
  periodo: string;
  valorBase: string;
  valorAlvo: string;
  valorAtual: string;
  evolucao: string;
  status: string;
  sinergia: string;
  frenteParceira: string;
  planoAcao: string;
  ultimaAtualizacao: string;
  observacoes: string;
  objetivo: string;
  sourceSheetRow: number;
  inventoryEntries?: KrInventoryEntry[];
  groupCount?: number;
  observacoesResumo?: string;
}

interface KrsSourceRow extends KrInventoryEntry {}

const createKrLinks = (id: string) => [
  {
    label: 'Resumo',
    href: `#kr-card-${id}`,
    hint: 'Campos centrais',
  },
  {
    label: 'Plano',
    href: `#kr-card-${id}-plan`,
    hint: 'Ações',
  },
  {
    label: 'Observações',
    href: `#kr-card-${id}-notes`,
    hint: 'Contexto',
  },
];

const normalizeValue = (value: string | undefined | null) => (value ?? '').replace(/\r/g, '').trim();

const normalizeText = (value: string | undefined | null) => normalizeValue(value).replace(/\s+/g, ' ').toLowerCase();

const slugify = (value: string | undefined | null) =>
  normalizeValue(value)
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .replace(/[^a-zA-Z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .toLowerCase();

const uniqueValues = (values: string[]) => Array.from(new Set(values.map((value) => normalizeValue(value)).filter(Boolean)));

const summarizeJoined = (values: string[], fallback = '—') => {
  const unique = uniqueValues(values);
  if (!unique.length) return fallback;
  if (unique.length === 1) return unique[0];
  return unique.join(' • ');
};

const summarizeCompact = (values: string[], fallback = '—') => {
  const unique = uniqueValues(values);
  if (!unique.length) return fallback;
  if (unique.length === 1) return unique[0];
  return `${unique[0]} +${unique.length - 1}`;
};

const summarizeStatus = (values: string[]) => {
  const unique = uniqueValues(values);
  if (!unique.length) return 'Pendente';
  if (unique.length === 1) return unique[0];
  return `Misto (${unique.length})`;
};

const shortPreview = (value: string, fallback = '') => {
  const clean = normalizeValue(value);
  if (!clean) return fallback;
  const firstLine = clean.split('\n', 1)[0].trim();
  const normalized = firstLine.replace(/\s+/g, ' ');
  if (normalized.length <= 120) return normalized;
  const cut = normalized.slice(0, 117);
  const lastSpace = cut.lastIndexOf(' ');
  return `${lastSpace > 30 ? cut.slice(0, lastSpace) : cut}...`;
};

const parseCsv = (csvText: string) => {
  const parsed = Papa.parse<CsvRow>(csvText, {
    header: true,
    skipEmptyLines: 'greedy',
    transformHeader: (header) => header.trim(),
  });

  if (parsed.errors.length) {
    console.warn('[krsItems] CSV parse warnings', parsed.errors.slice(0, 5));
  }

  return (parsed.data as CsvRow[]).filter((row) => Object.values(row).some((value) => normalizeValue(value).length > 0));
};

const cell = (row: CsvRow, ...keys: string[]) => {
  for (const key of keys) {
    const value = normalizeValue(row[key]);
    if (value) return value;
  }
  return '';
};

const parseBaseRows = (): KrsSourceRow[] =>
  parseCsv(baseCsv)
    .map((row, index) => ({
      id: cell(row, 'ID') || `OKR-${String(index + 1).padStart(3, '0')}`,
      sourceIndex: index + 1,
      metaArea: cell(row, 'Meta área'),
      objetivo: cell(row, 'Objetivo'),
      keyResult: cell(row, 'Key Result (KR)'),
      responsavelKR: cell(row, 'Responsável'),
      funcao: cell(row, 'Função'),
      timeSquad: cell(row, 'Time/Squad', 'Time'),
      periodo: cell(row, 'Período'),
      valorBase: cell(row, 'Valor Base'),
      valorAlvo: cell(row, 'Valor Alvo', 'Valor Alvo '),
      valorAtual: cell(row, 'Valor Atual'),
      evolucao: cell(row, 'Evolução'),
      status: cell(row, 'Status'),
      sinergia: cell(row, 'Sinergia?'),
      frenteParceira: cell(row, 'Frente Parceira'),
      planoAcao: cell(row, 'Plano de ação'),
      ultimaAtualizacao: cell(row, 'Última atualização', 'Ultima atualização'),
      observacoes: cell(row, 'Observações'),
      sourceSheetRow: index + 2,
      pinned: false,
    }))
    .filter((row) => row.metaArea && row.objetivo && row.keyResult);

const parseConfigRows = (): CsvRow[] => parseCsv(configCsv);

const uniqueOrdered = (values: string[]) => {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const value of values.map((entry) => normalizeValue(entry))) {
    if (!value || seen.has(value)) continue;
    seen.add(value);
    result.push(value);
  }
  return result;
};

const configRows = parseConfigRows();

export const KR_META_AREA_OPTIONS = uniqueOrdered(configRows.map((row) => cell(row, 'Meta da área')).filter(Boolean));
export const KR_STATUS_OPTIONS = uniqueOrdered(configRows.map((row) => cell(row, 'Status')).filter(Boolean));
export const KR_SYNERGY_OPTIONS = uniqueOrdered(configRows.map((row) => cell(row, 'Sinergia?')).filter(Boolean));
export const KR_PERIOD_OPTIONS = uniqueOrdered(configRows.map((row) => cell(row, 'Período')).filter(Boolean));
export const KR_FUNCAO_OPTIONS = uniqueOrdered(configRows.map((row) => cell(row, 'Função')).filter(Boolean));
export const KR_TIME_OPTIONS = uniqueOrdered(configRows.map((row) => cell(row, 'Time')).filter(Boolean));

const sourceRows = parseBaseRows();

const groupedRows = new Map<string, KrsSourceRow[]>();

for (const row of sourceRows) {
  const key = [row.metaArea, row.objetivo, row.keyResult].map(normalizeText).join('||');
  const existing = groupedRows.get(key);
  if (existing) existing.push(row);
  else groupedRows.set(key, [row]);
}

const scoreRow = (row: KrsSourceRow) =>
  [
    row.valorBase,
    row.valorAlvo,
    row.valorAtual,
    row.evolucao,
    row.status,
    row.sinergia,
    row.frenteParceira,
    row.planoAcao,
    row.ultimaAtualizacao,
    row.observacoes,
  ].filter(Boolean).length;

const selectSummaryRow = (rows: KrsSourceRow[]) =>
  rows.reduce((best, row) => {
    if (!best) return row;
    const scoreBest = scoreRow(best);
    const scoreCurrent = scoreRow(row);
    if (scoreCurrent > scoreBest) return row;
    if (scoreCurrent === scoreBest && row.sourceSheetRow < best.sourceSheetRow) return row;
    return best;
  }, rows[0]);

const buildTags = (rows: KrsSourceRow[]) =>
  uniqueValues([rows[0]?.metaArea ?? '', ...rows.map((row) => row.status), ...rows.map((row) => row.periodo)]);

export const krsItems: KRsItem[] = Array.from(groupedRows.values())
  .sort((a, b) => a[0].sourceIndex - b[0].sourceIndex)
  .map((rows, index) => {
    const primary = rows[0];
    const summaryRow = selectSummaryRow(rows);
    const groupId = slugify([primary.metaArea, primary.objetivo, primary.keyResult].join(' ')) || `kr-${index + 1}`;
    const id = `kr-${groupId}-${String(index + 1).padStart(3, '0')}`;
    const links = createKrLinks(id);
    const metaAreaSummary = summarizeJoined(rows.map((row) => row.metaArea), primary.metaArea);
    const objectiveSummary = primary.objetivo;
    const keyResultSummary = primary.keyResult;
    const responsibleSummary = summarizeJoined(rows.map((row) => row.responsavelKR), primary.responsavelKR);
    const funcaoSummary = summarizeJoined(rows.map((row) => row.funcao), primary.funcao);
    const timeSummary = summarizeCompact(rows.map((row) => row.timeSquad), primary.timeSquad);
    const periodSummary = summarizeJoined(rows.map((row) => row.periodo), primary.periodo);
    const statusSummary = summarizeStatus(rows.map((row) => row.status));
    const sinergiaSummary = summarizeJoined(rows.map((row) => row.sinergia), primary.sinergia);
    const partnerSummary = summarizeJoined(rows.map((row) => row.frenteParceira), primary.frenteParceira);
    const planSummary = shortPreview(summaryRow.planoAcao || primary.planoAcao || objectiveSummary, objectiveSummary);
    const notesSummary = shortPreview(summaryRow.observacoes || primary.observacoes, summaryRow.sinergia || '');
    const inventoryEntries = rows.map((row) => ({
      id: row.id,
      sourceIndex: row.sourceIndex,
      metaArea: row.metaArea,
      objetivo: row.objetivo,
      keyResult: row.keyResult,
      responsavelKR: row.responsavelKR,
      funcao: row.funcao,
      timeSquad: row.timeSquad,
      periodo: row.periodo,
      valorBase: row.valorBase,
      valorAlvo: row.valorAlvo,
      valorAtual: row.valorAtual,
      evolucao: row.evolucao,
      status: row.status,
      sinergia: row.sinergia,
      frenteParceira: row.frenteParceira,
      planoAcao: row.planoAcao,
      ultimaAtualizacao: row.ultimaAtualizacao,
      observacoes: row.observacoes,
      sourceSheetRow: row.sourceSheetRow,
      pinned: row.pinned,
    }));

    return {
      id,
      sourceIndex: primary.sourceIndex,
      Imagem_capa: '',
      Time: timeSummary,
      Cliente: metaAreaSummary,
      Data: periodSummary,
      Projeto: keyResultSummary,
      DI: funcaoSummary,
      DM: '',
      Link_PMV: links[0]?.href ?? `#${id}`,
      Assunto_geral: objectiveSummary,
      Assunto_especifico: keyResultSummary,
      Publico_alvo: responsibleSummary,
      Metodologias: statusSummary,
      Mídias: periodSummary,
      Outros_recursos: planSummary,
      tags: buildTags(rows),
      likes: 0,
      views: 0,
      versao: periodSummary || statusSummary,
      integridade: statusSummary,
      ultimaRevisao: summaryRow.ultimaAtualizacao || periodSummary,
      pinned: rows.some((row) => row.pinned),
      objetivo: objectiveSummary,
      indicador: metaAreaSummary,
      meta: summaryRow.valorAlvo,
      resultado: summaryRow.valorAtual,
      ciclo: periodSummary,
      responsavel: responsibleSummary,
      statusKR: statusSummary,
      krLinks: links,
      links,
      metaArea: metaAreaSummary,
      keyResult: keyResultSummary,
      responsavelKR: responsibleSummary,
      funcao: funcaoSummary,
      timeSquad: timeSummary,
      periodo: periodSummary,
      valorBase: summaryRow.valorBase,
      valorAlvo: summaryRow.valorAlvo,
      valorAtual: summaryRow.valorAtual,
      evolucao: summaryRow.evolucao,
      status: statusSummary,
      sinergia: sinergiaSummary,
      frenteParceira: partnerSummary,
      planoAcao: summaryRow.planoAcao || planSummary,
      ultimaAtualizacao: summaryRow.ultimaAtualizacao,
      observacoes: summaryRow.observacoes || notesSummary,
      planoResumo: planSummary,
      observacoesResumo: notesSummary,
      sourceSheetRow: primary.sourceSheetRow,
      inventoryEntries,
      groupCount: rows.length,
    };
  });
