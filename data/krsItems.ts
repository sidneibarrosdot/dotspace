import type { PortfolioItem } from '../types';
import okrCover from '../assets/home-cards/okrs.png';

export interface KrInventoryEntry {
  id: string;
  sourceIndex: number;
  aposta: string;
  projetoEstrategico: string;
  canalSlack: string;
  iniciativa: string;
  participantesIniciativa: string;
  roadmapAcoes: string;
  indicadoresSucesso: string;
  responsaveis: string;
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
  aposta: string;
  projetoEstrategico: string;
  canalSlack: string;
  iniciativa: string;
  participantesIniciativa: string;
  roadmapAcoes: string;
  indicadoresSucesso: string;
  responsaveis: string;
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
    aposta: entry.aposta,
    projetoEstrategico: entry.projetoEstrategico,
    canalSlack: entry.canalSlack,
    iniciativa: entry.iniciativa,
    participantesIniciativa: entry.participantesIniciativa,
    roadmapAcoes: entry.roadmapAcoes,
    indicadoresSucesso: entry.indicadoresSucesso,
    responsaveis: entry.responsaveis,
    Imagem_capa: okrCover,
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

const COMMON_OBJECTIVE = 'Fortalecer ritos e métricas para garantir decisões rápidas e uma operação previsível, escalável e eficiente.';
const COMMON_PARTICIPANTS = 'Coordenação: Pessoa Mock 01\nLiderança: Pessoa Mock 02';

const entries = [
  buildEntry(
    {
      id: 'OKR-2026-MOCK-001',
      aposta: 'Maturidade Digital da Operação',
      objetivo: COMMON_OBJECTIVE,
      projetoEstrategico: 'Gestão Ágil',
      canalSlack: '#canal-exemplo-gestao',
      iniciativa: 'Hub de Conhecimento',
      participantesIniciativa: COMMON_PARTICIPANTS,
      roadmapAcoes: 'Implementar o hub de treinamentos e organizar conteúdos prioritários.',
      indicadoresSucesso: 'Garantir que 80% dos conteúdos prioritários estejam atualizados e disponíveis no hub.',
      responsaveis: 'Pessoa Mock 03, Pessoa Mock 04',
      metaArea: 'Maturidade Digital',
      keyResult: 'Hub de Conhecimento',
      responsavelKR: 'Pessoa Mock 03, Pessoa Mock 04',
      funcao: 'Gestão Ágil',
      timeSquad: 'Participação multidisciplinar',
      periodo: 'Q3 2026',
      valorBase: '', valorAlvo: '', valorAtual: '', evolucao: '',
      status: 'Em andamento', sinergia: '', frenteParceira: '',
      planoAcao: 'Implementar o hub de treinamentos e organizar conteúdos prioritários.',
      ultimaAtualizacao: '2026-06-01',
      observacoes: 'Garantir que 80% dos conteúdos prioritários estejam atualizados e disponíveis no hub.',
    },
    1,
  ),
  buildEntry(
    {
      id: 'OKR-2026-MOCK-002',
      aposta: 'Maturidade Digital da Operação', objetivo: COMMON_OBJECTIVE,
      projetoEstrategico: 'Gestão Ágil', canalSlack: '#canal-exemplo-gestao', iniciativa: 'Assistente de Gestão',
      participantesIniciativa: `${COMMON_PARTICIPANTS}\nResponsável: Pessoa Mock 05`,
      roadmapAcoes: 'Atualizar a base de conhecimento.\nColetar feedbacks das equipes.\nImplementar melhorias na governança.',
      indicadoresSucesso: 'Alcançar satisfação igual ou superior a 85% com a utilidade das orientações disponibilizadas.',
      responsaveis: 'Pessoa Mock 05, Pessoa Mock 06',
      metaArea: 'Maturidade Digital', keyResult: 'Assistente de Gestão', responsavelKR: 'Pessoa Mock 05, Pessoa Mock 06',
      funcao: 'Gestão Ágil', timeSquad: 'Participação multidisciplinar', periodo: 'Q3 2026',
      valorBase: '', valorAlvo: '', valorAtual: '', evolucao: '', status: 'Em andamento', sinergia: '', frenteParceira: '',
      planoAcao: 'Atualizar a base de conhecimento, coletar feedbacks e implementar melhorias.',
      ultimaAtualizacao: '2026-05-28',
      observacoes: 'Alcançar satisfação igual ou superior a 85% com a utilidade das orientações disponibilizadas.',
    },
    2,
  ),
  buildEntry(
    {
      id: 'OKR-2026-MOCK-003',
      aposta: 'Maturidade Digital da Operação', objetivo: COMMON_OBJECTIVE,
      projetoEstrategico: 'Gestão Ágil', canalSlack: '#canal-exemplo-gestao', iniciativa: 'Central de Rituais',
      participantesIniciativa: `${COMMON_PARTICIPANTS}\nResponsável: Pessoa Mock 07`,
      roadmapAcoes: 'Mapear rituais existentes.\nDefinir o modelo de governança.\nCapacitar usuários-chave.',
      indicadoresSucesso: 'Garantir utilização recorrente da central em 90% dos rituais de acompanhamento.',
      responsaveis: 'Pessoa Mock 07, Pessoa Mock 08',
      metaArea: 'Maturidade Digital', keyResult: 'Central de Rituais', responsavelKR: 'Pessoa Mock 07, Pessoa Mock 08',
      funcao: 'Gestão Ágil', timeSquad: 'Participação multidisciplinar', periodo: 'Q3 2026',
      valorBase: '', valorAlvo: '', valorAtual: '', evolucao: '', status: 'Bloqueado', sinergia: '', frenteParceira: '',
      planoAcao: 'Mapear rituais, definir governança e capacitar usuários-chave.',
      ultimaAtualizacao: '2026-05-24',
      observacoes: 'Garantir utilização recorrente da central em 90% dos rituais de acompanhamento.',
    },
    3,
  ),
  buildEntry(
    {
      id: 'OKR-2026-MOCK-004',
      aposta: 'Maturidade Digital da Operação', objetivo: COMMON_OBJECTIVE,
      projetoEstrategico: 'Gestão Ágil', canalSlack: '#canal-exemplo-gestao', iniciativa: 'Relatórios Integrados',
      participantesIniciativa: `${COMMON_PARTICIPANTS}\nResponsável: Pessoa Mock 09`,
      roadmapAcoes: 'Agrupar projetos relacionados.\nPadronizar histórias e subtarefas.\nPermitir edição antes da geração do relatório.',
      indicadoresSucesso: 'Garantir o uso dos relatórios por 100% das lideranças dos projetos elegíveis.',
      responsaveis: 'Pessoa Mock 09',
      metaArea: 'Maturidade Digital', keyResult: 'Relatórios Integrados', responsavelKR: 'Pessoa Mock 09',
      funcao: 'Gestão Ágil', timeSquad: 'Participação multidisciplinar', periodo: 'Q3 2026',
      valorBase: '', valorAlvo: '', valorAtual: '', evolucao: '', status: 'Concluído', sinergia: '', frenteParceira: '',
      planoAcao: 'Agrupar projetos, padronizar registros e permitir revisão antes da geração.',
      ultimaAtualizacao: '2026-05-19',
      observacoes: 'Garantir o uso dos relatórios por 100% das lideranças dos projetos elegíveis.',
    },
    4,
  ),
];

export const krsItems: KRsItem[] = [
  buildItem(entries[0]),
  buildItem(entries[1]),
  buildItem(entries[2]),
  buildItem(entries[3]),
];
