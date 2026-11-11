import { buildMonthlyPixAutomaticAuthorization } from "./asaas-recurring.mjs";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const ID = /^[A-Za-z0-9_-]{1,128}$/;

function text(value, maximum = 160) {
  return typeof value === "string" && value.trim() && value.trim().length <= maximum && !/[\r\n]/.test(value) ? value.trim() : null;
}

function payer(user, registration, shop) {
  const shopName = text(shop?.name, 160);
  const responsibleName = text(registration?.responsible_name, 160);
  const name = shopName && responsibleName ? `${shopName} - ${responsibleName}` : (shopName || responsibleName);
  const cpfCnpj = typeof registration?.tax_document === "string" ? registration.tax_document.replace(/\D/g, "") : "";
  const email = text(user?.email, 160);
  const mobilePhone = typeof registration?.responsible_phone === "string" ? registration.responsible_phone.replace(/\D/g, "") : "";
  if (!name || !email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || !/^(\d{11}|\d{14})$/.test(cpfCnpj) || !/^\d{10,11}$/.test(mobilePhone)) return null;
  return { name, cpfCnpj, email, mobilePhone };
}

function qr(response) {
  // Asaas returns the image/payload at the authorization root; immediateQrCode
  // only identifies the first-payment QR configuration in the response.
  const payload = text(response?.payload ?? response?.qrCode?.payload ?? response?.immediateQrCode?.payload, 3000);
  const encodedImage = text(response?.encodedImage ?? response?.qrCode?.encodedImage ?? response?.immediateQrCode?.encodedImage, 3_000_000);
  if (!payload && !encodedImage) return null;
  return { payload: payload ?? undefined, encodedImage: encodedImage ?? undefined };
}

/** Server-side only. The database claim occurs before either provider write. */
export async function createPixAutomaticSubscription(orderId, deps) {
  if (typeof orderId !== "string" || !UUID.test(orderId)) return { status: "invalid" };
  const identity = await deps.userClient.auth.getUser();
  if (identity.error || !identity.data?.user) return { status: "unauthenticated" };
  const claim = await deps.adminClient.rpc("claim_subscription_recurring_operation", {
    p_order_id: orderId, p_requester_id: identity.data.user.id, p_billing_mode: "PIX_AUTOMATIC",
  });
  if (claim.error) throw new Error("Recurring operation claim failed");
  const state = claim.data?.state;
  if (state === "READY" || state === "ACTIVE") return { status: "ready", authorizationId: claim.data.authorizationId };
  if (state !== "CLAIMED") return { status: "review_required" };
  const [registration, shop] = await Promise.all([
    deps.adminClient.from("barbershop_registration_details").select("responsible_name,responsible_phone,tax_document").eq("barbershop_id", claim.data.barbershopId).maybeSingle(),
    deps.adminClient.from("barbershops").select("name").eq("id", claim.data.barbershopId).maybeSingle(),
  ]);
  if (registration.error || shop.error) throw new Error("Billing profile lookup failed");
  const customer = payer(identity.data.user, registration.data, shop.data);
  if (!customer) {
    const release = await deps.adminClient.rpc("release_unstarted_pix_automatic_operation", {
      p_order_id: orderId, p_requester_id: identity.data.user.id,
    });
    if (release.error || release.data !== true) throw new Error("Pix Automatic operation release failed");
    return { status: "billing_profile_required" };
  }
  let providerCustomer;
  let authorization;
  try {
    providerCustomer = await deps.asaasClient.createCustomer({ ...customer, externalReference: orderId });
    if (!ID.test(providerCustomer?.id ?? "")) throw new Error("Invalid provider customer");
    authorization = await deps.asaasClient.createPixAutomaticAuthorization(buildMonthlyPixAutomaticAuthorization({
      customerId: providerCustomer.id, planCode: claim.data.planCode, priceCents: claim.data.priceCents,
      contractId: claim.data.contractId, startDate: new Date().toISOString().slice(0, 10),
      shopName: text(shop?.name, 160),
    }));
    if (!ID.test(authorization?.id ?? "")) throw new Error("Invalid Pix Automatic authorization");
  } catch {
    return { status: "review_required" };
  }
  const finish = await deps.adminClient.rpc("finish_subscription_recurring_operation", {
    p_order_id: orderId, p_customer_id: providerCustomer.id, p_subscription_id: null, p_authorization_id: authorization.id,
  });
  if (finish.error) return { status: "review_required" };
  const paymentQr = qr(authorization);
  return { status: "ready", authorizationId: authorization.id, paymentQr };
}
