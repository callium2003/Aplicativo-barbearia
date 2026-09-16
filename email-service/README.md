# Serviço PHP legado de notificações por e-mail

> **Histórico — não é o runtime do produto.** Este diretório registra uma alternativa anterior baseada em `notify.php`, webhook e SMTP. Ela não integra o fluxo publicado e não deve receber configuração, segredo, webhook ou deploy novo.

O runtime atual é a Edge Function `supabase/functions/process-notifications`, acionada por Cron com autenticação HMAC e responsável por consumir `notification_outbox` e enviar pelo Resend. A fonte operacional é [docs/RESEND.md](../docs/RESEND.md); as regras de produto e o inventário de pendências estão na [EFS](../docs/FUNCTIONAL-SPEC.md), seções 23, 30, 45 e 48.

Não inclua valores de SMTP, chaves do Supabase, chaves do Resend ou arquivos de configuração privados neste diretório ou no Git.

> **Fixture de Testes Automatizados:** O arquivo `notify.php` é auditado ativamente por `tests/privacy-hardening.test.mjs` para validar que implementações legadas/históricas não vazem credenciais de provedor, mensagens de exceção ou dados de clientes. Por essa razão arquitetural, o arquivo é mantido como referência estática de conformidade.
