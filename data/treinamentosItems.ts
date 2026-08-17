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

// Dados temporários para validação; a integração com a planilha substituirá esta fonte.
export const treinamentosItems: PortfolioItem[] = [
  training('treinamento-apontamento-horas-jira', 'Apontamento de Horas - Jira', 'Este guia orienta o registro correto das horas trabalhadas, apoiando custos, capacidade, alocação, planejamento e análise de métricas.', 'Apontamento de horas', 'Apontamento de horas', 'Pessoa Mock 01', 'https://example.com/treinamentos/apontamento-horas'),
  training('treinamento-board-audiovisual', 'Board de AudioVisual', 'Prepara todos os perfis para o uso adequado do Board de AudioVisual.', 'Audiovisual', 'Audiovisual', 'Pessoa Mock 02', 'https://example.com/treinamentos/board-audiovisual'),
  training('treinamento-board-qa', 'Board de QA', 'Prepara todos os perfis para o uso adequado do Board de QA.', 'Jira', 'QA', 'Pessoa Mock 03', 'https://example.com/treinamentos/board-qa'),
  training('treinamento-board-finhub', 'Board de compras', 'Prepara líderes de projeto para o uso adequado do fluxo de solicitações.', 'Solicitações de compra', 'Solicitações de compra', 'Pessoa Mock 04', 'https://example.com/treinamentos/solicitacoes-compra'),
  training('treinamento-uso-ia', 'Uso de IA', 'Prepara todos os perfis para registrar o uso de IA nas atividades.', 'Uso de IA', 'Uso de IA nas atividades', 'Pessoa Mock 05', 'https://example.com/treinamentos/uso-ia'),
  training('treinamento-capacitacao-conteudista', 'Capacitação Conteudista', 'Prepara os perfis para realizar a capacitação com conteudistas.', 'Capacitação terceiros', 'Capacitação Conteudista', 'Pessoa Mock 06', 'https://example.com/treinamentos/capacitacao-conteudista'),
  training('treinamento-kick-off', 'Kick off', 'Modelo de apresentação para preparar os perfis para a reunião de Kick off com o cliente.', 'Líder de Projeto', 'Kick off', 'Pessoa Mock 07', 'https://example.com/treinamentos/kick-off'),
  training('treinamento-design-instrucional', 'Fundamentos de Design Instrucional', 'Apresenta práticas para estruturar experiências de aprendizagem claras, relevantes e orientadas aos objetivos do projeto.', 'Design Instrucional', 'Planejamento educacional', 'Pessoa Mock 08', 'https://example.com/treinamentos/design-instrucional'),
  training('treinamento-design-multimidia', 'Produção de Recursos Multimídia', 'Orienta a criação e revisão de recursos visuais, sonoros e interativos para experiências digitais de aprendizagem.', 'Design Multimidia', 'Produção multimídia', 'Pessoa Mock 09', 'https://example.com/treinamentos/design-multimidia'),
  training('treinamento-faturamento', 'Fluxo de Faturamento', 'Demonstra os principais passos, responsáveis e documentos necessários para acompanhar o faturamento dos projetos.', 'Faturamento', 'Rotina financeira', 'Pessoa Mock 10', 'https://example.com/treinamentos/faturamento'),
  training('treinamento-front-end', 'Padrões de Front End', 'Reúne padrões de interface, acessibilidade e qualidade usados na implementação dos produtos digitais.', 'Front End', 'Desenvolvimento de interfaces', 'Pessoa Mock 11', 'https://example.com/treinamentos/front-end'),
  training('treinamento-jira', 'Gestão de atividades no Jira', 'Apresenta o fluxo recomendado para criar, organizar, atualizar e acompanhar atividades nos boards dos projetos.', 'Jira', 'Gestão de atividades', 'Pessoa Mock 12', 'https://example.com/treinamentos/jira'),
  training('treinamento-onboarding', 'Onboarding de novos colaboradores', 'Organiza os conteúdos essenciais para a integração de novos colaboradores aos processos, ferramentas e práticas da empresa.', 'Onboarding', 'Integração de pessoas', 'Pessoa Mock 13', 'https://example.com/treinamentos/onboarding'),
];
