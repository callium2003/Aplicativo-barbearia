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

- **PARCIAL/IMPLEMENTADO:** cliente global autenticado, relacionamento por barbearia, histórico real por barbearia e lista de clientes do painel. O agendamento cria/atualiza o cliente e o relacionamento na mesma transação.
- **PARCIAL/IMPLEMENTADO:** os opt-ins de marketing da barbearia e da plataforma são independentes, desmarcados por padrão, versionados e revogáveis por eventos. Comunicação operacional do agendamento não depende de marketing.
- **IMPLEMENTADO no histórico:** snapshots de serviços, profissional, status, primeira e última visita, totais de atendimentos e receita realizada. Somente `completed` entra na receita; `cancelled` e `no_show` ficam fora.
- **PLANEJADO:** WhatsApp, filtros e segmentos avançados, CSV, campanhas, relatórios completos, comissão, billing, checkout, webhooks, bloqueio real e portal. Ainda não há rota de política de privacidade para vincular ao formulário.
