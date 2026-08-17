export interface AiAgent {
  id: string;
  area: string;
  nome: string;
  descricao: string;
  categoria: 'Prompt' | 'Agente';
  processo: string;
  perfil: string;
  ferramenta: string;
  responsavel: string;
  linkStudiON?: string;
  status?: string;
  materialDrive?: string;
  pinned?: boolean;
  views?: number;
  likes?: number;
}

export const agentesItems: AiAgent[] = [
  {
    id: 'agente-manual-mapa-conteudo',
    area: 'Conteúdo',
    nome: 'Manual de Prompts para Geração de Mapa de Conteúdo',
    descricao: 'Estrutura mapas de conteúdo a partir de kickoffs, matrizes curriculares e insumos, organizando módulos, tópicos, objetivos de aprendizagem e distribuição de laudas conforme a metodologia institucional.',
    categoria: 'Prompt',
    processo: 'Criação de conteúdo',
    perfil: 'Produtor de Conteúdo, Designer Instrucional',
    ferramenta: 'Assistente IA',
    responsavel: 'Pessoa Mock 01',
    linkStudiON: 'https://example.com/agentes/manual-mapa-conteudo',
    status: 'Escalado',
    materialDrive: 'Material de validação',
    pinned: true,
    views: 45,
    likes: 12
  },
  {
    id: 'agente-manual-producao-conteudo',
    area: 'Conteúdo',
    nome: 'Manual de Prompts para Produção de Conteúdo Técnico-Educacional',
    descricao: 'Apoia a produção estruturada do conteúdo bruto com base no mapa validado, seguindo diretrizes metodológicas e padrões editoriais.',
    categoria: 'Prompt',
    processo: 'Criação de conteúdo',
    perfil: 'Produtor de Conteúdo, Designer Instrucional',
    ferramenta: 'Assistente IA',
    responsavel: 'Pessoa Mock 02',
    linkStudiON: 'https://example.com/agentes/manual-producao-conteudo',
    status: 'Escalado',
    materialDrive: 'Material de validação',
    pinned: true,
    views: 38,
    likes: 8
  },
  {
    id: 'agente-pesquisa-pmv',
    area: 'Conteúdo',
    nome: 'Auxilia na pesquisa conceitual e na construção inicial de PMVs',
    descricao: 'Auxilia na pesquisa conceitual e na construção inicial de PMVs, reunindo referências visuais, padrões de clientes e histórico de projetos.',
    categoria: 'Agente',
    processo: 'Concepção visual',
    perfil: 'Designer Multimídia',
    ferramenta: 'Assistente IA / Base de conhecimento',
    responsavel: 'Pessoa Mock 03',
    status: 'Escalado',
    views: 29,
    likes: 6
  },
  {
    id: 'agente-acompanhamento-turmas',
    area: 'Operações',
    nome: 'Assistente de Acompanhamento de Turmas',
    descricao: 'Automatiza a consulta de dados das turmas e envia relatórios consolidados no Slack, permitindo o acompanhamento em tempo real e apoiando a tomada de decisão sem necessidade de acessar sistemas ou tratar dados manualmente.',
    categoria: 'Agente',
    processo: 'Operação',
    perfil: 'Monitoria, Analista Educacional, Tutoria',
    ferramenta: 'Automação + Mensageria',
    responsavel: 'Pessoa Mock 04',
    status: 'Escalado',
    views: 53,
    likes: 15
  },
  {
    id: 'agente-ura-cognitiva',
    area: 'Operações',
    nome: 'URA Cognitiva',
    descricao: 'A URA Cognitiva tem como objetivo automatizar o atendimento telefônico utilizando reconhecimento de fala, interpretação de intenção do cliente, integração com sistemas corporativos e transferência para atendimento humano quando necessário.',
    categoria: 'Agente',
    processo: 'Operação',
    perfil: 'Monitoria',
    ferramenta: 'Assistente de voz',
    responsavel: 'Pessoa Mock 05',
    views: 41,
    likes: 9
  }
];
