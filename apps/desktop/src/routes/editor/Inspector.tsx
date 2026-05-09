import { Image, Volume2, Subtitles, Film, FileText } from 'lucide-react';
import { useT } from '../../i18n';
import type { Scene } from '@videoforge/shared';

interface Props {
  scene: Scene | null;
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

export function Inspector({ scene }: Props): JSX.Element {
  const t = useT();

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
