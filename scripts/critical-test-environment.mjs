export const CRITICAL_API = 'http://127.0.0.1:56321';
export const CRITICAL_APP = 'http://127.0.0.1:3007';

export function requireCriticalTarget(value) {
  if (value !== CRITICAL_API) throw new Error('Destino diferente do stack isolado; fixtures bloqueadas.');
  return value;
}

export function createCriticalConfig(source, project) {
  if (!/^barbeariasp-critical-[a-z0-9]+$/.test(project)) throw new Error('Projeto exclusivo de testes obrigatório.');
  if (!source.includes('project_id = "barbeariasp-platform"')) throw new Error('Configuração de origem inesperada.');
  return source.replace('project_id = "barbeariasp-platform"', `project_id = "${project}"`)
    .replaceAll('5432', '5632').replaceAll('3000', '3007').replaceAll('8083', '8283')
    .replace('sql_paths = ["./seed.sql"]', 'sql_paths = []')
    .replace('policy = "per_worker"', 'policy = "oneshot"')
    .replace(/(\[storage\][\s\S]*?enabled = )false/, '$1true')
    .replace(/(\[db.migrations\][\s\S]*?enabled = )true/, '$1false')
    .replace(/^\[functions\.(?!public-booking-gateway\])[^\]]+\][\s\S]*?(?=^\[|$(?![\s\S]))/gm, '');
}
