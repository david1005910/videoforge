import type { Page, ElementHandle } from 'puppeteer-core';

/**
 * P6-03: Grok page selectors with data-testid priority + fallback.
 *
 * Grok UI selectors may change. These abstractions localize breakage.
 */
export const sel = {
  promptInput: async (page: Page): Promise<ElementHandle | null> =>
    page.waitForSelector(
      '[data-testid="prompt-input"], textarea[placeholder*="prompt" i], textarea[aria-label*="prompt" i]',
      { timeout: 15_000 },
    ),

  generateBtn: async (page: Page): Promise<ElementHandle | null> =>
    page.waitForSelector(
      '[data-testid="generate-btn"], button[aria-label*="generate" i], button:has-text("Generate")',
      { timeout: 10_000 },
    ),

  imageUpload: async (page: Page): Promise<ElementHandle | null> =>
    page.waitForSelector(
      '[data-testid="image-upload"] input[type="file"], input[type="file"][accept*="image"]',
      { timeout: 10_000 },
    ),

  videoResult: async (page: Page): Promise<ElementHandle | null> =>
    page.waitForSelector('[data-testid="video-result"] video, video[src], a[href$=".mp4"]', {
      timeout: 120_000,
    }),

  downloadBtn: async (page: Page): Promise<ElementHandle | null> =>
    page.waitForSelector(
      '[data-testid="download-btn"], button[aria-label*="download" i], a[download]',
      { timeout: 10_000 },
    ),
};
