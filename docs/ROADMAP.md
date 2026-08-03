# Roadmap

## Fase 0 — Fundação

**Parcial:** baseline e migrations versionados, autenticação local homologada, typecheck, build e testes automatizados estão ativos. Permanecem homologação de produção, testes RLS A × B recorrentes, monitoramento e redução do backlog de lint.

## Fase 1 — Clientes, CRM e consentimentos

**Implementado:** cliente global, relação por barbearia, histórico seguro, consentimentos separados, lista real de clientes e abertura manual de WhatsApp. Permanecem filtros, segmentos, campanhas e CSV.

## Fase 2 — Atendimentos, relatórios e comissão

**Parcial:** o histórico calcula receita concluída a partir dos agendamentos. Faltam relatórios reais, desempenho, comissão, faturamento, ticket médio, fluxo completo de no-show e análise de cancelamentos.

## Fase 3 — Perfil completo

**Parcial:** foto pública, endereço, rota do Maps e WhatsApp usam os dados cadastrados. Permanecem capa, Instagram, perfil profissional completo, serviços por profissional e campos estruturados de localização.

## Fase 4 — Planos, trial e pagamento

Trial e bloqueio visual são parciais. Faltam decisão de provedor, checkout, webhooks, cobrança, bloqueio real e portal.

## Fase 5 — Notificações e e-mail

**Parcial:** magic link foi validado no ambiente remoto atual. Faltam SMTP profissional, SPF, DKIM, DMARC, confirmações, lembretes e recuperação de falhas.

## Fase 6 — Deploy e produção

Hostinger, domínio, HTTPS, redirects definitivos de Auth, backups, monitoramento e homologação final.

## Backlog técnico

Lint global, links internos remanescentes, hooks, aviso de imagem, limpeza coordenada de Drizzle/D1, documentação de deploy, cobertura de testes e revisão periódica de vulnerabilidades npm.
