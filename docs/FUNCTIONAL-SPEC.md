# Especificação funcional

**IMPLEMENTADO** significa que o código e a validação técnica existem. **HOMOLOGADO** significa que a proprietária executou o fluxo funcional no ambiente de homologação e confirmou o comportamento esperado. **PARCIAL** significa que ainda há lacuna operacional/publicação ou item específico não concluído. **PLANEJADO** ainda não foi entregue.

## Site e autenticação

- **IMPLEMENTADO:** site institucional e teste grátis divulgado. A landing page comercial definitiva, demonstrações do produto, vídeo e preços permanecem para uma fase posterior.
- **IMPLEMENTADO/HOMOLOGADO:** login administrativo separado da Área do Cliente. Proprietário, gerente e barbeiro usam `/entrar`; cliente usa `/cliente/entrar`.
- **IMPLEMENTADO/HOMOLOGADO:** autenticação sem senha por Google ou magic link. A Área do Cliente cria ou reutiliza a conta Supabase e, no primeiro acesso, exige nome e celular/WhatsApp válidos antes de continuar.
- **IMPLEMENTADO/HOMOLOGADO:** reserva pública autenticada. Antes do login, o visitante escolhe horário, informa nome, telefone e consentimentos; depois escolhe Google ou magic link. A reserva é restaurada por até 30 minutos, revalida disponibilidade e exige confirmação final.
- **IMPLEMENTADO:** `/meus-agendamentos` envia usuários não autenticados para o login correto de cliente e não para o painel administrativo.
- **PARCIAL:** domínio público/URLs de produção e customização de SMTP do Supabase Auth, caso seja adotada. O canal transacional de notificações do produto já está ativo via Resend e não depende do SMTP de magic link.

## Cadastro inicial, barbearia, página pública e catálogo

- **IMPLEMENTADO/HOMOLOGADO em 08/08/2026:** cadastro de nova barbearia em duas etapas com o sistema visual atual. O fluxo foi repetido depois da limpeza dos dados de teste e criou uma nova barbearia corretamente.
- **IMPLEMENTADO:** criação com nome e slug público legível derivado do nome da barbearia, sem UUID/sufixo aleatório. `barbershops.slug` permanece único no banco; se o nome normalizado já estiver em uso, o cadastro solicita outro nome.
- **IMPLEMENTADO/HOMOLOGADO:** página por slug, serviços, disponibilidade com inícios de 10 em 10 minutos e duração exata pela soma dos serviços, profissionais, horários, pausas e bloqueios.
- **IMPLEMENTADO/HOMOLOGADO:** foto pública da barbearia. Owner e manager podem selecionar JPG, PNG ou WebP de até 3 MB; há prévia, preservação de proporção e otimização antes do envio.
- **IMPLEMENTADO:** o painel mostra a página pública usando a origem atual e o slug real, permitindo abrir ou copiar o link sem expor UUID.
- **IMPLEMENTADO:** WhatsApp abre conversa manual e Maps abre rota pública a partir dos dados cadastrados. Não há envio automático nem chave paga de Maps.
- **IMPLEMENTADO/HOMOLOGADO:** percentual de comissão por profissional (`0%` a `100%`) configurado por owner e manager via RPCs protegidas, com auditoria e `anon` bloqueado.
- **IMPLEMENTADO/HOMOLOGADO:** quando um atendimento muda para `completed`, a porcentagem vigente, valor bruto, serviços e profissional são congelados em `appointment_commissions`; mudanças futuras de percentual não alteram o histórico. Reabrir atendimento com comissão paga é bloqueado.
- **PLANEJADO:** capa, Instagram, perfil profissional mais completo, serviços por profissional e localização estruturada.

## Configurações administrativas

- **IMPLEMENTADO/HOMOLOGADO em 08/08/2026:** página de Configurações usa o mesmo sistema visual das demais páginas do painel, sem os cards antigos coloridos.
- **IMPLEMENTADO/HOMOLOGADO:** ordem atual: dados operacionais e contatos → dados cadastrais → dias/horários → serviços e preços → profissionais → equipe/acessos → notificações.
- **IMPLEMENTADO:** o bloco operacional informa que contato, endereço, descrição e imagem alimentam a página pública.
- **IMPLEMENTADO:** dias/horários foram compactados no desktop para reduzir o espaço excessivo entre o dia da semana e os campos, mantendo comportamento responsivo no celular.
- **IMPLEMENTADO:** preferências de notificações ficam no final de Configurações; a Central de Notificações não contém mais a edição dessas preferências.

## Área do Cliente

- **IMPLEMENTADO/HOMOLOGADO:** experiência própria em `/cliente/entrar` com identidade visual distinta da gestão, login/criação de conta por Google ou e-mail e retorno seguro para a rota solicitada.
- **IMPLEMENTADO:** nome e celular/WhatsApp são obrigatórios no cadastro do cliente. O número é validado e persistido por `save_my_customer_profile`; o e-mail vem da conta autenticada.
- **IMPLEMENTADO:** WhatsApp operacional é separado de marketing: o número pode ser usado para assuntos do atendimento; campanhas dependem dos consentimentos específicos já existentes.
- **IMPLEMENTADO/HOMOLOGADO:** `/meus-agendamentos` possui próxima reserva em destaque, próximos horários, histórico, status, contato manual com a barbearia pelo WhatsApp, edição de nome/WhatsApp e logout.
- **IMPLEMENTADO/HOMOLOGADO:** ao reagendar, o sistema primeiro resolve a barbearia do agendamento; quando identificada, a reserva atual é cancelada e o cliente retorna à mesma página pública com os serviços anteriores pré-selecionados. No cancelamento simples, após o sucesso o cliente também retorna para a página pública da mesma barbearia.
- **IMPLEMENTADO:** cliente lê apenas os próprios agendamentos e o próprio perfil.

## Agenda, CRM e relatórios

- **IMPLEMENTADO/HOMOLOGADO:** Agenda administrativa com filtro por data/status, contadores do dia, contatos do cliente e ações de confirmar, concluir, cancelar e marcar `no_show`.
- **IMPLEMENTADO:** owner/manager e o barbeiro responsável podem abrir manualmente uma conversa de WhatsApp com o cliente diretamente do atendimento.
- **IMPLEMENTADO:** barbeiro vê somente os próprios atendimentos e administra apenas a própria disponibilidade: horários semanais, pausa recorrente e ausências/bloqueios pontuais.
- **IMPLEMENTADO no banco:** status `scheduled`, `confirmed`, `completed`, `cancelled` e `no_show`, snapshots financeiros e proteção GiST contra sobreposição.
- **IMPLEMENTADO/HOMOLOGADO:** cliente global, relação isolada por barbearia, histórico por tenant, lista de clientes e contato manual por WhatsApp.
- **IMPLEMENTADO:** opt-ins de marketing da barbearia e da plataforma são independentes, desmarcados por padrão, versionados e registrados como eventos.

### Relatórios gerenciais

- **IMPLEMENTADO/HOMOLOGADO:** `get_barbershop_management_report` restrito a owner/manager, com filtro por período e profissional e limite de 367 dias por consulta.
- **IMPLEMENTADO/HOMOLOGADO:** visão geral com agendamentos por status, faturamento de concluídos, ticket médio, comissões totais/pendentes/pagas, receita após comissão, clientes novos/recorrentes, taxa de reagendamento, taxa de cancelamento e taxa de no-show.
- **IMPLEMENTADO:** desempenho por profissional com total de agenda, concluídos, cancelamentos, no-show, faturamento, ticket médio, horas reservadas, horas disponíveis, taxa de ocupação e comissões.
- **IMPLEMENTADO:** ocupação calculada a partir dos horários efetivamente disponíveis, descontando pausas recorrentes e bloqueios pontuais; minutos agendados incluem horários que realmente ocuparam a cadeira, inclusive no-show.
- **IMPLEMENTADO:** desempenho por serviço com quantidade concluída, faturamento, preço médio, participação na receita e tempo executado.
- **IMPLEMENTADO:** clientes no período com classificação novo/recorrente, visitas, receita do período, receita histórica, primeira/última visita, próxima reserva e WhatsApp.
- **IMPLEMENTADO:** detalhamento de todos os agendamentos do período com contato, profissional, serviço, duração, valor, status e motivo de cancelamento.
- **IMPLEMENTADO:** comissões e repasses por atendimento, com mudança segura entre `pending` e `paid`, registro de pagamento e auditoria.
- **IMPLEMENTADO:** exportação CSV para resumo, agendamentos, profissionais, serviços, clientes e comissões.
- **NÃO IMPLEMENTADO POR FALTA DE EVENTOS-FONTE:** caixa/pagamentos por método, despesas, impostos, estoque/produtos, avaliações, vendas de produtos e ROI de campanhas. Esses relatórios só devem existir depois que o produto capturar esses eventos de forma confiável.

## Notificações

- **IMPLEMENTADO/HOMOLOGADO:** sino no painel com contador de não lidas e acesso à Central de Notificações.
- **IMPLEMENTADO/HOMOLOGADO:** Central com histórico, filtro `Todas`/`Não lidas`, marcação individual e em lote como lida e atualização em tempo real.
- **IMPLEMENTADO/HOMOLOGADO:** preferências por usuário, evento e canal (`Dentro do sistema` e `E-mail`) ficam em Configurações, no final da página.
- **IMPLEMENTADO:** eventos automáticos para novo agendamento, confirmação, cancelamento, reagendamento e lembrete de 24 horas.
- **IMPLEMENTADO:** fila `notification_outbox` com deduplicação, tentativas, backoff e estados `pending`, `processing`, `sent` e `failed`.
- **IMPLEMENTADO/ATIVO:** Edge Function Supabase `process-notifications` processa a fila e envia pelo Resend. O Cron `barbeariasp-process-notifications` chama a função a cada minuto.
- **IMPLEMENTADO/SEGURO:** chave dedicada do Resend e segredo do Cron ficam no Supabase Vault. A função de leitura dos segredos é restrita a `service_role`/`postgres`; nenhum valor é exposto ao navegador ou GitHub.
- **HOMOLOGADO EM ENTREGA REAL (08/08/2026):** 18 mensagens acumuladas foram processadas e o Resend confirmou as 18 como `delivered`. A proprietária confirmou recebimento dos e-mails.
- **PARCIAL DE REPRODUTIBILIDADE:** a Edge Function está ativa no Supabase remoto, mas seu código-fonte ainda precisa ser consolidado em `supabase/functions/` (ou equivalente) em um lote técnico próprio. O worker versionado `scripts/process-notifications.mjs` permanece como implementação equivalente/manual.
- **PLANEJADO:** push do navegador e WhatsApp Business API como canais adicionais.

## Sistema visual

- **IMPLEMENTADO/HOMOLOGADO:** sistema visual compartilhado: fundo off-white, superfícies brancas, preto como ação principal, bronze como destaque, tipografia Geist, cards de 16 px, espaçamento amplo e foco mobile-first.
- **IMPLEMENTADO:** `PanelShell` unifica cabeçalho e navegação das áreas principais de gestão.
- **IMPLEMENTADO/HOMOLOGADO:** Home do painel, Agenda, Clientes, Profissionais/Disponibilidade, Relatórios, Notificações, Configurações, cadastro inicial, login administrativo, login do cliente e Área do Cliente usam o padrão atual.
- **PARCIAL:** identidade de marca final, ilustrações definitivas e QA ampliado em dispositivos físicos continuam como refinamento futuro, não como bloqueio dos fluxos homologados.

## Navegação e segurança da gestão

- **IMPLEMENTADO:** entrada no painel para owner após cadastro inicial; manager e barber usam seus vínculos em `team_members`.
- **IMPLEMENTADO:** navegação compartilhada mostra somente áreas compatíveis com o papel; barbeiro recebe Início, Minha agenda e Disponibilidade, sem CRM/relatórios/configurações administrativas.
- **IMPLEMENTADO:** convites seguros de equipe com token SHA-256 de uso único, e-mail mascarado antes da autenticação e aceitação somente pelo usuário correto.
- **IMPLEMENTADO:** a gestão sempre usa a barbearia da sessão; links públicos não permitem escolher outro tenant.

## Homologação funcional de 08/08/2026

Depois de limpar os dados de teste do ambiente, a proprietária executou novamente um ciclo completo com dados novos: criou barbearia, criou cliente, realizou agendamento, cancelou, confirmou, cancelou pela barbearia em outro cenário, concluiu atendimento, conferiu os relatórios e validou Configurações. O último defeito funcional identificado foi o envio de e-mail; após a ativação do worker automático, os e-mails foram recebidos e confirmados como entregues.
