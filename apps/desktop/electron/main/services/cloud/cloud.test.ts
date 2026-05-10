import { describe, it, expect } from 'vitest';
import { CloudSyncSchemas, VideogenSchemas, CollabSchemas, Channels } from '@videoforge/shared';

describe('Cloud Sync schemas', () => {
  it('validates CloudConnectRequest', () => {
    const data = { supabaseUrl: 'https://abc.supabase.co', supabaseAnonKey: 'key123' };
    const parsed = CloudSyncSchemas.CloudConnectRequest.parse(data);
    expect(parsed.supabaseUrl).toBe('https://abc.supabase.co');
  });

  it('rejects invalid URL in CloudConnectRequest', () => {
    expect(() =>
      CloudSyncSchemas.CloudConnectRequest.parse({ supabaseUrl: 'not-url', supabaseAnonKey: 'k' }),
    ).toThrow();
  });

  it('validates CloudStatusResponse', () => {
    const data = { status: 'connected', projectsSynced: 3 };
    const parsed = CloudSyncSchemas.CloudStatusResponse.parse(data);
    expect(parsed.status).toBe('connected');
    expect(parsed.projectsSynced).toBe(3);
  });

  it('validates CloudSyncRequest with defaults', () => {
    const parsed = CloudSyncSchemas.CloudSyncRequest.parse({});
    expect(parsed.direction).toBe('both');
  });

  it('validates CloudSyncResponse', () => {
    const data = {
      uploaded: 2,
      downloaded: 1,
      conflicts: 0,
      lastSyncAt: '2026-05-10T12:00:00.000Z',
    };
    const parsed = CloudSyncSchemas.CloudSyncResponse.parse(data);
    expect(parsed.uploaded).toBe(2);
  });

  it('validates CloudRemoteProject', () => {
    const data = {
      projectId: '01HKQM2X3Y4Z5A6B7C8D9E0F1G',
      title: 'Test',
      updatedAt: '2026-05-10T12:00:00.000Z',
      sizeBytes: 1024,
    };
    const parsed = CloudSyncSchemas.CloudRemoteProject.parse(data);
    expect(parsed.title).toBe('Test');
  });

  it('has cloud channel names defined', () => {
    expect(Channels.Cloud.Connect).toBe('cloud:connect');
    expect(Channels.Cloud.Disconnect).toBe('cloud:disconnect');
    expect(Channels.Cloud.Status).toBe('cloud:status');
    expect(Channels.Cloud.Sync).toBe('cloud:sync');
    expect(Channels.Cloud.ListRemote).toBe('cloud:listRemote');
  });
});

describe('Videogen schemas', () => {
  it('validates VideogenGenerateRequest', () => {
    const data = {
      provider: 'veo',
      prompt: 'A sunset over mountains',
      outputDir: '/tmp/output',
      apiKey: 'test-key',
    };
    const parsed = VideogenSchemas.VideogenGenerateRequest.parse(data);
    expect(parsed.provider).toBe('veo');
    expect(parsed.durationSec).toBe(6);
    expect(parsed.aspectRatio).toBe('16:9');
  });

  it('validates VideogenGenerateRequest with sora provider', () => {
    const data = {
      provider: 'sora',
      prompt: 'Dancing cat',
      durationSec: 10,
      aspectRatio: '9:16',
      outputDir: '/tmp',
      apiKey: 'key',
    };
    const parsed = VideogenSchemas.VideogenGenerateRequest.parse(data);
    expect(parsed.provider).toBe('sora');
    expect(parsed.aspectRatio).toBe('9:16');
  });

  it('rejects invalid provider', () => {
    expect(() =>
      VideogenSchemas.VideogenGenerateRequest.parse({
        provider: 'invalid',
        prompt: 'test',
        outputDir: '/tmp',
        apiKey: 'k',
      }),
    ).toThrow();
  });

  it('validates VideogenStatusResponse', () => {
    const data = { veoAvailable: false, soraAvailable: false };
    const parsed = VideogenSchemas.VideogenStatusResponse.parse(data);
    expect(parsed.veoAvailable).toBe(false);
  });

  it('validates VideogenProgressEvent', () => {
    const data = {
      taskId: '01HKQM2X3Y4Z5A6B7C8D9E0F1G',
      percent: 50,
      provider: 'veo',
      phase: 'generating',
    };
    const parsed = VideogenSchemas.VideogenProgressEvent.parse(data);
    expect(parsed.phase).toBe('generating');
  });

  it('has videogen channel names defined', () => {
    expect(Channels.Videogen.Generate).toBe('videogen:generate');
    expect(Channels.Videogen.Cancel).toBe('videogen:cancel');
    expect(Channels.Videogen.Status).toBe('videogen:status');
    expect(Channels.Videogen.OnProgress).toBe('videogen:onProgress');
    expect(Channels.Videogen.OnComplete).toBe('videogen:onComplete');
  });
});

describe('Collab schemas', () => {
  it('validates CollabPublishRequest', () => {
    const data = { type: 'template', title: 'My Template', filePath: '/tmp/template.zip' };
    const parsed = CollabSchemas.CollabPublishRequest.parse(data);
    expect(parsed.type).toBe('template');
  });

  it('validates CollabBrowseRequest with defaults', () => {
    const parsed = CollabSchemas.CollabBrowseRequest.parse({});
    expect(parsed.offset).toBe(0);
    expect(parsed.limit).toBe(20);
  });

  it('validates CollabBrowseResponse', () => {
    const data = { items: [], total: 0, hasMore: false };
    const parsed = CollabSchemas.CollabBrowseResponse.parse(data);
    expect(parsed.items).toHaveLength(0);
  });

  it('validates CollabDownloadRequest', () => {
    const data = { assetId: '01HKQM2X3Y4Z5A6B7C8D9E0F1G', outputDir: '/tmp/downloads' };
    const parsed = CollabSchemas.CollabDownloadRequest.parse(data);
    expect(parsed.assetId).toBe('01HKQM2X3Y4Z5A6B7C8D9E0F1G');
  });

  it('validates SharedAsset', () => {
    const data = {
      id: '01HKQM2X3Y4Z5A6B7C8D9E0F1G',
      type: 'font',
      title: 'Custom Font',
      tags: ['korean', 'sans-serif'],
      sizeBytes: 2048,
      createdAt: '2026-05-10T12:00:00.000Z',
      updatedAt: '2026-05-10T12:00:00.000Z',
    };
    const parsed = CollabSchemas.SharedAsset.parse(data);
    expect(parsed.type).toBe('font');
    expect(parsed.tags).toHaveLength(2);
  });

  it('rejects invalid CollabAssetType', () => {
    expect(() =>
      CollabSchemas.CollabPublishRequest.parse({
        type: 'invalid',
        title: 'x',
        filePath: '/tmp/x',
      }),
    ).toThrow();
  });

  it('has collab channel names defined', () => {
    expect(Channels.Collab.Publish).toBe('collab:publish');
    expect(Channels.Collab.Browse).toBe('collab:browse');
    expect(Channels.Collab.Download).toBe('collab:download');
    expect(Channels.Collab.Delete).toBe('collab:delete');
  });
});
