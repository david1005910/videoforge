import { useState, useEffect, useRef } from 'react';
import { Image, Volume2, Subtitles, Film, FileText, Play, Square, Upload } from 'lucide-react';
import { useT } from '../../i18n';
import { api } from '../../lib/api';
import { Waveform } from '../../components/Waveform';
import type { Scene } from '@videoforge/shared';

interface Props {
  scene: Scene | null;
  onLoadNarration?: (sceneId: string, filePath: string) => void;
}

function AssetBadge({
  label,
  icon: Icon,
  hasAsset,
  count,
}: {
  label: string;
  icon: typeof Image;
  hasAsset: boolean;
  count?: number;
}) {
  return (
    <div
      className={`flex items-center gap-2 rounded-lg border px-3 py-2 ${
        hasAsset ? 'border-zinc-700 bg-zinc-800/50' : 'border-zinc-800/50 bg-zinc-950'
      }`}
    >
      <Icon size={14} className={hasAsset ? 'text-emerald-500' : 'text-zinc-700'} />
      <span className="text-xs text-zinc-400">{label}</span>
      {count !== undefined && count > 0 && (
        <span className="ml-auto font-mono text-xs text-zinc-500">{count}</span>
      )}
      {hasAsset && count === undefined && (
        <span className="ml-auto text-xs text-emerald-600">&#10003;</span>
      )}
    </div>
  );
}

export function Inspector({ scene, onLoadNarration }: Props): JSX.Element {
  const t = useT();
  const [isPlaying, setPlaying] = useState(false);
  const [audioBlobUrl, setAudioBlobUrl] = useState<string | null>(null);
  const [audioError, setAudioError] = useState('');
  const [loadingAudio, setLoadingAudio] = useState(false);

  const handlePreviewNarration = async (audioPath: string) => {
    if (audioBlobUrl) {
      setPlaying((p) => !p);
      return;
    }
    setLoadingAudio(true);
    setAudioError('');
    try {
      const { base64Data, mimeType } = await api.file.readBase64(audioPath);
      const binary = atob(base64Data);
      const bytes = new Uint8Array(binary.length);
      for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
      const blob = new Blob([bytes], { type: mimeType });
      const url = URL.createObjectURL(blob);
      setAudioBlobUrl(url);
      setPlaying(true);
    } catch (err) {
      setAudioError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoadingAudio(false);
    }
  };

  const handleLoadNarrationFile = async () => {
    if (!scene) return;
    try {
      const { filePath } = await api.dialog.selectFile(t('inspector.loadNarration'), undefined, [
        { name: 'Audio', extensions: ['mp3', 'wav', 'ogg', 'aac', 'm4a', 'flac'] },
      ]);
      if (!filePath) return;
      // 기존 blob URL 해제
      if (audioBlobUrl) {
        URL.revokeObjectURL(audioBlobUrl);
        setAudioBlobUrl(null);
      }
      setPlaying(false);
      onLoadNarration?.(scene.id, filePath);
    } catch (err) {
      setAudioError(err instanceof Error ? err.message : String(err));
    }
  };

  // 씬 변경 시 오디오 상태 초기화
  const prevSceneIdRef = useRef<string | null>(null);
  useEffect(() => {
    const currentId = scene?.id ?? null;
    if (currentId !== prevSceneIdRef.current) {
      prevSceneIdRef.current = currentId;
      setAudioBlobUrl((prev) => {
        if (prev) URL.revokeObjectURL(prev);
        return null;
      });
      setPlaying(false);
      setAudioError('');
    }
  }, [scene?.id]);

  if (!scene) {
    return (
      <div className="flex h-full w-64 items-center justify-center border-l border-zinc-800 bg-zinc-950">
        <p className="text-xs text-zinc-600">{t('scene.select')}</p>
      </div>
    );
  }

  return (
    <div className="flex h-full w-64 flex-col border-l border-zinc-800 bg-zinc-950">
      {/* 헤더 */}
      <div className="border-b border-zinc-800 px-4 py-2">
        <span className="text-xs font-semibold uppercase tracking-wider text-zinc-500">
          {t('inspector.title')}
        </span>
        <p className="mt-0.5 text-sm text-zinc-300">
          {t('scene.header')} #{scene.index + 1}
        </p>
      </div>

      <div className="scrollbar-thin flex-1 overflow-y-auto p-4">
        {/* 에셋 상태 */}
        <div className="space-y-2">
          <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-zinc-600">
            {t('inspector.assets')}
          </h3>
          <AssetBadge
            label={t('inspector.images')}
            icon={Image}
            hasAsset={scene.generatedImages.length > 0}
            count={scene.generatedImages.length}
          />
          <AssetBadge
            label={t('inspector.videoClips')}
            icon={Film}
            hasAsset={scene.generatedClips.length > 0}
            count={scene.generatedClips.length}
          />
          <AssetBadge
            label={t('inspector.narration')}
            icon={Volume2}
            hasAsset={!!scene.narrationAudio}
          />

          {/* 나레이션 미리듣기 */}
          <div className="space-y-1.5">
            <div className="flex gap-1">
              {scene.narrationAudio && (
                <button
                  type="button"
                  onClick={() => void handlePreviewNarration(scene.narrationAudio!.path)}
                  disabled={loadingAudio}
                  className="flex flex-1 items-center justify-center gap-1 rounded-md border border-zinc-700 px-2 py-1 text-[10px] text-zinc-400 transition hover:bg-zinc-800 hover:text-zinc-200 disabled:opacity-50"
                >
                  {isPlaying ? <Square size={10} /> : <Play size={10} />}
                  {loadingAudio ? t('common.loading') : isPlaying ? t('tts.stop') : t('tts.play')}
                </button>
              )}
              <button
                type="button"
                onClick={() => void handleLoadNarrationFile()}
                className="flex flex-1 items-center justify-center gap-1 rounded-md border border-zinc-700 px-2 py-1 text-[10px] text-zinc-400 transition hover:bg-zinc-800 hover:text-zinc-200"
              >
                <Upload size={10} />
                {t('inspector.loadNarration')}
              </button>
            </div>
            {audioBlobUrl && (
              <Waveform
                audioPath={audioBlobUrl}
                isPlaying={isPlaying}
                onPlayPause={() => setPlaying((p) => !p)}
                onFinish={() => setPlaying(false)}
              />
            )}
            {audioError && <p className="text-[10px] text-red-400">{audioError}</p>}
          </div>

          <AssetBadge
            label={t('inspector.subtitleAss')}
            icon={Subtitles}
            hasAsset={!!scene.subtitleAss}
          />
          <AssetBadge label={t('inspector.finalClip')} icon={Film} hasAsset={!!scene.finalClip} />
        </div>

        {/* 프롬프트 */}
        {(scene.prompts.whisk ?? scene.prompts.imagefx ?? scene.prompts.grok) && (
          <div className="mt-6 space-y-2">
            <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-zinc-600">
              {t('inspector.prompts')}
            </h3>
            {scene.prompts.whisk && (
              <div className="rounded-lg border border-zinc-800 p-2">
                <span className="text-[10px] uppercase text-zinc-600">Whisk</span>
                <p className="mt-0.5 text-xs text-zinc-400">{scene.prompts.whisk}</p>
              </div>
            )}
            {scene.prompts.grok && (
              <div className="rounded-lg border border-zinc-800 p-2">
                <span className="text-[10px] uppercase text-zinc-600">Grok</span>
                <p className="mt-0.5 text-xs text-zinc-400">{scene.prompts.grok}</p>
              </div>
            )}
          </div>
        )}

        {/* 노트 */}
        {scene.notes && (
          <div className="mt-6">
            <h3 className="mb-2 flex items-center gap-1 text-xs font-semibold uppercase tracking-wider text-zinc-600">
              <FileText size={12} /> {t('inspector.notes')}
            </h3>
            <p className="text-xs text-zinc-400">{scene.notes}</p>
          </div>
        )}
      </div>
    </div>
  );
}
