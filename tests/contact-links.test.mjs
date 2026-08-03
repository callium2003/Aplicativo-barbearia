import assert from "node:assert/strict";
import test from "node:test";
import { buildGoogleMapsLink, buildWhatsAppLink, normalizeBrazilianWhatsApp } from "../app/contact-links.mjs";

test("normalizes Brazilian WhatsApp numbers and encodes the optional message", () => {
  assert.equal(normalizeBrazilianWhatsApp("(11) 99999-9999"), "5511999999999");
  assert.equal(normalizeBrazilianWhatsApp("+55 11 99999-9999"), "5511999999999");
  assert.equal(normalizeBrazilianWhatsApp("55 11 3333-4444"), "551133334444");
  assert.equal(buildWhatsAppLink("(11) 99999-9999", "Olá, João & Maria!"), "https://wa.me/5511999999999?text=Ol%C3%A1%2C%20Jo%C3%A3o%20%26%20Maria!");
});

test("rejects absent or invalid WhatsApp numbers", () => {
  assert.equal(normalizeBrazilianWhatsApp(""), null);
  assert.equal(normalizeBrazilianWhatsApp("11999"), null);
  assert.equal(normalizeBrazilianWhatsApp("+1 212 555 0100"), null);
  assert.equal(buildWhatsAppLink(null), null);
});

test("builds safe Google Maps directions from a real address or a trusted custom URL", () => {
  assert.equal(buildGoogleMapsLink({ address: "Rua São João, 123 - Centro, São Paulo - SP" }), "https://www.google.com/maps/dir/?api=1&destination=Rua%20S%C3%A3o%20Jo%C3%A3o%2C%20123%20-%20Centro%2C%20S%C3%A3o%20Paulo%20-%20SP");
  assert.equal(buildGoogleMapsLink({ address: "Praça da Sé, São Paulo" }), "https://www.google.com/maps/dir/?api=1&destination=Pra%C3%A7a%20da%20S%C3%A9%2C%20S%C3%A3o%20Paulo");
  assert.equal(buildGoogleMapsLink({ googleMapsUrl: "https://maps.app.goo.gl/abc", address: "Rua ignorada, 1" }), "https://maps.app.goo.gl/abc");
  assert.equal(buildGoogleMapsLink({ googleMapsUrl: "https://example.test/map", address: "" }), null);
  assert.equal(buildGoogleMapsLink({ address: "" }), null);
});
