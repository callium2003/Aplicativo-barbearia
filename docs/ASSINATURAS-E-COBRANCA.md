# BarbeariaSP — Especificação funcional e técnica de assinaturas e cobrança

Versão: 1.0 — 06/09/2026
Idioma: português do Brasil
Status: regras de negócio consolidadas para orientar implementação; nenhuma funcionalidade implementada por este documento.

## 1. Objetivo, origem e interpretação

Consolidar as decisões fornecidas pelo usuário no pedido de documentação e no trecho disponibilizado da conversa “Integração Asaas Independente”. O pedido atual prevalece sobre o resumo anterior. Este documento não pressupõe inspeção do código ou do banco de dados do BarbeariaSP.

- **Regra aprovada:** decisão expressamente fornecida pelo usuário, obrigatória para a implementação.
- **Proposta técnica:** estrutura sugerida para executar essas decisões; deve ser adaptada à arquitetura existente.
- **Ponto a definir:** detalhe não decidido na conversa. Não converter silenciosamente em regra comercial, cláusula contratual ou cobrança automática.

O escopo é a assinatura da barbearia pelo uso do BarbeariaSP. Não abrange recebimentos dos serviços prestados aos clientes da barbearia, split, comissões ou campanhas. Produzir este documento não autoriza alterações de código, migrações, operações financeiras ou publicação.

## 2. Catálogo comercial aprovado

| Plano | Duração contratada | Preço total | Parcelamento máximo no cartão | Profissionais ativos |
|---|---|---:|---|---:|
| Mensal | 1 mês | R$ 99,90 | 1x | Até 5 |
| Trimestral | 3 meses | R$ 284,90 | Até 2x | Até 5 |
| Semestral | 6 meses | R$ 539,90 | Até 3x | Até 5 |
| Anual | 12 meses | R$ 999,00 | Até 4x | Até 5 |

Os preços são do período completo. Parcelamento não altera a duração contratada: anual em quatro parcelas concede doze meses de vigência contratual, sujeitos às regras de pagamento, cancelamento e reembolso. Uma parcela não deve ser interpretada como compra de um mês adicional nem estender a vigência ao ser conciliada.

Acima de cinco profissionais ativos, a contratação é **sob consulta**, sem preço ou limite adicional predefinido. Não cobrar excedentes automaticamente. Juros, descontos, reajustes, outros meios de pagamento e renovação automática não foram aprovados nesta conversa.

Valores devem ser mantidos internamente em centavos inteiros, com moeda BRL. O contrato guarda uma cópia da versão do plano, preço, duração, limite e termos aceitos; mudanças futuras do catálogo não reescrevem contratos anteriores.

### 2.1. Profissionais e preservação do histórico

- Contar apenas profissionais ativos da barbearia vinculada à assinatura.
- Profissionais inativos não consomem o limite.
- Inativar um profissional nunca apaga seu histórico, atendimentos, referências ou registros associados.
- Reativação também exige vaga no limite. Validar criação e reativação no servidor, inclusive em operações simultâneas.
- Ao atingir cinco, bloquear apenas o aumento do número de ativos e apresentar a opção de consulta comercial.
- Não inativar pessoas nem escolher automaticamente quais permanecem ativas em uma eventual redução de limite.
- A preservação por inativação de profissional não impede a política separada de eliminação do tenant após 60 dias inativo, observadas retenções legais.

## 3. Trial e contratação

### 3.1. Trial aprovado

Oferecer **30 dias de trial completo, sem exigir cartão**. O trial permite todas as funcionalidades do plano padrão e até cinco profissionais ativos. Não gera dívida, parcelas, cobrança retroativa ou conversão automática em plano pago.

Controlar o trial preferencialmente dentro do BarbeariaSP. Criar a cobrança no Asaas quando o cliente contratar explicitamente um plano. Não depender de uma assinatura externa para conceder o trial.

**Proposta técnica:** persistir `trial_started_at` e `trial_ends_at` uma única vez; evitar renovação de trial por logout, mudança de e-mail ou troca de dados cadastrais. Usar o identificador interno da barbearia como contexto. Critérios para conceder um novo trial a outra barbearia ainda precisam de definição; não implementar bloqueio de acesso baseado em CPF/CNPJ/e-mail.

### 3.2. Fluxo de contratação sugerido

1. Usuário com permissão financeira escolhe plano e quantidade de parcelas permitida.
2. Exibir preço total, duração, parcelas, limite de profissionais, regras de cancelamento e datas relevantes.
3. Registrar aceite dos termos versionados e criar pedido interno único.
4. Criar ou associar cliente financeiro e cobrança/checkout no Asaas com correlação interna.
5. Manter pedido pendente até confirmação financeira confiável. Retorno de navegador ou tela de sucesso não comprova pagamento.
6. Conciliar o pagamento e conceder a vigência uma única vez, em transação local.
7. Exibir plano, início, término, situação financeira e eventual cancelamento programado.

**Pontos a definir antes de implementar esse fluxo:** início do trial; calendário dos meses; tratamento da contratação durante o trial; início da vigência paga; renovação manual ou automática. Preservar o trial vigente enquanto uma contratação está pendente, sem conceder período pago por mera emissão de cobrança.

## 4. Responsabilidades e identidade

### 4.1. Fontes da verdade

| Domínio | Responsável |
|---|---|
| Identidade da barbearia e da assinatura | BarbeariaSP |
| Catálogo, contrato, duração e direitos de acesso | BarbeariaSP |
| Datas de trial, vigência e fases após término | BarbeariaSP |
| Processamento financeiro, situação de cobranças e estornos externos | Asaas, conciliado no BarbeariaSP |
| Projeção local de pagamentos e trilha de reconciliação | BarbeariaSP |

BarbeariaSP é a fonte da verdade de plano, vigência e acesso. Isso não autoriza ignorar fatos financeiros recebidos do Asaas: esses fatos alimentam regras internas, sem copiar cegamente o status externo para o acesso.

**Não consultar Asaas a cada login.** Autenticação e autorização usam a projeção local e o relógio do servidor. Consultas externas ficam em conciliação programada, recuperação de falhas ou investigação específica. Indisponibilidade do provedor não deve bloquear acesso local ainda válido.

### 4.2. Identificadores e correlação

Manter IDs internos estáveis e distintos dos IDs externos `customer`, `subscription` e `payment`. CPF, CNPJ e e-mail são atributos cadastrais; não são chaves de autorização ou identidade da assinatura.

**Proposta técnica de vínculos externos:**

| Campo | Finalidade |
|---|---|
| `tenant_id` | Identidade interna da barbearia |
| `subscription_id` | Identidade interna estável da assinatura |
| `order_id` / `contract_period_id` | Pedido e período contratual |
| `provider` | Provedor financeiro, inicialmente Asaas |
| `provider_account_id` | Referência interna à conta financeira PF ou PJ |
| `environment` | Sandbox ou produção |
| `external_customer_id` | Cliente na conta externa correspondente |
| `external_subscription_id` | Assinatura externa, opcional quando houver recorrência |
| `external_payment_id` | Cobrança individual |
| `external_installment_id` / `external_checkout_id` | Vínculos auxiliares quando usados |
| `external_reference` | Referência opaca ao objeto interno associado |

Usar `externalReference` nos recursos que o suportam, apontando para pedido/contrato interno de forma inequívoca. Não incluir dados pessoais ou segredos. Validar também conta, ambiente, vínculo, valor e moeda; conhecer uma referência não confere autorização.

Uma assinatura interna pode ter vários pedidos, períodos, pagamentos e vínculos externos ao longo do tempo. Não exigir `external_subscription_id` para contratos antecipados ou parcelados sem recorrência externa. Uma recorrência mensal não deve substituir indevidamente uma compra anual parcelada.

## 5. Vigência, cancelamento e reembolso

### 5.1. Conceitos independentes

Separar solicitação de cancelamento, interrupção de futuras renovações, término efetivo do serviço, situação de cobrança e conclusão de reembolso.

Cancelamento voluntário sem inadimplência **mantém o acesso conforme o período contratado e o reembolso aplicável**. Pedir para não renovar não encerra imediatamente um período já pago. No cancelamento ao final do período, manter acesso até seu término, sem marcar inadimplência.

Se houver encerramento antecipado com devolução do período não utilizado, registrar a data efetiva acordada. Essa data delimita o uso e o início das fases após término. Não manter simultaneamente acesso ao período integral e devolução por esse mesmo período, salvo decisão expressa e auditada.

Falha ou demora do estorno não pode apagar a obrigação de reembolso. A data de término deve seguir a regra contratual aplicada; não ser alterada silenciosamente pela demora de processamento financeiro.

### 5.2. Reembolso proporcional

Para pagamento antecipado, prever reembolso proporcional ao período não utilizado, conforme regras legais e contratuais aplicáveis. Não assumir desconto automático de taxas do Asaas. Contabilizar tarifas e suas eventuais reversões separadamente do direito de devolução do cliente.

**Fórmula conceitual, ainda dependente da unidade de cálculo aprovada:**

`reembolso proporcional = valor elegível do contrato × período não utilizado / período total`

Exemplo ilustrativo por meses: anual de R$ 999,00, quatro meses utilizados e oito não utilizados → R$ 333,00 utilizados e R$ 666,00 a devolver. Esse exemplo não define a regra para cancelamento no meio do mês.

Definir antes da implementação: dias ou meses, tratamento de frações, data de corte, fuso, arredondamento, descontos, contratos parcialmente pagos e distribuição do estorno entre cobranças. O total solicitado deve considerar estornos anteriores e pendentes, impedindo devolução duplicada ou superior ao valor elegível disponível para estorno.

O Asaas documenta estorno total ou parcial de parcelamento de cartão confirmado ou recebido, com valor parcial informado em `value`. Essa capacidade permite operacionalizar a política; não determina, por si só, o direito ou o valor devido. [Referência oficial: estornar parcelamento](https://docs.asaas.com/reference/estornar-parcelamento).

Registrar solicitação, cálculo, fundamento, valor, status externo e conclusão. Somente estornos efetivamente concluídos entram no total devolvido. Preservar cada operação e acompanhar conclusão por eventos, inclusive resultados parciais, pendentes e falhos. [Referências oficiais: estornos](https://docs.asaas.com/docs/estornos) e [acompanhamento do estorno](https://docs.asaas.com/reference/estornar-cobranca-com-dados-resumidos-na-resposta).

### 5.3. Direito de arrependimento

Respeitar o direito de arrependimento quando aplicável. O art. 49 do CDC prevê prazo de sete dias nas hipóteses ali descritas e devolução dos valores pagos. Não substituir esse direito por cálculo proporcional nem descontar automaticamente utilização ou tarifas quando a devolução integral for legalmente exigida. O trial não elimina direitos relacionados à contratação posterior. A aplicabilidade concreta e os termos finais devem ser validados juridicamente. [Código de Defesa do Consumidor, art. 49](https://www.planalto.gov.br/ccivil_03/leis/l8078compilado.htm).

### 5.4. Inadimplência, contestação e cobranças futuras

Não pagamento de uma renovação não retira acesso de um período anterior ainda válido. Trial expirado não é dívida. Cancelar a assinatura não prova que cobranças foram canceladas ou estornadas.

Falha de parcela, chargeback, fraude ou contestação durante uma vigência são situações distintas do cancelamento voluntário regular. Registrar o fato e encaminhar à política específica, ainda a definir, sem inventar suspensão imediata, multa, negativação ou renovação compulsória. Impedir cobrança futura indevida e conciliar cada ação externa.

## 6. Acesso após o término

**Regra aprovada:** aplicar a sequência abaixo a partir do término efetivo do trial ou do acesso contratado, quando não existir nova vigência válida.

| Fase | Acesso permitido | Restrições e dados |
|---|---|---|
| Dias 1–3 | Carência operacional para compromissos existentes; regularização e exportação | Não equivale à continuidade completa do plano; não aceitar novos compromissos |
| Dias 4–15 | Somente assinatura, regularização, conta, privacidade e exportação | Agenda e demais operações indisponíveis |
| Dias 16–59 | Caminho mínimo de identificação e reativação; dados operacionais indisponíveis | Dados preservados, sem consulta operacional ou exportação comum |
| 60 dias inativo | Apagar ou anonimizar dados operacionais/pessoais, salvo retenções legais | Não prometer restauração dos dados eliminados |

Clientes podem exportar dados até 15 dias após o término. A indisponibilidade da operação não impede o atendimento de direitos legais de titulares por canal apropriado.

### 6.1. Convenção temporal proposta

Persistir `access_ends_at` como o instante exclusivo do fim do acesso regular. Usar UTC no armazenamento e apresentar datas no fuso `America/Sao_Paulo`. Para tornar as fronteiras testáveis, propõe-se contar dias corridos de 24 horas após esse instante:

- `T <= agora < T + 3 dias`: carência operacional.
- `T + 3 dias <= agora < T + 15 dias`: acesso restrito com exportação.
- `T + 15 dias <= agora < T + 60 dias`: dados preservados e indisponíveis.
- `agora >= T + 60 dias`: elegível à eliminação/anonimização, após verificações.

Assim, no limite de três dias inicia-se a fase 4–15 e no limite de quinze dias encerra-se a janela normal de exportação. Os rótulos de dias descrevem faixas; a convenção exata deve ser confirmada antes de codificar. Se forem adotados dias de calendário, ajustar conjuntamente backend, interface, termos e testes.

Login, abertura da tela de cobrança, exportação ou pagamento ainda pendente não reiniciam o prazo de inatividade. Uma reativação confirmada com nova vigência interrompe o ciclo anterior; após novo término, inicia-se novo ciclo.

### 6.2. Carência operacional

**Proposta técnica:** permitir consulta e conclusão/cancelamento dos compromissos que já existiam em `T`, além de regularização e exportação. Não criar novos agendamentos, recorrências, cadastros operacionais ou expansão da equipe. Reagendamento e alterações necessárias nesses compromissos precisam de escopo explícito antes da implementação.

Um compromisso futuro já cadastrado não prorroga a carência. Agendamentos públicos, integrações, APIs e tarefas automáticas devem respeitar a mesma restrição; esconder botões não basta. Exibir indisponibilidade para novas reservas sem expor a situação financeira da barbearia ao público.

### 6.3. Exportação

- Disponibilizar exportação ao responsável autorizado, incluindo histórico associado a profissionais inativos.
- Aplicar isolamento entre barbearias e permissões do usuário; não exportar segredos, tokens, dados de cartão ou informações de outros tenants.
- Proposta de formato: arquivo estruturado interoperável, com campos documentados, fuso e data de geração.
- Informar a data limite antes e durante a restrição. Links de download devem ter validade curta e controle de autorização.
- Proposta para pedido iniciado dentro do prazo: registrar a solicitação e garantir entrega mesmo se o processamento terminar depois; definir prazo de retirada e retenção do arquivo antes da implementação.

### 6.4. Eliminação e retenções

Aos 60 dias inativo, executar processo auditável e repetível de eliminação/anonimização. Antes de executar, revalidar ausência de vigência ativa, reativação confirmada ou proteção específica de retenção. Tratar corrida entre pagamento e exclusão com controle transacional e nova checagem imediatamente antes da etapa irreversível.

Retenções legais devem ser específicas por categoria, finalidade, fundamento, acesso e prazo. Não usar uma retenção financeira como motivo genérico para guardar toda a operação. Dados retidos ficam segregados do produto e não restauram acesso operacional. Anonimização deve ser efetiva, não mera troca do nome por um código reversível.

A LGPD prevê término do tratamento e hipóteses de conservação nos arts. 15 e 16. A política precisa abranger anexos, exportações, caches, índices, integrações e backups; backups devem ter ciclo de expurgo e restauração que não reintroduza dados já eliminados. O prazo técnico desses backups permanece a definir e não deve ser ocultado na política de privacidade. [LGPD, arts. 15 e 16](https://www.planalto.gov.br/ccivil_03/_ato2015-2018/2018/lei/l13709compilado.htm).

O prazo comercial de 15 dias para exportação não elimina direitos legais de acesso ou outros direitos do titular. Preservar canal de privacidade também quando o produto estiver indisponível.

## 7. Modelo técnico sugerido

Adaptar as entidades à arquitetura existente, sem exigir os nomes abaixo:

| Entidade | Conteúdo mínimo |
|---|---|
| Plano versionado | Código, preço em centavos, meses, parcelas máximas, limite de ativos |
| Assinatura interna | ID estável, tenant, trial, projeção de acesso, versão para concorrência |
| Período contratual | Plano e termos congelados, início, fim original e fim efetivo |
| Pedido | ID único, contrato pretendido, valor, parcelas, situação e chave de deduplicação |
| Conta do provedor | ID interno, provedor, ambiente, versão da credencial e situação |
| Vínculo externo | Conta, ambiente, tipo de objeto, ID externo e objeto interno relacionado |
| Pagamento | Valor original, situação normalizada e externa, datas, pedido e parcela |
| Cancelamento/reembolso | Pedido do cliente, fundamento, datas, cálculo e operações financeiras |
| Caixa de entrada de eventos | Conta, evento externo, recebimento, resultado e tentativas |
| Fila de ações externas | Operação, chave interna, situação e recuperação de resultado incerto |
| Auditoria/retenção | Ator, motivo, transições, política aplicada e execução de expurgo |

Evitar um único campo que tente expressar contrato, cobrança, cancelamento e acesso ao mesmo tempo.

### 7.1. Estados sugeridos

**Ciclo contratual:** `TRIAL`, `ACTIVE`, `ENDED`, `DATA_PURGED`. Uma contratação `PENDING_PAYMENT` pertence ao pedido e pode coexistir com trial ou período ativo.

**Acesso derivado:** `FULL`, `GRACE_EXISTING_ONLY`, `RESTRICTED_EXPORT`, `SUSPENDED_PRESERVED`, `PURGED`. Derivar das datas e da vigência válida; tarefas agendadas atualizam projeções, mas atraso de tarefa não deve prolongar acesso.

**Cancelamento:** `NONE`, `REQUESTED`, `SCHEDULED`, `EFFECTIVE`, com motivo e data efetiva. `SCHEDULED` pode coexistir com `ACTIVE`.

**Pagamento local:** `PENDING`, `CONFIRMED`, `RECEIVED`, `OVERDUE`, `CANCELED`, `PARTIALLY_REFUNDED`, `REFUNDED`, `DISPUTED`. Guardar também o status original do provedor; validar mapeamento e evento que concede acesso conforme o meio de pagamento no Sandbox.

**Reembolso:** `REQUESTED`, `PROCESSING`, `COMPLETED`, `FAILED`, `CANCELED`, com várias operações possíveis por contrato. Esses nomes são internos, não uma cópia obrigatória dos enums do Asaas.

### 7.2. Transições

| Origem e evento | Resultado | Guarda obrigatória |
|---|---|---|
| Entrada elegível no trial | `TRIAL` / `FULL` por 30 dias | Datas persistidas, sem cartão ou cobrança |
| Escolha e aceite de plano | Pedido `PENDING_PAYMENT` | Catálogo válido e operação deduplicada |
| Confirmação financeira elegível | Período `ACTIVE` / `FULL` | Pedido, conta, valor e concessão única validados |
| Pedido de não renovação | Cancelamento `SCHEDULED` | Manter fim vigente e impedir futura renovação aplicável |
| Encerramento antecipado aprovado | Registrar fim efetivo e reembolso devido | Regra legal/contratual e cálculo auditáveis |
| Fim efetivo sem nova vigência | `ENDED` / `GRACE_EXISTING_ONLY` | Relógio do servidor e marco `T` |
| Limite de três dias | `RESTRICTED_EXPORT` | Sem operações fora da lista permitida |
| Limite de quinze dias | `SUSPENDED_PRESERVED` | Encerrar exportação comum |
| Nova contratação conciliada antes do expurgo | `ACTIVE` / `FULL` | Nova vigência e cancelamento do expurgo pendente |
| Limite de sessenta dias sem reativação | Expurgo; depois `DATA_PURGED` / `PURGED` | Retenções separadas e execução concluída |
| Estorno confirmado | Atualizar financeiro e obrigação devolvida | Não alterar acesso fora do cancelamento associado |
| Evento duplicado ou antigo | Sem concessão ou regressão indevida | Deduplicação e conciliação da sequência |

Após expurgo, nova contratação não recupera o histórico eliminado. Definir reentrada e identidade mínima preservável conforme a política de retenção, sem ressuscitar dados pessoais apagados.

## 8. Webhooks, conciliação e segurança

O Asaas orienta usar webhooks e processamento idempotente; o checkout e seu retorno não substituem a confirmação financeira. Usar `externalReference` para correlação. [Asaas Checkout](https://docs.asaas.com/docs/asaas-checkout) e [FAQ oficial](https://docs.asaas.com/docs/faq-do-asaas-checkout).

### 8.1. Processamento proposto

1. Validar autenticidade pelo mecanismo oficial configurado, ambiente, conta e limites de payload. Não inventar assinatura criptográfica não suportada; confirmar o mecanismo vigente na implementação.
2. Persistir o evento de forma durável antes de reconhecer recebimento. Chave única sugerida: `(provider, provider_account_id, environment, event_id)`.
3. Processar em transação com bloqueio/controle de versão do pedido e da assinatura. Marcar sucesso somente após concluir a atualização local.
4. Resolver vínculos externos; colocar referências desconhecidas ou inconsistentes em revisão, sem conceder acesso.
5. Aplicar fatos financeiros e regras de negócio, registrando concessão de período uma única vez por pedido/período. Eventos distintos referentes à mesma compra também não podem duplicar vigência.
6. Reprocessar falhas com tentativas controladas e fila de revisão. Eventos desconhecidos não devem quebrar a recepção dos demais.
7. Se eventos chegarem fora de ordem ou divergirem, conciliar especificamente o recurso externo. Não confiar apenas na ordem de chegada ou fazer regressão cega de `RECEIVED` para `PENDING`.

A documentação lista eventos de cobrança e situações de estorno. O mapeamento final precisa considerar o recurso e o meio de pagamento selecionado. [Eventos para cobranças](https://docs.asaas.com/docs/webhook-para-cobrancas).

### 8.2. Conciliação financeira

- Webhooks conciliam pagamentos e estornos; consultas periódicas recuperam lacunas e verificam operações pendentes, sem consulta por login.
- Manter valor original, taxas, recebimentos e devoluções em campos/registros separados.
- Distinguir autorização/confirmação do cartão, liquidação financeira e concessão de vigência, conforme eventos verificados.
- Em parcelamento, agregar as cobranças do mesmo contrato; nenhuma parcela concede novamente o período completo.
- Duplicidade de pagamento ou valor divergente vai para revisão e possível devolução; não gera automaticamente outro contrato.
- Resposta incerta na criação de cobrança ou estorno exige busca/conciliação antes de repetir. Deduplicação de webhooks não impede duplicação de chamadas de saída.
- Monitorar atraso de eventos, falhas, divergências, estornos pendentes e execuções de expurgo. Frequências e responsáveis operacionais ainda precisam ser definidos.

### 8.3. Cartão e autorização

Nunca armazenar dados de cartão: número completo, CVV, validade, imagem ou payload que contenha esses dados. Preferir checkout hospedado pelo Asaas, para que o BarbeariaSP não receba cartão. Este escopo não prevê guardar token de cartão; eventual recorrência deve ser desenhada com recursos do provedor sem presumir tokenização local.

Credenciais de integração ficam no servidor, fora do frontend, logs e exportações. Logs e eventos persistidos devem ser minimizados e redigidos para remover segredos e dados sensíveis. Referências de credencial em tabelas não são o segredo em si.

Validar identidade autenticada, vínculo com a barbearia e permissão da ação no backend. Nunca conceder acesso por comparação fixa de CPF, CNPJ ou e-mail. Aplicar isolamento também em exportações, tarefas, endpoints públicos e callbacks; manter defesas existentes da arquitetura.

## 9. Abstração para migração Asaas PF → PJ

Preparar um adaptador financeiro com operações de cliente, cobrança/checkout, consulta, cancelamento, estorno e normalização de eventos. A política de acesso permanece no domínio do BarbeariaSP.

Migração de conta deve preservar `tenant_id`, `subscription_id`, períodos e histórico interno. Não assumir portabilidade de IDs externos, tokens, credenciais, clientes, cobranças ou assinaturas entre PF e PJ.

**Estratégia proposta:**

1. Registrar a nova conta com identidade e credenciais próprias, separadas por ambiente.
2. Criar novos vínculos externos conforme capacidades e regras confirmadas do Asaas.
3. Direcionar novas contratações à nova conta em corte controlado, sem cobrar novamente contratos já pagos.
4. Manter conciliação da conta antiga para parcelas, estornos e disputas ainda vinculados a ela.
5. Roteiar cada operação financeira para a conta que originou o recurso; não estornar cobrança antiga usando credencial da nova conta.
6. Se houver recorrências externas, planejar cancelamento/substituição e eventual nova autorização do cliente sem duplicar cobranças.
7. Desativar a integração antiga apenas após resolver suas obrigações e retenções.

Esse desenho prepara a aplicação; não afirma que o Asaas realiza transferência automática PF→PJ. Procedimento real, disponibilidade da conta antiga e obrigações financeiras precisam ser confirmados com o provedor no momento da migração.

## 10. Critérios de aceite para implementação

Os critérios abaixo são futuros testes de aceitação, não testes já executados.

| ID | Cenário | Resultado esperado |
|---|---|---|
| AC-01 | Iniciar trial | 30 dias completos, até cinco ativos, sem cartão ou cobrança |
| AC-02 | Reabrir sessão ou alterar e-mail | Datas do trial e identidade da assinatura preservadas |
| AC-03 | Selecionar cada plano | Preço total, duração e parcelas exatamente conforme catálogo |
| AC-04 | Solicitar parcela acima do máximo por API | Rejeição no servidor |
| AC-05 | Ativar sexto profissional | Bloqueio e indicação de consulta comercial |
| AC-06 | Inativar e reativar profissional | Histórico preservado; reativação respeita limite |
| AC-07 | Duas ativações simultâneas com uma vaga | Somente uma consome a vaga |
| AC-08 | Checkout criado ou retorno de sucesso sem pagamento | Sem concessão de vigência paga |
| AC-09 | Repetir webhook ou receber eventos distintos da mesma compra | Uma única concessão de período |
| AC-10 | Anual em quatro parcelas | Doze meses contratuais, sem extensão por parcela |
| AC-11 | Cancelar renovação de contrato regular | Acesso até o fim do período vigente |
| AC-12 | Reembolso proporcional aprovado | Cálculo auditado; sem desconto automático de tarifas |
| AC-13 | Arrependimento legal aplicável | Aplicação do direito correspondente, sem substituição indevida por proporcionalidade |
| AC-14 | Estorno em processamento, parcial ou falho | Situações distintas; somente conclusão compõe total devolvido |
| AC-15 | Testar imediatamente antes, no instante e após T, T+3, T+15 e T+60 | Fase correta segundo convenção temporal aprovada |
| AC-16 | Carência com agendamento já existente e tentativa de novo | Operação existente permitida no escopo; nova reserva negada |
| AC-17 | Dias 4–15 | Somente assinatura, regularização, conta, privacidade e exportação |
| AC-18 | Dias 16–59 | Dados preservados, sem acesso operacional; reativação disponível |
| AC-19 | Exportar dentro e fora da janela | Autorização, prazo e entrega conforme política; isolamento entre tenants |
| AC-20 | Completar 60 dias inativo | Expurgo/anonimização auditados; retenções legais separadas |
| AC-21 | Pagamento confirmado concorrente ao expurgo | Revalidação evita apagar tenant com vigência reativada |
| AC-22 | Asaas indisponível durante login de assinatura válida | Acesso local válido continua funcionando |
| AC-23 | Evento de outro ambiente/conta ou referência incompatível | Nenhuma concessão indevida; revisão registrada |
| AC-24 | Trocar CPF, CNPJ ou e-mail | Sem troca da identidade interna nem privilégio adicional |
| AC-25 | Migrar PF→PJ em ambiente de teste | IDs internos preservados; cobranças antigas conciliadas na conta original |
| AC-26 | Inspecionar armazenamento, logs e exportações | Ausência de cartão, credenciais e dados de outros tenants |
| AC-27 | Repetir criação após timeout externo | Conciliação anterior à repetição; nenhuma cobrança ou devolução duplicada |
| AC-28 | Job de atualização de fase atrasado | Backend restringe pelo relógio e datas, sem prolongamento de acesso |

## 11. Casos de borda e decisões necessárias

| Caso | Diretriz / pendência |
|---|---|
| Contratação antes do fim do trial | Definir início pago e preservação dos dias restantes; não consumir silenciosamente o trial |
| Fim do mês, fevereiro e ano bissexto | Definir adição de meses e regra para dia inexistente; não assumir mês de 30 dias |
| Renovação antecipada ou depois de expirar | Definir início do novo período e tratamento de dias sem serviço; evitar sobreposição ou cobrança retroativa implícita |
| Renovação automática | Exige decisão comercial, aceite e fluxo de cancelamento; não ativar por padrão |
| Upgrade, downgrade e plano sob consulta | Preço, vigência, pró-rata e tratamento de excesso de profissionais ainda não definidos |
| Compra duplicada ou dois checkouts abertos | Uma decisão contratual auditável; revisar pagamento excedente |
| Pagamento após pedido cancelado | Conciliar, revisar obrigação e reativação/devolução; não reabrir automaticamente qualquer contrato |
| Pagamento após expurgo | Registrar e resolver financeiramente; não prometer recuperação do histórico |
| Evento antigo após nova contratação | Aplicar ao período original, sem encerrar a nova vigência por engano |
| Chargeback durante período pago | Política de disputa e acesso a definir; preservar evidências e não confundir com cancelamento regular |
| Estorno sem saldo ou recusado | Manter obrigação pendente, motivo e acompanhamento; não marcar devolvido |
| Vários reembolsos concorrentes | Reservar valores pendentes e limitar soma ao elegível; evitar devolução dupla |
| Inativação com compromissos futuros | Histórico permanece; definir redistribuição operacional sem apagar agendamentos |
| Exportação solicitada no último instante | Definir entrega e retirada de pedido tempestivo; não descartá-lo por demora do processamento |
| Retenção legal parcial | Reter somente categorias necessárias; eliminar o restante |
| Usuário vinculado a várias barbearias | Expurgo de um tenant não apaga a conta ou dados necessários aos outros |
| Falha parcial no expurgo | Reexecutar com segurança, registrar progresso e não declarar conclusão antecipada |
| Mudança de conta Asaas com parcelas abertas | Manter vínculos e conciliação antigos; não recriar saldo como nova venda |

Antes de implementar, fechar os pontos comerciais e temporais acima e a matriz exata de permissões da carência. Escolhas técnicas reversíveis podem ser adaptadas ao repositório; escolhas que alterem cobrança, direitos, duração ou retenção precisam de decisão explícita.

## 12. Orientação de execução no Codex

1. Inspecionar repositório, `AGENTS.md`, arquitetura, autorização e funcionalidades existentes.
2. Confirmar os pontos a definir que afetem a etapa em implementação, preservando as regras aprovadas.
3. Adaptar modelo interno e catálogo sem acoplar identidade ao Asaas.
4. Implementar trial, cálculo de vigência, limites e matriz de acesso com validações no servidor.
5. Integrar checkout/cobrança e webhooks no Sandbox, incluindo idempotência de entrada e saída.
6. Implementar cancelamento, conciliação e reembolso com trilha auditável.
7. Implementar exportação, reativação, retenção e expurgo conforme política validada.
8. Validar critérios de aceite, falhas de integração e concorrência, além dos testes, lint, typecheck e build relevantes do projeto.
9. Relatar o efetivamente implementado e testado. Operações reais, migrações remotas e publicação seguem a autorização específica da execução.

## 13. Verificação desta entrega

Foi consolidada exclusivamente documentação Markdown a partir das decisões disponibilizadas, com consulta a fontes oficiais para capacidades do Asaas e referências legais. As fontes são vinculadas nas respectivas seções e foram consultadas em 06/09/2026; esquemas e capacidades externas devem ser verificados novamente na implementação.

Nenhum código, banco, configuração financeira ou ambiente do BarbeariaSP foi alterado. Não foram executados testes de integração, operações financeiras ou validação jurídica. A revisão desta entrega verifica cobertura dos requisitos e coerência documental; os critérios de aceite são obrigações de validação futura.
