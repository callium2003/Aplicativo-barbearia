const MAX_BYTES = 4096;
const headers = { "cache-control": "no-store" };
const reply = (data, status) => Response.json(data, { status, headers });

// Sandbox route only. Authentication and database authorization remain mandatory.
export async function handleSubscriptionOrder(request, { enabled, create }) {
  if (!enabled) return reply({ error: "Indisponível" }, 404);
  const match = /^Bearer ([^\s]{1,8192})$/i.exec(request.headers.get("authorization") || "");
  if (!match) return reply({ error: "Autenticação necessária" }, 401);
  if (!/^application\/json(?:\s*;|$)/i.test(request.headers.get("content-type") || "")) return reply({ error: "Formato inválido" }, 400);
  const reader = request.body?.getReader();
  if (!reader) return reply({ error: "Formato inválido" }, 400);
  let text = "";
  let size = 0;
  const decoder = new TextDecoder();
  try {
    for (;;) {
      const { value, done } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > MAX_BYTES) { await reader.cancel(); return reply({ error: "Requisição muito grande" }, 413); }
      text += decoder.decode(value, { stream: true });
    }
    text += decoder.decode();
    let body;
    try { body = JSON.parse(text); } catch { return reply({ error: "Formato inválido" }, 400); }
    if (!body || typeof body !== "object" || Array.isArray(body)) return reply({ error: "Formato inválido" }, 400);
    const result = await create(match[1], { planCode: body.planCode, idempotencyKey: body.idempotencyKey, acceptedTerms: body.acceptedTerms });
    if (result.status === "invalid") return reply({ error: "Dados inválidos" }, 400);
    if (result.status === "unauthenticated") return reply({ error: "Autenticação necessária" }, 401);
    if (result.status === "forbidden") return reply({ error: "Acesso não autorizado" }, 403);
    if (result.status === "pending") return reply({ error: "Já existe uma contratação pendente para esta barbearia." }, 409);
    if (result.status === "already_active") return reply({ error: "Sua barbearia já possui assinatura ativa até a data de vencimento." }, 409);
    if (result.status === "review") return reply({ error: "A contratação atual está em análise; não inicie outra." }, 409);
    if (result.status !== "created") return reply({ error: "Não foi possível criar o pedido" }, 500);
    return reply({ orderId: result.orderId }, 201);
  } catch {
    return reply({ error: "Não foi possível criar o pedido" }, 500);
  }
}
