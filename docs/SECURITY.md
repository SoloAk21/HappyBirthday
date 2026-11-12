# Privacy & security model

Goal: the experience contains private relationship media. It must be visible only
to the people who know the secret words — not to anyone who finds the URL, the
public GitHub repo, a link preview, or a search engine.

## What is public

- This repository and the built static bundle (HTML/JS/CSS/fonts): UI only, no
  names from the story, no messages, no photos, no videos. `npm run check:public`
  enforces this in CI (media files, Ethiopic text, and — locally — every long
  phrase from the private content are searched for in the repo *and* in `dist/`).
- The unlock page: a drawn moon and "A little universe, just for you."
- Link previews: generic title/description, no image. `noindex` everywhere.

## What is private, and how it is protected

| Asset | Where | Access |
|---|---|---|
| Story text, letter, captions, media list | private Blob `private/content.json` | `GET /api/content` — session required |
| Photos (WebP), videos (MP4), music (M4A, only if licensed) | private Blob `private/media/*` | `GET /api/media/:file` — session required, Range supported |
| Passphrase | only its scrypt hash, in a Vercel env var | never sent to the client |
| Session signing key | Vercel env var | server only |

- **Private Blob store**: objects are not reachable by URL without the store
  token; only the server functions hold it.
- **Unlock** (`POST /api/session`): passphrase compared with an scrypt hash
  (N=2^15) in constant time; input normalised for phone typing (case, spaces,
  curly apostrophes). Same-origin check on the `Origin` header.
- **Rate limiting**: 6 wrong guesses per IP per 15 min, plus a global ceiling per
  function instance (in-memory; with Fluid compute instances are long-lived). Add a
  Vercel Firewall rate-limit rule on `/api/session` for a global layer.
- **Session**: HMAC-SHA256 signed token (45 days) in an `HttpOnly; Secure;
  SameSite=Lax` cookie. No token in JS, URLs or storage. "Lock" deletes it;
  rotating `SESSION_SECRET` revokes every session at once.
- **First load**: `/boot.js` asks `GET /api/content` with `X-Moon-Probe: 1`
  while the bundle downloads. Without a session the answer is only
  `{"authenticated":false}` (any other request gets `401`); with one, the content.
- **Media requests**: every request — including each video Range request — is
  authenticated. File names must match a strict pattern (no paths). Responses are
  `Cache-Control: private` + `Vary: Cookie` so the CDN never stores them.
- **Headers**: strict CSP (`script-src 'self'`, no third-party origins at all),
  `frame-ancestors 'none'`, `nosniff`, `no-referrer`, COOP, Permissions-Policy,
  `X-Robots-Tag: noindex`. No source maps. No analytics or trackers.
- **Fail closed**: missing secrets → 503, never open.

## Residual risks (honest list)

- Anyone who knows the secret words can view and save the media. Choose words
  only the two of you know; change them by updating `SITE_PASSPHRASE_HASH`.
- In-memory rate limiting is per instance; the slow scrypt hash and a phrase of
  3+ words are what make guessing impractical. The Firewall rule closes the gap.
- A logged-in device keeps access for 45 days unless the secret is rotated.
