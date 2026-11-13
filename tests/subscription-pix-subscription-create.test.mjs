import test from "node:test";
import assert from "node:assert/strict";
import { createOrReuseSandboxPixSubscription } from "../utils/subscription-pix-subscription-create.ts";

const orderId = "a3000000-0000-4000-8000-000000000001";
const userId = "a1000000-0000-4000-8000-000000000001";
const invoiceUrl = "https://sandbox.asaas.com/i/0_xubzbdzcspl5u1";

function makeDeps(state = "CLAIMED") {
  const calls = [];
  return {
    calls,
    account: "account-1",
    userClient: {
      auth: {
        getUser: async () => ({ data: { user: { id: userId, email: "owner@example.test" } }, error: null }),
      },
    },
    adminClient: {
      rpc: async (name, args) => {
        calls.push({ name, args });
        if (name === "claim_subscription_recurring_operation") {
          return {
            data: {
              state,
              orderId,
              barbershopId: "shop-1",
              planCode: "simple-mensal",
              planName: "Plano Simple",
              priceCents: 4990,
              subscriptionId: "sub_existing_1",
            },
            error: null,
          };
        }
        return { data: null, error: null };
      },
      from: (table) => ({
        update: (fields) => ({
          eq: async () => {
            calls.push({ name: `update:${table}`, fields });
            return { error: null };
          },
        }),
        select: () => ({
          eq: () => ({
            maybeSingle: async () => {
              if (table === "subscription_orders") return { data: { months: 1, plan_code: "simple-mensal", plan_name: "Plano Simple", price_cents: 4990 }, error: null };
              if (table === "barbershop_registration_details") {
                return {
                  data: {
                    responsible_name: "Carlos Silva",
                    responsible_phone: "11991808200",
                    tax_document: "14379410870",
                    postal_code: "04130010",
                    address_number: "1291",
                    neighborhood: "Vila Clementino",
                  },
                  error: null,
                };
              }
              if (table === "barbershops") {
                return {
                  data: {
                    name: "Mint Barbearia",
                    address: "Rua Loefgren, 1291",
                    phone: "11991808200",
                    notification_email: "mint@example.test",
                  },
                  error: null,
                };
              }
              return { data: null, error: null };
            },
          }),
        }),
      }),
    },
    asaasClient: {
      createCustomer: async (payload) => {
        calls.push({ name: "createCustomer", payload });
        return { id: "cus_0001" };
      },
      createSubscription: async (payload) => {
        calls.push({ name: "createSubscription", payload });
        return { id: "sub_0001" };
      },
      listPayments: async (filters) => {
        calls.push({ name: "listPayments", filters });
        return { data: [{ id: "pay_0001", invoiceUrl, status: "PENDING" }] };
      },
    },
  };
}

test("creates customer, recurring PIX subscription and returns validated Asaas invoice URL", async () => {
  const d = makeDeps("CLAIMED");
  const res = await createOrReuseSandboxPixSubscription(orderId, d);
  assert.deepEqual(res, {
    status: "ready",
    subscriptionId: "sub_0001",
    invoiceUrl,
  });

  const subCall = d.calls.find((c) => c.name === "createSubscription");
  assert.ok(subCall);
  assert.equal(subCall.payload.billingType, "PIX");
  assert.equal(subCall.payload.cycle, "MONTHLY");
  assert.equal(subCall.payload.value, 49.9);
  assert.equal(subCall.payload.externalReference, orderId);

  const finishCall = d.calls.find((c) => c.name === "finish_subscription_recurring_operation");
  assert.deepEqual(finishCall.args, {
    p_order_id: orderId,
    p_customer_id: "cus_0001",
    p_subscription_id: "sub_0001",
    p_authorization_id: null,
  });
});

test("reuses existing READY PIX subscription and returns its invoice URL", async () => {
  const d = makeDeps("READY");
  const res = await createOrReuseSandboxPixSubscription(orderId, d);
  assert.deepEqual(res, {
    status: "ready",
    subscriptionId: "sub_existing_1",
    invoiceUrl,
  });
  assert.equal(d.calls.filter((c) => c.name === "createSubscription").length, 0);
});
