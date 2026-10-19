import { execFileSync, spawn } from 'node:child_process';

export function spawnCriticalProcess(command, args, options) {
  return spawn(command, args, { ...options, detached: process.platform !== 'win32' });
}

export async function stopCriticalProcess(child, graceMs = 5000) {
  if (child.exitCode !== null) return;
  if (process.platform === 'win32') {
    try { execFileSync('taskkill', ['/pid', String(child.pid), '/t', '/f'], { stdio: 'ignore' }); } catch { /* já encerrado */ }
    return;
  }
  // PID negativo identifica somente o grupo exclusivo criado por este runner.
  const signal = value => { try { process.kill(-child.pid, value); } catch (error) { if (error.code !== 'ESRCH') throw error; } };
  await new Promise((resolve, reject) => {
    let forceTimer;
    const finish = error => {
      clearTimeout(timer);
      clearTimeout(forceTimer);
      child.removeListener('close', closed);
      child.removeListener('error', finish);
      if (error) reject(error); else resolve();
    };
    const closed = () => finish();
    const timer = setTimeout(() => {
      try { signal('SIGKILL'); } catch (error) { finish(error); return; }
      forceTimer = setTimeout(() => finish(new Error('Processo isolado não encerrou após SIGKILL.')), 2000);
    }, graceMs);
    child.once('close', closed);
    child.once('error', finish);
    try { signal('SIGTERM'); } catch (error) { finish(error); }
  });
}
