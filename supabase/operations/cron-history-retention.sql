-- Configuração operacional idempotente; não aplicar como migration.
-- Executar como postgres no ambiente autorizado, após inspecionar cron.job.
-- Não lê comandos históricos, Vault ou dados operacionais.
-- GMT no ambiente validado: 03:27 UTC = 00:27 America/Sao_Paulo.
begin;
set local lock_timeout = '2s';

select cron.schedule(
  'barbeariasp-purge-cron-history',
  '27 3 * * *',
  $job$
delete from cron.job_run_details
where status in ('succeeded', 'failed')
  and end_time < now() - interval '7 days';
  $job$
);

-- schedule faz upsert pelo nome; reativar explicitamente em reaplicações.
select cron.alter_job(
  job_id := (select jobid from cron.job
             where jobname = 'barbeariasp-purge-cron-history'),
  active := true
);
commit;
