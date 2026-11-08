import test from 'node:test';
import assert from 'node:assert/strict';
import { requireSandboxDatabaseTarget } from '../utils/billing-sandbox-target.mjs';
test('accepts only isolated loopback or explicitly enabled shared test project', () => {
 assert.equal(requireSandboxDatabaseTarget('http://127.0.0.1:56321', false), 'http://127.0.0.1:56321');
 assert.equal(requireSandboxDatabaseTarget('https://irszgnkzqseljowckrgz.supabase.co', true), 'https://irszgnkzqseljowckrgz.supabase.co');
 for (const [url, enabled] of [['https://irszgnkzqseljowckrgz.supabase.co',false],['https://other.supabase.co',true],['http://evil.test:56321',true],['http://127.0.0.1:3000',false],['https://irszgnkzqseljowckrgz.supabase.co.evil.test',true]]) {
  assert.throws(() => requireSandboxDatabaseTarget(url,enabled));
 }
});
