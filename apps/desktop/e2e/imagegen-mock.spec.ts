import { test, expect } from '@playwright/test';
import { createImagegenMockServer } from './imagegen-mock-server';

/**
 * P7-08: E2E test using Whisk/ImageFX mock server.
 */

const MOCK_PORT = 4447;

test.describe('Whisk/ImageFX mock server', () => {
  const mock = createImagegenMockServer(MOCK_PORT);

  test.beforeAll(async () => {
    await mock.start();
  });

  test.afterAll(async () => {
    await mock.stop();
  });

  test('Whisk page has expected selectors', async ({ page }) => {
    await page.goto(`http://localhost:${MOCK_PORT}/whisk`);
    await expect(page.locator('[data-testid="prompt-input"]')).toBeVisible();
    await expect(page.locator('[data-testid="generate-btn"]')).toBeVisible();
    await expect(page.locator('[data-testid="subject-upload"] input[type="file"]')).toBeAttached();
  });

  test('Whisk generates image result', async ({ page }) => {
    await page.goto(`http://localhost:${MOCK_PORT}/whisk`);
    await page.locator('[data-testid="prompt-input"]').fill('A fantasy castle');
    await page.locator('[data-testid="generate-btn"]').click();

    const img = page.locator('[data-testid="result-image"] img');
    await expect(img).toBeVisible({ timeout: 3_000 });
    const src = await img.getAttribute('src');
    expect(src).toContain('/api/image/fake-result.png');
  });

  test('ImageFX page has expected selectors', async ({ page }) => {
    await page.goto(`http://localhost:${MOCK_PORT}/imagefx`);
    await expect(page.locator('[data-testid="prompt-input"]')).toBeVisible();
    await expect(page.locator('[data-testid="generate-btn"]')).toBeVisible();
  });

  test('ImageFX generates image result', async ({ page }) => {
    await page.goto(`http://localhost:${MOCK_PORT}/imagefx`);
    await page.locator('[data-testid="prompt-input"]').fill('Neon city at night');
    await page.locator('[data-testid="generate-btn"]').click();

    const img = page.locator('[data-testid="result-image"] img');
    await expect(img).toBeVisible({ timeout: 3_000 });
    const src = await img.getAttribute('src');
    expect(src).toContain('/api/image/fake-result.png');
  });

  test('image endpoint returns PNG data', async ({ request }) => {
    const response = await request.get(`http://localhost:${MOCK_PORT}/api/image/fake-result.png`);
    expect(response.status()).toBe(200);
    expect(response.headers()['content-type']).toContain('image/png');
    const body = await response.body();
    expect(body.length).toBeGreaterThan(0);
  });
});
