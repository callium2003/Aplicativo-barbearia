// Capturas das rotas reais, realizadas no stack demo local em 06/10/2026.
// Nenhum dado de cliente real, imagem gerada ou interface simulada.
const screen = (file, title, text, route) => ({
  src: `/marketing-demo/${file}.jpg`, title, text, route,
  alt: `${title} no BarbeariaSP, com dados fictícios da Barbearia Vila Mariana`,
  width: 375, height: 811,
});

export const demoScreenGroups = [
  {
    id: 'demo-cliente', title: 'O agendamento visto pelo cliente',
    description: 'Da página da barbearia à reserva confirmada, acompanhe as etapas do aplicativo.',
    screens: [
      screen('pagina-publica', 'Página da barbearia', 'Serviços, equipe e acesso ao agendamento em um link próprio.', '/[slug]'),
      screen('reserva-data', 'Escolha da data', 'O calendário mostra os dias disponíveis para agendar.', '/[slug]'),
      screen('reserva-servicos', 'Serviços e profissional', 'Selecione até três serviços e o profissional de sua preferência.', '/[slug]'),
      screen('reserva-horarios', 'Escolha do horário', 'Consulte a disponibilidade real para a data e os serviços escolhidos.', '/[slug]'),
      screen('reserva-confirmacao', 'Revisão da reserva', 'Confira serviço, profissional, data, horário e seus dados antes de confirmar.', '/[slug]'),
      screen('reserva-confirmada', 'Agendamento confirmado', 'A confirmação aparece após a reserva ser salva.', '/[slug]'),
      screen('cliente-agenda', 'Área do cliente', 'Consulte suas reservas e acesse as ações disponíveis para cada atendimento.', '/meus-agendamentos'),
    ],
  },
  {
    id: 'demo-gestao', title: 'A rotina na área da barbearia',
    description: 'Veja como os cadastros e os agendamentos aparecem na operação da barbearia.',
    screens: [
      screen('gestao-servicos', 'Catálogo de serviços', 'Organize os serviços, preços, durações e a disponibilidade para novos agendamentos.', '/painel/servicos'),
      screen('gestao-cadastro-servico', 'Cadastro de serviço', 'O formulário real de cadastro reúne nome, valor e duração.', '/painel/servicos'),
      screen('gestao-agenda', 'Agenda da barbearia', 'Consulte os próximos atendimentos por período e situação.', '/painel/agenda'),
      screen('gestao-comissoes', 'Comissões e repasses', 'Acompanhe as comissões geradas pelos atendimentos concluídos.', '/painel/relatorios'),
      screen('gestao-comissao-detalhe', 'Detalhe da comissão', 'Veja serviço, venda, taxa, valor da comissão e situação do repasse.', '/painel/relatorios'),
      screen('gestao-notificacoes', 'Notificações', 'Os avisos acompanham os eventos da agenda dentro do sistema.', '/painel/notificacoes'),
      screen('gestao-faturamento', 'Faturamento', 'Consulte receita, ticket médio e comissões na visão geral de Relatórios.', '/painel/relatorios'),
    ],
  },
];
