import { describe, it, expect } from 'vitest';
import { GrokSchemas, ChatRemoteSchemas, Channels } from '@videoforge/shared';

describe('Bridge schemas', () => {
  it('validates GrokBridgeStatusResponse', () => {
    const data = { available: true, connectedTabs: 2 };
    const parsed = GrokSchemas.GrokBridgeStatusResponse.parse(data);
    expect(parsed.available).toBe(true);
    expect(parsed.connectedTabs).toBe(2);
  });

  it('validates GrokBridgeStatusResponse with extensionVersion', () => {
    const data = { available: true, extensionVersion: '1.0.0', connectedTabs: 0 };
    const parsed = GrokSchemas.GrokBridgeStatusResponse.parse(data);
    expect(parsed.extensionVersion).toBe('1.0.0');
  });

  it('validates GrokBridgeSendRequest', () => {
    const data = {
      items: [
        {
          prompt: 'test prompt',
          outputDir: '/tmp/output',
        },
      ],
    };
    const parsed = GrokSchemas.GrokBridgeSendRequest.parse(data);
    expect(parsed.items).toHaveLength(1);
    expect(parsed.items[0]?.prompt).toBe('test prompt');
  });

  it('validates GrokBridgeSetProjectRequest', () => {
    const data = { projectId: '01HKQM2X3Y4Z5A6B7C8D9E0F1G' };
    const parsed = GrokSchemas.GrokBridgeSetProjectRequest.parse(data);
    expect(parsed.projectId).toBe('01HKQM2X3Y4Z5A6B7C8D9E0F1G');
  });

  it('rejects GrokBridgeSendRequest with empty items', () => {
    expect(() => GrokSchemas.GrokBridgeSendRequest.parse({ items: [] })).toThrow();
  });

  it('has bridge channel names defined', () => {
    expect(Channels.Grok.BridgeStatus).toBe('grok:bridge:status');
    expect(Channels.Grok.BridgeSend).toBe('grok:bridge:send');
    expect(Channels.Grok.BridgeCancel).toBe('grok:bridge:cancel');
    expect(Channels.Grok.BridgeSetProject).toBe('grok:bridge:setProject');
  });
});

describe('Remote schemas', () => {
  it('validates RemoteInitRequest with defaults', () => {
    const data = {};
    const parsed = ChatRemoteSchemas.RemoteInitRequest.parse(data);
    expect(parsed.port).toBe(0);
    expect(parsed.codeLength).toBe(6);
  });

  it('validates RemoteInitRequest with custom values', () => {
    const data = { port: 8080, codeLength: 8 };
    const parsed = ChatRemoteSchemas.RemoteInitRequest.parse(data);
    expect(parsed.port).toBe(8080);
    expect(parsed.codeLength).toBe(8);
  });

  it('validates RemoteInitResponse', () => {
    const data = {
      port: 9000,
      pairingCode: '123456',
      expiresAt: '2026-05-10T12:00:00.000Z',
    };
    const parsed = ChatRemoteSchemas.RemoteInitResponse.parse(data);
    expect(parsed.pairingCode).toBe('123456');
  });

  it('validates RemoteSceneSummary', () => {
    const data = {
      id: '01HKQM2X3Y4Z5A6B7C8D9E0F1G',
      index: 0,
      title: 'Scene 1',
      status: 'draft',
    };
    const parsed = ChatRemoteSchemas.RemoteSceneSummary.parse(data);
    expect(parsed.status).toBe('draft');
  });

  it('validates RemoteScenesResponse', () => {
    const data = {
      projectId: '01HKQM2X3Y4Z5A6B7C8D9E0F1G',
      scenes: [
        {
          id: '01HKQM2X3Y4Z5A6B7C8D9E0F1G',
          index: 0,
          title: 'Scene 1',
          status: 'complete',
        },
      ],
    };
    const parsed = ChatRemoteSchemas.RemoteScenesResponse.parse(data);
    expect(parsed.scenes).toHaveLength(1);
  });

  it('rejects invalid RemoteSceneSummary status', () => {
    const data = {
      id: '01HKQM2X3Y4Z5A6B7C8D9E0F1G',
      index: 0,
      title: 'Scene 1',
      status: 'unknown',
    };
    expect(() => ChatRemoteSchemas.RemoteSceneSummary.parse(data)).toThrow();
  });

  it('has remote channel names defined', () => {
    expect(Channels.Remote.Init).toBe('remote:init');
    expect(Channels.Remote.OnGetScenes).toBe('remote:onGetScenes');
    expect(Channels.Remote.SendScenes).toBe('remote:sendScenes');
    expect(Channels.Remote.OnCommand).toBe('remote:onCommand');
    expect(Channels.Remote.SendResponse).toBe('remote:sendResponse');
  });
});
