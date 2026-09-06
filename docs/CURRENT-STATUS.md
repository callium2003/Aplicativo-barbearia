# Estado atual do projeto

Atualizado em **06/09/2026**. Este documento prevalece sobre relatorios historicos quando houver divergencia.

Documentos consolidados relacionados: [TECHNICAL-SPEC-20260812.md](TECHNICAL-SPEC-20260812.md), [BUSINESS-RULES-20260812.md](BUSINESS-RULES-20260812.md), [FLOWS-20260812.md](FLOWS-20260812.md) e [RELEASE-STATUS-20260817.md](RELEASE-STATUS-20260817.md). Os documentos datados de 12/08 sao registros historicos.

## Etapa final planejada — assinaturas e cobranca — 06/09/2026

As decisoes comerciais e as propostas tecnicas para assinatura da barbearia pelo uso do BarbeariaSP foram incorporadas em [ASSINATURAS-E-COBRANCA.md](ASSINATURAS-E-COBRANCA.md). Estao aprovados o catalogo de quatro planos, trial completo de 30 dias sem cartao, limite de cinco profissionais ativos, Asaas como provedor inicial, manutencao do acesso ate o fim do periodo regular e as fases de carencia, exportacao, preservacao e expurgo ate 60 dias.

O estado correto e **INTERFACE IMPLEMENTADA LOCALMENTE; INTEGRACAO FINANCEIRA NAO INICIADA**. A central mobile apresenta visao geral, catalogo, revisao da contratacao, cobrancas, cancelamento, exportacao e as fases de acesso. A fundacao provisoria existente ainda nao cobre contratos versionados, pedidos, periodos, conciliacao, webhooks idempotentes, reembolsos, matriz completa de acesso, exportacao da barbearia nem expurgo. Nenhuma conta, chave, checkout, webhook ou cobranca Asaas foi configurada; nenhuma migration ou ambiente remoto foi alterado.

Antes de codificar, ainda precisam ser fechados os pontos marcados como pendentes na especificacao, principalmente inicio e calendario do trial/vigencia, contratacao durante o trial, renovacao, unidade do reembolso proporcional, fronteiras temporais e permissoes exatas da carencia. A configuracao deve comecar no Sandbox e manter credenciais somente no servidor.

## Implementação local — landing comercial — 06/09/2026

A página inicial comercial `/` foi redesenhada a partir da proposta visual aprovada: fotografia de barbearia com a placa `BarbeariaSP`, conteúdo principal abaixo da marca, apresentação do produto com telas completas sem recorte, jornada, recursos, teste de 30 dias, períodos de plano sem preços inventados, segurança, FAQ e chamadas para `/entrar`. A leitura das variáveis públicas do Supabase também foi ajustada para acesso estático compatível com o bundle cliente do Next.js, e a rota `/entrar` voltou a carregar na verificação local. O lote consolidado passou em typecheck, lint, build e na suíte completa com 94 testes aprovados. Esta alteração ainda não foi publicada nem homologada no domínio. A rota dinâmica `/{slug}`, as telas internas e qualquer fluxo de cobrança permanecem fora deste lote. Detalhes: [MARKETING-LANDING-20260906.md](MARKETING-LANDING-20260906.md).

## Implementação local — gestão mobile — 06/09/2026

As telas internas receberam o padrão móvel aprovado sem alteração de schema ou das regras do Supabase. `/entrar` usa o cabeçalho fotográfico da landing; o `PanelShell` passou a expor Agenda, Gestão, Clientes, Equipe, Relatórios, Notificações e Configurações para dono/gestor; e `/painel/configurar` foi integrado ao mesmo shell com uma central de atalhos para dados e foto da barbearia, serviços, profissionais, horários, relatórios/comissões, equipe/convites, conta e consulta de planos. Permanecem preservados os sete dias da semana, agenda individual, pausas, ausências, comissão, convite por e-mail, cópia de link e compartilhamento pelo WhatsApp.

Os relatórios de visão geral, agendamentos, equipe, serviços, clientes e comissões continuam usando os RPCs e dados reais existentes. No celular, as tabelas de detalhe agora são exibidas como cartões rotulados, sem rolagem horizontal; filtros, exportação CSV, contato por WhatsApp e marcação de repasse pago/pendente foram mantidos. Build de produção, typecheck e testes direcionados passaram. A tela pública de acesso foi conferida no navegador interno; as rotas autenticadas ainda requerem homologação visual com uma sessão real após a publicação. O lote foi consolidado localmente com as correções de segurança; Hostinger permanece sem publicação nesta etapa. Plano técnico: [2026-09-06-management-mobile-redesign.md](superpowers/plans/2026-09-06-management-mobile-redesign.md).

## Consolidação e conferência remota — 06/09/2026

Prioridades 1 consolidadas e sincronizadas no GitHub: histórico integrado, arquivos de template preservados fora da aplicação e as duas migrations remotas de 28/08 incorporadas. Após as correções de segurança deste ciclo, a sequência local contém 54 migrations e todas correspondem ao catálogo remoto; a migration local `20260906005431_close_notification_nonce_expiry_window.sql` foi registrada remotamente como versão `20260906042028`. Evidências e limites: [CONSOLIDACAO-LOCAL-20260905.md](CONSOLIDACAO-LOCAL-20260905.md).

## Entregue no codigo

- Next.js 16/React 19 com Supabase.
- Pagina publica, catalogo, disponibilidade, reserva autenticada e confirmacao final.
- Google e magic link; cliente com perfil e gerenciamento de reservas.
- Painel para dono/gestor: agenda, equipe, clientes, relatorios, comissoes, notificacoes e configuracoes.
- Area do profissional: agenda, disponibilidade e perfil publico.
- Fuso operacional `America/Sao_Paulo`.
- Notificacoes internas e infraestrutura versionada de entrega de e-mail.
- Preferências de marketing do cliente, separadas entre barbearia e aplicativo, com tela em `/meu-perfil`.
- Regra técnica de opt-in: marketing não pertence à reserva; ausência de evento é `false`, e alterações são append-only por escopo.
- Consentimento e direitos do titular integrados do GitHub; a correspondência com migrations e funções remotas não foi verificada nesta consolidação local.
- Navegacao responsiva por papel e inicio visual renovado da Gestao.
- Hardening de privacidade local em revisão: logs e falhas sanitizados, cliente Supabase público centralizado, validação de imagem/perfil e bloqueio de novas observações livres. O estado remoto não foi revalidado nesta consolidação.
- Direitos do titular implementados e validados localmente: portal autenticado, protocolos, exportação JSON própria, reautenticação e anonimização de dados relacionados. Os commits já estão integrados em main; publicação e homologação remotas não foram revalidadas nesta consolidação.
- Homologacao funcional confirmada pelo responsavel: ajustes de menus por perfil, agendamento, perfil do cliente e profissional, agenda e navegacao mobile; sino de notificacoes visivel e funcional; foto de profissional e recebimento de magic link tambem confirmados.
- Worker de notificacoes protegido contra repeticao de chamadas: assinatura HMAC-SHA-256, timestamp valido por cinco minutos e nonce reivindicado atomicamente antes do acesso a fila.
- Worker e monitor usam a conexão Postgres gerenciada da Edge Function, com `prepare=false` e uma conexão por instância, evitando a credencial de Data API que o ambiente remoto estava recusando.
- O fechamento da janela de replay foi aplicado no Supabase em 06/09/2026: o limite exato de 300 segundos é recusado, um nonce novo é aceito uma vez e sua repetição é recusada. `anon` e `authenticated` continuam sem `EXECUTE`; `service_role` continua autorizado. O Cron respondeu HTTP 200 após a aplicação.

## Em homologacao

- Publicacao Next/Node na Hostinger concluida ate o build `019ff80d-3125-7125-bb35-cda7d5932e9f`; a pagina publica `/cullenbarber` foi confirmada externamente com HTTP 200. O pacote final contem apenas as duas variaveis publicas do Supabase necessarias no build, sem segredos administrativos.
- Disponibilidade: `/api/health` respondeu HTTP 200 com `status: ok` e `no-store` em 05/09/2026. A rota comprova resposta do Next, não a saúde do banco ou o funcionamento dos alertas.
- Supabase operacional em 06/09/2026: `monitor-platform-health` v18 retornou HTTP 200 e estado saudável; `process-notifications` v18 retornou HTTP 200, com fila vazia e sem erro de lembretes; `delete-my-customer-account` v6 está ativo.
- Verificacao de que o dominio entrega o commit e layout atuais, nao HTML/cache antigo.
- Revalidacao visual do catalogo publico com uma barbearia ativa: em 16/08, a URL historica `/cullenbarber` respondeu que a pagina nao foi encontrada. Confirmar o slug ativo e a origem dos dados antes de chamar a pagina publica de pronta.

## Ainda pendente

- Homologar a central de assinatura com uma sessão real de proprietário após a publicação. A prévia local foi conferida a 390 px e em desktop; ações financeiras permanecem desabilitadas.
- Fechar as decisoes comerciais e temporais abertas em [ASSINATURAS-E-COBRANCA.md](ASSINATURAS-E-COBRANCA.md) e produzir um plano de implementacao compativel com a fundacao provisoria existente, antes de criar migrations ou integrar o Asaas.
- Homologação visual autenticada, em celular real, da central de configurações, agenda individual e seis relatórios após o redesign local. A implementação responsiva e os testes automatizados estão concluídos; falta confirmar com dados reais antes da publicação.
- Limpeza do banco para novo ciclo de testes: aguardando publicacao e definicao final dos dados a preservar.
- Confirmar publicação e homologação do portal de direitos do titular já implementado; não reimplementar esse lote.
- Os dois achados médios do diff scan `e3d5d2ba-3828-429d-afbe-c04412d80eaa` foram corrigidos no Supabase: a exclusão de conta remove arquivos pela Storage API antes da anonimização, e worker/monitor validam o segredo da Edge Function antes de abrir conexão com o Postgres. As migrations remotas `20260906124420` e `20260906124513` registram a transição.
- Lotes posteriores: retenção e descarte; matriz granular de permissões; revisão de `SECURITY DEFINER` e grants; secret scanning; processador único de e-mail; documentos legais; definição de controlador, operador e canal de privacidade; bases legais e contratos. A decisão sobre observações legadas permanece aberta.
- A adequação à LGPD não está concluída: depende dos fluxos de direitos, das definições operacionais e da revisão jurídica final.

## Etapa final — interface pronta e integracao pendente

- checkout hospedado, cobranca e conciliacao pelo Asaas, conforme [ASSINATURAS-E-COBRANCA.md](ASSINATURAS-E-COBRANCA.md);
- operacoes efetivas de cancelamento e reembolso;
- autorizacao completa da carencia, exportacao, reativacao, retencao e expurgo.

## Pontos ainda nao definidos para a etapa final

- Pix ou outros meios adicionais ainda nao aprovados para a assinatura.

WhatsApp Business API e campanhas permanecem em backlog separado e nao alteram o planejamento da etapa final de assinaturas.

## Nao fazer sem autorizacao especifica

- alterar schema remoto ou RLS;
- executar migration, reset ou repair no Supabase;
- apagar dados, imagens ou configuracoes de hospedagem;
- publicar como producao;
- incluir credenciais no repositorio.
