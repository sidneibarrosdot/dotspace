import type { PortfolioItem } from '../types';

const training = (
  id: string,
  projeto: string,
  descricao: string,
  categoria: string,
  tema: string,
  referencia: string,
  link: string,
): PortfolioItem => ({
  id,
  Projeto: projeto,
  Cliente: 'Treinamentos',
  Time: categoria || 'Geral',
  Data: '',
  Imagem_capa: `https://picsum.photos/seed/${id}/900/700`,
  Link_PMV: link,
  Assunto_geral: descricao,
  Assunto_especifico: tema,
  Publico_alvo: '',
  Metodologias: '',
  Mídias: referencia,
  Outros_recursos: '',
  DI: '',
  DM: '',
  tags: [categoria, tema].filter(Boolean),
});

export const treinamentosItems: PortfolioItem[] = [
  training('treinamento-apontamento-horas-jira', 'Apontamento de Horas - Jira', 'Este guia orienta o time de Desenvolvimento EaD a registrar corretamente as horas trabalhadas no Jira, apoiando custos, capacidade, alocação, planejamento e análise de métricas.', 'Jira', 'Apontamento de horas', 'Michele Moura', 'https://drive.google.com/drive/folders/1rK4bF-IY0-qQszXZ9sTZIWNCsQJEciKY'),
  training('treinamento-board-audiovisual', 'Board de AudioVisual', 'Prepara todos os perfis para o uso adequado do Board de AudioVisual.', 'Jira', 'Audiovisual', 'Michele Moura', 'Integração com o board de AV'),
  training('treinamento-board-qa', 'Board de QA', 'Prepara todos os perfis para o uso adequado do Board de QA.', 'Jira', 'QA', 'Michele Moura', 'Board de QA'),
  training('treinamento-board-finhub', 'Board - FINHUB', 'Prepara líderes de projeto para o uso adequado do Board FINHUB.', 'Jira', 'Solicitações de compra', 'Luana Souza', 'FINHUB'),
  training('treinamento-uso-ia', 'Uso de IA', 'Prepara todos os perfis para o campo Uso de IA no Jira.', 'Jira', 'Uso de IA no Jira', 'Michele Moura', 'Campo: USO DE IA'),
  training('treinamento-capacitacao-conteudista', 'Capacitação Conteudista', 'Prepara os perfis para realizar a capacitação com conteudistas.', 'Capacitação de terceiro', 'Capacitação Conteudista', 'Tatiane Betio', '10.Template_Capacitacao_Conteudista'),
  training('treinamento-kick-off', 'Kick off', 'Modelo de apresentação para preparar os perfis para a reunião de Kick off com o cliente.', 'Geral', 'Kick off', '', 'DevEaD_Projeto_Template_Cliente_Projeto_Kickoff.pptx'),
];
