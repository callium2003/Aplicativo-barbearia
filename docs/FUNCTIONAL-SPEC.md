# Especificacao funcional

Legenda: **IMPLEMENTADO** = existe no codigo; **HOMOLOGADO** = validado em uso no dominio; **PARCIAL** = existe, mas ainda tem revisao limitada; **FORA DO ESCOPO ATUAL** = nao iniciar nesta etapa.

## Cliente e pagina publica

- **IMPLEMENTADO:** pagina publica por slug, dados da barbearia, endereco, WhatsApp e como chegar.
- **IMPLEMENTADO:** escolha de servicos, profissional, data e horario disponivel.
- **HOMOLOGADO:** autenticacao por Google/magic link antes da criacao da reserva.
- **HOMOLOGADO:** reserva pendente por ate 30 minutos, revalidacao de disponibilidade, confirmacao, cancelamento e reagendamento.
- **IMPLEMENTADO:** tela de confirmacao com detalhes, novo agendamento e link para gerenciar reservas.
- **REQUISITO DE CONFIRMAÇÃO:** O sistema deve enviar uma confirmação simples do agendamento para o cliente, para que ele se sinta seguro de que deu certo.
- **IMPLEMENTADO:** `/meus-agendamentos` com cancelar e remarcar; `/meu-perfil` com dados do cliente.
- **IMPLEMENTADO:** `/meu-perfil` permite consultar e alterar preferências de novidades da barbearia e do aplicativo.
- **IMPLEMENTADO:** `/meu-perfil` lista "Minhas barbearias" somente a partir dos vínculos do próprio cliente; cada link abre o perfil público correspondente sem misturar agendas.
- **IMPLEMENTADO:** consentimentos de marketing são opcionais, independentes do agendamento e de opt-in positivo; ausência de escolha não autoriza marketing.
- **HOMOLOGADO:** perfis, agenda, menus por papel, navegacao mobile, foto de profissional e recebimento de magic link.
- **PARCIAL:** tabelas e indicadores extensos de Agenda, Clientes e Relatorios precisam de revisao especifica para telas pequenas.

Consentimentos de marketing são opcionais e independentes de comunicações operacionais; não bloqueiam o agendamento. Após a primeira reserva bem-sucedida, a plataforma e a barbearia atual são perguntadas apenas se ainda não houver decisão para cada escopo. Ações explícitas gravam a escolha; abandono não cria evento e continua sendo tratado como `false`.

## Gestao

- **IMPLEMENTADO:** cadastro inicial, dados da barbearia, servicos, horarios, equipe e convites.
- **IMPLEMENTADO:** agenda, confirmacao, conclusao, cancelamento, ausencia, pausas e bloqueios.
- **IMPLEMENTADO:** CRM, relatorios por periodo/profissional, CSV e ledger de comissoes.
- **IMPLEMENTADO:** Central de Notificacoes e preferencias por usuario/canal.
- **IMPLEMENTADO:** foto e dados publicos de profissional, incluindo Instagram; limite de upload e validacao no cliente.
- **PARCIAL:** Configuracoes, Relatorios e Manutencao preservam as funcoes atuais; a pendencia visual concentrada sao tabelas, filtros e indicadores extensos em telas pequenas.

## Regras de acesso

- Cliente nao acessa gestao.
- Dono e gestor administram somente sua barbearia.
- Profissional ve a propria agenda e disponibilidade, nao a operacao completa de outros profissionais.
- O papel e sempre confirmado no banco; a exibicao do menu nao e controle de seguranca.

## Fora de escopo atual

- landing page final;
- planos comerciais e assinatura;
- cobranca, checkout, Pix e portal financeiro;
- WhatsApp Business API e campanhas avancadas.
