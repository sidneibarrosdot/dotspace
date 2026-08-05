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
    area: 'DevEad',
    nome: 'Manual de Prompts para Geração de Mapa de Conteúdo',
    descricao: 'Estrutura mapas de conteúdo a partir de kickoffs, matrizes curriculares e insumos, organizando módulos, tópicos, objetivos de aprendizagem e distribuição de laudas conforme a metodologia institucional.',
    categoria: 'Prompt',
    processo: 'Criação de conteúdo',
    perfil: 'Produtor de Conteúdo, Designer Instrucional',
    ferramenta: 'Gemini',
    responsavel: 'Isaneli Batista dos Santos / Daniele Amstalden Libardi Elias',
    linkStudiON: 'https://studion-dho.dotgroup.com.br/classroom/050ecf78-c4b9-48d2-b3f6-f24ad6088978/panel/dashboard#iss=https%3A%2F%2Fstudion-identity-keycloak.dotgroup.com.br%2Frealms%2Fdho&state=180c4f7e-d8d5-42fc-864f-ee57f08e1a19&session_state=be763824-dbee-4125-946e-e329cbbfb15c&iss=https%3A%2F%2Fstudion-identity-keycloak.dotgroup.com.br%2Frealms%2Fdho&code=3cf5ecfb-5ae0-4927-a0c1-a8081316fc14.be763824-dbee-4125-946e-e329cbbfb15c.f117fac8-ad4c-4463-84b3-c12e4f8ceb0a',
    status: 'Escalado',
    materialDrive: 'Geração_Mapa_Conteúdo_Gemini',
    pinned: true,
    views: 45,
    likes: 12
  },
  {
    id: 'agente-manual-producao-conteudo',
    area: 'DevEad',
    nome: 'Manual de Prompts para Produção de Conteúdo Técnico-Educacional',
    descricao: 'Apoia a produção estruturada do conteúdo bruto com base no mapa validado, seguindo diretrizes metodológicas e padrões editoriais.',
    categoria: 'Prompt',
    processo: 'Criação de conteúdo',
    perfil: 'Produtor de Conteúdo, Designer Instrucional',
    ferramenta: 'Gemini',
    responsavel: 'Isaneli Batista dos Santos / Daniele Amstalden Libardi Elias',
    linkStudiON: 'https://studion-dho.dotgroup.com.br/classroom/56d5a2a2-2680-472e-8fbb-8b0b200369d9/panel/dashboard#iss=https%3A%2F%2Fstudion-identity-keycloak.dotgroup.com.br%2Frealms%2Fdho&iss=https%3A%2F%2Fstudion-identity-keycloak.dotgroup.com.br%2Frealms%2Fdho&state=f1c98717-152f-44be-af5e-bf7f3665594b&session_state=be763824-dbee-4125-946e-e329cbbfb15c&iss=https%3A%2F%2Fstudion-identity-keycloak.dotgroup.com.br%2Frealms%2Fdho&code=22b4d7be-9fa5-4314-bb8b-647c2c60781b.be763824-dbee-4125-946e-e329cbbfb15c.f117fac8-ad4c-4463-84b3-c12e4f8ceb0a',
    status: 'Escalado',
    materialDrive: 'Manual',
    pinned: true,
    views: 38,
    likes: 8
  },
  {
    id: 'agente-pesquisa-pmv',
    area: 'DevEad',
    nome: 'Auxilia na pesquisa conceitual e na construção inicial de PMVs',
    descricao: 'Auxilia na pesquisa conceitual e na construção inicial de PMVs, reunindo referências visuais, padrões de clientes e histórico de projetos.',
    categoria: 'Agente',
    processo: 'Concepção visual',
    perfil: 'Designer Multimídia',
    ferramenta: 'Gemini / Notebook LM',
    responsavel: 'Gabriel Novaes Bastos',
    status: 'Escalado',
    views: 29,
    likes: 6
  },
  {
    id: 'agente-acompanhamento-turmas',
    area: 'OPE',
    nome: 'Assistente de Acompanhamento de Turmas',
    descricao: 'Automatiza a consulta de dados das turmas e envia relatórios consolidados no Slack, permitindo o acompanhamento em tempo real e apoiando a tomada de decisão sem necessidade de acessar sistemas ou tratar dados manualmente.',
    categoria: 'Agente',
    processo: 'Operação',
    perfil: 'Monitoria, Analista Educacional, Tutoria',
    ferramenta: 'Dottie + Slack',
    responsavel: 'Silvio Cesar',
    status: 'Escalado',
    views: 53,
    likes: 15
  },
  {
    id: 'agente-ura-cognitiva',
    area: 'OPE',
    nome: 'URA Cognitiva',
    descricao: 'A URA Cognitiva tem como objetivo automatizar o atendimento telefônico utilizando reconhecimento de fala, interpretação de intenção do cliente, integração com sistemas corporativos e transferência para atendimento humano quando necessário.',
    categoria: 'Agente',
    processo: 'Operação',
    perfil: 'Monitoria',
    ferramenta: 'LIGO + DOTAI',
    responsavel: 'Thais Moraes',
    views: 41,
    likes: 9
  }
];
