# Checklist de incidente e suporte — BarbeariaSP

## Antes de qualquer ação

1. Registre data, horário, URL, perfil afetado e mensagem exibida.
2. Não peça senha, token, magic link nem dados pessoais completos pelo chat.
3. Confirme se o problema ocorre apenas com uma pessoa ou para todos.
4. Verifique a página pública afetada e registre a resposta. Em 12/08/2026, `/api/health` está com HTTP 404 conhecido e não deve ser usado como confirmação de saúde até a próxima publicação que restaurar a rota.

## Login e sessão

- Confirme o domínio usado e se o usuário abriu o link de acesso mais recente.
- Teste em janela anônima sem apagar dados de produção.
- Verifique os registros de entrega do e-mail transacional antes de reenviar links.
- Se o problema ocorrer após troca de conta, faça sair da conta atual e entre novamente; registre perfis envolvidos.

## Agenda e agendamento

- Registre barbearia, profissional, data, horário e serviço, sem expor dados do cliente além do necessário.
- Confirme se o horário ainda está disponível antes de qualquer nova tentativa.
- Verifique se a conta é administrativa da própria barbearia; nesse caso o bloqueio é esperado.
- Não altere agendamentos diretamente no banco durante o atendimento de suporte.

## E-mail e notificações

- Consulte o monitor interno de entregas no painel de Notificações.
- Para e-mail, confirme status de entrega no serviço transacional antes de concluir que houve falha.
- Diferencie falha de entrega, caixa de spam e preferência de notificação desativada.

## Imagens

- Registre tamanho e tipo do arquivo, sem compartilhar imagem de cliente em local público.
- Confirme se a foto aparece na página pública em janela anônima.
- Não altere políticas de Storage como primeira resposta a uma falha.

## Hospedagem e indisponibilidade

- Registre a resposta da página pública afetada e o horário. Se consultar `/api/health`, anote o HTTP 404 conhecido sem tratá-lo como diagnóstico da página pública.
- Consulte o histórico de deploy da Hostinger antes de reimplantar.
- Se houve deploy recente, compare o commit publicado e os logs de build.
- Não faça rollback, remoção de arquivos ou mudanças de DNS sem aprovação explícita.

## Encerramento

- Registre causa, ação tomada, resultado e item do backlog relacionado.
- Se a causa for recorrente, abra item de correção com teste que impeça regressão.
