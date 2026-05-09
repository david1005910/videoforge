import { describe, it, expect } from 'vitest';
import {
  ProjectSchemas,
  TtsSchemas,
  SttSchemas,
  VideoSchemas,
  GrokSchemas,
  AudioSchemas,
} from './index';
import { Project } from './domain/project';

describe('Project domain', () => {
  it('parses minimal valid project', () => {
    const p = Project.parse({
      id: '01HKQM2X3Y4Z5A6B7C8D9E0F1G',
      formatVersion: '1.0.0',
      title: 'Test Project',
      language: 'ko',
      resolution: { w: 1920, h: 1080, fps: 30 },
      scenes: [],
      createdAt: '2026-05-08T00:00:00.000Z',
      updatedAt: '2026-05-08T00:00:00.000Z',
    });
    expect(p.title).toBe('Test Project');
    expect(p.scenes).toEqual([]);
    expect(p.assets).toEqual({});
  });

  it('rejects invalid ULID', () => {
    const result = Project.safeParse({
      id: 'not-a-ulid',
      formatVersion: '1.0.0',
      title: 'X',
      language: 'ko',
      resolution: { w: 1920, h: 1080, fps: 30 },
      scenes: [],
      createdAt: '2026-05-08T00:00:00.000Z',
      updatedAt: '2026-05-08T00:00:00.000Z',
    });
    expect(result.success).toBe(false);
  });

  it('rejects unsupported formatVersion', () => {
    const result = Project.safeParse({
      id: '01HKQM2X3Y4Z5A6B7C8D9E0F1G',
      formatVersion: '2.0.0',
      title: 'X',
      language: 'ko',
      resolution: { w: 1920, h: 1080, fps: 30 },
      scenes: [],
      createdAt: '2026-05-08T00:00:00.000Z',
      updatedAt: '2026-05-08T00:00:00.000Z',
    });
    expect(result.success).toBe(false);
  });
});

describe('TTS schemas', () => {
  it('TtsEdgeRequest applies defaults', () => {
    const r = TtsSchemas.TtsEdgeRequest.parse({
      text: '안녕하세요',
      voice: 'ko-KR-SunHiNeural',
    });
    expect(r.speed).toBe(1);
    expect(r.pitch).toBe(0);
  });

  it('TtsEdgeRequest rejects extreme speed', () => {
    expect(
      TtsSchemas.TtsEdgeRequest.safeParse({
        text: 'hi',
        voice: 'en-US-AriaNeural',
        speed: 5,
      }).success,
    ).toBe(false);
  });

  it('TtsGeminiRequest accepts emotion hint', () => {
    const r = TtsSchemas.TtsGeminiRequest.parse({
      text: 'hello',
      voice: 'gemini-voice-1',
      emotion: '차분하게',
    });
    expect(r.emotion).toBe('차분하게');
  });
});

describe('STT schemas', () => {
  it('SttTranscribeRequest defaults to openai + word timestamps', () => {
    const r = SttSchemas.SttTranscribeRequest.parse({
      audioPath: '/tmp/a.wav',
      language: 'ko',
    });
    expect(r.provider).toBe('openai');
    expect(r.wordTimestamps).toBe(true);
  });

  it('SttSegment supports word-level timestamps', () => {
    const seg = SttSchemas.SttSegment.parse({
      id: 0,
      start: 0,
      end: 1.5,
      text: '안녕하세요',
      words: [
        { word: '안녕', start: 0, end: 0.5 },
        { word: '하세요', start: 0.5, end: 1.5 },
      ],
    });
    expect(seg.words).toHaveLength(2);
  });
});

describe('Video pipeline', () => {
  it('PipelineStep discriminates by kind', () => {
    const step = VideoSchemas.PipelineStep.parse({
      kind: 'export',
      resolution: { w: 1920, h: 1080, fps: 30 },
      codec: 'h264',
      bitrate: '8M',
      audioCodec: 'aac',
      audioBitrate: '192k',
    });
    expect(step.kind).toBe('export');
  });

  it('PipelineStep rejects unknown kind', () => {
    const result = VideoSchemas.PipelineStep.safeParse({ kind: 'magic', whatever: true });
    expect(result.success).toBe(false);
  });

  it('VideoEditRequest requires non-empty pipeline', () => {
    const result = VideoSchemas.VideoEditRequest.safeParse({
      outputPath: '/tmp/out.mp4',
      pipeline: [],
    });
    expect(result.success).toBe(false);
  });

  it('SubtitleBurnStep requires fontsDir', () => {
    const step = VideoSchemas.PipelineStep.parse({
      kind: 'subtitleBurn',
      subPath: '/tmp/sub.ass',
      fontsDir: '/tmp/fonts',
    });
    expect(step.kind).toBe('subtitleBurn');
  });
});

describe('Audio schemas', () => {
  it('AudioMergeMultiRequest enforces max 32 tracks', () => {
    const tooMany = Array.from({ length: 33 }, (_, i) => ({
      path: `/tmp/${i}.wav`,
      volume: 1,
      offsetMs: 0,
      fadeInMs: 0,
      fadeOutMs: 0,
    }));
    const result = AudioSchemas.AudioMergeMultiRequest.safeParse({
      tracks: tooMany,
      outputPath: '/tmp/out.mp3',
    });
    expect(result.success).toBe(false);
  });
});

describe('Grok schemas', () => {
  it('GrokGenerateRequest defaults', () => {
    const r = GrokSchemas.GrokGenerateRequest.parse({
      prompt: 'a cat in space',
      outputDir: '/tmp/grok',
    });
    expect(r.durationSec).toBe(6);
    expect(r.count).toBe(1);
    expect(r.maxRetries).toBe(2);
  });

  it('GrokBatchRequest enforces minimum 1 item', () => {
    const result = GrokSchemas.GrokBatchRequest.safeParse({
      items: [],
      outputDir: '/tmp/grok',
    });
    expect(result.success).toBe(false);
  });

  it('GrokProgressEvent phases include failure case', () => {
    const e = GrokSchemas.GrokProgressEvent.parse({
      taskId: '01HKQM2X3Y4Z5A6B7C8D9E0F1G',
      percent: 0,
      phase: 'failed',
      message: 'site DOM changed',
      failureScreenshotPath: '/tmp/screen.png',
    });
    expect(e.phase).toBe('failed');
  });
});

describe('Project list', () => {
  it('defaults sort to updatedAt desc', () => {
    const r = ProjectSchemas.ProjectListRequest.parse({});
    expect(r.sortBy).toBe('updatedAt');
    expect(r.sortOrder).toBe('desc');
    expect(r.limit).toBe(100);
  });
});
