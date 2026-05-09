import { useState, useCallback } from 'react';
import { Subtitles, RefreshCw } from 'lucide-react';
import { api } from '../../lib/api';
import { SubtitlePreview } from '../../components/SubtitlePreview';
import { buildAss, DEFAULT_STYLE, HBAS_STYLE } from '@videoforge/shared';
import type { Scene, AlignedWord } from '@videoforge/shared';

interface Props {
  scene: Scene | null;
  projectLanguage: string;
  onSubtitleGenerated: (sceneId: string, assContent: string) => void;
}

type StylePreset = 'default' | 'hbas';

/**
 * P3-09: 자막 편집 패널.
 *
 * STT → Align → ASS 생성 워크플로우 + 단어 단위 타임 조정.
 */
export function SubtitlePanel({ scene, projectLanguage, onSubtitleGenerated }: Props): JSX.Element {
  const [words, setWords] = useState<AlignedWord[]>([]);
  const [assContent, setAssContent] = useState('');
  const [stylePreset, setStylePreset] = useState<StylePreset>('default');
  const [isProcessing, setProcessing] = useState(false);
  const [error, setError] = useState('');
  const [sttProvider, setSttProvider] = useState<'openai' | 'gemini'>('openai');

  const handleGenerateSubtitle = useCallback(async () => {
    if (!scene) return;
    if (!scene.narrationAudio) {
      setError('나레이션 오디오가 없습니다. 먼저 TTS를 생성하세요.');
      return;
    }

    const script = scene.scriptKo ?? scene.scriptOriginal ?? '';
    if (!script.trim()) {
      setError('스크립트가 비어있습니다.');
      return;
    }

    setProcessing(true);
    setError('');

    try {
      // 1. STT 전사
      const apiKey = await api.keychain.get(
        sttProvider === 'openai' ? 'openai-api-key' : 'gemini-api-key',
      );

      const sttResult = await api.stt.transcribe({
        audioPath: scene.narrationAudio.path,
        language: projectLanguage,
        provider: sttProvider,
        apiKey: apiKey ?? undefined,
        wordTimestamps: true,
      });

      // 2. Forced alignment
      const alignResult = await api.stt.align({
        transcript: script,
        sttSegments: sttResult.segments,
        language: projectLanguage,
      });

      setWords(alignResult.words);

      // 3. ASS 생성
      const style = stylePreset === 'hbas' ? HBAS_STYLE : DEFAULT_STYLE;
      const ass = buildAss(alignResult.words, style);
      setAssContent(ass);
      onSubtitleGenerated(scene.id, ass);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setProcessing(false);
    }
  }, [scene, projectLanguage, sttProvider, stylePreset, onSubtitleGenerated]);

  const handleWordTimeChange = useCallback(
    (index: number, field: 'startMs' | 'endMs', value: number) => {
      const updated = words.map((w, i) => (i === index ? { ...w, [field]: value } : w));
      setWords(updated);

      // Regenerate ASS
      const style = stylePreset === 'hbas' ? HBAS_STYLE : DEFAULT_STYLE;
      const ass = buildAss(updated, style);
      setAssContent(ass);
      if (scene) onSubtitleGenerated(scene.id, ass);
    },
    [words, stylePreset, scene, onSubtitleGenerated],
  );

  const handleStyleChange = useCallback(
    (preset: StylePreset) => {
      setStylePreset(preset);
      if (words.length > 0) {
        const style = preset === 'hbas' ? HBAS_STYLE : DEFAULT_STYLE;
        const ass = buildAss(words, style);
        setAssContent(ass);
        if (scene) onSubtitleGenerated(scene.id, ass);
      }
    },
    [words, scene, onSubtitleGenerated],
  );

  if (!scene) {
    return (
      <div className="flex items-center justify-center p-8 text-sm text-zinc-600">
        씬을 선택하세요
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4 p-4">
      {/* 컨트롤 */}
      <div className="flex items-center gap-3">
        <select
          value={sttProvider}
          onChange={(e) => setSttProvider(e.target.value as 'openai' | 'gemini')}
          className="rounded border border-zinc-700 bg-zinc-900 px-2 py-1 text-xs"
        >
          <option value="openai">OpenAI Whisper</option>
          <option value="gemini">Gemini</option>
        </select>

        <select
          value={stylePreset}
          onChange={(e) => handleStyleChange(e.target.value as StylePreset)}
          className="rounded border border-zinc-700 bg-zinc-900 px-2 py-1 text-xs"
        >
          <option value="default">기본 스타일</option>
          <option value="hbas">HBAS 스타일</option>
        </select>

        <button
          type="button"
          onClick={() => void handleGenerateSubtitle()}
          disabled={isProcessing || !scene.narrationAudio}
          className="bg-accent hover:bg-accent-600 flex items-center gap-1 rounded px-3 py-1 text-xs font-medium text-white transition disabled:opacity-50"
        >
          {isProcessing ? (
            <RefreshCw size={12} className="animate-spin" />
          ) : (
            <Subtitles size={12} />
          )}
          {isProcessing ? '생성 중...' : '자막 생성'}
        </button>
      </div>

      {error && (
        <div className="rounded border border-red-800 bg-red-950/30 p-2 text-xs text-red-400">
          {error}
        </div>
      )}

      {/* 미리보기 */}
      {assContent && <SubtitlePreview assContent={assContent} />}

      {/* 단어 타임라인 */}
      {words.length > 0 && (
        <div className="scrollbar-thin max-h-60 overflow-y-auto rounded border border-zinc-800">
          <table className="w-full text-xs">
            <thead className="sticky top-0 bg-zinc-900">
              <tr className="text-zinc-500">
                <th className="px-2 py-1 text-left">#</th>
                <th className="px-2 py-1 text-left">단어</th>
                <th className="px-2 py-1 text-right">시작 (ms)</th>
                <th className="px-2 py-1 text-right">끝 (ms)</th>
              </tr>
            </thead>
            <tbody>
              {words.map((w, i) => (
                <tr
                  key={`${w.scriptIndex}-${i}`}
                  className="border-t border-zinc-800/50 hover:bg-zinc-800/30"
                >
                  <td className="px-2 py-1 text-zinc-600">{i + 1}</td>
                  <td className="px-2 py-1 text-zinc-300">{w.word}</td>
                  <td className="px-2 py-1 text-right">
                    <input
                      type="number"
                      value={w.startMs}
                      onChange={(e) =>
                        handleWordTimeChange(i, 'startMs', parseInt(e.target.value, 10) || 0)
                      }
                      className="w-20 rounded border border-zinc-700 bg-zinc-900 px-1 py-0.5 text-right text-xs"
                    />
                  </td>
                  <td className="px-2 py-1 text-right">
                    <input
                      type="number"
                      value={w.endMs}
                      onChange={(e) =>
                        handleWordTimeChange(i, 'endMs', parseInt(e.target.value, 10) || 0)
                      }
                      className="w-20 rounded border border-zinc-700 bg-zinc-900 px-1 py-0.5 text-right text-xs"
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
