# Especificação funcional

**IMPLEMENTADO** significa que o código e a validação local existem. **PARCIAL** significa que há lacuna funcional, operacional ou de homologação. **PLANEJADO** ainda não foi entregue.

## Site e autenticação

- **IMPLEMENTADO:** site institucional, planos informativos e teste grátis divulgado.
- **IMPLEMENTADO:** login administrativo por Google e magic link. E-mail usa `signInWithOtp`, mostra sucesso ou erro e retorna a `/painel`; Google usa `signInWithOAuth` com o mesmo destino.
- **IMPLEMENTADO:** reserva pública autenticada. Antes do login, o visitante escolhe horário, informa nome, telefone e consentimentos; depois escolhe Google ou magic link. A reserva é restaurada por até 30 minutos, revalida disponibilidade e exige confirmação final para criar o agendamento.
- **IMPLEMENTADO:** em telas administrativas, o logotipo e “Voltar ao painel” levam a `/painel`. “Sair” encerra somente a sessão local e encaminha a `/entrar`.
- **PARCIAL:** domínio, URLs de produção, SMTP profissional e monitoramento da entrega de e-mail.

## Barbearia, página pública e catálogo

- **IMPLEMENTADO:** criação com nome/slug, página por slug, serviços, disponibilidade, agendamento autenticado, profissionais, horários, pausas e bloqueios.
- **IMPLEMENTADO:** foto pública da barbearia. Owner e manager podem selecionar JPG, PNG ou WebP de até 3 MB em Android, iOS e Windows; há prévia, preservação de proporção e otimização antes do envio.
- **IMPLEMENTADO:** o dashboard mostra “Página pública da barbearia” com URL formada pela origem atual e pelo slug real. Owner, manager e barber podem abrir a visão pública em nova aba ou copiar o link. Sem slug, não é construída URL e há orientação para completar o cadastro.
- **IMPLEMENTADO:** WhatsApp abre conversa manual em `wa.me` e Maps abre rota pública a partir dos dados cadastrados. Não há envio automático, mapa incorporado, API paga ou chave de API.
- **PLANEJADO:** capa, Instagram, equipe completa, comissão, serviços por profissional e campos estruturados de localização.

## Agenda, CRM e relatórios

- **IMPLEMENTADO:** disponibilidade, expediente, pausas, bloqueios e leitura/atualização básica da agenda.
- **IMPLEMENTADO no modelo versionado:** status `scheduled`, `confirmed`, `completed`, `cancelled` e `no_show`, validação de itens ativos e proteção contra sobreposição.
- **IMPLEMENTADO:** cliente global autenticado, relação isolada por barbearia, histórico real por tenant e lista de clientes. O cliente vê apenas os próprios registros em `/meus-agendamentos`; owner e manager podem iniciar conversa manual de WhatsApp com o cliente.
- **IMPLEMENTADO:** opt-ins de marketing da barbearia e plataforma são independentes, desmarcados por padrão, versionados e registrados como eventos. Somente `completed` entra na receita do histórico.
- **PARCIAL:** a operação de `no_show` e a visualização de pausas/bloqueios na Agenda são limitadas. Relatórios são demonstrativos e não devem ser usados como indicadores reais.
- **PLANEJADO:** filtros, segmentos, campanhas, CSV, relatórios reais, comissão, billing, checkout, webhooks, bloqueio real, portal e rota de política de privacidade.

## Navegação da gestão

- **IMPLEMENTADO:** as barras de Agenda, Clientes e Relatórios ficam centralizadas e quebram linhas de forma responsiva.
- **IMPLEMENTADO:** a gestão sempre usa a barbearia da sessão; links públicos não expõem UUIDs e não permitem escolher outro tenant.
