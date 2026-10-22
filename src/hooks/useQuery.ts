'use client';
import { useCallback, useEffect, useRef, useState } from 'react';

interface Opts { interval?: number; enabled?: boolean }

/** Tiny data hook: fetch on mount / key change, optional polling (paused while the tab is hidden), keeps stale data while refreshing. */
export function useQuery<T>(key: string, fn: () => Promise<T>, opts: Opts = {}) {
  const { interval, enabled = true } = opts;
  const [data, setData] = useState<T | undefined>(undefined);
  const [error, setError] = useState<Error | null>(null);
  const [loading, setLoading] = useState(enabled);
  const fnRef = useRef(fn);
  fnRef.current = fn;
  const keyRef = useRef(key);
  const alive = useRef(true);

  const run = useCallback(async (silent: boolean) => {
    if (!silent) setLoading(true);
    const k = keyRef.current;
    try {
      const v = await fnRef.current();
      if (alive.current && k === keyRef.current) { setData(v); setError(null); }
    } catch (e) {
      if (alive.current && k === keyRef.current) setError(e as Error);
    } finally {
      if (alive.current && k === keyRef.current) setLoading(false);
    }
  }, []);

  useEffect(() => {
    alive.current = true;
    keyRef.current = key;
    if (!enabled) { setLoading(false); return; }
    setError(null);
    void run(false);
    let t: ReturnType<typeof setInterval> | undefined;
    if (interval) t = setInterval(() => { if (!document.hidden) void run(true); }, interval);
    return () => { alive.current = false; if (t) clearInterval(t); };
  }, [key, enabled, interval, run]);

  return { data, error, loading, refetch: () => run(true) };
}
