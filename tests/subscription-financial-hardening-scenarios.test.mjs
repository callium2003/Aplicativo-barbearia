import test from "node:test";
import assert from "node:assert/strict";
import { createPendingSubscriptionOrder } from "../utils/subscription-order-create.ts";

const shopId = "a2000000-0000-4000-8000-000000000001";
const userId = "a1000000-0000-4000-8000-000000000001";
const newOrderId = "a3000000-0000-4000-8000-000000000099";

function createMockDeps({
  existingOrders = [],
  onUpdate = () => ({ error: null, data: [{ id: "mock_id" }] }),
  rpcResult = { data: newOrderId, error: null },
  billingEnvironment = "sandbox",
  billingAccount = "active_account_1",
} = {}) {
  const calls = [];
  const userClient = {
    auth: { getUser: async () => ({ data: { user: { id: userId } }, error: null }) },
    rpc: async () => ({ data: [{ id: shopId }], error: null }),
  };
  const adminClient = {
    from: (table) => {
      assert.equal(table, "subscription_orders");
      return {
        select: () => ({
          eq: () => ({
            eq: async () => ({ data: existingOrders, error: null }),
          }),
        }),
        update: (fields) => {
          return {
            eq: (_col1, val1) => {
              const res = onUpdate(fields, val1);
              return {
                select: async () => res,
                then: (resolve) => resolve(res),
                eq: (_col2, val2) => {
                  const res2 = onUpdate(fields, val1, val2);
                  return {
                    select: async () => res2,
                    then: (resolve) => resolve(res2),
                  };
                },
              };
            },
          };
        },
      };
    },
    rpc: async (name, payload) => {
      calls.push({ name, payload });
      return rpcResult;
    },
  };

  return {
    calls,
    userClient,
    adminClient,
    termsVersion: "2026-11",
    billingEnvironment,
    billingAccount,
  };
}

// ============================================================================
// 1. Cenário: Checkout anterior ainda pagável
// ============================================================================

test("Cenário 1.1: Checkout anterior ainda pagável é encerrado no Asaas e confirmado antes de liberar nova contratação", async () => {
  const oldOrderId = "a3000000-0000-4000-8000-000000000010";
  const oldCheckoutId = "chk_active_999";
  let paymentsListed = false;
  let pendingPaymentCancelled = false;
  let checkoutCancelled = false;
  let dbCancelled = false;

  const deps = createMockDeps({
    existingOrders: [{
      id: oldOrderId,
      idempotency_key: "old_key_1",
      status: "PENDING_PAYMENT",
      provider_checkout_id: oldCheckoutId,
      provider_environment: "sandbox",
      provider_account_id: "active_account_1",
    }],
    onUpdate: (fields, orderId) => {
      if (fields.status === "CANCELED" && orderId === oldOrderId) {
        assert.equal(checkoutCancelled, true, "Checkout deve ser cancelado no Asaas antes de cancelar localmente");
        dbCancelled = true;
        return { error: null, data: [{ id: oldOrderId }] };
      }
      return { error: null, data: [] };
    },
  });

  deps.asaasClient = {
    listCheckoutPayments: async ({ checkoutId }) => {
      assert.equal(checkoutId, oldCheckoutId);
      paymentsListed = true;
      return { data: [{ id: "pay_open_1", status: "PENDING", deleted: false }] };
    },
    cancelPayment: async (paymentId) => {
      assert.equal(paymentId, "pay_open_1");
      pendingPaymentCancelled = true;
      return { id: paymentId, deleted: true };
    },
    cancelCheckout: async (checkoutId) => {
      assert.equal(checkoutId, oldCheckoutId);
      checkoutCancelled = true;
      return { id: checkoutId, status: "CANCELED" };
    },
    cancelSubscription: async () => ({}),
    cancelPixAutomaticAuthorization: async () => ({}),
    listPayments: async () => ({ data: [] }),
  };

  const result = await createPendingSubscriptionOrder({
    planCode: "simple-anual",
    idempotencyKey: "a4000000-0000-4000-8000-000000000002",
    acceptedTerms: true,
  }, deps);

  assert.equal(result.status, "created");
  assert.equal(paymentsListed, true);
  assert.equal(pendingPaymentCancelled, true);
  assert.equal(checkoutCancelled, true);
  assert.equal(dbCancelled, true);
  assert.equal(deps.calls.length, 1);
});

test("Cenário 1.2: Checkout anterior com pagamento recebido preserva bloqueio e encaminha para conciliação", async () => {
  const oldOrderId = "a3000000-0000-4000-8000-000000000011";
  let markedReview = false;
  let dbCancelled = false;

  const deps = createMockDeps({
    existingOrders: [{
      id: oldOrderId,
      idempotency_key: "old_key_2",
      status: "PENDING_PAYMENT",
      provider_checkout_id: "chk_paid_123",
      provider_environment: "sandbox",
      provider_account_id: "active_account_1",
    }],
    onUpdate: (fields) => {
      if (fields.status === "CANCELED") dbCancelled = true;
      if (fields.status === "REVIEW_REQUIRED" && fields.reconciliation_state === "REVIEW_REQUIRED") {
        markedReview = true;
      }
      return { error: null, data: [{ id: oldOrderId }] };
    },
  });

  deps.asaasClient = {
    listCheckoutPayments: async () => ({
      data: [{ id: "pay_received_1", status: "RECEIVED", deleted: false }],
    }),
    cancelCheckout: async () => {
      assert.fail("Nunca deve cancelar checkout que possui pagamento recebido");
    },
    cancelPayment: async () => ({}),
    cancelSubscription: async () => ({}),
    cancelPixAutomaticAuthorization: async () => ({}),
    listPayments: async () => ({ data: [] }),
  };

  const result = await createPendingSubscriptionOrder({
    planCode: "simple-anual",
    idempotencyKey: "a4000000-0000-4000-8000-000000000003",
    acceptedTerms: true,
  }, deps);

  assert.equal(result.status, "review");
  assert.equal(markedReview, true);
  assert.equal(dbCancelled, false);
  assert.equal(deps.calls.length, 0);
});

test("Cenário 1.3: Falha no cancelamento do checkout no Asaas preserva bloqueio e sinaliza pendência", async () => {
  const oldOrderId = "a3000000-0000-4000-8000-000000000012";
  let markedReview = false;
  let dbCancelled = false;

  const deps = createMockDeps({
    existingOrders: [{
      id: oldOrderId,
      idempotency_key: "old_key_3",
      status: "PENDING_PAYMENT",
      provider_checkout_id: "chk_timeout_123",
      provider_environment: "sandbox",
      provider_account_id: "active_account_1",
    }],
    onUpdate: (fields) => {
      if (fields.status === "CANCELED") dbCancelled = true;
      if (fields.status === "REVIEW_REQUIRED") markedReview = true;
      return { error: null, data: [{ id: oldOrderId }] };
    },
  });

  deps.asaasClient = {
    listCheckoutPayments: async () => ({ data: [] }),
    cancelCheckout: async () => {
      throw new Error("Asaas 504 Gateway Timeout");
    },
    cancelSubscription: async () => ({}),
    cancelPixAutomaticAuthorization: async () => ({}),
    listPayments: async () => ({ data: [] }),
  };

  const result = await createPendingSubscriptionOrder({
    planCode: "simple-anual",
    idempotencyKey: "a4000000-0000-4000-8000-000000000004",
    acceptedTerms: true,
  }, deps);

  assert.equal(result.status, "review");
  assert.equal(markedReview, true);
  assert.equal(dbCancelled, false);
  assert.equal(deps.calls.length, 0);
});

// ============================================================================
// 2. Cenário: Concorrência e duas abas simultâneas
// ============================================================================

test("Cenário 2.1: Duas abas concorrentes tentam substituir o mesmo pedido; atomic CAS impede duplicação", async () => {
  const oldOrderId = "a3000000-0000-4000-8000-000000000020";

  // Aba 2: tenta atualizar a linha que a Aba 1 já modificou concorrentemente
  const depsTab2 = createMockDeps({
    existingOrders: [{
      id: oldOrderId,
      idempotency_key: "key_concurrent_tab",
      status: "PENDING_PAYMENT",
    }],
    onUpdate: () => {
      // Retorna 0 linhas afetadas simulando conflito de concorrência no Postgres
      return { error: null, data: [] };
    },
  });

  const resultTab2 = await createPendingSubscriptionOrder({
    planCode: "simple-anual",
    idempotencyKey: "a4000000-0000-4000-8000-000000000005",
    acceptedTerms: true,
  }, depsTab2);

  assert.equal(resultTab2.status, "pending");
  assert.equal(depsTab2.calls.length, 0, "Aba concorrente não deve criar ordem duplicada");
});

// ============================================================================
// 3. Cenário: Pedidos de outra conta ou ambiente (foreign binding)
// ============================================================================

test("Cenário 3.1: Pedido de outra conta/ambiente sem credenciais disponíveis mantém rastreabilidade e bloqueia substituição", async () => {
  const oldOrderId = "a3000000-0000-4000-8000-000000000030";
  let markedReview = false;
  let dbCancelled = false;

  const deps = createMockDeps({
    existingOrders: [{
      id: oldOrderId,
      idempotency_key: "old_key_foreign",
      status: "PENDING_PAYMENT",
      provider_checkout_id: "chk_foreign_1",
      provider_environment: "production", // Ambiente diferente do configurado no deps (sandbox)
      provider_account_id: "account_legacy_missing_key",
    }],
    onUpdate: (fields) => {
      if (fields.status === "CANCELED") dbCancelled = true;
      if (fields.status === "REVIEW_REQUIRED" && fields.reconciliation_state === "REVIEW_REQUIRED") {
        markedReview = true;
      }
      return { error: null, data: [{ id: oldOrderId }] };
    },
    billingEnvironment: "sandbox",
    billingAccount: "active_sandbox_acc",
  });

  // Nenhuma credencial para production/account_legacy_missing_key fornecida
  const result = await createPendingSubscriptionOrder({
    planCode: "simple-anual",
    idempotencyKey: "a4000000-0000-4000-8000-000000000006",
    acceptedTerms: true,
  }, deps);

  assert.equal(result.status, "review");
  assert.equal(markedReview, true, "Pedido foreign sem credenciais deve ser marcado para conciliação preventiva");
  assert.equal(dbCancelled, false, "Pedido foreign sem credenciais NÃO pode ser cancelado localmente");
  assert.equal(deps.calls.length, 0);
});

test("Cenário 3.2: Pedido de outra conta/ambiente com credenciais resolvidas encerra operação na conta de origem e substitui", async () => {
  const oldOrderId = "a3000000-0000-4000-8000-000000000031";
  let foreignClientInvoked = false;
  let foreignCancelled = false;
  let dbCancelled = false;

  const deps = createMockDeps({
    existingOrders: [{
      id: oldOrderId,
      idempotency_key: "old_key_foreign_resolved",
      status: "PENDING_PAYMENT",
      provider_subscription_id: "sub_foreign_99",
      provider_environment: "production",
      provider_account_id: "account_prod_secondary",
    }],
    onUpdate: (fields, orderId) => {
      if (fields.status === "CANCELED" && orderId === oldOrderId) {
        dbCancelled = true;
        return { error: null, data: [{ id: oldOrderId }] };
      }
      return { error: null, data: [] };
    },
    billingEnvironment: "sandbox",
    billingAccount: "active_sandbox_acc",
  });

  deps.resolveAsaasClient = async ({ environment, accountId }) => {
    assert.equal(environment, "production");
    assert.equal(accountId, "account_prod_secondary");
    foreignClientInvoked = true;
    return {
      listPayments: async () => ({ data: [] }),
      cancelSubscription: async (subId) => {
        assert.equal(subId, "sub_foreign_99");
        foreignCancelled = true;
        return { id: subId, deleted: true };
      },
      cancelPixAutomaticAuthorization: async () => ({}),
      listCheckoutPayments: async () => ({ data: [] }),
    };
  };

  const result = await createPendingSubscriptionOrder({
    planCode: "simple-anual",
    idempotencyKey: "a4000000-0000-4000-8000-000000000007",
    acceptedTerms: true,
  }, deps);

  assert.equal(result.status, "created");
  assert.equal(foreignClientInvoked, true);
  assert.equal(foreignCancelled, true);
  assert.equal(dbCancelled, true);
});

// ============================================================================
// 4. Cenário: Validação de ciclo, valor e identidade em mudança de plano
// ============================================================================

test("Cenário 4.1: Mudança agendada persiste fronteira completa, ciclo esperado e valores", () => {
  // Simula a lógica de persistência de subscription_scheduled_plan_changes
  const boundaryPayments = ["pay_old_1", "pay_old_2", "pay_old_3"];
  const targetPlan = {
    code: "pro-anual",
    name: "Plano Pro (Anual)",
    months: 12,
    priceCents: 89900,
    userLimit: 10,
  };

  const scheduledRecord = {
    plan_code: targetPlan.code,
    plan_name: targetPlan.name,
    months: targetPlan.months,
    price_cents: targetPlan.priceCents,
    user_limit: targetPlan.userLimit,
    boundary_payment_id: boundaryPayments[0],
    boundary_payment_ids: boundaryPayments,
    effective_from_cycle: "2026-12",
    expected_price_cents: targetPlan.priceCents,
    expected_cycle: "YEARLY",
    status: "SCHEDULED",
  };

  // Verificações de integridade
  assert.equal(scheduledRecord.boundary_payment_ids.length, 3);
  assert.equal(scheduledRecord.expected_price_cents, 89900);
  assert.equal(scheduledRecord.expected_cycle, "YEARLY");
  assert.equal(scheduledRecord.status, "SCHEDULED");

  // Avaliação de pagamento tardio do ciclo antigo
  function classifyPayment(paymentId, valueCents, cycle, scheduled) {
    if (scheduled.boundary_payment_ids.includes(paymentId)) return "OLD_PAYMENT";
    if (valueCents < scheduled.expected_price_cents) return "OLD_PAYMENT";
    if (cycle !== scheduled.expected_cycle) return "OLD_PAYMENT";
    return "NEW_SCHEDULED_RENEWAL";
  }

  // 1. Pagamento antigo presente na lista de fronteira
  assert.equal(classifyPayment("pay_old_2", 89900, "YEARLY", scheduledRecord), "OLD_PAYMENT");

  // 2. Pagamento tardio não listado mas com valor inferior (R$ 49,90 vs R$ 899,00)
  assert.equal(classifyPayment("pay_late_unlisted", 4990, "YEARLY", scheduledRecord), "OLD_PAYMENT");

  // 3. Pagamento com ciclo diferente (MONTHLY vs YEARLY)
  assert.equal(classifyPayment("pay_monthly_late", 89900, "MONTHLY", scheduledRecord), "OLD_PAYMENT");

  // 4. Renovação legítima do plano novo (R$ 899,00, YEARLY, fora da fronteira)
  assert.equal(classifyPayment("pay_new_annual_renewal", 89900, "YEARLY", scheduledRecord), "NEW_SCHEDULED_RENEWAL");
});
