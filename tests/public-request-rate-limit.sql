-- Fixture no schema real, sem usuários/reservas e sem resíduos: executar integralmente.
begin;

do $test$
declare
  origin text := repeat(replace(gen_random_uuid()::text, '-', ''), 2);
  other_origin text := repeat(replace(gen_random_uuid()::text, '-', ''), 2);
  item record;
  result record;
  attempt integer;
begin
  for item in select * from (values
    ('invitation', 60, 10), ('booking_status', 60, 30),
    ('availability', 60, 30), ('monthly_availability', 60, 30), ('booking', 900, 4)
  ) as cases(action, seconds, request_limit) loop
    for attempt in 1..item.request_limit + 3 loop
      select * into result from public.consume_public_request_rate_limit(item.action, origin, '', item.seconds, item.request_limit);
      if result.allowed is distinct from (attempt <= item.request_limit)
        or result.remaining is distinct from greatest(item.request_limit - attempt, 0) then
        raise exception 'Rate limit inválido para %, tentativa %: allowed=%, remaining=%', item.action, attempt, result.allowed, result.remaining;
      end if;
    end loop;
    select * into result from public.consume_public_request_rate_limit(item.action, other_origin, '', item.seconds, item.request_limit);
    if result.allowed is distinct from true or result.remaining <> item.request_limit - 1 then
      raise exception 'Origens diferentes compartilham limite';
    end if;
    select * into result from public.consume_public_request_rate_limit(item.action, origin, 'isolated-fixture', item.seconds, item.request_limit);
    if result.allowed is distinct from true or result.remaining <> item.request_limit - 1 then
      raise exception 'Subjects diferentes compartilham limite';
    end if;
    if exists (select 1 from public.public_request_rate_limits where origin_hash=origin and action=item.action and request_count > item.request_limit + 1) then
      raise exception 'Contador cresce sem limite após bloqueio';
    end if;
  end loop;
end;
$test$;

set local role anon;
do $test$
begin
  begin
    perform public.consume_public_request_rate_limit('invitation', repeat('a',64), '', 60, 10);
    raise exception 'anon recebeu execução da RPC de serviço';
  exception when insufficient_privilege then null;
  end;
end;
$test$;
reset role;
set local role authenticated;
do $test$
begin
  begin
    perform public.consume_public_request_rate_limit('invitation', repeat('a',64), '', 60, 10);
    raise exception 'authenticated recebeu execução da RPC de serviço';
  exception when insufficient_privilege then null;
  end;
end;
$test$;
reset role;

select 'rate_limit_thresholds_isolation_and_acl_passed' as result;
rollback;
