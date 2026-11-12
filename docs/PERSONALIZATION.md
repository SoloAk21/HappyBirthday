# Personalization guide

All personal content is in `.private/` (git-ignored). After any change:
`npm run content:build` then `node --env-file=.env.local scripts/upload-private.mjs`.
No redeploy is needed for content.

## Names & messages
Edit `.private/content.source.json`. Every visible sentence is there:
`invitation`, `reveal`, `smile` (lines; the last one is the champagne
"landing" line), `story` (optional: beats of lines told over a pinned photo or
video, opening Chapter IV), `gallery` captions, `notes` (+ optional `quote`),
`letter` (paragraphs, optional `highlight`, closing, signature), `gift`, `wish`,
`finale`. Optional `kicker` fields replace the "Chapter II…" labels.
`ui` holds every in-experience label (chapter list, countdown, buttons, sound
controls) and `ui.lang` (e.g. `"am"`) sets the page language — Ethiopic text
then gets its own typography (Noto Serif/Sans Ethiopic, no faked italics, more
line height). The pre-unlock screen is public, so its generic text lives in
`src/i18n/public.ts` instead. The build validates everything and refuses to run
on missing fields or broken media references.

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
`src/lib/sound.ts` — by default an original synthesized score (chords, sparkle
notes). To use a recording **you have the right to publish**:
1. `ffmpeg -i song.mp3 -map 0:a:0 -map_metadata -1 -c:a aac -b:a 128k -movflags +faststart .private/media/music.m4a`
2. add `"music": { "file": "music.m4a" }` to the content, rebuild, upload.
It streams through the authenticated media route, starts only after her tap,
fades in/out, and the speaker button becomes a small panel (pause/play, volume,
mute). Remove the `music` entry and rebuild to withdraw it — the build cleans
`.private/site/media`, so a withdrawn track is never uploaded again.

## Pacing & motion
`src/lib/motion.ts` holds the tokens (durations, easings, staggers). Each
chapter's choreography is at the top of its file in `src/chapters/`.
Reduced-motion users get the same content without animation.
