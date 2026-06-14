import { useState, useEffect, useRef, useCallback } from 'react';
import {
  Image,
  Volume2,
  Subtitles,
  Film,
  FileText,
  Play,
  Square,
  Upload,
  Plus,
  RefreshCw,
  Send,
} from 'lucide-react';
import { useT } from '../../i18n';
import { api } from '../../lib/api';
import { Waveform } from '../../components/Waveform';
import { buildAss, DEFAULT_STYLE } from '@videoforge/shared';
import type { Scene, PipelineStep } from '@videoforge/shared';
import { AssetBadge } from './AssetBadge';
import { ImageThumbnails, GrokImageThumb } from './ImageThumbnails';
import { FinalClipPreview } from './FinalClipPreview';
import { SubtitleEditor } from './SubtitleEditor';

interface Props {
  scene: Scene | null;
  projectLanguage: string;
  onLoadNarration?: (sceneId: string, filePath: string) => void;
  onDropImages?: (sceneId: string, paths: string[]) => void;
  onDropClips?: (sceneId: string, paths: string[]) => void;
  onSubtitleGenerated?: (sceneId: string, assContent: string) => void;
  onFinalClipGenerated?: (sceneId: string, clipPath: string) => void;
}

export function Inspector({
  scene,
  projectLanguage,
  onLoadNarration,
  onDropImages,
  onDropClips,
  onSubtitleGenerated,
  onFinalClipGenerated,
}: Props): JSX.Element {
  const t = useT();
  const [isPlaying, setPlaying] = useState(false);
  const [audioBlobUrl, setAudioBlobUrl] = useState<string | null>(null);
  const [audioError, setAudioError] = useState('');
  const [loadingAudio, setLoadingAudio] = useState(false);
  const [isDragOver, setDragOver] = useState(false);
  const [sttProvider, setSttProvider] = useState<'openai' | 'gemini' | 'whisper-local'>('openai');
  const [whisperModel, setWhisperModel] = useState('ggml-base');
  const [subtitleProcessing, setSubtitleProcessing] = useState(false);
  const [subtitleError, setSubtitleError] = useState('');
  const [imageAssignments, setImageAssignments] = useState<Record<number, string>>({});
  const [composeProcessing, setComposeProcessing] = useState(false);
  const [composeError, setComposeError] = useState('');
  const [grokPrompt, setGrokPrompt] = useState('');
  const [grokSelectedImage, setGrokSelectedImage] = useState<string | null>(null);
  const [grokSending, setGrokSending] = useState(false);
  const [grokError, setGrokError] = useState('');

  const handleGrokGenerate = useCallback(async () => {
    if (!scene || !grokPrompt.trim()) return;
    const imagePath = grokSelectedImage ?? scene.generatedImages[0]?.path;
    if (!imagePath) {
      setGrokError(t('inspector.grokSelectImage'));
      return;
    }
    setGrokSending(true);
    setGrokError('');
    try {
      const outputDir = imagePath.replace(/[^/]+$/, '');
      const bridgeOk = await api.grok
        .bridgeStatus()
        .then((s) => s.available && s.connectedTabs > 0)
        .catch(() => false);

      if (bridgeOk) {
        await api.grok.bridgeSend({
          items: [
            {
              prompt: grokPrompt.trim(),
              imagePath,
              durationSec: 6,
              count: 1,
              outputDir,
              maxRetries: 2,
            },
          ],
        });
      } else {
        await api.grok.generate({
          prompt: grokPrompt.trim(),
          imagePath,
          durationSec: 6,
          count: 1,
          outputDir,
          maxRetries: 2,
        });
      }
      setGrokPrompt('');
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      const hint = (err as Record<string, unknown>)?.hint;
      setGrokError(hint ? `${msg}: ${String(hint)}` : msg);
    } finally {
      setGrokSending(false);
    }
  }, [scene, grokPrompt, grokSelectedImage, t]);

  const handleComposeClip = useCallback(async () => {
    if (!scene) return;
    const firstClip = scene.generatedClips[0];
    const firstImage = scene.generatedImages[0];
    if (!firstClip && !firstImage) {
      setComposeError(t('inspector.composeNoImage'));
      return;
    }
    setComposeProcessing(true);
    setComposeError('');
    try {
      const sourceAsset = firstClip ?? firstImage!;
      const baseName =
        sourceAsset.path
          .split('/')
          .pop()
          ?.replace(/\.[^.]+$/, '') ?? 'clip';
      const outputPath = `/tmp/${baseName}_${Date.now()}.mp4`;

      const step: Record<string, unknown> = { kind: 'compose' };
      if (firstClip) {
        step.video = firstClip.path;
      } else {
        step.image = firstImage!.path;
      }
      if (scene.narrationAudio) {
        step.audio = scene.narrationAudio.path;
      } else if (!firstClip) {
        step.durationMs = 10000;
      }
      if (typeof scene.subtitleAss?.meta?.content === 'string') {
        step.subtitleContent = scene.subtitleAss.meta.content;
      }
      console.log('[compose] pipeline step:', step, 'output:', outputPath);
      const result = await api.video.edit({
        outputPath,
        pipeline: [step as PipelineStep],
      });
      console.log('[compose] success:', result);
      onFinalClipGenerated?.(scene.id, result.outputPath);
    } catch (err) {
      console.error('[compose] error:', err);
      const msg = err instanceof Error ? err.message : String(err);
      const hint = (err as Record<string, unknown>)?.hint;
      setComposeError(hint ? `${msg}: ${String(hint)}` : msg);
    } finally {
      setComposeProcessing(false);
    }
  }, [scene, onFinalClipGenerated, t]);

  const handleAddImages = useCallback(async () => {
    if (!scene) return;
    try {
      const { filePath } = await api.dialog.selectFile(t('inspector.images'), undefined, [
        { name: 'Images', extensions: ['png', 'jpg', 'jpeg', 'gif', 'webp', 'bmp'] },
      ]);
      if (!filePath) return;
      onDropImages?.(scene.id, [filePath]);
    } catch (err) {
      console.error('Failed to add image:', err);
    }
  }, [scene, onDropImages, t]);

  const handleAddClips = useCallback(async () => {
    if (!scene) return;
    try {
      const { filePath } = await api.dialog.selectFile(t('inspector.videoClips'), undefined, [
        { name: 'Video', extensions: ['mp4', 'mov', 'avi', 'mkv', 'webm'] },
      ]);
      if (!filePath) return;
      onDropClips?.(scene.id, [filePath]);
    } catch (err) {
      console.error('Failed to add clip:', err);
    }
  }, [scene, onDropClips, t]);

  const handleGenerateSubtitle = useCallback(async () => {
    if (!scene) return;
    if (!scene.narrationAudio) {
      setSubtitleError(t('subtitle.noAudio'));
      return;
    }
    const script = scene.scriptKo ?? scene.scriptOriginal ?? '';
    if (!script.trim()) {
      setSubtitleError(t('subtitle.emptyScript'));
      return;
    }
    setSubtitleProcessing(true);
    setSubtitleError('');
    try {
      let apiKey: string | null = null;
      if (sttProvider === 'openai') {
        apiKey = await api.keychain.get('openai-api-key');
      } else if (sttProvider === 'gemini') {
        apiKey = await api.keychain.get('gemini-api-key');
      }
      const sttResult = await api.stt.transcribe({
        audioPath: scene.narrationAudio.path,
        language: projectLanguage,
        provider: sttProvider,
        apiKey: apiKey ?? undefined,
        wordTimestamps: true,
        ...(sttProvider === 'whisper-local' ? { model: whisperModel } : {}),
      });
      const alignResult = await api.stt.align({
        transcript: script,
        sttSegments: sttResult.segments,
        language: projectLanguage,
      });
      const ass = buildAss(alignResult.words, DEFAULT_STYLE);
      onSubtitleGenerated?.(scene.id, ass);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      const hint = (err as Record<string, unknown>)?.hint;
      setSubtitleError(hint ? `${msg}: ${String(hint)}` : msg);
    } finally {
      setSubtitleProcessing(false);
    }
  }, [scene, projectLanguage, sttProvider, whisperModel, onSubtitleGenerated, t]);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragOver(false);
      if (!scene) return;

      const files = Array.from(e.dataTransfer.files);
      const imagePaths = files.filter((f) => f.type.startsWith('image/')).map((f) => f.path);
      const audioPaths = files.filter((f) => f.type.startsWith('audio/')).map((f) => f.path);

      if (imagePaths.length > 0) onDropImages?.(scene.id, imagePaths);
      if (audioPaths.length > 0 && audioPaths[0]) onLoadNarration?.(scene.id, audioPaths[0]);
    },
    [scene, onDropImages, onLoadNarration],
  );

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
      <div className="gooey-sidebar border-[#9B5BFF]/12 flex h-full w-96 items-center justify-center border-l">
        <p className="gooey-text-muted text-xs">{t('scene.select')}</p>
      </div>
    );
  }

  return (
    <div
      className={`gooey-sidebar border-[#9B5BFF]/12 flex h-full w-96 flex-col border-l ${isDragOver ? 'ring-2 ring-inset ring-[#FF4FBE]/30' : ''}`}
      onDragOver={(e) => {
        e.preventDefault();
        setDragOver(true);
      }}
      onDragLeave={() => setDragOver(false)}
      onDrop={handleDrop}
    >
      {/* Header */}
      <div className="border-[#9B5BFF]/12 border-b px-4 py-2">
        <span className="text-xs font-semibold uppercase tracking-wider text-[#9B5BFF]/35">
          {t('inspector.title')}
        </span>
        <p className="mt-0.5 text-sm text-[#f0e8ff]/75">
          {t('scene.header')} #{scene.index + 1}
        </p>
      </div>

      <div className="gooey-scrollbar flex-1 overflow-y-auto p-4">
        {/* Asset status */}
        <div className="space-y-2">
          <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-[#9B5BFF]/25">
            {t('inspector.assets')}
          </h3>
          {/* Images */}
          <div className="space-y-1.5">
            <div className="flex items-center gap-2">
              <AssetBadge
                label={t('inspector.images')}
                icon={Image}
                hasAsset={scene.generatedImages.length > 0}
                count={scene.generatedImages.length}
              />
              <button
                type="button"
                onClick={() => void handleAddImages()}
                className="gooey-btn-secondary flex items-center gap-1 rounded-xl px-2 py-1.5 text-[10px]"
                title={t('inspector.images')}
              >
                <Plus size={10} />
              </button>
            </div>
            <ImageThumbnails images={scene.generatedImages} />
          </div>

          {/* Video Clips */}
          <div className="flex items-center gap-2">
            <AssetBadge
              label={t('inspector.videoClips')}
              icon={Film}
              hasAsset={scene.generatedClips.length > 0}
              count={scene.generatedClips.length}
            />
            <button
              type="button"
              onClick={() => void handleAddClips()}
              className="gooey-btn-secondary flex items-center gap-1 rounded-xl px-2 py-1.5 text-[10px]"
              title={t('inspector.videoClips')}
            >
              <Plus size={10} />
            </button>
          </div>

          {/* Narration */}
          <AssetBadge
            label={t('inspector.narration')}
            icon={Volume2}
            hasAsset={!!scene.narrationAudio}
          />
          <div className="space-y-1.5">
            <div className="flex gap-1">
              {scene.narrationAudio && (
                <button
                  type="button"
                  onClick={() => void handlePreviewNarration(scene.narrationAudio!.path)}
                  disabled={loadingAudio}
                  className="gooey-btn-secondary flex flex-1 items-center justify-center gap-1 px-2 py-1 text-[10px]"
                >
                  {isPlaying ? <Square size={10} /> : <Play size={10} />}
                  {loadingAudio ? t('common.loading') : isPlaying ? t('tts.stop') : t('tts.play')}
                </button>
              )}
              <button
                type="button"
                onClick={() => void handleLoadNarrationFile()}
                className="gooey-btn-secondary flex flex-1 items-center justify-center gap-1 px-2 py-1 text-[10px]"
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
            {audioError && <p className="text-[10px] text-[#FF6A3D]">{audioError}</p>}
          </div>

          {/* Subtitle */}
          <AssetBadge
            label={t('inspector.subtitleAss')}
            icon={Subtitles}
            hasAsset={!!scene.subtitleAss}
          />
          <div className="space-y-1.5">
            <div className="flex gap-1">
              <select
                value={sttProvider}
                onChange={(e) =>
                  setSttProvider(e.target.value as 'openai' | 'gemini' | 'whisper-local')
                }
                className="gooey-input flex-1 px-1.5 py-1 text-[10px]"
              >
                <option value="openai">OpenAI Whisper</option>
                <option value="gemini">Gemini</option>
                <option value="whisper-local">{t('whisper.title')}</option>
              </select>
              {sttProvider === 'whisper-local' && (
                <select
                  value={whisperModel}
                  onChange={(e) => setWhisperModel(e.target.value)}
                  className="gooey-input px-1.5 py-1 text-[10px]"
                >
                  <option value="ggml-tiny">Tiny</option>
                  <option value="ggml-base">Base</option>
                  <option value="ggml-small">Small</option>
                  <option value="ggml-large-v3-turbo-q5_0">Large Q5</option>
                </select>
              )}
              <button
                type="button"
                onClick={() => void handleGenerateSubtitle()}
                disabled={subtitleProcessing || !scene.narrationAudio}
                className="gooey-btn-primary flex items-center gap-1 px-2 py-1 text-[10px]"
              >
                {subtitleProcessing ? (
                  <RefreshCw size={10} className="animate-spin" />
                ) : (
                  <Subtitles size={10} />
                )}
                {subtitleProcessing ? t('subtitle.generating') : t('subtitle.generate')}
              </button>
            </div>
            {subtitleError && <p className="text-[10px] text-[#FF6A3D]">{subtitleError}</p>}
          </div>
          {typeof scene.subtitleAss?.meta?.content === 'string' && (
            <SubtitleEditor
              assContent={scene.subtitleAss.meta.content}
              images={scene.generatedImages}
              imageAssignments={imageAssignments}
              onSave={(updated) => onSubtitleGenerated?.(scene.id, updated)}
              onAssignImage={(lineIdx, imgPath) => {
                setImageAssignments((prev) => {
                  const next = { ...prev };
                  if (imgPath) {
                    next[lineIdx] = imgPath;
                  } else {
                    delete next[lineIdx];
                  }
                  return next;
                });
              }}
            />
          )}

          {/* Final Clip */}
          <div className="space-y-1.5">
            <AssetBadge label={t('inspector.finalClip')} icon={Film} hasAsset={!!scene.finalClip} />
            {scene.finalClip ? (
              <FinalClipPreview
                clipPath={scene.finalClip.path}
                onRecompose={() => void handleComposeClip()}
                recomposing={composeProcessing}
              />
            ) : (
              <button
                type="button"
                onClick={() => void handleComposeClip()}
                disabled={
                  composeProcessing ||
                  (scene.generatedImages.length === 0 && scene.generatedClips.length === 0)
                }
                className="gooey-btn-primary flex w-full items-center justify-center gap-1 px-2 py-1.5 text-[10px]"
              >
                {composeProcessing ? (
                  <RefreshCw size={10} className="animate-spin" />
                ) : (
                  <Film size={10} />
                )}
                {composeProcessing ? t('inspector.composing') : t('inspector.compose')}
              </button>
            )}
            {composeError && <p className="text-[10px] text-[#FF6A3D]">{composeError}</p>}
          </div>
        </div>

        {/* Grok Video Generation */}
        {scene.generatedImages.length > 0 && (
          <div className="mt-6 space-y-2">
            <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-[#9B5BFF]/25">
              {t('inspector.grokGenerate')}
            </h3>
            <div className="flex gap-1">
              {scene.generatedImages.map((img) => (
                <button
                  key={img.path}
                  type="button"
                  onClick={() => setGrokSelectedImage(img.path)}
                  className={`h-12 w-12 overflow-hidden rounded border transition hover:border-[#9B5BFF]/30 ${
                    (grokSelectedImage ?? scene.generatedImages[0]?.path) === img.path
                      ? 'border-violet-400'
                      : 'border-[#9B5BFF]/15'
                  }`}
                  title={img.path.split('/').pop()}
                >
                  <GrokImageThumb path={img.path} />
                </button>
              ))}
            </div>
            <textarea
              value={grokPrompt}
              onChange={(e) => setGrokPrompt(e.target.value)}
              placeholder={t('inspector.grokPrompt')}
              rows={2}
              className="gooey-input w-full p-2 text-[11px]"
            />
            <button
              type="button"
              onClick={() => void handleGrokGenerate()}
              disabled={grokSending || !grokPrompt.trim()}
              className="gooey-btn-primary flex w-full items-center justify-center gap-1 px-2 py-1.5 text-[10px]"
            >
              {grokSending ? <RefreshCw size={10} className="animate-spin" /> : <Send size={10} />}
              {grokSending ? t('inspector.grokSending') : t('inspector.grokSend')}
            </button>
            {grokError && <p className="text-[10px] text-[#FF6A3D]">{grokError}</p>}
          </div>
        )}

        {/* Prompts */}
        {(scene.prompts.whisk ?? scene.prompts.imagefx ?? scene.prompts.grok) && (
          <div className="mt-6 space-y-2">
            <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-[#9B5BFF]/25">
              {t('inspector.prompts')}
            </h3>
            {scene.prompts.whisk && (
              <div className="gooey-badge rounded-xl p-2">
                <span className="text-[10px] uppercase text-[#9B5BFF]/30">Whisk</span>
                <p className="mt-0.5 text-xs text-[#9B5BFF]/50">{scene.prompts.whisk}</p>
              </div>
            )}
            {scene.prompts.grok && (
              <div className="gooey-badge rounded-xl p-2">
                <span className="text-[10px] uppercase text-[#9B5BFF]/30">Grok</span>
                <p className="mt-0.5 text-xs text-[#9B5BFF]/50">{scene.prompts.grok}</p>
              </div>
            )}
          </div>
        )}

        {/* Notes */}
        {scene.notes && (
          <div className="mt-6">
            <h3 className="mb-2 flex items-center gap-1 text-xs font-semibold uppercase tracking-wider text-[#9B5BFF]/25">
              <FileText size={12} /> {t('inspector.notes')}
            </h3>
            <p className="text-xs text-[#9B5BFF]/50">{scene.notes}</p>
          </div>
        )}
      </div>
    </div>
  );
}
