import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const migrationUrl = new URL("../supabase/migrations/20260807044250_add_appointment_commission_ledger_and_financial_reports.sql", import.meta.url);
const reportsPageUrl = new URL("../app/painel/relatorios/page.tsx", import.meta.url);

test("commission ledger snapshots completed appointment finances and protects direct access", async () => {
  const migration = await readFile(migrationUrl, "utf8");

  assert.match(migration, /create table public\.appointment_commissions/i);
  assert.match(migration, /commission_rate_percent numeric\(5,2\)/i);
  assert.match(migration, /payment_status text not null default 'pending'/i);
  assert.match(migration, /create trigger sync_appointment_commission_after_status_change/i);
  assert.match(migration, /new\.status = 'completed'/i);
  assert.match(migration, /professional_commission_settings/i);
  assert.match(migration, /round\(\(new\.service_price_snapshot::numeric \* v_rate\) \/ 100, 2\)/i);
  assert.match(migration, /Não é possível reabrir um atendimento com comissão já paga/i);
  assert.match(migration, /alter table public\.appointment_commissions enable row level security/i);
  assert.match(migration, /revoke all on table public\.appointment_commissions from authenticated/i);
});

test("financial report RPCs authorize management and keep anon blocked", async () => {
  const migration = await readFile(migrationUrl, "utf8");

  assert.match(migration, /create or replace function public\.get_barbershop_financial_report/i);
  assert.match(migration, /v_role not in \('owner', 'manager'\)/i);
  assert.match(migration, /commission_pending/i);
  assert.match(migration, /average_ticket/i);
  assert.match(migration, /cancelled_appointments/i);
  assert.match(migration, /no_show_appointments/i);
  assert.match(migration, /create or replace function public\.set_appointment_commission_payment_status/i);
  assert.match(migration, /'set_appointment_commission_payment_status'/i);
  assert.match(migration, /revoke all on function public\.get_barbershop_financial_report\(uuid, date, date\) from anon/i);
  assert.match(migration, /grant execute on function public\.get_barbershop_financial_report\(uuid, date, date\) to authenticated/i);
  assert.match(migration, /revoke all on function public\.set_appointment_commission_payment_status\(uuid, text\) from anon/i);
});

test("reports page uses real Supabase financial data instead of demo values", async () => {
  const page = await readFile(reportsPageUrl, "utf8");

  assert.match(page, /rpc\("get_barbershop_financial_report"/);
  assert.match(page, /rpc\("set_appointment_commission_payment_status"/);
  assert.match(page, /RECEITA BRUTA/);
  assert.match(page, /TICKET MÉDIO/);
  assert.match(page, /COMISSÕES PENDENTES/);
  assert.match(page, /RECEITA APÓS COMISSÕES/);
  assert.match(page, /Marcar como pago/);
  assert.match(page, /currentShop|barbershopId/);
  assert.doesNotMatch(page, /João Martins/);
  assert.doesNotMatch(page, /R\$ 1\.665,00/);
});
