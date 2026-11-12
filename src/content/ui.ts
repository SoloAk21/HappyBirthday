import type { UiText } from './types';
import { useContent } from '../components/ContentContext';

/** Neutral English defaults; the private content may override every label. */
export const DEFAULT_UI: Required<UiText> = {
  lang: 'en',
  documentTitle: 'For My Moon',
  chapters: [
    'Hey, My Moon',
    'A birthday worth celebrating',
    'The smile that changes everything',
    'How it started',
    'Our little moments',
    'Little things I adore',
    'A letter for my Moon',
    'One more surprise',
    'My birthday wish',
    'The final moonlight',
  ],
  chaptersTitle: 'Revisit a moment',
  continue: 'Continue',
  countdownTitle: 'Your day begins in',
  countdownUnits: ['days', 'hrs', 'min', 'sec'],
  countdownNote: "You can peek early — it's all here waiting.",
  today: 'Today is your day',
  swipeHint: 'Swipe · tap to open',
  watch: 'Watch',
  notesHint: 'Tap a note to break its seal.',
  notesProgress: '{n} of {total} opened',
  notesDone: 'All of them — and still not everything.',
  replay: 'Replay from the beginning',
  revisit: 'Revisit a moment',
  soundOn: 'Turn sound on',
  soundOff: 'Turn sound off',
  pause: 'Pause music',
  play: 'Play music',
  volume: 'Music volume',
};

export function resolveUi(ui: UiText | undefined): Required<UiText> {
  const merged = { ...DEFAULT_UI, ...ui } as Required<UiText>;
  // keep the chapter list complete even if fewer labels are given
  merged.chapters = DEFAULT_UI.chapters.map((d, i) => ui?.chapters?.[i] ?? d);
  return merged;
}

export function useUi(): Required<UiText> {
  return resolveUi(useContent().ui);
}

/** Fill "{name}" placeholders. */
export const fill = (template: string, values: Record<string, string | number>) =>
  template.replace(/\{(\w+)\}/g, (m, k: string) => (k in values ? String(values[k]) : m));
