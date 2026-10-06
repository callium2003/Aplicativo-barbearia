// DEMO LOCAL: não lê nem modifica .env.local e não usa credenciais remotas.
import { execFileSync, spawn } from 'node:child_process';
import { requireLocalDemoUrl } from './landing-demo-guard.mjs';
const status = JSON.parse(execFileSync(process.execPath, ['node_modules/supabase/dist/supabase.js', 'status', '--workdir', '.tmp/landing-demo', '-o', 'json'], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }));
requireLocalDemoUrl(status.API_URL);
const child = spawn(process.execPath, ['node_modules/next/dist/bin/next', 'dev', '--webpack', '--hostname', '127.0.0.1', '--port', '3005'], {
  stdio: 'inherit',
  env: { ...process.env, BARBEARIASP_LOCAL_DEMO: '1', NEXT_PUBLIC_SUPABASE_URL: status.API_URL, NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: status.ANON_KEY, SUPABASE_URL: status.API_URL, SUPABASE_SERVICE_ROLE_KEY: status.SERVICE_ROLE_KEY },
});
child.on('exit', code => { process.exitCode = code ?? 1; });
