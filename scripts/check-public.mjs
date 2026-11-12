// Guard against leaking private material into the public repo or bundle.
// Checks: git-tracked files + dist/ for media files, Ethiopic text, and (when
// .private/content.source.json exists locally) any distinctive private phrase.
import { execSync } from 'node:child_process';
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

const problems = [];
const MEDIA = /\.(mp4|mov|webm|jpe?g|png|webp|avif|heic|gif|m4a|mp3|wav)$/i;
const ALLOWED_MEDIA = [/^public\/brand\//, /^tests\/fixtures\/site\/media\//];
const TEXT = /\.(ts|tsx|js|mjs|json|html|css|md|yml|yaml|txt|svg)$/i;
// The generic, pre-unlock Amharic text lives in exactly one reviewed source file.
// Its strings may appear in that file and in the built bundle, nowhere else.
const PUBLIC_AM_FILE = 'src/i18n/public.ts';
const publicAm = existsSync(PUBLIC_AM_FILE)
  ? [...readFileSync(PUBLIC_AM_FILE, 'utf8').matchAll(/'([^']*[ሀ-፿][^']*)'/g)].map((m) => m[1])
  : [];
const stripPublicAm = (t) => publicAm.reduce((acc, s) => acc.split(s).join(''), t);

const tracked = execSync('git ls-files --cached --others --exclude-standard', { encoding: 'utf8' })
  .split('\n')
  .filter(Boolean);

const walk = (d) =>
  existsSync(d)
    ? readdirSync(d).flatMap((f) =>
        statSync(join(d, f)).isDirectory() ? walk(join(d, f)) : [join(d, f).split('\\').join('/')],
      )
    : [];
const files = [...new Set([...tracked, ...walk('dist')])];

let phrases = [];
if (existsSync('.private/content.source.json')) {
  const src = JSON.parse(readFileSync('.private/content.source.json', 'utf8'));
  const collect = (v) =>
    typeof v === 'string'
      ? [v]
      : v && typeof v === 'object'
        ? Object.values(v).flatMap(collect)
        : [];
  // Long, distinctive strings only (skip generic UI words like "Chapter IV").
  phrases = [...new Set(collect(src))].filter((s) => s.length >= 24);
}

for (const f of files) {
  if (f.startsWith('.private/') || f.startsWith('node_modules/')) {
    problems.push(`${f}: private/dependency path is tracked`);
    continue;
  }
  if (MEDIA.test(f) && !ALLOWED_MEDIA.some((r) => r.test(f)))
    problems.push(`${f}: media file outside public/brand`);
  if (!TEXT.test(f) || f === 'scripts/check-public.mjs' || !existsSync(f)) continue;
  const text = readFileSync(f, 'utf8');
  const allowsAm = f === PUBLIC_AM_FILE || f.startsWith('dist/');
  if (/[ሀ-፿]/.test(allowsAm ? stripPublicAm(text) : text))
    problems.push(`${f}: contains Ethiopic (Amharic) text — personal content belongs in .private`);
  for (const p of phrases)
    if (text.includes(p)) problems.push(`${f}: contains private phrase "${p.slice(0, 40)}…"`);
}

if (problems.length) {
  console.error('Public-safety check FAILED:\n - ' + problems.join('\n - '));
  process.exit(1);
}
console.log(
  `Public-safety check passed (${files.length} files${phrases.length ? `, ${phrases.length} private phrases` : ''}).`,
);
