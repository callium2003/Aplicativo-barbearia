# Especificação funcional

**IMPLEMENTADO** significa que o código e a validação técnica existem. **PARCIAL** significa que há lacuna funcional, operacional, de publicação ou de homologação visual. **PLANEJADO** ainda não foi entregue.

## Site e autenticação

- **IMPLEMENTADO:** site institucional e teste grátis divulgado. A landing page comercial definitiva, demonstrações do produto, vídeo e preços permanecem para uma fase posterior.
- **IMPLEMENTADO:** login administrativo separado da Área do Cliente. Proprietário, gerente e barbeiro usam `/entrar`; cliente usa `/cliente/entrar`.
- **IMPLEMENTADO:** autenticação sem senha por Google ou magic link. A Área do Cliente cria ou reutiliza a conta Supabase e, no primeiro acesso, exige nome e celular/WhatsApp válidos antes de continuar.
- **IMPLEMENTADO:** reserva pública autenticada. Antes do login, o visitante escolhe horário, informa nome, telefone e consentimentos; depois escolhe Google ou magic link. A reserva é restaurada por até 30 minutos, revalida disponibilidade e exige confirmação final.
- **IMPLEMENTADO:** `/meus-agendamentos` envia usuários não autenticados para o login correto de cliente e não para o painel administrativo.
- **PARCIAL:** domínio, URLs de produção, SMTP profissional e monitoramento da entrega de e-mail.

## Barbearia, página pública e catálogo

- **IMPLEMENTADO:** criação com nome e slug público legível derivado do nome da barbearia, sem UUID/sufixo aleatório. `barbershops.slug` permanece único no banco; se o nome normalizado já estiver em uso, o cadastro não cria alternativa automática e solicita outro nome ao usuário.
- **IMPLEMENTADO:** página por slug, serviços, disponibilidade com inícios de 10 em 10 minutos e duração exata pela soma dos serviços, profissionais, horários, pausas e bloqueios.
- **IMPLEMENTADO:** foto pública da barbearia. Owner e manager podem selecionar JPG, PNG ou WebP de até 3 MB; há prévia, preservação de proporção e otimização antes do envio.
- **IMPLEMENTADO:** o painel mostra a página pública usando a origem atual e o slug real, permitindo abrir ou copiar o link sem expor UUID.
- **IMPLEMENTADO:** WhatsApp abre conversa manual e Maps abre rota pública a partir dos dados cadastrados. Não há envio automático nem chave paga de Maps.
- **IMPLEMENTADO tecnicamente em homologação:** percentual de comissão por profissional (`0%` a `100%`) configurado por owner e manager via RPCs seguras, com auditoria e `anon` bloqueado.
- **IMPLEMENTADO tecnicamente em homologação:** quando um atendimento muda para `completed`, a porcentagem vigente, valor bruto, serviços e profissional são congelados em `appointment_commissions`; mudanças futuras de percentual não alteram o histórico. Reabrir atendimento com comissão paga é bloqueado.
- **PLANEJADO:** capa, Instagram, perfil profissional mais completo, serviços por profissional e localização estruturada.

## Área do Cliente

- **IMPLEMENTADO:** experiência própria em `/cliente/entrar` com identidade visual distinta da gestão, login/criação de conta por Google ou e-mail e retorno seguro para a rota solicitada.
- **IMPLEMENTADO:** nome e celular/WhatsApp são obrigatórios no cadastro do cliente. O número é validado e persistido por `save_my_customer_profile`; o e-mail vem da conta autenticada.
- **IMPLEMENTADO:** WhatsApp operacional é separado de marketing: o número pode ser usado para assuntos do atendimento; campanhas dependem dos consentimentos específicos já existentes.
- **IMPLEMENTADO:** `/meus-agendamentos` possui próxima reserva em destaque, próximos horários, histórico, status, contato manual com a barbearia pelo WhatsApp, edição de nome/WhatsApp e logout.
- **IMPLEMENTADO em 08/08/2026:** ao reagendar, o sistema primeiro resolve a barbearia do agendamento; se ela não puder ser identificada, nenhuma alteração é feita. Quando identificada, a reserva atual é cancelada e o cliente é enviado para a mesma página pública com os serviços anteriores pré-selecionados. No cancelamento simples, após o sucesso o cliente também retorna para a página pública da mesma barbearia.
- **IMPLEMENTADO em 08/08/2026:** a relação `appointments → barbershops` é normalizada na Área do Cliente para aceitar o formato objeto ou lista retornado pelo cliente Supabase, mantendo nome, WhatsApp e link da barbearia disponíveis no próximo agendamento e no histórico.
- **IMPLEMENTADO:** cliente lê apenas os próprios agendamentos e o próprio perfil.

## Agenda, CRM e relatórios

- **IMPLEMENTADO:** Agenda administrativa com visual de produto, filtro por data/status, contadores do dia, contatos do cliente e ações de confirmar, concluir, cancelar e marcar `no_show`.
- **IMPLEMENTADO:** owner/manager e o barbeiro responsável podem abrir manualmente uma conversa de WhatsApp com o cliente diretamente do atendimento.
- **IMPLEMENTADO:** barbeiro vê somente os próprios atendimentos e administra apenas a própria disponibilidade: horários semanais, pausa recorrente e ausências/bloqueios pontuais.
- **IMPLEMENTADO no banco:** status `scheduled`, `confirmed`, `completed`, `cancelled` e `no_show`, snapshots financeiros e proteção GiST contra sobreposição.
- **IMPLEMENTADO:** cliente global, relação isolada por barbearia, histórico por tenant, lista de clientes e contato manual por WhatsApp.
- **IMPLEMENTADO:** opt-ins de marketing da barbearia e da plataforma são independentes, desmarcados por padrão, versionados e registrados como eventos.

### Relatórios gerenciais

- **IMPLEMENTADO tecnicamente em homologação:** `get_barbershop_management_report` restrito a owner/manager, com filtro por período e profissional e limite de 367 dias por consulta.
- **IMPLEMENTADO:** visão geral com agendamentos por status, faturamento de concluídos, ticket médio, comissões totais/pendentes/pagas, receita após comissão, clientes novos/recorrentes, taxa de reagendamento, taxa de cancelamento e taxa de no-show.
- **IMPLEMENTADO:** desempenho por profissional com total de agenda, concluídos, cancelamentos, no-show, faturamento, ticket médio, horas reservadas, horas disponíveis, taxa de ocupação e comissões.
- **IMPLEMENTADO:** ocupação calculada a partir dos horários efetivamente disponíveis, descontando pausas recorrentes e bloqueios pontuais; minutos agendados incluem horários que realmente ocuparam a cadeira, inclusive no-show.
- **IMPLEMENTADO:** desempenho por serviço com quantidade concluída, faturamento, preço médio, participação na receita e tempo executado.
- **IMPLEMENTADO:** clientes no período com classificação novo/recorrente, visitas, receita do período, receita histórica, primeira/última visita, próxima reserva e WhatsApp.
- **IMPLEMENTADO:** detalhamento de todos os agendamentos do período com contato, profissional, serviço, duração, valor, status e motivo de cancelamento.
- **IMPLEMENTADO:** comissões e repasses por atendimento, com mudança segura entre `pending` e `paid`, registro de pagamento e auditoria.
- **IMPLEMENTADO:** exportação CSV para resumo, agendamentos, profissionais, serviços, clientes e comissões.
- **NÃO IMPLEMENTADO POR FALTA DE EVENTOS-FONTE:** caixa/pagamentos por método, despesas, impostos, estoque/produtos, avaliações, vendas de produtos e ROI de campanhas. Esses relatórios só devem existir depois que o produto capturar esses eventos de forma confiável.

## Sistema visual

- **IMPLEMENTADO:** sistema visual compartilhado inspirado no modelo fornecido pela proprietária: fundo off-white, superfícies brancas, preto como ação principal, bronze como destaque, tipografia Geist, cards de 16 px, espaçamento amplo e foco mobile-first.
- **IMPLEMENTADO:** `PanelShell` unifica cabeçalho e navegação das áreas principais de gestão.
- **IMPLEMENTADO:** Home do painel, Agenda, Clientes, Profissionais/Disponibilidade, Relatórios, login administrativo, login do cliente e Área do Cliente usam o novo padrão diretamente.
- **IMPLEMENTADO:** telas legadas grandes, como Configurações e cadastro inicial, recebem camada de acabamento visual global sem reescrita de suas regras nesta etapa.
- **PARCIAL:** homologação visual final em dispositivos reais e ajustes finos de marca/ilustrações permanecem para revisão da proprietária.

## Navegação e segurança da gestão

- **IMPLEMENTADO:** entrada no painel para owner após cadastro inicial; manager e barber usam seus vínculos em `team_members`.
- **IMPLEMENTADO:** navegação compartilhada mostra somente áreas compatíveis com o papel; barbeiro recebe Início, Minha agenda e Disponibilidade, sem CRM/relatórios/configurações administrativas.
- **IMPLEMENTADO:** convites seguros de equipe com token SHA-256 de uso único, e-mail mascarado antes da autenticação e aceitação somente pelo usuário correto.
- **IMPLEMENTADO:** a gestão sempre usa a barbearia da sessão; links públicos não permitem escolher outro tenant.
