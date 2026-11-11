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

export interface SiteContent {
  recipientName: string;
  senderName: string;
  birthday: BirthdayConfig;
  invitation: { greeting: string; line: string; button: string };
  reveal: { date: string; line: string; title: string; portrait: MediaRef };
  smile: { original: string; lines: string[]; photo: MediaRef; motion?: MediaRef };
  gallery: { kicker: string; title: string; intro?: string; items: GalleryItem[] };
  notes: { kicker: string; title: string; items: Note[] };
  letter: {
    kicker: string;
    title: string;
    button: string;
    salutation: string;
    paragraphs: string[];
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
  wish: { original: string; english: string; media: MediaRef };
  finale: { photo: MediaRef; title: string; signature: string; lines?: string[] };
  media: Record<string, MediaAsset>;
}
