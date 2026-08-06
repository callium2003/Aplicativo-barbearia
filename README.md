# BarbeariaSP

Aplicação web responsiva para barbearias criarem uma página pública, organizarem sua operação e receberem agendamentos. Não exige aplicativo instalado.

## Estado do produto

**IMPLEMENTADO:** página pública por slug, agendamento, autenticação por Google e magic link, configuração da barbearia, foto, serviços, profissionais, agenda, CRM/lista de clientes, links de WhatsApp e Google Maps e dashboard administrativo.

**PARCIAL:** relatórios mostram dados demonstrativos; configuração de comissão por profissional foi aplicada no Supabase remoto de homologação e validada tecnicamente pelo agente com isolamento financeiro em tabela privada via RPCs seguras com privilégio `EXECUTE` revogado de `anon`, estando pendente a homologação funcional da proprietária; cálculo automático por atendimento concluído, entrega profissional de e-mail, domínio de produção, deploy, monitoramento e pagamento ainda não estão concluídos.

**PLANEJADO:** campanhas, segmentos, exportações, relatórios reais, comissão, cobrança e portal de assinatura.

Consulte [a especificação funcional](docs/FUNCTIONAL-SPEC.md), [a arquitetura](docs/ARCHITECTURE.md), [a segurança](docs/SECURITY.md), [o roadmap](docs/ROADMAP.md) e [as decisões](docs/DECISIONS.md).

## Fluxo principal

1. A pessoa responsável entra com Google ou recebe um magic link no e-mail.
2. O retorno de autenticação leva para `/painel` e mantém a sessão ativa.
3. A barbearia configura nome, slug, contatos, foto, serviços, profissionais e horários.
4. Clientes acessam `/{slug}`, escolhem serviços, profissional, data e horário, informam nome, telefone e consentimentos opcionais.
5. Se ainda não estiverem autenticados, escolhem Google ou magic link; a reserva pendente é restaurada no retorno e exige confirmação final antes de criar o agendamento.
6. A gestão consulta agenda e clientes, abre ou copia o link público e volta ao dashboard por qualquer tela interna.

## Tecnologias e estrutura

- React 19, Next 16 e Vinext/Vite;
- TypeScript;
- Supabase PostgreSQL, Auth e Storage;
- Cloudflare Worker/Vinext no runtime e build;
- Drizzle/D1 são remanescentes do template, não o banco principal.

```text
app/[slug]/                  página pública da barbearia
app/entrar/                  autenticação por Google e magic link
app/painel/                  dashboard, configuração, agenda, clientes e relatórios
supabase/migrations/         migrations versionadas após o baseline
tests/                       renderização, links, imagem/Storage e fluxo público de reserva
docs/                        documentação do produto e operação
```

## Ambiente local

Requisitos: Node.js `>=22.13.0`, projeto Supabase configurado e `.env` local não versionado.

```text
VITE_SUPABASE_URL=
VITE_SUPABASE_PUBLISHABLE_KEY=
```

Use somente a chave publicável no frontend. Nunca use ou versione `service_role`, credenciais ou `.env` reais.

```powershell
npm.cmd install
npm.cmd run dev
npm.cmd run typecheck
npm.cmd test
npm.cmd run build
npm.cmd run lint
```

`npm test` recompila a aplicação e executa os testes de renderização, links de contato, imagem/Storage e fluxo de reserva. Use `npm run typecheck` para conferir os tipos sem gerar arquivos.

## Autenticação

O login administrativo usa `signInWithOAuth` para Google e `signInWithOtp` para e-mail, com retorno a `${window.location.origin}/painel`.

Na reserva pública, a pessoa preenche nome, telefone e consentimentos antes de autenticar. Google e magic link usam a própria URL pública selecionada como retorno. Serviços, profissional, horário, dados de contato e consentimentos ficam guardados no navegador por no máximo 30 minutos; no retorno, a disponibilidade é revalidada e o agendamento só é criado após uma confirmação explícita. Telefone aceita somente 10 ou 11 dígitos depois da normalização.

Em homologação, os redirects locais permitidos incluem `http://127.0.0.1:3005/**` e `http://localhost:3005/**`, além dos URLs preexistentes. Produção deve ter seus próprios URLs autorizados antes de ser publicada.

O envio de magic link e o retorno local foram homologados no ambiente remoto configurado. SMTP profissional, domínio personalizado, URLs de produção e observabilidade da entrega continuam pendentes.

## Segurança, migrations e deploy

Supabase é o banco principal e RLS é a proteção obrigatória entre barbearias; filtros do frontend não concedem acesso. Não altere migrations antigas nem os SQLs em `supabase/migration-history/prebaseline-local/`. Mudanças de schema exigem migration nova, RLS e teste de isolamento.

Não execute comandos mutáveis no Supabase remoto, nem commit, push ou deploy, sem autorização explícita. Veja [SUPABASE_BASELINE.md](docs/SUPABASE_BASELINE.md) para a sequência de migrations.

Hostinger é a hospedagem pretendida, mas deploy, domínio, HTTPS, e-mail profissional, backup e monitoramento ainda não foram homologados.
