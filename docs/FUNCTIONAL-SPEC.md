# Especificacao funcional

Legenda: **IMPLEMENTADO** = existe no codigo; **HOMOLOGACAO PENDENTE** = requer teste real no dominio; **PLANEJADO** = nao iniciar sem decisao posterior.

## Cliente e pagina publica

- **IMPLEMENTADO:** pagina publica por slug, dados da barbearia, endereco, WhatsApp e como chegar.
- **IMPLEMENTADO:** escolha de servicos, profissional, data e horario disponivel.
- **IMPLEMENTADO:** autenticao por Google/magic link antes da criacao da reserva.
- **IMPLEMENTADO:** reserva pendente por ate 30 minutos, revalidacao de disponibilidade e confirmacao final.
- **IMPLEMENTADO:** tela de confirmacao com detalhes, novo agendamento e link para gerenciar reservas.
- **IMPLEMENTADO:** `/meus-agendamentos` com cancelar e remarcar; `/meu-perfil` com dados do cliente.
- **HOMOLOGACAO PENDENTE:** acabamento visual mobile dos cards, autocomplete e apresentacao dos consentimentos.

Consentimentos de marketing e novidades sao opcionais e independentes de comunicacoes operacionais; nao podem bloquear o agendamento.

## Gestao

- **IMPLEMENTADO:** cadastro inicial, dados da barbearia, servicos, horarios, equipe e convites.
- **IMPLEMENTADO:** agenda, confirmacao, conclusao, cancelamento, ausencia, pausas e bloqueios.
- **IMPLEMENTADO:** CRM, relatorios por periodo/profissional, CSV e ledger de comissoes.
- **IMPLEMENTADO:** Central de Notificacoes e preferencias por usuario/canal.
- **IMPLEMENTADO:** foto e dados publicos de profissional, incluindo Instagram; limite de upload e validacao no cliente.
- **PARCIAL:** nova navegacao e inicio da Gestao. Configuracoes, relatorios e manutencao preservam as funcoes atuais, mas ainda precisam de avaliacao visual individual.

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
