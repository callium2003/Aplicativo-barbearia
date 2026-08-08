# Roadmap

## Fase 0 — Fundação

**Parcial:** baseline e migrations versionados e reconciliados com o histórico remoto; catálogo público restrito, reserva autenticada, convites de equipe e testes automatizados ativos. Permanecem replay integral em banco descartável, homologação de produção, monitoramento e revisão periódica de dependências.

## Fase 1 — Clientes, CRM e consentimentos

**Implementado:** cliente global, relação por barbearia, histórico seguro, consentimentos separados, lista real de clientes, reserva autenticada, Área do Cliente própria e WhatsApp operacional.

**Implementado tecnicamente em homologação:** primeiro acesso do cliente por Google ou magic link, perfil com nome + celular/WhatsApp obrigatório, edição de perfil, próximos agendamentos, histórico, reagendamento/cancelamento e contato manual cliente ↔ barbearia.

**Homologação incremental 08/08/2026 — Lote 1:** reagendamento e cancelamento foram ajustados para resolver a barbearia antes de alterar o agendamento. Reagendar cancela a reserva atual e retorna para a mesma página pública com os serviços anteriores pré-selecionados; cancelar retorna para a página pública da mesma barbearia. A relação Supabase `appointments → barbershops` passou a ser tratada de forma compatível com retorno como objeto ou lista.

**Próximas evoluções:** filtros/segmentos avançados para campanhas e automações de marketing. O CSV operacional já existe dentro dos relatórios; exportações específicas de marketing devem respeitar consentimentos.

## Fase 2 — Atendimentos, relatórios e comissão

**Implementado tecnicamente em homologação:** percentual de comissão por profissional; cálculo automático e congelado na conclusão; repasse `pending`/`paid`; auditoria; Agenda com `scheduled`, `confirmed`, `completed`, `cancelled` e `no_show`; contato por WhatsApp; disponibilidade própria do barbeiro.

**Implementado:** relatórios gerenciais com período customizado e filtro por profissional: visão geral, agendamentos, equipe, serviços, clientes e comissões; faturamento, ticket médio, receita após comissão, cancelamento/no-show, clientes novos/recorrentes/reagendados, ocupação real, desempenho por profissional/serviço e exportação CSV.

As migrations `20260807070808_add_customer_account_and_complete_management_reports.sql` e `20260807070958_fix_management_report_service_revenue_share.sql` complementam a migration financeira `20260807044250` e estão aplicadas no Supabase remoto de homologação.

**Próximas evoluções condicionadas a novos eventos de negócio:** caixa por forma de pagamento, despesas, impostos, venda de produtos, estoque, avaliações e ROI de campanhas. Não serão criados relatórios fictícios antes da captura desses dados.

## Fase 3 — Experiência e identidade visual

**Implementado tecnicamente:** sistema visual premium compartilhado inspirado no modelo fornecido pela proprietária; Home do painel, Agenda, Clientes, Equipe/Disponibilidade, Relatórios, login administrativo, login/Área do Cliente e Meus Agendamentos usam o novo padrão. Telas legadas grandes recebem acabamento visual compatível sem reescrita de regra.

**Homologação incremental 08/08/2026 — Lote 1:** novos cadastros passam a gerar slug público somente a partir do nome da barbearia, sem UUID ou sufixo aleatório. A unicidade continua protegida por `barbershops_slug_key`; se o nome normalizado já existir, o cadastro pede outro nome em vez de criar uma variação automática. O dado de homologação `Cullenbarbas` foi ajustado de `cullenbarbas-12fee737` para `cullenbarbas` após confirmação de disponibilidade.

**Parcial:** revisão visual em dispositivos reais, refinamento da página pública de agendamento, ilustrações/marca final e homologação visual da proprietária.

## Fase 4 — Landing page, proposta comercial e preços

A landing atual continua propositalmente provisória. A proprietária decidiu deixar para depois a pesquisa/definição de precificação e a landing comercial definitiva.

Pendente: screenshots reais do produto, demonstração/vídeo, benefícios, diferenciais, prova visual, modelo de planos, limites por profissionais/unidades/usuários, preços, descontos, trial definitivo e textos comerciais.

## Fase 5 — Planos, trial e pagamento

Trial e bloqueio visual são parciais. Faltam decisão de provedor, checkout, webhooks, cobrança, bloqueio real e portal. A definição comercial da Fase 4 deve preceder a implementação definitiva desta fase.

## Fase 6 — Notificações e e-mail

**Implementado tecnicamente em homologação:**

- Central de Notificações no painel com sino, contador de não lidas, histórico e atualização em tempo real via Supabase Realtime;
- preferências individuais para owner, manager e barber por evento e canal (`dentro do sistema` e `e-mail`);
- eventos automáticos para novo agendamento, confirmação, cancelamento, reagendamento e lembrete de 24 horas;
- dono/gerente recebem eventos operacionais gerais; barbeiro recebe os eventos ligados ao próprio profissional; cliente recebe confirmação/alterações e lembrete pela arquitetura de fila;
- fila de e-mail com deduplicação, estados `pending`/`processing`/`sent`/`failed`, tentativas, erro e backoff;
- monitor de entregas disponível somente para owner/manager;
- worker versionado em `scripts/process-notifications.mjs`, preparado para Resend e execução periódica no ambiente publicado;
- estrutura desacoplada para adicionar push e WhatsApp Business depois, sem reescrever a agenda.

Migrations aplicadas em homologação:

- `20260808093323_add_notification_center_preferences_and_delivery_queue.sql`;
- `20260808102128_index_notification_foreign_keys.sql`.

**Pendente para ativar e-mail real em produção:** configurar domínio/remetente, `RESEND_API_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_URL`, `NOTIFICATION_FROM_EMAIL` e um cron no ambiente hospedado para executar `npm run notifications:process`. SPF/DKIM/DMARC devem ser configurados antes da publicação. Nenhum segredo foi salvo no GitHub.

**Depois:** push do navegador e WhatsApp automático via API oficial podem ser adicionados como novos canais. WhatsApp manual continua disponível no produto.

## Fase 7 — Deploy e produção

O domínio `barbeariasp.cullentech.com.br` foi apenas reservado. Faltam hospedagem/publicação, HTTPS, redirects definitivos de Auth, backups, monitoramento e homologação final.

## Backlog técnico

Replay integral das migrations em banco descartável, documentação de deploy, homologação visual/device QA, cobertura adicional de testes, revisão periódica das vulnerabilidades npm e dos quatro scripts de instalação ainda pendentes. Drizzle/D1 já foram removidos.
