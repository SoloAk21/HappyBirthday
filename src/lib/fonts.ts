import type { PrivateFonts } from '../content/types';
import { mediaUrl } from './api';

/** Ethiopic, Ethiopic Supplement and Extended-A: the private faces cover only these. */
const ETHIOPIC = 'U+1200-139F, U+2D80-2DDF, U+AB00-AB2F';
/** The birthday date also sets its digits in the heading face (same file, cached once). */
const DATE = `${ETHIOPIC}, U+0030-0039`;

/**
 * Registers the private heading/body faces (served by the authenticated media
 * route) and resolves when they are ready — or after `timeoutMs`, so a slow
 * network never holds the experience back. Latin text keeps the public fonts.
 */
export async function loadPrivateFonts(fonts: PrivateFonts | undefined, timeoutMs = 4000) {
  if (!fonts || typeof FontFace === 'undefined' || !document.fonts) return;
  const existing = (family: string) =>
    [...document.fonts].filter((f) => f.family.replace(/["']/g, '') === family);
  const wanted: [string, string | undefined, string][] = [
    ['Moon Heading', fonts.heading, ETHIOPIC],
    ['Moon Date', fonts.heading, DATE],
    ['Moon Body', fonts.body, ETHIOPIC],
  ];
  const faces = wanted.flatMap(([family, file, unicodeRange]): Promise<unknown>[] => {
    if (!file) return [];
    // /boot.js may already have started this face as soon as the content arrived
    const started = existing(family);
    if (started.length) return started.map((f) => f.loaded.catch(() => undefined));
    const face = new FontFace(family, `url(${mediaUrl(file)}) format("woff2")`, {
      display: 'swap',
      unicodeRange,
      weight: '100 900', // one weight; never synthesize a heavier one
    });
    document.fonts.add(face);
    return [face.load().catch(() => undefined)];
  });
  await Promise.race([Promise.all(faces), new Promise((r) => window.setTimeout(r, timeoutMs))]);
}
