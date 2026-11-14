-- Migration: 20261114003000_tax_document_mod11_and_clean_incident_seed.sql
-- 1. Validação Módulo 11 (dígito verificador) para CPF/CNPJ em barbershop_registration_details
-- 2. Limpeza do seed inicial de incidentes fictícios em platform_operational_incidents

create or replace function private.is_valid_br_tax_document(p_doc text)
returns boolean
language plpgsql
immutable
set search_path = ''
as $$
declare
  v_doc text;
  v_len integer;
  v_sum integer;
  v_rem integer;
  v_d1 integer;
  v_d2 integer;
  v_i integer;
  v_w1 int[] := array[5,4,3,2,9,8,7,6,5,4,3,2];
  v_w2 int[] := array[6,5,4,3,2,9,8,7,6,5,4,3,2];
begin
  if p_doc is null then
    return true;
  end if;
  if p_doc !~ '^([0-9]{11}|[0-9]{14})$' then
    return false;
  end if;
  v_doc := p_doc;
  if v_doc ~ '^([0-9])\1+$' then
    return false;
  end if;

  v_len := length(v_doc);
  if v_len = 11 then
    v_sum := 0;
    for v_i in 1..9 loop
      v_sum := v_sum + (substr(v_doc, v_i, 1)::integer * (11 - v_i));
    end loop;
    v_rem := v_sum % 11;
    v_d1 := case when v_rem < 2 then 0 else 11 - v_rem end;

    v_sum := 0;
    for v_i in 1..9 loop
      v_sum := v_sum + (substr(v_doc, v_i, 1)::integer * (12 - v_i));
    end loop;
    v_sum := v_sum + (v_d1 * 2);
    v_rem := v_sum % 11;
    v_d2 := case when v_rem < 2 then 0 else 11 - v_rem end;

    return substr(v_doc, 10, 1)::integer = v_d1
       and substr(v_doc, 11, 1)::integer = v_d2;
  end if;

  -- CNPJ (14 dígitos)
  v_sum := 0;
  for v_i in 1..12 loop
    v_sum := v_sum + (substr(v_doc, v_i, 1)::integer * v_w1[v_i]);
  end loop;
  v_rem := v_sum % 11;
  v_d1 := case when v_rem < 2 then 0 else 11 - v_rem end;

  v_sum := 0;
  for v_i in 1..12 loop
    v_sum := v_sum + (substr(v_doc, v_i, 1)::integer * v_w2[v_i]);
  end loop;
  v_sum := v_sum + (v_d1 * v_w2[13]);
  v_rem := v_sum % 11;
  v_d2 := case when v_rem < 2 then 0 else 11 - v_rem end;

  return substr(v_doc, 13, 1)::integer = v_d1
     and substr(v_doc, 14, 1)::integer = v_d2;
end;
$$;

alter table public.barbershop_registration_details
  drop constraint if exists barbershop_registration_details_tax_document_mod11_check;

alter table public.barbershop_registration_details
  add constraint barbershop_registration_details_tax_document_mod11_check
  check (tax_document is null or private.is_valid_br_tax_document(tax_document)) not valid;

delete from public.platform_operational_incidents
where (service_name, title) in (
  ('booking_gateway', 'Pico de requisições com taxa elevada no gateway público'),
  ('notifications', 'Retentativas na fila de e-mails para provedor externo'),
  ('database', 'Execução rotineira da limpeza de outbox e retenção')
);
