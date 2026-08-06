# Roadmap

## Fase 0 — Fundação

**Parcial:** baseline e migrations versionados, catálogo público restrito, reserva autenticada, convites de equipe (`team_invitations`) e retomada local homologados; typecheck, build e testes automatizados estão ativos. Permanecem homologação de produção, testes RLS A × B recorrentes, monitoramento e redução do backlog de lint.

## Fase 1 — Clientes, CRM e consentimentos

**Implementado:** cliente global, relação por barbearia, histórico seguro, consentimentos separados, lista real de clientes, reserva autenticada e abertura manual de WhatsApp. Permanecem filtros, segmentos, campanhas e CSV.

## Fase 2 — Atendimentos, relatórios e comissão

**Parcial:** percentual de comissão por profissional (`0%` a `100%`) configurável por owner e manager via RPCs seguras `get_professional_commission_rates` e `set_professional_commission_rate` com auditoria em `audit_logs` e privilégio `EXECUTE` revogado de `anon` (Etapa 1 aplicada no Supabase remoto de homologação `irszgnkzqseljowckrgz` e validada tecnicamente pelo agente). O histórico calcula receita concluída a partir dos agendamentos. Permanecem pendentes: teste visual/funcional da proprietária, cálculo transacional de comissão por atendimento concluído, controle de comissão pendente vs paga e relatórios financeiros reais. Faltam também desempenho, faturamento, ticket médio, fluxo de no-show e análise de cancelamentos.


## Fase 3 — Perfil completo

**Parcial:** foto pública, endereço, rota do Maps e WhatsApp usam os dados cadastrados. Permanecem capa, Instagram, perfil profissional completo, serviços por profissional e campos estruturados de localização.

## Fase 4 — Planos, trial e pagamento

Trial e bloqueio visual são parciais. Faltam decisão de provedor, checkout, webhooks, cobrança, bloqueio real e portal.

## Fase 5 — Notificações e e-mail

**Parcial:** Google e magic link retomam a reserva no ambiente de homologação; o magic link local usa URLs autorizados para `127.0.0.1:3005` e `localhost:3005`. Faltam SMTP profissional, SPF, DKIM, DMARC, confirmações, lembretes e recuperação de falhas.

## Fase 6 — Deploy e produção

Hostinger, domínio, HTTPS, redirects definitivos de Auth, backups, monitoramento e homologação final.

## Backlog técnico

Lint global, links internos remanescentes, hooks, aviso de imagem, limpeza coordenada de Drizzle/D1, documentação de deploy, cobertura de testes e revisão periódica de vulnerabilidades npm.
