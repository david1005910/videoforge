import { Channels, CollabSchemas } from '@videoforge/shared';
import { registerHandler } from '../../ipc-router';
import { logger } from '../../logger';
import type {
  CollabPublishRequest,
  CollabPublishResponse,
  CollabBrowseRequest,
  CollabBrowseResponse,
  CollabDownloadRequest,
  CollabDownloadResponse,
  CollabDeleteRequest,
} from '@videoforge/shared';
import { ulid } from 'ulid';

function publish(req: CollabPublishRequest): CollabPublishResponse {
  logger.info({ type: req.type, title: req.title }, 'collab.publish');

  // Placeholder: actual upload to shared library deferred
  return {
    assetId: ulid(),
    publishedAt: new Date().toISOString(),
  };
}

function browse(req: CollabBrowseRequest): CollabBrowseResponse {
  logger.info({ type: req.type, query: req.query }, 'collab.browse');

  // Placeholder: actual query deferred
  return {
    items: [],
    total: 0,
    hasMore: false,
  };
}

function download(req: CollabDownloadRequest): CollabDownloadResponse {
  logger.info({ assetId: req.assetId }, 'collab.download');

  // Placeholder: actual download deferred
  return {
    assetId: req.assetId,
    localPath: `${req.outputDir}/${req.assetId}`,
    sizeBytes: 0,
  };
}

function deleteAsset(req: CollabDeleteRequest): void {
  logger.info({ assetId: req.assetId }, 'collab.delete');
  // Placeholder: actual delete deferred
}

export function registerCollabHandlers(): void {
  registerHandler(Channels.Collab.Publish, CollabSchemas.CollabPublishRequest, (req) =>
    Promise.resolve(publish(req)),
  );

  registerHandler(Channels.Collab.Browse, CollabSchemas.CollabBrowseRequest, (req) =>
    Promise.resolve(browse(req)),
  );

  registerHandler(Channels.Collab.Download, CollabSchemas.CollabDownloadRequest, (req) =>
    Promise.resolve(download(req)),
  );

  registerHandler(Channels.Collab.Delete, CollabSchemas.CollabDeleteRequest, (req) => {
    deleteAsset(req);
    return Promise.resolve();
  });
}
