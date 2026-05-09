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
const GROK_URL = 'https://grok.com';

type ProgressCallback = (event: GrokProgressEvent) => void;
type VideoReadyCallback = (event: GrokVideoReadyEvent) => void;

/**
 * P6-06: Generate a single video via Grok.
 *
 * Opens grok.com, enters prompt, waits for video, downloads result.
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
  const page = await browser.newPage();

  try {
    await page.goto(GROK_URL, { waitUntil: 'networkidle2', timeout: 30_000 });
    onProgress({ taskId, percent: 20, phase: 'submitting' });

    // Upload image if provided (image-to-video)
    if (task.imagePath) {
      const fileInput = await sel.imageUpload(page);
      if (fileInput) {
        await (fileInput as unknown as { uploadFile: (p: string) => Promise<void> }).uploadFile(
          task.imagePath,
        );
        await new Promise((r) => setTimeout(r, 2000));
      }
    }

    // Enter prompt
    const promptEl = await sel.promptInput(page);
    if (!promptEl) {
      throw new Error('Prompt input not found on Grok page');
    }
    await promptEl.click();
    await promptEl.type(task.prompt, { delay: 30 });

    // Click generate
    const genBtn = await sel.generateBtn(page);
    if (!genBtn) {
      throw new Error('Generate button not found');
    }
    await genBtn.click();
    onProgress({ taskId, percent: 30, phase: 'generating' });

    // Wait for video result
    const videoEl = await sel.videoResult(page);
    if (!videoEl) {
      throw new Error('Video result not found (timeout)');
    }
    onProgress({ taskId, percent: 70, phase: 'downloading' });

    // Download video
    const videoUrl = await page.evaluate((el) => {
      if (el instanceof HTMLVideoElement) return el.src;
      if (el instanceof HTMLAnchorElement) return el.href;
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
    onProgress({
      taskId,
      percent: 0,
      phase: 'failed',
      message: String(err),
      failureScreenshotPath: screenshotPath,
    });
    throw err;
  } finally {
    await page.close().catch(() => {
      /* noop */
    });
  }
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
