import assert from "node:assert/strict";
import test from "node:test";
import { SERVICE_ICON_CATALOG, serviceImage } from "../app/[slug]/booking-formatters.ts";

test("maps the base reference service categories to their dedicated icons", () => {
  assert.equal(serviceImage("Corte de Cabelo"), "/services/corte-v2.png");
  assert.equal(serviceImage("Corte degradê"), "/services/corte-v2.png");
  assert.equal(serviceImage("Barba tradicional"), "/services/barba-v2.png");
  assert.equal(serviceImage("Bigode"), "/services/bigode.png");
  assert.equal(serviceImage("Sobrancelha na pinça"), "/services/sobrancelha-v2.png");
  assert.equal(serviceImage("Hidratação Capilar"), "/services/hidratacao.png");
  assert.equal(serviceImage("Pigmentação"), "/services/pigmentacao.png");
  assert.equal(serviceImage("Lavagem especial"), "/services/lavagem.png");
  assert.equal(serviceImage("Finalização com pomada"), "/services/finalizacao.png");
  assert.equal(serviceImage("Acabamento / Pezinho"), "/services/acabamento.png");
  assert.equal(serviceImage("Limpeza Facial"), "/services/limpeza-facial.png");
});

test("maps the extended catalog services to their dedicated icons", () => {
  assert.equal(serviceImage("Platinado / Nevou"), "/services/platinado.png");
  assert.equal(serviceImage("Nevou"), "/services/platinado.png");
  assert.equal(serviceImage("Progressiva Masculina"), "/services/progressiva.png");
  assert.equal(serviceImage("Selagem Capilar"), "/services/selagem.png");
  assert.equal(serviceImage("Botox Capilar"), "/services/botox.png");
  assert.equal(serviceImage("Relaxamento Capilar"), "/services/relaxamento.png");
  assert.equal(serviceImage("Barboterapia"), "/services/barboterapia.png");
  assert.equal(serviceImage("Barba Express"), "/services/barba-express.png");
  assert.equal(serviceImage("Depilação Nasal"), "/services/depilacao-nasal.png");
  assert.equal(serviceImage("Depilação de Orelhas"), "/services/depilacao-orelhas.png");
  assert.equal(serviceImage("Camuflagem de Fios Brancos"), "/services/camuflagem.png");
  assert.equal(serviceImage("Luzes e Reflexos"), "/services/luzes.png");
});

test("maps haircut variations and nail services to their dedicated icons", () => {
  assert.equal(serviceImage("Corte Infantil"), "/services/corte-infantil.png");
  assert.equal(serviceImage("Corte kids"), "/services/corte-infantil.png");
  assert.equal(serviceImage("Corte com Desenhos"), "/services/corte-desenhos.png");
  assert.equal(serviceImage("Risco na navalha"), "/services/corte-desenhos.png");
  assert.equal(serviceImage("Corte Afro / Cacheado"), "/services/corte-afro.png");
  assert.equal(serviceImage("Corte crespo"), "/services/corte-afro.png");
  assert.equal(serviceImage("Corte Feminino"), "/services/corte-feminino.png");
  assert.equal(serviceImage("Manicure"), "/services/manicure-masculina.png");
  assert.equal(serviceImage("Manicure Masculina"), "/services/manicure-masculina.png");
  assert.equal(serviceImage("Manicure Feminina"), "/services/manicure-feminina.png");
  assert.equal(serviceImage("Pedicure"), "/services/pedicure-masculina.png");
  assert.equal(serviceImage("Pedicure Masculina"), "/services/pedicure-masculina.png");
  assert.equal(serviceImage("Pedicure Feminina"), "/services/pedicure-feminina.png");
});

test("every catalog label resolves to its own icon", () => {
  for (const option of SERVICE_ICON_CATALOG.filter((o) => o.key !== "generico")) {
    assert.equal(serviceImage(option.label), option.src, option.label);
  }
});

test("maps combos and unmatched services to the generic emblem icon", () => {
  assert.equal(serviceImage("Corte + Barba"), "/services/generico.png");
  assert.equal(serviceImage("Combo Noivo"), "/services/generico.png");
  assert.equal(serviceImage("Massagem relaxante"), "/services/generico.png");
  assert.equal(serviceImage(""), "/services/generico.png");
  assert.equal(SERVICE_ICON_CATALOG.length, 30);
});
