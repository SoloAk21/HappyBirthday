// @vitest-environment node
import { describe, expect, it } from 'vitest';
import {
  createSessionToken,
  hashPassphrase,
  normalizePassphrase,
  parseCookies,
  sessionCookie,
  verifyPassphrase,
  verifySessionToken,
} from '../../server/auth.js';
import {
  MEDIA_NAME,
  handleContent,
  handleMedia,
  handleSession,
  parseRange,
  sliceStream,
  type ServerConfig,
} from '../../server/handlers.js';
import { createLimiter } from '../../server/rateLimit.js';
import type { PrivateStorage } from '../../server/storage.js';

const SECRET = 'x'.repeat(48);

function memoryStorage(files: Record<string, Uint8Array<ArrayBuffer> | string>): PrivateStorage {
  const bytes = (p: string): Uint8Array<ArrayBuffer> | undefined => {
    const v = files[p];
    return v === undefined ? undefined : typeof v === 'string' ? new TextEncoder().encode(v) : v;
  };
  return {
    async head(p: string) {
      const b = bytes(p);
      return b
        ? { size: b.length, contentType: p.endsWith('.mp4') ? 'video/mp4' : 'application/json' }
        : null;
    },
    async get(p: string) {
      const b = bytes(p);
      if (!b) return null;
      // Simulate a store that ignores Range: always the full body.
      return { body: new Response(b).body!, size: b.length, contentType: 'video/mp4' };
    },
  };
}

async function config(): Promise<ServerConfig> {
  return {
    passphraseHash: await hashPassphrase('our secret words'),
    sessionSecret: SECRET,
    secureCookies: true,
    storage: memoryStorage({
      'content.json': '{"hello":"moon"}',
      'media/clip.mp4': new Uint8Array(Array.from({ length: 1000 }, (_, i) => i % 256)),
    }),
  };
}

const req = (path: string, init: RequestInit & { cookie?: string } = {}) => {
  const headers = new Headers(init.headers);
  if (init.cookie) headers.set('cookie', init.cookie);
  headers.set('host', 'moon.test');
  return new Request(`https://moon.test${path}`, { ...init, headers });
};

const login = (cfg: ServerConfig, passphrase: string, ip = '1.1.1.1') =>
  handleSession(
    req('/api/session', {
      method: 'POST',
      body: JSON.stringify({ passphrase }),
      headers: {
        'content-type': 'application/json',
        origin: 'https://moon.test',
        'x-forwarded-for': ip,
      },
    }),
    cfg,
  );

describe('passphrase', () => {
  it('normalises phone-typed input', () => {
    expect(normalizePassphrase('  Our   Secret’s WORDS ')).toBe("our secret's words");
  });

  it('verifies only the right words', async () => {
    const h = await hashPassphrase('our secret words');
    expect(h.startsWith('scrypt:')).toBe(true);
    expect(await verifyPassphrase('Our Secret Words', h)).toBe(true);
    expect(await verifyPassphrase('our secret word', h)).toBe(false);
    expect(await verifyPassphrase('anything', 'garbage')).toBe(false);
  });
});

describe('session token', () => {
  it('round-trips and rejects tampering, wrong secrets and expiry', () => {
    const now = Date.now();
    const t = createSessionToken(SECRET, now);
    expect(verifySessionToken(t, SECRET, now)).toBe(true);
    expect(verifySessionToken(t, 'y'.repeat(48), now)).toBe(false);
    expect(verifySessionToken(t.slice(0, -2) + 'AA', SECRET, now)).toBe(false);
    const [body, mac] = t.split('.');
    const forged = Buffer.from(JSON.stringify({ v: 1, iat: 0, exp: 9e9, jti: 'x' })).toString(
      'base64url',
    );
    expect(verifySessionToken(`${forged}.${mac}`, SECRET, now)).toBe(false);
    expect(verifySessionToken(`${body}.${mac}`, SECRET, now + 46 * 86400 * 1000)).toBe(false);
    expect(verifySessionToken(undefined, SECRET)).toBe(false);
  });

  it('cookie is HttpOnly, Secure, SameSite', () => {
    const c = sessionCookie('abc', true);
    expect(c).toMatch(/HttpOnly/);
    expect(c).toMatch(/Secure/);
    expect(c).toMatch(/SameSite=Lax/);
    expect(parseCookies('a=1; moon_session=abc')).toEqual({ a: '1', moon_session: 'abc' });
  });
});

describe('rate limiter', () => {
  it('blocks after N failures inside the window and recovers after it', () => {
    const l = createLimiter(3, 1000);
    for (let i = 0; i < 3; i++) l.fail('ip', 0);
    expect(l.check('ip', 10).allowed).toBe(false);
    expect(l.check('ip', 10).retryAfter).toBe(1);
    expect(l.check('other', 10).allowed).toBe(true);
    expect(l.check('ip', 1001).allowed).toBe(true);
  });
});

describe('API handlers', () => {
  it('fails closed when not configured', async () => {
    const cfg = { ...(await config()), sessionSecret: undefined };
    expect((await handleContent(req('/api/content'), cfg)).status).toBe(503);
  });

  it('denies content and media without a session', async () => {
    const cfg = await config();
    expect((await handleContent(req('/api/content'), cfg)).status).toBe(401);
    expect((await handleMedia(req('/api/media/clip.mp4'), 'clip.mp4', cfg)).status).toBe(401);
    expect(
      (
        await handleMedia(
          req('/api/media/clip.mp4', { headers: { range: 'bytes=0-1' } }),
          'clip.mp4',
          cfg,
        )
      ).status,
    ).toBe(401);
  });

  it('rejects cross-origin unlock attempts', async () => {
    const cfg = await config();
    const res = await handleSession(
      req('/api/session', {
        method: 'POST',
        body: '{"passphrase":"our secret words"}',
        headers: { origin: 'https://evil.test' },
      }),
      cfg,
    );
    expect(res.status).toBe(403);
  });

  it('unlocks with the right words and then serves content + ranged media', async () => {
    const cfg = await config();
    expect((await login(cfg, 'nope', '2.2.2.2')).status).toBe(401);
    const ok = await login(cfg, 'Our Secret Words', '2.2.2.2');
    expect(ok.status).toBe(200);
    const cookie = ok.headers.get('set-cookie')!.split(';')[0]!;

    const content = await handleContent(req('/api/content', { cookie }), cfg);
    expect(content.status).toBe(200);
    expect(content.headers.get('cache-control')).toContain('no-store');
    expect(await content.json()).toEqual({ hello: 'moon' });

    const full = await handleMedia(req('/api/media/clip.mp4', { cookie }), 'clip.mp4', cfg);
    expect(full.status).toBe(200);
    expect(full.headers.get('cache-control')).toMatch(/^private/);
    expect((await full.arrayBuffer()).byteLength).toBe(1000);

    const part = await handleMedia(
      req('/api/media/clip.mp4', { cookie, headers: { range: 'bytes=10-19' } }),
      'clip.mp4',
      cfg,
    );
    expect(part.status).toBe(206);
    expect(part.headers.get('content-range')).toBe('bytes 10-19/1000');
    expect([...new Uint8Array(await part.arrayBuffer())]).toEqual([
      10, 11, 12, 13, 14, 15, 16, 17, 18, 19,
    ]);

    const bad = await handleMedia(
      req('/api/media/clip.mp4', { cookie, headers: { range: 'bytes=5000-' } }),
      'clip.mp4',
      cfg,
    );
    expect(bad.status).toBe(416);

    expect((await handleMedia(req('/x', { cookie }), '../content.json', cfg)).status).toBe(404);
    expect((await handleMedia(req('/x', { cookie }), 'missing.mp4', cfg)).status).toBe(404);
  });

  it('rate-limits repeated wrong guesses (429)', async () => {
    const cfg = await config();
    for (let i = 0; i < 6; i++) expect((await login(cfg, 'wrong', '9.9.9.9')).status).toBe(401);
    const res = await login(cfg, 'our secret words', '9.9.9.9');
    expect(res.status).toBe(429);
    expect(Number(res.headers.get('retry-after'))).toBeGreaterThan(0);
  });
});

describe('media helpers', () => {
  it('only allows flat, known media names', () => {
    for (const ok of [
      'film.mp4',
      'smile-loop.mp4',
      'final-1080.webp',
      'smile-loop-poster-544.webp',
    ])
      expect(MEDIA_NAME.test(ok)).toBe(true);
    for (const bad of [
      '../x.mp4',
      'a/b.mp4',
      'content.json',
      'x.webp',
      'X.mp4',
      '.mp4',
      'a..b.mp4',
    ])
      expect(MEDIA_NAME.test(bad)).toBe(false);
  });

  it('parses ranges', () => {
    expect(parseRange(null, 100)).toBeUndefined();
    expect(parseRange('bytes=0-', 100)).toEqual({ start: 0, end: 99 });
    expect(parseRange('bytes=-10', 100)).toEqual({ start: 90, end: 99 });
    expect(parseRange('bytes=50-500', 100)).toEqual({ start: 50, end: 99 });
    expect(parseRange('bytes=100-', 100)).toBe('invalid');
    expect(parseRange('bytes=0-1,5-6', 100)).toBe('invalid');
  });

  it('slices streams across chunk boundaries', async () => {
    const src = new ReadableStream<Uint8Array>({
      start(c) {
        c.enqueue(new Uint8Array([0, 1, 2, 3]));
        c.enqueue(new Uint8Array([4, 5, 6, 7]));
        c.enqueue(new Uint8Array([8, 9]));
        c.close();
      },
    });
    const out = new Uint8Array(
      await new Response(sliceStream(src, { start: 3, end: 8 })).arrayBuffer(),
    );
    expect([...out]).toEqual([3, 4, 5, 6, 7, 8]);
  });
});
