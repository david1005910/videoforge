import { useState } from 'react';
import { Download, X } from 'lucide-react';
import { api } from '../../lib/api';
import type { Scene, PipelineStep } from '@videoforge/shared';

/**
 * P4-15: Export dialog — resolution, codec, bitrate selection.
 *
 * If a scene has no finalClip but has an image, auto-compose it first.
 */

interface Props {
  projectTitle: string;
  scenes: Scene[];
  onClose: () => void;
  onScenesUpdated?: (clips: { sceneId: string; clipPath: string }[]) => void;
}

type Codec = 'h264' | 'prores';
interface Res {
  w: number;
  h: number;
  fps: number;
}

const RESOLUTIONS: { label: string; value: Res }[] = [
  { label: '1920x1080 (FHD)', value: { w: 1920, h: 1080, fps: 30 } },
  { label: '1280x720 (HD)', value: { w: 1280, h: 720, fps: 30 } },
  { label: '3840x2160 (4K)', value: { w: 3840, h: 2160, fps: 30 } },
  { label: '1080x1920 (Shorts)', value: { w: 1080, h: 1920, fps: 30 } },
];

const CODECS: { label: string; value: Codec; desc: string }[] = [
  { label: 'H.264', value: 'h264', desc: 'YouTube/SNS recommended' },
  { label: 'ProRes', value: 'prores', desc: 'Editing workflow (large)' },
];

const BITRATES = ['4M', '6M', '8M', '10M', '15M', '20M'];

export function ExportDialog({ projectTitle, scenes, onClose, onScenesUpdated }: Props) {
  const [fileName, setFileName] = useState(
    projectTitle.replace(/[/\\?%*:|"<>]/g, '_') || 'VideoForge_Export',
  );
  const [resolution, setResolution] = useState<Res>(RESOLUTIONS[0]!.value);
  const [codec, setCodec] = useState<Codec>('h264');
  const [bitrate, setBitrate] = useState('8M');
  const [exporting, setExporting] = useState(false);
  const [progress, setProgress] = useState<number | null>(null);
  const [statusMsg, setStatusMsg] = useState('');
  const [error, setError] = useState('');

  // Scenes that already have finalClip
  const readyClips = scenes.filter((s) => s.finalClip?.path);
  // Scenes that need auto-compose (have image but no finalClip)
  const needCompose = scenes.filter((s) => !s.finalClip?.path && s.generatedImages.length > 0);
  const totalExportable = readyClips.length + needCompose.length;

  /** Auto-compose a single scene: image + audio + subtitle → video */
  const composeScene = async (scene: Scene): Promise<string> => {
    const image = scene.generatedImages[0]!;
    const baseName = `export_scene${scene.index + 1}_${Date.now()}`;
    const composePath = `/tmp/${baseName}.mp4`;

    const step: Record<string, unknown> = {
      kind: 'compose',
      image: image.path,
    };

    if (scene.narrationAudio) {
      step.audio = scene.narrationAudio.path;
    } else {
      step.durationMs = 5000;
    }

    if (typeof scene.subtitleAss?.meta?.content === 'string') {
      step.subtitleContent = scene.subtitleAss.meta.content;
    }

    const result = await api.video.edit({
      outputPath: composePath,
      pipeline: [step as PipelineStep],
    });

    return result.outputPath;
  };

  const handleExport = async () => {
    if (totalExportable === 0) {
      setError('내보낼 씬이 없습니다. 이미지 또는 영상을 먼저 추가하세요.');
      return;
    }

    setExporting(true);
    setError('');
    setProgress(0);

    try {
      const folder = await api.dialog.selectFolder('Select export folder');
      if (!folder.folderPath) {
        setExporting(false);
        return;
      }

      const ext = codec === 'prores' ? '.mov' : '.mp4';
      const safeName = fileName.trim().replace(/[/\\?%*:|"<>]/g, '_') || 'VideoForge_Export';
      const outputPath = `${folder.folderPath}/${safeName}${ext}`;

      // Step 1: Auto-compose scenes that don't have finalClip yet
      const composedClips: { sceneId: string; clipPath: string }[] = [];

      if (needCompose.length > 0) {
        setStatusMsg(`이미지 → 영상 변환 중 (0/${needCompose.length})...`);

        for (let i = 0; i < needCompose.length; i++) {
          const scene = needCompose[i]!;
          setStatusMsg(`이미지 → 영상 변환 중 (${i + 1}/${needCompose.length})...`);
          setProgress(Math.round((i / needCompose.length) * 40));

          try {
            const clipPath = await composeScene(scene);
            composedClips.push({ sceneId: scene.id, clipPath });
          } catch (err) {
            setError(
              `씬 ${scene.index + 1} 합성 실패: ${err instanceof Error ? err.message : String(err)}`,
            );
            setExporting(false);
            return;
          }
        }

        // Notify parent to update finalClips
        if (onScenesUpdated && composedClips.length > 0) {
          onScenesUpdated(composedClips);
        }
      }

      setProgress(50);
      setStatusMsg('영상 내보내기 중...');

      // Step 2: Collect all clips in scene order
      const allClips: string[] = [];
      for (const scene of scenes) {
        if (scene.finalClip?.path) {
          allClips.push(scene.finalClip.path);
        } else {
          const composed = composedClips.find((c) => c.sceneId === scene.id);
          if (composed) {
            allClips.push(composed.clipPath);
          }
          // Skip scenes with no image and no clip
        }
      }

      if (allClips.length === 0) {
        setError('내보낼 클립이 없습니다.');
        setExporting(false);
        return;
      }

      const unsub = api.video.onProgress((payload: unknown) => {
        const evt = payload as { percent?: number };
        if (typeof evt.percent === 'number') {
          setProgress(50 + Math.round(evt.percent * 0.5));
        }
      });

      try {
        const pipeline: PipelineStep[] = [];

        if (allClips.length === 1) {
          pipeline.push({
            kind: 'compose',
            video: allClips[0],
          });
        } else {
          pipeline.push({
            kind: 'concat',
            inputs: allClips,
            copyOnly: false,
          });
        }

        await api.video.edit({
          outputPath,
          pipeline,
        });

        setProgress(100);
        setStatusMsg('완료!');
        await api.shell.openExternal(`file://${folder.folderPath}`);
      } finally {
        unsub();
      }
    } catch (err) {
      setError(String(err));
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="gooey-modal-backdrop fixed inset-0 z-50 flex items-center justify-center">
      <div className="gooey-modal w-full max-w-md p-6">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="gooey-text-primary text-lg font-semibold">Export Video</h2>
          <button onClick={onClose} className="gooey-btn-ghost p-1" aria-label="Close">
            <X size={18} />
          </button>
        </div>

        <div className="space-y-4">
          {/* Source info */}
          <div className="text-xs text-white/40">
            {totalExportable > 0 ? (
              <>
                <p>{totalExportable}개 씬 → 1개 영상으로 내보내기</p>
                {needCompose.length > 0 && (
                  <p className="mt-1 text-amber-400/80">
                    {needCompose.length}개 씬은 이미지에서 자동 영상 변환됩니다.
                  </p>
                )}
              </>
            ) : (
              <p>⚠ 내보낼 씬이 없습니다. 이미지 또는 영상을 먼저 추가하세요.</p>
            )}
          </div>

          {/* File Name */}
          <div>
            <label htmlFor="export-filename" className="gooey-text-muted mb-1 block text-xs">
              파일명
            </label>
            <div className="flex items-center gap-2">
              <input
                id="export-filename"
                type="text"
                value={fileName}
                onChange={(e) => setFileName(e.target.value)}
                placeholder="파일명을 입력하세요"
                className="gooey-input flex-1 px-3 py-2 text-sm"
                disabled={exporting}
              />
              <span className="text-xs text-white/30">{codec === 'prores' ? '.mov' : '.mp4'}</span>
            </div>
          </div>

          {/* Resolution */}
          <div>
            <label className="gooey-text-muted mb-1 block text-xs">Resolution</label>
            <select
              value={`${resolution.w}x${resolution.h}`}
              onChange={(e) => {
                const found = RESOLUTIONS.find(
                  (r) => `${r.value.w}x${r.value.h}` === e.target.value,
                );
                if (found) setResolution(found.value);
              }}
              className="gooey-input w-full px-3 py-2 text-sm"
            >
              {RESOLUTIONS.map((r) => (
                <option key={r.label} value={`${r.value.w}x${r.value.h}`}>
                  {r.label}
                </option>
              ))}
            </select>
          </div>

          {/* Codec */}
          <div>
            <label className="gooey-text-muted mb-1 block text-xs">Codec</label>
            <div className="flex gap-2">
              {CODECS.map((c) => (
                <button
                  key={c.value}
                  onClick={() => setCodec(c.value)}
                  className={`flex-1 rounded-2xl border px-3 py-2 text-left transition ${
                    codec === c.value
                      ? 'border-violet-500/40 bg-violet-500/10 shadow-[0_0_12px_rgba(139,92,246,0.15)]'
                      : 'border-white/8 bg-white/4 hover:border-white/15'
                  }`}
                >
                  <p className="text-sm font-medium text-white/85">{c.label}</p>
                  <p className="text-xs text-white/35">{c.desc}</p>
                </button>
              ))}
            </div>
          </div>

          {/* Bitrate */}
          <div>
            <label className="gooey-text-muted mb-1 block text-xs">Bitrate</label>
            <select
              value={bitrate}
              onChange={(e) => setBitrate(e.target.value)}
              className="gooey-input w-full px-3 py-2 text-sm"
            >
              {BITRATES.map((b) => (
                <option key={b} value={b}>
                  {b}bps
                </option>
              ))}
            </select>
          </div>

          {/* Progress */}
          {progress !== null && (
            <div>
              <div className="gooey-progress-track h-2">
                <div className="gooey-progress-fill h-full" style={{ width: `${progress}%` }} />
              </div>
              <p className="gooey-text-muted mt-1 text-center text-xs">
                {statusMsg || `${progress}%`}
              </p>
            </div>
          )}

          {error && <p className="text-sm text-red-400">{error}</p>}

          {/* Actions */}
          <div className="flex justify-end gap-2 pt-2">
            <button
              onClick={onClose}
              disabled={exporting}
              className="gooey-btn-ghost px-4 py-2 text-sm"
            >
              Cancel
            </button>
            <button
              onClick={handleExport}
              disabled={exporting || totalExportable === 0}
              className="gooey-btn-primary flex items-center gap-2 px-4 py-2 text-sm"
            >
              <Download size={14} />
              {exporting ? 'Exporting…' : 'Export'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
