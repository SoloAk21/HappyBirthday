// Lightweight validation of the private content bundle (shared by the
// build script and unit tests). Returns a list of human-readable problems.

const MEDIA_FILE = /^[a-z0-9]+(?:-[a-z0-9]+)*(?:\.mp4|\.m4a|\.woff2|-\d{2,4}\.webp)$/;

export function validateContent(c) {
  const errs = [];
  const str = (v, path) => {
    if (typeof v !== 'string' || !v.trim()) errs.push(`${path} must be a non-empty string`);
  };
  const ref = (r, path) => {
    if (!r || typeof r !== 'object') return errs.push(`${path} is missing`);
    str(r.id, `${path}.id`);
    str(r.alt, `${path}.alt`);
    if (r.id && !c.media?.[r.id]) errs.push(`${path}.id "${r.id}" has no media asset`);
  };

  str(c.recipientName, 'recipientName');
  str(c.senderName, 'senderName');
  if (!/^\d{4}-\d{2}-\d{2}$/.test(c.birthday?.date ?? ''))
    errs.push('birthday.date must be YYYY-MM-DD');
  try {
    new Intl.DateTimeFormat('en', { timeZone: c.birthday?.timeZone });
  } catch {
    errs.push('birthday.timeZone must be a valid IANA zone');
  }
  for (const k of ['greeting', 'line', 'button']) str(c.invitation?.[k], `invitation.${k}`);
  for (const k of ['date', 'line', 'title']) str(c.reveal?.[k], `reveal.${k}`);
  ref(c.reveal?.portrait, 'reveal.portrait');
  if (!Array.isArray(c.smile?.lines) || !c.smile.lines.length)
    errs.push('smile.lines needs at least one line');
  ref(c.smile?.photo, 'smile.photo');
  if (c.smile?.motion) ref(c.smile.motion, 'smile.motion');
  if (!Array.isArray(c.gallery?.items) || !c.gallery.items.length)
    errs.push('gallery.items needs at least one item');
  c.gallery?.items?.forEach((it, i) => ref(it, `gallery.items[${i}]`));
  if (!Array.isArray(c.notes?.items) || !c.notes.items.length)
    errs.push('notes.items needs at least one note');
  c.notes?.items?.forEach((n, i) => {
    str(n.label, `notes.items[${i}].label`);
    str(n.text, `notes.items[${i}].text`);
  });
  for (const k of ['button', 'salutation', 'closing', 'signature'])
    str(c.letter?.[k], `letter.${k}`);
  if (!Array.isArray(c.letter?.paragraphs) || !c.letter.paragraphs.length)
    errs.push('letter.paragraphs is empty');
  for (const k of ['button', 'heading', 'text']) str(c.gift?.[k], `gift.${k}`);
  if (c.gift?.media) ref(c.gift.media, 'gift.media');
  str(c.wish?.original, 'wish.original');
  ref(c.wish?.media, 'wish.media');
  c.story?.beats?.forEach((b, i) => {
    ref(b.media, `story.beats[${i}].media`);
    if (!Array.isArray(b.lines) || !b.lines.length) errs.push(`story.beats[${i}].lines is empty`);
  });
  if (c.music && !/^[a-z0-9]+(?:-[a-z0-9]+)*\.m4a$/.test(c.music.file ?? ''))
    errs.push('music.file must be a safe .m4a file name');
  for (const [k, f] of Object.entries(c.fonts ?? {}))
    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*\.woff2$/.test(f ?? ''))
      errs.push(`fonts.${k} must be a safe .woff2 name`);
  if (c.ui?.chapters && (!Array.isArray(c.ui.chapters) || c.ui.chapters.length !== 10))
    errs.push('ui.chapters must list all 10 navigation labels');
  ref(c.finale?.photo, 'finale.photo');
  str(c.finale?.title, 'finale.title');
  str(c.finale?.signature, 'finale.signature');

  for (const [id, a] of Object.entries(c.media ?? {})) {
    const files = [
      a.file,
      ...(a.poster ?? []).map((v) => v.file),
      ...(a.variants ?? []).map((v) => v.file),
    ].filter(Boolean);
    if (!files.length) errs.push(`media.${id} has no files`);
    for (const f of files)
      if (!MEDIA_FILE.test(f)) errs.push(`media.${id}: unsafe file name "${f}"`);
    if (a.kind === 'video' && !a.poster?.length) errs.push(`media.${id}: video needs a poster`);
  }
  return errs;
}
