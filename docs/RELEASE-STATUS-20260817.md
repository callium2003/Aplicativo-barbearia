# Atualizacao consolidada — 17/08/2026

Este documento é a referência de atualização posterior aos registros de 12/08/2026. Ele não altera relatórios em `docs/history/`, que permanecem como evidência histórica.

## Homologações confirmadas

- menus e redirecionamentos por perfil de cliente, dono/gestor e profissional;
- agendamento, confirmação, cancelamento e reagendamento;
- perfis de cliente e profissional, agenda e navegação mobile;
- sino de notificações, foto pública de profissional e recebimento de magic link;
- entrega de e-mails transacionais em caixa real.

## Segurança do worker de notificações

A migration `20260816071507_harden_notification_worker_request_auth.sql` e a Edge Function `process-notifications` protegem o Cron com HMAC-SHA-256, timestamp com validade de cinco minutos e nonce de uso único. A reivindicação do nonce ocorre antes da fila de e-mails, evitando replay. A versão remota ativa é a 4; a validação registrada confirmou HTTP 401 para chamada sem assinatura e HTTP 200 para execuções válidas do Cron.

## Pendências reais

1. Restaurar e validar `/api/health` na publicação Hostinger: em 17/08 a rota ainda retorna HTTP 404.
2. Confirmar o slug público ativo e os dados de catálogo antes de usar `/cullenbarber` como prova de publicação; a URL histórica não encontrou uma barbearia na checagem de 16/08.
3. Revisar a apresentação de tabelas, filtros e indicadores de Agenda, Clientes e Relatórios em telas pequenas.
4. Definir responsável, destino criptografado, retenção e teste de restauração do backup independente.
5. Definir dados jurídicos e comerciais reais antes de publicar termos, política de privacidade e contratos.

## Fora do escopo desta etapa

- planos, assinatura, checkout, cobrança, pagamentos e Pix;
- WhatsApp Business API, campanhas e automações de marketing.

## Repositório

O repositório passa a conter 31 migrations canônicas, a implementação do worker protegida contra replay, testes correspondentes e documentação sincronizada. Não há segredos, valores de Vault, credenciais de Resend ou `.env` nesta atualização.
