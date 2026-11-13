import test from "node:test";
import assert from "node:assert/strict";
import { createOrReuseSandboxCheckout, resolveCheckoutCustomerData } from "../utils/subscription-checkout-create.ts";

const ALLOWED_ASAAS_CUSTOMER_KEYS = new Set([
  "name",
  "company",
  "observations",
  "email",
  "cpfCnpj",
  "phone",
  "mobilePhone",
  "postalCode",
  "address",
  "addressNumber",
  "complement",
  "province",
]);

function assertValidAsaasCustomerData(data) {
  if (data === undefined) return;
  assert.equal(typeof data, "object");
  assert.notEqual(data, null);
  for (const [key, value] of Object.entries(data)) {
    assert.ok(
      ALLOWED_ASAAS_CUSTOMER_KEYS.has(key),
      `Unexpected key "${key}" found in AsaasCustomerData`
    );
    assert.equal(
      typeof value,
      "string",
      `Expected string value for key "${key}", got ${typeof value}`
    );
    assert.ok(value.length > 0, `Key "${key}" should not be an empty string`);
  }
}

test("Challenger Edge Case 1: only barbershop name and user email (CorteAqui / barbaeriasp@gmail.com)", () => {
  const user = { email: "barbaeriasp@gmail.com" };
  const shop = { name: "CorteAqui" };
  const result = resolveCheckoutCustomerData(user, null, shop);

  assertValidAsaasCustomerData(result);
  assert.deepEqual(result, {
    name: "CorteAqui",
    company: "CorteAqui",
    email: "barbaeriasp@gmail.com",
  });
  assert.equal(result.cpfCnpj, undefined);
  assert.equal(result.phone, undefined);
  assert.equal(result.address, undefined);
});

test("Challenger Edge Case 2: only responsible name and phone", () => {
  const registration = {
    responsible_name: "Carlos Ferreira",
    responsible_phone: "(11) 98765-4321",
  };
  const result = resolveCheckoutCustomerData(null, registration, null);

  assertValidAsaasCustomerData(result);
  assert.deepEqual(result, {
    name: "Carlos Ferreira",
    phone: "11987654321",
    mobilePhone: "11987654321",
  });
  assert.equal(result.company, undefined);
  assert.equal(result.email, undefined);
  assert.equal(result.cpfCnpj, undefined);
});

test("Challenger Edge Case 3: extremely long strings (>120 chars) are safely bounded", () => {
  const longShopName = "Super Barbearia Premium Vintage & Spa ".repeat(10); // ~380 chars
  const longResponsibleName = "Alexandre de Albuquerque e Vasconcelos de Bragança ".repeat(10); // ~510 chars
  const longEmail = "valid.user." + "x".repeat(150) + "@dominio-extremamente-longo.com.br";
  const longAddress = "Avenida das Américas, Bloco A, Sala 405, ".repeat(10);
  const longAddressNumber = "123456789012345678901234567890"; // 30 chars
  const longProvince = "Bairro Jardim das Palmeiras Floridas e Encantadas ".repeat(4); // 200 chars

  const user = { email: longEmail };
  const registration = {
    responsible_name: longResponsibleName,
    tax_document: "14.379.410/0001-87",
    responsible_phone: "(11) 98765-4321",
    postal_code: "03273-400",
    address_number: longAddressNumber,
    neighborhood: longProvince,
  };
  const shop = {
    name: longShopName,
    address: longAddress,
  };

  const result = resolveCheckoutCustomerData(user, registration, shop);

  assertValidAsaasCustomerData(result);
  assert.ok(result);
  assert.ok(result.name.length <= 120, `name length was ${result.name.length}`);
  assert.ok(result.company.length <= 120, `company length was ${result.company.length}`);
  assert.ok(result.email.length <= 120, `email length was ${result.email.length}`);
  assert.ok(result.address.length <= 120, `address length was ${result.address.length}`);
  assert.ok(result.addressNumber.length <= 20, `addressNumber length was ${result.addressNumber.length}`);
  assert.ok(result.province.length <= 80, `province length was ${result.province.length}`);
});

test("Challenger Edge Case 4: invalid formats are safely omitted", () => {
  const invalidCases = [
    // Malformed emails
    { user: { email: "not-an-email" }, expectedEmail: undefined },
    { user: { email: "missing@domain" }, expectedEmail: undefined },
    { user: { email: "@domain.com" }, expectedEmail: undefined },
    { user: { email: "user@.com" }, expectedEmail: undefined },
    { user: { email: "user space@domain.com" }, expectedEmail: undefined },
    // Malformed CPF/CNPJ (not 11 or 14 digits)
    { reg: { tax_document: "123.456.789" }, expectedCpfCnpj: undefined }, // 9 digits
    { reg: { tax_document: "12.345.678-0" }, expectedCpfCnpj: undefined }, // 10 digits
    { reg: { tax_document: "123.456.789-012" }, expectedCpfCnpj: undefined }, // 12 digits
    { reg: { tax_document: "12.345.678/0001-9" }, expectedCpfCnpj: undefined }, // 13 digits
    { reg: { tax_document: "12.345.678/0001-901" }, expectedCpfCnpj: undefined }, // 15 digits
    // Malformed phone (not 10 or 11 digits)
    { reg: { responsible_phone: "9876-5432" }, expectedPhone: undefined }, // 8 digits (no DDD)
    { reg: { responsible_phone: "98765-4321" }, expectedPhone: undefined }, // 9 digits (no DDD)
    { reg: { responsible_phone: "+55 (11) 98765-4321" }, expectedPhone: undefined }, // 13 digits (with country code)
    // Malformed postal codes (not 8 digits)
    { reg: { postal_code: "1234-567" }, expectedPostal: undefined }, // 7 digits
    { reg: { postal_code: "12345-6789" }, expectedPostal: undefined }, // 9 digits
  ];

  for (const c of invalidCases) {
    const user = c.user || { email: "valid@example.com" };
    const reg = {
      responsible_name: "Nome Valido",
      tax_document: "123.456.789-01",
      responsible_phone: "(11) 98765-4321",
      postal_code: "01310-100",
      ...c.reg,
    };
    const shop = { name: "Barbearia Valida" };

    const result = resolveCheckoutCustomerData(user, reg, shop);
    assertValidAsaasCustomerData(result);
    assert.ok(result);

    if (c.expectedEmail === undefined && c.user) {
      assert.equal(result.email, undefined, `Email "${c.user.email}" should be omitted`);
    }
    if (c.expectedCpfCnpj === undefined && c.reg?.tax_document) {
      assert.equal(result.cpfCnpj, undefined, `tax_document "${c.reg.tax_document}" should be omitted`);
    }
    if (c.expectedPhone === undefined && c.reg?.responsible_phone) {
      assert.equal(result.phone, undefined, `phone "${c.reg.responsible_phone}" should be omitted`);
      assert.equal(result.mobilePhone, undefined, `mobilePhone should be omitted`);
    }
    if (c.expectedPostal === undefined && c.reg?.postal_code) {
      assert.equal(result.postalCode, undefined, `postal_code "${c.reg.postal_code}" should be omitted`);
    }
  }
});

test("Challenger Edge Case 5: 14-digit CNPJ and 11-digit CPF formats", () => {
  // 14-digit formatted CNPJ
  const cnpjFormatted = resolveCheckoutCustomerData(
    null,
    { responsible_name: "Responsavel PJ", tax_document: "14.379.410/0001-87" },
    null
  );
  assertValidAsaasCustomerData(cnpjFormatted);
  assert.equal(cnpjFormatted?.cpfCnpj, "14379410000187");

  // 14-digit raw string CNPJ
  const cnpjRaw = resolveCheckoutCustomerData(
    null,
    { responsible_name: "Responsavel PJ", tax_document: "14379410000187" },
    null
  );
  assertValidAsaasCustomerData(cnpjRaw);
  assert.equal(cnpjRaw?.cpfCnpj, "14379410000187");

  // 14-digit number CNPJ
  const cnpjNum = resolveCheckoutCustomerData(
    null,
    { responsible_name: "Responsavel PJ", tax_document: 14379410000187 },
    null
  );
  assertValidAsaasCustomerData(cnpjNum);
  assert.equal(cnpjNum?.cpfCnpj, "14379410000187");

  // 11-digit formatted CPF
  const cpfFormatted = resolveCheckoutCustomerData(
    null,
    { responsible_name: "Responsavel PF", tax_document: "123.456.789-01" },
    null
  );
  assertValidAsaasCustomerData(cpfFormatted);
  assert.equal(cpfFormatted?.cpfCnpj, "12345678901");

  // 11-digit raw string CPF
  const cpfRaw = resolveCheckoutCustomerData(
    null,
    { responsible_name: "Responsavel PF", tax_document: "12345678901" },
    null
  );
  assertValidAsaasCustomerData(cpfRaw);
  assert.equal(cpfRaw?.cpfCnpj, "12345678901");

  // 11-digit number CPF
  const cpfNum = resolveCheckoutCustomerData(
    null,
    { responsible_name: "Responsavel PF", tax_document: 12345678901 },
    null
  );
  assertValidAsaasCustomerData(cpfNum);
  assert.equal(cpfNum?.cpfCnpj, "12345678901");
});

test("Challenger Edge Case 6: various permutations of null, undefined, empty strings", () => {
  const emptyCombinations = [
    [null, null, null],
    [undefined, undefined, undefined],
    [{}, {}, {}],
    [{ email: "" }, { responsible_name: "" }, { name: "" }],
    [{ email: "   " }, { responsible_name: "   " }, { name: "   " }],
    [{ email: null }, { responsible_name: undefined }, { name: null }],
    // Address-only details without any identifier (name, email, phone, cpfCnpj)
    [
      null,
      { address_number: "100", postal_code: "01310100", neighborhood: "Bela Vista" },
      { address: "Avenida Paulista" },
    ],
    // Only 1-character names alone (< 2 chars is not a valid identifier)
    [{ email: "" }, { responsible_name: "A" }, null],
    [{ email: "" }, null, { name: "B" }],
  ];

  for (const [user, reg, shop] of emptyCombinations) {
    const result = resolveCheckoutCustomerData(user, reg, shop);
    assert.equal(
      result,
      undefined,
      `Expected undefined for empty combination: ${JSON.stringify({ user, reg, shop })}`
    );
  }
});

test("Challenger Edge Case 7: phone and email fallback resolution", () => {
  // Phone priority: registration.responsible_phone > shop.phone > shop.whatsapp
  const withShopPhone = resolveCheckoutCustomerData(
    null,
    { responsible_name: "Carlos" },
    { name: "Barbearia", phone: "(11) 2222-3333", whatsapp: "(11) 9999-8888" }
  );
  assertValidAsaasCustomerData(withShopPhone);
  assert.equal(withShopPhone?.phone, "1122223333");

  const withShopWhatsapp = resolveCheckoutCustomerData(
    null,
    { responsible_name: "Carlos" },
    { name: "Barbearia", whatsapp: "(11) 9999-8888" }
  );
  assertValidAsaasCustomerData(withShopWhatsapp);
  assert.equal(withShopWhatsapp?.phone, "1199998888");

  // Email priority: user.email > shop.notification_email
  const withUserEmail = resolveCheckoutCustomerData(
    { email: "user@example.com" },
    { responsible_name: "Carlos" },
    { notification_email: "shop@example.com" }
  );
  assertValidAsaasCustomerData(withUserEmail);
  assert.equal(withUserEmail?.email, "user@example.com");

  const withShopEmail = resolveCheckoutCustomerData(
    null,
    { responsible_name: "Carlos" },
    { notification_email: "shop@example.com" }
  );
  assertValidAsaasCustomerData(withShopEmail);
  assert.equal(withShopEmail?.email, "shop@example.com");
});

test("Challenger Edge Case 8: user_metadata fallback for responsible name", () => {
  // Fallback to user_metadata.full_name
  const withFullName = resolveCheckoutCustomerData(
    { email: "test@example.com", user_metadata: { full_name: "Guilherme Santos" } },
    null,
    { name: "Vintage Cut" }
  );
  assertValidAsaasCustomerData(withFullName);
  assert.equal(withFullName?.name, "Vintage Cut - Guilherme Santos");

  // Fallback to user_metadata.name
  const withName = resolveCheckoutCustomerData(
    { email: "test@example.com", user_metadata: { name: "Lucas Lima" } },
    null,
    { name: "Vintage Cut" }
  );
  assertValidAsaasCustomerData(withName);
  assert.equal(withName?.name, "Vintage Cut - Lucas Lima");
});

test("Challenger Edge Case 9: address parsing with comma and whitespace normalization", () => {
  const resWithComma = resolveCheckoutCustomerData(
    { email: "test@example.com" },
    null,
    { name: "Barbearia", address: "Rua Augusta, 500 - Consolação" }
  );
  assertValidAsaasCustomerData(resWithComma);
  assert.equal(resWithComma?.address, "Rua Augusta");

  const resWithoutComma = resolveCheckoutCustomerData(
    { email: "test@example.com" },
    null,
    { name: "Barbearia", address: "Praça da Sé 100" }
  );
  assertValidAsaasCustomerData(resWithoutComma);
  assert.equal(resWithoutComma?.address, "Praça da Sé 100");

  const resTrailingCommaOnly = resolveCheckoutCustomerData(
    { email: "test@example.com" },
    null,
    { name: "Barbearia", address: ", apto 12" }
  );
  assertValidAsaasCustomerData(resTrailingCommaOnly);
  assert.equal(resTrailingCommaOnly?.address, undefined);
});

test("Challenger Edge Case 10: single-identifier isolation", () => {
  // Only email
  const onlyEmail = resolveCheckoutCustomerData({ email: "solitary@example.com" }, null, null);
  assertValidAsaasCustomerData(onlyEmail);
  assert.deepEqual(onlyEmail, { email: "solitary@example.com" });

  // Only phone
  const onlyPhone = resolveCheckoutCustomerData(
    null,
    { responsible_phone: "(11) 91234-5678" },
    null
  );
  assertValidAsaasCustomerData(onlyPhone);
  assert.deepEqual(onlyPhone, {
    phone: "11912345678",
    mobilePhone: "11912345678",
  });

  // Only CPF
  const onlyCpf = resolveCheckoutCustomerData(
    null,
    { tax_document: "123.456.789-01" },
    null
  );
  assertValidAsaasCustomerData(onlyCpf);
  assert.deepEqual(onlyCpf, { cpfCnpj: "12345678901" });

  // Only CNPJ
  const onlyCnpj = resolveCheckoutCustomerData(
    null,
    { tax_document: "14.379.410/0001-87" },
    null
  );
  assertValidAsaasCustomerData(onlyCnpj);
  assert.deepEqual(onlyCnpj, { cpfCnpj: "14379410000187" });

  // Only responsible name
  const onlyResponsible = resolveCheckoutCustomerData(
    null,
    { responsible_name: "Lucas Silva" },
    null
  );
  assertValidAsaasCustomerData(onlyResponsible);
  assert.deepEqual(onlyResponsible, { name: "Lucas Silva" });

  // Only shop name
  const onlyShop = resolveCheckoutCustomerData(
    null,
    null,
    { name: "Navalha de Ouro" }
  );
  assertValidAsaasCustomerData(onlyShop);
  assert.deepEqual(onlyShop, {
    name: "Navalha de Ouro",
    company: "Navalha de Ouro",
  });
});

test("Challenger Stress / Fuzzing: hostile types and non-throw guarantee", () => {
  const hostileInputs = [
    // Arrays instead of objects
    [[], [], []],
    // Numbers and booleans
    [12345, true, Symbol("test")],
    // Objects with unexpected value types
    [
      { email: 12345, user_metadata: null },
      { responsible_name: { nested: true }, tax_document: [1, 2, 3], responsible_phone: false },
      { name: NaN, address: Infinity },
    ],
    // Unicode & Emoji
    [
      { email: "joão.barbeiro@barbearia.sp.gov.br" },
      { responsible_name: "🧔 João Silva ✂️", tax_document: "123.456.789-01" },
      { name: "💈 Barbearia & Cia 💈" },
    ],
    // Null prototypes
    [
      Object.create(null),
      Object.create(null),
      Object.create(null),
    ],
  ];

  for (const [user, reg, shop] of hostileInputs) {
    let result;
    assert.doesNotThrow(() => {
      result = resolveCheckoutCustomerData(user, reg, shop);
    }, "Should never throw an exception on hostile inputs");
    assertValidAsaasCustomerData(result);
  }
});

test("Challenger End-to-End: provider checkout payload with partial CorteAqui profile", async () => {
  const calls = [];
  const fakeOrderId = "b3000000-0000-4000-8000-000000000002";
  const fakeUserId = "b1000000-0000-4000-8000-000000000002";
  const checkoutLink = "https://sandbox.asaas.com/000/checkoutSession/show/checkout-stress";

  const d = {
    calls,
    account: "account-stress",
    callbackOrigin: "https://test.example.com",
    userClient: {
      auth: {
        getUser: async () => ({
          data: { user: { id: fakeUserId, email: "barbaeriasp@gmail.com" } },
          error: null,
        }),
      },
    },
    adminClient: {
      rpc: async (name, args) => {
        calls.push({ name, args });
        if (name === "claim_subscription_checkout") {
          return {
            data: {
              state: "CLAIMED",
              offer: {
                planCode: "simple-anual",
                planName: "Simple",
                months: 12,
                priceCents: 59900,
                maxInstallments: 3,
                userLimit: 3,
              },
              checkoutId: "checkout-stress",
              checkoutUrl: checkoutLink,
            },
            error: null,
          };
        }
        if (name === "claim_subscription_recurring_operation") {
          return { data: { state: "CLAIMED" }, error: null };
        }
        return { data: null, error: null };
      },
      from: (table) => ({
        select: () => ({
          eq: () => ({
            maybeSingle: async () => {
              if (table === "subscription_orders") {
                return { data: { barbershop_id: "shop-corte-aqui" }, error: null };
              }
              if (table === "barbershop_registration_details") {
                return { data: null, error: null };
              }
              if (table === "barbershops") {
                return { data: { name: "CorteAqui" }, error: null };
              }
              return { data: null, error: null };
            },
          }),
        }),
      }),
    },
    asaasClient: {
      createCheckout: async (payload) => {
        calls.push({ name: "provider", payload });
        return { id: "checkout-stress", link: checkoutLink };
      },
    },
  };

  const outcome = await createOrReuseSandboxCheckout(fakeOrderId, d);
  assert.equal(outcome.status, "ready");
  assert.equal(outcome.checkoutId, "checkout-stress");

  const providerCall = calls.find((c) => c.name === "provider");
  assert.ok(providerCall);
  // Verify customerData
  assert.deepEqual(providerCall.payload.customerData, {
    name: "CorteAqui",
    company: "CorteAqui",
    email: "barbaeriasp@gmail.com",
  });
  // Verify shopName reflected in item name & description
  assert.equal(providerCall.payload.items[0].name, "Simple - CorteAqui");
  assert.ok(providerCall.payload.items[0].description.includes("CorteAqui"));
});

test("Challenger End-to-End: provider checkout payload when DB lookup fails gracefully", async () => {
  const calls = [];
  const fakeOrderId = "b3000000-0000-4000-8000-000000000003";
  const fakeUserId = "b1000000-0000-4000-8000-000000000003";
  const checkoutLink = "https://sandbox.asaas.com/000/checkoutSession/show/checkout-fail";

  const d = {
    calls,
    account: "account-stress",
    callbackOrigin: "https://test.example.com",
    userClient: {
      auth: {
        getUser: async () => ({
          data: { user: { id: fakeUserId } },
          error: null,
        }),
      },
    },
    adminClient: {
      rpc: async (name, args) => {
        calls.push({ name, args });
        if (name === "claim_subscription_checkout") {
          return {
            data: {
              state: "CLAIMED",
              offer: {
                planCode: "simple-mensal",
                planName: "Simple Mensal",
                months: 1,
                priceCents: 4990,
                maxInstallments: 1,
                userLimit: 3,
              },
              checkoutId: "checkout-fail",
              checkoutUrl: checkoutLink,
            },
            error: null,
          };
        }
        if (name === "claim_subscription_recurring_operation") {
          return { data: { state: "CLAIMED" }, error: null };
        }
        return { data: null, error: null };
      },
      from: () => {
        throw new Error("Simulated database failure");
      },
    },
    asaasClient: {
      createCheckout: async (payload) => {
        calls.push({ name: "provider", payload });
        return { id: "checkout-fail", link: checkoutLink };
      },
    },
  };

  const outcome = await createOrReuseSandboxCheckout(fakeOrderId, d);
  assert.equal(outcome.status, "ready");

  const providerCall = calls.find((c) => c.name === "provider");
  assert.ok(providerCall);
  assert.equal(providerCall.payload.customerData, undefined);
  assert.equal(providerCall.payload.items[0].name, "Simple Mensal");
});

