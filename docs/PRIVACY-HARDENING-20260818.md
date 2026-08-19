# Hardening de privacidade — 18/08/2026

## Implementado localmente

- Logs, respostas de erro e `notification_outbox.last_error` usam apenas códigos técnicos controlados.
- O frontend usa um único cliente Supabase e valida as duas variáveis públicas antes da inicialização.
- URLs públicas de imagens exigem a origem configurada, bucket e diretório autorizados, sem query, fragmento, traversal ou backslash.
- Perfis profissionais validam nome, telefone, Instagram HTTPS e foto no frontend e na RPC.
- Novas observações livres em `appointments.notes` são bloqueadas; registros legados permanecem preservados até decisão formal.

## Pendências registradas

- Portal de direitos do titular; exportação de dados; encerramento e anonimização; retenção e descarte.
- Matriz granular de acesso de managers; auditoria completa de `SECURITY DEFINER`; testes completos entre tenants e papéis; secret scanning.
- Escolha de um único processador de e-mail; controlador, operador e encarregado; bases legais; contratos; fornecedores; transferências internacionais.
- Aviso de Privacidade; Termos de Uso; decisão sobre observações legadas; revisão jurídica final.
