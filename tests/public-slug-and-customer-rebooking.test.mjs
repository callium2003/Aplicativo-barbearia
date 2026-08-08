import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import {
  BARBERSHOP_NAME_CONFLICT_MESSAGE,
  isBarbershopSlugConflict,
  makeBarbershopSlug,
} from "../app/barbershop-slug.mjs";
import {
  appointmentShop,
  buildCustomerAppointmentTarget,
} from "../app/customer-appointment-navigation.mjs";

const read = (path) => readFile(new URL(path, import.meta.url), "utf8");

test("public barbershop slugs are human-readable and reject duplicates", async () => {
  assert.equal(makeBarbershopSlug("Barbearia São João"), "barbearia-sao-joao");
  assert.equal(makeBarbershopSlug("  Cullen Barbas  "), "cullen-barbas");
  assert.equal(makeBarbershopSlug("Cullenbarbas"), "cullenbarbas");
  assert.doesNotMatch(makeBarbershopSlug("Cullenbarbas"), /-[a-f0-9]{8}$/);

  assert.equal(
    isBarbershopSlugConflict({ code: "23505", message: "duplicate key", details: "barbershops_slug_key" }),
    true,
  );
  assert.equal(
    isBarbershopSlugConflict({ code: "23505", message: "duplicate key", details: "other_unique_key" }),
    false,
  );
  assert.match(BARBERSHOP_NAME_CONFLICT_MESSAGE, /Esse nome já existe/);

  const registration = await read("../app/cadastro-inicial/page.tsx");
  assert.match(registration, /makeBarbershopSlug\(details\.barbershopName\)/);
  assert.match(registration, /slug,/);
  assert.match(registration, /isBarbershopSlugConflict\(error\)/);
  assert.match(registration, /BARBERSHOP_NAME_CONFLICT_MESSAGE/);
  assert.doesNotMatch(registration, /crypto\.randomUUID/);
});

test("customer cancellation and rebooking keep the barbershop destination", async () => {
  const shop = { name: "Cullenbarbas", slug: "cullenbarbas", whatsapp: null };
  assert.deepEqual(appointmentShop(shop), shop);
  assert.deepEqual(appointmentShop([shop]), shop);
  assert.equal(appointmentShop(null), null);

  assert.equal(buildCustomerAppointmentTarget(shop), "/cullenbarbas");
  const rebookTarget = buildCustomerAppointmentTarget(shop, ["service-a", "service-b"], true);
  assert.equal(rebookTarget, "/cullenbarbas?services=service-a%2Cservice-b");
  assert.equal(new URL(`http://localhost${rebookTarget}`).searchParams.get("services"), "service-a,service-b");
  assert.equal(buildCustomerAppointmentTarget(null, ["service-a"], true), null);

  const bookings = await read("../app/meus-agendamentos/page.tsx");
  assert.match(bookings, /const targetPath = buildCustomerAppointmentTarget\(shop, item\.service_ids, rebook\)/);
  assert.match(bookings, /Nenhuma alteração foi feita/);
  assert.match(bookings, /window\.location\.assign\(targetPath\)/);
  assert.doesNotMatch(bookings, /barbershops\[0\]/);
});
