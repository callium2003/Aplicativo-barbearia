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

No Windows, se o servidor local não conseguir verificar a sessão por `UNABLE_TO_VERIFY_LEAF_SIGNATURE`, inicie o Node com os certificados confiáveis do sistema (Node 24 ou Node 22.19+), mantendo a validação TLS ativa:

```powershell
$env:NODE_USE_SYSTEM_CA = "1"
npm.cmd run dev
```

O build gera a saida Next standalone e prepara os arquivos auxiliares exigidos pela Hostinger. Nunca versione `.env.local`, chaves `service_role`, segredos de e-mail, `node_modules` ou `.next`.

## Demonstração local da landing

O cenário demo usa um stack exclusivo `barbeariasp-landing-demo`, API `http://127.0.0.1:55321` e app `http://127.0.0.1:3005`. Nunca aplicar esse seed no Supabase remoto. Não alterar `.env.local`, vincular projeto, copiar dados reais ou executar `db reset` para preparar as demonstrações. Docker Desktop precisa estar ativo.

```powershell
npm.cmd run demo:prepare
npm.cmd run demo:seed
# Em outro terminal, servir somente o gateway copiado para o ambiente isolado:
node node_modules/supabase/dist/supabase.js functions serve --inspect-mode run --workdir .tmp/landing-demo
# Em outro terminal:
npm.cmd run demo:dev
# Verificação read-only de disponibilidade:
node scripts/verify-landing-demo.mjs
```

O seed cria a Barbearia Vila Mariana, três Clientes fictícios, cinco serviços, dois profissionais, nove reservas (seis concluídas e três futuras), comissões e notificações pelos mecanismos reais do app. As reservas são criadas pela RPC normal; para o histórico, apenas o container demo desloca datas já validadas antes da conclusão pela RPC de gestão. Não desabilita triggers nem fabrica lançamentos de comissão/notificação. Nenhum processador de e-mail externo é iniciado. A execução pode retomar o cenário demo conhecido, preservando reservas concluídas, e recusa tenants alheios. Sessões locais ficam exclusivamente em `.tmp`, ignorada pelo Git; não compartilhar esse diretório.

O modo `--inspect-mode run` foi necessário nesta máquina para capturar a consulta mensal sem cancelamento pelo limite de CPU do runtime local. Isso não comprova desempenho no ambiente hospedado. Para entrar manualmente no demo, use o Magic Link das contas `gestao@landing-demo.example.test` e `bruno@landing-demo.example.test`; a caixa de e-mail é local em `http://127.0.0.1:55324`. Não use Google nem e-mails reais nesse stack. A validação pela interface pode adicionar reservas fictícias além das nove do seed.

As imagens em `public/marketing-demo` são capturas das telas reais, com dados fictícios. A galeria é conteúdo estático e não exige que o seed rode no ambiente hospedado. Ao terminar as capturas, encerrar `demo:dev`, `functions serve` e parar somente esse stack com `node node_modules/supabase/dist/supabase.js stop --workdir .tmp/landing-demo` (preserva volumes). O histórico de verificação e homologação permanece na seção 48 da EFS.

## Documentação

- [EFS — requisitos completos e acompanhamento de execução](docs/FUNCTIONAL-SPEC.md)
- [Instruções de trabalho dos agentes](AGENTS.md)

## Ponto de retomada e preparação de pacote

O ponto de retomada do projeto fica na [seção 48 da EFS](docs/FUNCTIONAL-SPEC.md#48-acompanhamento-de-construção-pendências-e-homologação). Ela é a fonte de verdade para o que foi construído, aplicado remotamente, homologado e ainda pendente; não há um arquivo de status paralelo.

Em 16/09/2026, a versão completa da árvore local foi construída e publicada na Hostinger pelo build `01a0a7f4-cef0-7070-a8c7-45aa0cf39219`, em Node 22. O Supabase remoto compartilhado recebeu as migrations correspondentes registradas na EFS. A árvore continua com alterações não commitadas; publicação hospedada não equivale a commit ou push. O histórico operacional do Resend está em [docs/RESEND.md](docs/RESEND.md), e a linhagem de banco em [docs/SUPABASE_BASELINE.md](docs/SUPABASE_BASELINE.md).

Antes de preparar ou publicar uma atualização para a Hostinger, consulte a EFS e execute as validações listadas ali. O comando `npm.cmd run package:hostinger` gera somente o artefato standalone local e exige autorização explícita; ele não faz deploy. Não publique, não faça commit/push e não aplique migrations adicionais apenas por preparar o pacote.

## Estado de construção

O produto operacional, as migrations recentes e a versão hospedada foram reconciliados em 16/09/2026. A EFS registra também o que ainda não está construído: integração financeira real com Asaas, reagendamento atômico, ciclo completo de retenção/expurgo de tenant, continuidade operacional para lançamento comercial e a futura gestão interna da plataforma. Esses itens não são inferidos a cada tarefa; consulte a tabela única da [seção 48.5 da EFS](docs/FUNCTIONAL-SPEC.md#485-inventário-finito-de-lacunas-de-construção) antes de iniciar um novo lote.
