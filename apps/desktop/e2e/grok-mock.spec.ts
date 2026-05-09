import { test, expect } from '@playwright/test';
import { createGrokMockServer } from './grok-mock-server';

/**
 * P6-13: E2E test using the Grok mock server.
 *
 * Verifies the mock server serves fake Grok HTML with expected selectors
 * and simulates the batch generation flow (3 items → all complete).
 */

const MOCK_PORT = 4445;

test.describe('Grok mock server', () => {
  const mock = createGrokMockServer(MOCK_PORT);

  test.beforeAll(async () => {
    await mock.start();
  });

  test.afterAll(async () => {
    await mock.stop();
  });

  test('serves Grok page with expected selectors', async ({ page }) => {
    await page.goto(`http://localhost:${MOCK_PORT}/`);
    await expect(page.locator('[data-testid="prompt-input"]')).toBeVisible();
    await expect(page.locator('[data-testid="generate-btn"]')).toBeVisible();
    await expect(page.locator('[data-testid="image-upload"]')).toBeAttached();
  });

  test('batch 3 prompts → all show video result', async ({ page }) => {
    const prompts = [
      'A cat dancing on the moon',
      'Underwater city at sunset',
      'Robot cooking ramen in Tokyo',
    ];

    for (const prompt of prompts) {
      await page.goto(`http://localhost:${MOCK_PORT}/`);

      const input = page.locator('[data-testid="prompt-input"]');
      await input.fill(prompt);

      await page.locator('[data-testid="generate-btn"]').click();

      // Wait for video result to appear
      const video = page.locator('[data-testid="video-result"] video');
      await expect(video).toBeVisible({ timeout: 5_000 });

      const src = await video.getAttribute('src');
      expect(src).toContain('/api/video/fake-result.mp4');
    }
  });

  test('video endpoint returns mp4 data', async ({ request }) => {
    const response = await request.get(`http://localhost:${MOCK_PORT}/api/video/fake-result.mp4`);
    expect(response.status()).toBe(200);
    expect(response.headers()['content-type']).toContain('video/mp4');
    const body = await response.body();
    expect(body.length).toBeGreaterThan(0);
  });
});
