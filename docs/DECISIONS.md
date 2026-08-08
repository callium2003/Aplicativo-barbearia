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
| 2026-08-03 | Reserva pública exige autenticação e confirmação final | Nome, telefone e consentimentos são coletados antes do login; callback não cria agendamento automaticamente. | Implementada/homologada |
| 2026-08-03 | Reserva pendente sobrevive à aba do magic link | A mesma reserva fica em storage de sessão e local por 30 minutos, com expiração, revalidação e limpeza. | Implementada |
| 2026-08-03 | Catálogo público é exposto por interface limitada | `anon` vê somente dados ativos necessários à página pública, sem `SELECT` amplo nem CRM. | Implementada/homologada |
| 2026-08-04 | Intervalos de início a cada 10 minutos na disponibilidade pública | Reduz tempo ocioso em serviços de durações variáveis; a duração é a soma dos serviços e a sobreposição é evitada pela RPC e pela constraint GiST. | Implementada/homologada |
| 2026-08-04 | Convites seguros de equipe com token SHA-256 de uso único | Owner convida gerentes e barbeiros; manager convida barbeiros vinculados a profissionais ativos. O banco armazena apenas hash SHA-256 do token e a aceitação cria vínculo após confirmação do usuário autenticado. | Implementada |
| 2026-08-04 | Percentual de comissão por profissional configurado via RPC segura | Owner e manager configuram comissão; acesso direto por papéis do navegador não é permitido. | Substituída por correção de segurança |
| 2026-08-04 | Endurecimento e isolamento da configuração de comissão | Comissão foi movida para tabela privada, com acesso via RPCs protegidas, validação de tenant, auditoria e bloqueio transacional. | Implementada e endurecida |
| 2026-08-06 | Aplicação das migrations de comissão no Supabase remoto de homologação | Etapas de comissão foram aplicadas e validadas com isolamento entre tenants. | Aplicada/homologada tecnicamente |
| 2026-08-06 | Revogação explícita de `EXECUTE` do papel `anon` nas RPCs de comissão | Elimina execução anônima direta das RPCs financeiras. | Aplicada/homologada tecnicamente |
| 2026-08-07 | Remover Drizzle/D1 após análise coordenada | D1 não tinha binding/uso funcional; Supabase/PostgreSQL tornou-se explicitamente o único banco funcional. | Implementada e validada |
| 2026-08-07 | Histórico executável de migrations deve espelhar as versões realmente registradas no Supabase | `supabase/migrations/` passou a conter as versões remotas canônicas; migrations locais substituídas foram movidas para histórico. | Implementada |
| 2026-08-08 | Slug público deve ser legível e derivado somente do nome da barbearia | Não acrescentar UUID/letras/números aleatórios; colisões pedem outro nome. | Implementada/homologada |
| 2026-08-08 | Cancelamento e reagendamento do cliente devem manter o contexto da barbearia | A barbearia é resolvida antes de cancelar; reagendamento/cancelamento retornam à página pública correta. | Implementada/homologada |
| 2026-08-08 | Configurações deve seguir a ordem operacional da barbearia | Dados operacionais/contatos primeiro, depois cadastrais, horários, serviços, profissionais, equipe e notificações por último. | Implementada/homologada |
| 2026-08-08 | Cadastro inicial e Configurações devem usar o mesmo design do restante do produto | Remove telas antigas/bege/coloridas e mantém consistência visual durante onboarding e administração. | Implementada/homologada |
| 2026-08-08 | Central de Notificações e preferências são responsabilidades diferentes | Central mostra histórico/não lidas; preferências por evento/canal ficam em Configurações. | Implementada/homologada |
| 2026-08-08 | Notificações de e-mail devem ser processadas no backend do Supabase, sem depender do computador local | A fila já existia e permanecia `pending`; Edge Function + Cron passou a consumir a fila automaticamente. | Implementada/homologada |
| 2026-08-08 | Worker de e-mail usa Supabase Edge Function + `pg_cron` + `pg_net` + Vault + Resend | Cron chama `process-notifications` a cada minuto; segredos ficam no Vault e a função valida segredo próprio antes das operações privilegiadas. | Implementada no remoto |
| 2026-08-08 | `pg_net` deve ficar no schema `extensions` | O Security Advisor apontou extensão instalada em `public`; a extensão foi reinstalada em `extensions` e o alerta novo desapareceu. | Implementada |
| 2026-08-08 | Manter e enviar os e-mails antigos acumulados da homologação | Não limpar a fila permitiu validar o processamento real acumulado; 18 mensagens foram processadas e confirmadas como `delivered` pelo Resend. | Homologada |
| 2026-08-08 | Reset dos dados de teste antes da rodada final de homologação | Tabelas públicas, Auth e Storage foram limpos preservando estrutura; depois foi criado um conjunto novo de dados para validar o fluxo do zero. | Concluída |
| 2026-08-08 | Considerar o ciclo funcional principal homologado após novo teste do zero | Nova barbearia, novo cliente, agendamento, cancelamento, confirmação, conclusão, relatórios, Configurações e e-mails foram testados/confirmados. | Homologada em ambiente de teste |
| 2026-08-08 | Diferenciar e-mail transacional do produto de SMTP do Supabase Auth | Resend entrega notificações operacionais; magic link continua sendo responsabilidade do Auth. Produção pode decidir SMTP customizado separadamente. | Aprovada |
| 2026-08-08 | Objetos operacionais criados diretamente no remoto devem ser documentados até serem versionados | Edge Function, Cron, Vault e helper de segredos estão ativos, mas precisam de consolidação futura em código/migration sem valores secretos. | Pendente de reprodutibilidade |
