// Usage: node scripts/hash-passphrase.mjs            (asks for the words)
//        node scripts/hash-passphrase.mjs "our secret words"
// Prints env lines for SITE_PASSPHRASE_HASH and a fresh SESSION_SECRET.
// Prompts go to stderr, so `> file` captures only the env lines.
// (Node >= 22.18 / 24 runs the TypeScript module directly.)
import { randomBytes } from 'node:crypto';
import { createInterface } from 'node:readline/promises';
import { hashPassphrase, normalizePassphrase } from '../server/auth.ts';

// Phrases used only for local development and automated tests.
const TEST_PHRASES = ['moonlight test words', 'little moon test'];

let phrase = process.argv.slice(2).join(' ');
if (!phrase.trim()) {
  const rl = createInterface({ input: process.stdin, output: process.stderr });
  phrase = await rl.question('Secret words: ');
  rl.close();
}
const normalized = normalizePassphrase(phrase);
if (!normalized) {
  console.error('No secret words given.');
  process.exit(1);
}
if (TEST_PHRASES.some((t) => normalizePassphrase(t) === normalized)) {
  console.error('These are the local test words. Choose different words for the real site.');
  process.exit(1);
}
if (normalized.length < 10)
  console.error('Warning: use at least 10 characters (a short phrase is best).');
console.log(`SITE_PASSPHRASE_HASH=${await hashPassphrase(phrase)}`);
console.log(`SESSION_SECRET=${randomBytes(32).toString('base64url')}`);
