# Decisões

| Data | Decisão | Motivo/consequência | Status |
|---|---|---|---|
| 2026-07-31 | Web responsivo, sem app instalado | Menos fricção para a barbearia. | Aprovada |
| 2026-07-31 | Produto multi-tenant | Dados operacionais pertencem a uma barbearia. | Aprovada |
| 2026-07-31 | RLS é a proteção principal | A UI não substitui políticas do banco. | Aprovada |
| 2026-07-31 | Agendamentos inicialmente ilimitados | Sem limite por plano nesta fase. | Aprovada |
| 2026-07-31 | Pagamento não escolhido | Provedor e checkout continuam pendentes. | Pendente |
| 2026-07-31 | Drizzle/D1 não será removido isoladamente | Worker/build exigem análise coordenada. | Aprovada |
| 2026-08-01 | Baseline Supabase preserva schema remoto | Migrations anteriores são evidência, não sequência executável. | Implementada |
| 2026-08-02 | CRM usa cliente global e relação por barbearia | Histórico é calculado sem contadores mutáveis. | Implementada |
| 2026-08-02 | Consentimentos são separados | Opt-ins da barbearia e plataforma são eventos independentes. | Implementada |
| 2026-08-02 | Login administrativo retorna ao painel | Callback administrativo usa a origem do ambiente e `/painel`; o navegador usa apenas chave publicável. | Implementada/homologada |
| 2026-08-02 | WhatsApp e Maps usam dados cadastrados | WhatsApp abre `wa.me`; Maps abre rota pública sem chave de API. | Implementada |
| 2026-08-03 | Foto da barbearia em Storage público restrito | Visitantes veem URL pública; owner/manager mantêm apenas o próprio prefixo. | Implementada |
| 2026-08-03 | Dashboard mostra o link público | URL usa domínio atual e slug do tenant; pode ser aberta ou copiada sem UUID. | Implementada |
| 2026-08-03 | Navegação preserva o dashboard | Logotipo e retorno apontam a `/painel`; barras internas ficam centralizadas. | Implementada |
| 2026-08-03 | Reserva pública exige autenticação e confirmação final | Nome, telefone e consentimentos são coletados antes do login; callback não cria agendamento automaticamente. | Implementada/homologada localmente |
| 2026-08-03 | Reserva pendente sobrevive à aba do magic link | A mesma reserva fica em storage de sessão e local por 30 minutos, com expiração, revalidação e limpeza. | Implementada |
| 2026-08-03 | Catálogo público é exposto por interface limitada | `anon` vê somente dados ativos necessários à página pública, sem `SELECT` amplo nem CRM. | Implementada/homologada |
| 2026-08-04 | Intervalos de início a cada 10 minutos na disponibilidade pública | Reduz tempo ocioso em serviços de durações variáveis (ex: 20, 30, 50, 70 min); a duração é a soma dos serviços e a sobreposição é evitada pela RPC e pela constraint GiST. | Implementada/homologada remota (20260804013607) |
| 2026-08-04 | Convites seguros de equipe com token SHA-256 de uso único | Owner convida gerentes e barbeiros; manager convida barbeiros vinculados a profissionais ativos. O banco armazena apenas hash SHA-256 do token e a aceitação cria o vínculo em `team_members` somente após confirmação do usuário autenticado. | Implementada |
| 2026-08-04 | Percentual de comissão por profissional (0% a 100%) configurado via RPC segura | Owner e manager configuram o percentual de comissão de cada profissional via RPC `set_professional_commission_rate` com `SECURITY DEFINER` e log de auditoria em `audit_logs`. Barbeiros, clientes e outros tenants não alteram a comissão. A aplicação remota e o cálculo automático por atendimento continuam pendentes. | Substituída por correção de segurança |
| 2026-08-04 | Isolamento de comissão em tabela financeira privada e remoção de coluna pública | A coluna `commission_rate_percent` foi removida de `public.professionals` e isolada na tabela privada `public.professional_commission_settings`. Leitura e escrita são exclusivas via RPCs seguras (`get_professional_commission_rates`, `set_professional_commission_rate`). A policy genérica de UPDATE para gerentes em `professionals` foi revogada. Validação decimal aceita até 2 casas decimais e rejeita frações ocultas. Bloqueio transacional `FOR UPDATE` impede race condition. Validado via contêiner PostgreSQL 15 isolado. Aplicação remota, cálculo por atendimento e homologação da proprietária continuam pendentes. Incompatibilidade CRM preservada como pendência. | Implementada |

