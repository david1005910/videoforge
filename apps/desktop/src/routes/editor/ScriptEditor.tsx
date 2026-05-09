import { useState, useEffect, useCallback } from 'react';
import { Volume2, Sparkles } from 'lucide-react';
import { useT } from '../../i18n';
import type { Scene } from '@videoforge/shared';

interface Props {
  scene: Scene | null;
  projectLanguage: string;
  onScriptChange: (sceneId: string, field: 'scriptKo' | 'scriptOriginal', value: string) => void;
  onNotesChange: (sceneId: string, value: string) => void;
}

export function ScriptEditor({
  scene,
  projectLanguage,
  onScriptChange,
  onNotesChange,
}: Props): JSX.Element {
  const t = useT();
  const [scriptKo, setScriptKo] = useState('');
  const [scriptOriginal, setScriptOriginal] = useState('');
  const [notes, setNotes] = useState('');

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

  if (!scene) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <div className="text-center">
          <Sparkles size={32} className="mx-auto mb-3 text-zinc-700" />
          <p className="text-sm text-zinc-500">{t('scene.selectOrAdd')}</p>
          <p className="mt-1 text-xs text-zinc-700">{t('scene.manageHint')}</p>
        </div>
      </div>
    );
  }

  const isKorean = projectLanguage === 'ko';
  const primaryLabel = isKorean ? t('script.koLabel') : t('script.originalLabel');
  const secondaryLabel = isKorean ? t('script.koFromOriginal') : t('script.originalFromKo');

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      {/* 씬 헤더 */}
      <div className="flex items-center gap-3 border-b border-zinc-800 px-6 py-3">
        <h2 className="text-sm font-medium text-zinc-300">
          {t('scene.header')} #{scene.index + 1}
        </h2>
        <div className="flex gap-1">
          {scene.narrationAudio && (
            <span className="flex items-center gap-1 rounded bg-blue-900/30 px-1.5 py-0.5 text-[10px] text-blue-400">
              <Volume2 size={10} /> {t('scene.narration')}
            </span>
          )}
        </div>
        <span className="ml-auto text-xs text-zinc-600">
          {scriptKo.length.toLocaleString()}
          {t('scene.charCount')}
        </span>
      </div>

      {/* 스크립트 편집 영역 */}
      <div className="scrollbar-thin flex-1 overflow-y-auto p-6">
        <div className="mx-auto max-w-2xl space-y-6">
          {/* 주 스크립트 */}
          <div>
            <label
              htmlFor="script-primary"
              className="mb-1.5 block text-xs font-medium text-zinc-500"
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
              className="w-full resize-y rounded-lg border border-zinc-800 bg-zinc-900/50 px-4 py-3 text-sm leading-relaxed text-zinc-200 placeholder-zinc-600 focus:border-zinc-600 focus:outline-none"
              placeholder={t('script.placeholder')}
            />
          </div>

          {/* 보조 스크립트 (번역/원문) */}
          <div>
            <label
              htmlFor="script-secondary"
              className="mb-1.5 block text-xs font-medium text-zinc-500"
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
              className="w-full resize-y rounded-lg border border-zinc-800 bg-zinc-900/50 px-4 py-3 text-sm leading-relaxed text-zinc-200 placeholder-zinc-600 focus:border-zinc-600 focus:outline-none"
              placeholder={t('script.secondaryPlaceholder')}
            />
          </div>

          {/* 노트 */}
          <div>
            <label
              htmlFor="script-notes"
              className="mb-1.5 block text-xs font-medium text-zinc-500"
            >
              {t('script.notes')}
            </label>
            <textarea
              id="script-notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              onBlur={handleNotesBlur}
              rows={3}
              className="w-full resize-y rounded-lg border border-zinc-800 bg-zinc-900/50 px-4 py-3 text-xs leading-relaxed text-zinc-300 placeholder-zinc-700 focus:border-zinc-600 focus:outline-none"
              placeholder={t('script.notesPlaceholder')}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
