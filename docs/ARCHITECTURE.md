# Arquitetura

BarbeariaSP é uma aplicação React/Next executada por Vinext/Vite. O Supabase fornece PostgreSQL, Auth e Storage; `@supabase/supabase-js` é usado diretamente pelas telas. `worker/index.ts` participa do runtime/build. Drizzle e D1 são remanescentes do template e não são o banco de produção.

| Componente | Estado | Responsabilidade |
|---|---|---|
| `app/[slug]/page.tsx` | IMPLEMENTADO | página pública, foto, catálogo, disponibilidade, reserva autenticada, WhatsApp e Maps |
| `app/entrar/page.tsx` | IMPLEMENTADO | Google e magic link com retorno ao painel |
| `app/painel/` | PARCIAL | dashboard, configuração, agenda e clientes reais; relatórios demonstrativos |
| Supabase PostgreSQL | IMPLEMENTADO | dados operacionais, RPCs, migrations e RLS |
| Supabase Storage | IMPLEMENTADO | foto pública da barbearia com escrita isolada por tenant (exclusão pendente de qualificação) |

## Tenancy, contas de acesso, papéis e CRM

Cada dado operacional pertence a uma barbearia (`barbershop_id`). RLS, e não filtros do navegador, impõe o isolamento definitivo no banco de dados.

Distinção estrita de identidades e entidades:
- **Conta de acesso (`auth.users`)**: Identidade autenticada no Supabase Auth. Uma conta por si só não concede acesso administrativo a nenhuma barbearia até possuir vínculo validado.
- **Owner**: Proprietário da barbearia. Cria o estabelecimento e acessa a gestão do painel imediatamente após o cadastro inicial (`initial_registration_completed`). Não precisa ser profissional e não recebe perfil de profissional automaticamente.
- **Manager**: Gestor da equipe cadastrado em `team_members` com papel `manager`. Acessa áreas administrativas da barbearia vinculada. *Inconsistência atual:* A UI permite acesso do manager a serviços e horários, mas a RLS das tabelas `services` e `business_hours` autoriza escrita apenas para `owner`.
- **Barber**: Membro operacional em `team_members` com papel `barber`. Exige vínculo com um `professional_id` ativo na tabela `professionals` e acessa exclusivamente a visão dos seus próprios agendamentos na Agenda.
- **Profissional (`public.professionals`)**: Entidade operacional da agenda. Não contém a coluna `commission_rate_percent`. A comissão é armazenada na tabela privada `public.professional_commission_settings`, vinculada exclusivamente por `professional_id`. Owner e manager acessam os dados de comissão pelas RPCs `get_professional_commission_rates` e `set_professional_commission_rate` com `SECURITY DEFINER`, `search_path TO ''` e auditoria em `audit_logs`. O privilégio `EXECUTE` foi revogado do papel `anon`, pertencendo a `authenticated`. *Inconsistência RLS:* Ocorreu erro de RLS em `professionals` porque a tabela não possui `user_id` e a política atual bloqueia escrita direta de `manager`.
- **Cliente (`public.customers`)**: Pessoa autenticada que realiza agendamentos. Acessa apenas a página pública e a área `/meus-agendamentos`. Não possui permissão para o painel administrativo nem pode ser confundido com membro da equipe.
- **Convite de equipe (`public.team_invitations`)**: Owner pode convidar gerente (`manager`) ou barbeiro (`barber`). Manager pode convidar apenas barbeiro (`barber`). O convite gera um link individual com token de uso único (`/convite/equipe?token=...`), válido por 7 dias. No banco, é gravado apenas o hash SHA-256 (`token_hash`). A aceitação exige autenticação e confirmação de e-mail; o vínculo em `team_members` é criado exclusivamente após a aceitação do convite. *Risco de segurança identificado:* O token bruto é repassado via URL e parâmetro `redirectTo`, podendo ser exposto em logs e histórico. Além disso, RPCs administrativas de convite mantêm `EXECUTE` para `anon`, e `get_invitation_details` retorna e-mail completo ao navegador anônimo.

`customers` representa o cliente global autenticado. `barbershop_customers` relaciona-o à barbearia e `barbershop_customer_history`, com `security_invoker`, calcula visitas, datas e receita concluída a partir de agendamentos e snapshots. Owner e manager leem o CRM da própria barbearia; barber não lê o CRM completo. A tela de clientes consulta esse histórico real. A tela de relatórios ainda usa dados demonstrativos.

## Página pública, imagem e contatos

O endereço público é `/{slug}`. O dashboard monta a URL com `window.location.origin + "/" + slug`, sem domínio fixo, e oferece abrir em nova aba ou copiar. Se não houver slug, não gera URL e encaminha às configurações somente por esse motivo.

A foto é validada no navegador (JPG, PNG ou WebP; até 3 MB), preserva proporção e é reduzida quando necessário. O arquivo é gravado em `barbershop-images/{barbershop-id}/{arquivo}`. A URL pública é persistida somente depois do upload. *Pendência de RLS:* A policy de `DELETE` no Storage referencia a coluna `name` de forma ambígua em subconsulta, fazendo a exclusão do arquivo antigo falhar e exigindo qualificação explícita (`storage.objects.name`).

WhatsApp usa `wa.me` com número brasileiro normalizado e mensagem apenas preenchida. Maps usa `/maps/dir/?api=1&destination=` a partir do endereço, ou URL HTTPS validada do Google Maps. Não há API externa, geocodificação, mensagem automática ou chave de API no cliente.

## Reserva pública autenticada

O visitante seleciona serviços ativos, profissional, data e horário público. Em seguida, informa nome, telefone com DDD e os consentimentos opcionais. Antes da RPC de agendamento, o telefone é reduzido a dígitos e deve ter 10 ou 11 caracteres.

Se não houver sessão, a página grava a reserva pendente no `sessionStorage` e em `localStorage` do navegador. O espelhamento local permite a retomada quando o magic link é aberto em outra aba. O conteúdo contém somente slug, identificadores de serviços/profissional, horário, nome, telefone, consentimentos e `savedAt`; é descartado após 30 minutos, se o horário já passou ou depois da confirmação. O retorno de Google ou magic link restaura os dados, recarrega a disponibilidade por `get_public_availability` e apresenta o botão final. Somente `book_customer_appointment` cria o agendamento.

## Autenticação e navegação

O cliente Supabase recebe somente `VITE_SUPABASE_URL` e `VITE_SUPABASE_PUBLISHABLE_KEY`. No login administrativo, Google usa `signInWithOAuth` e e-mail usa `signInWithOtp` com retorno a `${window.location.origin}/painel`. Na reserva pública, ambos usam a URL pública atual, preservando a seleção de horário e permitindo a retomada após o callback.

O layout de `/painel` inclui os controles “Abrir painel de gestão” e “Sair”. Sair revoga apenas a sessão local e direciona a `/entrar`. O logotipo nas telas administrativas e o atalho de retorno direcionam a `/painel`. Agenda, Clientes e Relatórios mantêm a barra de navegação centralizada, inclusive quando os itens quebram em telas menores.
