# Especificação técnica consolidada — 12/08/2026

## Stack e publicação

- Next.js 16.3 com React 19 e TypeScript.
- Supabase PostgreSQL 17 como backend operacional, Auth, RLS, Storage e RPCs.
- Hostinger Node.js com Node 22, npm, script `build` e output `.next`.
- Fuso operacional: `America/Sao_Paulo`.
- Domínio de homologação: `https://barbeariasp.cullentech.com.br`.

## Autenticação e autorização

- Cliente usa login próprio e não acessa a gestão.
- Dono, gestor e profissional têm permissões confirmadas no banco por barbearia.
- O menu é apenas apresentação; RLS, triggers e RPCs são a barreira definitiva.
- Dono, gestor e profissional não podem agendar usando a conta administrativa na própria barbearia.

## Consentimentos

Tabela: `public.customer_consents`.

- `BARBERSHOP_MARKETING`: vinculado a `customer_id` e `barbershop_id`.
- `PLATFORM_MARKETING`: vinculado somente a `customer_id`.
- Os eventos são versionados, possuem origem e data de aceite/revogação.
- A interface usa opt-out: desmarcado grava aceite; marcado grava recusa/revogação.
- RPCs do cliente:
  - `get_my_customer_marketing_preferences()`;
  - `save_my_customer_marketing_preferences(uuid, boolean, boolean)`.
- As RPCs são `SECURITY INVOKER`, com RLS e relação do cliente verificadas.

## Notificações

- `user_notifications`: notificações internas por usuário.
- `notification_outbox`: fila de e-mails para processamento pelo Resend.
- Preferências em `notification_preferences` são da equipe/gestão; preferências de marketing do cliente ficam em `customer_consents`.
- Confirmação, cancelamento, reagendamento e lembrete de 24 horas são comunicações operacionais e não dependem de aceite de marketing.

## Saúde e monitoramento

- O código versionado contém `app/api/health/route.ts`, com resposta mínima que não expõe dados de clientes, tenants ou banco.
- A versão Hostinger `019ff80d-3125-7125-bb35-cda7d5932e9f` foi um pacote emergencial que excluiu rotas de API para contornar uma falha de permissão do workspace de build; por isso `/api/health` responde HTTP 404 nesta versão.
- `monitor-platform-health` segue ativo no Supabase a cada 7 minutos e registrou a falha. Restaurar e validar a rota no próximo deploy é obrigatório antes de classificar o monitoramento como implementado em produção.

## Migrations remotas recentes

- `record_marketing_opt_out_on_booking`;
- `add_customer_marketing_preferences`;
- `fix_customer_consent_booking_policy`.
- `restore_public_catalog_anon_grants` (grants mínimos para catálogo público anônimo).

## Estado técnico

## Perfil do cliente e múltiplas barbearias

- O perfil autenticado consulta somente os vínculos do próprio cliente em `barbershop_customers` e exibe a seção "Minhas barbearias".
- Cada item mostra apenas o nome e o link público pelo `slug` da barbearia; não há troca automática de tenant nem reaproveitamento de agenda entre barbearias.
- "Minha agenda" continua sendo a lista de agendamentos do cliente. Cada agendamento preserva sua barbearia de origem para ações como reagendar, cancelar, WhatsApp e abrir a página pública.
- O layout desktop dos agendamentos usa uma coluna larga e impede que a data seja quebrada caractere a caractere; o comportamento responsivo para celular permanece em uma coluna.

Código e migrations foram validados localmente. A publicação Hostinger da versão atual foi concluída no build `019ff80d-3125-7125-bb35-cda7d5932e9f`, com página pública validada e rota de saúde pendente de restauração. A limpeza de dados de homologação ainda não foi executada.
