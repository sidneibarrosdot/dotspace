
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
}

export interface Favorite {
  id: string;
  userId: string;
  projectId: string;
  timestamp: string;
}

export interface Like {
  id: string;
  userId: string;
  projectId: string;
  timestamp: string;
}
