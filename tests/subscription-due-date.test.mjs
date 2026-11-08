import test from 'node:test';
import assert from 'node:assert/strict';
import { monthlyDueDate } from '../utils/subscription-due-date.ts';

test('monthly due dates retain the original day after short months', () => {
  assert.equal(monthlyDueDate('2027-01-31', 1), '2027-02-28');
  assert.equal(monthlyDueDate('2027-01-31', 2), '2027-03-31');
  assert.equal(monthlyDueDate('2028-01-31', 1), '2028-02-29');
  assert.equal(monthlyDueDate('2027-01-30', 2), '2027-03-30');
  assert.equal(monthlyDueDate('2027-12-29', 2), '2028-02-29');
});

test('invalid dates and month offsets are rejected', () => {
  for (const [date, months] of [['2027-02-29', 1], ['2027-13-01', 1], ['2027-01-31', -1], ['2027-01-31', 1.5], ['2027-01-31', 12001]]) {
    assert.throws(() => monthlyDueDate(date, months), RangeError);
  }
});
