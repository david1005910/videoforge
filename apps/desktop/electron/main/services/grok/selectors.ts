import type { Page, ElementHandle } from 'puppeteer-core';

/**
 * P6-03: Grok Imagine page selectors with fallback chains.
 *
 * Grok UI selectors may change. These abstractions localize breakage.
 * Target: https://grok.com/imagine
 */
export const sel = {
  promptInput: async (page: Page): Promise<ElementHandle | null> =>
    page.waitForSelector(
      [
        'textarea[placeholder*="imagine" i]',
        'textarea[placeholder*="describe" i]',
        'textarea[placeholder*="prompt" i]',
        '[data-testid="prompt-input"]',
        'textarea[aria-label*="prompt" i]',
        'div[contenteditable="true"]',
        'textarea',
      ].join(', '),
      { timeout: 15_000 },
    ),

  generateBtn: async (page: Page): Promise<ElementHandle | null> =>
    page.waitForSelector(
      [
        'button[aria-label*="generate" i]',
        'button[aria-label*="create" i]',
        'button[aria-label*="submit" i]',
        '[data-testid="generate-btn"]',
        'button[type="submit"]',
      ].join(', '),
      { timeout: 10_000 },
    ),

  imageUpload: async (page: Page): Promise<ElementHandle | null> =>
    page.waitForSelector(
      [
        'input[type="file"][accept*="image"]',
        'input[type="file"]',
        '[data-testid="image-upload"] input[type="file"]',
      ].join(', '),
      { timeout: 10_000 },
    ),

  videoResult: async (page: Page): Promise<ElementHandle | null> =>
    page.waitForSelector(
      [
        'video[src]',
        'video source[src]',
        'a[href$=".mp4"]',
        '[data-testid="video-result"] video',
      ].join(', '),
      { timeout: 120_000 },
    ),

  downloadBtn: async (page: Page): Promise<ElementHandle | null> =>
    page.waitForSelector(
      ['a[download]', 'button[aria-label*="download" i]', '[data-testid="download-btn"]'].join(
        ', ',
      ),
      { timeout: 10_000 },
    ),
};
