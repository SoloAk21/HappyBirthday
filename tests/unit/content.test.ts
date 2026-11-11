import { describe, expect, it } from 'vitest';
import example from '../../docs/content.example.json';
// @ts-expect-error plain JS module shared with the build script
import { validateContent } from '../../scripts/content-schema.mjs';

describe('content schema', () => {
  it('accepts the example content', () => {
    expect(validateContent(example)).toEqual([]);
  });

  it('reports missing text, broken media references and unsafe file names', () => {
    const broken = structuredClone(example) as Record<string, any>; // eslint-disable-line @typescript-eslint/no-explicit-any
    broken.letter.paragraphs = [];
    broken.reveal.portrait.id = 'nope';
    broken.media.film.file = '../secret.mp4';
    broken.birthday.timeZone = 'Mars/Olympus';
    const errs = validateContent(broken) as string[];
    expect(errs.join('\n')).toMatch(/letter.paragraphs/);
    expect(errs.join('\n')).toMatch(/reveal.portrait.id "nope"/);
    expect(errs.join('\n')).toMatch(/unsafe file name/);
    expect(errs.join('\n')).toMatch(/timeZone/);
  });
});
