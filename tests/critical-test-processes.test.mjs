import assert from 'node:assert/strict';
import { once } from 'node:events';
import test from 'node:test';
import { spawnCriticalProcess, stopCriticalProcess } from '../scripts/critical-test-processes.mjs';

test('POSIX cleanup closes pipes inherited by a synchronous wrapper descendant', { skip: process.platform === 'win32', timeout: 8000 }, async () => {
  const source = `require('node:child_process').execFileSync(process.execPath, ['-e', "process.stdout.write('ready'); setInterval(() => {}, 1000)"], {stdio:'inherit'})`;
  const child = spawnCriticalProcess(process.execPath, ['-e', source], { stdio: ['ignore', 'pipe', 'pipe'] });
  const closed = once(child, 'close', { signal: AbortSignal.timeout(5000) });
  try {
    const [chunk] = await once(child.stdout, 'data', { signal: AbortSignal.timeout(3000) });
    assert.equal(String(chunk), 'ready');
    await stopCriticalProcess(child, 1000);
    await closed;
    assert.equal(child.stdout.destroyed, true);
  } finally {
    try { process.kill(-child.pid, 'SIGKILL'); } catch { /* grupo já encerrado */ }
  }
});

test('POSIX signal handler waits for forced termination of a descendant ignoring SIGTERM', { skip: process.platform === 'win32', timeout: 8000 }, async () => {
  const processes = new URL('../scripts/critical-test-processes.mjs', import.meta.url).href;
  const cleanup = new URL('../scripts/critical-test-cleanup.mjs', import.meta.url).href;
  const descendant = "process.on('SIGTERM', () => {}); process.stdout.write('ready'); setInterval(() => {}, 1000)";
  const wrapper = `require('node:child_process').execFileSync(process.execPath, ['-e', ${JSON.stringify(descendant)}], {stdio:'inherit'})`;
  const source = `import {spawnCriticalProcess, stopCriticalProcess} from ${JSON.stringify(processes)};
    import {installCriticalCleanup} from ${JSON.stringify(cleanup)};
    const child = spawnCriticalProcess(process.execPath, ['-e', ${JSON.stringify(wrapper)}], {stdio:['ignore','pipe','pipe']});
    child.stdout.on('data', () => process.send('ready'));
    child.stderr.resume();
    installCriticalCleanup(() => stopCriticalProcess(child, 100));
    process.on('message', () => process.emit('SIGINT'));`;
  const runner = spawnCriticalProcess(process.execPath, ['--input-type=module', '-e', source], { stdio: ['ignore', 'pipe', 'pipe', 'ipc'] });
  const closed = once(runner, 'close', { signal: AbortSignal.timeout(5000) });
  try {
    await once(runner, 'message', { signal: AbortSignal.timeout(3000) });
    runner.send('interrupt');
    const [code] = await closed;
    assert.equal(code, 130);
  } finally {
    try { process.kill(-runner.pid, 'SIGKILL'); } catch { /* runner encerrado */ }
  }
});
