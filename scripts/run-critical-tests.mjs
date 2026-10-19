// Stack descartável, exclusivo e sem link remoto. Nunca lê .env nem copia dados.
import { execFileSync, spawn } from 'node:child_process';
import { randomBytes } from 'node:crypto';
import { cp, mkdir, readFile, readdir, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { createCriticalConfig, requireCriticalTarget, CRITICAL_API } from './critical-test-environment.mjs';
import { installCriticalCleanup } from './critical-test-cleanup.mjs';

const root = fileURLToPath(new URL('../', import.meta.url));
process.chdir(root);
const id = randomBytes(6).toString('hex');
const project = `barbeariasp-critical-${id}`;
const directory = `.tmp/critical-tests/${id}`;
const container = `supabase_db_${project}`;
const children = [];
let started = false;
let localSecrets = [];
let gatewayOutput = '';
function sanitize(value) {
  let text = String(value);
  for (const secret of localSecrets) text = text.replaceAll(secret, '[redigido]');
  return text.replace(/(?:sb_secret_|sb_publishable_|eyJ)[A-Za-z0-9_.-]+/g, '[redigido]');
}
function cli(args, timeout = 300_000) {
  try {
    return execFileSync(process.execPath, ['node_modules/supabase/dist/supabase.js', ...args, '--workdir', directory], {
      encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'], timeout,
    });
  } catch (error) {
    // start/status podem conter chaves locais: não imprimir stdout nem o objeto de erro.
    const message = String(error.stderr ?? '').replace(/(?:sb_secret_|sb_publishable_|eyJ)[A-Za-z0-9_.-]+/g, '[redigido]');
    throw new Error(`Stack isolado: ${args[0]} falhou. ${message.slice(0, 1500)} ${message.slice(-300)}`);
  }
}
function sql(source) {
  return execFileSync('docker', ['exec', '-i', container, 'psql', '-X', '-U', 'postgres', '-d', 'postgres', '-v', 'ON_ERROR_STOP=1'], {
    input: source, encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe'], timeout: 120_000,
  });
}
const cleanup = installCriticalCleanup(() => {
  for (const child of children.reverse()) {
    if (child.exitCode !== null) continue;
    if (process.platform === 'win32') {
      try { execFileSync('taskkill', ['/pid', String(child.pid), '/t', '/f'], { stdio: 'ignore' }); } catch { /* já encerrado */ }
    } else child.kill('SIGTERM');
  }
  if (started) {
    // project é gerado por este processo; --no-backup remove apenas seus volumes fictícios.
    try { cli(['stop', '--project-id', project, '--no-backup']); console.log('Stack exclusivo encerrado; volumes fictícios removidos.'); }
    catch (error) { console.error(error.message); process.exitCode = 1; }
  }
});
try {
  execFileSync('docker', ['info', '--format', '{{.ServerVersion}}'], { stdio: 'pipe', timeout: 15_000 });
  await mkdir(`${directory}/supabase`, { recursive: true });
  const config = createCriticalConfig(await readFile('supabase/config.toml', 'utf8'), project);
  await writeFile(`${directory}/supabase/config.toml`, config);
  await cp('supabase/migrations', `${directory}/supabase/migrations`, { recursive: true });
  await mkdir(`${directory}/supabase/functions`, { recursive: true });
  await cp('supabase/functions/public-booking-gateway', `${directory}/supabase/functions/public-booking-gateway`, { recursive: true });
  started = true;
  console.log('Inicializando Auth/Storage no stack descartável (API loopback 56321).');
  cli(['start', '-x', 'studio,postgres-meta,edge-runtime,logflare,vector,supavisor,imgproxy,realtime']);
  const status = JSON.parse(cli(['status', '-o', 'json']));
  requireCriticalTarget(status.API_URL);
  localSecrets = [status.ANON_KEY, status.SERVICE_ROLE_KEY, status.JWT_SECRET, status.DB_URL].filter(value => typeof value === 'string' && value.length > 10);
  await writeFile(`${directory}/supabase/config.toml`, config.replace(/(\[db.migrations\][\s\S]*?enabled = )false/, '$1true'));
  console.log('Aplicando todas as migrations do checkout no banco novo.');
  cli(['migration', 'up', '--local', '--include-all']);
  const migrations = (await readdir('supabase/migrations')).filter(name => name.endsWith('.sql')).length;
  const applied = Number(sql('select count(*) from supabase_migrations.schema_migrations;').match(/\n\s*(\d+)\s*\n/)?.[1]);
  if (applied !== migrations) throw new Error(`Linhagem incompleta: ${applied}/${migrations}.`);
  console.log(`Linhagem isolada: ${applied}/${migrations} migrations.`);
  for (const name of ['public-request-rate-limit.sql', 'tenant-catalog-grants-remote.sql', 'critical-booking-and-invitation.sql']) {
    try { sql(await readFile(`tests/${name}`, 'utf8')); }
    catch (error) { throw new Error(`Fixture ${name} falhou: ${String(error.stderr ?? '').slice(-2200)}`); }
    console.log(`SQL aprovado: ${name}`);
  }
  if (!process.argv.includes('--sql-only')) {
    // Runtime pedido pela CLI 2.111.0. O ECR público pode negar egress por quota;
    // pré-carrega a MESMA versão do publisher oficial, com digest amd64 fixado.
    const edgeImage = 'public.ecr.aws/supabase/edge-runtime:v1.74.2';
    try { execFileSync('docker', ['image', 'inspect', edgeImage], { stdio: 'ignore', timeout: 10_000 }); }
    catch {
      const mirror = 'docker.io/supabase/edge-runtime@sha256:2df6853c27aeab7063e4b6078b0ac9747c039d8c008b770cd4e6a62b29c285bb';
      console.log('Carregando Edge Runtime v1.74.2 pelo espelho oficial com digest fixo.');
      execFileSync('docker', ['pull', '--platform', 'linux/amd64', mirror], { stdio: 'inherit', timeout: 180_000 });
      execFileSync('docker', ['tag', mirror, edgeImage], { stdio: 'pipe', timeout: 10_000 });
    }
    const env = { ...process.env, CRITICAL_WORKDIR: directory, CRITICAL_API_URL: CRITICAL_API, CRITICAL_ANON_KEY: status.ANON_KEY, CRITICAL_SERVICE_KEY: status.SERVICE_ROLE_KEY };
    const gateway = spawn(process.execPath, ['node_modules/supabase/dist/supabase.js', 'functions', 'serve', 'public-booking-gateway', '--workdir', directory, '--inspect-mode', 'run'], { env, stdio: ['ignore', 'pipe', 'pipe'] });
    for (const stream of [gateway.stdout, gateway.stderr]) stream.on('data', data => { gatewayOutput = (gatewayOutput + sanitize(data)).slice(-6000); });
    children.push(gateway);
    await new Promise((resolve, reject) => {
      const tests = spawn(process.execPath, ['node_modules/@playwright/test/cli.js', 'test', '--config', 'playwright.config.mjs'], { env, stdio: 'inherit' });
      children.push(tests);
      tests.on('error', reject);
      tests.on('exit', code => code === 0 ? resolve() : reject(new Error(`E2E falhou (exit ${code}).`)));
    });
  }
} catch (error) {
  console.error(sanitize(error.message));
  if (gatewayOutput) console.error(`Diagnóstico do gateway local: ${gatewayOutput}`);
  if (children.length) {
    try {
      const logs = execFileSync('docker', ['logs', '--tail', '35', `supabase_edge_runtime_${project}`], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'], timeout: 10_000 });
      if (logs) console.error(sanitize(logs));
    } catch { /* diagnóstico auxiliar não substitui a falha original */ }
  }
  process.exitCode = 1;
} finally {
  cleanup();
}
