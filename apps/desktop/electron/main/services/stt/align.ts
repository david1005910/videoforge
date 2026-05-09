import sttAlign from '@bbc/stt-align-node';
import { logger } from '../../logger';
import type { SttAlignRequest, SttAlignResponse, AlignedWord } from '@videoforge/shared';

/**
 * P3-04: Forced alignment — 사용자 스크립트와 STT 결과를 매칭.
 *
 * @bbc/stt-align-node를 사용하여 단어 단위 타임코드 생성.
 */
export function alignTranscript(req: SttAlignRequest): SttAlignResponse {
  const { transcript, sttSegments, language } = req;

  // BBC align 입력 형식으로 변환
  const sttWords: SttAlignWord[] = [];
  for (const seg of sttSegments) {
    if (seg.words && seg.words.length > 0) {
      for (const w of seg.words) {
        sttWords.push({
          word: w.word.trim(),
          start: w.start,
          end: w.end,
        });
      }
    } else {
      // 단어 단위 타임스탬프가 없으면 segment를 단어로 분리
      const segWords = seg.text.trim().split(/\s+/);
      const segDuration = seg.end - seg.start;
      const wordDuration = segDuration / segWords.length;
      for (let i = 0; i < segWords.length; i++) {
        sttWords.push({
          word: segWords[i] ?? '',
          start: seg.start + i * wordDuration,
          end: seg.start + (i + 1) * wordDuration,
        });
      }
    }
  }

  // 스크립트를 단어로 분리
  const scriptWords = splitByLanguage(transcript, language);

  if (scriptWords.length === 0 || sttWords.length === 0) {
    logger.warn({ scriptLen: scriptWords.length, sttLen: sttWords.length }, 'stt.align.empty');
    return {
      words: [],
      unalignedIndexes: [],
      averageConfidence: 0,
    };
  }

  // BBC stt-align-node 호출
  const aligned = sttAlign(
    scriptWords.map((w) => ({ word: w })),
    sttWords.map((w) => ({ word: w.word, start: w.start, end: w.end })),
  ) as BbcAlignResult[];

  const result: AlignedWord[] = [];
  const unalignedIndexes: number[] = [];
  let totalConfidence = 0;
  let confidenceCount = 0;

  for (let i = 0; i < aligned.length; i++) {
    const item = aligned[i];
    if (item?.start != null && item.end != null) {
      const confidence = item.accuracy ?? 1.0;
      result.push({
        word: item.word,
        scriptIndex: i,
        startMs: Math.round(item.start * 1000),
        endMs: Math.round(item.end * 1000),
        confidence,
      });
      totalConfidence += confidence;
      confidenceCount++;
    } else {
      // 정렬 실패 — 인접 단어로부터 보간
      const prev = result[result.length - 1];
      const startMs = prev ? prev.endMs : 0;
      result.push({
        word: item?.word ?? scriptWords[i] ?? '',
        scriptIndex: i,
        startMs,
        endMs: startMs + 200, // 200ms fallback
      });
      unalignedIndexes.push(i);
    }
  }

  const averageConfidence = confidenceCount > 0 ? totalConfidence / confidenceCount : 0;

  logger.info(
    {
      total: result.length,
      unaligned: unalignedIndexes.length,
      avgConf: averageConfidence.toFixed(3),
    },
    'stt.align.done',
  );

  return {
    words: result,
    unalignedIndexes,
    averageConfidence,
  };
}

/**
 * 언어에 맞게 텍스트를 단어로 분리.
 * 한국어/일본어/중국어는 글자 단위, 나머지는 공백 기준.
 */
function splitByLanguage(text: string, language: string): string[] {
  const cleaned = text.replace(/\n/g, ' ').trim();
  if (['ko', 'ja', 'zh'].includes(language)) {
    // CJK: 공백 + 문장부호 기준 분리 (어절 단위)
    return cleaned.split(/\s+/).filter(Boolean);
  }
  return cleaned.split(/\s+/).filter(Boolean);
}

interface SttAlignWord {
  word: string;
  start: number;
  end: number;
}

interface BbcAlignResult {
  word: string;
  start?: number;
  end?: number;
  accuracy?: number;
}
