# Decisoes de produto e engenharia

| Data | Decisao | Estado |
| --- | --- | --- |
| 2026-08 | Usar Next.js 16 + React 19 como runtime web; remover referencias a Vinext/Vite/Drizzle/D1 do produto atual. | Implementada |
| 2026-08 | Usar Supabase como unico backend operacional, com RLS como controle de tenant. | Implementada |
| 2026-08 | Tratar `America/Sao_Paulo` como fuso operacional de agenda e relatorios. | Implementada |
| 2026-08 | Exigir autenticacao e confirmacao final para reserva publica; disponibilidade e revalidada antes da gravacao. | Implementada |
| 2026-08 | Separar comunicacao operacional de consentimento de marketing. | Implementada |
| 2026-08, consolidado em 05/09 | Marketing usa opt-in explícito separado da reserva, por barbearia e aplicativo. Ausência de decisão não autoriza marketing. | Implementado nos commits integrados; publicação remota não revalidada nesta consolidação |
| 2026-08 | Confirmacoes, cancelamentos e lembretes de agendamento nao sao bloqueados por preferencia de marketing. | Implementada |
| 2026-08 | Exibir menu conforme papel, mantendo autorizacao definitiva no banco. | Implementada |
| 2026-08 | Profissional pode possuir foto e dados publicos para a pagina de agendamento. | Implementada e confirmada em homologacao |
| 2026-08 | Publicar em Hostinger como Node.js/Next, usando bundle standalone. | Em homologacao |
| 2026-08 | Usar `NEXT_PUBLIC_*` para configuracao publica do frontend. | Implementada |
| 2026-08 | Deixar planos, assinatura e cobranca para a etapa final do desenvolvimento, depois da base operacional e visual. | Mantida; as regras comerciais foram definidas em 06/09/2026 |
| 2026-08 | Nao iniciar pagamentos, Pix, checkout, WhatsApp Business API e campanhas durante as etapas anteriores. | Mantida como ordem de execucao; assinatura e checkout pertencem a etapa final, enquanto Pix adicional ainda depende de decisao |
| 2026-08 | Proteger o worker de notificacoes contra replay com HMAC, timestamp e nonce de uso unico. | Implementada e validada |
| 2026-08 | Marca desenvolvedora exibida no produto: Cullentech. | Implementada |
| 2026-09-06 | Adotar planos Mensal (R$ 99,90), Trimestral (R$ 284,90), Semestral (R$ 539,90) e Anual (R$ 999,00), todos para ate cinco profissionais ativos; acima disso, somente sob consulta. | Aprovada; nao implementada |
| 2026-09-06 | Oferecer trial completo de 30 dias sem cartao, sem conversao automatica e sem gerar divida. | Aprovada; existe fundacao provisoria, mas o fluxo completo ainda nao foi implementado |
| 2026-09-06 | Usar Asaas como provedor financeiro inicial da assinatura do BarbeariaSP, com checkout hospedado e abstracao que permita migrar a operacao de conta PF para PJ. | Aprovada; conta, credenciais, Sandbox e webhooks ainda nao configurados |
| 2026-09-06 | Apos o termino efetivo, aplicar carencia operacional de tres dias para compromissos existentes, exportacao ate 15 dias, preservacao restrita ate 59 dias e expurgo/anonimizacao aos 60 dias, ressalvadas retencoes legais. | Aprovada; detalhes temporais e matriz exata de permissoes ainda precisam ser fechados antes da implementacao |
| 2026-09-06 | Manter BarbeariaSP como fonte da verdade de contrato, vigencia e acesso; fatos financeiros do Asaas sao conciliados localmente e nao consultados a cada login. | Aprovada; nao implementada |
| 2026-09-06 | Executar a configuracao e a implementacao de assinaturas e cobranca na etapa final do produto, sem classificar essa area como fora do escopo. | Aprovada; etapa final ainda nao iniciada |

## Registro de cautelas

- Um deploy com build concluido nao e evidencia suficiente de que o dominio esta entregando o codigo novo; validar conteudo, cache, runtime e logs.
- Relatorios datados em `docs/history/` permanecem como evidencia historica e nao devem ser tratados como situacao atual sem cruzamento com este documento e `CURRENT-STATUS.md`.
- A especificacao completa de planos, trial, cobranca, cancelamento, reembolso, carencia, exportacao, retencao e migracao Asaas PF para PJ esta em [ASSINATURAS-E-COBRANCA.md](ASSINATURAS-E-COBRANCA.md). As propostas tecnicas e pontos a definir desse documento nao devem ser confundidos com funcionalidade ja implementada.
