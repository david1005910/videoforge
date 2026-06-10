import { useState, useRef, useCallback, useMemo } from 'react';
import { ZoomIn, ZoomOut } from 'lucide-react';
import type { Scene } from '@videoforge/shared';

/** Estimate scene duration in seconds from script length */
function estimateSceneSec(scene: Scene): number {
  const text = scene.scriptKo ?? scene.scriptOriginal;
  if (!text || text.length === 0) return 6;
  return Math.max(1, Math.round((text.length / 150) * 60));
}

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

  const sceneDurations = useMemo(() => scenes.map(estimateSceneSec), [scenes]);
  const totalDurationSec = useMemo(
    () => sceneDurations.reduce((sum, d) => sum + d, 0),
    [sceneDurations],
  );

  return (
    <div className="gooey-timeline flex flex-col">
      {/* Toolbar */}
      <div className="flex items-center gap-2 border-b border-[#9B5BFF]/10 px-3 py-1">
        <span className="text-xs font-semibold uppercase tracking-wider text-[#9B5BFF]/25">
          Timeline
        </span>
        <div className="flex-1" />
        <span className="text-[10px] text-[#9B5BFF]/30">
          {Math.floor(totalDurationSec / 60)}:{String(totalDurationSec % 60).padStart(2, '0')} (
          {scenes.length} scenes)
        </span>
        <button
          onClick={handleZoomOut}
          disabled={zoom <= MIN_ZOOM}
          className="gooey-btn-ghost rounded-lg p-0.5 disabled:opacity-30"
          aria-label="Zoom out"
        >
          <ZoomOut size={14} />
        </button>
        <span className="w-8 text-center text-[10px] text-[#9B5BFF]/35">
          {Math.round(zoom * 100)}%
        </span>
        <button
          onClick={handleZoomIn}
          disabled={zoom >= MAX_ZOOM}
          className="gooey-btn-ghost rounded-lg p-0.5 disabled:opacity-30"
          aria-label="Zoom in"
        >
          <ZoomIn size={14} />
        </button>
      </div>

      {/* Ruler */}
      <div className="bg-[#9B5BFF]/8 relative h-5 border-b border-[#9B5BFF]/10" ref={scrollRef}>
        <div className="flex h-full" style={{ width: `${scenes.length * sceneWidth}px` }}>
          {scenes.map((_, i) => {
            const cumSec = sceneDurations.slice(0, i).reduce((s, d) => s + d, 0);
            return (
              <div
                key={i}
                className="relative border-r border-[#9B5BFF]/10"
                style={{ width: `${sceneWidth}px` }}
              >
                <span className="absolute left-1 top-0.5 text-[9px] text-[#9B5BFF]/25">
                  {cumSec}s
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Scene blocks */}
      <div className="gooey-scrollbar overflow-x-auto overflow-y-hidden p-2">
        {scenes.length === 0 ? (
          <p className="py-2 text-center text-[10px] text-[#9B5BFF]/25">
            No scenes — add a scene to get started.
          </p>
        ) : (
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
                className={`flex shrink-0 cursor-pointer flex-col rounded-xl border px-2 py-1.5 transition ${
                  selectedId === scene.id
                    ? 'bg-[#FF4FBE]/12 border-[#FF4FBE]/40 shadow-[0_0_12px_rgba(139,92,246,0.15)]'
                    : dropIdx === idx
                      ? 'border-emerald-500/30 bg-emerald-500/5'
                      : 'border-[#9B5BFF]/12 bg-[#9B5BFF]/8 hover:border-[#9B5BFF]/20'
                } ${dragIdx === idx ? 'opacity-40' : ''}`}
                style={{ width: `${sceneWidth - 4}px`, minHeight: '48px' }}
              >
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-medium text-[#9B5BFF]/40">#{idx + 1}</span>
                  <span className="text-[9px] text-[#9B5BFF]/25">{sceneDurations[idx]}s</span>
                </div>
                <p className="mt-0.5 truncate text-[10px] text-[#9B5BFF]/45">
                  {scene.scriptKo ?? scene.scriptOriginal ?? '—'}
                </p>
                {/* Asset indicators */}
                <div className="mt-auto flex gap-1 pt-1">
                  {scene.generatedImages.length > 0 && (
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-500/70" title="Images" />
                  )}
                  {scene.narrationAudio && (
                    <span className="h-1.5 w-1.5 rounded-full bg-blue-400/70" title="Audio" />
                  )}
                  {scene.subtitleAss && (
                    <span className="h-1.5 w-1.5 rounded-full bg-amber-400/70" title="Subtitles" />
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
