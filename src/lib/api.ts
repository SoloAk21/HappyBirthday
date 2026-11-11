import type { SiteContent } from '../content/types';

export type UnlockResult =
  | { ok: true }
  | { ok: false; reason: 'wrong' | 'rate_limited' | 'unavailable'; retryAfter?: number };

export async function sessionStatus(): Promise<boolean> {
  try {
    const res = await fetch('/api/session', { credentials: 'same-origin', cache: 'no-store' });
    if (!res.ok) return false;
    const data = (await res.json()) as { authenticated?: boolean };
    return data.authenticated === true;
  } catch {
    return false;
  }
}

export async function unlock(passphrase: string): Promise<UnlockResult> {
  try {
    const res = await fetch('/api/session', {
      method: 'POST',
      credentials: 'same-origin',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ passphrase }),
    });
    if (res.ok) return { ok: true };
    if (res.status === 401) return { ok: false, reason: 'wrong' };
    if (res.status === 429) {
      const data = (await res.json().catch(() => ({}))) as { retryAfter?: number };
      return { ok: false, reason: 'rate_limited', retryAfter: data.retryAfter };
    }
    return { ok: false, reason: 'unavailable' };
  } catch {
    return { ok: false, reason: 'unavailable' };
  }
}

export async function lock(): Promise<void> {
  await fetch('/api/session', { method: 'DELETE', credentials: 'same-origin' }).catch(() => {});
}

export async function loadContent(): Promise<SiteContent | null> {
  const res = await fetch('/api/content', { credentials: 'same-origin', cache: 'no-store' });
  if (res.status === 401) return null;
  if (!res.ok) throw new Error(`content ${res.status}`);
  return (await res.json()) as SiteContent;
}

export const mediaUrl = (file: string) => `/api/media/${encodeURIComponent(file)}`;
