# Especificação funcional

**IMPLEMENTADO** significa que o código e a validação técnica existem. **PARCIAL** significa que há lacuna funcional, operacional, de publicação ou de homologação visual. **PLANEJADO** ainda não foi entregue.

## Site e autenticação

- **IMPLEMENTADO:** site institucional, planos informativos e teste grátis divulgado.
- **IMPLEMENTADO:** login administrativo por Google e magic link. E-mail usa `signInWithOtp`, mostra sucesso ou erro e retorna a `/painel`; Google usa `signInWithOAuth` com o mesmo destino.
- **IMPLEMENTADO:** reserva pública autenticada. Antes do login, o visitante escolhe horário, informa nome, telefone e consentimentos; depois escolhe Google ou magic link. A reserva é restaurada por até 30 minutos, revalida disponibilidade e exige confirmação final para criar o agendamento.
- **IMPLEMENTADO:** em telas administrativas, o logotipo e “Voltar ao painel” levam a `/painel`. “Sair” encerra somente a sessão local e encaminha a `/entrar`.
- **PARCIAL:** domínio, URLs de produção, SMTP profissional e monitoramento da entrega de e-mail.

## Barbearia, página pública e catálogo

- **IMPLEMENTADO:** criação com nome/slug, página por slug, serviços, disponibilidade com horários de início a cada 10 minutos e duração exata pela soma dos serviços selecionados, agendamento autenticado, profissionais, horários, pausas e bloqueios.
- **IMPLEMENTADO:** foto pública da barbearia. Owner e manager podem selecionar JPG, PNG ou WebP de até 3 MB em Android, iOS e Windows; há prévia, preservação de proporção e otimização antes do envio.
- **IMPLEMENTADO:** o dashboard mostra “Página pública da barbearia” com URL formada pela origem atual e pelo slug real. Owner, manager e barber podem abrir a visão pública em nova aba ou copiar o link. Sem slug, não é construída URL e há orientação para completar o cadastro.
- **IMPLEMENTADO:** WhatsApp abre conversa manual em `wa.me` e Maps abre rota pública a partir dos dados cadastrados. Não há envio automático, mapa incorporado, API paga ou chave de API.
- **IMPLEMENTADO tecnicamente em homologação:** percentual de comissão por profissional (`0%` a `100%`) configurado por owner e manager em `/painel/configurar` e persistido via RPCs seguras `get_professional_commission_rates` e `set_professional_commission_rate` com auditoria em `audit_logs` e privilégio `EXECUTE` revogado de `anon`. Barbeiros, clientes, anônimos e usuários sem vínculo são bloqueados.
- **IMPLEMENTADO tecnicamente em homologação:** quando um atendimento muda para `completed`, a porcentagem vigente do profissional, valor bruto, serviços e profissional são congelados em `appointment_commissions`; mudanças futuras de percentual não alteram comissões antigas. Reabrir um atendimento com comissão já marcada como paga é bloqueado.
- **PLANEJADO:** capa, Instagram, equipe completa por perfil, serviços por profissional e campos estruturados de localização.

## Agenda, CRM e relatórios

- **IMPLEMENTADO:** disponibilidade com inícios de 10 em 10 minutos, expediente, pausas, bloqueios e leitura/atualização básica da agenda.
- **IMPLEMENTADO no modelo versionado:** status `scheduled`, `confirmed`, `completed`, `cancelled` e `no_show`, validação de itens ativos e proteção GiST contra sobreposição no PostgreSQL (`appointments_no_overlapping_slots`).
- **IMPLEMENTADO:** cliente global autenticado, relação isolada por barbearia, histórico real por tenant e lista de clientes. O cliente vê apenas os próprios registros em `/meus-agendamentos`; owner e manager podem iniciar conversa manual de WhatsApp com o cliente.
- **IMPLEMENTADO:** opt-ins de marketing da barbearia e plataforma são independentes, desmarcados por padrão, versionados e registrados como eventos. Somente `completed` entra na receita do histórico.
- **IMPLEMENTADO tecnicamente em homologação:** relatório financeiro real por Hoje/Esta semana/Este mês via `get_barbershop_financial_report`, restrito a owner e manager. Exibe atendimentos concluídos, receita bruta, ticket médio, comissão total, comissão pendente, comissão paga, receita após comissões, cancelamentos, no-show e consolidação por profissional.
- **IMPLEMENTADO tecnicamente em homologação:** repasses de comissão por atendimento podem alternar entre `pending` e `paid` pela RPC `set_appointment_commission_payment_status`, com usuário/data do pagamento e auditoria. A tabela financeira não possui acesso direto para `anon` ou `authenticated`; o acesso da aplicação ocorre somente pelas RPCs autorizadas.
- **PARCIAL:** a operação de `no_show` e a visualização de pausas/bloqueios na Agenda ainda podem ser melhoradas. A nova tela financeira está versionada e validada tecnicamente, mas ainda não foi publicada nem homologada visualmente pela proprietária.
- **PLANEJADO:** filtros avançados, segmentos, campanhas, CSV, billing, checkout, webhooks, bloqueio real, portal e rota de política de privacidade.

## Navegação da gestão

- **IMPLEMENTADO:** entrada no painel de gestão (`/painel`) para o owner imediatamente após a conclusão do cadastro inicial (`initial_registration_completed`), sem forçar redirecionamento por ausência de profissionais ou serviços.
- **IMPLEMENTADO:** acesso à Agenda administrativa (`/painel/agenda`) resolvido por papéis de equipe (`owner`, `manager` e `barber`). O barbeiro vê apenas seus próprios atendimentos filtrados por `professional_id`.
- **IMPLEMENTADO:** as barras de Agenda, Clientes e Relatórios ficam centralizadas e quebram linhas de forma responsiva.
- **IMPLEMENTADO:** convites seguros de equipe (`team_invitations`). Owner pode convidar gerente (`manager`) ou barbeiro (`barber`); manager pode convidar barbeiro (`barber`). O sistema gera um link individual com token único de uso único (`/convite/equipe?token=...`). O convidado se autentica, confirma e o vínculo é criado em `team_members` após a aceitação. O proprietário/gerente pode revogar convites pendentes e copiar links para envio manual.
- **IMPLEMENTADO:** a gestão sempre usa a barbearia da sessão; links públicos não expõem UUIDs e não permitem escolher outro tenant.
