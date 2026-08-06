import type { PortfolioItem } from '../types';

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

export const KR_META_AREA_OPTIONS = ['Lead Time', 'Redução de Custo', 'Aumento de Receita', 'Satisfação do Cliente'];
export const KR_STATUS_OPTIONS = ['Concluído', 'Em andamento', 'Bloqueado', 'Cancelado'];
export const KR_SYNERGY_OPTIONS = ['Sim - Alimenta outro time', 'Não', 'A validar'];
export const KR_PERIOD_OPTIONS = ['Q1 2026', 'Q2 2026', 'Q3 2026'];
export const KR_FUNCAO_OPTIONS = ['Gestão de projetos', 'Design instrucional', 'Produto', 'Operação', 'Dados'];
export const KR_TIME_OPTIONS = ['Time Aurora', 'Time Prisma', 'Time Atlas', 'Time Nexo', 'Time Lumen'];

const createKrLinks = (id: string) => [
  { label: 'Resumo', href: `#okr-card-${id}`, hint: 'Campos centrais' },
  { label: 'Plano', href: `#okr-card-${id}-plan`, hint: 'Ações' },
  { label: 'Observações', href: `#okr-card-${id}-notes`, hint: 'Contexto' },
];

const buildEntry = (
  entry: Omit<KrInventoryEntry, 'sourceIndex' | 'sourceSheetRow' | 'pinned'>,
  sourceIndex: number,
): KrInventoryEntry => ({
  ...entry,
  sourceIndex,
  sourceSheetRow: sourceIndex + 1,
  pinned: false,
});

const buildItem = (
  entry: KrInventoryEntry,
  groupCount = 1,
  extraEntries: KrInventoryEntry[] = [],
): KRsItem => {
  const inventoryEntries = [entry, ...extraEntries];
  const links = createKrLinks(entry.id);

  return {
    id: entry.id,
    sourceIndex: entry.sourceIndex,
    Imagem_capa: '',
    Time: entry.timeSquad,
    Cliente: entry.metaArea,
    Data: entry.periodo,
    Projeto: entry.keyResult,
    DI: entry.funcao,
    DM: '',
    Link_PMV: links[0].href,
    Assunto_geral: entry.objetivo,
    Assunto_especifico: entry.keyResult,
    Publico_alvo: entry.responsavelKR,
    Metodologias: entry.status,
    Mídias: entry.periodo,
    Outros_recursos: entry.planoAcao,
    tags: [entry.metaArea, entry.periodo, entry.status, entry.timeSquad],
    likes: 0,
    views: 0,
    versao: entry.periodo,
    integridade: entry.status,
    ultimaRevisao: entry.ultimaAtualizacao,
    pinned: entry.status === 'No prazo',
    objetivo: entry.objetivo,
    indicador: entry.metaArea,
    meta: entry.valorAlvo,
    resultado: entry.valorAtual,
    ciclo: entry.periodo,
    responsavel: entry.responsavelKR,
    statusKR: entry.status,
    krLinks: links,
    links,
    metaArea: entry.metaArea,
    keyResult: entry.keyResult,
    responsavelKR: entry.responsavelKR,
    funcao: entry.funcao,
    timeSquad: entry.timeSquad,
    periodo: entry.periodo,
    valorBase: entry.valorBase,
    valorAlvo: entry.valorAlvo,
    valorAtual: entry.valorAtual,
    evolucao: entry.evolucao,
    status: entry.status,
    sinergia: entry.sinergia,
    frenteParceira: entry.frenteParceira,
    planoAcao: entry.planoAcao,
    ultimaAtualizacao: entry.ultimaAtualizacao,
    observacoes: entry.observacoes,
    observacoesResumo: entry.observacoes,
    sourceSheetRow: entry.sourceSheetRow,
    inventoryEntries,
    groupCount,
  };
};

const entries = [
  buildEntry(
    {
      id: 'OKR-2026-MOCK-001',
      metaArea: 'Lead Time',
      objetivo: 'Acelerar o ciclo de entrega sem perder qualidade operacional.',
      keyResult: 'Reduzir o tempo médio de publicação de materiais críticos.',
      responsavelKR: 'Pessoa Mock 01',
      funcao: 'Gestão de projetos',
      timeSquad: 'Time Aurora',
      periodo: 'Q1 2026',
      valorBase: '10 dias',
      valorAlvo: '6 dias',
      valorAtual: '7 dias',
      evolucao: '70%',
      status: 'No prazo',
      sinergia: 'Sim - Alimenta outro time',
      frenteParceira: 'Frente Alpha',
      planoAcao: 'Mapear gargalos, revisar checkpoints e automatizar alertas de pendência.',
      ultimaAtualizacao: '2026-06-01',
      observacoes: 'Indicador fictício para validação visual.',
    },
    1,
  ),
  buildEntry(
    {
      id: 'OKR-2026-MOCK-002',
      metaArea: 'Redução de Custo',
      objetivo: 'Diminuir retrabalho em processos recorrentes.',
      keyResult: 'Reduzir horas gastas em ajustes manuais de documentação.',
      responsavelKR: 'Pessoa Mock 02',
      funcao: 'Operação',
      timeSquad: 'Time Prisma',
      periodo: 'Q2 2026',
      valorBase: '40 horas',
      valorAlvo: '24 horas',
      valorAtual: '32 horas',
      evolucao: '45%',
      status: 'Pendente',
      sinergia: 'A validar',
      frenteParceira: 'Frente Beta',
      planoAcao: 'Criar checklist preventivo e revisar templates usados em massa.',
      ultimaAtualizacao: '2026-05-28',
      observacoes: 'Aguardando validação do processo de medição.',
    },
    2,
  ),
  buildEntry(
    {
      id: 'OKR-2026-MOCK-003',
      metaArea: 'Aumento de Receita',
      objetivo: 'Apoiar novas oportunidades a partir de materiais reutilizáveis.',
      keyResult: 'Criar biblioteca de propostas reaproveitáveis para novos projetos.',
      responsavelKR: 'Pessoa Mock 03',
      funcao: 'Produto',
      timeSquad: 'Time Atlas',
      periodo: 'Q2 2026',
      valorBase: '2 modelos',
      valorAlvo: '8 modelos',
      valorAtual: '4 modelos',
      evolucao: '35%',
      status: 'A iniciar',
      sinergia: 'Sim - Alimenta outro time',
      frenteParceira: 'Frente Gama',
      planoAcao: 'Selecionar casos, transformar em modelos e publicar no hub.',
      ultimaAtualizacao: '2026-05-24',
      observacoes: 'Base mockada para simular acompanhamento.',
    },
    3,
  ),
  buildEntry(
    {
      id: 'OKR-2026-MOCK-004',
      metaArea: 'Satisfação do Cliente',
      objetivo: 'Melhorar a clareza de entregas acompanhadas pelo cliente.',
      keyResult: 'Aumentar a percepção de clareza nos materiais de status report.',
      responsavelKR: 'Pessoa Mock 04',
      funcao: 'Design instrucional',
      timeSquad: 'Time Nexo',
      periodo: 'Q3 2026',
      valorBase: '72%',
      valorAlvo: '90%',
      valorAtual: '90%',
      evolucao: '100%',
      status: 'Concluído',
      sinergia: 'Não',
      frenteParceira: 'Frente Delta',
      planoAcao: 'Padronizar status reports e revisar linguagem dos resumos executivos.',
      ultimaAtualizacao: '2026-05-19',
      observacoes: 'Exemplo concluído para validar distribuição por status.',
    },
    4,
  ),
  buildEntry(
    {
      id: 'OKR-2026-MOCK-005',
      metaArea: 'Lead Time',
      objetivo: 'Reduzir espera entre aprovação e disponibilização final.',
      keyResult: 'Automatizar alertas de pendências em etapas críticas.',
      responsavelKR: 'Pessoa Mock 05',
      funcao: 'Dados',
      timeSquad: 'Time Lumen',
      periodo: 'Q2 2026',
      valorBase: '5 alertas manuais',
      valorAlvo: '1 alerta manual',
      valorAtual: '3 alertas manuais',
      evolucao: '50%',
      status: 'Misto (2)',
      sinergia: 'Sim - Alimenta outro time',
      frenteParceira: 'Frente Épsilon',
      planoAcao: 'Integrar planilha mockada ao painel e disparar alertas de atualização.',
      ultimaAtualizacao: '2026-05-15',
      observacoes: 'Status misto proposital para validar UI.',
    },
    5,
  ),
];

export const krsItems: KRsItem[] = [
  buildItem(entries[0]),
  buildItem(entries[1]),
  buildItem(entries[2]),
  buildItem(entries[3]),
  buildItem(entries[4]),
];
