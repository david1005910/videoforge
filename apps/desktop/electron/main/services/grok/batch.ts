import { ulid } from 'ulid';
import { grokGenerate } from './generate';
import { logger } from '../../logger';
import type {
  GrokBatchRequest,
  GrokBatchResponse,
  GrokProgressEvent,
  GrokVideoReadyEvent,
  GrokTask,
} from '@videoforge/shared';

type ProgressCallback = (event: GrokProgressEvent) => void;
type VideoReadyCallback = (event: GrokVideoReadyEvent) => void;

/** Active batches for cancellation */
const activeBatches = new Map<string, { cancelled: boolean }>();

/**
 * P6-08: Batch queue — serial execution with retry policy.
 *
 * Items run sequentially (ffmpeg concurrency = 1 rule applies to
 * browser automation too — single browser, single tab at a time).
 */
export function grokBatch(
  req: GrokBatchRequest,
  onProgress: ProgressCallback,
  onVideoReady: VideoReadyCallback,
): GrokBatchResponse {
  const batchId = ulid();
  const taskIds: string[] = [];

  const batchState = { cancelled: false };
  activeBatches.set(batchId, batchState);

  logger.info({ batchId, count: req.items.length }, 'grok.batch.start');

  // Run batch asynchronously
  void runBatch(batchId, req, batchState, onProgress, onVideoReady, taskIds).catch(
    (err: unknown) => {
      logger.error({ batchId, err }, 'grok.batch.failed');
    },
  );

  // Return immediately with batchId — completion comes via events
  return { batchId, taskIds };
}

function runBatch(
  batchId: string,
  req: GrokBatchRequest,
  batchState: { cancelled: boolean },
  onProgress: ProgressCallback,
  onVideoReady: VideoReadyCallback,
  taskIds: string[],
): Promise<void> {
  for (const item of req.items) {
    if (batchState.cancelled) {
      logger.info({ batchId }, 'grok.batch.cancelled');
      break;
    }

    const task: Omit<GrokTask, 'taskId'> = {
      ...item,
      outputDir: req.outputDir,
    };

    let retries = task.maxRetries ?? 2;
    let success = false;

    while (!success && retries >= 0 && !batchState.cancelled) {
      try {
        const result = grokGenerate(
          task,
          (evt) => {
            if (!taskIds.includes(evt.taskId)) taskIds.push(evt.taskId);
            onProgress(evt);
          },
          (evt) => onVideoReady({ ...evt, batchId }),
        );
        if (!taskIds.includes(result.taskId)) taskIds.push(result.taskId);
        success = true;
      } catch (err) {
        retries--;
        if (retries < 0) {
          logger.warn({ batchId, prompt: task.prompt, err }, 'grok.batch.item-failed');
        } else {
          logger.info({ batchId, retriesLeft: retries }, 'grok.batch.retry');
        }
      }
    }
  }

  activeBatches.delete(batchId);
  logger.info({ batchId }, 'grok.batch.complete');
  return Promise.resolve();
}

/** Cancel a batch by batchId */
export function cancelBatch(batchId: string): boolean {
  const state = activeBatches.get(batchId);
  if (state) {
    state.cancelled = true;
    return true;
  }
  return false;
}
