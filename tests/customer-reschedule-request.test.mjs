import assert from "node:assert/strict";
import test from "node:test";

import { buildCustomerRescheduleRequest } from "../app/customer-reschedule-request.mjs";

test("builds the single RPC payload that binds a replacement slot to its original appointment", () => {
  const payload = buildCustomerRescheduleRequest({
    appointmentId: "11111111-1111-1111-1111-111111111111",
    barbershopId: "22222222-2222-2222-2222-222222222222",
    serviceIds: ["33333333-3333-3333-3333-333333333333"],
    professionalId: "44444444-4444-4444-4444-444444444444",
    startsAt: "2026-09-20T14:00:00.000Z",
    customerName: "Cliente de teste",
    customerPhone: "11999990000",
  });

  assert.deepEqual(payload, {
    p_appointment_id: "11111111-1111-1111-1111-111111111111",
    p_barbershop_id: "22222222-2222-2222-2222-222222222222",
    p_service_ids: ["33333333-3333-3333-3333-333333333333"],
    p_professional_id: "44444444-4444-4444-4444-444444444444",
    p_starts_at: "2026-09-20T14:00:00.000Z",
    p_customer_name: "Cliente de teste",
    p_customer_phone: "11999990000",
  });
});

test("refuses to create a rescheduling request without the original appointment identity", () => {
  assert.throws(
    () => buildCustomerRescheduleRequest({
      appointmentId: "",
      barbershopId: "22222222-2222-2222-2222-222222222222",
      serviceIds: ["33333333-3333-3333-3333-333333333333"],
      professionalId: "44444444-4444-4444-4444-444444444444",
      startsAt: "2026-09-20T14:00:00.000Z",
      customerName: "Cliente de teste",
      customerPhone: "11999990000",
    }),
    /Agendamento original obrigatório/,
  );
});
