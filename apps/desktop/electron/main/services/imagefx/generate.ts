import fs from 'node:fs';
import path from 'node:path';
import { acquireBrowser, captureFailure } from '../grok/browser-pool';
import { logger } from '../../logger';
import type { ImagefxGenerateRequest, ImagefxGenerateResponse } from '@videoforge/shared';

const IMAGEFX_PROFILE = 'imagefx';
const IMAGEFX_URL = 'https://labs.google/fx/tools/image-fx';

/**
 * P7-04: Generate images via ImageFX.
 */
export async function imagefxGenerate(
  req: ImagefxGenerateRequest,
): Promise<ImagefxGenerateResponse> {
  const browser = await acquireBrowser(IMAGEFX_PROFILE);
  const page = await browser.newPage();

  try {
    await page.goto(IMAGEFX_URL, { waitUntil: 'networkidle2', timeout: 30_000 });

    // Enter prompt
    const promptInput = await page.waitForSelector(
      '[data-testid="prompt-input"], textarea[placeholder*="prompt" i], textarea',
      { timeout: 10_000 },
    );
    if (!promptInput) throw new Error('Prompt input not found');
    await promptInput.click();
    await promptInput.type(req.prompt, { delay: 30 });

    // Click generate
    const genBtn = await page.waitForSelector(
      '[data-testid="generate-btn"], button[aria-label*="generate" i], button[aria-label*="create" i]',
      { timeout: 10_000 },
    );
    if (!genBtn) throw new Error('Generate button not found');
    await genBtn.click();

    // Wait for results
    await page.waitForSelector(
      '[data-testid="result-image"] img, .output-images img, img[alt*="generated" i]',
      { timeout: 120_000 },
    );
    await new Promise((r) => setTimeout(r, 3000));

    // Extract image URLs
    const imageUrls = await page.evaluate(() => {
      const imgs = document.querySelectorAll(
        '[data-testid="result-image"] img, .output-images img, img[alt*="generated" i]',
      );
      return Array.from(imgs)
        .map((img) => (img as HTMLImageElement).src)
        .filter(Boolean);
    });

    // Download images
    fs.mkdirSync(req.outputDir, { recursive: true });
    const images: ImagefxGenerateResponse['images'] = [];

    for (let i = 0; i < imageUrls.length && i < req.count; i++) {
      const url = imageUrls[i]!;
      const buffer = await page.evaluate(async (imgUrl: string) => {
        const resp = await fetch(imgUrl);
        const ab = await resp.arrayBuffer();
        return Array.from(new Uint8Array(ab));
      }, url);

      const data = Buffer.from(buffer);
      const filename = `imagefx_${Date.now()}_${i}.png`;
      const filePath = path.join(req.outputDir, filename);
      fs.writeFileSync(filePath, data);

      // Write EXIF sidecar
      fs.writeFileSync(`${filePath}.prompt.txt`, req.prompt, 'utf-8');

      images.push({ path: filePath, width: 1024, height: 1024 });
    }

    logger.info({ count: images.length, prompt: req.prompt }, 'imagefx.generate.complete');
    return { images, prompt: req.prompt };
  } catch (err) {
    await captureFailure(page, 'imagefx-generate');
    throw err;
  } finally {
    await page.close().catch(() => {
      /* noop */
    });
  }
}
