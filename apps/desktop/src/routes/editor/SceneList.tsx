import { useState, useCallback } from 'react';
import { Plus, Trash2, Copy, GripVertical, Image, Volume2, Subtitles, Clock } from 'lucide-react';
import { useT } from '../../i18n';
import type { Scene } from '@videoforge/shared';

/** Estimate scene duration from script length (~150 chars/min for Korean, ~180 for English) */
function estimateDuration(scene: Scene): string | null {
  const text = scene.scriptKo ?? scene.scriptOriginal;
  if (!text || text.length === 0) return null;
  const seconds = Math.max(1, Math.round((text.length / 150) * 60));
  if (seconds < 60) return `${seconds}s`;
  const min = Math.floor(seconds / 60);
  const sec = seconds % 60;
  return sec > 0 ? `${min}m${sec}s` : `${min}m`;
}

interface Props {
  scenes: Scene[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  onAdd: () => void;
  onDelete: (id: string) => void;
  onDuplicate: (id: string) => void;
  onReorder: (fromIdx: number, toIdx: number) => void;
}

export function SceneList({
  scenes,
  selectedId,
  onSelect,
  onAdd,
  onDelete,
  onDuplicate,
  onReorder,
}: Props): JSX.Element {
  const t = useT();
  const [dragIdx, setDragIdx] = useState<number | null>(null);
  const [dropIdx, setDropIdx] = useState<number | null>(null);

  const handleDragStart = useCallback((idx: number) => {
    setDragIdx(idx);
  }, []);

  const handleDragOver = useCallback(
    (e: React.DragEvent, idx: number) => {
      e.preventDefault();
      if (dragIdx !== null && idx !== dragIdx) {
        setDropIdx(idx);
      }
    },
    [dragIdx],
  );

  const handleDrop = useCallback(
    (idx: number) => {
      if (dragIdx !== null && dragIdx !== idx) {
        onReorder(dragIdx, idx);
      }
      setDragIdx(null);
      setDropIdx(null);
    },
    [dragIdx, onReorder],
  );

  const handleDragEnd = useCallback(() => {
    setDragIdx(null);
    setDropIdx(null);
  }, []);

  return (
    <div className="flex h-full w-60 flex-col border-r border-zinc-800 bg-zinc-950">
      {/* 헤더 */}
      <div className="flex items-center justify-between border-b border-zinc-800 px-3 py-2">
        <span className="text-xs font-semibold uppercase tracking-wider text-zinc-500">
          {t('scene.scenes')} ({scenes.length})
        </span>
        <button
          type="button"
          onClick={onAdd}
          className="rounded-md p-1 text-zinc-500 transition hover:bg-zinc-800 hover:text-zinc-300"
          title={t('scene.add')}
        >
          <Plus size={14} />
        </button>
      </div>

      {/* 씬 목록 */}
      <div className="scrollbar-thin flex-1 overflow-y-auto">
        {scenes.length === 0 ? (
          <div className="px-3 py-8 text-center text-xs text-zinc-600">
            {t('scene.empty')}
            <br />
            <button type="button" onClick={onAdd} className="text-accent mt-2 hover:underline">
              {t('scene.addFirst')}
            </button>
          </div>
        ) : (
          scenes.map((scene, idx) => (
            <button
              key={scene.id}
              type="button"
              draggable
              onDragStart={() => handleDragStart(idx)}
              onDragOver={(e) => handleDragOver(e, idx)}
              onDrop={() => handleDrop(idx)}
              onDragEnd={handleDragEnd}
              onClick={() => onSelect(scene.id)}
              className={`group flex w-full items-start gap-2 border-b border-zinc-800/50 px-3 py-2.5 text-left transition ${
                selectedId === scene.id
                  ? 'bg-zinc-800/80'
                  : dropIdx === idx
                    ? 'border-emerald-500 bg-emerald-500/5'
                    : 'hover:bg-zinc-900'
              } ${dragIdx === idx ? 'opacity-40' : ''}`}
            >
              <GripVertical size={12} className="mt-1 shrink-0 cursor-grab text-zinc-700" />
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1">
                  <span className="text-xs font-medium text-zinc-400">#{scene.index + 1}</span>
                  {estimateDuration(scene) && (
                    <span className="flex items-center gap-0.5 text-[10px] text-zinc-600">
                      <Clock size={8} />
                      {estimateDuration(scene)}
                    </span>
                  )}
                  <div className="flex gap-0.5">
                    {scene.generatedImages.length > 0 && (
                      <Image size={10} className="text-emerald-600" />
                    )}
                    {scene.narrationAudio && <Volume2 size={10} className="text-blue-600" />}
                    {scene.subtitleAss && <Subtitles size={10} className="text-amber-600" />}
                  </div>
                </div>
                <p className="mt-0.5 truncate text-xs text-zinc-500">
                  {scene.scriptKo ?? scene.scriptOriginal ?? t('scene.noScript')}
                </p>
              </div>
              <div className="flex shrink-0 gap-0.5 opacity-0 transition group-hover:opacity-100">
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onDuplicate(scene.id);
                  }}
                  className="rounded p-0.5 text-zinc-700 hover:text-zinc-300"
                  title={t('scene.duplicate')}
                >
                  <Copy size={12} />
                </button>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onDelete(scene.id);
                  }}
                  className="rounded p-0.5 text-zinc-700 hover:text-red-400"
                  title={t('scene.delete')}
                >
                  <Trash2 size={12} />
                </button>
              </div>
            </button>
          ))
        )}
      </div>
    </div>
  );
}
