# Regras de negócio consolidadas — 12/08/2026

## Cliente

1. O cliente precisa estar autenticado para confirmar um agendamento.
2. Nome e celular/WhatsApp são obrigatórios para contato sobre o atendimento.
3. O e-mail da conta é exibido, mas não é editado no perfil do cliente.
4. Cliente autenticado tem nome, e-mail e telefone carregados no novo agendamento, podendo corrigir antes da confirmação.
5. O cliente pode cancelar e reagendar conforme as regras da agenda.

## Marketing e comunicação

1. Novidades da barbearia e novidades do aplicativo são escolhas independentes.
2. Plataforma e cada barbearia são escopos separados; uma escolha não se propaga entre eles.
3. Checkbox desmarcado não autoriza marketing; aceitar exige marcar texto positivo e claro.
4. “Continuar sem receber novidades” registra recusa explícita (`false`) apenas para os escopos apresentados.
5. Abandono sem resposta não cria evento, mas é tratado como marketing desautorizado (`false`) e pode ser perguntado novamente em uma futura relação, sem bloquear a reserva.
6. O cliente pode alterar ou revogar a escolha em “Meu perfil”; somente mudanças efetivas geram um novo evento append-only.
7. Confirmações, cancelamentos, reagendamentos e lembretes do atendimento não são marketing e continuam permitidos.

## Agenda e equipe

1. Dono, gestor e profissional não podem agendar na própria barbearia com conta administrativa.
2. Desativar acesso de um profissional não apaga histórico, pagamentos ou comissões.
3. Profissional desativado não deve aparecer para novos agendamentos.
4. A foto pública do profissional pode aparecer na escolha da agenda.

## Tenant e segurança

1. Cada dono, gestor, profissional e cliente só acessa dados permitidos pela relação com a barbearia.
2. CPF/CNPJ e dados administrativos não pertencem ao catálogo público.
3. RLS e validações no banco prevalecem sobre filtros de interface.

## Operação

1. A limpeza de homologação não pode remover contas ou configurações preservadas sem lista aprovada.
2. Publicação só é considerada concluída após build, resposta HTTP e conferência da versão servida.
