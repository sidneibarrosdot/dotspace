export interface ForumCommentRecord {
  id: string;
  author: string;
  role: string;
  text: string;
  createdAt: string;
  likes: number;
  mine?: boolean;
  parentId?: string | null;
}

export interface ForumCommentNode extends ForumCommentRecord {
  children: ForumCommentNode[];
}

export const forumDiscussionSeed: Record<string, ForumCommentRecord[]> = {
  'forum-onboarding-dotspace': [
    {
      id: 'c-1',
      author: 'Mariana Lopes',
      role: 'People Ops',
      text: 'Podemos incluir um checklist de entrada com validação de acesso, primeiros passos e uma trilha de 7 dias.',
      createdAt: '2026-05-15 09:10',
      likes: 4,
    },
    {
      id: 'c-2',
      author: 'Pedro Silva',
      role: 'Gestão',
      text: 'Também acho útil amarrar o onboarding aos materiais do KR para evitar duplicidade.',
      createdAt: '2026-05-15 11:42',
      likes: 2,
      parentId: 'c-1',
    },
    {
      id: 'c-3',
      author: 'Camila Rocha',
      role: 'People Ops',
      text: 'E podemos manter uma área de dúvidas frequentes para reduzir retrabalho no primeiro contato.',
      createdAt: '2026-05-15 13:20',
      likes: 1,
      parentId: 'c-1',
    },
  ],
  'forum-links-seguros': [
    {
      id: 'c-1',
      author: 'Aline Costa',
      role: 'Operação',
      text: 'Precisamos de um padrão único de pasta por área e links com acesso temporário para materiais sensíveis.',
      createdAt: '2026-05-12 08:25',
      likes: 3,
    },
  ],
  'forum-ia-conteudo': [
    {
      id: 'c-1',
      author: 'Mariana Lopes',
      role: 'Editorial',
      text: 'Podemos usar IA para sugerir inconsistências de tom e duplicidade, mas manter a aprovação humana na etapa final.',
      createdAt: '2026-05-17 10:05',
      likes: 7,
    },
    {
      id: 'c-2',
      author: 'Gustavo Reis',
      role: 'Produto',
      text: 'Um fluxo de revisão com checklist e destaque de risco ajudaria bastante no dia a dia.',
      createdAt: '2026-05-17 13:21',
      likes: 5,
      parentId: 'c-1',
    },
    {
      id: 'c-3',
      author: 'Fernanda Lima',
      role: 'Editorial',
      text: 'Se a IA apontar trechos críticos, a resposta fica dentro da mesma conversa, sem abrir uma tela à parte.',
      createdAt: '2026-05-17 14:03',
      likes: 4,
      parentId: 'c-1',
    },
  ],
  'forum-krs-metricas': [
    {
      id: 'c-1',
      author: 'Patrícia Melo',
      role: 'Gestão',
      text: 'Eu priorizaria valor base, valor atual, valor alvo, evolução e última atualização. O resto fica no detalhe.',
      createdAt: '2026-05-10 09:50',
      likes: 6,
    },
  ],
};

export const buildCommentTree = (comments: ForumCommentRecord[]) => {
  const nodes = new Map<string, ForumCommentNode>();
  const roots: ForumCommentNode[] = [];

  comments.forEach((comment) => {
    nodes.set(comment.id, { ...comment, children: [] });
  });

  comments.forEach((comment) => {
    const node = nodes.get(comment.id);
    if (!node) return;

    if (comment.parentId) {
      const parent = nodes.get(comment.parentId);
      if (parent) {
        parent.children.push(node);
        return;
      }
    }

    roots.push(node);
  });

  const sortNodes = (list: ForumCommentNode[]) => {
    list.sort((a, b) => Date.parse(a.createdAt) - Date.parse(b.createdAt));
    list.forEach((node) => sortNodes(node.children));
  };

  sortNodes(roots);
  return roots;
};
