const reply = (value, status) => Response.json(value, { status, headers: { "cache-control": "no-store" } });

export async function handleSandboxCheckout(request, { enabled, create }) {
  if (!enabled) return reply({ error: "Indisponível" }, 404);
  const token = /^Bearer ([^\s]{1,8192})$/i.exec(request.headers.get("authorization") || "");
  if (!token) return reply({ error: "Autenticação necessária" }, 401);
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
      if (size > 4096) { await reader.cancel(); return reply({ error: "Requisição muito grande" }, 413); }
      text += decoder.decode(value, { stream: true });
    }
    text += decoder.decode();
    let body;
    try { body = JSON.parse(text); } catch { return reply({ error: "Formato inválido" }, 400); }
    if (!body || typeof body !== "object" || Array.isArray(body)) return reply({ error: "Formato inválido" }, 400);
    const overrides = {};
    if (typeof body.taxDocument === "string") overrides.taxDocument = body.taxDocument;
    if (typeof body.phone === "string") overrides.phone = body.phone;
    if (typeof body.responsibleName === "string") overrides.responsibleName = body.responsibleName;
    const result = Object.keys(overrides).length > 0
      ? await create(token[1], body.orderId, overrides)
      : await create(token[1], body.orderId);
    if (result.status === "invalid") return reply({ error: "Pedido inválido" }, 400);
    if (result.status === "unauthenticated") return reply({ error: "Autenticação necessária" }, 401);
    if (result.status === "in_progress" || result.status === "review_required") return reply({ status: result.status }, 409);
    if (result.status !== "ready") return reply({ error: "Checkout indisponível" }, 500);
    return reply({ checkoutId: result.checkoutId, checkoutUrl: result.checkoutUrl }, 200);
  } catch (error) {
    console.error("subscription-checkout-error:", error);
    return reply({ error: "Checkout indisponível" }, 500);
  }
}
