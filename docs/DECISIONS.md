# Decisões

| Data | Decisão | Motivo/consequência | Status |
|---|---|---|---|
| 2026-07-31 | Web responsivo, sem app instalado | Menos fricção. | Aprovada |
| 2026-07-31 | Link público por barbearia | Slug identifica a presença pública. | Parcial |
| 2026-07-31 | Supabase para banco e Auth iniciais | PostgreSQL, Auth e RLS. | Parcial |
| 2026-07-31 | Hostinger é hospedagem inicial pretendida | Modelo técnico será definido. | Pendente |
| 2026-07-31 | Produto será multi-tenant | Dados operacionais pertencem a uma barbearia. | Aprovada |
| 2026-07-31 | RLS será a principal proteção entre barbearias | UI não substitui RLS. | Remoto pendente |
| 2026-07-31 | Agendamentos ilimitados inicialmente | Sem limite por plano nesta fase. | Aprovada |
| 2026-07-31 | Assinatura mensal e 30 dias grátis | Trial parcial; cobrança depende de provedor. | Parcial |
| 2026-07-31 | Preço configurável | Não espalhar preço no código. | Aprovada |
| 2026-07-31 | Pagamento não escolhido | Stripe, Mercado Pago, Asaas em avaliação. | Pendente |
| 2026-07-31 | CRM terá cliente global e relação por barbearia | Implementado sem contadores mutáveis; a view calcula o histórico. | Parcial |
| 2026-07-31 | Consentimentos separados | Opt-ins da barbearia e da plataforma são eventos independentes. | Parcial |
| 2026-07-31 | Só `appointments.completed` entra em faturamento/comissão | Implementado no histórico; comissão permanece pendente. | Parcial |
| 2026-07-31 | Segurança, typecheck, testes e build bloqueiam entrega | Validação obrigatória. | Aprovada |
| 2026-07-31 | Lint global zero não bloqueia agora | Backlog progressivo. | Aprovada |
| 2026-07-31 | Corrigir lint dos arquivos tocados | Não ampliar backlog. | Aprovada |
| 2026-07-31 | Drizzle/D1 não será removido isoladamente | Worker/build exigem análise. | Aprovada |
| 2026-07-31 | Baseline Supabase e RLS A × B aguardam homologação | SQLs preservados; remoto não confirmado. | Pendente |
