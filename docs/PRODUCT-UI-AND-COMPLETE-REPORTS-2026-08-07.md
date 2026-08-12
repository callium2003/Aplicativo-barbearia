# Sistema visual, Área do Cliente e Relatórios — 07/08/2026

## Objetivo

Esta entrega consolida três frentes solicitadas pela proprietária do BarbeariaSP:

1. atualizar o sistema visual da área do cliente e da gestão, usando como referência o modelo visual enviado pela proprietária;
2. concluir a experiência própria do cliente, incluindo celular/WhatsApp obrigatório e comunicação operacional bidirecional por WhatsApp;
3. ampliar os relatórios com base no que plataformas de gestão de beleza/barbearia oferecem e no que os dados reais do BarbeariaSP permitem calcular de forma confiável.

A landing page comercial definitiva e a pesquisa/definição de preços foram deliberadamente adiadas.

## Referência visual fornecida

O arquivo de referência enviado pela proprietária foi usado como direção, não como cópia literal. Os elementos aproveitados foram:

- estética minimalista/premium;
- fundo off-white e superfícies brancas;
- preto como principal cor de texto e ação;
- bronze/dourado discreto como destaque;
- cards com cantos arredondados;
- bastante respiro e hierarquia clara;
- experiência mobile-first;
- relatórios com números grandes, tabelas limpas e barras de progresso discretas.

O projeto usa Geist como tipografia de interface, já integrada via `next/font`.

## Sistema visual implementado

### Arquivos estruturais

- `app/product-ui.css`: tokens e componentes visuais compartilhados;
- `app/legacy-product-polish.css`: acabamento visual para telas grandes legadas sem reescrever suas regras;
- `app/painel/PanelShell.tsx`: cabeçalho e navegação compartilhados da gestão.

### Telas redesenhadas diretamente

- `/entrar` — login administrativo;
- `/cliente/entrar` — login/criação de conta do cliente;
- `/meus-agendamentos` — Área do Cliente;
- `/painel` — Home da gestão;
- `/painel/agenda` — Agenda e disponibilidade própria do barbeiro;
- `/painel/clientes` — CRM operacional;
- `/painel/profissionais` — pausas e bloqueios;
- `/painel/relatorios` — relatórios gerenciais completos.

Configurações e cadastro inicial mantêm sua lógica atual e recebem uma camada de harmonização visual. A decisão evita reescrever, em uma mesma entrega, uma tela com grande concentração de regras já homologadas.

## Área do Cliente

### Autenticação

A autenticação do cliente foi separada da autenticação administrativa.

- Gestão: `/entrar`;
- Cliente: `/cliente/entrar`.

O cliente pode entrar/criar conta por:

- Google;
- magic link enviado ao e-mail.

Não há senha local para o cliente nesta fase.

### Perfil obrigatório

No primeiro acesso, antes de entrar na Área do Cliente, o usuário deve informar:

- nome completo;
- celular/WhatsApp válido com DDD.

O e-mail é obtido da conta autenticada. A RPC `save_my_customer_profile` cria ou atualiza somente o cadastro associado ao próprio `auth.uid()`.

### WhatsApp e consentimento

O celular/WhatsApp é um dado operacional obrigatório porque permite contato sobre o atendimento. Isso não significa autorização de marketing.

Os consentimentos `BARBERSHOP_MARKETING` e `PLATFORM_MARKETING` continuam separados, opcionais e versionados.

### Funcionalidades da Área do Cliente

- próxima reserva em destaque;
- próximos agendamentos;
- histórico;
- status do atendimento;
- reagendamento;
- cancelamento quando permitido;
- contato com a barbearia via WhatsApp;
- edição de nome/WhatsApp;
- logout.

## Agenda da barbearia

A Agenda passou a oferecer:

- filtro por data;
- filtro por status;
- contadores do dia;
- status `scheduled`, `confirmed`, `completed`, `cancelled`, `no_show`;
- nome, telefone, e-mail, serviço, profissional, duração e valor;
- botão de WhatsApp com mensagem pré-preenchida sobre o agendamento;
- confirmar, concluir, cancelar e marcar não comparecimento.

O envio continua manual: o sistema abre o WhatsApp, mas não dispara mensagens automaticamente.

Para barbeiro, a agenda continua isolada no próprio `professional_id` e inclui:

- horários semanais;
- pausa recorrente;
- ausências/bloqueios pontuais.

## Pesquisa de referência para relatórios

Foram revisadas funcionalidades atuais de produtos como Booksy, Fresha, AgendaPro e Trinks.

Os padrões recorrentes encontrados foram:

- resumo gerencial de receita e agenda;
- desempenho por profissional;
- comissão;
- produtividade/ocupação;
- serviços;
- novos e recorrentes;
- cancelamentos/no-show;
- filtros por período/profissional;
- exportação de dados.

O BarbeariaSP implementa esses conceitos somente onde existem eventos-fonte confiáveis.

## Relatórios implementados

### Visão geral

- total de agendamentos;
- agendados;
- confirmados;
- concluídos;
- cancelados;
- no-show;
- receita bruta de concluídos;
- ticket médio;
- valor potencial de cancelamentos;
- valor potencial de no-show;
- comissão total;
- comissão pendente;
- comissão paga;
- receita após comissão;
- clientes do período;
- clientes novos;
- clientes recorrentes;
- clientes com próxima reserva;
- taxa de reagendamento;
- taxa de cancelamento;
- taxa de no-show;
- evolução diária de receita.

### Profissionais

- total de agendamentos;
- concluídos;
- cancelados;
- no-show;
- faturamento;
- ticket médio;
- minutos reservados;
- minutos disponíveis;
- taxa de ocupação;
- comissão total;
- comissão pendente;
- comissão paga.

### Ocupação

A ocupação não é estimada por simples número de horários. O banco calcula intervalos de 10 minutos realmente disponíveis por profissional e período, levando em conta:

- horário do profissional;
- fallback para o horário da barbearia;
- dias fechados;
- pausas recorrentes;
- bloqueios/ausências pontuais.

Os minutos ocupados incluem `scheduled`, `confirmed`, `completed` e `no_show`, pois um no-show também consumiu capacidade da agenda.

### Serviços

- quantidade concluída;
- faturamento;
- preço médio efetivo;
- participação no faturamento;
- tempo total executado.

A primeira implementação da participação de receita usou uma expressão de janela incompatível com a agregação JSON. A migration já estava aplicada quando o erro foi reproduzido. Seguindo a disciplina de migrations, ela não foi alterada; foi aplicada `20260807070958_fix_management_report_service_revenue_share.sql` como correção nova.

### Clientes

- novo/recorrente;
- visitas concluídas no período;
- receita do período;
- primeira visita;
- última visita concluída;
- próxima reserva;
- visitas concluídas no histórico;
- receita histórica;
- telefone/WhatsApp.

### Agendamentos

- data/hora;
- status;
- cliente;
- telefone/e-mail;
- serviço;
- profissional;
- duração;
- valor;
- motivo de cancelamento;
- contato por WhatsApp.

### Comissões

Mantém o ledger implementado anteriormente:

- venda;
- taxa congelada na conclusão;
- valor de comissão;
- `pending` / `paid`;
- data/usuário do pagamento;
- auditoria;
- ação manual para marcar pago ou voltar a pendente.

## Filtros e CSV

A tela aceita:

- Hoje;
- Esta semana;
- Este mês;
- Últimos 30 dias;
- período customizado;
- profissional específico.

Existe exportação CSV separada para:

- resumo;
- agendamentos;
- profissionais;
- serviços;
- clientes;
- comissões.

O arquivo usa UTF-8 com BOM e separador `;`, favorecendo abertura no Excel em ambiente pt-BR.

## Relatórios não implementados de propósito

Não foram criados números fictícios para informações ainda não registradas pelo produto:

- forma de pagamento;
- caixa recebido x previsto;
- taxas de cartão/gateway;
- despesas;
- impostos;
- estoque;
- venda de produtos;
- avaliações/reviews;
- produtividade baseada em ponto;
- ROI de campanha;
- CAC/LTV de aquisição paga.

Esses relatórios dependem de módulos/eventos futuros.

## Supabase

Migrations desta entrega:

- `20260807070808_add_customer_account_and_complete_management_reports.sql`;
- `20260807070958_fix_management_report_service_revenue_share.sql`.

O histórico remoto passou a 24 migrations.

### Verificações remotas

- owner consulta relatório completo;
- barber é bloqueado;
- filtro/tenant são validados dentro da RPC;
- ocupação retorna capacidade futura baseada em horários;
- perfil de cliente aceita WhatsApp válido;
- WhatsApp inválido é rejeitado;
- testes de escrita foram revertidos com `ROLLBACK`.

## Segurança

As novas RPCs revogam `anon`. `authenticated` recebe `EXECUTE` somente porque as funções verificam identidade/papel dentro do banco.

O Security Advisor continua exibindo warnings genéricos de `SECURITY DEFINER`, inclusive para funções já existentes. As novas funções foram testadas por papel e tenant. O aviso de proteção de senhas vazadas permanece uma pendência de configuração do Auth e não foi alterado nesta entrega.

## Limites da entrega

Não houve:

- PR;
- merge na `main`;
- deploy;
- publicação Hostinger;
- mudança de DNS;
- definição de preço;
- redesign final da landing page.

A próxima revisão comercial deve acontecer depois da homologação visual do produto e da definição dos planos/preços.
