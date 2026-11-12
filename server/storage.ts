import { createReadStream } from 'node:fs';
import { stat } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { Readable } from 'node:stream';

export interface ByteRange {
  start: number;
  end: number; // inclusive
}

export interface StoredObject {
  body: ReadableStream<Uint8Array>;
  size: number;
  contentType: string;
  /** Present when the body already holds exactly the requested range. */
  range?: ByteRange;
  etag?: string;
}

export interface ObjectInfo {
  size: number;
  contentType: string;
  etag?: string;
}

export interface PrivateStorage {
  /** Returns null when the object does not exist. */
  head(path: string): Promise<ObjectInfo | null>;
  /** Returns null when the object does not exist. */
  get(path: string, range?: ByteRange): Promise<StoredObject | null>;
}

const TYPES: Record<string, string> = {
  mp4: 'video/mp4',
  m4a: 'audio/mp4',
  webp: 'image/webp',
  json: 'application/json; charset=utf-8',
  jpg: 'image/jpeg',
};

export function contentTypeFor(path: string): string {
  const ext = path.split('.').pop()?.toLowerCase() ?? '';
  return TYPES[ext] ?? 'application/octet-stream';
}

/** Local folder (git-ignored) used for development and tests. */
export function localDirStorage(root: string): PrivateStorage {
  const base = resolve(root);
  return {
    async head(path) {
      const full = resolve(join(base, path));
      if (!full.startsWith(base)) return null;
      try {
        const s = await stat(full);
        return s.isFile() ? { size: s.size, contentType: contentTypeFor(path) } : null;
      } catch {
        return null;
      }
    },
    async get(path, range) {
      const full = resolve(join(base, path));
      if (!full.startsWith(base)) return null;
      let size: number;
      try {
        const s = await stat(full);
        if (!s.isFile()) return null;
        size = s.size;
      } catch {
        return null;
      }
      const stream = createReadStream(
        full,
        range ? { start: range.start, end: range.end } : undefined,
      );
      return {
        body: Readable.toWeb(stream) as ReadableStream<Uint8Array>,
        size,
        contentType: contentTypeFor(path),
        range,
      };
    },
  };
}

/** Vercel Blob store with access: 'private'. Token/OIDC comes from env. */
export function blobStorage(prefix = ''): PrivateStorage {
  return {
    async head(path) {
      const { head } = await import('@vercel/blob');
      try {
        const meta = await head(prefix + path);
        return { size: meta.size, contentType: contentTypeFor(path), etag: meta.etag };
      } catch {
        return null;
      }
    },
    async get(path, range) {
      const { get, head } = await import('@vercel/blob');
      const pathname = prefix + path;
      let size: number;
      try {
        const meta = await head(pathname);
        size = meta.size;
      } catch {
        return null;
      }
      const result = await get(pathname, {
        access: 'private',
        headers: range ? { Range: `bytes=${range.start}-${range.end}` } : undefined,
      });
      if (!result?.stream) return null;
      const contentRange = result.headers.get('content-range');
      return {
        body: result.stream,
        size,
        contentType: contentTypeFor(path),
        // Only trust the range when upstream confirms it; otherwise the
        // handler slices the full stream itself.
        range: range && contentRange ? range : undefined,
        etag: result.blob.etag,
      };
    },
  };
}
