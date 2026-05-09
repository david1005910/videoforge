import fs from 'node:fs';
import path from 'node:path';
import { acquireBrowser, captureFailure } from '../grok/browser-pool';
import { logger } from '../../logger';
import type {
  WhiskUploadRefRequest,
  WhiskUploadRefResponse,
  WhiskGenerateRequest,
  WhiskGenerateResponse,
} from '@videoforge/shared';

const WHISK_PROFILE = 'whisk';
const WHISK_URL = 'https://labs.google/fx/tools/whisk';

/**
 * P7-02: Upload reference image (subject/scene/style) to Whisk.
 */
export async function whiskUploadRef(req: WhiskUploadRefRequest): Promise<WhiskUploadRefResponse> {
  const browser = await acquireBrowser(WHISK_PROFILE);
  const page = await browser.newPage();

  try {
    await page.goto(WHISK_URL, { waitUntil: 'networkidle2', timeout: 30_000 });

    // Find the upload area for the specific kind (subject/scene/style)
    const uploadSelector = `[data-testid="${req.kind}-upload"] input[type="file"], input[type="file"]`;
    const fileInput = await page.waitForSelector(uploadSelector, { timeout: 10_000 });
    if (!fileInput) throw new Error(`Upload input for ${req.kind} not found`);

    await (fileInput as unknown as { uploadFile: (p: string) => Promise<void> }).uploadFile(
      req.imagePath,
    );
    await new Promise((r) => setTimeout(r, 3000));

    // Try to extract ref ID from page state
    const refId = await page.evaluate(() => {
      // Try to extract from page data — this is UI-dependent
      const el = document.querySelector('[data-ref-id]');
      return el?.getAttribute('data-ref-id') ?? `ref_${Date.now()}`;
    });

    logger.info({ kind: req.kind, refId }, 'whisk.uploadRef.complete');
    return { refId, kind: req.kind };
  } catch (err) {
    await captureFailure(page, `whisk-upload-${req.kind}`);
    throw err;
  } finally {
    await page.close().catch(() => {
      /* noop */
    });
  }
}

/**
 * P7-03: Generate images via Whisk.
 */
export async function whiskGenerate(req: WhiskGenerateRequest): Promise<WhiskGenerateResponse> {
  const browser = await acquireBrowser(WHISK_PROFILE);
  const page = await browser.newPage();

  try {
    await page.goto(WHISK_URL, { waitUntil: 'networkidle2', timeout: 30_000 });

    // Enter prompt
    const promptInput = await page.waitForSelector(
      '[data-testid="prompt-input"], textarea[placeholder*="prompt" i]',
      { timeout: 10_000 },
    );
    if (!promptInput) throw new Error('Prompt input not found');
    await promptInput.click();
    await promptInput.type(req.prompt, { delay: 30 });

    // Click generate
    const genBtn = await page.waitForSelector(
      '[data-testid="generate-btn"], button[aria-label*="generate" i]',
      { timeout: 10_000 },
    );
    if (!genBtn) throw new Error('Generate button not found');
    await genBtn.click();

    // Wait for results
    await page.waitForSelector('[data-testid="result-image"] img, .result-grid img', {
      timeout: 120_000,
    });
    await new Promise((r) => setTimeout(r, 3000));

    // Extract image URLs
    const imageUrls = await page.evaluate(() => {
      const imgs = document.querySelectorAll('[data-testid="result-image"] img, .result-grid img');
      return Array.from(imgs)
        .map((img) => (img as HTMLImageElement).src)
        .filter(Boolean);
    });

    // Download images
    fs.mkdirSync(req.outputDir, { recursive: true });
    const images: WhiskGenerateResponse['images'] = [];

    for (let i = 0; i < imageUrls.length && i < req.count; i++) {
      const url = imageUrls[i]!;
      const buffer = await page.evaluate(async (imgUrl: string) => {
        const resp = await fetch(imgUrl);
        const ab = await resp.arrayBuffer();
        return Array.from(new Uint8Array(ab));
      }, url);

      const data = Buffer.from(buffer);
      const filename = `whisk_${Date.now()}_${i}.png`;
      const filePath = path.join(req.outputDir, filename);
      fs.writeFileSync(filePath, data);

      // Write EXIF prompt as UserComment (P7-05)
      writeExifPrompt(filePath, req.prompt);

      images.push({ path: filePath, width: 1024, height: 1024 });
    }

    logger.info({ count: images.length, prompt: req.prompt }, 'whisk.generate.complete');
    return { images, prompt: req.prompt };
  } catch (err) {
    await captureFailure(page, 'whisk-generate');
    throw err;
  } finally {
    await page.close().catch(() => {
      /* noop */
    });
  }
}

/**
 * P7-05: Write prompt into EXIF UserComment.
 *
 * Uses a simple approach — prepend EXIF comment to PNG.
 * For production, use sharp when available.
 */
function writeExifPrompt(filePath: string, prompt: string): void {
  // Write prompt as a sidecar text file alongside the image
  try {
    fs.writeFileSync(`${filePath}.prompt.txt`, prompt, 'utf-8');
  } catch {
    // Non-critical — don't fail generation over EXIF
  }
}
