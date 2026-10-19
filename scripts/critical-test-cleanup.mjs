export function installCriticalCleanup(stop, target = process) {
  let stopped = false;
  const cleanup = () => {
    if (stopped) return;
    stopped = true;
    stop();
  };
  for (const [signal, code] of [['SIGINT', 130], ['SIGTERM', 143]]) {
    target.once(signal, () => {
      try { cleanup(); } finally { target.exit(code); }
    });
  }
  return cleanup;
}
