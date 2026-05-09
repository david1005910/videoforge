import { useState, useEffect, useCallback } from 'react';
import { Volume2, Sparkles } from 'lucide-react';
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
  const [scriptKo, setScriptKo] = useState('');
  const [scriptOriginal, setScriptOriginal] = useState('');
  const [notes, setNotes] = useState('');

  // 씬 전환 시 로컬 상태 동기화
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
          <p className="text-sm text-zinc-500">씬을 선택하거나 추가하세요</p>
          <p className="mt-1 text-xs text-zinc-700">좌측 패널에서 씬을 관리할 수 있습니다</p>
        </div>
      </div>
    );
  }

  const isKorean = projectLanguage === 'ko';
  const primaryLabel = isKorean ? '스크립트 (한국어)' : '스크립트 (원문)';
  const secondaryLabel = isKorean ? '스크립트 (원문/번역)' : '스크립트 (한국어)';

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      {/* 씬 헤더 */}
      <div className="flex items-center gap-3 border-b border-zinc-800 px-6 py-3">
        <h2 className="text-sm font-medium text-zinc-300">씬 #{scene.index + 1}</h2>
        <div className="flex gap-1">
          {scene.narrationAudio && (
            <span className="flex items-center gap-1 rounded bg-blue-900/30 px-1.5 py-0.5 text-[10px] text-blue-400">
              <Volume2 size={10} /> 나레이션
            </span>
          )}
        </div>
        <span className="ml-auto text-xs text-zinc-600">{scriptKo.length.toLocaleString()}자</span>
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
              placeholder="나레이션 스크립트를 입력하세요..."
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
              placeholder="번역 또는 원문..."
            />
          </div>

          {/* 노트 */}
          <div>
            <label
              htmlFor="script-notes"
              className="mb-1.5 block text-xs font-medium text-zinc-500"
            >
              노트
            </label>
            <textarea
              id="script-notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              onBlur={handleNotesBlur}
              rows={3}
              className="w-full resize-y rounded-lg border border-zinc-800 bg-zinc-900/50 px-4 py-3 text-xs leading-relaxed text-zinc-300 placeholder-zinc-700 focus:border-zinc-600 focus:outline-none"
              placeholder="연출 메모, 참고사항..."
            />
          </div>
        </div>
      </div>
    </div>
  );
}
