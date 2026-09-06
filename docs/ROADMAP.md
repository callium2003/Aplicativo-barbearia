# Roadmap

## Fase atual — acabamento tecnico e visual

1. Validar alertas e cobertura operacional; `/api/health` já respondeu HTTP 200 na checagem de 05/09/2026.
2. Confirmar o slug publico ativo e a origem dos dados antes de usar a URL historica `/cullenbarber` como evidencia de publicacao.
3. Revisar tabelas, filtros e indicadores de Agenda, Clientes e Relatorios em telas pequenas.
4. Definir destino criptografado, responsavel e teste de restauracao para o backup independente.

## Antes de producao

- definir destino, responsável e teste real de restauração do backup; configurar monitoramento externo e alertas;
- confirmar DNS, redirects do Supabase Auth, SMTP/Resend e recebimento de e-mail;
- preencher e aprovar aviso de privacidade, termos de uso e contratos a partir de `PRONTIDAO-LGPD-E-DOCUMENTOS-LEGAIS.md`.
- revisar seguranca/RLS e teste de isolamento multi-tenant;
- desligar cacheless e validar desempenho;
- concluir landing page e textos institucionais.

## Fora do escopo atual

- definir planos, periodo de teste e regras de assinatura;
- implementar faturamento/checkout com provedor escolhido;
- avaliar Pix para a barbearia e pagamentos de assinatura separadamente;
- campanhas de marketing, WhatsApp Business API e notificacoes push.

Pagamentos nao devem ser iniciados como ajuste lateral de agenda ou layout: dependem de regra comercial, provedor, tratamento fiscal e seguranca proprios.
