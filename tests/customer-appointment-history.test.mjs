import assert from "node:assert/strict";
import test from "node:test";

import { customerHistoryPageSize, customerHistoryStartsAt } from "../app/customer-appointment-history.mjs";

test("limits the customer agenda history to the preceding twelve calendar months", () => {
  assert.equal(customerHistoryPageSize, 20);
  assert.equal(
    customerHistoryStartsAt(new Date("2026-09-16T15:30:00.000Z")),
    "2025-09-16T15:30:00.000Z",
  );
});
