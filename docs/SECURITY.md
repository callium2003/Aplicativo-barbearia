# Segurança

## Princípios

- Supabase RLS é obrigatório para isolamento entre tenants; filtros de frontend não substituem políticas.
- O frontend usa somente a chave publicável. `service_role` é proibida em código cliente, variáveis `VITE_*`, testes e documentação.
- `user_metadata` não autoriza acesso. Papéis vêm do modelo protegido: `owner`, `manager`, `barber` e `customer`.
- Mudança de schema exige migration nova. Não reescreva migrations preservadas e não execute comandos destrutivos no Supabase remoto sem autorização.
- Nunca versione `.env`, credenciais, tokens, segredos do Cron ou dados de teste.
- Credenciais externas de backend devem ficar em cofre/secret store; para notificações, os valores estão no Supabase Vault.

## Auth e sessão

Google e magic link do login administrativo retornam para `${window.location.origin}/painel`. Na reserva pública, retornam para a mesma URL pública com a seleção de serviços, profissional e horário. Cada ambiente precisa permitir seus URLs na configuração remota de Auth; na homologação local, `http://127.0.0.1:3005/**` e `http://localhost:3005/**` estão autorizados.

A reserva pendente pública é limitada a 30 minutos. Ela é guardada no `sessionStorage` e, para suportar a abertura do magic link em outra aba, também no `localStorage` da mesma origem. Armazena apenas os dados necessários à retomada e é removida na expiração, se o horário já passou ou depois da confirmação. A disponibilidade é consultada novamente antes da RPC; o banco continua sendo a validação definitiva.

A saída chama `signOut({ scope: "local" })`. A navegação administrativa não encerra nem recria a sessão; ela somente usa rotas dentro de `/painel`.

## Convites de equipe e controle de tokens

- O raw token é gerado com 32 bytes randômicos no servidor PostgreSQL (`gen_random_bytes(32)`) e exibido apenas uma vez no frontend no momento da criação.
- No banco de dados, é gravado exclusivamente o hash SHA-256 (`token_hash`) via `extensions.digest(v_raw_token, 'sha256')`.
- Validade estrita de 7 dias e expiração automática na consulta.
- Criar convite exige ser `owner` (para gerentes ou barbeiros) ou `manager` (somente para barbeiros). Um `manager` não pode convidar outro gerente nem alterar o `owner`.
- Convites para papel `barber` exigem vínculo obrigatório com um `professional_id` ativo da mesma barbearia.
- O e-mail convidado é exibido de forma mascarada na página pública antes da autenticação. O e-mail completo permanece exclusivamente no banco e é utilizado pela RPC `accept_team_invitation` para validação estrita da conta autenticada.
- Caso a sessão autenticada possua e-mail divergente, o sistema bloqueia a aceitação e orienta a usar a conta correta sem revelar desnecessariamente o destinatário completo.

## RLS, CRM e links públicos

Owner e manager leem o CRM somente da própria barbearia; barber não recebe acesso ao CRM completo; anon não lê dados privados. A view de histórico usa `security_invoker` e continua submetida a privilégios e RLS das tabelas de origem.

O catálogo público não concede `SELECT` amplo para `anon` nas tabelas internas. A página pública usa interfaces públicas restritas para localizar somente a barbearia ativa por slug, serviços ativos, profissionais ativos e disponibilidade. `anon` não acessa CRM e não chama a função interna de sincronização de cliente.

A trigger de sincronização de cliente é `SECURITY DEFINER` somente para concluir a transação do agendamento; fixa `search_path`, confere `auth.uid()` e não é executável pelo público. As RPCs de agendamento e revogação mantêm as permissões definidas nas migrations correspondentes.

O dashboard monta o link público apenas com o slug da barbearia da sessão. Não expõe UUID, não aceita slug arbitrário e não concede acesso administrativo pela página pública.

## Storage da foto

O bucket público `barbershop-images` aceita JPG, PNG e WebP até 3 MB. O caminho tem prefixo com o UUID da barbearia. Owner e manager podem inserir e remover somente objetos do próprio prefixo.

A imagem é servida por URL pública sem policy ampla de listagem. A aplicação grava a nova foto primeiro e remove a anterior somente depois de salvar a nova URL.

Na limpeza de homologação de 08/08/2026, objetos de Storage foram removidos pela interface/API apropriada, e não por `DELETE` direto em `storage.objects`, evitando arquivos órfãos.

## Contato e localização

Links de WhatsApp são construídos a partir de telefone normalizado e usam `wa.me`. Maps só aceita URL HTTPS do Google; sem URL válida, usa o endereço cadastrado como destino. WhatsApp apenas abre conversa para revisão e envio manual; não cria comunicação automática nem novo acesso ao CRM.

## Configuração de comissão por profissional

O percentual de comissão (`0%` a `100%`) é armazenado exclusivamente na tabela privada `public.professional_commission_settings`, removido de `public.professionals`. A tabela financeira não possui acesso direto para papéis do navegador. Owner e manager acessam e alteram os dados pelas RPCs administrativas protegidas; barber, cliente, anon e usuário sem vínculo não possuem acesso.

A atualização utiliza validação de tenant, normalização decimal, bloqueio transacional e auditoria. Ao concluir atendimento, o percentual e valores são congelados no ledger `appointment_commissions`; o fluxo foi homologado em 08/08/2026.

## Notificações e e-mail transacional

A entrega por e-mail usa arquitetura server-side versionada:

- `notification_outbox` mantém fila, deduplicação, tentativas e backoff;
- RPCs `enqueue_due_appointment_reminders`, `claim_notification_outbox` e `complete_notification_outbox` são destinadas ao backend privilegiado;
- Edge Function `process-notifications` processa a fila e está versionada em `supabase/functions/process-notifications/index.ts`;
- a função remota ativa está na versão 2 e usa `@supabase/supabase-js@2.97.0` fixado;
- Cron `barbeariasp-process-notifications` chama a função a cada minuto;
- `pg_cron` está habilitado e `pg_net` está no schema `extensions`;
- migration `20260808183718_version_notification_worker_runtime.sql` versiona extensões, helper/grants e configuração do Cron;
- a Edge Function usa `verify_jwt=false` por ser integração servidor-servidor, mas exige `x-cron-secret` antes das operações privilegiadas;
- `public.get_notification_worker_secrets()` é executável apenas por `service_role` e `postgres`;
- `private.configure_notification_worker_cron()` só é usada administrativamente para recriar o job após provisionamento do ambiente;
- a URL do projeto, a chave dedicada do Resend e o segredo do Cron ficam no Supabase Vault;
- nenhum valor de segredo é registrado em código, migration, teste ou documentação;
- remetente oficial: `notificacoes@barbeariasp.cullentech.com.br`;
- domínio do Resend verificado, Sending habilitado, Receiving desligado, tracking de abertura/clique desligado, DKIM e SPF confirmados;
- DMARC não foi confirmado nesta rodada.

Nomes esperados no Vault:

- `barbeariasp_project_url`;
- `barbeariasp_resend_api_key`;
- `barbeariasp_notification_cron_secret`.

A migration não contém project ref nem chave hardcoded; o job lê a configuração por nome no Vault.

Em 08/08/2026, 18 mensagens foram processadas após a ativação do worker, ficaram `sent` no Supabase e `delivered` no Resend, com recebimento confirmado. Depois da consolidação, uma chamada de validação da Edge Function retornou HTTP 200 com fila vazia e zero falhas.

A operação segura do Resend está em [RESEND.md](RESEND.md), e o deploy da função está em `supabase/functions/process-notifications/README.md`.

## Security Advisor — estado após migration 27

O Advisor foi executado depois da migration `20260808183718`.

A nova infraestrutura não adicionou warning público para `get_notification_worker_secrets`, e o alerta anterior de `pg_net` no schema `public` permanece resolvido com a extensão em `extensions`.

Permanecem avisos anteriores do projeto:

- INFO `RLS Enabled No Policy` em `appointment_commissions`, `notification_preferences` e `professional_commission_settings`; nessas tabelas o acesso direto do navegador é deliberadamente restrito/revogado e a operação ocorre por RPC/backend;
- warnings de funções `SECURITY DEFINER` executáveis por `anon`/`authenticated` em RPCs do produto. Cada uma deve ser revisada individualmente para confirmar exposição intencional e validação de tenant/usuário;
- `Leaked Password Protection Disabled` no Supabase Auth.

Referências do Advisor:

- https://supabase.com/docs/guides/database/database-linter?lint=0008_rls_enabled_no_policy
- https://supabase.com/docs/guides/database/database-linter?lint=0028_anon_security_definer_function_executable
- https://supabase.com/docs/guides/database/database-linter?lint=0029_authenticated_security_definer_function_executable
- https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection

## Pendências antes da produção

- revisar os warnings atuais de `SECURITY DEFINER` um a um;
- decidir/ativar proteção contra senhas vazadas;
- homologar domínio público, HTTPS e redirects de Auth de produção;
- definir backup e observabilidade;
- validar replay integral das 27 migrations em ambiente descartável;
- revisar dependências/vulnerabilidades npm e scripts de instalação pendentes;
- confirmar DMARC se for requisito de produção;
- concluir revisão jurídica/LGPD formal;
- customizar SMTP do Supabase Auth somente se fizer parte da estratégia de produção.
