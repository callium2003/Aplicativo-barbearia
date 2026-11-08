import assert from "node:assert/strict";
import test from "node:test";
import { POST } from "../app/api/leads/route.ts";
import { handleLeadFormSubmissionResult } from "../utils/leads.ts";

test("functional: POST /api/leads rejects invalid payload with 400", async () => {
  const req = new Request("http://localhost:3000/api/leads", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ fullName: "A" }),
  });

  const res = await POST(req);
  assert.equal(res.status, 400);
  const data = await res.json();
  assert.equal(data.success, false);
  assert.match(data.error, /nome completo/i);
});

test("functional: POST /api/leads rejects malformed json with 400", async () => {
  const req = new Request("http://localhost:3000/api/leads", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: "{ malformed json",
  });

  const res = await POST(req);
  assert.equal(res.status, 400);
  const data = await res.json();
  assert.equal(data.success, false);
  assert.match(data.error, /inválido/i);
});

test("functional: POST /api/leads responds silently with 200 for honeypot bot without persistence", async () => {
  const req = new Request("http://localhost:3000/api/leads", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      fullName: "Spam Bot",
      whatsapp: "(11) 99999-9999",
      barbershopName: "Spam Shop",
      websiteHoneypot: "http://spam.com",
    }),
  });

  const res = await POST(req);
  assert.equal(res.status, 200);
  const data = await res.json();
  assert.equal(data.success, true);
  assert.match(data.message, /sucesso/i);
});

test("functional: POST /api/leads returns 500 with specific error when Supabase persistence fails", async () => {
  const origUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const origPub = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  const origKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const origFetch = globalThis.fetch;

  process.env.NEXT_PUBLIC_SUPABASE_URL = "https://synthetic.supabase.co";
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY = "synthetic-publishable-key-long-enough-for-validation";
  process.env.SUPABASE_SERVICE_ROLE_KEY = "synthetic-service-role-key-long-enough-for-validation";

  let insertAttempted = false;

  // Stub determinístico do fetch que simula erro de inserção no Supabase PostgREST
  globalThis.fetch = async (input) => {
    const urlString = String(input);
    if (urlString.includes("/rest/v1/platform_leads")) {
      insertAttempted = true;
      return new Response(
        JSON.stringify({
          code: "42P01",
          details: null,
          hint: null,
          message: 'relation "platform_leads" does not exist',
        }),
        {
          status: 400,
          headers: { "Content-Type": "application/json" },
        }
      );
    }
    throw new Error("Unexpected request in isolated lead persistence test");
  };

  try {
    const req = new Request("http://localhost:3000/api/leads", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        fullName: "Cliente Teste",
        whatsapp: "(11) 98888-7777",
        barbershopName: "Barbearia Modelo",
        teamSize: "1 a 3 profissionais",
      }),
    });

    const res = await POST(req);
    assert.equal(insertAttempted, true, "A inserção deve ter sido tentada no endpoint do Supabase");
    assert.equal(res.status, 500, "Deve retornar HTTP 500 em falha de persistência");
    const data = await res.json();
    assert.equal(data.success, false, "success deve ser false");
    // Garante que alcançou o tratamento de erro da persistência e não o catch genérico de inicialização
    assert.equal(
      data.error,
      "Não foi possível registrar seu contato no momento. Por favor, tente novamente em alguns instantes."
    );
  } finally {
    for (const [name, value] of Object.entries({ NEXT_PUBLIC_SUPABASE_URL: origUrl, NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: origPub, SUPABASE_SERVICE_ROLE_KEY: origKey })) {
      if (value === undefined) delete process.env[name];
      else process.env[name] = value;
    }
    globalThis.fetch = origFetch;
  }
});

test("functional: handleLeadFormSubmissionResult preserves visitor fields on API error and clears only on success", () => {
  const initialFormState = {
    fullName: "Carlos Barbeiro",
    whatsapp: "(11) 97777-6666",
    barbershopName: "Corte Fino",
    cityState: "São Paulo/SP",
    notes: "Tenho interesse no plano anual",
    status: "submitting",
    message: "",
  };

  // 1. Simula resposta de falha da API (ex: 500 ou validação de backend)
  const errorResult = handleLeadFormSubmissionResult(initialFormState, false, {
    success: false,
    error: "Não foi possível registrar seu contato no momento.",
  });

  assert.equal(errorResult.status, "error", "Status deve transicionar para error");
  assert.equal(errorResult.message, "Não foi possível registrar seu contato no momento.");
  // Todos os dados digitados pelo visitante devem permanecer intactos para nova tentativa sem perda
  assert.equal(errorResult.fullName, "Carlos Barbeiro");
  assert.equal(errorResult.whatsapp, "(11) 97777-6666");
  assert.equal(errorResult.barbershopName, "Corte Fino");
  assert.equal(errorResult.cityState, "São Paulo/SP");
  assert.equal(errorResult.notes, "Tenho interesse no plano anual");

  // 2. Simula nova tentativa (retry) bem-sucedida pelo visitante
  const successResult = handleLeadFormSubmissionResult(errorResult, true, {
    success: true,
    message: "Obrigado! Entraremos em contato.",
  });

  assert.equal(successResult.status, "success", "Status deve transicionar para success");
  assert.equal(successResult.message, "Obrigado! Entraremos em contato.");
  // Campos só devem ser limpos após a confirmação de sucesso
  assert.equal(successResult.fullName, "", "Nome deve ser limpo no sucesso");
  assert.equal(successResult.whatsapp, "", "WhatsApp deve ser limpo no sucesso");
  assert.equal(successResult.barbershopName, "", "Barbearia deve ser limpa no sucesso");
  assert.equal(successResult.cityState, "", "Cidade/UF deve ser limpa no sucesso");
  assert.equal(successResult.notes, "", "Notas devem ser limpas no sucesso");
});
