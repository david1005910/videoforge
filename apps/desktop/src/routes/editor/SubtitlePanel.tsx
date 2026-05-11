import { useState, useCallback } from 'react';
import { Subtitles, RefreshCw } from 'lucide-react';
import { api } from '../../lib/api';
import { useT } from '../../i18n';
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
 * P3-09: Subtitle editing panel.
 */
export function SubtitlePanel({ scene, projectLanguage, onSubtitleGenerated }: Props): JSX.Element {
  const t = useT();
  const [words, setWords] = useState<AlignedWord[]>([]);
  const [assContent, setAssContent] = useState('');
  const [stylePreset, setStylePreset] = useState<StylePreset>('default');
  const [isProcessing, setProcessing] = useState(false);
  const [error, setError] = useState('');
  const [sttProvider, setSttProvider] = useState<'openai' | 'gemini' | 'whisper-local'>('openai');

  const handleGenerateSubtitle = useCallback(async () => {
    if (!scene) return;
    if (!scene.narrationAudio) {
      setError(t('subtitle.noAudio'));
      return;
    }

    const script = scene.scriptKo ?? scene.scriptOriginal ?? '';
    if (!script.trim()) {
      setError(t('subtitle.emptyScript'));
      return;
    }

    setProcessing(true);
    setError('');

    try {
      let apiKey: string | null = null;
      if (sttProvider === 'openai') {
        apiKey = await api.keychain.get('openai-api-key');
      } else if (sttProvider === 'gemini') {
        apiKey = await api.keychain.get('gemini-api-key');
      }

      const sttResult = await api.stt.transcribe({
        audioPath: scene.narrationAudio.path,
        language: projectLanguage,
        provider: sttProvider,
        apiKey: apiKey ?? undefined,
        wordTimestamps: true,
      });

      const alignResult = await api.stt.align({
        transcript: script,
        sttSegments: sttResult.segments,
        language: projectLanguage,
      });

      setWords(alignResult.words);

      const style = stylePreset === 'hbas' ? HBAS_STYLE : DEFAULT_STYLE;
      const ass = buildAss(alignResult.words, style);
      setAssContent(ass);
      onSubtitleGenerated(scene.id, ass);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setProcessing(false);
    }
  }, [scene, projectLanguage, sttProvider, stylePreset, onSubtitleGenerated, t]);

  const handleWordTimeChange = useCallback(
    (index: number, field: 'startMs' | 'endMs', value: number) => {
      const updated = words.map((w, i) => (i === index ? { ...w, [field]: value } : w));
      setWords(updated);

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
      <div className="flex items-center justify-center p-8 text-sm text-white/25">
        {t('scene.select')}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4 p-4">
      {/* Controls */}
      <div className="flex items-center gap-3">
        <select
          value={sttProvider}
          onChange={(e) => setSttProvider(e.target.value as 'openai' | 'gemini' | 'whisper-local')}
          className="gooey-input px-2 py-1 text-xs"
        >
          <option value="openai">OpenAI Whisper</option>
          <option value="gemini">Gemini</option>
          <option value="whisper-local">{t('whisper.title')}</option>
        </select>

        <select
          value={stylePreset}
          onChange={(e) => handleStyleChange(e.target.value as StylePreset)}
          className="gooey-input px-2 py-1 text-xs"
        >
          <option value="default">{t('subtitle.defaultStyle')}</option>
          <option value="hbas">{t('subtitle.hbasStyle')}</option>
        </select>

        <button
          type="button"
          onClick={() => void handleGenerateSubtitle()}
          disabled={isProcessing || !scene.narrationAudio}
          className="gooey-btn-primary flex items-center gap-1 px-3 py-1 text-xs"
        >
          {isProcessing ? (
            <RefreshCw size={12} className="animate-spin" />
          ) : (
            <Subtitles size={12} />
          )}
          {isProcessing ? t('subtitle.generating') : t('subtitle.generate')}
        </button>
      </div>

      {error && <div className="gooey-error p-2 text-xs">{error}</div>}

      {/* Preview */}
      {assContent && <SubtitlePreview assContent={assContent} />}

      {/* Word timeline */}
      {words.length > 0 && (
        <div className="gooey-scrollbar border-white/8 max-h-60 overflow-y-auto rounded-xl border">
          <table className="w-full text-xs">
            <thead className="sticky top-0 bg-[#0f0818]/95 backdrop-blur">
              <tr className="text-white/35">
                <th className="px-2 py-1 text-left">#</th>
                <th className="px-2 py-1 text-left">{t('subtitle.word')}</th>
                <th className="px-2 py-1 text-right">{t('subtitle.startMs')}</th>
                <th className="px-2 py-1 text-right">{t('subtitle.endMs')}</th>
              </tr>
            </thead>
            <tbody>
              {words.map((w, i) => (
                <tr
                  key={`${w.scriptIndex}-${i}`}
                  className="border-white/4 hover:bg-white/3 border-t"
                >
                  <td className="px-2 py-1 text-white/25">{i + 1}</td>
                  <td className="px-2 py-1 text-white/70">{w.word}</td>
                  <td className="px-2 py-1 text-right">
                    <input
                      type="number"
                      value={w.startMs}
                      onChange={(e) =>
                        handleWordTimeChange(i, 'startMs', parseInt(e.target.value, 10) || 0)
                      }
                      className="gooey-input w-20 px-1 py-0.5 text-right text-xs"
                    />
                  </td>
                  <td className="px-2 py-1 text-right">
                    <input
                      type="number"
                      value={w.endMs}
                      onChange={(e) =>
                        handleWordTimeChange(i, 'endMs', parseInt(e.target.value, 10) || 0)
                      }
                      className="gooey-input w-20 px-1 py-0.5 text-right text-xs"
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
