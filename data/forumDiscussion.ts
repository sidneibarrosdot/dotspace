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
  'forum-mock-documentacao': [
    {
      id: 'c-1',
      author: 'Usuário Mock 01',
      role: 'Governança',
      text: 'Sugiro manter uma página índice com dono, data de revisão e links principais.',
      createdAt: '2026-06-03 09:10',
      likes: 4,
    },
    {
      id: 'c-2',
      author: 'Usuário Mock 02',
      role: 'Operação',
      text: 'Também ajuda separar materiais ativos de materiais arquivados.',
      createdAt: '2026-06-03 10:25',
      likes: 2,
      parentId: 'c-1',
    },
  ],
  'forum-mock-revisao': [
    {
      id: 'c-1',
      author: 'Usuário Mock 03',
      role: 'Qualidade',
      text: 'Um checklist curto antes da revisão final já reduziria bastante o retrabalho.',
      createdAt: '2026-06-02 11:40',
      likes: 3,
    },
  ],
  'forum-mock-ia-segura': [
    {
      id: 'c-1',
      author: 'Usuário Mock 04',
      role: 'Inovação',
      text: 'Podemos usar IA para triagem, mas decisões finais precisam ficar registradas por uma pessoa responsável.',
      createdAt: '2026-05-31 14:15',
      likes: 6,
    },
    {
      id: 'c-2',
      author: 'Usuário Mock 05',
      role: 'Conteúdo',
      text: 'Concordo. O histórico de decisão é mais importante que a sugestão automática.',
      createdAt: '2026-05-31 15:05',
      likes: 3,
      parentId: 'c-1',
    },
  ],
  'forum-mock-indicadores': [
    {
      id: 'c-1',
      author: 'Usuário Mock 06',
      role: 'Dados',
      text: 'Eu começaria com atualização, status, responsável e tempo desde a última revisão.',
      createdAt: '2026-05-29 08:30',
      likes: 5,
    },
  ],
  'forum-mock-priorizacao': [
    {
      id: 'c-1',
      author: 'Usuário Mock 07',
      role: 'Planejamento',
      text: 'Uma matriz simples de impacto e esforço resolve a maioria das priorizações iniciais.',
      createdAt: '2026-05-27 16:20',
      likes: 4,
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
