# Atualização de consentimento de marketing — 12/08/2026

## Regra técnica vigente

Consentimento de marketing não pertence ao agendamento. A reserva é confirmada primeiro e continua funcionando mesmo quando o cliente recusa ou não responde à etapa opcional.

- `PLATFORM_MARKETING` pertence ao relacionamento cliente–BarbeariaSP e é perguntado apenas enquanto não houver escolha explícita registrada.
- `BARBERSHOP_MARKETING` pertence ao relacionamento cliente–barbearia e é perguntado somente após a primeira reserva bem-sucedida naquela barbearia, enquanto não houver escolha explícita registrada.
- As caixas começam desmarcadas; aceitar é uma ação positiva. “Continuar sem receber novidades” grava `false` para os escopos apresentados.
- Fechar a página ou abandonar o fluxo não cria evento. A ausência de evento é sempre retornada e tratada como `false`; a etapa pode ser apresentada novamente em uma futura conclusão de reserva, de modo não bloqueante.
- Alterações posteriores em “Meu perfil” criam evento append-only somente quando o valor muda.

## Implementação

`book_customer_appointment` recebe somente dados necessários à reserva e não lê nem grava marketing. `get_my_customer_marketing_preferences` retorna o último evento de cada escopo, mais uma indicação separada de que uma escolha foi registrada. `save_my_customer_marketing_preferences` resolve o titular via `auth.uid()`, valida o vínculo em `barbershop_customers` antes de registrar consentimento de barbearia e usa defaults `false`.

Comunicações de confirmação, cancelamento, remarcação e lembrete permanecem operacionais e independentes dessas preferências.
