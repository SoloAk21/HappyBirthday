// Upload the private bundle (.private/site) to a PRIVATE Vercel Blob store.
// Requires BLOB_READ_WRITE_TOKEN for a store created with access "private".
// Usage: node --env-file=.env.local scripts/upload-private.mjs [dir] [prefix]
import { readdir, readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { put } from '@vercel/blob';

const [dir = '.private/site', prefix = 'private/'] = process.argv.slice(2);
if (!process.env.BLOB_READ_WRITE_TOKEN) {
  console.error('BLOB_READ_WRITE_TOKEN is not set.');
  process.exit(1);
}
const types = { mp4: 'video/mp4', webp: 'image/webp', json: 'application/json' };
const files = ['content.json', ...(await readdir(join(dir, 'media'))).map((f) => `media/${f}`)];
for (const f of files) {
  const body = await readFile(join(dir, f));
  await put(prefix + f, body, {
    access: 'private',
    addRandomSuffix: false,
    allowOverwrite: true,
    contentType: types[f.split('.').pop()] ?? 'application/octet-stream',
    multipart: body.length > 8 * 1024 * 1024,
  });
  console.log(`uploaded ${prefix}${f} (${(body.length / 1e6).toFixed(2)} MB)`);
}
