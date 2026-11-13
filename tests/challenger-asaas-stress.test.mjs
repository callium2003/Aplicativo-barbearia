import test from "node:test";
import assert from "node:assert/strict";
import {
  buildAnnualCardCheckout,
  buildMonthlyRecurringCardCheckout,
} from "../utils/asaas-checkout.ts";
import { resolveCheckoutCustomerData } from "../utils/subscription-checkout-create.ts";
import { createSubscriptionOfferSnapshot } from "../utils/subscription-order-snapshot.ts";

const validOrderId = "10000000-0000-4000-8000-000000000001";
const callbackOrigin = "https://barbeariasp.example.test";
const nextDueDate = "2026-12-08";

// 1. NESTING & OMISSION VERIFICATION
test("CHALLENGER STRESS: customerData is completely omitted when undefined (preserving Asaas rules)", () => {
  const annualPayload = buildAnnualCardCheckout({
    orderId: validOrderId,
    offer: createSubscriptionOfferSnapshot("simple-anual"),
    callbackOrigin,
    nextDueDate,
    customerData: undefined,
  });

  assert.equal("customerData" in annualPayload, false, "customerData key must not exist in annualPayload");
  assert.equal(Object.prototype.hasOwnProperty.call(annualPayload, "customerData"), false);
  assert.equal(Object.keys(annualPayload).includes("customerData"), false);
  assert.equal(JSON.stringify(annualPayload).includes("customerData"), false);

  const monthlyPayload = buildMonthlyRecurringCardCheckout({
    orderId: validOrderId,
    offer: createSubscriptionOfferSnapshot("simple-mensal"),
    callbackOrigin,
    nextDueDate,
    customerData: undefined,
  });

  assert.equal("customerData" in monthlyPayload, false, "customerData key must not exist in monthlyPayload");
  assert.equal(Object.prototype.hasOwnProperty.call(monthlyPayload, "customerData"), false);
  assert.equal(Object.keys(monthlyPayload).includes("customerData"), false);
  assert.equal(JSON.stringify(monthlyPayload).includes("customerData"), false);
});

test("CHALLENGER STRESS: customerData is properly nested under the checkout payload", () => {
  const partialCustomerData = {
    name: "Barbearia Imperial - Roberto Carlos",
    company: "Barbearia Imperial",
    email: "roberto@imperial.test",
    phone: "11999998888",
  };

  const annual = buildAnnualCardCheckout({
    orderId: validOrderId,
    offer: createSubscriptionOfferSnapshot("middle-anual"),
    callbackOrigin,
    nextDueDate,
    customerData: partialCustomerData,
    shopName: "Barbearia Imperial",
  });

  assert.equal("customerData" in annual, true);
  assert.deepEqual(annual.customerData, partialCustomerData);
  // Ensure fields are NOT leaked or flattened onto top-level payload
  assert.equal("company" in annual, false);
  assert.equal("phone" in annual, false);
  assert.equal("email" in annual, false);

  const monthly = buildMonthlyRecurringCardCheckout({
    orderId: validOrderId,
    offer: createSubscriptionOfferSnapshot("middle-mensal"),
    callbackOrigin,
    nextDueDate,
    customerData: partialCustomerData,
    shopName: "Barbearia Imperial",
  });

  assert.equal("customerData" in monthly, true);
  assert.deepEqual(monthly.customerData, partialCustomerData);
  assert.equal("company" in monthly, false);
  assert.equal("phone" in monthly, false);
  assert.equal("email" in monthly, false);
});

// 2. PARTIAL DATA COMBINATIONS MATRIX
test("CHALLENGER STRESS: partial customerData combinations matrix", () => {
  const testCases = [
    {
      label: "Minimal partial: name and company only",
      data: {
        name: "CorteAqui",
        company: "CorteAqui",
      },
    },
    {
      label: "Partial: name, company, and email (user request scenario CorteAqui / barbaeriasp@gmail.com)",
      data: {
        name: "CorteAqui",
        company: "CorteAqui",
        email: "barbaeriasp@gmail.com",
      },
    },
    {
      label: "Partial: name with barbershop identification + responsible, company, phone, mobilePhone, cpfCnpj (no address)",
      data: {
        name: "Damasceno Barber - Thomaz Damasceno",
        company: "Damasceno Barber",
        phone: "11931453535",
        mobilePhone: "11931453535",
        cpfCnpj: "14379410870",
      },
    },
    {
      label: "Partial: contact and address without fiscal documents",
      data: {
        name: "Vintage Barber - Carlos Silva",
        company: "Vintage Barber",
        email: "carlos@vintage.test",
        address: "Rua Augusta",
        addressNumber: "500",
        postalCode: "01305000",
        province: "Consolação",
      },
    },
    {
      label: "Full profile: all 11 registration fields present",
      data: {
        name: "Barbearia Sao Paulo - Joao Donato",
        company: "Barbearia Sao Paulo",
        observations: "Cliente teste Sandbox",
        email: "joao@barbeariasp.test",
        cpfCnpj: "12345678909",
        phone: "11988887777",
        mobilePhone: "11988887777",
        postalCode: "01001000",
        address: "Praca da Se",
        addressNumber: "100",
        province: "Centro",
      },
    },
  ];

  for (const { label, data } of testCases) {
    // Annual
    const annual = buildAnnualCardCheckout({
      orderId: validOrderId,
      offer: createSubscriptionOfferSnapshot("master-anual"),
      callbackOrigin,
      nextDueDate,
      customerData: data,
    });
    assert.deepEqual(annual.customerData, data, `Failed annual testCase: ${label}`);
    const annualJson = JSON.parse(JSON.stringify(annual));
    assert.deepEqual(annualJson.customerData, data, `Failed annual JSON roundtrip: ${label}`);

    // Monthly
    const monthly = buildMonthlyRecurringCardCheckout({
      orderId: validOrderId,
      offer: createSubscriptionOfferSnapshot("master-mensal"),
      callbackOrigin,
      nextDueDate,
      customerData: data,
    });
    assert.deepEqual(monthly.customerData, data, `Failed monthly testCase: ${label}`);
    const monthlyJson = JSON.parse(JSON.stringify(monthly));
    assert.deepEqual(monthlyJson.customerData, data, `Failed monthly JSON roundtrip: ${label}`);
  }
});

// 3. BARBERSHOP IDENTIFICATION IN ITEMS[0]
test("CHALLENGER STRESS: items[0].name and items[0].description include barbershop name correctly", () => {
  const shopName = "Barbearia Estilo & Corte";
  const annual = buildAnnualCardCheckout({
    orderId: validOrderId,
    offer: createSubscriptionOfferSnapshot("simple-anual"),
    callbackOrigin,
    nextDueDate,
    shopName,
  });

  assert.equal(annual.items[0].name, "Plano Simple (Anual) - Barbear");
  assert.equal(
    annual.items[0].description,
    "Assinatura BarbeariaSP - Barbearia Estilo & Corte (Plano Simple (Anual))"
  );

  const monthly = buildMonthlyRecurringCardCheckout({
    orderId: validOrderId,
    offer: createSubscriptionOfferSnapshot("simple-mensal"),
    callbackOrigin,
    nextDueDate,
    shopName,
  });

  // plan.name for simple-mensal is "Plano Simple"
  assert.equal(monthly.items[0].name, "Plano Simple - Barbearia Estil");
  assert.equal(
    monthly.items[0].description,
    "Assinatura BarbeariaSP - Barbearia Estilo & Corte (Plano Simple)"
  );
});

test("CHALLENGER STRESS: items fallback gracefully when shopName is undefined", () => {
  const annual = buildAnnualCardCheckout({
    orderId: validOrderId,
    offer: createSubscriptionOfferSnapshot("simple-anual"),
    callbackOrigin,
    nextDueDate,
  });

  assert.equal(annual.items[0].name, "Plano Simple (Anual)");
  assert.equal(
    annual.items[0].description,
    "12 meses de acesso ao BarbeariaSP; renovação automática a cada ano até o cancelamento do cliente."
  );

  const monthly = buildMonthlyRecurringCardCheckout({
    orderId: validOrderId,
    offer: createSubscriptionOfferSnapshot("simple-mensal"),
    callbackOrigin,
    nextDueDate,
  });

  assert.equal(monthly.items[0].name, "Plano Simple");
  assert.equal(
    monthly.items[0].description,
    "1 mês de acesso ao BarbeariaSP; renovação automática ao final de cada período até o cancelamento do cliente."
  );
});

// 4. BOUNDARY & ADVERSARIAL STRESS TESTING
test("CHALLENGER STRESS: boundary conditions - long shop names truncated safely without throwing", () => {
  const ultraLongShopName = "A".repeat(300);

  const annual = buildAnnualCardCheckout({
    orderId: validOrderId,
    offer: createSubscriptionOfferSnapshot("simple-anual"),
    callbackOrigin,
    nextDueDate,
    shopName: ultraLongShopName,
  });

  assert.ok(annual.items[0].name.length <= 30, `Item name exceeds 30: ${annual.items[0].name.length}`);
  assert.ok(annual.items[0].description.length <= 250, `Item description exceeds 250: ${annual.items[0].description.length}`);

  const monthly = buildMonthlyRecurringCardCheckout({
    orderId: validOrderId,
    offer: createSubscriptionOfferSnapshot("simple-mensal"),
    callbackOrigin,
    nextDueDate,
    shopName: ultraLongShopName,
  });

  assert.ok(monthly.items[0].name.length <= 30, `Item name exceeds 30: ${monthly.items[0].name.length}`);
  assert.ok(monthly.items[0].description.length <= 250, `Item description exceeds 250: ${monthly.items[0].description.length}`);
});

test("CHALLENGER STRESS: special characters, unicode, emojis, and quotes in shopName & customerData", () => {
  const complexShopName = "Barbearia D'Artagnan & Cia. 💈✂️ <script>alert(1)</script>";
  const complexCustomerData = {
    name: "Barbearia D'Artagnan & Cia. 💈✂️ - François D'Amboise",
    company: complexShopName,
    email: "francois+barber@example.test",
    address: "R. dos Três Irmãos, nº 123 - Apto 4B",
    province: "São Paulo / SP",
  };

  const annual = buildAnnualCardCheckout({
    orderId: validOrderId,
    offer: createSubscriptionOfferSnapshot("simple-anual"),
    callbackOrigin,
    nextDueDate,
    customerData: complexCustomerData,
    shopName: complexShopName,
  });

  assert.equal(annual.customerData.company, complexShopName);
  assert.ok(annual.items[0].description.includes("Barbearia D'Artagnan"));
  assert.ok(annual.items[0].name.length <= 30);

  // Verify pure JSON serializability
  const jsonString = JSON.stringify(annual);
  const parsed = JSON.parse(jsonString);
  assert.deepEqual(parsed.customerData, complexCustomerData);
  assert.equal(parsed.items[0].name, annual.items[0].name);
  assert.equal(parsed.items[0].description, annual.items[0].description);
});

// 5. END-TO-END PIPELINE: resolveCheckoutCustomerData -> buildAnnualCardCheckout / buildMonthlyRecurringCardCheckout
test("CHALLENGER STRESS: pipeline integration from database entities to checkout payload", () => {
  // Scenario 1: Trial barbershop with minimal registration
  const user = { email: "barbaeriasp@gmail.com" };
  const shop = { name: "CorteAqui" };
  const registration = null;

  const resolved1 = resolveCheckoutCustomerData(user, registration, shop);
  assert.deepEqual(resolved1, {
    name: "CorteAqui",
    company: "CorteAqui",
    email: "barbaeriasp@gmail.com",
  });

  const payload1 = buildAnnualCardCheckout({
    orderId: validOrderId,
    offer: createSubscriptionOfferSnapshot("simple-anual"),
    callbackOrigin,
    nextDueDate,
    customerData: resolved1,
    shopName: shop.name,
  });

  assert.equal(payload1.customerData.name, "CorteAqui");
  assert.equal(payload1.customerData.company, "CorteAqui");
  assert.equal(payload1.customerData.email, "barbaeriasp@gmail.com");
  assert.equal(payload1.items[0].name, "Plano Simple (Anual) - CorteAq");

  // Scenario 2: Completely empty database records
  const resolvedEmpty = resolveCheckoutCustomerData(null, null, null);
  assert.equal(resolvedEmpty, undefined);

  const payloadEmpty = buildAnnualCardCheckout({
    orderId: validOrderId,
    offer: createSubscriptionOfferSnapshot("simple-anual"),
    callbackOrigin,
    nextDueDate,
    customerData: resolvedEmpty,
  });

  assert.equal("customerData" in payloadEmpty, false);
  assert.equal(JSON.stringify(payloadEmpty).includes("customerData"), false);

  // Scenario 3: Malformed inputs that should be cleaned or dropped
  const dirtyRegistration = {
    responsible_name: "Thomaz Damasceno",
    responsible_phone: "(11) 9.3145-3535 ext 123", // has extra chars -> cleanDigits -> 11931453535123 (14 digits) -> regex /^\d{10,11}$/ fails -> phone dropped
    tax_document: "14.379.410/870-00", // cleanDigits -> 1437941087000 (13 digits) -> regex fails -> dropped
    postal_code: "1234", // invalid length -> dropped
  };
  const validShop = {
    name: "Barbearia Damasceno",
  };
  const resolvedDirty = resolveCheckoutCustomerData(user, dirtyRegistration, validShop);
  // Identifiers: name ("Barbearia Damasceno - Thomaz Damasceno") and email ("barbaeriasp@gmail.com") are valid!
  assert.ok(resolvedDirty);
  assert.equal(resolvedDirty.name, "Barbearia Damasceno - Thomaz Damasceno");
  assert.equal(resolvedDirty.company, "Barbearia Damasceno");
  assert.equal(resolvedDirty.email, "barbaeriasp@gmail.com");
  assert.equal(resolvedDirty.phone, undefined, "Invalid phone should be dropped");
  assert.equal(resolvedDirty.cpfCnpj, undefined, "Invalid tax_document should be dropped");
  assert.equal(resolvedDirty.postalCode, undefined, "Invalid postalCode should be dropped");
});

test("CHALLENGER STRESS: all 6 subscription plans are supported across both builders", () => {
  const annualPlans = ["simple-anual", "middle-anual", "master-anual"];
  const monthlyPlans = ["simple-mensal", "middle-mensal", "master-mensal"];

  for (const planCode of annualPlans) {
    const payload = buildAnnualCardCheckout({
      orderId: validOrderId,
      offer: createSubscriptionOfferSnapshot(planCode),
      callbackOrigin,
      nextDueDate,
      shopName: "Barbearia Teste",
      customerData: { name: "Barbearia Teste", company: "Barbearia Teste" },
    });
    assert.equal(payload.subscription.cycle, "YEARLY");
    assert.ok(payload.items[0].value > 0);
    assert.equal(payload.customerData.company, "Barbearia Teste");
  }

  for (const planCode of monthlyPlans) {
    const payload = buildMonthlyRecurringCardCheckout({
      orderId: validOrderId,
      offer: createSubscriptionOfferSnapshot(planCode),
      callbackOrigin,
      nextDueDate,
      shopName: "Barbearia Teste",
      customerData: { name: "Barbearia Teste", company: "Barbearia Teste" },
    });
    assert.equal(payload.subscription.cycle, "MONTHLY");
    assert.ok(payload.items[0].value > 0);
    assert.equal(payload.customerData.company, "Barbearia Teste");
  }
});

// 6. ADVERSARIAL RESOLUTION & SANITIZATION MATRIX
test("CHALLENGER STRESS: validation and formatting rules of resolveCheckoutCustomerData", () => {
  // Test 6.1: CPF (11) vs CNPJ (14) vs Invalid Lengths (10, 12, 13)
  for (const doc of ["123.456.789-01", "12345678901"]) {
    const res = resolveCheckoutCustomerData(null, { tax_document: doc }, { name: "Barbearia" });
    assert.equal(res?.cpfCnpj, "12345678901");
  }
  for (const doc of ["12.345.678/0001-99", "12345678000199"]) {
    const res = resolveCheckoutCustomerData(null, { tax_document: doc }, { name: "Barbearia" });
    assert.equal(res?.cpfCnpj, "12345678000199");
  }
  for (const invalidDoc of ["1234567890", "123456789012", "1234567890123", ""]) {
    const res = resolveCheckoutCustomerData(null, { tax_document: invalidDoc }, { name: "Barbearia" });
    assert.equal(res?.cpfCnpj, undefined);
  }

  // Test 6.2: Phone lengths (10 and 11 accepted, others rejected)
  for (const phone of ["(11) 3333-4444", "1133334444"]) {
    const res = resolveCheckoutCustomerData(null, { responsible_phone: phone }, { name: "Barbearia" });
    assert.equal(res?.phone, "1133334444");
    assert.equal(res?.mobilePhone, "1133334444");
  }
  for (const phone of ["(11) 98888-7777", "11988887777"]) {
    const res = resolveCheckoutCustomerData(null, { responsible_phone: phone }, { name: "Barbearia" });
    assert.equal(res?.phone, "11988887777");
    assert.equal(res?.mobilePhone, "11988887777");
  }
  for (const invalidPhone of ["988887777", "5511988887777", "123", ""]) {
    const res = resolveCheckoutCustomerData(null, { responsible_phone: invalidPhone }, { name: "Barbearia" });
    assert.equal(res?.phone, undefined);
  }

  // Test 6.3: Address comma splitting
  const resComma = resolveCheckoutCustomerData(null, null, { name: "Shop", address: "Av. Paulista, 1000 - Apto 2" });
  assert.equal(resComma?.address, "Av. Paulista");

  const resNoComma = resolveCheckoutCustomerData(null, null, { name: "Shop", address: "Av. Paulista" });
  assert.equal(resNoComma?.address, "Av. Paulista");

  // Test 6.4: Postal code 8 digits
  const resCep = resolveCheckoutCustomerData(null, { postal_code: "01310-100" }, { name: "Shop" });
  assert.equal(resCep?.postalCode, "01310100");
  const resBadCep = resolveCheckoutCustomerData(null, { postal_code: "0131010" }, { name: "Shop" });
  assert.equal(resBadCep?.postalCode, undefined);

  // Test 6.5: Email validation
  assert.equal(resolveCheckoutCustomerData({ email: "valid@domain.com" }, null, { name: "Shop" })?.email, "valid@domain.com");
  assert.equal(resolveCheckoutCustomerData({ email: "invalid-email" }, null, { name: "Shop" })?.email, undefined);
  assert.equal(resolveCheckoutCustomerData({ email: "user@domain" }, null, { name: "Shop" })?.email, undefined);
  assert.equal(resolveCheckoutCustomerData({ email: "user @domain.com" }, null, { name: "Shop" })?.email, undefined);

  // Test 6.6: Absent keys are not defined with 'undefined' value in the object
  const partialRes = resolveCheckoutCustomerData({ email: "test@example.test" }, null, { name: "Shop" });
  assert.ok(partialRes);
  const keys = Object.keys(partialRes);
  assert.equal(keys.includes("address"), false);
  assert.equal(keys.includes("cpfCnpj"), false);
  assert.equal(keys.includes("phone"), false);
  assert.equal(keys.includes("postalCode"), false);
});

