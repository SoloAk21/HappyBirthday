# Personalization guide

All personal content is in `.private/` (git-ignored). After any change:
`npm run content:build` then `node --env-file=.env.local scripts/upload-private.mjs`.
No redeploy is needed for content.

## Names & messages
Edit `.private/content.source.json`. Every visible sentence is there:
`invitation`, `reveal`, `smile` (original + English lines; the last line is
the champagne "landing" line), `gallery` captions, `notes`, `letter`
(paragraphs array), `gift`, `wish`, `finale`. The build validates it and refuses
to run on missing fields or broken media references.

## Birthday date & time zone
`birthday.date` (`YYYY-MM-DD`) and `birthday.timeZone` (IANA, e.g.
`Africa/Addis_Ababa`). Before the day a countdown shows under the invitation
(never blocking); on the day it reads "Today is your day"; afterwards it hides.

## Photos & videos
1. Add an entry to `.private/selection.json`:
   `{ "id": "beach", "source": "IMG_123.jpg" }` — for a video, optional
   `"poster": 2.5` (seconds), `"start"`/`"duration"` to trim; for a still frame
   from a video use `"type": "still", "at": 12.3`. `"cut": [8.4, 20.5]` removes a
   section from the middle of a video; `"blur": [x, y, w, h]` (fractions of the
   frame) softens a fixed overlay such as a sticker. Originals are never changed.
   To re-process only some ids, add them as a 4th argument: `film,car-laugh`.
2. `npm run media:process -- "<source dir>" .private/selection.json .private/media`
3. Reference the id anywhere in the content, with an `alt` text and optional
   `focus` (CSS object-position such as `"50% 30%"`) to keep faces in frame.

## Sound
`src/lib/sound.ts` — chords (`CHORDS`), sparkle notes, volumes. It is fully
synthesized; to use a licensed music file instead, upload it privately and play
it through the same mute toggle.

## Pacing & motion
`src/lib/motion.ts` holds the tokens (durations, easings, staggers). Each
chapter's choreography is at the top of its file in `src/chapters/`.
Reduced-motion users get the same content without animation.
