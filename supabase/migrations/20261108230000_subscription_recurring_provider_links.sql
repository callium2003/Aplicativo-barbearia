-- Vínculos do provedor para recorrência. Nenhum desses campos concede vigência;
-- a autorização e os pagamentos continuam dependendo de webhook e conciliação.
alter table public.subscription_orders
  add column if not exists billing_mode text not null default 'ONE_TIME'
    check (billing_mode in ('ONE_TIME','CARD_RECURRING','PIX_AUTOMATIC')),
  add column if not exists provider_customer_id text,
  add column if not exists provider_contract_id text,
  add column if not exists provider_subscription_id text,
  add column if not exists provider_pix_authorization_id text,
  add column if not exists recurring_state text not null default 'NOT_STARTED'
    check (recurring_state in ('NOT_STARTED','REQUESTING','READY','ACTIVE','REFUSED','CANCELED','UNKNOWN','REVIEW_REQUIRED'));

alter table public.subscription_orders
  add constraint subscription_recurring_monthly_only check (
    billing_mode = 'ONE_TIME' or months = 1
  );

create unique index if not exists subscription_orders_provider_subscription
  on public.subscription_orders(provider_subscription_id)
  where provider_subscription_id is not null;

create unique index if not exists subscription_orders_provider_pix_authorization
  on public.subscription_orders(provider_pix_authorization_id)
  where provider_pix_authorization_id is not null;

create unique index if not exists subscription_orders_provider_contract
  on public.subscription_orders(provider_contract_id)
  where provider_contract_id is not null;

comment on column public.subscription_orders.billing_mode is
  'Forma autorizada para a operação; não é prova de pagamento nem concede vigência.';
comment on column public.subscription_orders.provider_customer_id is
  'ID do cliente no Asaas, armazenado somente no servidor para conciliação.';
comment on column public.subscription_orders.provider_contract_id is
  'Referência compacta de até 35 caracteres usada pelo Pix Automático.';
comment on column public.subscription_orders.provider_subscription_id is
  'ID da assinatura recorrente no Asaas; pagamentos individuais seguem sua própria conciliação.';
comment on column public.subscription_orders.provider_pix_authorization_id is
  'ID da autorização Pix Automático; ACTIVE só após evento e confirmação do provedor.';
