import { createHmac, randomBytes, scrypt as scryptCb, timingSafeEqual } from 'node:crypto';
import { promisify } from 'node:util';

const scrypt = promisify(scryptCb) as (
  password: string,
  salt: Buffer,
  keylen: number,
  options: { N: number; r: number; p: number; maxmem: number },
) => Promise<Buffer>;

export const SESSION_COOKIE = 'moon_session';
export const SESSION_TTL_SECONDS = 60 * 60 * 24 * 45; // 45 days

/**
 * Passphrases are typed on phones: forgive case, surrounding spaces,
 * repeated spaces and curly apostrophes so the right words always work.
 */
export function normalizePassphrase(input: string): string {
  return input.normalize('NFKC').replace(/[‘’]/g, "'").trim().replace(/\s+/g, ' ').toLowerCase();
}

const SCRYPT = { N: 1 << 15, r: 8, p: 1, maxmem: 64 * 1024 * 1024 };

/** Format: scrypt:N:r:p:saltB64:hashB64 */
export async function hashPassphrase(passphrase: string): Promise<string> {
  const salt = randomBytes(16);
  const hash = await scrypt(normalizePassphrase(passphrase), salt, 32, SCRYPT);
  return [
    'scrypt',
    SCRYPT.N,
    SCRYPT.r,
    SCRYPT.p,
    salt.toString('base64'),
    hash.toString('base64'),
  ].join(':');
}

export async function verifyPassphrase(passphrase: string, stored: string): Promise<boolean> {
  const parts = stored.split(':');
  if (parts.length !== 6 || parts[0] !== 'scrypt') return false;
  const [, n, r, p, saltB64, hashB64] = parts as [string, string, string, string, string, string];
  const expected = Buffer.from(hashB64, 'base64');
  const actual = await scrypt(
    normalizePassphrase(passphrase),
    Buffer.from(saltB64, 'base64'),
    expected.length,
    {
      N: Number(n),
      r: Number(r),
      p: Number(p),
      maxmem: SCRYPT.maxmem,
    },
  );
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}

function b64url(buf: Buffer): string {
  return buf.toString('base64url');
}

function sign(payload: string, secret: string): string {
  return b64url(createHmac('sha256', secret).update(payload).digest());
}

export interface SessionPayload {
  v: 1;
  /** issued-at, seconds */
  iat: number;
  /** expiry, seconds */
  exp: number;
  /** random id so tokens are unique */
  jti: string;
}

export function createSessionToken(secret: string, now = Date.now()): string {
  const iat = Math.floor(now / 1000);
  const payload: SessionPayload = {
    v: 1,
    iat,
    exp: iat + SESSION_TTL_SECONDS,
    jti: b64url(randomBytes(12)),
  };
  const body = b64url(Buffer.from(JSON.stringify(payload)));
  return `${body}.${sign(body, secret)}`;
}

export function verifySessionToken(
  token: string | undefined,
  secret: string,
  now = Date.now(),
): boolean {
  if (!token || token.length > 512) return false;
  const dot = token.indexOf('.');
  if (dot <= 0) return false;
  const body = token.slice(0, dot);
  const mac = token.slice(dot + 1);
  const expected = Buffer.from(sign(body, secret));
  const given = Buffer.from(mac);
  if (expected.length !== given.length || !timingSafeEqual(expected, given)) return false;
  try {
    const payload = JSON.parse(Buffer.from(body, 'base64url').toString('utf8')) as SessionPayload;
    return payload.v === 1 && typeof payload.exp === 'number' && payload.exp * 1000 > now;
  } catch {
    return false;
  }
}

export function parseCookies(header: string | null): Record<string, string> {
  const out: Record<string, string> = {};
  if (!header) return out;
  for (const part of header.split(';')) {
    const i = part.indexOf('=');
    if (i < 0) continue;
    const k = part.slice(0, i).trim();
    const v = part.slice(i + 1).trim();
    if (k) out[k] = decodeURIComponent(v);
  }
  return out;
}

export function sessionCookie(token: string, secure: boolean): string {
  return [
    `${SESSION_COOKIE}=${token}`,
    'Path=/',
    `Max-Age=${SESSION_TTL_SECONDS}`,
    'HttpOnly',
    'SameSite=Lax',
    secure ? 'Secure' : '',
  ]
    .filter(Boolean)
    .join('; ');
}

export function clearSessionCookie(secure: boolean): string {
  return [
    `${SESSION_COOKIE}=`,
    'Path=/',
    'Max-Age=0',
    'HttpOnly',
    'SameSite=Lax',
    secure ? 'Secure' : '',
  ]
    .filter(Boolean)
    .join('; ');
}
