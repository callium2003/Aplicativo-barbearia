# Decisoes de produto e engenharia

| Data | Decisao | Estado |
| --- | --- | --- |
| 2026-08 | Usar Next.js 16 + React 19 como runtime web; remover referencias a Vinext/Vite/Drizzle/D1 do produto atual. | Implementada |
| 2026-08 | Usar Supabase como unico backend operacional, com RLS como controle de tenant. | Implementada |
| 2026-08 | Tratar `America/Sao_Paulo` como fuso operacional de agenda e relatorios. | Implementada |
| 2026-08 | Exigir autenticacao e confirmacao final para reserva publica; disponibilidade e revalidada antes da gravacao. | Implementada |
| 2026-08 | Separar comunicacao operacional de consentimento de marketing. | Implementada |
| 2026-08 | Exibir menu conforme papel, mantendo autorizacao definitiva no banco. | Implementada |
| 2026-08 | Profissional pode possuir foto e dados publicos para a pagina de agendamento. | Implementada; homologacao de upload pendente |
| 2026-08 | Publicar em Hostinger como Node.js/Next, usando bundle standalone. | Em homologacao |
| 2026-08 | Usar `NEXT_PUBLIC_*` para configuracao publica do frontend. | Implementada |
| 2026-08 | Adiar planos, cobranca e Pix para decisao comercial posterior. | Aprovada |
| 2026-08 | Marca desenvolvedora exibida no produto: Cullentech. | Implementada |

## Registro de cautelas

- Um deploy com build concluido nao e evidencia suficiente de que o dominio esta entregando o codigo novo; validar conteudo, cache, runtime e logs.
- Relatorios datados em `docs/history/` permanecem como evidencia historica e nao devem ser tratados como situacao atual sem cruzamento com este documento e `CURRENT-STATUS.md`.
