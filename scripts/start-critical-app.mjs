import { cp, mkdir } from 'node:fs/promises';
import { spawn } from 'node:child_process';
import { resolve, sep } from 'node:path';
import { requireCriticalTarget } from './critical-test-environment.mjs';

requireCriticalTarget(process.env.CRITICAL_API_URL);
const root = resolve('.');
const snapshot = resolve(process.env.CRITICAL_WORKDIR ?? '', 'app');
if (!snapshot.startsWith(resolve('.tmp/critical-tests') + sep)) throw new Error('Snapshot deve estar no diretório isolado.');
await mkdir(snapshot, { recursive: true });
// Cópia permitida por lista explícita: .env, sessões, link remoto e outputs não entram.
for (const path of ['app', 'utils', 'public', 'next.config.ts', 'proxy.ts', 'tsconfig.json', 'package.json']) {
  await cp(resolve(path), resolve(snapshot, path), { recursive: true });
}
const child = spawn(process.execPath, [resolve(root, 'node_modules/next/dist/bin/next'), 'dev', '--webpack', '--hostname', '127.0.0.1', '--port', '3007'], {
  cwd: snapshot,
  stdio: 'inherit',
  env: {
    ...process.env,
    NEXT_PUBLIC_SUPABASE_URL: process.env.CRITICAL_API_URL,
    NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: process.env.CRITICAL_ANON_KEY,
    SUPABASE_URL: process.env.CRITICAL_API_URL,
    SUPABASE_SERVICE_ROLE_KEY: process.env.CRITICAL_SERVICE_KEY,
  },
});
for (const signal of ['SIGINT', 'SIGTERM']) process.on(signal, () => child.kill(signal));
child.on('exit', code => { process.exitCode = code ?? 1; });
