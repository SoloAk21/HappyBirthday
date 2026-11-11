# To My Moon, With Love

A private, cinematic birthday experience — *a little universe, just for you.*
Nine short chapters (invitation, birthday reveal, the smile, our moments, little
things, a letter, a gift, a wish, the final moonlight), built mobile-first.

> **This repository is public and contains no personal content.** All names in
> the story, photos, videos, the letter and every personal sentence live in a
> private Vercel Blob store and are only served to a visitor who unlocked the
> site with the secret words. See [docs/SECURITY.md](docs/SECURITY.md).

## Stack

React 19 · TypeScript · Vite 8 · Tailwind CSS 4 · GSAP (ScrollTrigger) ·
Vercel Functions + private Vercel Blob · Vitest + Testing Library · Playwright + axe.
Sound is synthesized live with the Web Audio API (original, nothing to license).

## Run locally

```bash
npm install
node scripts/hash-passphrase.mjs "some secret words" > .env.local
printf 'PRIVATE_STORAGE=local\nPRIVATE_DIR=.private/site\nCOOKIE_SECURE=false\n' >> .env.local
npm run dev            # http://localhost:5173 (the /api routes run inside Vite)
```

Without a `.private/site` folder you can point `PRIVATE_DIR` at
`tests/fixtures/site` to see the experience with placeholder content.

## Personal content workflow (all of it stays in `.private/`, git-ignored)

| Step | Command |
|---|---|
| 1. Pick media | edit `.private/selection.json` (source file → id, poster time, still frame) |
| 2. Optimise | `npm run media:process -- "<source dir>" .private/selection.json .private/media` |
| 3. Write the words | edit `.private/content.source.json` (shape: `docs/content.example.json`) |
| 4. Bundle + validate | `npm run content:build` → `.private/site/` |
| 5. Upload privately | `node --env-file=.env.local scripts/upload-private.mjs` |

Media processing never touches the originals. Videos become H.264 MP4 (silent,
`+faststart`, max 720px wide) with WebP posters; images become WebP at native
width and 640px; all metadata (incl. GPS) is dropped.

See **[docs/PERSONALIZATION.md](docs/PERSONALIZATION.md)** for changing names,
messages, photos, videos, the birthday date/time zone, sound and pacing.

## Quality checks

```bash
npm run typecheck && npm run lint && npm test   # unit + component + API security tests
npm run build && npm run check:public           # proves no private text/media is in repo or bundle
npx playwright test                             # e2e on Pixel 7, iPhone 13, desktop Chrome/Firefox
E2E_SCREENSHOTS=1 E2E_PRIVATE_DIR=.private/site E2E_WIDTHS=320,360,375,390,430 \
  npx playwright test tests/e2e/screens.spec.ts --project=mobile-chrome   # private screenshots
```

## Deploy (Vercel)

1. Import this repo in Vercel (framework preset: Vite).
2. Storage → create a **Blob store with private access**, connect it to the project
   (adds `BLOB_READ_WRITE_TOKEN`).
3. Environment variables: `SITE_PASSPHRASE_HASH`, `SESSION_SECRET`
   (from `node scripts/hash-passphrase.mjs "…"`).
4. Upload the private bundle (step 5 above), then deploy. Every push to `main`
   redeploys; content changes only need a re-upload — no redeploy.

Optional extra layer: Vercel Firewall → rate-limit rule on `POST /api/session`.
