-- ============================================================================
-- Migration: 20261029030000_refine_platform_support_and_faq.sql
-- Descrição: Refinamento da FAQ e Suporte ao Locatário:
--   1. Remoção de notas de propostas comerciais contínuas nos artigos;
--   2. Inclusão da categoria e artigos sobre Dados de Clientes, Privacidade e LGPD;
--   3. Correção do tamanho de fotos: até 3 MB para barbearia e até 2 MB para profissionais;
--   4. Ajuste na regra de inadimplência: contrato de prestação de serviços nos Termos de Uso,
--      tolerância de 5 dias, histórico preservado e prazo de 60 dias para anonimização/expurgo LGPD;
--   5. Adição de artigos sobre cancelamento/alteração de plano, folgas/bloqueios na agenda e comissões.
-- ============================================================================

-- 1. Atualizar e criar categorias
insert into public.platform_faq_categories (id, title, description, icon, sort_order)
values
  ('customers', 'Clientes & LGPD', 'Privacidade, consentimentos, histórico e direitos dos titulares.', '🛡️', 3),
  ('commercial', 'Suporte & SLA', 'Prazos de atendimento técnico, abertura de chamados e canais de ajuda.', '💬', 5)
on conflict (id) do update set
  title = excluded.title,
  description = excluded.description,
  icon = excluded.icon,
  sort_order = excluded.sort_order;

update public.platform_faq_categories set sort_order = 1 where id = 'agenda';
update public.platform_faq_categories set sort_order = 2 where id = 'team';
update public.platform_faq_categories set sort_order = 3 where id = 'customers';
update public.platform_faq_categories set sort_order = 4 where id = 'billing';
update public.platform_faq_categories set sort_order = 5 where id = 'commercial';
update public.platform_faq_categories set sort_order = 6 where id = 'system';

-- 2. Atualizar artigos existentes

-- 2.1 Período de testes: remover nota comercial
update public.platform_faq_articles
set
  commercial_offer_note = null
where category_id = 'billing' and question like 'Como funciona o período de testes%';

-- 2.2 Intervalos de 10 minutos: remover nota comercial
update public.platform_faq_articles
set
  commercial_offer_note = null
where category_id = 'agenda' and question like '%intervalos de 10 minutos%';

-- 2.3 SLA de suporte: remover garantia comercial/proposta, focar no SLA técnico de 1 dia útil
update public.platform_faq_articles
set
  category_id = 'commercial',
  question = 'Qual é o prazo de resposta e SLA do suporte da plataforma?',
  answer = 'Todo chamado de suporte aberto por proprietário ou gestor da barbearia recebe confirmação imediata, responsável atribuído e primeira resposta técnica em até 1 dia útil.',
  commercial_offer_note = null
where question like 'Qual é o SLA do suporte%';

-- 2.4 Fatura atrasar / Inadimplência: contrato SaaS nos Termos de Uso, tolerância de 5 dias, dados preservados, após 60 dias anonimização/expurgo LGPD
update public.platform_faq_articles
set
  answer = 'A assinatura dos planos é regida pelos Termos de Uso e Regras de Assinatura (contrato eletrônico de prestação de serviços). Em caso de atraso, há um período de tolerância operacional de 5 dias mantendo a agenda. Após esse prazo, os agendamentos públicos são pausados, mas os dados e históricos não são apagados imediatamente. Conforme a LGPD e a Política de Privacidade, após 60 dias do encerramento definitivo do contrato, os dados pessoais que não precisem ser retidos por obrigação legal ou fiscal são anonimizados ou expurgados com segurança.',
  commercial_offer_note = null
where category_id = 'billing' and question like 'O que acontece se uma fatura atrasar%';

-- 2.5 Foto de capa e contatos: corrigir tamanho máximo para 3 MB para barbearia e 2 MB para profissionais (JPG, PNG ou WebP)
update public.platform_faq_articles
set
  answer = 'Acesse Painel > Configurações (ou Mais > Dados da Barbearia) para atualizar WhatsApp, endereço no mapa, telefone fixo e foto de capa (formatos JPG, PNG ou WebP de até 3 MB). Para fotos de perfil dos profissionais, o limite é de até 2 MB.',
  commercial_offer_note = null
where category_id = 'system' and question like 'Como alterar a foto de capa%';

-- 3. Inserir novos artigos da FAQ

-- 3.1 Clientes & LGPD (Dados dos clientes)
insert into public.platform_faq_articles (category_id, question, answer, commercial_offer_note, sort_order)
values
  ('customers', 'Como funciona a privacidade e a gestão dos dados dos clientes (LGPD)?',
   'O BarbeariaSP cumpre integralmente a LGPD. Os clientes possuem cadastro seguro com consentimento de termos e marketing registrado. O cliente pode consultar seus próprios agendamentos, revogar consentimentos ou solicitar exclusão da conta pelo portal dele. A barbearia pode consultar sua base de clientes vinculados e exportar os dados em formatos CSV ou JSON diretamente pelo painel administrativo.',
   null, 1),
  ('customers', 'A barbearia pode exportar a lista e os dados de seus clientes?',
   'Sim. O proprietário da barbearia pode realizar a exportação manual da base de clientes em formato CSV ou JSON. Os arquivos são montados no próprio navegador e baixados diretamente no dispositivo, com sanitização de fórmulas e sem retenção permanente no servidor.',
   null, 2),
  ('billing', 'Como funciona o cancelamento ou alteração do plano SaaS?',
   'O proprietário pode acessar Painel > Assinatura a qualquer momento para consultar faturas, atualizar o plano ou cancelar a renovação automática. Em caso de cancelamento, a barbearia continua operando normalmente até o final da vigência já paga, sem multas surpresa.',
   null, 3),
  ('agenda', 'Como configurar folgas, feriados ou horários especiais na agenda?',
   'Acesse Painel > Horários para configurar os dias e horários de funcionamento da barbearia, bem como a jornada individual de cada profissional. Dias marcados como fechados ou intervalos bloqueiam automaticamente novos agendamentos públicos, prevenindo qualquer conflito.',
   null, 3),
  ('team', 'Como funciona o cálculo e repasse de comissões dos profissionais?',
   'Cada profissional cadastrado pode ter uma taxa percentual de comissão personalizada por serviço. Na tela de Relatórios, a gestão visualiza o faturamento bruto, o valor exato devido a cada membro da equipe e pode marcar os repasses como pagos com auditoria.',
   null, 2)
on conflict do nothing;
