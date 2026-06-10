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
    <div className="gooey-sidebar border-[#9B5BFF]/12 flex h-full w-60 flex-col border-r">
      {/* Header */}
      <div className="border-[#9B5BFF]/12 flex items-center justify-between border-b px-3 py-2">
        <span className="text-xs font-semibold uppercase tracking-wider text-[#9B5BFF]/40">
          {t('scene.scenes')} ({scenes.length})
        </span>
        <button
          type="button"
          onClick={onAdd}
          className="gooey-btn-ghost rounded-lg p-1"
          title={t('scene.add')}
        >
          <Plus size={14} />
        </button>
      </div>

      {/* Scene list */}
      <div className="gooey-scrollbar flex-1 overflow-y-auto">
        {scenes.length === 0 ? (
          <div className="px-3 py-8 text-center text-xs text-[#9B5BFF]/30">
            {t('scene.empty')}
            <br />
            <button type="button" onClick={onAdd} className="mt-2 text-[#9B5BFF] hover:underline">
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
              className={`group flex w-full items-start gap-2 border-b border-[#9B5BFF]/10 px-3 py-2.5 text-left transition ${
                selectedId === scene.id
                  ? 'bg-[#FF4FBE]/12 border-l-2 border-l-violet-500'
                  : dropIdx === idx
                    ? 'border-emerald-500/30 bg-emerald-500/5'
                    : 'hover:bg-[#9B5BFF]/8'
              } ${dragIdx === idx ? 'opacity-40' : ''}`}
            >
              <GripVertical size={12} className="mt-1 shrink-0 cursor-grab text-[#9B5BFF]/25" />
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1">
                  <span className="text-xs font-medium text-[#9B5BFF]/55">#{scene.index + 1}</span>
                  {estimateDuration(scene) && (
                    <span className="flex items-center gap-0.5 text-[10px] text-[#9B5BFF]/30">
                      <Clock size={8} />
                      {estimateDuration(scene)}
                    </span>
                  )}
                  <div className="flex gap-0.5">
                    {scene.generatedImages.length > 0 && (
                      <Image size={10} className="text-[#00F0FF]/70" />
                    )}
                    {scene.narrationAudio && <Volume2 size={10} className="text-blue-400/70" />}
                    {scene.subtitleAss && <Subtitles size={10} className="text-[#FF7AD9]/70" />}
                  </div>
                </div>
                <p className="mt-0.5 truncate text-xs text-[#9B5BFF]/40">
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
                  className="rounded-lg p-0.5 text-[#9B5BFF]/25 hover:text-[#f0e8ff]/75"
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
                  className="rounded-lg p-0.5 text-[#9B5BFF]/25 hover:text-[#FF6A3D]"
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
