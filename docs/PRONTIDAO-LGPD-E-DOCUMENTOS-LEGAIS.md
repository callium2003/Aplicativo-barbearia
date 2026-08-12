# Prontidão LGPD e documentos legais

Atualizado em **12/08/2026**. Este documento é um inventário técnico e operacional para preparar os documentos públicos do BarbeariaSP. Ele **não substitui** a análise de advogado ou encarregado e não deve ser publicado como política de privacidade enquanto os campos pendentes não forem definidos.

## Referências oficiais consultadas

- [Lei nº 13.709/2018 — LGPD](https://www.planalto.gov.br/ccivil_03/_ato2015-2018/2018/lei/l13709.htm).
- [ANPD — agentes de tratamento e encarregado](https://www.gov.br/anpd/pt-br/assuntos/noticias/nova-versao-do-guia-dos-agentes-de-tratamento).
- [ANPD — direitos dos titulares](https://www.gov.br/anpd/pt-br/assuntos/titular-de-dados-1/direito-dos-titulares).
- [ANPD — estrutura recomendada para aviso de privacidade](https://www.gov.br/anpd/pt-br/acesso-a-informacao/aviso-de-privacidade).

Essas fontes explicam que o controlador define as finalidades do tratamento e responde aos pedidos dos titulares; também destacam transparência sobre dados, finalidade, compartilhamentos, retenção, segurança, contato e direitos.

## Inventário técnico de dados

| Categoria | Dados identificados no produto | Finalidade observada | Acesso e proteção atuais |
| --- | --- | --- | --- |
| Conta de cliente | nome, e-mail de acesso, celular/WhatsApp e identificador de autenticação | identificar o cliente e permitir acesso à área de agendamentos | cliente acessa os próprios dados; RLS e RPCs restringem dados por usuário e barbearia |
| Agendamento | serviço, profissional, data/hora, status, nome, telefone e e-mail do cliente | reservar, confirmar, cancelar e reagendar atendimento | acesso operacional limitado à barbearia envolvida; cliente vê os próprios agendamentos |
| Conta da barbearia | nome, contato, endereço, descrição, responsável e dados privados de cadastro | cadastro, funcionamento do painel e divulgação pública autorizada | dados privados separados do catálogo público; RLS por tenant |
| Profissional | nome, telefone, Instagram e foto pública opcional | agenda, vínculo com a equipe e escolha pelo cliente | o profissional atualiza o próprio perfil; arquivo salvo em caminho segregado |
| Fotos públicas | imagem da barbearia e de profissional | apresentação pública do serviço | Storage com regras por tenant; renderização remota limitada ao domínio do projeto Supabase |
| Preferências de marketing | tipo, escopo, escolha, versão, origem e data do consentimento | registrar opt-in opcional de marketing | padrão desmarcado; comunicação operacional não depende de marketing |
| Notificações e e-mail | destinatário, conteúdo operacional, status de envio e tentativas | confirmação, cancelamento, lembrete e avisos do sistema | fila controlada no Supabase e envio transacional pelo Resend |

O inventário não encontrou, no escopo atual, coleta intencional de dados sensíveis como saúde, biometria, religião ou geolocalização precisa. Isso deve ser reavaliado se novos formulários, integrações ou relatórios forem adicionados.

## Papéis que precisam constar em contratos e avisos

O papel de cada organização deve ser definido por operação de tratamento, e não somente pelo nome da plataforma:

| Operação | Hipótese a formalizar | Estado |
| --- | --- | --- |
| Atendimento e relacionamento entre cliente e barbearia | A barbearia normalmente decide a finalidade do agendamento e tende a atuar como controladora desses dados. | Pendente de contrato e validação jurídica |
| Infraestrutura BarbeariaSP para dados da barbearia | A empresa responsável pela plataforma pode atuar como operadora conforme as instruções da barbearia. | Pendente de identificação formal da empresa e contrato |
| Conta e operação própria da plataforma | Para suporte, segurança, administração da conta e obrigações próprias, a responsável pela plataforma pode ser controladora. | Pendente de definição das finalidades e base legal |
| Supabase, Hostinger, Resend e provedor de login | Fornecedores de infraestrutura devem ser descritos como suboperadores ou destinatários conforme o contrato e o fluxo concreto. | Pendente de revisão contratual e localização aplicável |

## Campos obrigatórios antes de publicar documentos públicos

- razão social, CNPJ, endereço e canal de contato da empresa responsável pela plataforma;
- canal público de suporte da plataforma para a barbearia entrar em contato em caso de dúvida, incidente ou indisponibilidade; definir e-mail, horário de atendimento, prazo de resposta e responsável antes da publicação dos documentos;
- identificação e contato do encarregado, quando aplicável, ou canal equivalente definido após avaliação jurídica;
- definição contratual com cada barbearia sobre controlador, operador e atendimento de pedidos de titulares;
- política de retenção por categoria de dado, incluindo agenda, consentimento, notificações e cópias de backup;
- lista confirmada de fornecedores/suboperadores e, se houver, transferência internacional;
- base legal aplicável por finalidade e texto aprovado para consentimento de marketing;
- canal autenticado ou procedimento de verificação de identidade para pedidos de acesso, correção, eliminação, portabilidade e revogação;
- data de vigência, versão e responsável pela revisão dos documentos.

## Estrutura recomendada para os documentos públicos

### Aviso de privacidade

1. Identificação do controlador, canal de privacidade e como entrar em contato com o suporte da plataforma.
2. Categorias de dados, fontes, finalidades e bases legais.
3. Compartilhamentos e fornecedores.
4. Retenção, exclusão e medidas de segurança em linguagem clara.
5. Direitos do titular e procedimento gratuito de solicitação.
6. Marketing opcional, forma de revogação e consequência de não consentir.
7. Cookies, logs e ferramentas adicionais, caso venham a ser implementados.
8. Data, versão e alterações do aviso.

### Termos de uso

1. Quem oferece a plataforma e quem pode utilizá-la.
2. Regras para barbearias, gestores, profissionais e clientes.
3. Responsabilidades sobre agenda, dados inseridos, conteúdo e atendimento presencial.
4. Disponibilidade, canal de suporte, prazo de resposta, suspensão, encerramento e exportação de dados.
5. Propriedade intelectual, uso de marca e regras de conduta.
6. Relação com o aviso de privacidade e com contratos comerciais aplicáveis.

## Ações técnicas já atendidas

- isolamento por barbearia no banco e no Storage;
- confirmação explícita do agendamento autenticado;
- marketing separado da comunicação necessária ao atendimento;
- acesso do cliente aos próprios dados para correção de nome e celular;
- logs operacionais de notificações e registros de consentimento;
- restrição de segredos fora do frontend e do Git;
- plano de backup/restauração e checklist de incidente documentados.

## Pendências para encerramento

1. Preencher os campos obrigatórios com as definições comerciais e jurídicas reais.
2. Submeter aviso de privacidade, termos e contratos com barbearias a revisão jurídica.
3. Criar as páginas públicas somente após aprovação do conteúdo e do canal de atendimento.
4. Testar o pedido de direitos do titular com uma conta de teste e registrar o resultado no backlog.
