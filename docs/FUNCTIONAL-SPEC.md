# Especificação funcional

**IMPLEMENTADO**: código atual. **PARCIAL**: lacunas ou homologação pendente. **PLANEJADO**: não entregue.

## Site e autenticação

- **IMPLEMENTADO:** site institucional, planos informativos, teste grátis divulgado, Google e magic link.
- **PARCIAL:** URLs de produção, domínio e entrega de e-mail.

## Barbearia, página pública, profissionais e serviços

- **IMPLEMENTADO:** criação com nome/slug; página por slug, serviços, disponibilidade e agendamento; cadastro básico de profissional, horários, pausas, bloqueios; nome, preço, duração e snapshots.
- **PARCIAL:** estado `active`/`inactive` e regras de banco constam no modelo preservado.
- **PLANEJADO:** dados completos, logo, capa, endereço, WhatsApp, Maps, Instagram, equipe completa, comissão, descrição e relação profissional-serviço.

## Agenda e status

- **IMPLEMENTADO:** disponibilidade, expediente, pausas, bloqueios e leitura/atualização básica no painel.
- **PARCIAL:** validação de itens ativos e sobreposição estão nos SQLs preservados e aguardam homologação remota.
- **IMPLEMENTADO no modelo preservado:** `scheduled`, `confirmed`, `completed`, `cancelled`, `no_show`.
- **PARCIAL na UI:** `no_show` não é operação completa.

## CRM, consentimentos, relatórios e assinatura

- **PARCIAL:** telas de clientes e relatórios são fictícias; trial/gate existem.
- **PLANEJADO:** cliente global, relação cliente-barbearia, histórico, WhatsApp, filtros, segmentos, CSV; consentimentos operacional e de marketing separados/revogáveis; faturamento, desempenho, ticket médio, cancelamentos, no-show e comissão, com somente `completed` no faturamento; escolha entre Stripe, Mercado Pago ou Asaas, checkout, webhooks, bloqueio real e portal.
