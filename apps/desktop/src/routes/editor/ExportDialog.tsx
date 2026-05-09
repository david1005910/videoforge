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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
      <div className="w-full max-w-md rounded-xl border border-zinc-800 bg-zinc-900 p-6 shadow-2xl">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-zinc-100">Export Video</h2>
          <button
            onClick={onClose}
            className="rounded-md p-1 text-zinc-500 hover:bg-zinc-800 hover:text-zinc-300"
            aria-label="Close"
          >
            <X size={18} />
          </button>
        </div>

        <div className="space-y-4">
          {/* Resolution */}
          <div>
            <label className="mb-1 block text-xs text-zinc-500">Resolution</label>
            <select
              value={`${resolution.w}x${resolution.h}`}
              onChange={(e) => {
                const found = RESOLUTIONS.find(
                  (r) => `${r.value.w}x${r.value.h}` === e.target.value,
                );
                if (found) setResolution(found.value);
              }}
              className="w-full rounded-md border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-zinc-200"
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
            <label className="mb-1 block text-xs text-zinc-500">Codec</label>
            <div className="flex gap-2">
              {CODECS.map((c) => (
                <button
                  key={c.value}
                  onClick={() => setCodec(c.value)}
                  className={`flex-1 rounded-lg border px-3 py-2 text-left ${
                    codec === c.value
                      ? 'border-violet-500 bg-violet-500/10'
                      : 'border-zinc-700 bg-zinc-800 hover:border-zinc-600'
                  }`}
                >
                  <p className="text-sm font-medium text-zinc-200">{c.label}</p>
                  <p className="text-xs text-zinc-500">{c.desc}</p>
                </button>
              ))}
            </div>
          </div>

          {/* Bitrate */}
          <div>
            <label className="mb-1 block text-xs text-zinc-500">Bitrate</label>
            <select
              value={bitrate}
              onChange={(e) => setBitrate(e.target.value)}
              className="w-full rounded-md border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-zinc-200"
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
              <div className="h-2 overflow-hidden rounded-full bg-zinc-800">
                <div
                  className="h-full rounded-full bg-violet-500 transition-all"
                  style={{ width: `${progress}%` }}
                />
              </div>
              <p className="mt-1 text-center text-xs text-zinc-500">{progress}%</p>
            </div>
          )}

          {error && <p className="text-sm text-red-400">{error}</p>}

          {/* Actions */}
          <div className="flex justify-end gap-2 pt-2">
            <button
              onClick={onClose}
              disabled={exporting}
              className="rounded-md px-4 py-2 text-sm text-zinc-400 hover:text-zinc-200 disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              onClick={handleExport}
              disabled={exporting}
              className="flex items-center gap-2 rounded-md bg-violet-600 px-4 py-2 text-sm font-medium text-white hover:bg-violet-500 disabled:opacity-50"
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
