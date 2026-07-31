# BarbeariaSP

Aplicação web responsiva para barbearias criarem uma página pública, organizarem serviços, profissionais e agenda, e receberem agendamentos online. Não requer instalação de aplicativo.

## Estado do produto

Há fluxos de página pública, autenticação, configuração básica, agenda e consulta de agendamentos. CRM, relatórios reais, pagamentos, notificações e perfil completo ainda não estão concluídos. Consulte [a especificação funcional](docs/FUNCTIONAL-SPEC.md), o [roadmap](docs/ROADMAP.md) e as [decisões](docs/DECISIONS.md).

## Visão geral

1. O responsável entra com Google ou magic link.
2. Cria uma barbearia com nome e slug público.
3. Configura serviços, profissionais, expediente, pausas e bloqueios.
4. Clientes acessam `/{slug}`, consultam horários e solicitam agendamentos.
5. O painel consulta a agenda e permite acompanhar status.

## Tecnologias

- React 19, Next 16 e Vinext/Vite;
- TypeScript;
- Supabase PostgreSQL e Supabase Auth;
- `@supabase/supabase-js` nas telas atuais;
- Cloudflare Worker/Vinext no runtime e build;
- Drizzle/D1 remanescentes do template, não o banco principal.

## Estrutura

```text
app/                         páginas públicas, autenticação e painel
app/[slug]/                  página pública por barbearia
app/painel/                  configuração, agenda, assinatura, clientes e relatórios
db/                          Drizzle/D1 remanescente do template
worker/index.ts              entrada do Worker usada no runtime/build
supabase/migration-history/  SQLs preservados antes do baseline local
tests/                       testes de renderização e conexões essenciais
docs/                        arquitetura, escopo, segurança, decisões e roadmap
```

## Requisitos e instalação

- Node.js `>=22.13.0`;
- projeto Supabase para fluxos com dados reais;
- variáveis locais preenchidas sem versionar `.env` reais.

```bash
npm install
npm run dev
```

## Comandos reais

```bash
npm run dev
npm run build
npm run start
npm test
npm run lint
npm run db:generate
npm exec tsc -- --noEmit
```

`package.json` ainda não possui script `typecheck`; use `npm exec tsc -- --noEmit`. `npm test` executa build e `tests/rendered-html.test.mjs`; `npm run build` executa `vinext build`; `npm run lint` executa ESLint; `npm run db:generate` só deve ser usado após mudança de schema aprovada.

## Ambiente, Supabase e autenticação

Use `.env.example` como referência:

```text
VITE_SUPABASE_URL=
VITE_SUPABASE_PUBLISHABLE_KEY=
```

Nunca versione valores reais, `service_role` ou outros segredos. O Supabase é o banco principal; o Auth fornece Google e magic link. URLs de Auth, domínio personalizado, entrega de e-mail e homologação de produção continuam pendentes.

## Migrations, multi-tenancy e deploy

SQLs preservados ficam em `supabase/migration-history/prebaseline-local/`; não os mova nem altere. Mudanças futuras exigem nova migration, RLS e teste de isolamento. RLS no banco, não filtros do frontend, é a proteção obrigatória entre barbearias. Leia [SECURITY.md](docs/SECURITY.md).

Hostinger é a hospedagem inicial pretendida, mas o modelo técnico e a homologação de deploy ainda não estão definidos. Domínio, HTTPS, URLs do Auth, SMTP, backups e monitoramento permanecem pendentes.

## Para novos desenvolvedores

1. Leia este README e `docs/`.
2. Execute `git status --short` e `git log -1 --oneline` antes de editar.
3. Preserve alterações existentes; não faça commit, push ou deploy sem autorização.
4. Trabalhe por funcionalidade vertical: schema/migration aprovada, RLS, UI, testes e validação.
5. Rode typecheck, testes e build antes de solicitar homologação.
6. Corrija lint nos arquivos tocados; o lint global ainda possui backlog.
