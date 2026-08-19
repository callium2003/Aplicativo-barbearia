# Hardening de privacidade — 18/08/2026

## Implementado localmente

- Logs, respostas de erro e `notification_outbox.last_error` usam apenas códigos técnicos controlados.
- O frontend usa um único cliente Supabase e valida as duas variáveis públicas antes da inicialização.
- URLs públicas de imagens exigem a origem configurada, bucket e diretório autorizados, sem query, fragmento, traversal ou backslash.
- Perfis profissionais validam nome, telefone, Instagram HTTPS e foto no frontend e na RPC.
- Novas observações livres em `appointments.notes` são bloqueadas; registros legados permanecem preservados até decisão formal.

## Próximo lote prioritário após a publicação

- Portal dos direitos do titular.
- Exportação de dados.
- Encerramento e anonimização.
- Reautenticação para operações sensíveis.
- Limpeza de PII relacionada.
- Protocolo das solicitações, com registro seguro do andamento e da resposta.

## Lotes posteriores registrados

- Retenção e descarte.
- Matriz granular de permissões.
- Revisão de `SECURITY DEFINER` e grants.
- Secret scanning.
- Escolha de um único processador de e-mail.
- Documentos legais.
- Definição de controlador, operador e canal de privacidade.
- Bases legais e contratos.
- Fornecedores, transferências internacionais, decisão sobre observações legadas e revisão jurídica final.

Este lote reduz exposição técnica, mas não declara a adequação à LGPD como concluída.
