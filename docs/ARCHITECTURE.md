# Arquitetura

## Visao geral

O BarbeariaSP e uma aplicacao web **Next.js 16 App Router** com React 19. O Supabase e o unico backend e banco operacional: PostgreSQL, Auth, Storage, Realtime, Edge Functions e Vault. Nao ha banco Drizzle, D1, Vite ou Vinext ativos no produto atual.

```text
Navegador (Next.js/React)
  -> Supabase Auth e API publica
  -> PostgreSQL com RLS e RPCs restritas
  -> Storage (imagens da barbearia e profissionais)
  -> Realtime (notificacoes)
  -> Edge Function + pg_cron/pg_net + Resend (e-mail transacional)
```

## Componentes principais

| Componente | Estado | Responsabilidade |
| --- | --- | --- |
| `app/[slug]/page.tsx` | Implementado | pagina publica, catalogo, disponibilidade e confirmacao do agendamento |
| `app/meus-agendamentos/` | Implementado | cliente cancela ou remarca reservas |
| `app/meu-perfil/` | Implementado | perfil do cliente, nome e telefone |
| `app/painel/` | Implementado | gestao, agenda, equipe, CRM, relatorios e configuracoes |
| `app/painel/PanelShell.tsx` | Implementado | navegacao responsiva filtrada por papel |
| Supabase PostgreSQL/RLS | Implementado | dados e isolamento entre barbearias |
| Supabase Storage | Implementado | fotos publicas com gravacao isolada por tenant |
| `process-notifications` | Implementado | consumo da fila de e-mail pelo backend |
| Hostinger Node.js | Homologacao | execucao do Next standalone no dominio de teste |

## Perfis e navegacao

- **Cliente:** Barbearia, Agenda e Meu perfil.
- **Dono/Gestor:** Barbearia, Agenda, Gestao, equipe, clientes, relatorios, notificacoes e configuracoes conforme permissao.
- **Profissional:** Barbearia, Minha agenda, Disponibilidade, Meu perfil e notificacoes.

O frontend so organiza a experiencia. A autorizacao definitiva depende de `auth.uid()`, associacao com a barbearia e RLS/RPCs do banco.

## Horarios

Datas e horarios operacionais usam `America/Sao_Paulo`. O banco calcula disponibilidade, conflito, pausas, bloqueios e relatorios nesse fuso. A interface tambem formata datas nesse fuso; novas telas devem manter a mesma regra.

## Publicacao

`next.config.ts` usa `output: "standalone"`. O build executa `scripts/prepare-hostinger-standalone.mjs`, que inclui no bundle standalone o `package.json`, `public/` e `.next/static/`. Isso atende a forma como a Hostinger pode iniciar o processo Node.

Variaveis de frontend:

```text
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
```

Nenhuma chave administrativa do Supabase ou do Resend pertence ao servidor web da Hostinger.
