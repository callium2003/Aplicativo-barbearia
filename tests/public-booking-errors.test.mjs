import assert from "node:assert/strict";
import test from "node:test";
import { bookingErrorMessage } from "../app/[slug]/booking-errors.mjs";

test("reports a missing booking RPC as environment configuration, not a slot conflict", () => {
  assert.match(
    bookingErrorMessage({ code: "PGRST202", message: "Could not find the function public.book_customer_appointment" }),
    /configuração do ambiente/i,
  );
});

test("reports a real overlap as an unavailable slot", () => {
  assert.match(
    bookingErrorMessage({ code: "23P01", message: "conflicting key value violates exclusion constraint appointments_no_overlapping_slots" }),
    /não está mais disponível/i,
  );
  assert.match(
    bookingErrorMessage({ message: "appointments_no_overlapping_slots" }),
    /não está mais disponível/i,
  );
  assert.match(
    bookingErrorMessage({ message: "exclusion_violation" }),
    /não está mais disponível/i,
  );
});

test("does not present permission and schema failures as slot conflicts", () => {
  assert.match(bookingErrorMessage({ code: "42501", message: "permission denied" }), /sessão não tem permissão/i);
  assert.match(bookingErrorMessage({ code: "42P01", message: "relation does not exist" }), /configuração do ambiente/i);
});
