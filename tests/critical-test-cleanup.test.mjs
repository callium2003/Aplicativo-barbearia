import assert from 'node:assert/strict';
import { EventEmitter } from 'node:events';
import { spawn } from 'node:child_process';
import test from 'node:test';
import { installCriticalCleanup } from '../scripts/critical-test-cleanup.mjs';

test('cleanup is idempotent across normal completion and interruption', () => {
  const target = new EventEmitter();
  const exits = [];
  target.exit = code => exits.push(code);
  let calls = 0;
  const cleanup = installCriticalCleanup(() => { calls += 1; }, target);
  target.emit('SIGINT');
  target.emit('SIGTERM');
  cleanup();
  assert.equal(calls, 1);
  assert.deepEqual(exits, [130, 143]);
});

for (const [signal, code] of [['SIGINT', 130], ['SIGTERM', 143]]) {
  test(`runner signal path ${signal} cleans before exiting ${code} without Docker`, async () => {
    const moduleUrl = new URL('../scripts/critical-test-cleanup.mjs', import.meta.url).href;
    const source = `import { installCriticalCleanup } from ${JSON.stringify(moduleUrl)};
      import { writeSync } from 'node:fs';
      installCriticalCleanup(() => writeSync(1, 'cleaned'));
      process.on('message', signal => process.emit(signal));
      process.send('ready');`;
    const child = spawn(process.execPath, ['--input-type=module', '-e', source], { stdio: ['ignore', 'pipe', 'pipe', 'ipc'] });
    let output = '';
    child.stdout.on('data', data => { output += data; });
    child.on('message', () => child.send(signal));
    const exit = await new Promise((resolve, reject) => {
      child.on('error', reject);
      child.on('exit', resolve);
    });
    assert.equal(exit, code);
    assert.equal(output, 'cleaned');
  });
}
