const BASE_URLS = Object.freeze({
  sandbox: "https://api-sandbox.asaas.com/v3",
  production: "https://api.asaas.com/v3",
});

function inputText(value) {
  if (typeof value !== "string" || !value.trim() || value.length > 200 || /[\r\n]/.test(value)) {
    throw new Error("Invalid Asaas input");
  }
  return value;
}

function resourceId(value) {
  if (!/^[a-zA-Z0-9_-]+$/.test(inputText(value))) throw new Error("Invalid Asaas input");
  return value;
}

function referenceQuery({ externalReference, offset = 0, limit = 10 } = {}) {
  inputText(externalReference);
  if (!Number.isSafeInteger(offset) || offset < 0 || !Number.isInteger(limit) || limit < 1 || limit > 100) {
    throw new Error("Invalid Asaas input");
  }
  return new URLSearchParams({ externalReference, offset: String(offset), limit: String(limit) });
}

function checkoutPaymentsQuery({ checkoutId, offset = 0, limit = 10 } = {}) {
  resourceId(checkoutId);
  if (!Number.isSafeInteger(offset) || offset < 0 || !Number.isInteger(limit) || limit < 1 || limit > 100) {
    throw new Error("Invalid Asaas input");
  }
  return new URLSearchParams({ checkoutSession: checkoutId, offset: String(offset), limit: String(limit) });
}

function requestError(code, status, outcomeUnknown) {
  const error = new Error("Asaas request failed");
  error.code = code;
  if (status !== undefined) error.status = status;
  error.outcomeUnknown = outcomeUnknown;
  return error;
}

/**
 * Server-side transport only. The caller owns authorization, durable operation
 * records and reconciliation. No automatic retry: a failed POST may have committed.
 * Never log raw provider responses or pass these credentials to the browser.
 */
export function createAsaasClient({ environment, apiKey, fetchImpl = globalThis.fetch, timeoutMs = 15000 }) {
  if (typeof window !== "undefined") throw new Error("Asaas client is server-only");
  if (!Object.hasOwn(BASE_URLS, environment) || typeof apiKey !== "string" || !apiKey.trim() || /[\r\n]/.test(apiKey)
    || typeof fetchImpl !== "function" || !Number.isInteger(timeoutMs) || timeoutMs < 1 || timeoutMs > 60000) {
    throw new Error("Invalid Asaas configuration");
  }

  async function request(path, method = "GET", payload) {
    let body;
    if (payload !== undefined) {
      if (!payload || typeof payload !== "object" || Array.isArray(payload)) throw new Error("Invalid Asaas input");
      try { body = JSON.stringify(payload); } catch { throw new Error("Invalid Asaas input"); }
    }
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);
    const write = method === "POST";
    let response;
    try {
      try {
        response = await fetchImpl(`${BASE_URLS[environment]}${path}`, {
          method,
          headers: { accept: "application/json", "content-type": "application/json", "user-agent": "BarbeariaSP/1.0", access_token: apiKey },
          body,
          signal: controller.signal,
          redirect: "error",
          cache: "no-store",
          credentials: "omit",
        });
      } catch {
        throw requestError(controller.signal.aborted ? "ASAAS_TIMEOUT" : "ASAAS_NETWORK_ERROR", undefined, write);
      }
      if (!response.ok) {
        // Discard the response, which may include personal data or echoed inputs.
        try { await response.body?.cancel(); } catch { /* Preserve the sanitized HTTP error. */ }
        throw requestError("ASAAS_HTTP_ERROR", response.status, write && (response.status < 400 || response.status === 408 || response.status >= 500));
      }
      let result;
      try { result = await response.json(); } catch {
        throw requestError(controller.signal.aborted ? "ASAAS_TIMEOUT" : "ASAAS_INVALID_RESPONSE", response.status, write);
      }
      const valid = result && typeof result === "object" && !Array.isArray(result)
        && (write || !path.includes("?")
          ? typeof result.id === "string" && result.id.length > 0
          : Array.isArray(result.data) && typeof result.hasMore === "boolean");
      if (!valid) throw requestError("ASAAS_INVALID_RESPONSE", response.status, write);
      return result;
    } finally {
      clearTimeout(timeout);
    }
  }

  return Object.freeze({
    createCustomer: (customer) => request("/customers", "POST", customer),
    createCheckout: (checkout) => request("/checkouts", "POST", checkout),
    listCustomers: (filters) => request(`/customers?${referenceQuery(filters)}`),
    listPayments: (filters) => request(`/payments?${referenceQuery(filters)}`),
    listCheckoutPayments: (filters) => request(`/payments?${checkoutPaymentsQuery(filters)}`),
    listPaymentsPage: ({ offset = 0, limit = 100 } = {}) => {
      if (environment !== "sandbox" || !Number.isSafeInteger(offset) || offset < 0 || !Number.isInteger(limit) || limit < 1 || limit > 100) throw new Error("Invalid Asaas input");
      return request(`/payments?${new URLSearchParams({ offset: String(offset), limit: String(limit) })}`);
    },
    getPayment: (id) => request(`/payments/${resourceId(id)}`),
  });
}
