import { useState, useEffect, useRef } from 'react';
import { Play, Pause, FolderOpen, Save, Download, RefreshCw } from 'lucide-react';
import { api } from '../../lib/api';
import { useT } from '../../i18n';

interface Props {
  clipPath: string;
  onRecompose: () => void;
  recomposing: boolean;
}

export function FinalClipPreview({ clipPath, onRecompose, recomposing }: Props) {
  const t = useT();
  const videoRef = useRef<HTMLVideoElement>(null);
  const [blobUrl, setBlobUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      try {
        const { base64Data, mimeType } = await api.file.readBase64(clipPath);
        const binary = atob(base64Data);
        const bytes = new Uint8Array(binary.length);
        for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
        const blob = new Blob([bytes], { type: mimeType || 'video/mp4' });
        if (!cancelled) setBlobUrl(URL.createObjectURL(blob));
      } catch {
        /* skip */
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    void load();
    return () => {
      cancelled = true;
      setBlobUrl((prev) => {
        if (prev) URL.revokeObjectURL(prev);
        return null;
      });
    };
  }, [clipPath]);

  const togglePlay = () => {
    const v = videoRef.current;
    if (!v) return;
    if (v.paused) {
      void v.play();
      setPlaying(true);
    } else {
      v.pause();
      setPlaying(false);
    }
  };

  const handleReveal = () => {
    const folder = clipPath.replace(/[^/]+$/, '');
    void api.shell.openExternal(`file://${folder}`);
  };

  const handleSaveAs = async () => {
    try {
      const result = await api.video.saveTo(clipPath);
      if (result.savedPath) {
        setSaved(true);
        setTimeout(() => setSaved(false), 2000);
      }
    } catch {
      /* user cancelled or error */
    }
  };

  const formatTime = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = Math.floor(s % 60);
    return `${m}:${sec.toString().padStart(2, '0')}`;
  };

  const fileName = clipPath.split('/').pop() ?? '';

  return (
    <div className="space-y-1.5">
      {loading && <p className="text-[10px] text-[#9B5BFF]/30">{t('common.loading')}...</p>}
      {blobUrl && (
        <div className="overflow-hidden rounded-lg border border-[#9B5BFF]/15 bg-black">
          <video
            ref={videoRef}
            src={blobUrl}
            className="w-full cursor-pointer"
            onClick={togglePlay}
            onLoadedMetadata={(e) => setDuration(e.currentTarget.duration)}
            onTimeUpdate={(e) => setCurrentTime(e.currentTarget.currentTime)}
            onEnded={() => setPlaying(false)}
            onPause={() => setPlaying(false)}
            onPlay={() => setPlaying(true)}
          />
          <div className="px-2 py-1">
            <div
              className="bg-[#9B5BFF]/12 h-1 w-full cursor-pointer rounded-full"
              onClick={(e) => {
                const v = videoRef.current;
                if (!v || !duration) return;
                const rect = e.currentTarget.getBoundingClientRect();
                const ratio = (e.clientX - rect.left) / rect.width;
                v.currentTime = ratio * duration;
              }}
            >
              <div
                className="h-full rounded-full bg-[#FF4FBE] transition-[width]"
                style={{ width: `${duration ? (currentTime / duration) * 100 : 0}%` }}
              />
            </div>
            <div className="mt-0.5 flex items-center justify-between text-[9px] text-[#9B5BFF]/35">
              <span>{formatTime(currentTime)}</span>
              <span>{formatTime(duration)}</span>
            </div>
          </div>
        </div>
      )}
      <p className="truncate text-[9px] text-[#9B5BFF]/30" title={clipPath}>
        {fileName}
      </p>
      <div className="flex gap-1">
        {blobUrl && (
          <button
            type="button"
            onClick={togglePlay}
            className="gooey-btn-secondary flex flex-1 items-center justify-center gap-1 px-2 py-1 text-[10px]"
          >
            {playing ? <Pause size={10} /> : <Play size={10} />}
            {playing ? t('inspector.clipPause') : t('inspector.clipPlay')}
          </button>
        )}
        <button
          type="button"
          onClick={handleReveal}
          className="gooey-btn-secondary flex flex-1 items-center justify-center gap-1 px-2 py-1 text-[10px]"
          title={clipPath}
        >
          <FolderOpen size={10} />
          {t('inspector.clipReveal')}
        </button>
      </div>
      <div className="flex gap-1">
        <button
          type="button"
          onClick={() => void handleSaveAs()}
          className="gooey-btn-secondary flex flex-1 items-center justify-center gap-1 px-2 py-1 text-[10px]"
        >
          {saved ? <Download size={10} /> : <Save size={10} />}
          {saved ? t('inspector.clipSaved') : t('inspector.clipSaveAs')}
        </button>
        <button
          type="button"
          onClick={onRecompose}
          disabled={recomposing}
          className="gooey-btn-secondary flex flex-1 items-center justify-center gap-1 px-2 py-1 text-[10px]"
        >
          <RefreshCw size={10} className={recomposing ? 'animate-spin' : ''} />
          {t('inspector.clipRecompose')}
        </button>
      </div>
    </div>
  );
}
