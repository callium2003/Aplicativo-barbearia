import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { handleAsaasSandboxWebhook } from "../utils/asaas-webhook-handler.mjs";

const token = "sandbox-token-example-32-characters-long";
const account = "sandbox-account-fixture";

function makeReq(body, header = token) {
  return new Request("https://example.test/api/webhooks/asaas", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "asaas-access-token": header,
    },
    body: JSON.stringify(body),
  });
}

test("webhook rejects invalid authentication tokens with 401", async () => {
  const persist = async () => true;
  const res = await handleAsaasSandboxWebhook(
    makeReq({ id: "evt_1", event: "PAYMENT_RECEIVED", account: { id: account } }, "invalid-token-here"),
    { enabled: true, token, account, persist }
  );
  assert.equal(res.status, 401);
});

test("webhook rejects mismatched account with 403", async () => {
  const persist = async () => true;
  const res = await handleAsaasSandboxWebhook(
    makeReq({ id: "evt_1", event: "PAYMENT_RECEIVED", account: { id: "other-account" } }),
    { enabled: true, token, account, persist }
  );
  assert.equal(res.status, 403);
});

test("webhook processes PAYMENT_RECEIVED and forwards to recurring persistence", async () => {
  const saved = [];
  const persistRecurring = async (fields) => {
    saved.push(fields);
    return true;
  };
  const body = {
    id: "evt_pay_rcv_1",
    event: "PAYMENT_RECEIVED",
    account: { id: account },
    payment: {
      id: "pay_test_100",
      subscription: "sub_test_200",
      status: "RECEIVED",
      value: 49.9,
      externalReference: "10000000-0000-4000-8000-000000000001",
    },
  };

  const res = await handleAsaasSandboxWebhook(makeReq(body), {
    enabled: true,
    token,
    account,
    persist: async () => assert.fail("checkout should not be called"),
    persistRecurring,
  });

  assert.equal(res.status, 200);
  assert.deepEqual(saved[0], {
    p_account: account,
    p_event_id: "evt_pay_rcv_1",
    p_event_type: "PAYMENT_RECEIVED",
    p_subscription_id: "sub_test_200",
    p_pix_authorization_id: "",
    p_payment_id: "pay_test_100",
    p_external_reference: "10000000-0000-4000-8000-000000000001",
    p_resource_status: "RECEIVED",
    p_value_cents: 4990,
    p_cycle: null,
  });
});

test("webhook processes PAYMENT_CONFIRMED and handles idempotency on duplicate call", async () => {
  let callCount = 0;
  const persistRecurring = async () => {
    callCount++;
    return true;
  };
  const body = {
    id: "evt_pay_cnf_1",
    event: "PAYMENT_CONFIRMED",
    account: { id: account },
    payment: {
      id: "pay_test_101",
      subscription: "sub_test_201",
      status: "CONFIRMED",
      externalReference: "10000000-0000-4000-8000-000000000001",
    },
  };

  const res1 = await handleAsaasSandboxWebhook(makeReq(body), {
    enabled: true,
    token,
    account,
    persist: async () => {},
    persistRecurring,
  });
  const res2 = await handleAsaasSandboxWebhook(makeReq(body), {
    enabled: true,
    token,
    account,
    persist: async () => {},
    persistRecurring,
  });

  assert.equal(res1.status, 200);
  assert.equal(res2.status, 200);
  assert.equal(callCount, 2);
});

test("webhook processes PAYMENT_OVERDUE correctly", async () => {
  const saved = [];
  const persistRecurring = async (fields) => {
    saved.push(fields);
    return true;
  };
  const body = {
    id: "evt_pay_ovd_1",
    event: "PAYMENT_OVERDUE",
    account: { id: account },
    payment: {
      id: "pay_overdue_1",
      subscription: "sub_test_300",
      status: "OVERDUE",
      externalReference: "10000000-0000-4000-8000-000000000001",
    },
  };

  const res = await handleAsaasSandboxWebhook(makeReq(body), {
    enabled: true,
    token,
    account,
    persist: async () => {},
    persistRecurring,
  });

  assert.equal(res.status, 200);
  assert.equal(saved[0].p_event_type, "PAYMENT_OVERDUE");
  assert.equal(saved[0].p_resource_status, "OVERDUE");
  assert.equal(saved[0].p_payment_id, "pay_overdue_1");
});

test("webhook processes PAYMENT_RESTORED correctly", async () => {
  const saved = [];
  const persistRecurring = async (fields) => {
    saved.push(fields);
    return true;
  };
  const body = {
    id: "evt_pay_rst_1",
    event: "PAYMENT_RESTORED",
    account: { id: account },
    payment: {
      id: "pay_restored_1",
      subscription: "sub_test_300",
      status: "PENDING",
      externalReference: "10000000-0000-4000-8000-000000000001",
    },
  };

  const res = await handleAsaasSandboxWebhook(makeReq(body), {
    enabled: true,
    token,
    account,
    persist: async () => {},
    persistRecurring,
  });

  assert.equal(res.status, 200);
  assert.equal(saved[0].p_event_type, "PAYMENT_RESTORED");
  assert.equal(saved[0].p_payment_id, "pay_restored_1");
});

test("webhook processes SUBSCRIPTION_CANCELED and SUBSCRIPTION_DELETED correctly", async () => {
  const saved = [];
  const persistRecurring = async (fields) => {
    saved.push(fields);
    return true;
  };
  const body1 = {
    id: "evt_sub_cnc_1",
    event: "SUBSCRIPTION_CANCELED",
    account: { id: account },
    subscription: {
      id: "sub_cancel_1",
      status: "CANCELED",
      externalReference: "10000000-0000-4000-8000-000000000001",
    },
  };
  const body2 = {
    id: "evt_sub_del_1",
    event: "SUBSCRIPTION_DELETED",
    account: { id: account },
    subscription: {
      id: "sub_cancel_2",
      status: "INACTIVE",
    },
  };

  const res1 = await handleAsaasSandboxWebhook(makeReq(body1), {
    enabled: true,
    token,
    account,
    persist: async () => {},
    persistRecurring,
  });
  const res2 = await handleAsaasSandboxWebhook(makeReq(body2), {
    enabled: true,
    token,
    account,
    persist: async () => {},
    persistRecurring,
  });

  assert.equal(res1.status, 200);
  assert.equal(res2.status, 200);
  assert.equal(saved[0].p_event_type, "SUBSCRIPTION_CANCELED");
  assert.equal(saved[0].p_subscription_id, "sub_cancel_1");
  assert.equal(saved[1].p_event_type, "SUBSCRIPTION_DELETED");
  assert.equal(saved[1].p_subscription_id, "sub_cancel_2");
});

test("webhook parses root-level externalReference correctly", async () => {
  const saved = [];
  const persistRecurring = async (fields) => {
    saved.push(fields);
    return true;
  };
  const body = {
    id: "evt_root_ref_1",
    event: "PAYMENT_RECEIVED",
    account: { id: account },
    externalReference: "20000000-0000-4000-8000-000000000002",
    payment: {
      id: "pay_test_root_1",
      subscription: "sub_test_root_1",
      status: "RECEIVED",
    },
  };

  const res = await handleAsaasSandboxWebhook(makeReq(body), {
    enabled: true,
    token,
    account,
    persist: async () => {},
    persistRecurring,
  });

  assert.equal(res.status, 200);
  assert.equal(saved[0].p_external_reference, "20000000-0000-4000-8000-000000000002");
});

test("migration 20261111100000 installs webhook automation and platform billing overview", async () => {
  const sql = await readFile(
    new URL("../supabase/migrations/20261111100000_asaas_webhook_automation_and_platform_billing.sql", import.meta.url),
    "utf8"
  );

  // Platform overview RPC
  assert.match(sql, /drop function if exists public\.get_platform_barbershop_overview/i);
  assert.match(sql, /create or replace function public\.get_platform_barbershop_overview/i);
  assert.match(sql, /billing_mode text/i);
  assert.match(sql, /billing_cycle text/i);
  assert.match(sql, /cancellation_scheduled boolean/i);
  assert.match(sql, /invoices_paid bigint/i);
  assert.match(sql, /invoices_pending bigint/i);
  assert.match(sql, /invoices_overdue bigint/i);
  assert.match(sql, /asaas_status text/i);
  assert.match(sql, /responsible_name text/i);
  assert.match(sql, /contact_phone text/i);
  assert.match(sql, /notification_email text/i);
  assert.match(sql, /nullif\(trim\(rd\.responsible_name\)/);
  assert.match(sql, /nullif\(trim\(rd\.responsible_phone\)/);

  // Instant reconciliation in persist_asaas_recurring_subscription_event
  assert.match(sql, /create or replace function public\.persist_asaas_recurring_subscription_event/i);
  assert.match(sql, /PAYMENT_RECEIVED/);
  assert.match(sql, /PAYMENT_CONFIRMED/);
  assert.match(sql, /PAYMENT_OVERDUE/);
  assert.match(sql, /PAYMENT_RESTORED/);
  assert.match(sql, /SUBSCRIPTION_CANCELED/);
  assert.match(sql, /SUBSCRIPTION_DELETED/);
  assert.match(sql, /current_period_ends_at = v_end_at/);
  assert.match(sql, /status = 'active'/);
  assert.match(sql, /subscription_paid_periods/);
  assert.match(sql, /private\.write_audit_log/);
  assert.match(sql, /subscription\.payment_confirmed/);
  assert.match(sql, /platform_support_tickets/);
  assert.match(sql, /Alerta de Retenção/);
  assert.match(sql, /exception when others then/);
  assert.match(sql, /grant execute on function public\.persist_asaas_recurring_subscription_event.*to service_role/i);
});

test("platform page displays centralized billing, Asaas indicators and retention alerts", async () => {
  const [page, css] = await Promise.all([
    readFile(new URL("../app/plataforma/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/plataforma/platform.module.css", import.meta.url), "utf8"),
  ]);

  assert.match(page, /loadPlatformAdministration/);
  assert.match(page, /buildWhatsAppLink/);
  assert.match(page, /buildTelephoneLink/);
  assert.match(page, /mailto:/);
  assert.match(page, /Gestão de Assinaturas e Cobranças/);
  assert.match(page, /Cancelamento Agendado/);
  assert.match(page, /Atuar Retenção/);
  assert.match(page, /Faturas/);
  assert.match(page, /Modalidade/);
  assert.match(page, /Acesso interno não autorizado/);
  assert.match(page, /href="\/plataforma\/suporte"/);
  assert.match(page, /href="\/plataforma\/incidentes"/);
  assert.doesNotMatch(page, /\/painel/);

  assert.match(css, /\.billingSummary/);
  assert.match(css, /\.retentionBadge/);
  assert.match(css, /\.retentionActionBtn/);
  assert.match(css, /\.filterBar/);
});
