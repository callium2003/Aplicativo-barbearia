# Matriz de permissões e execução dos Lotes 5 e 6

Data da execução: 06/08/2026 (America/Sao_Paulo)

Ambiente remoto de homologação: `irszgnkzqseljowckrgz`

## Lote 5 — convites antigos

A contagem foi repetida imediatamente após o endurecimento do fluxo de convites.

Resultado:

| Status | Quantidade |
|---|---:|
| `accepted` | 2 |
| `pending` | 0 |
| `revoked` | 0 |
| `expired` | 0 |

Não existia convite pendente criado pelo modelo antigo. Portanto, nenhum dado operacional foi alterado e nenhum token foi revogado neste lote.

## Lote 6 — matriz definitiva de permissões

| Operação | Owner | Manager | Barber |
|---|---:|---:|---:|
| Ler dados da própria barbearia, inclusive inativa | Sim | Sim | Não |
| Editar dados operacionais da barbearia | Sim | Sim | Não |
| Alterar owner, slug, status ou campos estruturais | Sim | Não | Não |
| Criar serviço | Sim | Sim | Não |
| Editar ou ativar/inativar serviço | Sim | Sim | Não |
| Excluir serviço | Sim | Não | Não |
| Criar ou editar horários gerais | Sim | Sim | Não |
| Excluir horários gerais | Sim | Não | Não |
| Ler profissionais da própria barbearia | Sim | Sim | Somente o próprio vínculo e catálogo público ativo |
| Criar profissional | Sim | Não | Não |
| Alterar nome/status de profissional | Sim | Não | Não |
| Excluir profissional | Sim | Não | Não |
| Configurar agenda e pausas de profissional | Sim | Sim | Não nesta etapa |
| Configurar comissão | Sim | Sim | Não |
| Convidar manager | Sim | Não | Não |
| Convidar barber | Sim | Sim | Não |
| Ver CRM completo da própria barbearia | Sim | Sim | Não |
| Ver agenda completa da própria barbearia | Sim | Sim | Não |
| Ver própria agenda | Sim | Sim | Sim |

## Migrations remotas

### `20260807022443_implement_role_permission_matrix`

- separa policies públicas de `anon` das policies de usuários autenticados;
- permite que manager leia barbearia e profissionais da própria barbearia mesmo quando inativos;
- permite que owner e manager criem e editem serviços;
- mantém exclusão de serviços exclusiva do owner;
- permite que owner e manager criem e editem horários gerais;
- mantém exclusão de horários gerais exclusiva do owner;
- mantém `INSERT`, `UPDATE` e `DELETE` de `professionals` exclusivos do owner;
- mantém barber limitado ao próprio profissional e aos dados públicos ativos.

### `20260807022720_preserve_safe_manager_profile_updates`

- preserva o `UPDATE` direto usado pela tela atual;
- cria o trigger privado `guard_manager_barbershop_update`;
- manager só pode alterar `name`, `address`, `phone`, `whatsapp`, `notification_email` e `description`;
- alterações de `id`, `owner_id`, `slug`, `created_at`, `photo_url`, redes sociais, `active` e `initial_registration_completed` são rejeitadas para manager com SQLSTATE `42501`;
- owner mantém a capacidade de atualização necessária aos fluxos estruturais;
- a função do trigger não é executável diretamente por `anon` nem `authenticated`.

## Validação comportamental

Os testes foram executados em transações revertidas. Um vínculo temporário de manager foi criado apenas dentro da transação e removido pelo `ROLLBACK`.

Resultados aprovados:

1. manager foi resolvido corretamente por `private.current_barbershop_role`;
2. manager criou serviço na própria barbearia;
3. manager editou serviço da própria barbearia;
4. manager não excluiu serviço;
5. manager editou horário geral da própria barbearia;
6. manager não alterou estrutura de profissional;
7. manager não alterou serviço de outro tenant;
8. manager atualizou os campos operacionais da barbearia pela forma usada na interface;
9. tentativa de alterar `owner_id` foi bloqueada com `42501`;
10. barber não editou serviço;
11. barber não editou horário geral;
12. barber não editou profissional;
13. barber leu o próprio profissional;
14. owner manteve atualização da própria barbearia.

Contagens antes e depois dos testes permaneceram iguais:

- barbearias: 4;
- serviços: 9;
- horários gerais: 28;
- profissionais: 7;
- membros de equipe: 1;
- logs de auditoria: 11.

## Advisors

Após as migrations:

- não surgiu novo alerta de segurança relacionado à matriz;
- foram removidos os avisos de múltiplas policies permissivas em `barbershops`, `services`, `business_hours` e `professionals`;
- permanecem avisos anteriores de funções `SECURITY DEFINER`, índices e policies não tratados neste lote;
- o alerta de `professional_commission_settings` sem policy permanece intencional, pois o acesso direto continua bloqueado e a tabela é usada por RPCs controladas.

## Limite do lote

A camada de banco está alinhada à matriz. A tela atual já permite ao manager editar perfil, serviços, horários, comissão e criar convite de barber.

O botão de configuração de agenda profissional ainda está visualmente condicionado a owner em `app/painel/configurar/page.tsx`. A policy do banco já permite owner e manager, mas a liberação visual e a reprodução do erro histórico em `professionals` pertencem ao Lote 7, para não misturar a correção de interface com a implantação da matriz de RLS.

Não houve PR, merge ou deploy.