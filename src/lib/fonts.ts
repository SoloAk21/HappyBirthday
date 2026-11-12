import type { PrivateFonts } from '../content/types';
import { mediaUrl } from './api';

/** Ethiopic, Ethiopic Supplement and Extended-A: the private faces cover only these. */
const ETHIOPIC = 'U+1200-139F, U+2D80-2DDF, U+AB00-AB2F';

/**
 * Registers the private heading/body faces (served by the authenticated media
 * route) and resolves when they are ready — or after `timeoutMs`, so a slow
 * network never holds the experience back. Latin text keeps the public fonts.
 */
export async function loadPrivateFonts(fonts: PrivateFonts | undefined, timeoutMs = 2000) {
  if (!fonts || typeof FontFace === 'undefined' || !document.fonts) return;
  const wanted: [string, string | undefined][] = [
    ['Moon Heading', fonts.heading],
    ['Moon Body', fonts.body],
  ];
  const faces = wanted.flatMap(([family, file]) => {
    if (!file) return [];
    const face = new FontFace(family, `url(${mediaUrl(file)}) format("woff2")`, {
      display: 'swap',
      unicodeRange: ETHIOPIC,
      weight: '100 900', // one weight; never synthesize a heavier one
    });
    document.fonts.add(face);
    return [face.load().catch(() => undefined)];
  });
  await Promise.race([Promise.all(faces), new Promise((r) => window.setTimeout(r, timeoutMs))]);
}
