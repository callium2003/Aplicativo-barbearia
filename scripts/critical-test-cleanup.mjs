export function installCriticalCleanup(stop, target = process) {
  let stopped = false;
  let result;
  const cleanup = () => {
    if (stopped) return result;
    stopped = true;
    try { result = Promise.resolve(stop()); } catch (error) { result = Promise.reject(error); }
    return result;
  };
  for (const [signal, code] of [['SIGINT', 130], ['SIGTERM', 143]]) {
    target.once(signal, async () => {
      try { await cleanup(); } finally { target.exit(code); }
    });
  }
  return cleanup;
}
