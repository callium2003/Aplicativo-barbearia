# Roadmap

## Fase 0 — Fundação

**Parcial:** baseline e migrations versionados e reconciliados com o histórico remoto; catálogo público restrito, reserva autenticada, convites de equipe (`team_invitations`) e retomada local homologados; typecheck, build e testes automatizados estão ativos. Permanecem homologação de produção, replay completo das migrations em banco descartável, monitoramento e revisão periódica de dependências.

## Fase 1 — Clientes, CRM e consentimentos

**Implementado:** cliente global, relação por barbearia, histórico seguro, consentimentos separados, lista real de clientes, reserva autenticada e abertura manual de WhatsApp. Permanecem filtros, segmentos, campanhas e CSV.

## Fase 2 — Atendimentos, relatórios e comissão

**Implementado tecnicamente em homologação:** percentual de comissão por profissional (`0%` a `100%`) configurável por owner e manager; cálculo automático e congelado quando o atendimento é concluído; controle de repasse `pending`/`paid`; auditoria de alterações; relatório financeiro real por período com receita bruta, ticket médio, comissões, receita após comissão, cancelamentos, no-show e consolidação por profissional.

A migration `20260807044250_add_appointment_commission_ledger_and_financial_reports.sql` está aplicada no Supabase remoto de homologação. O frontend real de relatórios está versionado, mas ainda não publicado nem homologado visualmente pela proprietária.

**Próximas evoluções desta fase:** filtros personalizados por datas, exportação CSV, análises detalhadas de cancelamento/no-show e fechamento/repasse em lote por profissional.

## Fase 3 — Perfil completo

**Parcial:** foto pública, endereço, rota do Maps e WhatsApp usam os dados cadastrados. Permanecem capa, Instagram, perfil profissional completo, serviços por profissional e campos estruturados de localização.

## Fase 4 — Planos, trial e pagamento

Trial e bloqueio visual são parciais. Faltam decisão de provedor, checkout, webhooks, cobrança, bloqueio real e portal.

## Fase 5 — Notificações e e-mail

**Parcial:** Google e magic link retomam a reserva no ambiente de homologação; o magic link local usa URLs autorizados para `127.0.0.1:3005` e `localhost:3005`. Faltam SMTP profissional, SPF, DKIM, DMARC, confirmações, lembretes e recuperação de falhas.

## Fase 6 — Deploy e produção

O domínio `barbeariasp.cullentech.com.br` foi apenas reservado. Faltam hospedagem/publicação, HTTPS, redirects definitivos de Auth, backups, monitoramento e homologação final.

## Backlog técnico

Replay integral das migrations em banco descartável, documentação de deploy, cobertura adicional de testes, revisão periódica das vulnerabilidades npm e dos quatro scripts de instalação ainda pendentes. Drizzle/D1 já foram removidos do projeto e não fazem mais parte do backlog.
