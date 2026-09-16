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

## Ponto de retomada e preparação de pacote

O ponto de retomada do projeto fica na [seção 48 da EFS](docs/FUNCTIONAL-SPEC.md#48-acompanhamento-de-construção-pendências-e-homologação). Ela é a fonte de verdade para o que foi construído, aplicado remotamente, homologado e ainda pendente; não há um arquivo de status paralelo.

Em 16/09/2026, a versão completa da árvore local foi construída e publicada na Hostinger pelo build `01a0a7f4-cef0-7070-a8c7-45aa0cf39219`, em Node 22. O Supabase remoto compartilhado recebeu as migrations correspondentes registradas na EFS. A árvore continua com alterações não commitadas; publicação hospedada não equivale a commit ou push. O histórico operacional do Resend está em [docs/RESEND.md](docs/RESEND.md), e a linhagem de banco em [docs/SUPABASE_BASELINE.md](docs/SUPABASE_BASELINE.md).

Antes de preparar ou publicar uma atualização para a Hostinger, consulte a EFS e execute as validações listadas ali. O comando `npm.cmd run package:hostinger` gera somente o artefato standalone local e exige autorização explícita; ele não faz deploy. Não publique, não faça commit/push e não aplique migrations adicionais apenas por preparar o pacote.

## Estado de construção

O produto operacional, as migrations recentes e a versão hospedada foram reconciliados em 16/09/2026. A EFS registra também o que ainda não está construído: integração financeira real com Asaas, reagendamento atômico, ciclo completo de retenção/expurgo de tenant, continuidade operacional para lançamento comercial e a futura gestão interna da plataforma. Esses itens não são inferidos a cada tarefa; consulte a tabela única da [seção 48.5 da EFS](docs/FUNCTIONAL-SPEC.md#485-inventário-finito-de-lacunas-de-construção) antes de iniciar um novo lote.
