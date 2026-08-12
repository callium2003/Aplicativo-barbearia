# Seguranca

## Principios obrigatorios

1. O isolamento multi-barbearia e imposto por **RLS e RPCs no Supabase**, nunca apenas por filtros do navegador.
2. O navegador recebe somente `NEXT_PUBLIC_SUPABASE_URL` e `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`.
3. `service_role`, segredos do Resend, segredo do Cron, Vault e tokens de infraestrutura nunca entram em Git, ZIP, logs ou frontend.
4. Mudanca de schema exige migration nova, revisao de RLS e teste; migrations aplicadas nao sao reescritas.

## Limites publicos

- A disponibilidade publica e exposta pela RPC estreita `get_public_availability`; nao conceder `SELECT` anonimo em tabelas operacionais de agenda.
- Reserva e revalidada no backend antes de gravar, evitando conflito de horario.
- Fotos sao validadas no cliente, mas a escrita deve ser limitada no Storage ao tenant/perfil autorizado.
- Dados cadastrais sensiveis do dono nao pertencem ao catalogo publico.

## Sessao e perfis

- Sessao pertence ao navegador. Contas diferentes no mesmo navegador nao podem confiar apenas em tela/abas; qualquer operacao sensivel deve confirmar `auth.uid()` e o vinculo atual no banco.
- Menus por papel sao experiencia de uso; RLS e RPCs sao a barreira efetiva.
- Convites sao de uso unico; o banco guarda hash do token, nao o token bruto.

## Cabecalhos e runtime

`next.config.ts` aplica `X-Content-Type-Options`, `Referrer-Policy`, `X-Frame-Options` e `Permissions-Policy`. Isso complementa, mas nao substitui, RLS, Auth e validacao de entrada.

## Pendencias conhecidas

- O aviso Supabase de protecao contra senhas vazadas permanece desligado por limitacao do plano atual. E uma limitacao aceita temporariamente, nao uma correcao concluida.
- Avisos do Advisor sobre funcoes `SECURITY DEFINER` e tabelas RLS sem politica exigem auditoria individual. Alguns objetos sao propositalmente acessiveis apenas por RPC/roles; nao adicionar permissoes ou revogar execucao sem teste de impacto.
- Confirmar em homologacao o upload de foto da barbearia, pois houve relato anterior de erro de RLS.

## Checklist antes de producao

- testar isolamento A x B com dono, gestor, profissional e cliente;
- validar login Google e magic link no dominio HTTPS;
- validar RLS de imagens e dados privados;
- revisar avisos do Advisor com evidencias;
- validar backup, restauracao, observabilidade e entrega SMTP;
- desativar modo cacheless da Hostinger apos a rodada de testes.
