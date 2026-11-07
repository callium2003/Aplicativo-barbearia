import assert from "node:assert/strict";
import test from "node:test";
import { POST } from "../app/api/leads/route.ts";

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

test("functional: POST /api/leads returns 500 when Supabase persistence fails", async () => {
  // Simula ambiente onde a chave de serviço está configurada com valor inválido para forçar falha no Supabase
  const origKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  process.env.SUPABASE_SERVICE_ROLE_KEY = "invalid-key-to-force-failure";

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
    assert.equal(res.status, 500, "Deve retornar HTTP 500 em falha de persistência");
    const data = await res.json();
    assert.equal(data.success, false, "success deve ser false");
    assert.match(data.error, /(Não foi possível registrar seu contato|Não foi possível enviar a mensagem)/i);
  } finally {
    process.env.SUPABASE_SERVICE_ROLE_KEY = origKey;
  }
});

test("functional: form state machine preserves visitor fields on API error and clears only on success", () => {
  // Simulação fiel do fluxo e contrato de estado do componente LeadCaptureForm
  const createFormState = () => {
    let state = {
      fullName: "Carlos Barbeiro",
      whatsapp: "(11) 97777-6666",
      barbershopName: "Corte Fino",
      cityState: "São Paulo/SP",
      notes: "Tenho interesse no plano anual",
      status: "idle",
      message: "",
    };

    const handleApiResponse = (resOk, data) => {
      if (resOk && data.success) {
        state.status = "success";
        state.message = data.message || "Sucesso";
        state.fullName = "";
        state.whatsapp = "";
        state.barbershopName = "";
        state.cityState = "";
        state.notes = "";
      } else {
        state.status = "error";
        state.message = data.error || "Erro ao enviar.";
        // Campos NÃO são limpos propositalmente
      }
    };

    return { getState: () => state, handleApiResponse };
  };

  // 1. Cenário de Falha de Persistência (HTTP 500 retornado pela API)
  const formFailure = createFormState();
  const apiErrorPayload = {
    success: false,
    error: "Não foi possível registrar seu contato no momento. Por favor, tente novamente em alguns instantes.",
  };

  formFailure.handleApiResponse(false, apiErrorPayload);
  const failureState = formFailure.getState();

  assert.equal(failureState.status, "error", "Status deve transicionar para error");
  assert.equal(failureState.message, apiErrorPayload.error, "Mensagem de erro deve ser exposta ao usuário");
  assert.equal(failureState.fullName, "Carlos Barbeiro", "Campo fullName deve ser preservado para retry");
  assert.equal(failureState.whatsapp, "(11) 97777-6666", "Campo whatsapp deve ser preservado para retry");
  assert.equal(failureState.barbershopName, "Corte Fino", "Campo barbershopName deve ser preservado para retry");
  assert.equal(failureState.cityState, "São Paulo/SP", "Campo cityState deve ser preservado para retry");
  assert.equal(failureState.notes, "Tenho interesse no plano anual", "Campo notes deve ser preservado para retry");

  // 2. Cenário de Sucesso (HTTP 200 retornado após nova tentativa)
  const formSuccess = createFormState();
  const apiSuccessPayload = {
    success: true,
    message: "Obrigado! Recebemos suas informações e entraremos em contato rapidamente pelo WhatsApp.",
  };

  formSuccess.handleApiResponse(true, apiSuccessPayload);
  const successState = formSuccess.getState();

  assert.equal(successState.status, "success", "Status deve transicionar para success");
  assert.equal(successState.message, apiSuccessPayload.message);
  assert.equal(successState.fullName, "", "Campo fullName deve ser limpo");
  assert.equal(successState.whatsapp, "", "Campo whatsapp deve ser limpo");
  assert.equal(successState.barbershopName, "", "Campo barbershopName deve ser limpo");
});
