import type { TtsVoice } from '@videoforge/shared';

/**
 * Edge TTS 보이스 카탈로그 (P2-10).
 *
 * 한국어, 영어, 일본어, 중국어, 히브리어 주요 보이스.
 */
export const EDGE_VOICES: TtsVoice[] = [
  // 한국어
  {
    id: 'ko-KR-SunHiNeural',
    provider: 'edge',
    language: 'ko',
    gender: 'female',
    displayName: '선히 (여성)',
  },
  {
    id: 'ko-KR-InJoonNeural',
    provider: 'edge',
    language: 'ko',
    gender: 'male',
    displayName: '인준 (남성)',
  },
  {
    id: 'ko-KR-BongJinNeural',
    provider: 'edge',
    language: 'ko',
    gender: 'male',
    displayName: '봉진 (남성)',
  },
  {
    id: 'ko-KR-GookMinNeural',
    provider: 'edge',
    language: 'ko',
    gender: 'male',
    displayName: '국민 (남성)',
  },
  {
    id: 'ko-KR-JiMinNeural',
    provider: 'edge',
    language: 'ko',
    gender: 'female',
    displayName: '지민 (여성)',
  },
  {
    id: 'ko-KR-SeoHyeonNeural',
    provider: 'edge',
    language: 'ko',
    gender: 'female',
    displayName: '서현 (여성)',
  },
  {
    id: 'ko-KR-SoonBokNeural',
    provider: 'edge',
    language: 'ko',
    gender: 'female',
    displayName: '순복 (여성)',
  },
  {
    id: 'ko-KR-YuJinNeural',
    provider: 'edge',
    language: 'ko',
    gender: 'female',
    displayName: '유진 (여성)',
  },

  // 영어 (US)
  {
    id: 'en-US-JennyNeural',
    provider: 'edge',
    language: 'en',
    gender: 'female',
    displayName: 'Jenny (F)',
  },
  {
    id: 'en-US-GuyNeural',
    provider: 'edge',
    language: 'en',
    gender: 'male',
    displayName: 'Guy (M)',
  },
  {
    id: 'en-US-AriaNeural',
    provider: 'edge',
    language: 'en',
    gender: 'female',
    displayName: 'Aria (F)',
  },
  {
    id: 'en-US-DavisNeural',
    provider: 'edge',
    language: 'en',
    gender: 'male',
    displayName: 'Davis (M)',
  },
  {
    id: 'en-US-TonyNeural',
    provider: 'edge',
    language: 'en',
    gender: 'male',
    displayName: 'Tony (M)',
  },

  // 일본어
  {
    id: 'ja-JP-NanamiNeural',
    provider: 'edge',
    language: 'ja',
    gender: 'female',
    displayName: 'Nanami (F)',
  },
  {
    id: 'ja-JP-KeitaNeural',
    provider: 'edge',
    language: 'ja',
    gender: 'male',
    displayName: 'Keita (M)',
  },

  // 중국어 (Mandarin)
  {
    id: 'zh-CN-XiaoxiaoNeural',
    provider: 'edge',
    language: 'zh',
    gender: 'female',
    displayName: 'Xiaoxiao (F)',
  },
  {
    id: 'zh-CN-YunxiNeural',
    provider: 'edge',
    language: 'zh',
    gender: 'male',
    displayName: 'Yunxi (M)',
  },

  // 히브리어
  {
    id: 'he-IL-HilaNeural',
    provider: 'edge',
    language: 'he',
    gender: 'female',
    displayName: 'Hila (F)',
  },
  {
    id: 'he-IL-AvriNeural',
    provider: 'edge',
    language: 'he',
    gender: 'male',
    displayName: 'Avri (M)',
  },
];
