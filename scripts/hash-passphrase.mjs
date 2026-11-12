// Usage: node scripts/hash-passphrase.mjs --out .private/prod.env   (asks for the words)
//        node scripts/hash-passphrase.mjs "our secret words"          (prints to stdout)
// Produces env lines for SITE_PASSPHRASE_HASH and a fresh SESSION_SECRET.
// (Node >= 22.18 / 24 runs the TypeScript module directly.)
import { randomBytes } from 'node:crypto';
import { writeFile } from 'node:fs/promises';
import { createInterface } from 'node:readline/promises';
import { hashPassphrase, normalizePassphrase } from '../server/auth.ts';

// Phrases used only for local development and automated tests.
const TEST_PHRASES = ['moonlight test words', 'little moon test'];

const args = process.argv.slice(2);
const outIdx = args.indexOf('--out');
const outFile = outIdx >= 0 ? args.splice(outIdx, 2)[1] : undefined;
let phrase = args.join(' ');
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
const lines =
  `SITE_PASSPHRASE_HASH=${await hashPassphrase(phrase)}\n` +
  `SESSION_SECRET=${randomBytes(32).toString('base64url')}\n`;
if (outFile) {
  await writeFile(outFile, lines, { encoding: 'utf8', mode: 0o600 });
  console.error(`Saved to ${outFile}. Keep this file private; never commit it.`);
} else {
  process.stdout.write(lines);
}
