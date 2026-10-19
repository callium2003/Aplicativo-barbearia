import assert from 'node:assert/strict';
import test from 'node:test';
import { createDiagnosticBuffer } from '../scripts/critical-test-diagnostics.mjs';

test('diagnostics redact a secret split across process events and keep bounded output', () => {
  const secret = 'fictional-secret-across-events';
  const buffer = createDiagnosticBuffer(value => value.replaceAll(secret, '[redigido]'), 100);
  buffer.append('x'.repeat(200));
  buffer.append(`\n${secret.slice(0, 12)}`);
  buffer.append(`${secret.slice(12)}\nfinished`);
  assert.ok(buffer.read().length <= 100);
  assert.ok(!buffer.read().includes(secret));
  assert.ok(buffer.read().endsWith('[redigido]\nfinished'));
});
