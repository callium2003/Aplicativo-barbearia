import test from "node:test";
import assert from "node:assert/strict";
import { createPendingSubscriptionOrder } from "../utils/subscription-order-create.ts";

const key = "a4000000-0000-4000-8000-000000000001";
const shop = "a2000000-0000-4000-8000-000000000001";
const order = "a3000000-0000-4000-8000-000000000001";
const user = "a1000000-0000-4000-8000-000000000001";
const input = { planCode: "simple-anual", idempotencyKey: key, acceptedTerms: true };
function dependencies({ owner = true, session = true, failure = null } = {}) {
  const calls = [];
  const userClient = { auth: { getUser: async () => ({ data: { user: session ? { id: user } : null }, error: null }) },
    rpc: async () => ({ data: owner ? [{ id: shop }] : [], error: null }) };
  const adminClient = { rpc: async (name, payload) => { calls.push({ name, payload }); return { data: order, error: failure }; } };
  return { calls, userClient, adminClient, termsVersion: "sandbox-v1" };
}

test("creates a pending order using authenticated owner and server catalog", async () => {
  const deps = dependencies();
  assert.deepEqual(await createPendingSubscriptionOrder(input, deps), { status: "created", orderId: order });
  assert.equal(deps.calls[0].name, "create_subscription_order");
  assert.deepEqual(deps.calls[0].payload, { p_barbershop_id: shop, p_requester_id: user, p_idempotency_key: key,
    p_plan_code: "simple-anual", p_plan_name: "Plano Simple (Anual)", p_months: 12, p_price_cents: 49900,
    p_max_installments: 1, p_user_limit: 3, p_terms_version: "sandbox-v1" });
});

test("does not call privileged database for invalid, unauthenticated or non-owner requests", async () => {
  for (const [change, options, status] of [[{ acceptedTerms: false }, {}, "invalid"], [{ idempotencyKey: "bad" }, {}, "invalid"],
    [{ planCode: "anual" }, {}, "invalid"], [{}, { session: false }, "unauthenticated"], [{}, { owner: false }, "forbidden"]]) {
    const deps = dependencies(options);
    assert.equal((await createPendingSubscriptionOrder({ ...input, ...change }, deps)).status, status);
    assert.equal(deps.calls.length, 0);
  }
});

test("creates a monthly pending order from the server catalog", async () => {
  const deps = dependencies();
  const result = await createPendingSubscriptionOrder({ ...input, planCode: "simple-mensal" }, deps);
  assert.deepEqual(result, { status: "created", orderId: order });
  assert.equal(deps.calls[0].payload.p_months, 1);
  assert.equal(deps.calls[0].payload.p_price_cents, 4990);
  assert.equal(deps.calls[0].payload.p_max_installments, 1);
});

test("does not trust client supplied price or tenant and does not swallow database errors", async () => {
  const deps = dependencies();
  await createPendingSubscriptionOrder({ ...input, priceCents: 1, barbershopId: "other" }, deps);
  assert.equal(deps.calls[0].payload.p_price_cents, 49900);
  assert.equal(deps.calls[0].payload.p_barbershop_id, shop);
  await assert.rejects(createPendingSubscriptionOrder(input, dependencies({ failure: new Error("failed") })), /failed/);
});

test("classifies a protected duplicate or review result without exposing database details", async () => {
  for (const [code, status] of [["23505", "pending"], ["55000", "review"]]) {
    const result = await createPendingSubscriptionOrder(input, dependencies({ failure: { code } }));
    assert.equal(result.status, status);
  }
});

test("superseding pending order cancels Asaas subscription before canceling DB order", async () => {
  let asaasCancelled = false;
  let dbCancelled = false;
  const oldOrderId = "a3000000-0000-4000-8000-000000000099";
  const oldSubId = "sub_test_12345";
  const deps = dependencies();

  deps.adminClient.from = (table) => {
    assert.equal(table, "subscription_orders");
    return {
      select: () => ({
        eq: () => ({
          eq: async () => ({
            data: [{
              id: oldOrderId,
              idempotency_key: "a4000000-0000-4000-8000-000000000099",
              status: "PENDING_PAYMENT",
              provider_subscription_id: oldSubId,
            }],
          }),
        }),
      }),
      update: (fields) => ({
        eq: (_f1, v1) => ({
          eq: async () => {
            if (fields.status === "CANCELED" && v1 === oldOrderId) {
              assert.equal(asaasCancelled, true, "Asaas must be canceled before DB cancellation");
              dbCancelled = true;
            }
            return { error: null };
          },
        }),
      }),
    };
  };

  deps.asaasClient = {
    listPayments: async () => ({ data: [{ id: "pay_1", status: "PENDING", deleted: false }] }),
    cancelSubscription: async (subId) => {
      assert.equal(subId, oldSubId);
      asaasCancelled = true;
      return { id: subId, deleted: true };
    },
    cancelPixAutomaticAuthorization: async () => ({}),
    listCheckoutPayments: async () => ({ data: [] }),
  };

  const result = await createPendingSubscriptionOrder(input, deps);
  assert.equal(result.status, "created");
  assert.equal(asaasCancelled, true);
  assert.equal(dbCancelled, true);
});

test("superseding pending order with paid payment preserves pending order and prevents duplicate", async () => {
  const deps = dependencies();
  deps.adminClient.from = () => ({
    select: () => ({
      eq: () => ({
        eq: async () => ({
          data: [{
            id: "old_ord_1",
            idempotency_key: "a4000000-0000-4000-8000-000000000099",
            status: "PENDING_PAYMENT",
            provider_subscription_id: "sub_1",
          }],
        }),
      }),
    }),
    update: () => {
      assert.fail("Should not cancel paid order in DB");
    },
  });

  deps.asaasClient = {
    listPayments: async () => ({ data: [{ id: "pay_1", status: "CONFIRMED", deleted: false }] }),
    cancelSubscription: async () => {
      assert.fail("Should not cancel paid subscription in Asaas");
    },
    cancelPixAutomaticAuthorization: async () => ({}),
    listCheckoutPayments: async () => ({ data: [] }),
  };

  const result = await createPendingSubscriptionOrder(input, deps);
  assert.equal(result.status, "pending");
  assert.equal(deps.calls.length, 0, "Should not call create_subscription_order");
});

test("superseding pending order aborts safely on Asaas communication failure without DB cancellation", async () => {
  const deps = dependencies();
  let dbCancelled = false;
  deps.adminClient.from = () => ({
    select: () => ({
      eq: () => ({
        eq: async () => ({
          data: [{
            id: "old_ord_1",
            idempotency_key: "a4000000-0000-4000-8000-000000000099",
            status: "PENDING_PAYMENT",
            provider_subscription_id: "sub_1",
          }],
        }),
      }),
    }),
    update: (fields) => {
      if (fields?.status === "CANCELED") dbCancelled = true;
      return {
        eq: () => ({
          eq: async () => ({ error: null }),
        }),
      };
    },
  });

  deps.asaasClient = {
    listPayments: async () => {
      throw new Error("Network timeout contacting Asaas");
    },
    cancelSubscription: async () => ({}),
    cancelPixAutomaticAuthorization: async () => ({}),
    listCheckoutPayments: async () => ({ data: [] }),
  };

  const result = await createPendingSubscriptionOrder(input, deps);
  assert.equal(result.status, "review");
  assert.equal(dbCancelled, false, "Must not cancel local DB order on communication failure");
  assert.equal(deps.calls.length, 0);
});

test("superseding pending order from foreign environment blocks replacement and marks review when credentials unavailable", async () => {
  const deps = dependencies();
  let dbCancelled = false;
  let markedReview = false;
  deps.billingEnvironment = "production";
  deps.billingAccount = "prod_account_123";

  deps.adminClient.from = () => ({
    select: () => ({
      eq: () => ({
        eq: async () => ({
          data: [{
            id: "old_ord_sandbox",
            idempotency_key: "a4000000-0000-4000-8000-000000000099",
            status: "PENDING_PAYMENT",
            provider_subscription_id: "sub_sandbox_1",
            provider_environment: "sandbox",
            provider_account_id: "sandbox_account_999",
          }],
        }),
      }),
    }),
    update: (fields) => {
      if (fields.status === "CANCELED") dbCancelled = true;
      if (fields.status === "REVIEW_REQUIRED" && fields.reconciliation_state === "REVIEW_REQUIRED") markedReview = true;
      return {
        eq: () => ({
          eq: async () => ({ error: null, data: [] }),
        }),
      };
    },
  });

  deps.asaasClient = {
    listPayments: async () => ({ data: [] }),
    cancelSubscription: async () => ({}),
    cancelPixAutomaticAuthorization: async () => ({}),
    listCheckoutPayments: async () => ({ data: [] }),
  };

  const result = await createPendingSubscriptionOrder(input, deps);
  assert.equal(result.status, "review");
  assert.equal(dbCancelled, false, "Must not cancel foreign pending order without credentials");
  assert.equal(markedReview, true, "Must mark order as REVIEW_REQUIRED for conciliation");
  assert.equal(deps.calls.length, 0);
});

test("superseding pending order from foreign environment with resolved client terminates operation and supersedes", async () => {
  const deps = dependencies();
  let foreignClientUsed = false;
  let dbCancelled = false;
  deps.billingEnvironment = "production";
  deps.billingAccount = "prod_account_123";

  deps.adminClient.from = () => ({
    select: () => ({
      eq: () => ({
        eq: async () => ({
          data: [{
            id: "old_ord_sandbox",
            idempotency_key: "a4000000-0000-4000-8000-000000000099",
            status: "PENDING_PAYMENT",
            provider_subscription_id: "sub_sandbox_1",
            provider_environment: "sandbox",
            provider_account_id: "sandbox_account_999",
          }],
        }),
      }),
    }),
    update: (fields) => {
      if (fields.status === "CANCELED") dbCancelled = true;
      return {
        eq: () => ({
          eq: () => ({
            select: async () => ({ error: null, data: [{ id: "old_ord_sandbox" }] }),
          }),
        }),
      };
    },
  });

  deps.resolveAsaasClient = async ({ environment, accountId }) => {
    assert.equal(environment, "sandbox");
    assert.equal(accountId, "sandbox_account_999");
    foreignClientUsed = true;
    return {
      listPayments: async () => ({ data: [] }),
      cancelSubscription: async () => ({ id: "sub_sandbox_1", deleted: true }),
      cancelPixAutomaticAuthorization: async () => ({}),
      listCheckoutPayments: async () => ({ data: [] }),
    };
  };

  const result = await createPendingSubscriptionOrder(input, deps);
  assert.equal(result.status, "created");
  assert.equal(foreignClientUsed, true);
  assert.equal(dbCancelled, true);
});

test("superseding pending checkout terminates checkout and pending payments in Asaas before DB cancellation", async () => {
  const deps = dependencies();
  let checkoutCancelled = false;
  let pendingPaymentCancelled = false;
  let dbCancelled = false;

  deps.adminClient.from = () => ({
    select: () => ({
      eq: () => ({
        eq: async () => ({
          data: [{
            id: "old_ord_chk",
            idempotency_key: "a4000000-0000-4000-8000-000000000099",
            status: "PENDING_PAYMENT",
            provider_checkout_id: "chk_active_123",
          }],
        }),
      }),
    }),
    update: (fields) => {
      if (fields.status === "CANCELED") dbCancelled = true;
      return {
        eq: () => ({
          eq: () => ({
            select: async () => ({ error: null, data: [{ id: "old_ord_chk" }] }),
          }),
        }),
      };
    },
  });

  deps.asaasClient = {
    listCheckoutPayments: async ({ checkoutId }) => {
      assert.equal(checkoutId, "chk_active_123");
      return { data: [{ id: "pay_open_1", status: "PENDING", deleted: false }] };
    },
    cancelPayment: async (paymentId) => {
      assert.equal(paymentId, "pay_open_1");
      pendingPaymentCancelled = true;
      return { id: paymentId, deleted: true };
    },
    cancelCheckout: async (checkoutId) => {
      assert.equal(checkoutId, "chk_active_123");
      checkoutCancelled = true;
      return { id: checkoutId, status: "CANCELED" };
    },
    cancelSubscription: async () => ({}),
    cancelPixAutomaticAuthorization: async () => ({}),
    listPayments: async () => ({ data: [] }),
  };

  const result = await createPendingSubscriptionOrder(input, deps);
  assert.equal(result.status, "created");
  assert.equal(pendingPaymentCancelled, true);
  assert.equal(checkoutCancelled, true);
  assert.equal(dbCancelled, true);
});

test("superseding pending checkout with confirmed payment blocks replacement and marks review", async () => {
  const deps = dependencies();
  let dbCancelled = false;
  let markedReview = false;

  deps.adminClient.from = () => ({
    select: () => ({
      eq: () => ({
        eq: async () => ({
          data: [{
            id: "old_ord_chk",
            idempotency_key: "a4000000-0000-4000-8000-000000000099",
            status: "PENDING_PAYMENT",
            provider_checkout_id: "chk_active_123",
          }],
        }),
      }),
    }),
    update: (fields) => {
      if (fields.status === "CANCELED") dbCancelled = true;
      if (fields.status === "REVIEW_REQUIRED") markedReview = true;
      return {
        eq: async () => ({ error: null }),
      };
    },
  });

  deps.asaasClient = {
    listCheckoutPayments: async () => ({
      data: [{ id: "pay_paid_1", status: "CONFIRMED", deleted: false }],
    }),
    cancelCheckout: async () => {
      assert.fail("Must not cancel paid checkout");
    },
    cancelSubscription: async () => ({}),
    cancelPixAutomaticAuthorization: async () => ({}),
    listPayments: async () => ({ data: [] }),
  };

  const result = await createPendingSubscriptionOrder(input, deps);
  assert.equal(result.status, "review");
  assert.equal(dbCancelled, false);
  assert.equal(markedReview, true);
  assert.equal(deps.calls.length, 0);
});

test("concurrent superseding attempts (two tabs) are safely handled via atomic CAS", async () => {
  const deps = dependencies();

  deps.adminClient.from = () => ({
    select: () => ({
      eq: () => ({
        eq: async () => ({
          data: [{
            id: "old_ord_1",
            idempotency_key: "a4000000-0000-4000-8000-000000000099",
            status: "PENDING_PAYMENT",
          }],
        }),
      }),
    }),
    update: () => ({
      eq: () => ({
        eq: () => ({
          // Simulates that another tab already updated this row, returning 0 rows affected
          select: async () => ({ error: null, data: [] }),
        }),
      }),
    }),
  });

  const result = await createPendingSubscriptionOrder(input, deps);
  assert.equal(result.status, "pending");
  assert.equal(deps.calls.length, 0, "Second tab must not proceed with order creation");
});
