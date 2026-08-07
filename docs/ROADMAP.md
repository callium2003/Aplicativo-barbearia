# Roadmap

## Fase 0 — Fundação

**Parcial:** baseline e migrations versionados e reconciliados com o histórico remoto; catálogo público restrito, reserva autenticada, convites de equipe e testes automatizados ativos. Permanecem replay integral em banco descartável, homologação de produção, monitoramento e revisão periódica de dependências.

## Fase 1 — Clientes, CRM e consentimentos

**Implementado:** cliente global, relação por barbearia, histórico seguro, consentimentos separados, lista real de clientes, reserva autenticada, Área do Cliente própria e WhatsApp operacional.

**Implementado tecnicamente em homologação:** primeiro acesso do cliente por Google ou magic link, perfil com nome + celular/WhatsApp obrigatório, edição de perfil, próximos agendamentos, histórico, reagendamento/cancelamento e contato manual cliente ↔ barbearia.

**Próximas evoluções:** filtros/segmentos avançados para campanhas e automações de marketing. O CSV operacional já existe dentro dos relatórios; exportações específicas de marketing devem respeitar consentimentos.

## Fase 2 — Atendimentos, relatórios e comissão

**Implementado tecnicamente em homologação:** percentual de comissão por profissional; cálculo automático e congelado na conclusão; repasse `pending`/`paid`; auditoria; Agenda com `scheduled`, `confirmed`, `completed`, `cancelled` e `no_show`; contato por WhatsApp; disponibilidade própria do barbeiro.

**Implementado:** relatórios gerenciais com período customizado e filtro por profissional: visão geral, agendamentos, equipe, serviços, clientes e comissões; faturamento, ticket médio, receita após comissão, cancelamento/no-show, clientes novos/recorrentes/reagendados, ocupação real, desempenho por profissional/serviço e exportação CSV.

As migrations `20260807070808_add_customer_account_and_complete_management_reports.sql` e `20260807070958_fix_management_report_service_revenue_share.sql` complementam a migration financeira `20260807044250` e estão aplicadas no Supabase remoto de homologação.

**Próximas evoluções condicionadas a novos eventos de negócio:** caixa por forma de pagamento, despesas, impostos, venda de produtos, estoque, avaliações e ROI de campanhas. Não serão criados relatórios fictícios antes da captura desses dados.

## Fase 3 — Experiência e identidade visual

**Implementado tecnicamente:** sistema visual premium compartilhado inspirado no modelo fornecido pela proprietária; Home do painel, Agenda, Clientes, Equipe/Disponibilidade, Relatórios, login administrativo, login/Área do Cliente e Meus Agendamentos usam o novo padrão. Telas legadas grandes recebem acabamento visual compatível sem reescrita de regra.

**Parcial:** revisão visual em dispositivos reais, refinamento da página pública de agendamento, ilustrações/marca final e homologação visual da proprietária.

## Fase 4 — Landing page, proposta comercial e preços

A landing atual continua propositalmente provisória. A proprietária decidiu deixar para depois a pesquisa/definição de precificação e a landing comercial definitiva.

Pendente: screenshots reais do produto, demonstração/vídeo, benefícios, diferenciais, prova visual, modelo de planos, limites por profissionais/unidades/usuários, preços, descontos, trial definitivo e textos comerciais.

## Fase 5 — Planos, trial e pagamento

Trial e bloqueio visual são parciais. Faltam decisão de provedor, checkout, webhooks, cobrança, bloqueio real e portal. A definição comercial da Fase 4 deve preceder a implementação definitiva desta fase.

## Fase 6 — Notificações e e-mail

**Parcial:** Google e magic link funcionam no fluxo homologado. Faltam SMTP profissional, SPF, DKIM, DMARC, confirmações automáticas, lembretes e recuperação de falhas.

## Fase 7 — Deploy e produção

O domínio `barbeariasp.cullentech.com.br` foi apenas reservado. Faltam hospedagem/publicação, HTTPS, redirects definitivos de Auth, backups, monitoramento e homologação final.

## Backlog técnico

Replay integral das migrations em banco descartável, documentação de deploy, homologação visual/device QA, cobertura adicional de testes, revisão periódica das vulnerabilidades npm e dos quatro scripts de instalação ainda pendentes. Drizzle/D1 já foram removidos.
