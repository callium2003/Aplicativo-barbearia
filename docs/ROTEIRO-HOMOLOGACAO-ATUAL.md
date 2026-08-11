# Roteiro de homologação atual — BarbeariaSP

Use este roteiro na próxima validação no domínio publicado. Cada teste deve ser feito com contas separadas e, quando indicado, em celular e computador.

## Preparação

- Separe uma conta de cliente, uma de dono, uma de gestor e uma de profissional.
- Use duas barbearias de teste diferentes para os testes de isolamento.
- Registre apenas o resultado (passou/falhou), tela, perfil e horário. Não coloque senhas, tokens ou links de magic link neste arquivo.

## Cliente

1. Entre por Google e depois por magic link. Confirme que o magic link chega e abre a área do cliente.
2. Volte à página pública autenticado e toque em **Entrar**. Confirme que não pede login novamente.
3. Inicie um novo agendamento. Confirme que nome e celular vêm preenchidos e ainda podem ser alterados.
4. Confirme o agendamento, reagende e cancele um agendamento futuro. Verifique e-mail e área **Meus agendamentos**.
5. Em celular, confira foto, nome, botões, menu inferior, card de próximo agendamento e ausência de item **Gestão**.

## Dono e gestor

1. Abra Configurações em computador e celular. Edite um dado operacional e confirme a mensagem de sucesso.
2. Gere um convite individual e toque/copie o link no celular. Confirme o aviso de link copiado.
3. Confira que **Sair** aparece no cabeçalho sem cobrir sino ou navegação.
4. Tente agendar na própria barbearia com a conta administrativa. O sistema deve bloquear antes da confirmação.

## Profissional

1. Confirme que só aparecem menu e dados da própria agenda.
2. Ajuste disponibilidade, pausa semanal e ausência pontual. Verifique que não é possível editar dados de outro profissional.
3. Use filtros e período da agenda para localizar atendimentos passados e futuros.

## Isolamento entre barbearias

1. Com uma conta de cada papel, abra a barbearia A e tente acessar dados da B por URL, interface e agendamento.
2. Confirme que clientes, agenda, relatórios, equipe, fotos e notificações não atravessam de uma barbearia para a outra.

## Encerramento

Atualize o status e a evidência correspondente em `docs/BACKLOG-HOMOLOGATION-PRIORITIES.md`. Só marque um item como **Concluído** quando o resultado acima estiver comprovado no domínio publicado.
