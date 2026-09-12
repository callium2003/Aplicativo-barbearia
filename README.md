# BarbeariaSP

Aplicacao web responsiva para barbearias publicarem a propria pagina, receberem agendamentos e operarem agenda, equipe, clientes e relatorios. O produto usa **Next.js 16**, React 19 e Supabase. A marca desenvolvedora e **Cullentech**.

## Especificação e acompanhamento

A [Especificação Funcional de Software — EFS](docs/FUNCTIONAL-SPEC.md) é a única especificação para construir e finalizar o produto. Ela reúne requisitos funcionais, design, arquitetura, banco, segurança, assinatura, notificações e privacidade.

As seções 1–47 definem o produto; a seção 48 registra construção, pendências, evidências e homologação. Consulte e atualize esse registro a cada entrega. Não use documentos históricos como requisitos complementares nem mantenha status duplicado neste README.

As [instruções dos agentes](AGENTS.md) estabelecem a rotina de trabalho e os limites operacionais. Este README é apenas uma porta de entrada e um guia de execução local.

## Executar localmente

Requisitos: Node.js `>=22.13.0`, npm e um projeto Supabase configurado.

1. Copie `.env.example` para `.env.local` e preencha apenas as chaves publicas:

```text
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=
```

2. Instale e execute:

```powershell
npm.cmd ci
npm.cmd run dev
npm.cmd run typecheck
node.exe --experimental-strip-types --test tests\*.test.mjs
npm.cmd run build
```

O build gera a saida Next standalone e prepara os arquivos auxiliares exigidos pela Hostinger. Nunca versione `.env.local`, chaves `service_role`, segredos de e-mail, `node_modules` ou `.next`.

## Documentação

- [EFS — requisitos completos e acompanhamento de execução](docs/FUNCTIONAL-SPEC.md)
- [Instruções de trabalho dos agentes](AGENTS.md)
