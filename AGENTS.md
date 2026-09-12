# Instruções dos agentes — BarbeariaSP

## Fonte única para finalizar o produto

- Use exclusivamente `docs/FUNCTIONAL-SPEC.md` (EFS) como especificação de produto: requisitos, regras de negócio, design, arquitetura, dados, segurança, assinatura, notificações, privacidade e critérios de aceite.
- Leia a EFS integralmente ao iniciar o trabalho no projeto; em cada tarefa, releia as seções afetadas e a seção 48 de acompanhamento.
- Decisões explícitas mais recentes do usuário prevalecem. Incorpore decisões aprovadas à EFS antes da implementação correspondente. Não transforme sugestões ou dúvidas em regras aprovadas.
- Outros documentos históricos, planos, roadmaps ou especificações antigas não são fontes complementares obrigatórias nem podem substituir a EFS. Não restaure documentos removidos para conduzir o trabalho.
- Código, migrations, testes, logs sanitizados e imagens oficiais são evidências de implementação e validação; documentação oficial de bibliotecas/provedores pode ser consultada para APIs. Isso não cria outra especificação de produto.
- As referências visuais oficiais incorporadas à EFS, especialmente o padrão da área de Clientes, são prioritárias para fidelidade visual. Não exija outro Markdown de design para construir uma tela.
- Este AGENTS.md define o modo de trabalhar, não duplica o contrato de produto.

## Documentação enxuta e rastreamento obrigatório

- Não crie planos, relatórios, checklists, atas, resumos de sessão, arquivos de progresso ou novas especificações paralelas por rotina.
- Registre plano de execução, decisões, entregas, pendências, testes e homologações na seção 48 da EFS. Atualize também o requisito normativo afetado quando houver mudança aprovada de comportamento.
- Não substitua requisitos por relatos de desenvolvimento: seções 1–47 são a especificação para construção; seção 48 é o registro de execução.
- Atualize a EFS na mesma entrega em que construir ou corrigir algo, descobrir uma pendência relevante ou receber homologação. Não deixe a atualização para o fim do projeto.
- Cada item deve identificar requisito/seção/tela, escopo, estado de construção, evidências de testes, integração/publicação, homologação, pendência e próximo passo.
- Diferencie não verificado, pendente, parcial e construído. Homologação é um eixo separado: construído ou teste aprovado não significa homologado.
- Registre quem homologou, quando e o escopo exato. Preserve homologações confirmadas; ausência de teste automatizado não as revoga. Regressões novas devem ter evidência e escopo delimitado.
- Não invente status, datas, testes ou aprovações. Falta de auditoria significa não verificado, não ausência da funcionalidade.
- Não reescreva o histórico de evidências para ocultar falhas. Atualize o item e registre a transição relevante de forma concisa.
- Novos documentos somente por pedido explícito do usuário ou necessidade concreta que não caiba na EFS, explicada antes de criar. Código, migrations, testes e documentos legais servidos pelo aplicativo não são documentação paralela desnecessária.
- Skills devem respeitar este destino único: não gerar automaticamente arquivos separados de plano/design/progresso quando a EFS comportar o conteúdo.

## Rotina de implementação

1. Execute `git status --short` e `git log -1 --oneline`; leia instruções locais aplicáveis e preserve alterações preexistentes.
2. Localize na EFS o requisito aprovado, suas dependências e critérios de aceite. Inspecione código e testes antes de assumir que algo não existe.
3. Registre/atualize na seção 48 o lote ou item que será tratado; trabalhe por funcionalidades verticais e mudanças pequenas e reversíveis.
4. Implemente somente o escopo autorizado e preserve funcionalidades, dados e homologações não afetados.
5. Investigue a causa raiz de falhas; não silencie testes, erros, lint ou validações para aparentar conclusão.
6. Execute validações proporcionais: testes relevantes, typecheck, lint, build e `git diff --check` para mudanças de código. Para documentação apenas, revise coerência, referências e diff.
7. Atualize a seção 48 com o resultado real, falhas, limitações e próximo passo. Apresente o que mudou e o que ainda exige homologação.
8. Não crie commit, push, PR, merge ou deploy sem autorização explícita. Manter o arquivo no repositório não autoriza publicar alterações.

## Ambientes, Docker e pacotes de publicação

- O Supabase remoto ativo é o único banco compartilhado de desenvolvimento e homologação atual; todos os dados nele são de teste enquanto não houver lançamento comercial. A aplicação local e a Hostinger de testes podem apontar para ele, mas código local, código hospedado e banco remoto devem ser informados separadamente em cada relato.
- Docker/Supabase local é um ambiente isolado, nunca uma cópia automática do remoto. Não use seu resultado como evidência do estado remoto e nunca copie dados do remoto para ele por padrão.
- Só inicie ou use Docker quando uma validação técnica isolada realmente exigir banco local (por exemplo migration, RLS, RPC ou fixture SQL). Antes de utilizá-lo, confira sua linha de migrations e atualize apenas a estrutura pelas migrations aprovadas, com dados fictícios; declare ao responsável o motivo, o banco-alvo e a divergência conhecida. Depois da validação, Docker deve voltar a ficar desligado salvo pedido contrário.
- Para validações diárias, use `npm test`, `npm run typecheck` e `npm run lint`; elas não devem gerar standalone. Use `npm run test:build` quando também for necessário comprovar o build de produção. O comando `npm run package:hostinger` prepara o standalone somente após autorização para atualizar/testar uma nova versão na Hostinger; ele não publica por si só.

## Fechamento contínuo de achados

- Ao identificar algo durante uma tarefa, classifique-o imediatamente: erro reproduzível, correção local segura, aviso/dívida técnica, validação externa ou decisão necessária.
- Corrija no mesmo lote todo erro ou aviso técnico cuja causa e correção local segura estejam dentro do escopo autorizado; investigue antes de apenas registrá-lo como pendência.
- Só registre como pendente o que realmente depende de credencial, conta, decisão explícita, ambiente remoto, ação irreversível ou autorização operacional adicional. Declare essa dependência e a ação concreta necessária para encerrar o item.
- Não use pendências para adiar correções locais conhecidas, nem apresente aviso não investigado como impedimento de produto. Preserve os limites de segurança, a separação entre evidência local/remota/publicada e as autorizações exigidas para mudanças externas.

## Mudanças de produto e homologação visual

- Não reabra decisões aprovadas nem preserve uma solução ruim apenas por existir. Mudanças funcionais relevantes exigem proposta e aprovação antes de implementar.
- A proposta, registrada na EFS, deve explicar problema, nova regra, benefício, impacto em frontend/banco/Supabase/autenticação/segurança, dados existentes, migrations/RPC/RLS, riscos e casos especiais.
- Use as referências Txx e os critérios visuais da própria EFS. Não invente controles, informações, pagamentos ou integrações a partir de elementos demonstrativos de uma imagem.
- Mobile-first, com comparação próxima de 390 × 844, além de tablet e desktop. Teste estados, leitura, navegação e ações, não somente a tela inicial.
- Antes de alterar estilos compartilhados, investigue os usos e a cascata. Corrija conflitos na origem; neutralize seletores frágeis, estilos inline e `!important` responsáveis pelo conflito, sem empilhar sobrescritas globais.
- Não use o legado como autoridade visual nem substitua a composição aprovada por preferência do agente. Não instale bibliotecas visuais/ícones sem autorização.
- Trabalhe uma superfície por vez e aguarde homologação da atual antes de avançar no redesign, salvo autorização explícita diferente.
- Informe referência utilizada, funcionalidades preservadas, diferenças restantes e validação em cada tamanho. Captura indisponível deve constar como limitação; não declare comparação visual realizada.
- Aplique skills pertinentes: investigação de causa raiz para bugs; testes de regressão para mudanças funcionais; revisão de feedback; verificação antes de concluir. Não crie testes artificiais de CSS nem novos documentos apenas para cumprir modelos de skills.

## Segurança e limites operacionais

- Não acesse para alteração o Supabase remoto, aplique migrations remotas, integre worktrees ou execute operações destrutivas sem autorização explícita.
- Preserve as remediações AUTH-01, AUTHZ-01 e ABUSE-01 descritas na EFS. Não restaure UPDATE amplo de appointments ao profissional nem enfraqueça o limite de quatro reservas futuras ativas por cliente/barbearia.
- A integração futura da frente de segurança separada deve preservar suas correções, ser autorizada e ter testes de regressão. Não faça merge nem copie alterações dessa frente como parte de uma tarefa documental.
- Não altere migrations antigas nem mova SQLs de `supabase/migration-history/prebaseline-local/`. Mudanças de schema exigem nova migration, RLS e testes de isolamento.
- Habilite RLS nas novas tabelas; confira isolamento por barbearia, identidade, papel e titularidade. Use os helpers de autorização previstos na EFS ou equivalentes seguros.
- RPCs sensíveis devem ter privilégios mínimos, revogar execução pública/anônima e autorizar somente os papéis previstos. Exceções públicas devem ser explicitamente previstas na EFS; não exponha dados pessoais privados nas projeções públicas.
- Valide inputs com schema, use queries parametrizadas, confira expiração/uso único de convites e revise funções SECURITY DEFINER contra bypass de autorização.
- Nunca exponha segredos, tokens, credenciais ou dados pessoais desnecessários em código, prompts, logs, respostas ou Git. Não versione arquivos .env; use configuração validada para endpoints e credenciais.
- Não enfraqueça autenticação, autorização, RLS, consentimento ou validação para fazer um fluxo funcionar. Se faltar uma decisão de segurança, registre a pendência e peça orientação.

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
