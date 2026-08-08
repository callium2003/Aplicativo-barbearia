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

A entrega por e-mail usa uma arquitetura server-side:

- `notification_outbox` mantém fila, deduplicação, tentativas e backoff;
- RPCs `enqueue_due_appointment_reminders`, `claim_notification_outbox` e `complete_notification_outbox` são destinadas ao backend privilegiado;
- Edge Function `process-notifications` processa a fila;
- Cron `barbeariasp-process-notifications` chama a função a cada minuto;
- `pg_cron` está habilitado e `pg_net` foi instalado no schema `extensions`, evitando o alerta de extensão no schema `public`;
- a Edge Function foi publicada com `verify_jwt=false` porque não representa uma chamada de usuário; em vez disso, valida um segredo próprio do Cron antes de acessar qualquer função privilegiada;
- o segredo do Cron e a chave dedicada do Resend ficam no Supabase Vault sob nomes operacionais próprios; os valores não são registrados em documentação/GitHub;
- `public.get_notification_worker_secrets()` é executável somente por `service_role` e `postgres`;
- a chave criada no Resend possui acesso de envio e é restrita ao domínio de notificação configurado;
- remetente oficial: `notificacoes@barbeariasp.cullentech.com.br`;
- domínio do Resend verificado, Sending habilitado, Receiving desligado, tracking de abertura/clique desligado, DKIM e SPF confirmados;
- DMARC não foi confirmado e não deve ser documentado como validado até checagem específica.

Em 08/08/2026, a fila acumulada de 18 mensagens foi processada após a ativação do Cron/Edge Function, o Supabase marcou os 18 itens como `sent`, o Resend marcou os 18 como `delivered` e a proprietária confirmou o recebimento.

A operação segura do Resend, incluindo DNS, chaves por nome, rotação, monitoramento, status e troubleshooting, está consolidada em [RESEND.md](RESEND.md).

### Reprodutibilidade e drift operacional

As migrations de notificações e `scripts/process-notifications.mjs` estão versionados. A Edge Function, o Cron, os segredos do Vault e a função `get_notification_worker_secrets()` foram ativados diretamente no Supabase remoto durante a homologação e ainda precisam ser reproduzidos em código/migration versionada sem incluir valores secretos. Essa diferença está documentada em `SUPABASE_BASELINE.md` e deve ser eliminada antes da produção definitiva.

## Security Advisor — estado após ativação do e-mail

O Advisor foi executado depois da mudança. O alerta novo de `pg_net` instalado no schema `public` foi removido ao reinstalar a extensão em `extensions`.

Permanecem avisos anteriores do projeto:

- INFO `RLS Enabled No Policy` em `appointment_commissions`, `notification_preferences` e `professional_commission_settings`; nessas tabelas o acesso direto do navegador é deliberadamente restrito/revogado e a operação ocorre por RPC/backend;
- warnings de funções `SECURITY DEFINER` executáveis por `anon`/`authenticated` em RPCs do produto. Cada uma deve ser revisada no backlog para confirmar se a exposição é intencional e se valida tenant/usuário corretamente;
- `Leaked Password Protection Disabled` no Supabase Auth.

Referências do Advisor:

- https://supabase.com/docs/guides/database/database-linter?lint=0008_rls_enabled_no_policy
- https://supabase.com/docs/guides/database/database-linter?lint=0028_anon_security_definer_function_executable
- https://supabase.com/docs/guides/database/database-linter?lint=0029_authenticated_security_definer_function_executable
- https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection

## Pendências antes da produção

- versionar a Edge Function e os objetos operacionais do worker sem segredos;
- revisar os warnings atuais de `SECURITY DEFINER` um a um;
- decidir/ativar proteção contra senhas vazadas;
- homologar domínio público, HTTPS e redirects de Auth de produção;
- definir backup e observabilidade;
- revisar dependências/vulnerabilidades npm e scripts de instalação pendentes;
- confirmar DMARC se for requisito de produção;
- concluir revisão jurídica/LGPD formal;
- customizar SMTP do Supabase Auth somente se fizer parte da estratégia de produção.
