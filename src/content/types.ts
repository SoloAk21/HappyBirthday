/**
 * Shape of the private content served by /api/content after unlock.
 * The real values live only in the private store (never in this repo).
 * See docs/PERSONALIZATION.md and content.example.json.
 */

export interface ImageVariant {
  file: string;
  width: number;
  height: number;
}

export interface MediaAsset {
  id: string;
  kind: 'image' | 'video';
  /** image: responsive variants */
  variants?: ImageVariant[];
  /** video file + poster variants */
  file?: string;
  width?: number;
  height?: number;
  duration?: number;
  poster?: ImageVariant[];
}

export interface MediaRef {
  id: string;
  alt: string;
  /** CSS object-position, e.g. "50% 30%", to keep faces in frame. */
  focus?: string;
}

export interface GalleryItem extends MediaRef {
  caption?: string;
}

export interface Note {
  /** Short label shown on the sealed note. */
  label: string;
  text: string;
}

export interface BirthdayConfig {
  /** Local calendar date of the birthday, YYYY-MM-DD */
  date: string;
  /** IANA zone, e.g. Africa/Addis_Ababa */
  timeZone: string;
}

/** One act of the story sequence: a media frame and the lines told over it. */
export interface StoryBeat {
  media: MediaRef;
  lines: string[];
}

/**
 * In-experience interface labels (chapter list, countdown, buttons…). They are
 * private content because they are written to her; every key is optional and
 * falls back to the neutral English default in the code.
 */
export interface UiText {
  /** BCP 47 language of the experience, e.g. "am". */
  lang?: string;
  documentTitle?: string;
  chapters?: string[];
  chaptersTitle?: string;
  continue?: string;
  countdownTitle?: string;
  countdownUnits?: [string, string, string, string];
  countdownNote?: string;
  today?: string;
  swipeHint?: string;
  watch?: string;
  notesHint?: string;
  notesProgress?: string;
  notesDone?: string;
  replay?: string;
  revisit?: string;
  soundOn?: string;
  soundOff?: string;
  pause?: string;
  play?: string;
  volume?: string;
}

export interface MusicTrack {
  /** Private media file name, e.g. "music.m4a". */
  file: string;
  title?: string;
}

export interface SiteContent {
  ui?: UiText;
  music?: MusicTrack;
  recipientName: string;
  senderName: string;
  birthday: BirthdayConfig;
  invitation: { greeting: string; line: string; button: string };
  reveal: { kicker?: string; date: string; line: string; title: string; portrait: MediaRef };
  smile: {
    kicker?: string;
    title?: string;
    /** Optional quote shown above the photo (e.g. the original-language words). */
    original?: string;
    lines: string[];
    photo: MediaRef;
    motion?: MediaRef;
  };
  /** Optional cinematic sequence told before the gallery. */
  story?: { kicker?: string; title?: string; beats: StoryBeat[] };
  gallery: { kicker: string; title: string; intro?: string; items: GalleryItem[] };
  notes: { kicker: string; title: string; items: Note[]; quote?: string };
  letter: {
    kicker: string;
    title: string;
    button: string;
    salutation: string;
    paragraphs: string[];
    /** Optional emphasised paragraph, read last before the closing. */
    highlight?: string;
    closing: string;
    signature: string;
  };
  gift: {
    kicker: string;
    title: string;
    button: string;
    heading: string;
    text: string;
    media?: MediaRef;
  };
  wish: { kicker?: string; original: string; english?: string; media: MediaRef };
  finale: {
    kicker?: string;
    photo: MediaRef;
    title: string;
    signature: string;
    lines?: string[];
  };
  media: Record<string, MediaAsset>;
}
