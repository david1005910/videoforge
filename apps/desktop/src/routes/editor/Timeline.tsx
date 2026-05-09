import { useState, useRef, useCallback } from 'react';
import { ZoomIn, ZoomOut } from 'lucide-react';
import type { Scene } from '@videoforge/shared';

/**
 * P4-13: Timeline UI — visual timeline with ruler, zoom, and drag-to-reorder.
 */

interface Props {
  scenes: Scene[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  onReorder: (fromIdx: number, toIdx: number) => void;
}

const MIN_ZOOM = 0.5;
const MAX_ZOOM = 3;
const SCENE_BASE_WIDTH = 120;

export function Timeline({ scenes, selectedId, onSelect, onReorder }: Props) {
  const [zoom, setZoom] = useState(1);
  const [dragIdx, setDragIdx] = useState<number | null>(null);
  const [dropIdx, setDropIdx] = useState<number | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  const sceneWidth = SCENE_BASE_WIDTH * zoom;

  const handleZoomIn = () => setZoom((z) => Math.min(z + 0.25, MAX_ZOOM));
  const handleZoomOut = () => setZoom((z) => Math.max(z - 0.25, MIN_ZOOM));

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

  // Calculate total duration estimate (6s per scene if unknown)
  const totalDurationSec = scenes.length * 6;

  return (
    <div className="flex flex-col border-t border-zinc-800 bg-zinc-950">
      {/* Toolbar */}
      <div className="flex items-center gap-2 border-b border-zinc-800 px-3 py-1">
        <span className="text-xs font-semibold uppercase tracking-wider text-zinc-600">
          Timeline
        </span>
        <div className="flex-1" />
        <span className="text-[10px] text-zinc-600">
          {totalDurationSec}s ({scenes.length} scenes)
        </span>
        <button
          onClick={handleZoomOut}
          disabled={zoom <= MIN_ZOOM}
          className="rounded p-0.5 text-zinc-500 hover:bg-zinc-800 hover:text-zinc-300 disabled:opacity-30"
          aria-label="Zoom out"
        >
          <ZoomOut size={14} />
        </button>
        <span className="w-8 text-center text-[10px] text-zinc-500">{Math.round(zoom * 100)}%</span>
        <button
          onClick={handleZoomIn}
          disabled={zoom >= MAX_ZOOM}
          className="rounded p-0.5 text-zinc-500 hover:bg-zinc-800 hover:text-zinc-300 disabled:opacity-30"
          aria-label="Zoom in"
        >
          <ZoomIn size={14} />
        </button>
      </div>

      {/* Ruler */}
      <div className="relative h-5 border-b border-zinc-800/50 bg-zinc-900/50" ref={scrollRef}>
        <div className="flex h-full" style={{ width: `${scenes.length * sceneWidth}px` }}>
          {scenes.map((_, i) => (
            <div
              key={i}
              className="relative border-r border-zinc-800/30"
              style={{ width: `${sceneWidth}px` }}
            >
              <span className="absolute left-1 top-0.5 text-[9px] text-zinc-700">
                {(i * 6).toFixed(0)}s
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Scene blocks */}
      <div className="scrollbar-thin overflow-x-auto overflow-y-hidden p-2">
        <div className="flex gap-1" style={{ minWidth: `${scenes.length * sceneWidth}px` }}>
          {scenes.map((scene, idx) => (
            <div
              key={scene.id}
              draggable
              onDragStart={() => handleDragStart(idx)}
              onDragOver={(e) => handleDragOver(e, idx)}
              onDrop={() => handleDrop(idx)}
              onDragEnd={handleDragEnd}
              onClick={() => onSelect(scene.id)}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') onSelect(scene.id);
              }}
              className={`flex shrink-0 cursor-pointer flex-col rounded-md border px-2 py-1.5 transition ${
                selectedId === scene.id
                  ? 'border-violet-500 bg-violet-500/10'
                  : dropIdx === idx
                    ? 'border-emerald-500 bg-emerald-500/5'
                    : 'border-zinc-800 bg-zinc-900 hover:border-zinc-700'
              } ${dragIdx === idx ? 'opacity-40' : ''}`}
              style={{ width: `${sceneWidth - 4}px`, minHeight: '48px' }}
            >
              <span className="text-[10px] font-medium text-zinc-500">#{idx + 1}</span>
              <p className="mt-0.5 truncate text-[10px] text-zinc-400">
                {scene.scriptKo ?? scene.scriptOriginal ?? '—'}
              </p>
              {/* Asset indicators */}
              <div className="mt-auto flex gap-1 pt-1">
                {scene.generatedImages.length > 0 && (
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" title="Images" />
                )}
                {scene.narrationAudio && (
                  <span className="h-1.5 w-1.5 rounded-full bg-blue-500" title="Audio" />
                )}
                {scene.subtitleAss && (
                  <span className="h-1.5 w-1.5 rounded-full bg-amber-500" title="Subtitles" />
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
