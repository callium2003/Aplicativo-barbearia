// DEMO EXCLUSIVAMENTE LOCAL. Não vincula projeto, não lê .env, não faz reset.
import { execFileSync } from 'node:child_process';
import { cp, mkdir, readFile, writeFile } from 'node:fs/promises';
const directory = '.tmp/landing-demo';
await mkdir(`${directory}/supabase`, { recursive: true });
let config = await readFile('supabase/config.toml', 'utf8');
config = config.replace('project_id = "barbeariasp-platform"', 'project_id = "barbeariasp-landing-demo"')
  .replaceAll('5432', '5532').replaceAll('3000', '3005').replaceAll('8083', '8183')
  .replace('sql_paths = ["./seed.sql"]', 'sql_paths = []')
  .replace('policy = "per_worker"', 'policy = "oneshot"')
  .replace(/(\[storage\][\s\S]*?enabled = )false/, '$1true')
  .replace(/(\[db.migrations\][\s\S]*?enabled = )true/, '$1false')
  .replace(/^\[functions\.(?!public-booking-gateway\])[^\]]+\][\s\S]*?(?=^\[|$(?![\s\S]))/gm, '');
if (!config.includes('project_id = "barbeariasp-landing-demo"')) throw new Error('DEMO: configuração de origem inesperada.');
await writeFile(`${directory}/supabase/config.toml`, config);
await cp('supabase/migrations', `${directory}/supabase/migrations`, { recursive: true });
await mkdir(`${directory}/supabase/functions`, { recursive: true });
await cp('supabase/functions/public-booking-gateway', `${directory}/supabase/functions/public-booking-gateway`, { recursive: true });
function cli(args) {
  try {
    // A CLI imprime credenciais locais no status/start; nunca encaminhá-las ao console.
    execFileSync(process.execPath, ['node_modules/supabase/dist/supabase.js', ...args, '--workdir', directory], { stdio: ['ignore', 'pipe', 'pipe'] });
  } catch {
    throw new Error(`DEMO: ${args[0]} falhou. Interrompido; conferir o stack local antes de tentar novamente.`);
  }
}
cli(['start', '-x', 'studio,postgres-meta,edge-runtime,logflare,vector,supavisor,imgproxy,realtime']);
// Storage/Auth precisam existir antes das migrations do produto.
await writeFile(`${directory}/supabase/config.toml`, config.replace(/(\[db.migrations\][\s\S]*?enabled = )false/, '$1true'));
cli(['migration', 'up', '--local', '--include-all']);
console.log('DEMO LOCAL preparado: API 127.0.0.1:55321. Banco anterior preservado; seed deve ser executado separadamente.');
