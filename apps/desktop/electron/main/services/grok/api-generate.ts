import fs from 'node:fs';
import path from 'node:path';
import https from 'node:https';
import { ulid } from 'ulid';
import { logger } from '../../logger';
import type { GrokProgressEvent, GrokVideoReadyEvent } from '@videoforge/shared';

const XAI_API_BASE = 'https://api.x.ai/v1';

type ProgressCallback = (event: GrokProgressEvent) => void;
type VideoReadyCallback = (event: GrokVideoReadyEvent) => void;

interface ApiGenerateParams {
  prompt: string;
  imagePath?: string | undefined;
  durationSec?: number | undefined;
  outputDir: string;
  aspectRatio?: string | undefined;
  resolution?: string | undefined;
}

interface VideoGenResponse {
  id: string;
  status: 'pending' | 'done' | 'expired' | 'failed';
  url?: string;
  error?: { message: string };
}

/**
 * Generate video via xAI Grok Imagine REST API.
 * Two-step: initiate → poll until done → download.
 */
export function grokApiGenerate(
  apiKey: string,
  params: ApiGenerateParams,
  onProgress: ProgressCallback,
  onVideoReady: VideoReadyCallback,
): { taskId: string; queuedAt: string } {
  const taskId = ulid();
  const queuedAt = new Date().toISOString();

  onProgress({ taskId, percent: 0, phase: 'queued' });

  void runApiGeneration(taskId, apiKey, params, onProgress, onVideoReady).catch((err: unknown) => {
    logger.error({ taskId, err }, 'grok.apiGenerate.failed');
    onProgress({ taskId, percent: 0, phase: 'failed', message: String(err) });
  });

  return { taskId, queuedAt };
}

async function runApiGeneration(
  taskId: string,
  apiKey: string,
  params: ApiGenerateParams,
  onProgress: ProgressCallback,
  onVideoReady: VideoReadyCallback,
): Promise<void> {
  onProgress({ taskId, percent: 10, phase: 'submitting' });

  // Build request body
  const body: Record<string, unknown> = {
    model: 'grok-imagine-video',
    prompt: params.prompt,
  };
  if (params.durationSec) body.duration = params.durationSec;
  if (params.aspectRatio) body.aspect_ratio = params.aspectRatio;
  if (params.resolution) body.resolution = params.resolution;

  // If imagePath provided, encode as base64 for image-to-video
  if (params.imagePath && fs.existsSync(params.imagePath)) {
    const imgBuf = fs.readFileSync(params.imagePath);
    const ext = path.extname(params.imagePath).toLowerCase().replace('.', '');
    const mime = ext === 'png' ? 'image/png' : ext === 'webp' ? 'image/webp' : 'image/jpeg';
    body.image = { data: imgBuf.toString('base64'), mime_type: mime };
  }

  // Step 1: Initiate generation
  const initResp = await xaiRequest<VideoGenResponse>(apiKey, '/videos/generations', 'POST', body);

  if (!initResp.id) {
    throw new Error('xAI API did not return a request ID');
  }

  const requestId = initResp.id;
  logger.info({ taskId, requestId }, 'grok.apiGenerate.initiated');
  onProgress({ taskId, percent: 20, phase: 'generating', message: 'xAI API 영상 생성 중...' });

  // Step 2: Poll until done (max 5 min)
  const maxWait = 300_000;
  const pollInterval = 5_000;
  const startTime = Date.now();

  let result: VideoGenResponse | undefined;
  while (Date.now() - startTime < maxWait) {
    await sleep(pollInterval);

    result = await xaiRequest<VideoGenResponse>(apiKey, `/videos/generations/${requestId}`, 'GET');

    if (result.status === 'done' && result.url) {
      break;
    }
    if (result.status === 'failed') {
      throw new Error(result.error?.message ?? 'xAI video generation failed');
    }
    if (result.status === 'expired') {
      throw new Error('xAI video generation expired');
    }

    // Update progress estimate
    const elapsed = Date.now() - startTime;
    const pct = Math.min(20 + Math.round((elapsed / maxWait) * 60), 80);
    onProgress({ taskId, percent: pct, phase: 'generating', message: 'xAI API 영상 생성 중...' });
  }

  if (!result?.url) {
    throw new Error('xAI video generation timeout (5min)');
  }

  onProgress({ taskId, percent: 85, phase: 'downloading', message: '영상 다운로드 중...' });

  // Step 3: Download video
  const localPath = await downloadFile(result.url, params.outputDir, taskId);
  const stat = fs.statSync(localPath);

  onProgress({ taskId, percent: 100, phase: 'complete' });
  onVideoReady({
    taskId,
    localPath,
    prompt: params.prompt,
    durationMs: (params.durationSec ?? 6) * 1000,
    sizeBytes: stat.size,
    generatedAt: new Date().toISOString(),
  });

  logger.info({ taskId, localPath, sizeBytes: stat.size }, 'grok.apiGenerate.complete');
}

/** Make an authenticated request to xAI API */
function xaiRequest<T>(
  apiKey: string,
  endpoint: string,
  method: 'GET' | 'POST',
  body?: unknown,
): Promise<T> {
  return new Promise((resolve, reject) => {
    const url = new URL(`${XAI_API_BASE}${endpoint}`);
    const postData = body ? JSON.stringify(body) : undefined;

    const options: https.RequestOptions = {
      hostname: url.hostname,
      port: 443,
      path: url.pathname,
      method,
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
    };
    if (postData) {
      options.headers = { ...options.headers, 'Content-Length': Buffer.byteLength(postData) };
    }

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', (chunk: Buffer) => {
        data += chunk.toString();
      });
      res.on('end', () => {
        if (res.statusCode && res.statusCode >= 400) {
          let msg = `xAI API error ${res.statusCode}`;
          try {
            const parsed = JSON.parse(data) as { error?: { message?: string } };
            if (parsed.error?.message) msg = parsed.error.message;
          } catch {
            // use default message
          }
          reject(new Error(msg));
          return;
        }
        try {
          resolve(JSON.parse(data) as T);
        } catch {
          reject(new Error('Failed to parse xAI API response'));
        }
      });
    });

    req.on('error', (err) => reject(new Error(`xAI API request failed: ${err.message}`)));
    req.setTimeout(30_000, () => {
      req.destroy();
      reject(new Error('xAI API request timeout'));
    });

    if (postData) req.write(postData);
    req.end();
  });
}

/** Download a file from URL to local disk */
function downloadFile(url: string, outputDir: string, taskId: string): Promise<string> {
  return new Promise((resolve, reject) => {
    fs.mkdirSync(outputDir, { recursive: true });
    const filename = `grok_api_${taskId}.mp4`;
    const filePath = path.join(outputDir, filename);
    const file = fs.createWriteStream(filePath);

    const doRequest = (reqUrl: string): void => {
      https
        .get(reqUrl, (res) => {
          // Follow redirects
          if (
            res.statusCode &&
            res.statusCode >= 300 &&
            res.statusCode < 400 &&
            res.headers.location
          ) {
            doRequest(res.headers.location);
            return;
          }
          res.pipe(file);
          file.on('finish', () => {
            file.close();
            resolve(filePath);
          });
        })
        .on('error', (err) => {
          fs.unlink(filePath, () => {
            /* cleanup */
          });
          reject(new Error(`Download failed: ${err.message}`));
        });
    };

    doRequest(url);
  });
}

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}
