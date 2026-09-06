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

## Etapa final planejada — assinaturas e cobranca

1. Fechar os pontos comerciais e temporais ainda abertos em [ASSINATURAS-E-COBRANCA.md](ASSINATURAS-E-COBRANCA.md), sem transformar propostas em regra silenciosamente.
2. Mapear a fundacao provisoria existente para o modelo de planos, contratos, pedidos, periodos, pagamentos, eventos, cancelamentos e retencoes.
3. Configurar uma conta Asaas Sandbox e as credenciais exclusivamente no servidor; nenhuma chave deve entrar no frontend ou no Git.
4. Implementar e testar verticalmente trial, limite de profissionais e matriz de acesso antes de liberar cobranca real.
5. Integrar checkout hospedado, webhooks idempotentes e conciliacao no Sandbox; retorno do navegador nao comprova pagamento.
6. Implementar cancelamento, reembolso, exportacao, reativacao e expurgo com auditoria e isolamento entre barbearias.
7. Homologar todos os criterios de aceite e somente depois planejar producao e migracao futura da operacao Asaas PF para PJ.

## Pontos nao definidos para a etapa final

- Pix ou outros meios de pagamento adicionais ainda nao aprovados para a assinatura.

Recebimentos dos servicos prestados aos clientes da barbearia, split, repasses pelo gateway, campanhas de marketing, WhatsApp Business API e notificacoes push permanecem em backlogs separados.

Assinaturas nao devem ser iniciadas como ajuste lateral de agenda ou layout: devem seguir a especificacao, o tratamento fiscal e juridico aplicavel e uma implementacao segura e auditavel.
