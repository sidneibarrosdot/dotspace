export interface ForumItem {
  id: string;
  title: string;
  excerpt: string;
  category: string;
  author: string;
  replies: number;
  views: number;
  lastActivity: string;
  pinned?: boolean;
  status?: 'Aberto' | 'Em destaque' | 'Resolvido';
}

export const forumItems: ForumItem[] = [
  {
    id: 'forum-mock-documentacao',
    title: 'Como organizar a documentação do time?',
    excerpt: 'Troca de ideias sobre estrutura, donos e frequência de revisão dos materiais.',
    category: 'Governança',
    author: 'Usuário Mock',
    replies: 8,
    views: 104,
    lastActivity: '2026-06-03',
    pinned: true,
    status: 'Aberto',
  },
  {
    id: 'forum-mock-revisao',
    title: 'Ideias para melhorar rituais de revisão',
    excerpt: 'Sugestões para reduzir retrabalho e deixar aprovações mais previsíveis.',
    category: 'Processos',
    author: 'Usuário Mock',
    replies: 6,
    views: 88,
    lastActivity: '2026-06-02',
    status: 'Em destaque',
  },
  {
    id: 'forum-mock-ia-segura',
    title: 'Boas práticas para usar IA com segurança',
    excerpt: 'Cuidados, limites e formas de registrar decisões apoiadas por assistentes.',
    category: 'Inovação',
    author: 'Usuário Mock',
    replies: 11,
    views: 121,
    lastActivity: '2026-05-31',
    pinned: true,
    status: 'Aberto',
  },
  {
    id: 'forum-mock-indicadores',
    title: 'Quais indicadores ajudam na rotina?',
    excerpt: 'Debate sobre métricas simples para acompanhar evolução e qualidade.',
    category: 'Indicadores',
    author: 'Usuário Mock',
    replies: 4,
    views: 67,
    lastActivity: '2026-05-29',
    status: 'Resolvido',
  },
  {
    id: 'forum-mock-priorizacao',
    title: 'Como priorizar melhorias do hub?',
    excerpt: 'Critérios para organizar demandas, impactos e próximos ajustes do sistema.',
    category: 'Planejamento',
    author: 'Usuário Mock',
    replies: 5,
    views: 72,
    lastActivity: '2026-05-27',
    status: 'Aberto',
  },
];
