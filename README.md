# BarbeariaSP

Aplicação web responsiva para barbearias criarem uma página pública, organizarem sua operação e receberem agendamentos. Não exige aplicativo instalado.

## Estado do produto

**IMPLEMENTADO:** página pública por slug, agendamento, autenticação por Google e magic link, configuração da barbearia, foto, serviços, profissionais, agenda, CRM/lista de clientes, links de WhatsApp e Google Maps e dashboard administrativo.

**PARCIAL:** relatórios mostram dados demonstrativos; entrega profissional de e-mail, domínio de produção, deploy, monitoramento e pagamento ainda não estão concluídos.

**PLANEJADO:** campanhas, segmentos, exportações, relatórios reais, comissão, cobrança e portal de assinatura.

Consulte [a especificação funcional](docs/FUNCTIONAL-SPEC.md), [a arquitetura](docs/ARCHITECTURE.md), [a segurança](docs/SECURITY.md), [o roadmap](docs/ROADMAP.md) e [as decisões](docs/DECISIONS.md).

## Fluxo principal

1. A pessoa responsável entra com Google ou recebe um magic link no e-mail.
2. O retorno de autenticação leva para `/painel` e mantém a sessão ativa.
3. A barbearia configura nome, slug, contatos, foto, serviços, profissionais e horários.
4. Clientes acessam `/{slug}`, consultam disponibilidade, usam WhatsApp/Maps quando houver dados e solicitam horários.
5. A gestão consulta agenda e clientes, abre ou copia o link público e volta ao dashboard por qualquer tela interna.

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
tests/                       renderização, links e imagem/Storage
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
npm.cmd exec tsc -- --noEmit
npm.cmd test
npm.cmd run build
npm.cmd run lint
```

`npm test` recompila a aplicação e executa os testes de renderização, links de contato e imagem/Storage. Não há script `typecheck`; use o comando explícito acima.

## Autenticação

O formulário usa `signInWithOAuth` para Google e `signInWithOtp` para e-mail. Ambos usam `${window.location.origin}/painel` como retorno. Esse endereço deve estar permitido nos redirects do projeto Supabase de cada ambiente. O formulário informa falhas na própria tela e encerra o estado de carregamento.

O e-mail de acesso e o Google foram validados no ambiente remoto atualmente configurado. SMTP profissional, domínio personalizado, URLs de produção e observabilidade da entrega continuam pendentes.

## Segurança, migrations e deploy

Supabase é o banco principal e RLS é a proteção obrigatória entre barbearias; filtros do frontend não concedem acesso. Não altere migrations antigas nem os SQLs em `supabase/migration-history/prebaseline-local/`. Mudanças de schema exigem migration nova, RLS e teste de isolamento.

Não execute comandos mutáveis no Supabase remoto, nem commit, push ou deploy, sem autorização explícita. Veja [SUPABASE_BASELINE.md](docs/SUPABASE_BASELINE.md) para a sequência de migrations.

Hostinger é a hospedagem pretendida, mas deploy, domínio, HTTPS, e-mail profissional, backup e monitoramento ainda não foram homologados.
