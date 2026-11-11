import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';

const PASSPHRASE = 'little moon test';

async function unlock(page: Page) {
  await page.goto('/');
  await page.getByLabel('Secret words').fill(PASSPHRASE);
  await page.getByRole('button', { name: 'Open', exact: true }).click();
  await expect(page.getByRole('button', { name: /Open the Surprise/ })).toBeVisible();
}

function collectErrors(page: Page) {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('console', (m) => {
    // Media aborted by the browser while scrolling is expected noise.
    if (m.type() === 'error' && !/net::ERR_ABORTED|NS_BINDING_ABORTED|Load failed/.test(m.text()))
      errors.push(m.text());
  });
  return errors;
}

test.describe('privacy gate', () => {
  test('public page reveals nothing personal and media is locked', async ({ page, request }) => {
    await page.goto('/');
    await expect(page.getByLabel('Secret words')).toBeVisible();
    await expect(page).toHaveTitle('A Little Universe');
    const html = await page.content();
    expect(html).not.toContain('Happy Birthday');
    expect(html).not.toContain('/api/media/');
    expect((await request.get('/api/content')).status()).toBe(401);
    expect((await request.get('/api/media/film.mp4')).status()).toBe(401);
    expect(
      (await request.get('/api/media/film.mp4', { headers: { Range: 'bytes=0-99' } })).status(),
    ).toBe(401);
  });

  test('wrong words are refused kindly', async ({ page }) => {
    await page.goto('/');
    await page.getByLabel('Secret words').fill('not the words');
    await page.getByRole('button', { name: 'Open', exact: true }).click();
    await expect(page.getByRole('status').filter({ hasText: 'Not quite' })).toBeVisible();
  });

  test('locking again revokes access', async ({ page }) => {
    await unlock(page);
    expect(
      (
        await page.request.get('/api/media/film.mp4', { headers: { Range: 'bytes=0-99' } })
      ).status(),
    ).toBe(206);
    await page.request.delete('/api/session', { headers: { origin: new URL(page.url()).origin } });
    expect((await page.request.get('/api/media/film.mp4')).status()).toBe(401);
  });
});

test.describe('the experience', () => {
  test('walks through every chapter', async ({ page }) => {
    const errors = collectErrors(page);
    await unlock(page);
    await page.getByRole('button', { name: /Open the Surprise/ }).click();

    await expect(page.locator('#birthday')).toBeInViewport({ timeout: 5000 });
    for (const id of [
      'birthday',
      'smile',
      'moments',
      'adore',
      'letter',
      'surprise',
      'wish',
      'finale',
    ]) {
      const section = page.locator(`#${id}`);
      await section.scrollIntoViewIfNeeded();
      await expect(section).toBeVisible();
    }

    // Images actually decode (served through the authenticated API).
    await page.locator('#birthday').scrollIntoViewIfNeeded();
    const portrait = page.locator('#birthday img').first();
    await expect(portrait).toBeVisible();
    await expect
      .poll(() =>
        portrait.evaluate((img: HTMLImageElement) => img.complete && img.naturalWidth > 0),
      )
      .toBe(true);

    // Letter
    await page.locator('#letter').scrollIntoViewIfNeeded();
    await page.getByRole('button', { name: 'Read My Letter' }).click();
    await expect(page.getByRole('article', { name: 'The letter' })).toBeVisible();

    // Gift
    await page.locator('#surprise').scrollIntoViewIfNeeded();
    await page.getByRole('button', { name: 'Open Your Gift' }).click();
    await expect(page.getByRole('region', { name: 'Your surprise' })).toBeVisible({
      timeout: 8000,
    });

    // Finale: replay brings back the invitation
    await page.locator('#finale').scrollIntoViewIfNeeded();
    await page.getByRole('button', { name: /Replay from the beginning/ }).click();
    await expect(page.getByRole('button', { name: /Open the Surprise/ })).toBeInViewport();

    expect(errors).toEqual([]);
  });

  test('gallery viewer: open, navigate, close; video streams', async ({ page, browserName }) => {
    await unlock(page);
    await page.getByRole('button', { name: /Open the Surprise/ }).click();
    await page.locator('#moments').scrollIntoViewIfNeeded();
    await page.getByRole('button', { name: 'Watch: Our little film' }).click();
    const dialog = page.getByRole('dialog', { name: 'Memory viewer' });
    await expect(dialog).toBeVisible();
    await expect(dialog.getByText('1 / 2')).toBeVisible();
    const video = dialog.locator('video');
    // Playwright's Windows WebKit build ships without MP4 decoding (verified with a bare <video>);
    // Linux CI WebKit and real iOS Safari still cover playback.
    if (!(browserName === 'webkit' && process.platform === 'win32'))
      await expect
        .poll(() => video.evaluate((v: HTMLVideoElement) => v.readyState), { timeout: 15000 })
        .toBeGreaterThanOrEqual(1);
    await page.getByRole('button', { name: 'Next memory' }).click();
    await expect(dialog.getByText('2 / 2')).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(dialog).toBeHidden();
  });

  test('works with the keyboard alone', async ({ page, browserName }) => {
    test.skip(browserName === 'webkit', 'WebKit does not Tab to buttons by default');
    await page.goto('/');
    await expect(page.getByLabel('Secret words')).toBeVisible();
    await page.keyboard.press('Tab');
    await expect(page.getByLabel('Secret words')).toBeFocused();
    await page.keyboard.type(PASSPHRASE);
    await page.keyboard.press('Enter');
    const open = page.getByRole('button', { name: /Open the Surprise/ });
    await expect(open).toBeVisible();
    await open.focus();
    await page.keyboard.press('Enter');
    await expect(page.locator('#birthday')).toBeVisible();
  });

  test('reduced motion shows everything without animation', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await unlock(page);
    await page.getByRole('button', { name: /Open the Surprise/ }).click();
    await page.locator('#smile').scrollIntoViewIfNeeded();
    const line = page.locator('[data-smile-line]').first();
    await expect(line).toBeVisible();
    expect(await line.evaluate((el) => getComputedStyle(el).opacity)).toBe('1');
  });

  test('refresh keeps the session; deep links and history behave', async ({ page }) => {
    await unlock(page);
    await page.reload();
    await expect(page.getByRole('button', { name: /Open the Surprise/ })).toBeVisible();
    await page.goto('/#letter');
    await expect(page.locator('#letter')).toBeInViewport({ timeout: 8000 });
    await page.goto('/#finale');
    await page.goBack();
    await expect(page).toHaveURL(/#letter$/);
  });
});

test.describe('layout', () => {
  for (const width of [320, 360, 375, 390, 430]) {
    test(`no horizontal overflow at ${width}px`, async ({ page, browserName }) => {
      test.skip(browserName !== 'chromium', 'width sweep runs once');
      await page.setViewportSize({ width, height: 800 });
      await unlock(page);
      await page.getByRole('button', { name: /Open the Surprise/ }).click();
      await page.locator('#finale').scrollIntoViewIfNeeded();
      const overflow = await page.evaluate(
        () => document.documentElement.scrollWidth - window.innerWidth,
      );
      expect(overflow).toBeLessThanOrEqual(0);
    });
  }
});

test.describe('accessibility', () => {
  test('gate and experience have no serious axe violations', async ({ page, browserName }) => {
    test.skip(browserName !== 'chromium', 'axe audit runs once');
    await page.goto('/');
    await expect(page.getByLabel('Secret words')).toBeVisible();
    const gate = await new AxeBuilder({ page }).analyze();
    expect(gate.violations.filter((v) => ['serious', 'critical'].includes(v.impact ?? ''))).toEqual(
      [],
    );

    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.getByLabel('Secret words').fill(PASSPHRASE);
    await page.getByRole('button', { name: 'Open', exact: true }).click();
    await page.getByRole('button', { name: /Open the Surprise/ }).click();
    await page.locator('#finale').scrollIntoViewIfNeeded();
    const exp = await new AxeBuilder({ page }).exclude('canvas').analyze();
    expect(
      exp.violations
        .filter((v) => ['serious', 'critical'].includes(v.impact ?? ''))
        .map((v) => `${v.id}: ${v.help}`),
    ).toEqual([]);
  });
});
