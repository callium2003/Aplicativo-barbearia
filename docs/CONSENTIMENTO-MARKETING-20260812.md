# Atualização de consentimento de marketing — 12/08/2026

## Regra vigente

Os dois campos de marketing do agendamento público são opt-out:

- sem marcar: o cliente aceita receber novidades;
- marcado: o cliente não aceita receber novidades.

Os textos exibidos são “Não quero receber promoções e novidades desta barbearia” e “Não quero receber novidades e benefícios do aplicativo BarbeariaSP”.

## Implementação

`app/[slug]/page.tsx` mantém os estados como `barbershopMarketingOptOut` e `platformMarketingOptOut`. Antes de chamar `book_customer_appointment`, o valor é invertido para os parâmetros de consentimento do banco: checkbox marcado envia `false`; checkbox desmarcado envia `true`.

O estado temporário usado durante login e retomada do agendamento também foi atualizado. Agendamentos pendentes criados antes desta alteração continuam sendo interpretados com segurança, pois os campos antigos representavam opt-in.

## Homologação relacionada

- Foto do profissional na agenda pública: concluída mediante confirmação do usuário.
- Autopreenchimento do nome, e-mail e telefone do cliente autenticado: concluído mediante confirmação do usuário.
- Testes direcionados de página pública e consentimento: 15 aprovados.
- TypeScript: aprovado.
