# BarbeariaSP

Aplicacao web responsiva para barbearias publicarem a propria pagina, receberem agendamentos e operarem agenda, equipe, clientes e relatorios. O produto usa **Next.js 16**, React 19 e Supabase. A marca desenvolvedora e **Cullentech**.

## Estado atual — 11/08/2026

- **IMPLEMENTADO:** pagina publica por `/{slug}`, agendamento autenticado, Google/magic link, cliente, agenda, equipe, CRM, relatorios, comissoes, notificacoes e configuracoes da barbearia.
- **IMPLEMENTADO:** menus por papel (cliente, dono/gestor e profissional), perfil do cliente e perfil publico do profissional.
- **IMPLEMENTADO:** horarios e relatorios usam o fuso `America/Sao_Paulo`.
- **EM HOMOLOGACAO:** publicacao Node.js/Next na Hostinger e verificacao visual de que o dominio entrega o commit esperado. Build concluido nao substitui essa verificacao.
- **PARCIAL:** modernizacao visual: navegacao compartilhada e inicio da Gestao foram atualizados; formularios internos ainda precisam de revisao visual tela a tela.
- **PLANEJADO:** landing page final, planos, assinatura, cobranca, pagamentos e Pix.

O resumo operacional e a fonte de verdade do estado atual estao em [docs/CURRENT-STATUS.md](docs/CURRENT-STATUS.md).

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

## Fluxo principal

1. O dono entra e conclui o cadastro da barbearia.
2. Configura servicos, profissionais, horarios, pausas, contatos e pagina publica.
3. O cliente acessa `/{slug}`, escolhe servicos, profissional, data e horario.
4. Caso necessario, autentica por Google ou magic link; a reserva pendente vale no maximo 30 minutos.
5. A disponibilidade e revalidada e o cliente confirma o agendamento.
6. Cliente pode gerenciar a reserva; gestao confirma, conclui, cancela ou registra ausencia.
7. Atendimentos concluidos alimentam CRM, relatorios e comissoes.

## Documentacao

- [Estado atual e homologacao](docs/CURRENT-STATUS.md)
- [Arquitetura](docs/ARCHITECTURE.md)
- [Especificacao funcional](docs/FUNCTIONAL-SPEC.md)
- [Seguranca](docs/SECURITY.md)
- [Roadmap](docs/ROADMAP.md)
- [Decisoes](docs/DECISIONS.md)
- [Baseline Supabase](docs/SUPABASE_BASELINE.md)
- [Deploy Node.js na Hostinger](docs/HOSTINGER-NODEJS-HOMOLOGATION.md)
- [Notificacoes](docs/NOTIFICATIONS-2026-08-08.md) e [operacao Resend](docs/RESEND.md)

Relatorios em `docs/history/` sao registros historicos: nao representam, sozinhos, o estado atual.
