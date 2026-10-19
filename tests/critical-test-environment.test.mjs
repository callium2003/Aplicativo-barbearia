import assert from 'node:assert/strict';
import test from 'node:test';
import { createCriticalConfig, requireCriticalTarget } from '../scripts/critical-test-environment.mjs';

test('critical fixtures reject remote, alternate loopback and malformed API targets', () => {
  for (const target of ['https://irszgnkzqseljowckrgz.supabase.co', 'http://localhost:56321', 'http://127.0.0.1:55321', 'http://127.0.0.1:56321.evil.test', undefined]) {
    assert.throws(() => requireCriticalTarget(target), /isolado/);
  }
  assert.equal(requireCriticalTarget('http://127.0.0.1:56321'), 'http://127.0.0.1:56321');
});

test('critical stack starts with schema migrations disabled until Auth and Storage exist', () => {
  const source = 'project_id = "barbeariasp-platform"\nport = 54321\n[db.migrations]\nenabled = true\n[db.seed]\nsql_paths = ["./seed.sql"]\n[storage]\nenabled = false\n[auth]\nsite_url = "http://127.0.0.1:3000"\n';
  const config = createCriticalConfig(source, 'barbeariasp-critical-test123');
  assert.match(config, /project_id = "barbeariasp-critical-test123"/);
  assert.match(config, /port = 56321/);
  assert.match(config, /\[db.migrations\]\nenabled = false/);
  assert.match(config, /sql_paths = \[\]/);
  assert.match(config, /\[storage\]\nenabled = true/);
  assert.match(config, /127\.0\.0\.1:3007/);
  assert.throws(() => createCriticalConfig(source, 'barbeariasp-platform'), /exclusivo/);
});
