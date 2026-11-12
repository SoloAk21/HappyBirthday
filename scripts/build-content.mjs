// Compose the private site bundle (git-ignored):
//   .private/content.source.json + .private/media/manifest.json
//     -> .private/site/content.json  (+ media copied to .private/site/media/)
// Usage: node scripts/build-content.mjs [sourceJson] [mediaDir] [outDir]
import { copyFile, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { validateContent } from './content-schema.mjs';

const [src = '.private/content.source.json', mediaDir = '.private/media', out = '.private/site'] =
  process.argv.slice(2);

const content = JSON.parse(await readFile(src, 'utf8'));
const manifest = JSON.parse(await readFile(join(mediaDir, 'manifest.json'), 'utf8'));

const pick = (list) => list?.map(({ file, width, height }) => ({ file, width, height }));
const media = {};
for (const a of manifest) {
  media[a.id] =
    a.kind === 'video'
      ? {
          id: a.id,
          kind: 'video',
          file: a.file,
          width: a.width,
          height: a.height,
          duration: a.duration,
          poster: pick(a.poster),
        }
      : { id: a.id, kind: 'image', variants: pick(a.variants) };
}
const site = { ...content, media };

const errors = validateContent(site);
if (errors.length) {
  console.error('Content problems:\n - ' + errors.join('\n - '));
  process.exit(1);
}

// start clean so nothing unreferenced (e.g. a withdrawn track) is ever uploaded
await rm(join(out, 'media'), { recursive: true, force: true });
await mkdir(join(out, 'media'), { recursive: true });
const files = new Set();
for (const a of Object.values(media)) {
  if (a.file) files.add(a.file);
  for (const v of [...(a.poster ?? []), ...(a.variants ?? [])]) files.add(v.file);
}
// A music track is only bundled when the content names it (i.e. once its
// publication rights are confirmed) and the processed file is in mediaDir.
if (site.music) files.add(site.music.file);
for (const f of Object.values(site.fonts ?? {})) if (f) files.add(f);
for (const f of files) await copyFile(join(mediaDir, f), join(out, 'media', f));
await writeFile(join(out, 'content.json'), JSON.stringify(site));
console.log(
  `content.json written with ${Object.keys(media).length} assets, ${files.size} media files.`,
);
