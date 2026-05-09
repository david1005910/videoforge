import { describe, it, expect, vi } from 'vitest';
import type { SttSegment } from '@videoforge/shared';

vi.mock('electron', () => ({
  app: { isPackaged: false, getPath: () => '/tmp/videoforge-test' },
  ipcMain: { handle: vi.fn(), removeHandler: vi.fn() },
}));

// Mock @bbc/stt-align-node — returns aligned words with times from STT input
vi.mock('@bbc/stt-align-node', () => ({
  default: (script: { word: string }[], stt: { word: string; start: number; end: number }[]) => {
    return script.map((s, i) => {
      const match = stt[i];
      return match
        ? { word: s.word, start: match.start, end: match.end, accuracy: 0.9 }
        : { word: s.word };
    });
  },
}));

import { alignTranscript } from './align';

describe('alignTranscript', () => {
  const segments: SttSegment[] = [
    {
      id: 0,
      start: 0,
      end: 2,
      text: '안녕하세요 저는',
      words: [
        { word: '안녕하세요', start: 0, end: 0.8 },
        { word: '저는', start: 0.8, end: 1.2 },
      ],
    },
    {
      id: 1,
      start: 2,
      end: 4,
      text: '테스트입니다',
      words: [{ word: '테스트입니다', start: 2, end: 3.5 }],
    },
  ];

  it('aligns script with STT segments', () => {
    const result = alignTranscript({
      transcript: '안녕하세요 저는 테스트입니다',
      sttSegments: segments,
      language: 'ko',
    });

    expect(result.words.length).toBeGreaterThan(0);
    expect(result.averageConfidence).toBeGreaterThanOrEqual(0);
    expect(result.averageConfidence).toBeLessThanOrEqual(1);
  });

  it('returns empty for empty input', () => {
    const result = alignTranscript({
      transcript: '',
      sttSegments: [],
      language: 'ko',
    });

    expect(result.words).toEqual([]);
    expect(result.unalignedIndexes).toEqual([]);
    expect(result.averageConfidence).toBe(0);
  });

  it('handles segments without word-level timestamps', () => {
    const noWordSegments: SttSegment[] = [
      { id: 0, start: 0, end: 3, text: '안녕하세요 저는 테스트입니다' },
    ];

    const result = alignTranscript({
      transcript: '안녕하세요 저는 테스트입니다',
      sttSegments: noWordSegments,
      language: 'ko',
    });

    expect(result.words.length).toBeGreaterThan(0);
    for (const w of result.words) {
      expect(w.startMs).toBeGreaterThanOrEqual(0);
      expect(w.endMs).toBeGreaterThan(0);
    }
  });

  it('assigns sequential scriptIndex', () => {
    const result = alignTranscript({
      transcript: '안녕하세요 저는 테스트입니다',
      sttSegments: segments,
      language: 'ko',
    });

    for (let i = 0; i < result.words.length; i++) {
      expect(result.words[i]?.scriptIndex).toBe(i);
    }
  });
});
