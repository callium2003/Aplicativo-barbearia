const BRAZIL_COUNTRY_CODE = "55";

export function normalizeBrazilianWhatsApp(phone) {
  const digits = String(phone || "").replace(/\D/g, "");
  if (!digits) return null;

  const localNumber = digits.startsWith(BRAZIL_COUNTRY_CODE)
    ? digits.slice(BRAZIL_COUNTRY_CODE.length)
    : digits;
  if (!/^\d{2}(?:9\d{8}|[2-5]\d{7})$/.test(localNumber)) return null;

  const withCountryCode = digits.startsWith(BRAZIL_COUNTRY_CODE)
    ? digits
    : `${BRAZIL_COUNTRY_CODE}${digits}`;

  return /^55\d{10,11}$/.test(withCountryCode) ? withCountryCode : null;
}

export function buildWhatsAppLink(phone, message = "") {
  const normalizedPhone = normalizeBrazilianWhatsApp(phone);
  if (!normalizedPhone) return null;

  const text = message.trim();
  return `https://wa.me/${normalizedPhone}${text ? `?text=${encodeURIComponent(text)}` : ""}`;
}

function isGoogleMapsUrl(value) {
  try {
    const url = new URL(value);
    const hostname = url.hostname.toLowerCase();
    return url.protocol === "https:" && (
      hostname === "maps.app.goo.gl" ||
      hostname === "google.com" ||
      hostname.endsWith(".google.com") ||
      hostname === "google.com.br" ||
      hostname.endsWith(".google.com.br")
    );
  } catch {
    return false;
  }
}

export function buildGoogleMapsLink({ address, googleMapsUrl } = {}) {
  if (googleMapsUrl && isGoogleMapsUrl(googleMapsUrl)) return googleMapsUrl;

  const destination = String(address || "").trim().replace(/\s+/g, " ");
  if (destination.length < 8 || !/[a-zà-ÿ]/i.test(destination)) return null;

  return `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(destination)}`;
}
