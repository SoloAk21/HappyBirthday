/**
 * Text shown BEFORE unlocking (it ships in the public bundle).
 * Generic on purpose: no names, memories or private phrases. This is the only
 * file where the public-safety check allows Ethiopic script.
 */
export const PUBLIC_TEXT = {
  /** The Amharic title line(s); the rest of the screen is English. */
  titleLang: 'am',
  title: ['ላንቺ ብቻ የተዘጋጀች', 'ትንሽ ዓለም።'],
  subtitle: 'Unlock with our secret word',
  label: 'Secret word',
  placeholder: 'Enter secret word...',
  open: 'Unlock',
  opening: 'Unlocking…',
  wrong: 'Oops, not quite right. Try our secret word again.',
  rateLimited: "Let's take a short pause. Try again in {min} min.",
  unavailable: 'The little world is still waking up. Please try again shortly.',
  loading: 'Opening',
  error: 'Something went quiet for a moment.',
  retry: 'Try again',
} as const;
