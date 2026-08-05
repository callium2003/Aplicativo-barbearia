# Especificação funcional

**IMPLEMENTADO** significa que o código e a validação local existem. **PARCIAL** significa que há lacuna funcional, operacional ou de homologação. **PLANEJADO** ainda não foi entregue.

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
- **PARCIAL:** percentual de comissão por profissional (`0%` a `100%`) configurado por owner e manager em `/painel/configurar` e persistido via RPCs `get_professional_commission_rates` e `set_professional_commission_rate` com auditoria em `audit_logs` (implementado no código local e validado tecnicamente pelo agente; aplicação das migrations no Supabase remoto de homologação e teste funcional visual da proprietária pendentes). Barbeiros, clientes, anônimos e usuários sem vínculo são bloqueados.
- **PLANEJADO:** capa, Instagram, equipe completa, cálculo automático de comissão por atendimento concluído, gestão de repasses pendentes/pagos, relatórios reais de comissão, serviços por profissional e campos estruturados de localização.

## Agenda, CRM e relatórios

- **IMPLEMENTADO:** disponibilidade com inícios de 10 em 10 minutos, expediente, pausas, bloqueios e leitura/atualização básica da agenda.
- **IMPLEMENTADO no modelo versionado:** status `scheduled`, `confirmed`, `completed`, `cancelled` e `no_show`, validação de itens ativos e proteção GiST contra sobreposição no PostgreSQL (`appointments_no_overlapping_slots`).

- **IMPLEMENTADO:** cliente global autenticado, relação isolada por barbearia, histórico real por tenant e lista de clientes. O cliente vê apenas os próprios registros em `/meus-agendamentos`; owner e manager podem iniciar conversa manual de WhatsApp com o cliente.
- **IMPLEMENTADO:** opt-ins de marketing da barbearia e plataforma são independentes, desmarcados por padrão, versionados e registrados como eventos. Somente `completed` entra na receita do histórico.
- **PARCIAL:** a operação de `no_show` e a visualização de pausas/bloqueios na Agenda são limitadas. Relatórios são demonstrativos e não devem ser usados como indicadores reais.
- **PLANEJADO:** filtros, segmentos, campanhas, CSV, relatórios reais, repasse de comissão por atendimento, billing, checkout, webhooks, bloqueio real, portal e rota de política de privacidade.


## Navegação da gestão

- **IMPLEMENTADO:** entrada no painel de gestão (`/painel`) para o owner imediatamente após a conclusão do cadastro inicial (`initial_registration_completed`), sem forçar redirecionamento por ausência de profissionais ou serviços.
- **IMPLEMENTADO:** acesso à Agenda administrativa (`/painel/agenda`) resolvido por papéis de equipe (`owner`, `manager` e `barber`). O barbeiro vê apenas seus próprios atendimentos filtrados por `professional_id`.
- **IMPLEMENTADO:** as barras de Agenda, Clientes e Relatórios ficam centralizadas e quebram linhas de forma responsiva.
- **IMPLEMENTADO:** convites seguros de equipe (`team_invitations`). Owner pode convidar gerente (`manager`) ou barbeiro (`barber`); manager pode convidar barbeiro (`barber`). O sistema gera um link individual com token único de uso único (`/convite/equipe?token=...`). O convidado se autentica, confirma e o vínculo é criado em `team_members` após a aceitação. O proprietário/gerente pode revogar convites pendentes e copiar links para envio manual.
- **IMPLEMENTADO:** a gestão sempre usa a barbearia da sessão; links públicos não expõem UUIDs e não permitem escolher outro tenant.
