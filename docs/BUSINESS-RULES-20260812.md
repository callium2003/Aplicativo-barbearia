# Regras de negócio consolidadas — 12/08/2026

## Cliente

1. O cliente precisa estar autenticado para confirmar um agendamento.
2. Nome e celular/WhatsApp são obrigatórios para contato sobre o atendimento.
3. O e-mail da conta é exibido, mas não é editado no perfil do cliente.
4. Cliente autenticado tem nome, e-mail e telefone carregados no novo agendamento, podendo corrigir antes da confirmação.
5. O cliente pode cancelar e reagendar conforme as regras da agenda.

## Marketing e comunicação

1. Novidades da barbearia e novidades do aplicativo são escolhas independentes.
2. A mensagem é de recusa explícita: “Não quero receber…”.
3. Checkbox desmarcado significa aceitar receber novidades.
4. Checkbox marcado significa não aceitar receber novidades.
5. O cliente pode alterar ou revogar a escolha em “Meu perfil”.
6. Confirmações, cancelamentos, reagendamentos e lembretes do atendimento não são marketing e continuam permitidos.

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
