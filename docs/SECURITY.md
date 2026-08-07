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

## Convites de equipe e controle de tokens (Achados de Auditoria Pendentes)

- O raw token é gerado no servidor PostgreSQL (`gen_random_bytes(32)`) e gravado no banco exclusivamente como hash SHA-256 (`token_hash`).
- Validade de 7 dias e expiração automática.
- Criar convite exige ser `owner` (para gerentes/barbeiros) ou `manager` (somente para barbeiros vinculados a profissionais ativos).
- **Vulnerabilidade 1 (Token em URL):** A implementação atual repassa o token bruto via URL na rota `/convite/equipe?token=...` e no parâmetro `redirectTo` de autenticação, podendo expô-lo em logs de Auth, API, histórico do navegador, ferramentas de analytics e cabeçalhos `Referer`. *Remediação planejada:* callback fixo sem token, armazenamento temporário com expiração e limpeza pós-aceitação.
- **Vulnerabilidade 2 (Grants de RPC para anon):** As funções administrativas de convite `create_team_invitation`, `accept_team_invitation` e `revoke_team_invitation` possuem `SECURITY DEFINER` porém mantêm permissão de execução concedida ao papel `anon`. *Remediação planejada:* revogação explícita de `EXECUTE` de `anon` e `PUBLIC`, concedendo apenas a `authenticated`.
- **Vulnerabilidade 3 (Exposição de e-mail):** A RPC `get_invitation_details` retorna `email_normalized` em texto limpo para chamadas anônimas. *Remediação planejada:* retornar apenas e-mail mascarado para anônimos.

## RLS, CRM e links públicos

Owner e manager leem o CRM somente da própria barbearia; barber não recebe acesso ao CRM completo; anon não lê dados privados. A view de histórico usa `security_invoker` e continua submetida a privilégios e RLS das tabelas de origem.

O catálogo público não concede `SELECT` amplo para `anon` nas tabelas internas. A página pública usa interfaces públicas restritas para localizar somente a barbearia ativa por slug, serviços ativos, profissionais ativos e disponibilidade. `anon` não acessa CRM e não chama a função interna de sincronização de cliente.

A trigger de sincronização de cliente é `SECURITY DEFINER` somente para concluir a transação do agendamento; fixa `search_path`, confere `auth.uid()` e não é executável pelo público. As RPCs de agendamento e revogação são `SECURITY INVOKER` e não são executáveis por `anon`.

O dashboard monta o link público apenas com o slug da barbearia da sessão. Não expõe UUID, não aceita slug arbitrário e não concede acesso administrativo pela página pública. Owner, manager e barber podem ver/copiar somente o próprio link.

- A tabela `professionals` possui vínculo com usuários autenticados via `team_members` (e não por coluna `user_id` direta). Violações de RLS observadas nos logs indicam tentativas de alteração rejeitadas pela política restritiva atual (que autoriza escrita direta apenas ao proprietário `owner`). O alinhamento será definido pela matriz formal de permissões (Etapa 5).

## Storage da foto

O bucket público `barbershop-images` aceita JPG, PNG e WebP até 3 MB. O caminho tem um prefixo com o UUID da barbearia. Owner e manager podem inserir objetos do próprio prefixo.

A imagem é servida por URL pública sem policy ampla de listagem. A RPC `set_barbershop_photo_url` usa `SECURITY INVOKER`, valida o bucket esperado e exige owner ou manager.

- **Vulnerabilidade/Falha identificada:** A policy de `DELETE` na tabela `storage.objects` contém referência ambígua à coluna `name` em uma subconsulta com `public.barbershops`. Como o frontend utiliza `upsert: false`, o upload funciona porém a remoção da foto antiga falha, deixando arquivos órfãos no bucket. *Remediação planejada:* qualificar explicitamente `storage.objects.name` na policy de `DELETE`.

## Contato e localização

Links de WhatsApp são construídos a partir de telefone normalizado e usam `wa.me`. Maps só aceita URL HTTPS do Google; sem URL válida, usa o endereço cadastrado como destino. WhatsApp apenas abre conversa para revisão e envio manual; não cria comunicação automática, API externa ou novo acesso ao CRM.

## Configuração de comissão por profissional (Estrutura Financeira Privada Intencional)

O percentual de comissão (`0%` a `100%`) é armazenado exclusivamente na tabela privada `public.professional_commission_settings`, tendo sido removido da tabela pública `public.professionals`. O acesso à tabela por RPCs dedicadas (`get_professional_commission_rates` e `set_professional_commission_rate`) com `SECURITY DEFINER` e revogação de `EXECUTE` de `anon` e `PUBLIC` permanece o modelo financeiro intencional e aprovado.

## Pendências de segurança e homologação

- Reconciliação da cadeia de migrations no Supabase;
- Eliminação da exposição de tokens de convite em URLs e logs;
- Revogação de `EXECUTE` para `anon` nas RPCs de convite e mascaramento de e-mail;
- Qualificação da policy de `DELETE` em `storage.objects`;
- Formalização e alinhamento da matriz de permissões para `manager`;
- Cálculo automático de comissão por atendimento e relatórios financeiros reais;
- Domínio, HTTPS, SMTP, SPF, DKIM, DMARC, backups, monitoramento e revisão jurídica/LGPD formal.
