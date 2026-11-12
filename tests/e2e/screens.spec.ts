import { PUBLIC_TEXT as T } from '../../src/i18n/public.js';
import { expect, test } from '@playwright/test';

/**
 * Responsive screenshots for visual review. Opt-in (E2E_SCREENSHOTS=1)
 * and saved under .private/screenshots because they show personal media.
 */
test.skip(!process.env.E2E_SCREENSHOTS, 'opt-in');

const WIDTHS = (process.env.E2E_WIDTHS ?? '390').split(',').map(Number);
const CHAPTERS = [
  'invitation',
  'birthday',
  'smile',
  'moments',
  'adore',
  'letter',
  'surprise',
  'wish',
  'finale',
];

for (const width of WIDTHS) {
  test(`screens @${width}`, async ({ page, browserName }) => {
    test.skip(browserName !== 'chromium');
    await page.setViewportSize({ width, height: width < 700 ? 844 : 900 });
    await page.emulateMedia({ reducedMotion: 'reduce' });
    const dir = `.private/screenshots/${width}`;
    await page.goto('/');
    await expect(page.getByLabel(T.label)).toBeVisible();
    await page.screenshot({ path: `${dir}/00-gate.png` });
    await page.getByLabel(T.label).fill(process.env.E2E_PASSPHRASE ?? 'little moon test');
    await page.getByRole('button', { name: T.open, exact: true }).click();
    // content-agnostic selectors: the real content is in another language
    await page.locator('#invitation button.btn').click();
    for (const [i, id] of CHAPTERS.entries()) {
      const s = page.locator(`#${id}`);
      await s.scrollIntoViewIfNeeded();
      await page.waitForTimeout(700);
      await s.screenshot({ path: `${dir}/${String(i + 1).padStart(2, '0')}-${id}.png` });
      if (id === 'moments') {
        const lines = s.locator('[data-story-line]');
        for (let n = 0; n < (await lines.count()); n++) {
          await lines.nth(n).scrollIntoViewIfNeeded();
          await page.waitForTimeout(1600);
          await page.screenshot({ path: `${dir}/04-story-${n + 1}.png` });
        }
        await s.getByRole('list').last().scrollIntoViewIfNeeded();
        await page.waitForTimeout(600);
        await page.screenshot({ path: `${dir}/04b-gallery.png` });
      }
      if (id === 'adore') {
        for (const b of await s.getByRole('button').all()) await b.click();
        await s.screenshot({ path: `${dir}/05b-adore-open.png` });
      }
      if (id === 'letter') {
        await s.locator('button.btn').click();
        await page.waitForTimeout(500);
        await s.screenshot({ path: `${dir}/06b-letter-open.png` });
      }
      if (id === 'surprise') {
        await s.locator('button.btn').click();
        await page.waitForTimeout(1200);
        await s.screenshot({ path: `${dir}/07b-gift-open.png` });
      }
    }
  });
}
