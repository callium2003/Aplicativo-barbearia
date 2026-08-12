# Roteiro de homologação atual — BarbeariaSP

Use este roteiro no domínio publicado, de preferência em um computador e em um celular. Cada linha é uma evidência independente para o backlog: marque **Concluído** somente após o resultado esperado ocorrer sem erro.

## Preparação segura

1. Separe quatro contas de teste diferentes: **cliente**, **dono**, **gestor** e **profissional**. A conta de cliente não pode ser a mesma de um membro da equipe.
2. Tenha duas barbearias de teste, A e B, para as etapas de isolamento. Não use dados pessoais ou agenda real de clientes para este roteiro.
3. Anote somente: data, dispositivo, perfil usado, ID do teste, passou/falhou e uma captura da tela quando a evidência for visual. Nunca copie senha, código de login, token, e-mail completo ou link de magic link para o backlog.
4. Ao terminar uma conta, use **Sair** antes de começar a próxima. Para o teste de abas, siga a exceção indicada na própria etapa.

## Cliente: login, sessão e agendamento

| IDs do backlog | Conta e dispositivo | Ação | Resultado esperado | Evidência a registrar |
| --- | --- | --- | --- | --- |
| QA-02, QA-08 | Cliente, celular | Solicite magic link, abra a mensagem recebida e conclua o acesso. | O link leva à área do cliente, sem loop e sem pedir novo login. | Captura da área do cliente e confirmação de recebimento, sem expor o link. |
| UX-04 | Cliente já autenticado, celular | Abra a página pública da barbearia e toque em **Entrar**. | A sessão é respeitada e a pessoa vai para a área adequada, sem repetir autenticação. | Captura antes/depois ou anotação do destino. |
| UX-02, UX-03, UX-15 | Cliente, computador e celular | Confira menus e tente abrir `/painel` diretamente. | Não aparece **Gestão** para cliente; acesso a `/painel` retorna a **Meus agendamentos**, sem tela administrativa pedindo login. | Captura do menu e da rota final. |
| UX-05, UX-27, QA-03 | Cliente, celular | Na página pública, inicie um agendamento futuro. | Nome e celular já aparecem preenchidos, podem ser corrigidos e não criam duplicidade. | Captura do formulário antes da confirmação. |
| QA-03 | Cliente, celular | Confirme o agendamento; depois reagende e cancele o mesmo horário. | Cada ação atualiza **Meus agendamentos**; confirmação, reagendamento e cancelamento mostram mensagem clara. | Captura da confirmação e do histórico/agenda. |
| UX-06, UX-07, UX-08, UX-09 | Cliente, celular | Abra **Meus agendamentos** e **Meu perfil**; altere nome/celular e salve. | Card de próximo atendimento é compacto; existe apenas a tela oficial de perfil; e-mail não é editável; há sucesso e botão de voltar. | Captura do card e da mensagem de sucesso. |
| UX-19 | Cliente, celular | Confira o campo de promoções sem marcar e faça um agendamento. | Texto começa por “Não quero receber…”; opção é opcional e desmarcada; o agendamento continua possível. | Captura do consentimento. |
| QA-07 | Cliente e dono, mesmo navegador | Em uma aba entre como cliente. Em outra, saia e entre como dono; volte para ambas as abas. | Cada aba pede atualização coerente de sessão e nunca mostra dados administrativos ao cliente. | Anotação do comportamento de cada aba. |

## Página pública e visual responsivo

| IDs do backlog | Dispositivo | Ação | Resultado esperado | Evidência a registrar |
| --- | --- | --- | --- | --- |
| UX-10, UX-11, UX-12, UX-13 | Celular | Abra a página pública sem login. | Foto vem antes do texto; nome e ações ficam compactos; existe um WhatsApp verde; não existe cartão repetido **Fale conosco**. | Captura da primeira dobra e das ações rápidas. |
| UX-14, UX-21 | Celular e computador | Compare navegação pública e do painel. | Menu inferior só no celular, com toque confortável; desktop usa navegação própria e legível. | Uma captura por dispositivo. |
| UX-28 | Celular e computador | Abra uma barbearia com nome comprido, WhatsApp e endereço completos. | Nome não corta palavras e botões **WhatsApp** e **Como chegar** permanecem visíveis e acionáveis. | Captura das larguras menor e maior. |
| PR-01, PR-02, PR-09 | Celular em rede móvel e computador | Visite Agenda, Clientes, Relatórios, Configurações, Equipe e Manutenção usando as contas permitidas. | Sem rolagem horizontal involuntária, sobreposição, botão cortado, filtro ilegível ou travamento perceptível. | Captura de cada tela e horário do teste; registrar rede usada para desempenho. |

## Dono e gestor

| IDs do backlog | Conta e dispositivo | Ação | Resultado esperado | Evidência a registrar |
| --- | --- | --- | --- | --- |
| UX-16 | Dono e gestor, celular e computador | Passe por todas as telas do painel. | **Abrir painel de gestão** não aparece; **Sair** não cobre sino, título ou menu. | Captura do cabeçalho em uma tela de cada formato. |
| UX-17, UX-18, UX-24, UX-25 | Dono ou gestor, celular | Abra Configurações, expanda seções, edite um dado operacional e salve. | Formulários não expandem a largura; identifica profissional em edição; pausas informam dia/horário; surge mensagem de sucesso ou erro. | Captura antes/depois do salvamento. |
| UX-20 | Dono ou gestor, celular | Gere convite individual e toque no próprio link e no botão de copiar. | Em sucesso aparece **Link copiado com sucesso**; em falha há orientação para copiar manualmente. | Captura do feedback. |
| UX-01 | Dono ou gestor, celular | Tente agendar na própria barbearia com a conta administrativa. | O fluxo bloqueia antes da confirmação e explica que a conta administrativa não pode se autoagendar. | Captura do bloqueio. |

## Profissional

| IDs do backlog | Conta e dispositivo | Ação | Resultado esperado | Evidência a registrar |
| --- | --- | --- | --- | --- |
| UX-15, UX-23, UX-26 | Profissional, celular e computador | Abra painel, agenda e disponibilidade; use período e filtro de status; ajuste somente a própria disponibilidade, pausa e ausência. | Menu mostra só recursos permitidos; agenda localiza atendimentos passados/futuros; tentativa de editar outro profissional não é oferecida nem permitida. | Captura do menu e da agenda filtrada. |
| QA-06 | Profissional, celular | Envie, troque e abra a foto pública de profissional pela página da barbearia. | Upload aceita apenas foto permitida, sucesso aparece e nova foto é exibida publicamente; foto de outro profissional não é alterada. | Captura no perfil e na página pública. |

## Isolamento, notificações e encerramento

| IDs do backlog | Conta e dispositivo | Ação | Resultado esperado | Evidência a registrar |
| --- | --- | --- | --- | --- |
| QA-04, PR-08 | Dono, gestor, profissional e cliente de A/B | Tente, por interface e URL, abrir agenda, clientes, relatórios, equipe, fotos e notificações da outra barbearia. | Não há vazamento nem alteração entre A e B; erro ou ausência de acesso é seguro e compreensível. | Matriz simples “perfil × recurso × passou/falhou”. |
| QA-09 | Dono ou gestor | Gere um evento de teste e abra a central de notificações e preferências. | Cada pessoa vê e marca somente as próprias notificações; preferências salvam sem afetar outro integrante. | Captura da central e da mensagem de salvamento. |
| QA-08 | Cliente e dono | Após agendamento, reagendamento ou cancelamento de teste, confira as caixas de entrada. | E-mail transacional chega; magic link chega e abre corretamente. | Nome do tipo de mensagem e horário de entrega, sem conteúdo privado. |

## Como atualizar o backlog

1. Localize cada ID testado em `docs/BACKLOG-HOMOLOGATION-PRIORITIES.md`.
2. Substitua **Pendente** ou **Em validação** por **Concluído** somente se o resultado esperado ocorreu no domínio publicado.
3. Acrescente na evidência a data, dispositivo e um resumo sem dados pessoais, por exemplo: “12/08, Android, cliente: passou; captura armazenada no relatório de homologação”.
4. Se falhar, mantenha o status atual e registre o passo, perfil e mensagem apresentada. Isso permite corrigir sem repetir toda a investigação.
