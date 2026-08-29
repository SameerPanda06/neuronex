import { useEffect } from 'react';

/** Runs one request at a time and applies a small linear backoff after failures. */
export function useResilientPolling(
  task: () => Promise<boolean>,
  healthyIntervalMs: number,
  maximumIntervalMs = 30_000,
): void {
  useEffect(() => {
    let active = true;
    let timer: ReturnType<typeof setTimeout> | null = null;
    let failures = 0;

    const run = async () => {
      const succeeded = await task();
      if (!active) return;
      failures = succeeded ? 0 : failures + 1;
      const delay = Math.min(maximumIntervalMs, healthyIntervalMs * Math.max(1, failures + 1));
      timer = setTimeout(run, delay);
    };

    void run();
    return () => {
      active = false;
      if (timer) clearTimeout(timer);
    };
  }, [task, healthyIntervalMs, maximumIntervalMs]);
}
