
export interface InventoryEntryLike {
  area?: string;
  squad?: string;
  responsavel?: string;
  funcao?: string;
  finalidade?: string;
  status?: string;
  prioridade?: string;
  link?: string;
  titulo?: string;
  id?: string;
  metaArea?: string;
  objetivo?: string;
  keyResult?: string;
  responsavelKR?: string;
  timeSquad?: string;
  periodo?: string;
  valorBase?: string;
  valorAlvo?: string;
  valorAtual?: string;
  evolucao?: string;
  sinergia?: string;
  frenteParceira?: string;
  planoAcao?: string;
  ultimaAtualizacao?: string;
  observacoes?: string;
  sourceSheetRow?: number;
  sourceIndex?: number;
  pinned?: boolean;
}

export interface PortfolioItem {
  id: string;
  Imagem_capa: string;
  Time: string;
  Cliente: string;
  Data: string;
  Projeto: string;
  DI: string;
  DM: string;
  Link_PMV: string;
  Assunto_geral: string;
  Assunto_especifico: string;
  Publico_alvo: string;
  Metodologias: string;
  Mídias: string;
  Outros_recursos: string;
  tags?: string[];
  likes?: number;
  views?: number;
  versao?: string;
  integridade?: string;
  ultimaRevisao?: string;
  Finalidade?: string;
  Prioridade?: string;
  statusConteudo?: string;
  proximaRevisao?: string;
  duracao?: string;
  links?: Array<{
    label: string;
    href: string;
    hint?: string;
  }>;
  pinned?: boolean;
  objetivo?: string;
  indicador?: string;
  meta?: string;
  resultado?: string;
  ciclo?: string;
  responsavel?: string;
  statusKR?: string;
  krLinks?: Array<{
    label: string;
    href: string;
    hint?: string;
  }>;
  inventoryEntries?: InventoryEntryLike[];
  groupCount?: number;
}

export interface Favorite {
  id: string;
  userId: string;
  projectId: string;
  timestamp: string;
}

export interface FavoriteList {
  id: string;
  userId: string;
  name: string;
  projectIds: string[];
  isDefault?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface Like {
  id: string;
  userId: string;
  projectId: string;
  timestamp: string;
}

export type AppEnvironment = 'production' | 'test';
export type DevelopmentLockKey = 'processos' | 'treinamentos' | 'krs' | 'forum';

export interface AppSettings {
  manualInteractionsEnabled: boolean;
  developmentLockedSections: DevelopmentLockKey[];
  environment: AppEnvironment;
  updatedAt?: string;
  updatedBy?: string;
}
