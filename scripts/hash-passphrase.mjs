// Usage: node scripts/hash-passphrase.mjs "our secret words"
// Prints env lines for SITE_PASSPHRASE_HASH and a fresh SESSION_SECRET.
// (Node >= 22.18 / 24 runs the TypeScript module directly.)
import { randomBytes } from 'node:crypto';
import { hashPassphrase, normalizePassphrase } from '../server/auth.ts';

const phrase = process.argv.slice(2).join(' ');
if (!phrase.trim()) {
  console.error('Usage: node scripts/hash-passphrase.mjs "your secret words"');
  process.exit(1);
}
if (normalizePassphrase(phrase).length < 10)
  console.warn('Warning: use at least 10 characters (a short phrase is best).');
console.log(`SITE_PASSPHRASE_HASH=${await hashPassphrase(phrase)}`);
console.log(`SESSION_SECRET=${randomBytes(32).toString('base64url')}`);
