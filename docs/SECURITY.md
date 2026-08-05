# Segurança

## Princípios

- Supabase RLS é obrigatório para isolamento entre tenants; filtros de frontend não substituem políticas.
- O frontend usa somente a chave publicável. `service_role` é proibida em código cliente, variáveis `VITE_*`, testes e documentação.
- `user_metadata` não autoriza acesso. Papéis vêm do modelo protegido: `owner`, `manager`, `barber` e `customer`.
- Mudança de schema exige migration nova. Não reescreva migrations preservadas e não execute comandos destrutivos no Supabase remoto sem autorização.
- Nunca versione `.env`, credenciais ou dados de teste.

## Auth e sessão

Google e magic link do login administrativo retornam para `${window.location.origin}/painel`. Na reserva pública, retornam para a mesma URL pública com a seleção de serviços, profissional e horário. Cada ambiente precisa permitir seus URLs na configuração remota de Auth; na homologação local, `http://127.0.0.1:3005/**` e `http://localhost:3005/**` estão autorizados. O formulário apresenta o erro devolvido pelo Supabase e sempre encerra o carregamento.

A reserva pendente pública é limitada a 30 minutos. Ela é guardada no `sessionStorage` e, para suportar a abertura do magic link em outra aba, também no `localStorage` da mesma origem. Armazena apenas os dados necessários à retomada e é removida na expiração, se o horário já passou ou depois da confirmação. A disponibilidade é consultada novamente antes da RPC; o banco continua sendo a validação definitiva.

A saída chama `signOut({ scope: "local" })`. A navegação administrativa não encerra nem recria a sessão; ela somente usa rotas dentro de `/painel`.

## Convites de equipe e controle de tokens

- O raw token é gerado com 32 bytes randômicos no servidor PostgreSQL (`gen_random_bytes(32)`) e exibido apenas uma vez no frontend no momento da criação.
- No banco de dados, é gravado exclusivamente o hash SHA-256 (`token_hash`) via `extensions.digest(v_raw_token, 'sha256')`.
- Validade estrita de 7 dias e expiração automática na consulta.
- Criar convite exige ser `owner` (para gerentes ou barbeiros) ou `manager` (somente para barbeiros). Um `manager` não pode convidar outro gerente nem alterar o `owner`.
- Convites para papel `barber` exigem vínculo obrigatório com um `professional_id` ativo da mesma barbearia.
- O e-mail convidado é exibido de forma mascarada na página pública antes da autenticação (ex: `d*****@email.com`), protegendo a privacidade visual em links compartilhados. O e-mail completo permanece preservado exclusivamente no banco e é utilizado pela RPC `accept_team_invitation` para validação estrita da conta autenticada.
- Caso a sessão autenticada possua e-mail divergente, o sistema bloqueia a aceitação e apresenta mensagem orientando a usar a conta correta sem revelar desnecessariamente o e-mail completo do destinatário.



## RLS, CRM e links públicos

Owner e manager leem o CRM somente da própria barbearia; barber não recebe acesso ao CRM completo; anon não lê dados privados. A view de histórico usa `security_invoker` e continua submetida a privilégios e RLS das tabelas de origem.

O catálogo público não concede `SELECT` amplo para `anon` nas tabelas internas. A página pública usa interfaces públicas restritas para localizar somente a barbearia ativa por slug, serviços ativos, profissionais ativos e disponibilidade. `anon` não acessa CRM e não chama a função interna de sincronização de cliente.

A trigger de sincronização de cliente é `SECURITY DEFINER` somente para concluir a transação do agendamento; fixa `search_path`, confere `auth.uid()` e não é executável pelo público. As RPCs de agendamento e revogação são `SECURITY INVOKER` e não são executáveis por `anon`.

O dashboard monta o link público apenas com o slug da barbearia da sessão. Não expõe UUID, não aceita slug arbitrário e não concede acesso administrativo pela página pública. Owner, manager e barber podem ver/copiar somente o próprio link.

## Storage da foto

O bucket público `barbershop-images` aceita JPG, PNG e WebP até 3 MB. O caminho tem um prefixo com o UUID da barbearia. Owner e manager podem inserir e remover somente objetos do próprio prefixo.

A imagem é servida por URL pública sem policy ampla de listagem. A RPC `set_barbershop_photo_url` usa `SECURITY INVOKER`, valida o bucket esperado e exige owner ou manager. A aplicação grava a nova foto primeiro e remove a anterior somente depois de salvar a nova URL.

## Contato e localização

Links de WhatsApp são construídos a partir de telefone normalizado e usam `wa.me`. Maps só aceita URL HTTPS do Google; sem URL válida, usa o endereço cadastrado como destino. WhatsApp apenas abre conversa para revisão e envio manual; não cria comunicação automática, API externa ou novo acesso ao CRM.

## Configuração de comissão por profissional (Estrutura Financeira Privada)

O percentual de comissão (`0%` a `100%`) é armazenado exclusivamente na tabela privada `public.professional_commission_settings`, tendo sido completamente removido da tabela pública `public.professionals`. 

A tabela financeira não possui acesso direto (SELECT, INSERT, UPDATE, DELETE) para papéis do navegador (`anon` ou `authenticated`). Owner e manager acessam e alteram os dados exclusivamente pelas RPCs administrativas (`get_professional_commission_rates` e `set_professional_commission_rate`). Barber, cliente, anon e usuário sem vínculo não possuem acesso.

A policy ampla de `UPDATE` para gerentes na tabela `professionals` foi removida, impedindo que gerentes alterem diretamente nome, telefone ou status de profissionais sem permissão de proprietário.

A interface React aceita a digitação do percentual com vírgula ou ponto e normaliza para ponto em `utils/commission.ts` antes de enviar para a RPC. A RPC SQL aceita apenas a string numérica formatada exclusivamente com ponto; chamadas diretas à RPC contendo vírgula (ex: `'25,50'`) são rejeitadas no banco. O tenant do profissional é derivado diretamente no banco de dados. A atualização utiliza bloqueio transacional (`SELECT ... FOR UPDATE`) para garantir a consistência da trilha de auditoria transacional em `audit_logs`.

## Pendências de segurança e homologação
- Cálculo automático de comissão por atendimento e relatórios financeiros reais continuam pendentes.
- Aplicação das migrations no Supabase remoto de homologação pendente.
- Incompatibilidade histórica de `customer_consent_type` na migration CRM mantida como pendência conhecida na reconstituição completa do ambiente local.
- Validação técnica automatizada concluída em contêiner PostgreSQL isolado equivalente ao recorte necessário para os testes de comissão (validação SQL/RLS local pelo agente; testes unitários e de contrato aprovados); teste funcional visual da proprietária pendente.

Domínio, HTTPS, SMTP, SPF, DKIM, DMARC, backups, monitoramento, homologação completa do remoto e revisão jurídica/LGPD formal exigem validação antes da produção.
