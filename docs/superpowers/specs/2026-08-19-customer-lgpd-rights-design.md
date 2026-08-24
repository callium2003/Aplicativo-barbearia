# Direitos do titular do cliente — desenho técnico

## Objetivo

Entregar uma área autenticada em `/meu-perfil/privacidade` para o cliente consultar os dados tratados, baixar uma exportação JSON e encerrar a própria conta com anonimização técnica verificável.

## Limites

- A implementação não publica aviso de privacidade, não define prazos legais nem substitui revisão jurídica.
- Nenhuma migration será aplicada ao Supabase remoto neste lote.
- Apenas contas de cliente são elegíveis para encerramento. Uma conta com vínculo ativo de equipe ou propriedade de barbearia é recusada para não apagar um acesso operacional por engano.

## Dados e autorização

`customer_privacy_requests` guarda somente protocolo aleatório, tipo, estado, datas e metadados técnicos com chaves e valores restritos. Não recebe nome, e-mail, telefone, CPF ou identificador escolhido pelo navegador. RLS é habilitado antes das policies; o cliente só recebe `SELECT` de suas próprias solicitações e não recebe escrita direta.

As RPCs públicas não recebem `customer_id`. Elas resolvem o cliente por `auth.uid()` e usam `SECURITY DEFINER` apenas onde é necessário consolidar ou anonimizar dados sujeitos a RLS. Todas usam `search_path = ''`, revogam `PUBLIC` e `anon`, e concedem execução somente para `authenticated`.

## Exportação

`export_my_customer_data()` monta um JSON com:

- o perfil do titular;
- as barbearias com as quais ele possui vínculo;
- os próprios agendamentos, com snapshots de serviço e profissional;
- os eventos de consentimento associados ao próprio cliente.

Ela não inclui observações, motivo de cancelamento, auditoria, comissões, dados de funcionários ou segredos. A própria RPC cria e conclui o protocolo de exportação; a página cria um arquivo JSON no navegador, sem URL permanente.

## Reautenticação e encerramento

O frontend não trata a sessão como prova suficiente: ele verifica o JWT e leva o usuário ao login novamente quando a autenticação não for recente. A RPC exige no banco que o JWT tenha sido emitido há no máximo 15 minutos e contenha um método de autenticação que não seja `token_refresh` no mesmo intervalo. Isso atende magic link e Google sem coletar senha ou usar chaves administrativas no navegador.

A Edge Function `delete-my-customer-account` exige JWT, extrai o usuário exclusivamente do token e não aceita `user_id` no corpo. Ela chama a RPC de anonimização com o token do titular; só então usa `SUPABASE_SERVICE_ROLE_KEY`, mantida exclusivamente no ambiente da Function, para remover o usuário do Auth. As respostas são genéricas e a repetição da etapa de banco é idempotente.

## Anonimização

Para o cliente autenticado, a RPC:

1. cria ou reutiliza o protocolo de encerramento;
2. remove identificadores do cliente e dos vínculos por barbearia;
3. mantém agendamentos como snapshot operacional, mas troca nome/telefone por valores técnicos não identificáveis e limpa e-mail, notas, motivo de cancelamento e os dois vínculos do cliente;
4. esvazia destinatário e payload das notificações associadas aos agendamentos do titular;
5. remove consentimentos e objetos do Storage pertencentes ao usuário, caso existam;
6. remove identificadores correlatos dos registros de auditoria e mantém apenas um evento técnico de conclusão sem PII;
7. anonimiza o cadastro `customers`; após a remoção do usuário do Auth, o protocolo fica sem vínculo identificável e mantém status `COMPLETED` para auditoria mínima.

Os snapshots de serviço, profissional, horário, status e valor seguem disponíveis sem identificar o titular. A duração definitiva de retenção continua dependente de política e revisão jurídica.

## Testes

Um teste de contrato verifica página, Function e migration. Um roteiro SQL transacional cria clientes e barbearias fictícios, alterna `request.jwt.claims` para provar RLS A x B, confere grants, exportação, sessão recente, duplicidade, anonimização e repetição. Todo roteiro termina com `ROLLBACK`.
