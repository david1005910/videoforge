import type { AlignedWord } from './schemas/stt';

/**
 * ASS subtitle generator.
 *
 * AlignedWord[] → ASS V4.00+ 포맷 자막 파일.
 * 렌더러 + 메인 양쪽에서 사용 가능 (순수 함수).
 */

export interface AssStyle {
  fontName: string;
  fontSize: number;
  primaryColour: string;
  outlineColour: string;
  backColour: string;
  bold: boolean;
  borderStyle: 1 | 3;
  outline: number;
  shadow: number;
  alignment: number;
  marginV: number;
}

export const DEFAULT_STYLE: AssStyle = {
  fontName: 'Noto Sans KR',
  fontSize: 48,
  primaryColour: '&H00FFFFFF',
  outlineColour: '&H00000000',
  backColour: '&H80000000',
  bold: true,
  borderStyle: 1,
  outline: 2,
  shadow: 1,
  alignment: 2,
  marginV: 40,
};

export const HBAS_STYLE: AssStyle = {
  fontName: 'Noto Sans KR',
  fontSize: 44,
  primaryColour: '&H00FFFFFF',
  outlineColour: '&H00222222',
  backColour: '&H80000000',
  bold: true,
  borderStyle: 1,
  outline: 3,
  shadow: 0,
  alignment: 2,
  marginV: 50,
};

interface SubtitleLine {
  text: string;
  startMs: number;
  endMs: number;
}

export function buildAss(
  words: AlignedWord[],
  style: AssStyle = DEFAULT_STYLE,
  resolution: { w: number; h: number } = { w: 1920, h: 1080 },
): string {
  const lines = wordsToLines(words, { maxCharsPerLine: 22 });

  const header = [
    '[Script Info]',
    'ScriptType: v4.00+',
    `PlayResX: ${resolution.w}`,
    `PlayResY: ${resolution.h}`,
    'WrapStyle: 0',
    'ScaledBorderAndShadow: yes',
    '',
    '[V4+ Styles]',
    'Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding',
    `Style: Default,${style.fontName},${style.fontSize},${style.primaryColour},&H000000FF,${style.outlineColour},${style.backColour},${style.bold ? -1 : 0},0,0,0,100,100,0,0,${style.borderStyle},${style.outline},${style.shadow},${style.alignment},10,10,${style.marginV},1`,
    '',
    '[Events]',
    'Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text',
  ];

  const events = lines.map(
    (line) =>
      `Dialogue: 0,${msToAss(line.startMs)},${msToAss(line.endMs)},Default,,0,0,0,,${escapeAssText(line.text)}`,
  );

  return [...header, ...events, ''].join('\n');
}

export function wordsToLines(
  words: AlignedWord[],
  opts: { maxCharsPerLine: number } = { maxCharsPerLine: 22 },
): SubtitleLine[] {
  if (words.length === 0) return [];

  const lines: SubtitleLine[] = [];
  let currentWords: AlignedWord[] = [];
  let currentLen = 0;

  for (const word of words) {
    const wordLen = word.word.length;
    if (currentWords.length > 0 && currentLen + wordLen + 1 > opts.maxCharsPerLine) {
      lines.push(flushLine(currentWords));
      currentWords = [];
      currentLen = 0;
    }
    currentWords.push(word);
    currentLen += wordLen + (currentLen > 0 ? 1 : 0);
  }

  if (currentWords.length > 0) {
    lines.push(flushLine(currentWords));
  }

  return lines;
}

function flushLine(words: AlignedWord[]): SubtitleLine {
  const first = words[0]!;
  const last = words[words.length - 1]!;
  return {
    text: words.map((w) => w.word).join(' '),
    startMs: first.startMs,
    endMs: last.endMs,
  };
}

export function msToAss(ms: number): string {
  const totalSec = ms / 1000;
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = Math.floor(totalSec % 60);
  const cs = Math.round((totalSec % 1) * 100);
  return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}.${cs.toString().padStart(2, '0')}`;
}

function escapeAssText(text: string): string {
  return text.replace(/\\/g, '\\\\').replace(/\{/g, '\\{').replace(/\}/g, '\\}');
}
