/** CLI startup may finish before Storage binds its port on a slow machine.
 * This gate still requires real health, and never permits migrations on failure. */
export async function waitForCriticalStackHealth({ readHealth, pause, attempts = 120 }) {
 for (let attempt=0; attempt<attempts; attempt++) {
  const states = await readHealth();
  if (states.length === 5 && states.every(state=>state==='healthy')) return;
  if (states.some(state=>state==='missing'||state==='exited')) throw new Error('Isolated service stopped');
  if (attempt+1<attempts) await pause();
 }
 throw new Error('Isolated stack health timed out');
}
