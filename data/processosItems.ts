import type { PortfolioItem } from '../types';
import inventario from './processos-inventario.json';

const INVENTORY_DATE = '2026-05-23';

const driveSearchUrl = (query: string) =>
  `https://drive.google.com/drive/search?q=${encodeURIComponent(query)}`;

const isHttpUrl = (value: string) => /^https?:\/\//i.test(value.trim());

const normalizeLink = (value: string, fallbackQuery: string) => {
  const cleaned = value.trim();
  if (!cleaned) return driveSearchUrl(fallbackQuery);
  return isHttpUrl(cleaned) ? cleaned.replace(/\s+/g, '') : driveSearchUrl(cleaned);
};

const slugify = (value: string) =>
  value
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .replace(/[^a-zA-Z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .toLowerCase();

const normalizeText = (value: string) =>
  value
    .trim()
    .replace(/\s+/g, ' ')
    .toLowerCase();

const inferSquad = (row: InventarioRow) => {
  const haystack = normalizeText(
    [row['Nome do Documento'], row['Finalidade'], row['Link Atual (Drive)'], row['Dono do Processo']]
      .filter(Boolean)
      .join(' ')
  );

  const knownSquads = [
    'DevEaD',
    'EduCom',
    'Produto',
    'Studion.mx',
    'Beyoncedo',
    'Bon Job',
    'Pink Flow',
    'Nos Alcione',
    'Engenheiros do Validaí',
    'Time AVengers',
    'Barões da Tarefinha',
    'Geral & Fluxo',
    'Gestão Ágil',
    'Governança de dados',
    'DOT ForHub',
    'Intel',
    'Operação',
  ];

  const matchedKnownSquads = knownSquads.filter((squad) => haystack.includes(normalizeText(squad)));
  if (matchedKnownSquads.length > 0) {
    return Array.from(new Set(matchedKnownSquads)).join(' • ');
  }

  const explicitMatches = [
    /time de ([^.,;()]+)/i,
    /equipe de ([^.,;()]+)/i,
    /para ([^.,;()]+)/i,
    /de ([^.,;()]+?)(?:\s+(?:do|da|dos|das|em|para)|[.,;()]|$)/i,
  ];

  for (const pattern of explicitMatches) {
    const match = haystack.match(pattern);
    if (match?.[1]) {
      const candidate = match[1].trim();
      if (candidate.length >= 2) return candidate;
    }
  }

  return row['Área']?.trim() || 'Geral';
};

const mapIntegridade = (status: string) => {
  const normalized = normalizeText(status);
  if (normalized === 'válido' || normalized === 'valido') return 'Atualizado';
  if (normalized === 'em revisão' || normalized === 'em revisao') return 'Em revisão';
  if (normalized === 'defasado') return 'Sob revisão';
  return 'Pendente';
};

const summarizeIntegrity = (statuses: string[]) => {
  const normalized = statuses.map((status) => normalizeText(status));
  if (normalized.every((status) => status === 'válido' || status === 'valido')) return 'Atualizado';
  if (normalized.some((status) => status === 'defasado')) return 'Sob revisão';
  if (normalized.some((status) => status === 'em revisão' || status === 'em revisao')) return 'Em revisão';
  return 'Pendente';
};

const formatStatusSummary = (statuses: string[]) => {
  const unique = Array.from(new Set(statuses.map((status) => status.trim()).filter(Boolean)));
  if (unique.length === 0) return 'Sem informação';
  if (unique.length === 1) return unique[0];
  return `Misto (${unique.length})`;
};

type InventarioRow = {
  Área: string;
  'Nome do Documento': string;
  Finalidade: string;
  'Link Atual (Drive)': string;
  Status: string;
  'Dono do Processo': string;
  Prioridade: string;
};

type GroupedInventory = {
  title: string;
  entries: Array<{
    area: string;
    squad: string;
    responsavel: string;
    funcao: string;
    status: string;
    prioridade: string;
    link: string;
    titulo: string;
  }>;
};

const rawRows = inventario as InventarioRow[];
const groupedByTitle = new Map<string, GroupedInventory>();

for (const row of rawRows) {
  const title = (row['Nome do Documento'] || 'Documento sem título').trim();
  const key = normalizeText(title);
  const area = (row['Área'] || 'Geral').trim();
  const squad = inferSquad(row);
  const responsavel = (row['Dono do Processo'] || 'Sem responsável').trim();
  const funcao = area;
  const status = (row['Status'] || 'Sem informação').trim();
  const prioridade = (row['Prioridade'] || '').trim();
  const link = normalizeLink(row['Link Atual (Drive)'] || title, `${area} ${title}`);

  const entry = {
    area,
    squad,
    responsavel,
    funcao,
    status,
    prioridade,
    link,
    titulo: title,
  };

  const existing = groupedByTitle.get(key);
  if (existing) {
    existing.entries.push(entry);
  } else {
    groupedByTitle.set(key, { title, entries: [entry] });
  }
}

const entriesForItem = (group: GroupedInventory) => {
  const uniqueAreas = Array.from(new Set(group.entries.map((entry) => entry.area)));
  const uniqueSquads = Array.from(new Set(group.entries.map((entry) => entry.squad)));
  const uniqueResponsaveis = Array.from(new Set(group.entries.map((entry) => entry.responsavel)));
  const uniqueFuncoes = Array.from(new Set(group.entries.map((entry) => entry.funcao)));
  const statuses = group.entries.map((entry) => entry.status);
  const priority = group.entries.find((entry) => entry.prioridade)?.prioridade || '';
  const primaryEntry = group.entries[0];

  return {
    primaryEntry,
    uniqueAreas,
    uniqueSquads,
    uniqueResponsaveis,
    uniqueFuncoes,
    statuses,
    priority,
  };
};

export const processosItems: PortfolioItem[] = Array.from(groupedByTitle.values())
  .sort((a, b) => a.title.localeCompare(b.title, 'pt-BR'))
  .map((group, index) => {
    const { primaryEntry, uniqueAreas, uniqueSquads, uniqueResponsaveis, uniqueFuncoes, statuses, priority } = entriesForItem(group);
    const isMulti = group.entries.length > 1;
    const titleSeed = `${slugify(group.title)}-${index + 1}`;
    const primaryLink = primaryEntry.link;
    const statusSummary = formatStatusSummary(statuses);
    const areaSummary = uniqueAreas.join(' • ');
    const compactAreaSummary = uniqueAreas.length > 1 ? `${uniqueAreas[0]} +${uniqueAreas.length - 1}` : uniqueAreas[0];
    const squadSummary = uniqueSquads.join(' • ');
    const compactSquadSummary = uniqueSquads.length > 1 ? `${uniqueSquads[0]} +${uniqueSquads.length - 1}` : uniqueSquads[0];
    const responsavelSummary = uniqueResponsaveis.join(' • ');
    const funcaoSummary = uniqueFuncoes.join(' • ');

    return {
      id: `inventario-${titleSeed}`,
      Projeto: group.title,
      Cliente: statusSummary,
      Time: compactSquadSummary,
      Data: INVENTORY_DATE,
      Imagem_capa: `https://picsum.photos/seed/${encodeURIComponent(titleSeed)}/900/700`,
      Link_PMV: primaryLink,
      versao: 'v1.0.0',
      integridade: summarizeIntegrity(statuses),
      ultimaRevisao: INVENTORY_DATE,
      pinned: isMulti || Boolean(priority) || uniqueAreas.includes('Front'),
      Assunto_geral: isMulti
        ? `${group.entries.length} entradas consolidadas para este título no inventário.`
        : primaryEntry.funcao,
      Assunto_especifico: `Responsável: ${responsavelSummary}`,
      Publico_alvo: responsavelSummary,
      Metodologias: funcaoSummary,
      Mídias: primaryLink.startsWith('https://') ? 'Drive, sites e links seguros' : 'Drive',
      Outros_recursos: priority ? `Prioridade: ${priority}` : `Time/Squad: ${squadSummary || areaSummary}`,
      DI: '',
      DM: '',
      groupCount: group.entries.length,
      inventoryEntries: group.entries,
      links: [
        { label: 'Abrir documento', href: primaryLink, hint: 'Fonte oficial' },
        { label: 'Buscar no Drive', href: driveSearchUrl(group.title), hint: 'Pesquisa rápida' },
        { label: 'Inventário', href: driveSearchUrl(`${areaSummary} ${group.title}`), hint: 'Base catalogada' },
      ],
    };
  });
