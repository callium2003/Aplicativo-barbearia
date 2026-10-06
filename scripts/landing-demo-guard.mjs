export const DEMO_API_URL = 'http://127.0.0.1:55321';
export function requireLocalDemoUrl(value) {
  if (value !== DEMO_API_URL) throw new Error('DEMO: destino diferente do stack local exclusivo; execução bloqueada.');
  return value;
}
