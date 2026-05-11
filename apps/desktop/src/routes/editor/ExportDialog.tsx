import { useState } from 'react';
import { Download, X } from 'lucide-react';
import { api } from '../../lib/api';

/**
 * P4-15: Export dialog — resolution, codec, bitrate selection.
 */

interface Props {
  projectTitle: string;
  onClose: () => void;
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

export function ExportDialog({ projectTitle, onClose }: Props) {
  const [resolution, setResolution] = useState<Res>(RESOLUTIONS[0]!.value);
  const [codec, setCodec] = useState<Codec>('h264');
  const [bitrate, setBitrate] = useState('8M');
  const [exporting, setExporting] = useState(false);
  const [progress, setProgress] = useState<number | null>(null);
  const [error, setError] = useState('');

  const handleExport = async () => {
    setExporting(true);
    setError('');
    setProgress(0);

    try {
      const folder = await api.dialog.selectFolder('Select export folder');
      if (!folder.folderPath) {
        setExporting(false);
        return;
      }

      const outputPath = `${folder.folderPath}/${projectTitle.replace(/[/\\?%*:|"<>]/g, '_')}.mp4`;

      const unsub = api.video.onProgress((payload: unknown) => {
        const evt = payload as { percent?: number };
        if (typeof evt.percent === 'number') {
          setProgress(evt.percent);
        }
      });

      try {
        await api.video.edit({
          outputPath,
          pipeline: [
            {
              kind: 'export' as const,
              resolution,
              codec,
              bitrate,
              audioCodec: 'aac' as const,
              audioBitrate: '192k',
            },
          ],
        });
        setProgress(100);
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
              <p className="gooey-text-muted mt-1 text-center text-xs">{progress}%</p>
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
              disabled={exporting}
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
