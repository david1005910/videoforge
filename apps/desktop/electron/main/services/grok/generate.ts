import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { ulid } from 'ulid';
import { acquireBrowser, captureFailure } from './browser-pool';
import { sel } from './selectors';
import { logger } from '../../logger';
import type { Page } from 'puppeteer-core';
import type {
  GrokTask,
  GrokGenerateResponse,
  GrokProgressEvent,
  GrokVideoReadyEvent,
} from '@videoforge/shared';

const GROK_PROFILE = 'grok';
const GROK_IMAGINE_URL = 'https://grok.com/imagine';

type ProgressCallback = (event: GrokProgressEvent) => void;
type VideoReadyCallback = (event: GrokVideoReadyEvent) => void;

/**
 * P6-06: Generate a single video via Grok Imagine.
 *
 * Opens grok.com/imagine, enters prompt, waits for video, downloads result.
 */
export function grokGenerate(
  task: Omit<GrokTask, 'taskId'>,
  onProgress: ProgressCallback,
  onVideoReady: VideoReadyCallback,
): GrokGenerateResponse {
  const taskId = ulid();
  const queuedAt = new Date().toISOString();

  onProgress({ taskId, percent: 0, phase: 'queued' });

  // Run generation asynchronously
  void runGeneration(taskId, task, onProgress, onVideoReady).catch((err: unknown) => {
    logger.error({ taskId, err }, 'grok.generate.failed');
    onProgress({ taskId, percent: 0, phase: 'failed', message: String(err) });
  });

  return { taskId, queuedAt };
}

async function runGeneration(
  taskId: string,
  task: Omit<GrokTask, 'taskId'>,
  onProgress: ProgressCallback,
  onVideoReady: VideoReadyCallback,
): Promise<void> {
  onProgress({ taskId, percent: 10, phase: 'opening' });

  const browser = await acquireBrowser(GROK_PROFILE);

  // Reuse existing page instead of opening a new tab
  const pages = await browser.pages();
  const page = pages[0] ?? (await browser.newPage());

  try {
    // Navigate to Imagine page
    const currentUrl = page.url();
    if (!currentUrl.includes('grok.com/imagine')) {
      logger.info({ currentUrl }, 'grok.generate.navigating-to-imagine');
      await page.goto(GROK_IMAGINE_URL, { waitUntil: 'networkidle2', timeout: 30_000 });
    }

    // Wait for page to be interactive
    await new Promise((r) => setTimeout(r, 2000));
    onProgress({ taskId, percent: 20, phase: 'submitting' });

    // Upload image if provided (image-to-video)
    if (task.imagePath) {
      logger.info({ imagePath: task.imagePath }, 'grok.generate.uploading-image');
      const fileInput = await sel.imageUpload(page);
      if (fileInput) {
        await (fileInput as unknown as { uploadFile: (p: string) => Promise<void> }).uploadFile(
          task.imagePath,
        );
        await new Promise((r) => setTimeout(r, 3000));
        logger.info('grok.generate.image-uploaded');
      } else {
        logger.warn('grok.generate.image-upload-input-not-found');
      }
    }

    // Enter prompt
    const promptEl = await sel.promptInput(page);
    if (!promptEl) {
      throw new Error('Prompt input not found on Grok Imagine page');
    }
    await promptEl.click({ clickCount: 3 }); // Select existing text
    await promptEl.type(task.prompt, { delay: 30 });

    // Click generate / submit
    const genBtn = await sel.generateBtn(page);
    if (!genBtn) {
      // Fallback: press Enter to submit
      await page.keyboard.press('Enter');
    } else {
      await genBtn.click();
    }
    onProgress({ taskId, percent: 30, phase: 'generating' });

    // Wait for video result (up to 2 minutes)
    const videoEl = await sel.videoResult(page);
    if (!videoEl) {
      throw new Error('Video result not found (timeout 120s)');
    }
    onProgress({ taskId, percent: 70, phase: 'downloading' });

    // Download video
    const videoUrl = await page.evaluate((el) => {
      if (el instanceof HTMLVideoElement) return el.src;
      if (el instanceof HTMLAnchorElement) return el.href;
      // Check for source element inside video
      const source = el.querySelector?.('source');
      if (source) return source.src;
      return null;
    }, videoEl);

    if (!videoUrl) {
      throw new Error('Could not extract video URL');
    }

    const localPath = await downloadVideo(page, videoUrl, task.outputDir, taskId);

    const stat = fs.statSync(localPath);
    onProgress({ taskId, percent: 100, phase: 'complete' });
    onVideoReady({
      taskId,
      localPath,
      prompt: task.prompt,
      durationMs: (task.durationSec ?? 6) * 1000,
      sizeBytes: stat.size,
      generatedAt: new Date().toISOString(),
    });

    logger.info({ taskId, localPath, sizeBytes: stat.size }, 'grok.generate.complete');
  } catch (err) {
    const screenshotPath = await captureFailure(page, `grok-${taskId}`);
    logger.error({ taskId, err: String(err), screenshotPath }, 'grok.generate.error');
    onProgress({
      taskId,
      percent: 0,
      phase: 'failed',
      message: String(err),
      failureScreenshotPath: screenshotPath,
    });
    throw err;
  }
  // Don't close the page — keep it for next generation
}

async function downloadVideo(
  page: Page,
  url: string,
  outputDir: string,
  taskId: string,
): Promise<string> {
  fs.mkdirSync(outputDir, { recursive: true });

  // Use page context to fetch the video (same cookies/session)
  const buffer = await page.evaluate(async (videoUrl: string) => {
    const resp = await fetch(videoUrl);
    const ab = await resp.arrayBuffer();
    return Array.from(new Uint8Array(ab));
  }, url);

  const data = Buffer.from(buffer);
  const hash = crypto.createHash('sha1').update(data).digest('hex').slice(0, 12);
  const filename = `grok_${taskId}_${hash}.mp4`;
  const filePath = path.join(outputDir, filename);
  fs.writeFileSync(filePath, data);
  return filePath;
}
