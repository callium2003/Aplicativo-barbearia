# Consolidação local — prioridades 1

## Escopo e resultado

Consolidação da pasta principal em 05/09/2026, preservando Next.js/React com Supabase e hospedagem Next standalone na Hostinger. Cloudflare Workers, D1, Drizzle e Vinext não foram adotados como arquitetura do aplicativo.

O histórico local avançou de `e0be30c` para `67e6b52`, por fast-forward dos 14 commits já existentes no GitHub. As alterações locais foram reaplicadas e reconciliadas. Não houve novo commit de entrega, push, deploy ou acesso ao Supabase remoto. A árvore continua com alterações locais para revisão.

## Preservação

- Backup dos 41 arquivos modificados ou não versionados, com comparação SHA-256 de cada cópia, em `C:\Users\calli\Documents\Codex\backups\barbeariasp-prioridade1-20260905`.
- Patch binário, estado original e hash do commit anterior preservados no mesmo destino.
- Stash `priority1-preserve-local-20260905` mantido como recuperação adicional; ele representa o estado anterior à integração e não deve ser reaplicado cegamente.
- Os arquivos de ambiente não foram incluídos nesse backup; permaneceram na localização original.

## Causa dos erros de Cloudflare

Arquivos não versionados de um template Sites/Vinext estavam dentro do escopo `**/*.ts` do TypeScript: `db/`, `worker/`, `examples/`, `drizzle.config.ts`, `vite.config.ts` e `vite-env.d.ts`. A configuração referenciava um Worker e banco D1, enquanto a aplicação e seu manifesto usam Next.js e Supabase. A busca em `app/`, `utils/`, manifesto e configuração Next não encontrou dependência desses exemplos.

Esses seis caminhos foram movidos para `quarantine/` no backup externo. O `tsconfig.json` não foi afrouxado e não foram instalados tipos ou serviços Cloudflare. Os cinco erros de tipos deixaram de ocorrer.

## Migrations

Dez SQLs não versionados extras foram comparados por conteúdo, normalizando apenas CRLF/LF, e preservados na quarentena externa:

| Cópia extra | Arquivo equivalente preservado no projeto |
| --- | --- |
| `20260802180056_customer_crm_vertical_slice.sql` | Mesmo nome em `migration-history/substituted-local/` |
| `20260803015008_fix_customer_phone_normalization.sql` | Mesmo nome em `migration-history/substituted-local/` |
| `20260803222030_install_customer_crm_booking.sql` | `20260803222030_20260803205726_install_customer_crm_booking.sql` |
| `20260803224530_secure_public_catalog_and_internal_trigger.sql` | `20260803224530_20260803230000_secure_public_catalog_and_internal_trigger.sql` |
| `20260804013607_optimize_booking_intervals_10min.sql` | `20260804013607_20260803230000_optimize_booking_intervals_10min.sql` |
| `20260804020000_add_team_invitations.sql` | `20260804043338_add_team_invitations.sql` |
| `20260804050000_add_professional_commission_rate.sql` | `20260806040824_20260804050000_add_professional_commission_rate.sql` |
| `20260804060000_isolate_professional_commission.sql` | `20260806040831_20260804060000_isolate_professional_commission.sql` |
| `20260804070000_harden_professional_commission_security.sql` | `20260806040839_20260804070000_harden_professional_commission_security.sql` |
| `20260806050000_revoke_anon_commission_rpc_execute.sql` | `20260806051055_20260806050000_revoke_anon_commission_rpc_execute.sql` |

A migration local `20260816071507_harden_notification_worker_request_auth.sql` foi preservada byte a byte. Ela contém a reivindicação atômica do nonce; não é uma duplicata da migration de 24/08, que restaura a configuração HMAC do Cron. A lista de testes mantém as duas e as cinco migrations recebidas do GitHub.

A sequência local contém 49 arquivos e 49 versões únicas. Todos os SQLs já versionados em `migrations/` e `migration-history/` permanecem iguais ao commit integrado. Nenhuma migration foi aplicada, renomeada ou reescrita remotamente. O teste de linhagem é uma conferência de arquivos locais, não uma consulta ao catálogo remoto.

## Resolução de conflitos

- Worker: preservadas assinatura HMAC, validade de cinco minutos e reivindicação de nonce antes da fila, junto com os códigos de erro sanitizados recebidos do GitHub.
- Testes: preservadas as verificações de ambos os conjuntos; incluídos quatro testes de execução com serviços simulados, sem e-mail real ou acesso ao banco.
- Dependências: preservado o ajuste local de Next e eslint-config-next para 16.3.1, com manifesto e lockfile coerentes.
- Documentação: preservadas as homologações do responsável e os recursos recentes de privacidade. A regra atual de consentimento é opt-in separado da reserva. Atualizado o inventário de migrations e registrado o HTTP 200 de `/api/health` observado na avaliação anterior desta tarefa.

## Validação e limites

- Lint completo aprovado; o novo teste também passou no lint específico.
- TypeScript aprovado com `--noEmit --incremental false`, sem excluir código do aplicativo.
- Build Next aprovado, incluindo tipos, geração de 19 páginas estáticas e preparação standalone.
- Suíte original: 70 testes aprovados, incluindo inicialização real do standalone e HTML da página inicial.
- Conjunto final executado após a integração dos testes: **74 aprovados, zero falhas**.
- Quatro testes adicionais do worker aprovados: assinatura inválida/expirada, replay, falha na reivindicação do nonce e sanitização de falha de entrega.
- `git diff --check` aprovado; sem conflitos no índice; HEAD e origin/main no mesmo commit.

## Conferência remota em 06/09/2026

- Supabase `irszgnkzqseljowckrgz` está ativo e saudável; o domínio usa Hostinger Node.js.
- O catálogo remoto tem **51 migrations**, contra 49 na consolidação anterior. As duas migrations mais recentes tratam de retenção/preferências de conta e baixa de comissões por período; os arquivos foram localizados em outra worktree e ainda não foram incorporados nesta pasta.
- As funções `process-notifications` (v9), `monitor-platform-health` (v4) e `delete-my-customer-account` (v3) estão ativas. O worker remoto usa HMAC, mas ainda não chama `claim_notification_worker_request`; o código local consolidado já chama.
- As duas rotinas Cron estão ativas: monitor a cada 7 minutos e notificações a cada minuto. A rota `/api/health` responde HTTP 200 e o estado salvo está saudável, mas o último `last_checked_at` registrado era de 30/08.
- Nos últimos 30 minutos, o histórico do `pg_net` mostrou 34 respostas HTTP 500: 30 por configuração indisponível do worker e 4 por configuração indisponível do monitor. Os três nomes esperados no Vault existem, então é necessário investigar a leitura/estrutura dos segredos antes de declarar os alertas operacionais saudáveis.
- Hostinger mostra o último build concluído em 29/08 (`01a04bf2-939b-723e-ab4e-e252ba9915af`), usando Next 16.3.0; a consolidação local usa Next 16.3.1. As rotas públicas consultadas responderam HTTP 200, mas o artefato remoto ainda não corresponde integralmente ao local.

## Correção operacional em 06/09/2026

- As duas migrations remotas de 28/08 foram incorporadas na pasta local sem reescrever o histórico remoto. Em 06/09/2026, `20260906005431_close_notification_nonce_expiry_window.sql` foi aplicada de forma incremental e registrada remotamente como `20260906042028_close_notification_nonce_expiry_window`; catálogo remoto e pasta local passaram a representar as mesmas 52 migrations.
- A Data API recusou as credenciais automáticas disponíveis nas Edge Functions, primeiro como JWT inválido (`PGRST303`) e depois como chave inválida (HTTP 401). Nenhum valor de chave foi exibido ou gravado.
- `monitor-platform-health` e `process-notifications` passaram a usar `SUPABASE_DB_URL` com Postgres.js, conexão limitada a uma por instância e prepared statements desativados para compatibilidade com pool transacional. A autenticação própria do Cron, as funções SQL e a lógica de negócio foram preservadas.
- `monitor-platform-health` v15 respondeu HTTP 200 em chamada controlada, com `healthy=true` e `alert=none`. O estado remoto foi atualizado em `2026-09-06 04:00:03+00`, com zero falhas consecutivas e sem erro.
- `process-notifications` v15 respondeu HTTP 200 na execução automática de `2026-09-06 04:01:00+00`: nenhum item aguardava processamento, nenhum e-mail foi enviado e `reminder_enqueue_error` ficou nulo.
- A validação específica aprovou 12 testes e o typecheck; a validação final aprovou lint, build Next/standalone e 76 testes. Agendamentos e perfis não foram alterados; a homologação funcional já confirmada permanece válida.

O bloqueio operacional do worker e do monitor foi removido. A migration incremental também foi aplicada e validada: o limite de 300 segundos foi recusado, um nonce novo foi aceito uma vez, a repetição foi recusada e os registros da prova foram removidos; o Cron respondeu HTTP 200 depois da mudança. Permanecem para o próximo ciclo a diferença do artefato Hostinger, os dois achados médios do diff scan de segurança e a homologação dirigida das alterações publicadas, privacidade e notificações.
