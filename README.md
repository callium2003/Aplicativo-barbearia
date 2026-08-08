# BarbeariaSP

Aplicação web responsiva para barbearias criarem uma página pública, organizarem sua operação e receberem agendamentos. Não exige aplicativo instalado.

## Estado do produto

**IMPLEMENTADO E HOMOLOGADO EM 08/08/2026:** autenticação administrativa e de cliente por Google/magic link, cadastro inicial de nova barbearia, página pública por slug, agendamento autenticado, Área do Cliente, cancelamento e reagendamento, configuração da barbearia, foto, serviços, profissionais, horários, agenda administrativa, CRM/lista de clientes, comissão por profissional, conclusão de atendimentos, relatórios gerenciais reais com CSV, links de WhatsApp/Google Maps, Central de Notificações, preferências por usuário/canal e envio automático de notificações transacionais por e-mail via Supabase + Resend.

**PARCIAL / PRÉ-PRODUÇÃO:** publicação do site, domínio público definitivo, redirects de Auth de produção, backup/monitoramento operacional, customização de SMTP do Supabase Auth se desejada e fechamento dos avisos de segurança ainda conhecidos. A entrega de notificações transacionais do produto já está ativa e validada; isso é separado do SMTP usado pelo Supabase Auth para magic links.

**PLANEJADO:** campanhas e segmentos avançados de marketing, push do navegador, WhatsApp Business API, cobrança, checkout e portal de assinatura.

Consulte [a especificação funcional](docs/FUNCTIONAL-SPEC.md), [a arquitetura](docs/ARCHITECTURE.md), [a segurança](docs/SECURITY.md), [o roadmap](docs/ROADMAP.md), [as decisões](docs/DECISIONS.md), [o baseline do Supabase](docs/SUPABASE_BASELINE.md), [a entrega de notificações](docs/NOTIFICATIONS-2026-08-08.md) e [a operação do Resend](docs/RESEND.md).

## Fluxo principal homologado

1. A pessoa responsável entra com Google ou recebe um magic link no e-mail.
2. Uma nova barbearia conclui o cadastro inicial em duas etapas no sistema visual atual, informando dados cadastrais e operacionais.
3. A barbearia configura contatos, foto, serviços, profissionais, dias/horários e preferências de notificação. O slug público é derivado somente do nome, sem sufixo aleatório; se o mesmo slug já existir, o cadastro solicita outro nome.
4. Clientes acessam `/{slug}`, escolhem serviços, profissional, data e horário, informam nome, telefone e consentimentos opcionais.
5. Se ainda não estiverem autenticados, escolhem Google ou magic link; a reserva pendente é restaurada no retorno e exige confirmação final antes de criar o agendamento.
6. Em `/meus-agendamentos`, o cliente pode cancelar ou reagendar. O sistema resolve a barbearia antes de alterar a reserva; cancelamento retorna à página pública e reagendamento retorna à mesma página com os serviços anteriores pré-selecionados.
7. A gestão confirma, cancela, conclui ou marca ausência na agenda; atendimentos concluídos alimentam os relatórios e o ledger de comissão.
8. Eventos de agenda geram notificações dentro do sistema e, quando habilitado, e-mails transacionais. A Central de Notificações mantém histórico e não lidas; as preferências ficam em Configurações.
9. O worker automático do Supabase processa a fila de e-mail a cada minuto e envia pelo Resend.

## Tecnologias e estrutura

- React 19, Next 16 e Vinext/Vite;
- TypeScript;
- Supabase PostgreSQL, Auth, Storage, Realtime, Edge Functions, Vault, `pg_cron` e `pg_net`;
- Resend para notificações transacionais por e-mail;
- Cloudflare Worker/Vinext no runtime e build;
- Supabase/PostgreSQL é o único banco funcional; o legado Drizzle/D1 do template foi removido em 2026-08-07 após instalação limpa e validação completa do build.

```text
app/[slug]/                  página pública da barbearia
app/entrar/                  autenticação administrativa por Google e magic link
app/cliente/                 autenticação e experiência do cliente
app/painel/                  dashboard, agenda, clientes, relatórios, notificações e configurações
scripts/process-notifications.mjs  worker local/manual alternativo para a fila de e-mail
supabase/migrations/         migrations versionadas após o baseline
tests/                       testes de renderização, segurança funcional, relatórios, notificações e migrations
docs/                        documentação do produto e operação
```

## Ambiente local

Requisitos: Node.js `>=22.13.0`, projeto Supabase configurado e `.env` local não versionado.

```text
VITE_SUPABASE_URL=
VITE_SUPABASE_PUBLISHABLE_KEY=
```

Use somente a chave publicável no frontend. Nunca use ou versione `service_role`, credenciais do Resend, segredos do Cron ou `.env` reais.

```powershell
npm.cmd ci
npx.cmd --no-install vinext dev --hostname 0.0.0.0 --port 3005
npm.cmd run typecheck
npm.cmd test
npm.cmd run build
npm.cmd run lint
```

A homologação local atual usa modo desenvolvedor na porta `3005` e o Supabase remoto de homologação.

## Autenticação

O login administrativo usa `signInWithOAuth` para Google e `signInWithOtp` para e-mail, com retorno a `${window.location.origin}/painel`.

Na reserva pública, a pessoa preenche nome, telefone e consentimentos antes de autenticar. Google e magic link usam a própria URL pública selecionada como retorno. Serviços, profissional, horário, dados de contato e consentimentos ficam guardados no navegador por no máximo 30 minutos; no retorno, a disponibilidade é revalidada e o agendamento só é criado após uma confirmação explícita. Telefone aceita somente 10 ou 11 dígitos depois da normalização.

Em homologação, os redirects locais permitidos incluem `http://127.0.0.1:3005/**` e `http://localhost:3005/**`, além dos URLs preexistentes. Produção deve ter seus próprios URLs autorizados antes de ser publicada.

## Notificações e e-mail

A entrega transacional do produto está ativa no Supabase remoto de homologação:

- `user_notifications` mantém a Central de Notificações;
- `notification_preferences` mantém preferências por evento e canal;
- `notification_outbox` mantém a fila transacional;
- Edge Function remota `process-notifications` consome a fila;
- Cron `barbeariasp-process-notifications` executa a cada minuto;
- credenciais externas e segredo do Cron ficam no Supabase Vault, não no frontend/GitHub;
- remetente oficial: `notificacoes@barbeariasp.cullentech.com.br`;
- domínio Resend verificado, envio habilitado, DKIM e SPF confirmados;
- em 08/08/2026, 18 mensagens acumuladas da homologação foram processadas e confirmadas pelo Resend como `delivered`.

A Edge Function foi ativada operacionalmente no projeto remoto em 08/08/2026. O código-fonte dessa função ainda deve ser consolidado/versionado no repositório em uma etapa técnica própria; `scripts/process-notifications.mjs` permanece como implementação versionada equivalente para execução manual/servidor.

A configuração operacional, DNS, segurança, monitoramento e troubleshooting do provedor estão documentados em [docs/RESEND.md](docs/RESEND.md).

## Segurança, migrations e deploy

Supabase é o banco principal e RLS é a proteção obrigatória entre barbearias; filtros do frontend não concedem acesso. Não altere migrations antigas nem os SQLs em `supabase/migration-history/prebaseline-local/`. Mudanças de schema exigem migration nova, RLS e teste de isolamento.

Não execute comandos mutáveis no Supabase remoto, nem merge para `main` ou deploy, sem autorização explícita. Veja [SUPABASE_BASELINE.md](docs/SUPABASE_BASELINE.md) para a sequência de migrations e para as ativações operacionais ainda não representadas por migration.

O site público pretendido é `barbeariasp.cullentech.com.br`. A publicação/hospedagem definitiva, HTTPS, redirects de Auth de produção, backups e observabilidade ainda precisam de homologação antes da produção.
