import {
  SESSION_COOKIE,
  clearSessionCookie,
  createSessionToken,
  parseCookies,
  sessionCookie,
  verifyPassphrase,
  verifySessionToken,
} from './auth.js';
import { createLimiter } from './rateLimit.js';
import { blobStorage, localDirStorage, type ByteRange, type PrivateStorage } from './storage.js';

export interface ServerConfig {
  passphraseHash: string | undefined;
  sessionSecret: string | undefined;
  storage: PrivateStorage;
  secureCookies: boolean;
}

let cached: ServerConfig | undefined;

export function configFromEnv(env: NodeJS.ProcessEnv = process.env): ServerConfig {
  if (cached) return cached;
  const mode = env.PRIVATE_STORAGE ?? (env.VERCEL ? 'blob' : 'local');
  cached = {
    passphraseHash: env.SITE_PASSPHRASE_HASH,
    sessionSecret: env.SESSION_SECRET,
    storage:
      mode === 'blob'
        ? blobStorage(env.PRIVATE_BLOB_PREFIX ?? 'private/')
        : localDirStorage(env.PRIVATE_DIR ?? '.private/site'),
    secureCookies: env.COOKIE_SECURE !== 'false',
  };
  return cached;
}

const BASE_HEADERS: Record<string, string> = {
  'X-Content-Type-Options': 'nosniff',
  'X-Robots-Tag': 'noindex, nofollow, noarchive',
  'Referrer-Policy': 'no-referrer',
};

function json(body: unknown, status = 200, extra: Record<string, string> = {}): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...BASE_HEADERS,
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'no-store',
      ...extra,
    },
  });
}

function misconfigured(cfg: ServerConfig): boolean {
  return !cfg.passphraseHash || !cfg.sessionSecret || cfg.sessionSecret.length < 32;
}

export function isAuthenticated(req: Request, cfg: ServerConfig): boolean {
  if (misconfigured(cfg)) return false;
  const token = parseCookies(req.headers.get('cookie'))[SESSION_COOKIE];
  return verifySessionToken(token, cfg.sessionSecret!);
}

function clientKey(req: Request): string {
  const fwd = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim();
  return fwd || req.headers.get('x-real-ip') || 'unknown';
}

function sameOrigin(req: Request): boolean {
  const origin = req.headers.get('origin');
  if (!origin) return req.headers.get('sec-fetch-site') !== 'cross-site';
  try {
    const host =
      req.headers.get('x-forwarded-host') ?? req.headers.get('host') ?? new URL(req.url).host;
    return new URL(origin).host === host;
  } catch {
    return false;
  }
}

// 6 wrong guesses per IP per 15 minutes, plus a global ceiling per instance.
const perClient = createLimiter(6, 15 * 60 * 1000);
const global = createLimiter(60, 15 * 60 * 1000);

/** GET: status · POST: unlock · DELETE: lock again */
export async function handleSession(req: Request, cfg = configFromEnv()): Promise<Response> {
  if (misconfigured(cfg)) return json({ error: 'not_configured' }, 503);

  if (req.method === 'GET') return json({ authenticated: isAuthenticated(req, cfg) });

  if (req.method === 'DELETE') {
    if (!sameOrigin(req)) return json({ error: 'forbidden' }, 403);
    return json({ authenticated: false }, 200, {
      'Set-Cookie': clearSessionCookie(cfg.secureCookies),
    });
  }

  if (req.method !== 'POST')
    return json({ error: 'method_not_allowed' }, 405, { Allow: 'GET, POST, DELETE' });
  if (!sameOrigin(req)) return json({ error: 'forbidden' }, 403);

  const key = clientKey(req);
  for (const [limiter, k] of [
    [perClient, key],
    [global, '*'],
  ] as const) {
    const verdict = limiter.check(k);
    if (!verdict.allowed) {
      return json({ error: 'too_many_attempts', retryAfter: verdict.retryAfter }, 429, {
        'Retry-After': String(verdict.retryAfter),
      });
    }
  }

  let passphrase = '';
  try {
    const text = await req.text();
    if (text.length > 1024) return json({ error: 'bad_request' }, 400);
    const body = JSON.parse(text) as { passphrase?: unknown };
    if (typeof body.passphrase === 'string') passphrase = body.passphrase.slice(0, 200);
  } catch {
    return json({ error: 'bad_request' }, 400);
  }
  if (!passphrase.trim()) return json({ error: 'bad_request' }, 400);

  const ok = await verifyPassphrase(passphrase, cfg.passphraseHash!);
  if (!ok) {
    perClient.fail(key);
    global.fail('*');
    return json({ error: 'wrong_passphrase' }, 401);
  }
  perClient.reset(key);
  const token = createSessionToken(cfg.sessionSecret!);
  return json({ authenticated: true }, 200, {
    'Set-Cookie': sessionCookie(token, cfg.secureCookies),
  });
}

export async function handleContent(req: Request, cfg = configFromEnv()): Promise<Response> {
  if (req.method !== 'GET') return json({ error: 'method_not_allowed' }, 405);
  if (misconfigured(cfg)) return json({ error: 'not_configured' }, 503);
  if (!isAuthenticated(req, cfg)) {
    // The app's first-load probe asks politely so an anonymous visit does not
    // log a failed request; it still receives nothing but this flag.
    return req.headers.get('x-moon-probe') === '1'
      ? json({ authenticated: false }, 200, { Vary: 'Cookie' })
      : json({ error: 'unauthorized' }, 401);
  }
  const obj = await cfg.storage.get('content.json');
  if (!obj) return json({ error: 'not_found' }, 404);
  return new Response(obj.body, {
    status: 200,
    headers: {
      ...BASE_HEADERS,
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'private, no-store',
    },
  });
}

/** Only flat, known-shaped filenames: no paths, no traversal. */
export const MEDIA_NAME = /^[a-z0-9]+(?:-[a-z0-9]+)*(?:\.mp4|\.m4a|-\d{2,4}\.webp)$/;

export function parseRange(header: string | null, size: number): ByteRange | 'invalid' | undefined {
  if (!header) return undefined;
  const m = /^bytes=(\d*)-(\d*)$/.exec(header.trim());
  if (!m || (m[1] === '' && m[2] === '')) return 'invalid';
  let start: number;
  let end: number;
  if (m[1] === '') {
    const suffix = Number(m[2]);
    if (suffix === 0) return 'invalid';
    start = Math.max(0, size - suffix);
    end = size - 1;
  } else {
    start = Number(m[1]);
    end = m[2] === '' ? size - 1 : Math.min(Number(m[2]), size - 1);
  }
  if (start > end || start >= size) return 'invalid';
  return { start, end };
}

/** Cut [start, end] out of a full-object stream (fallback when storage ignores Range). */
export function sliceStream(
  body: ReadableStream<Uint8Array>,
  { start, end }: ByteRange,
): ReadableStream<Uint8Array> {
  let pos = 0;
  return body.pipeThrough(
    new TransformStream<Uint8Array, Uint8Array>({
      transform(chunk, controller) {
        const chunkStart = pos;
        const chunkEnd = pos + chunk.byteLength; // exclusive
        pos = chunkEnd;
        if (chunkEnd <= start || chunkStart > end) {
          if (chunkStart > end) controller.terminate();
          return;
        }
        const from = Math.max(0, start - chunkStart);
        const to = Math.min(chunk.byteLength, end + 1 - chunkStart);
        controller.enqueue(chunk.subarray(from, to));
      },
    }),
  );
}

export async function handleMedia(
  req: Request,
  name: string,
  cfg = configFromEnv(),
): Promise<Response> {
  if (req.method !== 'GET' && req.method !== 'HEAD')
    return json({ error: 'method_not_allowed' }, 405);
  if (misconfigured(cfg)) return json({ error: 'not_configured' }, 503);
  if (!isAuthenticated(req, cfg)) return json({ error: 'unauthorized' }, 401);
  if (!MEDIA_NAME.test(name)) return json({ error: 'not_found' }, 404);

  const rangeHeader = req.headers.get('range');
  const info = await cfg.storage.head(`media/${name}`);
  if (!info) return json({ error: 'not_found' }, 404);

  const headers: Record<string, string> = {
    ...BASE_HEADERS,
    'Content-Type': info.contentType,
    'Accept-Ranges': 'bytes',
    // private: browsers may cache, shared caches/CDN must not.
    'Cache-Control': 'private, max-age=86400',
    Vary: 'Cookie',
    'Cross-Origin-Resource-Policy': 'same-origin',
  };
  if (info.etag) headers.ETag = info.etag;

  if (!rangeHeader) {
    headers['Content-Length'] = String(info.size);
    if (req.method === 'HEAD') return new Response(null, { status: 200, headers });
    const obj = await cfg.storage.get(`media/${name}`);
    if (!obj) return json({ error: 'not_found' }, 404);
    return new Response(obj.body, { status: 200, headers });
  }

  const range = parseRange(rangeHeader, info.size);
  if (range === 'invalid' || !range) {
    return new Response(null, {
      status: 416,
      headers: { ...headers, 'Content-Range': `bytes */${info.size}` },
    });
  }
  headers['Content-Range'] = `bytes ${range.start}-${range.end}/${info.size}`;
  headers['Content-Length'] = String(range.end - range.start + 1);
  if (req.method === 'HEAD') return new Response(null, { status: 206, headers });

  const obj = await cfg.storage.get(`media/${name}`, range);
  if (!obj) return json({ error: 'not_found' }, 404);
  const body = obj.range ? obj.body : sliceStream(obj.body, range);
  return new Response(body, { status: 206, headers });
}
