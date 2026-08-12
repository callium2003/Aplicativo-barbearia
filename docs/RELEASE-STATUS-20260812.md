# Atualização consolidada — 12/08/2026

Este registro complementa `CURRENT-STATUS.md`, `FUNCTIONAL-SPEC.md`, `DECISIONS.md` e `BACKLOG-HOMOLOGATION-PRIORITIES.md`.

## Regras confirmadas

### Preferências de novidades

As preferências são independentes:

- novidades e promoções de cada barbearia;
- novidades e benefícios do aplicativo BarbeariaSP.

O texto é apresentado como recusa explícita (“Não quero receber…”):

- checkbox desmarcado: cliente aceita receber;
- checkbox marcado: cliente não aceita receber.

A mesma regra vale para cliente novo e cliente já existente. O cliente pode alterar a escolha depois em `Meu perfil`. Confirmações, cancelamentos, reagendamentos e lembretes do próprio atendimento não são marketing e continuam permitidos.

## Implementação entregue

- Formulário público atualizado para usar estados de opt-out.
- Retomada de agendamento após login preserva a escolha.
- Banco grava eventos de aceite e revogação em `customer_consents`.
- RPCs protegidas adicionadas:
  - `get_my_customer_marketing_preferences()`;
  - `save_my_customer_marketing_preferences(uuid, boolean, boolean)`.
- Tela de preferências adicionada a `app/meu-perfil/page.tsx`.
- Estilo responsivo adicionado em `app/product-ui.css`.
- Foto do profissional na agenda pública: confirmada pelo usuário.
- Autopreenchimento de nome, e-mail e telefone: confirmado pelo usuário.

## Supabase remoto

Aplicado no projeto remoto de homologação `irszgnkzqseljowckrgz`:

- `record_marketing_opt_out_on_booking`;
- `add_customer_marketing_preferences`;
- `fix_customer_consent_booking_policy`.

A última migration garante que tanto o fluxo público de agendamento quanto a tela de preferências do cliente possam gravar seus eventos com a origem correta.

## Validação

- TypeScript aprovado.
- ESLint dos arquivos alterados aprovado.
- Testes direcionados aprovados.
- Sequência local de migrations atualizada.

## Hostinger

O build mais recente concluído é `019ff80d-3125-7125-bb35-cda7d5932e9f`, em Node 22. A página pública `/cullenbarber` foi confirmada com HTTP 200. Para recuperar o builder após o erro `EACCES`, o pacote emergencial excluiu rotas de API; como consequência, `/api/health` responde HTTP 404 e o monitoramento está em estado parcial. Não há rewrite ativa para `platform-status` no `next.config.ts`; os registros anteriores sobre esse rewrite são históricos e foram superados.

## Limpeza de dados

Nenhuma limpeza foi executada. O banco ainda contém dados de homologação. A limpeza deve ocorrer agora somente após a confirmação da lista de dados a preservar, especialmente contas, barbearias, configurações e credenciais técnicas.

## Correção de acesso público — 12/08/2026

Foi identificado que visitantes anônimos recebiam `permission denied for table barbershops`, enquanto usuários logados conseguiam abrir o perfil. A causa era a combinação de views com `security_invoker=true` e grants anônimos insuficientes nas colunas públicas. A migration `restore_public_catalog_anon_grants` foi aplicada no Supabase remoto. A consulta anônima de `cullenbarber`, serviços e profissionais foi validada com retorno correto. A correção é de banco e não exige novo build para surtir efeito.

## Correção de acentuação no perfil — 12/08/2026

Os textos de “Preferências de comunicação” foram ajustados para escapes Unicode seguros no componente do cliente. Build Hostinger `019ff55f-749b-707f-a994-fd2d2920554c` concluído; a correção está publicada.
