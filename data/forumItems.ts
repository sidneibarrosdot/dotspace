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
    id: 'forum-onboarding-dotspace',
    title: 'Como padronizar o onboarding no DOT Space?',
    excerpt: 'Discussão sobre checklist, trilhas e pontos de revisão para novos colaboradores.',
    category: 'Processos internos',
    author: 'People Ops',
    replies: 12,
    views: 184,
    lastActivity: '2026-05-14',
    pinned: true,
    status: 'Em destaque',
  },
  {
    id: 'forum-links-seguros',
    title: 'Melhor forma de organizar links seguros por área',
    excerpt: 'Estrutura de permissões, acesso rápido e governança para materiais críticos.',
    category: 'Governança',
    author: 'Operação',
    replies: 8,
    views: 126,
    lastActivity: '2026-05-11',
    status: 'Aberto',
  },
  {
    id: 'forum-ia-conteudo',
    title: 'IA para apoiar revisão de conteúdo e produtividade',
    excerpt: 'Ideias de uso prático de IA sem comprometer o padrão editorial da plataforma.',
    category: 'Inovação',
    author: 'Editorial',
    replies: 19,
    views: 213,
    lastActivity: '2026-05-17',
    pinned: true,
    status: 'Aberto',
  },
  {
    id: 'forum-krs-metricas',
    title: 'Quais métricas devem ficar no Banco de KR’s?',
    excerpt: 'Estrutura de indicadores, metas e frequência ideal de atualização.',
    category: 'Banco de KR’s',
    author: 'Gestão',
    replies: 5,
    views: 98,
    lastActivity: '2026-05-09',
    status: 'Resolvido',
  },
];
