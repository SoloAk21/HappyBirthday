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
    await expect(page.getByLabel('Secret words')).toBeVisible();
    await page.screenshot({ path: `${dir}/00-gate.png` });
    await page.getByLabel('Secret words').fill(process.env.E2E_PASSPHRASE ?? 'little moon test');
    await page.getByRole('button', { name: 'Open', exact: true }).click();
    await page.getByRole('button', { name: /Open the Surprise/ }).click();
    for (const [i, id] of CHAPTERS.entries()) {
      const s = page.locator(`#${id}`);
      await s.scrollIntoViewIfNeeded();
      await page.waitForTimeout(700);
      await s.screenshot({ path: `${dir}/${String(i + 1).padStart(2, '0')}-${id}.png` });
      if (id === 'adore') {
        for (const b of await s.getByRole('button').all()) await b.click();
        await s.screenshot({ path: `${dir}/05b-adore-open.png` });
      }
      if (id === 'letter') {
        await page.getByRole('button', { name: 'Read My Letter' }).click();
        await page.waitForTimeout(500);
        await s.screenshot({ path: `${dir}/06b-letter-open.png` });
      }
      if (id === 'surprise') {
        await page.getByRole('button', { name: 'Open Your Gift' }).click();
        await page.waitForTimeout(1200);
        await s.screenshot({ path: `${dir}/07b-gift-open.png` });
      }
    }
  });
}
