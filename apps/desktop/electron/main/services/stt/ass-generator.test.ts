import { describe, it, expect } from 'vitest';
import { buildAss, wordsToLines, msToAss, DEFAULT_STYLE } from './ass-generator';
import type { AlignedWord } from '@videoforge/shared';

describe('ASS Generator', () => {
  const words: AlignedWord[] = [
    { word: '안녕하세요', scriptIndex: 0, startMs: 0, endMs: 500 },
    { word: '저는', scriptIndex: 1, startMs: 500, endMs: 800 },
    { word: '비디오포지입니다', scriptIndex: 2, startMs: 800, endMs: 1500 },
    { word: '오늘', scriptIndex: 3, startMs: 2000, endMs: 2300 },
    { word: '영상을', scriptIndex: 4, startMs: 2300, endMs: 2600 },
    { word: '만들어', scriptIndex: 5, startMs: 2600, endMs: 2900 },
    { word: '보겠습니다', scriptIndex: 6, startMs: 2900, endMs: 3500 },
  ];

  describe('msToAss', () => {
    it('converts 0ms', () => {
      expect(msToAss(0)).toBe('0:00:00.00');
    });

    it('converts seconds and centiseconds', () => {
      expect(msToAss(1500)).toBe('0:00:01.50');
    });

    it('converts minutes', () => {
      expect(msToAss(125000)).toBe('0:02:05.00');
    });

    it('converts hours', () => {
      expect(msToAss(3661000)).toBe('1:01:01.00');
    });
  });

  describe('wordsToLines', () => {
    it('groups words within maxCharsPerLine', () => {
      const lines = wordsToLines(words, { maxCharsPerLine: 22 });
      expect(lines.length).toBeGreaterThan(0);
      for (const line of lines) {
        expect(line.startMs).toBeGreaterThanOrEqual(0);
        expect(line.endMs).toBeGreaterThan(line.startMs);
      }
    });

    it('returns empty for empty input', () => {
      expect(wordsToLines([])).toEqual([]);
    });

    it('keeps long words on their own line', () => {
      const longWords: AlignedWord[] = [
        { word: '가나다라마바사아자차카타파하', scriptIndex: 0, startMs: 0, endMs: 1000 },
        { word: '짧은말', scriptIndex: 1, startMs: 1000, endMs: 1500 },
      ];
      const lines = wordsToLines(longWords, { maxCharsPerLine: 10 });
      expect(lines.length).toBe(2);
    });
  });

  describe('buildAss', () => {
    it('generates valid ASS format', () => {
      const ass = buildAss(words);
      expect(ass).toContain('[Script Info]');
      expect(ass).toContain('ScriptType: v4.00+');
      expect(ass).toContain('[V4+ Styles]');
      expect(ass).toContain('[Events]');
      expect(ass).toContain('Dialogue:');
    });

    it('uses custom resolution', () => {
      const ass = buildAss(words, DEFAULT_STYLE, { w: 3840, h: 2160 });
      expect(ass).toContain('PlayResX: 3840');
      expect(ass).toContain('PlayResY: 2160');
    });

    it('handles empty words', () => {
      const ass = buildAss([]);
      expect(ass).toContain('[Script Info]');
      expect(ass).not.toContain('Dialogue:');
    });
  });
});
