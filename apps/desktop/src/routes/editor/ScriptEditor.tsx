import { useState, useEffect, useCallback } from 'react';
import { Volume2, Sparkles, Mic } from 'lucide-react';
import { useT } from '../../i18n';
import { api } from '../../lib/api';
import type { Scene } from '@videoforge/shared';

interface Props {
  scene: Scene | null;
  projectLanguage: string;
  onScriptChange: (sceneId: string, field: 'scriptKo' | 'scriptOriginal', value: string) => void;
  onNotesChange: (sceneId: string, value: string) => void;
  onLoadNarration?: (sceneId: string, filePath: string) => void;
}

export function ScriptEditor({
  scene,
  projectLanguage,
  onScriptChange,
  onNotesChange,
  onLoadNarration,
}: Props): JSX.Element {
  const t = useT();
  const [scriptKo, setScriptKo] = useState('');
  const [scriptOriginal, setScriptOriginal] = useState('');
  const [notes, setNotes] = useState('');
  const [ttsGenerating, setTtsGenerating] = useState(false);

  useEffect(() => {
    setScriptKo(scene?.scriptKo ?? '');
    setScriptOriginal(scene?.scriptOriginal ?? '');
    setNotes(scene?.notes ?? '');
  }, [scene?.id, scene?.scriptKo, scene?.scriptOriginal, scene?.notes]);

  const handleScriptKoBlur = useCallback(() => {
    if (scene) onScriptChange(scene.id, 'scriptKo', scriptKo);
  }, [scene, scriptKo, onScriptChange]);

  const handleScriptOriginalBlur = useCallback(() => {
    if (scene) onScriptChange(scene.id, 'scriptOriginal', scriptOriginal);
  }, [scene, scriptOriginal, onScriptChange]);

  const handleNotesBlur = useCallback(() => {
    if (scene) onNotesChange(scene.id, notes);
  }, [scene, notes, onNotesChange]);

  const handleGenerateTts = useCallback(async () => {
    if (!scene) return;
    const text = (projectLanguage === 'ko' ? scriptKo : scriptOriginal).trim();
    if (!text) return;
    setTtsGenerating(true);
    try {
      const voice = projectLanguage === 'ko' ? 'ko-KR-SunHiNeural' : 'en-US-AriaNeural';
      const result = await api.tts.edge({ text, voice, speed: 1, pitch: 0 });
      onLoadNarration?.(scene.id, result.audioPath);
    } catch (err) {
      console.error('TTS generation failed:', err);
    } finally {
      setTtsGenerating(false);
    }
  }, [scene, projectLanguage, scriptKo, scriptOriginal, onLoadNarration]);

  if (!scene) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <div className="text-center">
          <Sparkles size={32} className="mx-auto mb-3 text-white/15" />
          <p className="gooey-text-secondary text-sm">{t('scene.selectOrAdd')}</p>
          <p className="gooey-text-muted mt-1 text-xs">{t('scene.manageHint')}</p>
        </div>
      </div>
    );
  }

  const isKorean = projectLanguage === 'ko';
  const primaryLabel = isKorean ? t('script.koLabel') : t('script.originalLabel');
  const secondaryLabel = isKorean ? t('script.koFromOriginal') : t('script.originalFromKo');

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      {/* Scene header */}
      <div className="gooey-header flex items-center gap-3 px-6 py-3">
        <h2 className="text-sm font-medium text-white/75">
          {t('scene.header')} #{scene.index + 1}
        </h2>
        <div className="flex gap-1">
          {scene.narrationAudio && (
            <span className="gooey-badge flex items-center gap-1 px-1.5 py-0.5 text-[10px] text-blue-400">
              <Volume2 size={10} /> {t('scene.narration')}
            </span>
          )}
          <button
            type="button"
            onClick={() => void handleGenerateTts()}
            disabled={ttsGenerating || !(scriptKo.trim() || scriptOriginal.trim())}
            className="flex items-center gap-1 rounded-xl bg-violet-500/15 px-1.5 py-0.5 text-[10px] text-violet-300 transition hover:bg-violet-500/25 disabled:opacity-40"
          >
            <Mic size={10} />
            {ttsGenerating ? t('tts.generating') : t('tts.generate')}
          </button>
        </div>
        <span className="ml-auto text-xs text-white/25">
          {scriptKo.length.toLocaleString()}
          {t('scene.charCount')}
        </span>
      </div>

      {/* Script editing area */}
      <div className="gooey-scrollbar flex-1 overflow-y-auto p-6">
        <div className="mx-auto max-w-2xl space-y-6">
          {/* Primary script */}
          <div>
            <label
              htmlFor="script-primary"
              className="gooey-text-secondary mb-1.5 block text-xs font-medium"
            >
              {primaryLabel}
            </label>
            <textarea
              id="script-primary"
              value={isKorean ? scriptKo : scriptOriginal}
              onChange={(e) =>
                isKorean ? setScriptKo(e.target.value) : setScriptOriginal(e.target.value)
              }
              onBlur={isKorean ? handleScriptKoBlur : handleScriptOriginalBlur}
              rows={8}
              className="gooey-input w-full resize-y px-4 py-3 text-sm leading-relaxed"
              placeholder={t('script.placeholder')}
            />
          </div>

          {/* Secondary script */}
          <div>
            <label
              htmlFor="script-secondary"
              className="gooey-text-secondary mb-1.5 block text-xs font-medium"
            >
              {secondaryLabel}
            </label>
            <textarea
              id="script-secondary"
              value={isKorean ? scriptOriginal : scriptKo}
              onChange={(e) =>
                isKorean ? setScriptOriginal(e.target.value) : setScriptKo(e.target.value)
              }
              onBlur={isKorean ? handleScriptOriginalBlur : handleScriptKoBlur}
              rows={4}
              className="gooey-input w-full resize-y px-4 py-3 text-sm leading-relaxed"
              placeholder={t('script.secondaryPlaceholder')}
            />
          </div>

          {/* Notes */}
          <div>
            <label
              htmlFor="script-notes"
              className="gooey-text-secondary mb-1.5 block text-xs font-medium"
            >
              {t('script.notes')}
            </label>
            <textarea
              id="script-notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              onBlur={handleNotesBlur}
              rows={3}
              className="gooey-input w-full resize-y px-4 py-3 text-xs leading-relaxed"
              placeholder={t('script.notesPlaceholder')}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
