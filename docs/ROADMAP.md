# Roadmap

## Próxima frente aprovada — arquitetura e redesign da gestão

Esta frente está **documentada e não implementada**. Ordem recomendada:

1. Inventariar o schema, policies, RPCs, triggers, memberships, convites, horários e contratos atuais; definir backfill e casos de múltiplas barbearias sem alterar o ambiente.
2. Revisar e planejar a integração da branch `security/p0-remediations-20260907-workspace`, preservando AUTH-01, a remoção do `UPDATE` amplo de AUTHZ-01 e a quota de quatro reservas de ABUSE-01.
3. Apresentar para aprovação o pacote técnico de dados e segurança: modo herdado/personalizado, separação contato/acesso, operações atômicas de inativação/reativação, alertas de atendimentos futuros e matriz owner/manager/barber. Incluir o ajuste da RPC de status para impedir cancelamento por barber.
4. Integrar/ajustar a frente P0 e implementar migrations/RPCs/RLS/triggers aprovados de forma coordenada, com isolamento entre tenants, rollback, dados existentes preservados e sem aplicar nada remotamente antes de autorização específica.
5. Implementar o novo shell com Início, Agenda, Clientes, Equipe e Mais, reutilizando Clientes como referência visual prioritária.
6. Construir Equipe e a ficha única por fatias: cadastro/dados → agenda/pausas/ausências → comissão → acesso/convite → inativação/reativação.
7. Separar Serviços e Horários da barbearia em módulos próprios de Mais, preservando T30/T31 e sem relação profissional ↔ serviço nesta etapa.
8. Integrar Relatórios T23–T29 ao novo shell e redesign, preservando métricas, cálculos, filtros, exportações, RPCs e operações já aprovados.
9. Homologar por papel e dispositivo: owner, manager e barber; 320/360/390 px, tablet e desktop; agenda herdada/personalizada; atendimentos futuros; múltiplos vínculos; estados de acesso; Relatórios. Reexecutar os testes AUTH-01, AUTHZ-01 e ABUSE-01, incluindo a proibição de cancelamento pelo barber.
10. Atualizar novamente documentação e estado do projeto somente com evidências da implementação e homologação realizadas.

Melhorias funcionais ou analíticas dos Relatórios ficam em uma fase posterior e separada. O item 8 acima é obrigatório nesta frente porque trata da aplicação do novo redesign, não de mudança de regra dos relatórios.

## Fase atual — acabamento tecnico e visual

1. Validar alertas e cobertura operacional; `/api/health` já respondeu HTTP 200 na checagem de 05/09/2026.
2. Confirmar o slug publico ativo e a origem dos dados antes de usar a URL historica `/cullenbarber` como evidencia de publicacao.
3. Homologar as telas atuais de Agenda, Clientes e Relatórios em telas pequenas sem confundir essa validação com a próxima arquitetura aprovada.
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
