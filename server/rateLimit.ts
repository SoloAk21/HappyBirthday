/**
 * Sliding-window limiter for unlock attempts.
 *
 * Memory is per function instance. With Vercel Fluid compute an instance
 * serves many requests, so this throttles casual guessing well; the strong,
 * slow (scrypt) passphrase check is what makes brute force impractical.
 * A Vercel Firewall rate-limit rule on POST /api/session adds a global layer.
 */
export interface Limiter {
  check(key: string, now?: number): { allowed: boolean; retryAfter: number };
  /** Successful unlock clears the failures for that key. */
  reset(key: string): void;
  fail(key: string, now?: number): void;
}

export function createLimiter(maxFailures: number, windowMs: number, maxKeys = 5000): Limiter {
  const failures = new Map<string, number[]>();

  const prune = (key: string, now: number) => {
    const list = (failures.get(key) ?? []).filter((t) => now - t < windowMs);
    if (list.length) failures.set(key, list);
    else failures.delete(key);
    return list;
  };

  return {
    check(key, now = Date.now()) {
      const list = prune(key, now);
      if (list.length < maxFailures) return { allowed: true, retryAfter: 0 };
      const oldest = list[0] ?? now;
      return { allowed: false, retryAfter: Math.ceil((oldest + windowMs - now) / 1000) };
    },
    fail(key, now = Date.now()) {
      if (failures.size >= maxKeys && !failures.has(key)) {
        const first = failures.keys().next().value;
        if (first !== undefined) failures.delete(first);
      }
      const list = prune(key, now);
      list.push(now);
      failures.set(key, list);
    },
    reset(key) {
      failures.delete(key);
    },
  };
}
