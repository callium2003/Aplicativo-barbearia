# Arquitetura

BarbeariaSP é uma aplicação React/Next executada por Vinext/Vite. O Supabase fornece PostgreSQL, Auth, Storage, Realtime, Edge Functions, Vault e agendamento via `pg_cron`/`pg_net`; `@supabase/supabase-js` é usado diretamente pelas telas. `worker/index.ts` participa do runtime/build. Supabase/PostgreSQL é o único banco funcional da aplicação; o legado Drizzle/D1 herdado do template foi removido em 2026-08-07 após validação coordenada de dependências, Worker e build.

| Componente | Estado | Responsabilidade |
|---|---|---|
| `app/[slug]/page.tsx` | IMPLEMENTADO/HOMOLOGADO | página pública, foto, catálogo, disponibilidade, reserva autenticada, WhatsApp e Maps |
| `app/entrar/page.tsx` | IMPLEMENTADO/HOMOLOGADO | Google e magic link com retorno ao painel |
| `app/cliente/` | IMPLEMENTADO/HOMOLOGADO | autenticação do cliente, perfil e Área do Cliente |
| `app/painel/` | IMPLEMENTADO/HOMOLOGADO | dashboard, agenda, clientes, relatórios, notificações e configurações |
| Supabase PostgreSQL | IMPLEMENTADO | dados operacionais, RPCs, migrations, RLS, fila e relatórios |
| Supabase Storage | IMPLEMENTADO | foto pública da barbearia com escrita isolada por tenant |
| Supabase Realtime | IMPLEMENTADO | atualização da Central de Notificações |
| Supabase Edge Function `process-notifications` | ATIVA EM HOMOLOGAÇÃO | processamento automático da fila de e-mail |
| Supabase Vault | ATIVO EM HOMOLOGAÇÃO | guarda da chave dedicada do Resend e segredo do Cron |
| `pg_cron` + `pg_net` | ATIVOS EM HOMOLOGAÇÃO | chamada da Edge Function a cada minuto |
| Resend | ATIVO/HOMOLOGADO | entrega transacional por e-mail |

## Tenancy, contas de acesso, papéis e CRM

Cada dado operacional pertence a uma barbearia (`barbershop_id`). RLS, e não filtros do navegador, impõe o isolamento definitivo no banco de dados.

Distinção estrita de identidades e entidades:
- **Conta de acesso (`auth.users`)**: identidade autenticada no Supabase Auth. Uma conta por si só não concede acesso administrativo a nenhuma barbearia até possuir vínculo validado.
- **Owner**: proprietário da barbearia. Cria o estabelecimento e acessa a gestão do painel imediatamente após o cadastro inicial (`initial_registration_completed`). Não precisa ser profissional e não recebe perfil de profissional automaticamente.
- **Manager**: gestor da equipe cadastrado em `team_members` com papel `manager`. Acessa todas as áreas administrativas da barbearia vinculada.
- **Barber**: membro operacional em `team_members` com papel `barber`. Exige vínculo com um `professional_id` ativo na tabela `professionals`. Acessa os próprios agendamentos e pode administrar exclusivamente a própria disponibilidade em `professional_hours`, `professional_breaks` e `professional_time_blocks`; não altera estrutura, comissão ou agenda de outro profissional.
- **Profissional (`public.professionals`)**: entidade operacional da agenda. Não contém a coluna `commission_rate_percent`. A comissão é armazenada na tabela privada `public.professional_commission_settings`, vinculada exclusivamente por `professional_id`. Owner e manager acessam os dados por RPCs protegidas e auditadas; acesso direto da tabela financeira por papéis do navegador permanece revogado.
- **Cliente (`public.customers`)**: pessoa autenticada que realiza agendamentos. Acessa a página pública e a área `/meus-agendamentos`, sem permissão administrativa.
- **Convite de equipe (`public.team_invitations`)**: owner pode convidar gerente ou barbeiro; manager pode convidar somente barbeiro. Tokens brutos são de uso único, o banco persiste apenas SHA-256 e a aceitação exige autenticação/e-mail correto.

`customers` representa o cliente global autenticado. `barbershop_customers` relaciona-o à barbearia e `barbershop_customer_history`, com `security_invoker`, calcula visitas, datas e receita concluída a partir de agendamentos e snapshots. Owner e manager leem o CRM da própria barbearia; barber não lê o CRM completo.

## Cadastro inicial e Configurações

O cadastro inicial de nova barbearia possui duas etapas e usa o mesmo sistema visual do painel. A primeira configuração foi homologada novamente em 08/08/2026 a partir de uma base de teste limpa.

A página Configurações usa o sistema visual compartilhado e mantém a ordem funcional atual:

1. dados operacionais e contatos;
2. dados cadastrais;
3. dias e horários de funcionamento;
4. serviços e preços;
5. profissionais;
6. equipe e acessos;
7. preferências de notificações.

As informações operacionais (contato, endereço, descrição e imagem) alimentam a página pública. Preferências de notificação não ficam misturadas com o histórico: histórico/não lidas ficam na Central de Notificações; configuração de canal/evento fica em Configurações.

## Página pública, imagem e contatos

O endereço público é `/{slug}`. O dashboard monta a URL com `window.location.origin + "/" + slug`, sem domínio fixo, e oferece abrir em nova aba ou copiar. Se não houver slug, não gera URL e encaminha às configurações somente por esse motivo.

A foto é validada no navegador (JPG, PNG ou WebP; até 3 MB), preserva proporção e é reduzida quando necessário. O arquivo é gravado em `barbershop-images/{barbershop-id}/{arquivo}`. A URL pública é persistida somente depois do upload e a imagem anterior é removida depois que a troca é bem-sucedida.

WhatsApp usa `wa.me` com número brasileiro normalizado e mensagem apenas preenchida. Maps usa `/maps/dir/?api=1&destination=` a partir do endereço, ou URL HTTPS validada do Google Maps. Não há geocodificação ou chave paga no cliente.

## Reserva pública autenticada

O visitante seleciona serviços ativos, profissional, data e horário público. Em seguida, informa nome, telefone com DDD e consentimentos opcionais. Antes da RPC de agendamento, o telefone é reduzido a dígitos e deve ter 10 ou 11 caracteres.

Se não houver sessão, a página grava a reserva pendente no `sessionStorage` e em `localStorage` da mesma origem. O conteúdo é descartado após 30 minutos, se o horário já passou ou depois da confirmação. O retorno de Google ou magic link restaura os dados, recarrega a disponibilidade por `get_public_availability` e apresenta a confirmação final. Somente `book_customer_appointment` cria o agendamento.

Cancelamento e reagendamento resolvem a barbearia antes da alteração. Cancelar retorna à página pública da mesma barbearia; reagendar retorna com os serviços anteriores pré-selecionados.

## Agenda, comissão e relatórios

Agenda usa status `scheduled`, `confirmed`, `completed`, `cancelled` e `no_show`. Ao concluir atendimento, o percentual vigente e os valores são congelados em `appointment_commissions`, permitindo rastrear repasses `pending`/`paid` sem que mudanças futuras de percentual alterem o histórico.

`get_barbershop_management_report` fornece relatórios reais por período/profissional, incluindo faturamento, ticket médio, comissões, receita líquida após comissão, clientes novos/recorrentes, reagendamento, cancelamento/no-show, ocupação, desempenho por profissional/serviço, clientes e detalhamento de agendamentos. A interface exporta CSV. Esse fluxo foi homologado funcionalmente em 08/08/2026 após concluir atendimentos de teste.

## Notificações e entrega de e-mail

A arquitetura de notificações separa experiência interna, preferências e transporte:

1. alterações relevantes de `appointments` disparam a lógica privada de distribuição;
2. `user_notifications` recebe notificações dentro do produto;
3. `notification_preferences` decide por usuário/evento se o canal interno e/ou e-mail está habilitado;
4. `notification_outbox` recebe mensagens de e-mail deduplicadas;
5. o Cron `barbeariasp-process-notifications` chama a Edge Function `process-notifications` a cada minuto;
6. a Edge Function valida um segredo de Cron, obtém as credenciais somente pelo backend, reivindica itens por `claim_notification_outbox`, envia pelo Resend e finaliza por `complete_notification_outbox`;
7. lembretes de 24 horas são enfileirados por `enqueue_due_appointment_reminders`.

A Edge Function foi publicada com `verify_jwt=false` porque a chamada não usa sessão de usuário; a proteção é feita por segredo próprio do Cron antes de qualquer operação privilegiada. A função `public.get_notification_worker_secrets()` é executável apenas por `service_role` e `postgres`. Os valores ficam no Vault e não são retornados ao navegador.

O domínio `barbeariasp.cullentech.com.br` está verificado no Resend, com Sending habilitado, DKIM/SPF validados e remetente `notificacoes@barbeariasp.cullentech.com.br`. Em 08/08/2026, 18 mensagens acumuladas foram processadas e confirmadas como `delivered`.

### Reprodutibilidade da Edge Function

O banco/migrations e o worker alternativo `scripts/process-notifications.mjs` estão versionados. A Edge Function `process-notifications` foi criada operacionalmente no Supabase remoto durante a homologação de 08/08/2026 e seu código-fonte ainda precisa ser consolidado em `supabase/functions/` (ou estrutura equivalente) em um lote técnico próprio. Até essa consolidação, o ambiente remoto possui uma pequena diferença operacional documentada em relação ao repositório.

## Autenticação e navegação

O cliente Supabase recebe somente `VITE_SUPABASE_URL` e `VITE_SUPABASE_PUBLISHABLE_KEY`. No login administrativo, Google usa `signInWithOAuth` e e-mail usa `signInWithOtp` com retorno a `${window.location.origin}/painel`. Na reserva pública, ambos usam a URL pública atual, preservando a seleção de horário e permitindo a retomada após o callback.

O sistema visual compartilhado usa `PanelShell` nas áreas principais e regras específicas de layout para Configurações/cadastro inicial. A navegação é filtrada pelo papel do usuário.
