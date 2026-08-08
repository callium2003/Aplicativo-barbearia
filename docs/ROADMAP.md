# Roadmap

## Fase 0 — Fundação

**Parcial:** baseline e migrations versionados e reconciliados com o histórico remoto; catálogo público restrito, reserva autenticada, convites de equipe e testes automatizados ativos. Permanecem replay integral em banco descartável, homologação de produção, monitoramento e revisão periódica de dependências.

Em 08/08/2026, os dados de teste do ambiente remoto foram limpos de forma controlada (incluindo Auth e Storage), preservando schema, migrations, RLS, RPCs e bucket. Em seguida, um novo ciclo completo de homologação foi executado com dados novos.

## Fase 1 — Clientes, CRM e consentimentos

**Implementado e homologado:** cliente global, relação por barbearia, histórico seguro, consentimentos separados, lista real de clientes, reserva autenticada, Área do Cliente própria e WhatsApp operacional.

**Homologado em 08/08/2026:** primeiro acesso do cliente por Google ou magic link, perfil com nome + celular/WhatsApp obrigatório, edição de perfil, próximos agendamentos, histórico, reagendamento/cancelamento e contato manual cliente ↔ barbearia.

**Homologação incremental 08/08/2026 — Lote 1:** reagendamento e cancelamento foram ajustados para resolver a barbearia antes de alterar o agendamento. Reagendar cancela a reserva atual e retorna para a mesma página pública com os serviços anteriores pré-selecionados; cancelar retorna para a página pública da mesma barbearia. A relação Supabase `appointments → barbershops` passou a ser tratada de forma compatível com retorno como objeto ou lista.

**Próximas evoluções:** filtros/segmentos avançados para campanhas e automações de marketing. O CSV operacional já existe dentro dos relatórios; exportações específicas de marketing devem respeitar consentimentos.

## Fase 2 — Atendimentos, relatórios e comissão

**Implementado e homologado em 08/08/2026:** percentual de comissão por profissional; cálculo automático e congelado na conclusão; repasse `pending`/`paid`; auditoria; Agenda com `scheduled`, `confirmed`, `completed`, `cancelled` e `no_show`; contato por WhatsApp; disponibilidade própria do barbeiro.

**Implementado e homologado:** relatórios gerenciais com período customizado e filtro por profissional: visão geral, agendamentos, equipe, serviços, clientes e comissões; faturamento, ticket médio, receita após comissão, cancelamento/no-show, clientes novos/recorrentes/reagendados, ocupação real, desempenho por profissional/serviço e exportação CSV.

As migrations `20260807070808_add_customer_account_and_complete_management_reports.sql` e `20260807070958_fix_management_report_service_revenue_share.sql` complementam a migration financeira `20260807044250` e estão aplicadas no Supabase remoto de homologação.

**Próximas evoluções condicionadas a novos eventos de negócio:** caixa por forma de pagamento, despesas, impostos, venda de produtos, estoque, avaliações e ROI de campanhas. Não serão criados relatórios fictícios antes da captura desses dados.

## Fase 3 — Experiência e identidade visual

**Implementado e homologado:** sistema visual premium compartilhado; Home do painel, Agenda, Clientes, Equipe/Disponibilidade, Relatórios, Notificações, Configurações, cadastro inicial, login administrativo, login/Área do Cliente e Meus Agendamentos usam o padrão atual.

**Homologação incremental 08/08/2026 — Lote 1:** novos cadastros passam a gerar slug público somente a partir do nome da barbearia, sem UUID ou sufixo aleatório. A unicidade continua protegida por `barbershops_slug_key`; se o nome normalizado já existir, o cadastro pede outro nome em vez de criar uma variação automática.

**Homologação incremental 08/08/2026 — Configurações/cadastro inicial:** o cadastro em duas etapas e a página Configurações foram trazidos para o novo design. Configurações passou a seguir a ordem: dados operacionais/contatos → dados cadastrais → horários → serviços/preços → profissionais → equipe/acessos → notificações. Preferências de notificação ficam no final.

**Refinamentos futuros:** identidade de marca final, ilustrações e QA ampliado em diferentes dispositivos físicos. Esses itens não bloqueiam os fluxos já homologados.

## Fase 4 — Landing page, proposta comercial e preços

A landing atual continua propositalmente provisória. A proprietária decidiu deixar para depois a pesquisa/definição de precificação e a landing comercial definitiva.

Pendente: screenshots reais do produto, demonstração/vídeo, benefícios, diferenciais, prova visual, modelo de planos, limites por profissionais/unidades/usuários, preços, descontos, trial definitivo e textos comerciais.

## Fase 5 — Planos, trial e pagamento

Trial e bloqueio visual são parciais. Faltam decisão de provedor, checkout, webhooks, cobrança, bloqueio real e portal. A definição comercial da Fase 4 deve preceder a implementação definitiva desta fase.

## Fase 6 — Notificações e e-mail

**Implementado, ativado e homologado em 08/08/2026:**

- Central de Notificações no painel com sino, contador de não lidas, histórico, filtro e atualização em tempo real via Supabase Realtime;
- preferências individuais para owner, manager e barber por evento e canal (`Dentro do sistema` e `E-mail`), posicionadas no final de Configurações;
- eventos automáticos para novo agendamento, confirmação, cancelamento, reagendamento e lembrete de 24 horas;
- dono/gerente recebem eventos operacionais gerais; barbeiro recebe os eventos ligados ao próprio profissional; cliente recebe confirmações/alterações e lembrete pela arquitetura de fila;
- fila de e-mail com deduplicação, estados `pending`/`processing`/`sent`/`failed`, tentativas, erro e backoff;
- monitor de fila disponível somente para owner/manager;
- Edge Function Supabase `process-notifications` ativa;
- Cron `barbeariasp-process-notifications` ativo a cada minuto;
- `pg_net` instalado no schema `extensions` e `pg_cron` habilitado;
- chave dedicada do Resend e segredo do Cron armazenados no Supabase Vault;
- função `public.get_notification_worker_secrets()` restrita a `service_role` e `postgres`;
- domínio `barbeariasp.cullentech.com.br` verificado no Resend, Sending habilitado, DKIM/SPF confirmados, Tracking desligado e remetente `notificacoes@barbeariasp.cullentech.com.br`;
- 18 e-mails acumulados da homologação foram processados automaticamente e confirmados como `delivered` pelo Resend; a proprietária confirmou o recebimento.

Migrations aplicadas em homologação:

- `20260808093323_add_notification_center_preferences_and_delivery_queue.sql`;
- `20260808102128_index_notification_foreign_keys.sql`.

**Próxima tarefa técnica de reprodutibilidade:** versionar a Edge Function ativa em `supabase/functions/` (ou estrutura equivalente) e consolidar em migration/infra versionada os objetos operacionais criados diretamente no remoto em 08/08/2026. O worker `scripts/process-notifications.mjs` continua versionado como implementação equivalente/manual.

**Depois:** push do navegador e WhatsApp automático via API oficial podem ser adicionados como novos canais. WhatsApp manual continua disponível no produto.

## Fase 7 — Deploy e produção

O site público pretendido é `barbeariasp.cullentech.com.br`. Permanecem hospedagem/publicação definitiva, HTTPS, redirects de Auth de produção, backups, observabilidade, eventual SMTP customizado do Supabase Auth e homologação de produção.

O envio transacional de notificações já funciona independentemente da publicação do frontend porque é executado pelo Supabase remoto.

## Homologação funcional consolidada — 08/08/2026

Depois do reset dos dados de teste, a proprietária executou do zero:

- criação de nova barbearia;
- criação/uso de cliente;
- agendamento;
- cancelamento pelo cliente;
- confirmação pela barbearia;
- cancelamento pela barbearia em outro cenário;
- conclusão do atendimento;
- conferência de relatórios;
- conferência de Configurações no novo layout;
- recebimento real das notificações por e-mail.

Esse ciclo confirma os principais fluxos funcionais de homologação. Não equivale ainda à homologação de produção/deploy.

## Backlog técnico

- replay integral das migrations em banco descartável;
- versionar Edge Function/Cron/Vault setup sem segredos;
- documentação e execução do deploy definitivo;
- backup e observabilidade;
- QA adicional em dispositivos;
- revisão dos avisos atuais do Supabase Security Advisor;
- proteção contra senhas vazadas no Auth;
- revisão periódica das vulnerabilidades npm e scripts de instalação pendentes;
- campanhas/marketing, push, WhatsApp Business e pagamentos conforme priorização.

Drizzle/D1 já foram removidos e Supabase/PostgreSQL permanece o único banco funcional.
