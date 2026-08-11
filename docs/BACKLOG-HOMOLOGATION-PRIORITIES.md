# Backlog priorizado de ajustes e homologação — BarbeariaSP

Atualizado em **11/08/2026**. Este arquivo organiza os relatos de uso e as pendências técnicas. Ele não autoriza, por si só, alterações no Supabase, Hostinger, dados ou produção.

Cada linha abaixo representa um ajuste ou uma validação específica. A prioridade aparece na seção correspondente; a coluna de evidência dá preferência a uma confirmação visual quando ela existe e, nos demais casos, registra a evidência técnica disponível.

## Resumo das prioridades

| Prioridade | Quando tratar | Conteúdo |
| --- | --- | --- |
| **P0** | Antes dos demais itens | Ajustes relatados diretamente no uso: login, permissões por perfil, agendamento, menus e telas mobile. |
| **P1** | Depois dos P0 | Homologação funcional, e-mail, isolamento entre barbearias e segurança. |
| **P2** | Preparação para produção | Acabamento geral, operação, monitoramento, backup e documentos legais. |

## Legenda de status

| Status | Significado |
| --- | --- |
| **Não iniciado** | Ainda não foi analisado ou implementado. |
| **Pendente** | Já foi identificado e aguarda implementação ou decisão. |
| **Em validação** | Existe alteração ou comportamento parcial, mas falta teste real. |
| **Concluído** | Implementado e validado para o escopo registrado. |
| **Pendente de definição** | A intenção ainda precisa ser confirmada antes de mudar o produto. |

## Prioridade P0 — correções relatadas na experiência de uso

| ID | Ajuste | Área | Status | Evidência visual ou técnica |
| --- | --- | --- | --- | --- |
| UX-01 | Bloquear que dono, gestor e profissional façam agendamento na própria barbearia usando a conta administrativa. Permitir somente com conta de cliente separada. O bloqueio deve existir na interface e no banco. | Login, página pública e agendamento | Em validação | Interface, RPC e trigger do Supabase atualizados. A validação remota confirmou que o trigger está conectado à tabela `appointments` e possui o bloqueio; em 11/08 a suíte automatizada também validou o bloqueio e a linhagem da migration. Falta homologação com contas reais. |
| UX-02 | Remover “Gestão” e qualquer atalho administrativo do menu de cliente, em celular e computador. | Navegação do cliente | Em validação | Link condicional implementado para sessão autenticada; teste automatizado cobre a renderização. |
| UX-03 | Impedir que cliente encontre uma tela administrativa que pede login novamente. A rota não deve ser oferecida a esse perfil. | Navegação e permissões | Em validação | Atalho administrativo removido da navegação do cliente e acesso direto a `/painel` agora devolve cliente autenticado para Meus agendamentos; falta roteiro em navegador autenticado. |
| UX-04 | Respeitar sessão já ativa do cliente ao voltar para a página pública e tocar em “Entrar”; encaminhar para a área correta sem pedir login de novo sem necessidade. | Auth e navegação | Em validação | Entrada do cliente redireciona perfil já existente ao destino solicitado; falta teste real de OAuth/magic link. |
| UX-05 | Preencher nome e celular no novo agendamento quando o cliente já estiver autenticado; permitir edição antes da confirmação. | Agendamento público | Em validação | Leitura do perfil `customers` implementada sem substituir dados pendentes; teste automatizado incluído. |
| UX-06 | Reduzir o card de “Próximos atendimentos” e alinhar seu tamanho ao card de histórico. | Área do cliente | Em validação | Card de próximo agendamento recebeu variante compacta com menor espaçamento, título e margem, preservando as mesmas informações e ações do histórico. Falta inspeção em celular real. |
| UX-07 | Investigar duplicidade entre “Minha conta” e “Meu perfil”; manter uma fonte de dados e uma experiência clara para editar nome e celular. | Área do cliente | Em validação | Bloco duplicado removido de Meus agendamentos; `/meu-perfil` ficou como tela oficial. |
| UX-08 | Preservar no perfil do cliente: nome e celular editáveis, e-mail não editável, mensagem de sucesso e botão “Voltar para a agenda”. | Meu perfil | Concluído | Validação relatada pelo usuário. |
| UX-09 | Simplificar a mensagem de cadastro do cliente: manter o aviso de WhatsApp obrigatório para atendimento e remover a frase sobre marketing. | Minha conta / perfil do cliente | Em validação | Textos de cadastro e rodapé simplificados; teste visual pendente. |
| UX-10 | Reorganizar página pública no celular: foto primeiro; abaixo, nome, agendar horário, botão verde de WhatsApp e como chegar. | Página pública da barbearia | Em validação | Ordem visual mobile alterada para foto antes do conteúdo; teste automatizado incluído. |
| UX-11 | Compactar foto, nome, botões e blocos da página pública no celular. | Página pública da barbearia | Em validação | Ações rápidas passam a duas colunas; precisa avaliação visual no aparelho. |
| UX-12 | Manter somente o WhatsApp verde no topo e remover “Fale conosco” repetido. | Página pública da barbearia | Em validação | Card “Falar conosco” removido; WhatsApp verde do topo preservado. |
| UX-13 | Revisar repetição entre agendar, WhatsApp, contato e “Meus horários”. | Página pública da barbearia | Em validação | Ação duplicada de contato removida; a composição final aguarda inspeção visual. |
| UX-14 | Aumentar ícones, textos, espaçamento e área de toque do menu inferior no celular. | Menu mobile | Em validação | Altura, fonte e área de toque aumentadas no menu do painel e no público. |
| UX-15 | Corrigir menus por perfil em todas as telas: cliente, dono/gestor e profissional devem ver apenas as opções permitidas. | Navegação | Em validação | Testes estruturais cobrem bloqueios de rotas administrativas para profissional, retorno do cliente de `/painel` para Meus agendamentos e menu reduzido do profissional. Falta percurso visual autenticado por cada perfil. |
| UX-16 | Remover “Abrir painel de gestão” de todas as telas administrativas; ele está sobrepondo a navegação e o sino em navegador e celular. Preservar “Sair”. | Painel administrativo | Em validação | Atalho removido. O botão Sair agora é inserido no cabeçalho do painel, ao lado das ações existentes, em vez de ficar sobreposto à navegação; teste automatizado confirma a integração. |
| UX-17 | Compactar menus, seções expansíveis e formulários de Configurações no celular. | Configurações do gestor | Em validação | A tela recebeu cartões menores e grades/formulários empilhados em telas estreitas, evitando expansão horizontal; teste automatizado cobre as classes responsivas. Ainda precisa revisão visual autenticada em celular. |
| UX-18 | Exibir feedback claro de salvar, carregar, sucesso e erro nas alterações do perfil e das Configurações, por exemplo “Perfil atualizado com sucesso”. | Perfil e Configurações | Em validação | Perfil já confirma atualização; configurações possuem mensagens por operação. Falta verificar interação real. |
| UX-19 | Ajustar o texto do consentimento de promoções para “Não quero receber promoções e novidades da barbearia”, opcional e desmarcado por padrão. | Consentimentos | Em validação | Mensagem de opt-out adicionada sem inverter a base de consentimento: marketing permanece opcional, desmarcado e gravado como falso até opt-in explícito. Falta inspeção visual. |
| UX-20 | Ao copiar convite individual, mostrar “Link copiado com sucesso”; em falha, explicar como copiar manualmente. Garantir funcionamento no celular. | Convites de equipe | Em validação | Botão e o próprio link agora acionam feedback acessível; falta toque em aparelho real. |
| UX-21 | Revisar navegação do computador para disponibilizar as ações importantes sem copiar literalmente o menu inferior do celular. | Navegação desktop | Em validação | Painel usa navegação horizontal de desktop e navegação inferior separada apenas no mobile; falta revisão visual autenticada em navegador. |
| UX-22 | Revisar menu da página inicial: no computador há “Como funciona”, “Planos”, “Entrar” e teste; no celular a navegação é diferente. | Página inicial | Concluído | Validação visual publicada a 390 px confirmou os quatro atalhos visíveis. |
| UX-23 | Revisar visão da agenda do profissional por período e filtros de status, sem exigir uma data para descobrir atendimentos. | Agenda profissional | Em validação | Agenda consulta por período de 30 dias anteriores a 90 futuros e possui filtros de status; falta validação pelo profissional. |
| UX-24 | Melhorar edição de profissional e comissão deixando inequívoco o nome do profissional em edição. | Configurações | Em validação | Formulários de nome e comissão agora mostram explicitamente o profissional em edição e o alcance da alteração. |
| UX-25 | Melhorar visual e entendimento de horários, pausas, intervalos e ausências; “intervalo semanal” deve representar corretamente dia e horário. | Configurações de agenda | Em validação | Explicação do formulário esclarece que pausa é semanal e vinculada à linha/dia selecionado; as ausências pontuais já ficam separadas na agenda do profissional. |
| UX-26 | Permitir que o profissional ajuste apenas a própria disponibilidade, pausas e ausências dentro de suas permissões. | Área do profissional | Em validação | Código restringe consultas e alterações ao `professional_id` vinculado e oferece horários, pausas e ausências; falta homologação por perfil. |
| UX-27 | Melhorar autocomplete de dados de cliente sem criar duplicidade de cadastro. | Clientes e agendamento | Em validação | No agendamento público autenticado, nome e celular são carregados do perfil global `customers`; o cadastro é vinculado pelo usuário autenticado e a relação por barbearia possui chave única. Falta validar o fluxo de cliente existente em aparelho real. |
| UX-28 | Garantir que nome longo da barbearia, WhatsApp e “Como chegar” não sejam cortados. | Página pública responsiva | Em validação | Inspeção visual identificou quebra ruim de nome longo; título foi reduzido no desktop para preservar a palavra inteira e os botões móveis seguem em largura total. Falta conferir em celular real. |
| UX-29 | Deixar como backlog sem alterar: ponto ambíguo do perfil público mencionado anteriormente. | Página pública | Pendente de definição | Usuário não recorda o detalhe; revisar em etapa futura. |

## Prioridade P1 — homologação funcional e segurança

Roteiro de execução da próxima validação: [ROTEIRO-HOMOLOGACAO-ATUAL.md](ROTEIRO-HOMOLOGACAO-ATUAL.md).

| ID | Ajuste | Área | Status | Evidência visual ou técnica |
| --- | --- | --- | --- | --- |
| QA-01 | Revalidar login Google no domínio após a correção do loop. | Auth | Concluído | Usuário confirmou em homologação que o loop após login parou; correção publicada no commit `c74fa2b`. |
| QA-02 | Revalidar login por magic link no domínio. | Auth | Pendente | Fluxo implementado; falta teste real pós-publicação. |
| QA-03 | Testar fluxo completo do cliente: página pública, seleção, login, confirmação, cancelar e reagendar. | Agendamento | Pendente | Fluxo implementado; falta roteiro de homologação atual. |
| QA-04 | Testar isolamento A × B entre duas barbearias para dono, gestor, profissional e cliente. | RLS e permissões | Concluído | Executado em 11/08/2026 no Supabase de homologação, em transação com `ROLLBACK`: cobriu duas barbearias, dono, gestor, profissional, cliente, anônimo, CRM, consentimentos e bloqueio de autoagendamento. A checagem posterior confirmou zero usuários, barbearias e clientes temporários persistidos. |
| QA-05 | Reproduzir e corrigir erro de upload de foto da barbearia (`new row violates row-level security policy`). | Supabase Storage | Concluído | Usuário confirmou em homologação que enviou a foto e ela apareceu no perfil público da barbearia. |
| QA-06 | Validar upload, troca e exibição pública da foto de profissional. | Supabase Storage | Em validação | Em 11/08/2026, teste transacional confirmou: upload permitido apenas no diretório do próprio profissional, bloqueio de diretório alheio e rejeição de URL pública de outra pessoa. Nenhum arquivo ou dado de teste persistiu. Ainda falta envio e exibição por profissional real em aparelho. |
| QA-07 | Validar troca de contas no mesmo navegador e em abas diferentes. | Sessão e perfis | Pendente | Relato de risco de confusão entre perfis. |
| QA-08 | Testar recebimento real de magic link e notificações de e-mail em caixa de entrada. | E-mail | Em validação | Domínio transacional verificado no Resend e registros recentes de novo agendamento, confirmação, cancelamento e lembrete constam como entregues. Falta o teste específico de magic link. |
| QA-09 | Validar notificações internas, preferências e leitura de notificações. | Notificações | Concluído | Executado em 11/08/2026 no Supabase de homologação, em transação com `ROLLBACK`: cada usuário lê e marca somente as próprias notificações, integrante autorizado salva preferências pela RPC e não integrante é bloqueado. Dados temporários não persistiram. |
| QA-10 | Investigar a alteração prévia em `package-lock.json` antes de incluí-la, revertê-la ou atualizar dependências. | Dependências | Concluído | A alteração prévia não tinha diferença de conteúdo em relação ao Git, apenas estado local do arquivo. A atualização intencional de `eslint-config-next` para 16.3.0 e a regeneração controlada do lock removeram as duas vulnerabilidades altas de desenvolvimento. Auditoria de produção: zero vulnerabilidades; auditoria completa: uma baixa transitiva em `@babel/core`, sem correção automática segura. Lint sem erros, tipos, 50 testes e build passaram. |
| QA-11 | Investigar a demora do build local, embora o build remoto Hostinger tenha concluído. | Desenvolvimento | Concluído | Build local executado até o fim em 11/08/2026: 3min12s, compilação, TypeScript, geração de 18 páginas e preparação standalone concluídos. A demora é local e não há falha de build; Hostinger permanece mais rápida. |
| QA-12 | Atualizar os documentos de status da Hostinger após a correção do loop e desligamento do cacheless. | Documentação | Concluído | Registros atualizados até o deploy `e5848cd` (build `019ff311-df2f-706c-ab83-c9ab8456a486`); rota de saúde confirmou HTTP 200 com `cache-control: no-store` e o cache normal foi confirmado por cabeçalho dinâmico. |

## Prioridade P2 — acabamento e preparação para produção

| ID | Ajuste | Área | Status | Evidência visual ou técnica |
| --- | --- | --- | --- | --- |
| PR-01 | Revisar visual tela a tela de Agenda, Clientes, Relatórios, Configurações, Equipe e Manutenção em computador e celular. | Interface | Pendente | Documentação indica modernização visual parcial. |
| PR-02 | Revisar tabelas, filtros, cards, comissões e relatórios em telas pequenas. | Relatórios | Pendente | Pendência de responsividade registrada. |
| PR-03 | Revisar avisos do Supabase Advisor individualmente, sem abrir permissões apenas para eliminar alertas. | Segurança Supabase | Em validação | Advisor revisado em 11/08/2026. Três tabelas com RLS sem policy permanecem fechadas por padrão; funções SECURITY DEFINER listadas são RPCs intencionais com validação interna, já incluídas na auditoria; não serão alteradas apenas para remover alertas. |
| PR-04 | Manter registrado o risco de proteção contra senhas vazadas desativada até haver upgrade de plano. | Auth Supabase | Pendente | Limitação conhecida do plano. |
| PR-05 | Definir backup, frequência, responsável e executar teste real de restauração. | Operação | Pendente | Procedimento seguro e escopo da cópia registrados em `docs/OPERACAO-BACKUP-E-MONITORAMENTO.md`. A execução continua pendente até haver destino criptografado, responsável autorizado e ambiente Supabase separado para testar a restauração sem tocar na produção. |
| PR-06 | Adicionar monitoramento de disponibilidade, erros de login, agenda, e-mail, imagens e filas. | Observabilidade | Em validação | Endpoint público mínimo `/api/health` e comando versionado `npm run health:check -- <URL>` validam disponibilidade sem expor dados; em 11/08/2026 a checagem respondeu HTTP 200 no domínio publicado. Fila e entregas de notificação já possuem monitor interno; ainda falta definir serviço externo e alertas para erros de login, agenda e imagens. |
| PR-07 | Criar checklist de incidente e suporte para falhas de login, agenda, e-mail, imagens e hospedagem. | Operação | Concluído | Checklist operacional criado em `docs/CHECKLIST-INCIDENTE-E-SUPORTE.md`, com ações seguras e evidências a registrar para cada categoria. |
| PR-08 | Fazer revisão final de RLS, Storage, sessão, Auth, URLs de redirecionamento e isolamento de tenant. | Segurança | Em validação | Auditoria de segurança concluída em 11/08/2026 encontrou e corrigiu um desvio no bloqueio de autoagendamento por inserção direta. Ainda falta roteiro autenticado de homologação antes de produção. |
| PR-09 | Testar desempenho com cache normal da Hostinger ativo. | Desempenho | Em validação | Checagem publicada em 11/08/2026: HTTP 200, cache Hostinger HIT e cache Next HIT; TTFB de aproximadamente 1,44s no teste pontual. Ainda falta medição sob carga e em rede móvel. |
| PR-10 | Preparar política de privacidade, termos de uso e processo de suporte. | Operação e produto | Não iniciado | Requisito antes de abertura comercial. |

## Fora do escopo atual — não iniciar sem decisão comercial

| ID | Item | Status | Evidência visual ou técnica |
| --- | --- | --- | --- |
| FUT-01 | Landing page final e revisão comercial completa. | Pendente de definição | A página atual ainda tem conteúdo comercial provisório. |
| FUT-02 | Planos comerciais definitivos e período de teste. | Pendente de definição | Não há regra comercial aprovada. |
| FUT-03 | Assinatura, checkout, cobrança, Pix e portal financeiro. | Não iniciado | Fora do escopo atual. |
| FUT-04 | WhatsApp Business API e campanhas avançadas. | Não iniciado | Fora do escopo atual. |
