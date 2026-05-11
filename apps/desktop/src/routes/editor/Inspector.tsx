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
  X,
  Send,
} from 'lucide-react';
import { useT } from '../../i18n';
import { api } from '../../lib/api';
import { Waveform } from '../../components/Waveform';
import { buildAss, DEFAULT_STYLE } from '@videoforge/shared';
import type { Scene, AssetRef, PipelineStep } from '@videoforge/shared';

interface Props {
  scene: Scene | null;
  projectLanguage: string;
  onLoadNarration?: (sceneId: string, filePath: string) => void;
  onDropImages?: (sceneId: string, paths: string[]) => void;
  onDropClips?: (sceneId: string, paths: string[]) => void;
  onSubtitleGenerated?: (sceneId: string, assContent: string) => void;
  onFinalClipGenerated?: (sceneId: string, clipPath: string) => void;
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
      className={`gooey-badge flex flex-1 items-center gap-2 px-3 py-2 ${
        hasAsset ? 'border-white/10 bg-white/5' : 'border-white/4 bg-white/2'
      }`}
    >
      <Icon size={14} className={hasAsset ? 'text-emerald-400' : 'text-white/15'} />
      <span className="text-xs text-white/50">{label}</span>
      {count !== undefined && count > 0 && (
        <span className="ml-auto font-mono text-xs text-white/35">{count}</span>
      )}
      {hasAsset && count === undefined && (
        <span className="ml-auto text-xs text-emerald-500">&#10003;</span>
      )}
    </div>
  );
}

function ImageThumbnails({ images }: { images: AssetRef[] }) {
  const [blobUrls, setBlobUrls] = useState<Map<string, string>>(new Map());
  const [loading, setLoading] = useState(false);
  const [expanded, setExpanded] = useState<string | null>(null);

  const loadImages = useCallback(async () => {
    if (images.length === 0) return;
    setLoading(true);
    const urls = new Map<string, string>();
    for (const img of images) {
      try {
        const { base64Data, mimeType } = await api.file.readBase64(img.path);
        const binary = atob(base64Data);
        const bytes = new Uint8Array(binary.length);
        for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
        const blob = new Blob([bytes], { type: mimeType });
        urls.set(img.path, URL.createObjectURL(blob));
      } catch {
        // skip failed images
      }
    }
    setBlobUrls(urls);
    setLoading(false);
  }, [images]);

  useEffect(() => {
    void loadImages();
    return () => {
      blobUrls.forEach((url) => URL.revokeObjectURL(url));
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loadImages]);

  if (images.length === 0) return null;

  return (
    <>
      <div className="grid grid-cols-2 gap-1">
        {loading && <p className="col-span-2 text-[10px] text-white/25">Loading...</p>}
        {images.map((img) => {
          const url = blobUrls.get(img.path);
          if (!url) return null;
          return (
            <button
              key={img.path}
              type="button"
              onClick={() => setExpanded(img.path)}
              className="border-white/8 overflow-hidden rounded-xl border transition hover:border-white/20"
            >
              <img src={url} alt="" className="h-16 w-full object-cover" />
            </button>
          );
        })}
      </div>
      {expanded && blobUrls.get(expanded) && (
        <div
          className="gooey-modal-backdrop fixed inset-0 z-50 flex items-center justify-center"
          onClick={() => setExpanded(null)}
        >
          <button
            type="button"
            onClick={() => setExpanded(null)}
            className="absolute right-4 top-4 rounded-full bg-white/10 p-1.5 text-white/50 hover:text-white"
          >
            <X size={18} />
          </button>
          <img
            src={blobUrls.get(expanded)}
            alt=""
            className="max-h-[80vh] max-w-[80vw] rounded-2xl"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </>
  );
}

function GrokImageThumb({ path }: { path: string }) {
  const [url, setUrl] = useState<string | null>(null);
  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const { base64Data, mimeType } = await api.file.readBase64(path);
        const binary = atob(base64Data);
        const bytes = new Uint8Array(binary.length);
        for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
        const blob = new Blob([bytes], { type: mimeType });
        if (!cancelled) setUrl(URL.createObjectURL(blob));
      } catch {
        /* skip */
      }
    };
    void load();
    return () => {
      cancelled = true;
    };
  }, [path]);
  if (!url) return <Image size={12} className="text-white/15" />;
  return <img src={url} alt="" className="h-full w-full object-cover" />;
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
      const status = await api.grok.bridgeStatus();
      if (!status.available || status.connectedTabs === 0) {
        setGrokError(t('inspector.grokNotConnected'));
        return;
      }
      await api.grok.bridgeSend({
        items: [
          {
            prompt: grokPrompt.trim(),
            imagePath,
            durationSec: 6,
            count: 1,
            outputDir: imagePath.replace(/[^/]+$/, ''),
            maxRetries: 2,
          },
        ],
      });
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
    const firstImage = scene.generatedImages[0];
    if (!firstImage) {
      setComposeError(t('inspector.composeNoImage'));
      return;
    }
    setComposeProcessing(true);
    setComposeError('');
    try {
      const outputPath = firstImage.path.replace(/\.[^.]+$/, '') + `_clip_${Date.now()}.mp4`;
      const step: Record<string, unknown> = {
        kind: 'compose',
        image: firstImage.path,
      };
      if (scene.narrationAudio) {
        step.audio = scene.narrationAudio.path;
      } else {
        step.durationMs = 10000;
      }
      if (typeof scene.subtitleAss?.meta?.content === 'string') {
        step.subtitleContent = scene.subtitleAss.meta.content;
      }
      const result = await api.video.edit({
        outputPath,
        pipeline: [step as PipelineStep],
      });
      onFinalClipGenerated?.(scene.id, result.outputPath);
    } catch (err) {
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
  }, [scene, projectLanguage, sttProvider, onSubtitleGenerated, t]);

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
      <div className="gooey-sidebar border-white/6 flex h-full w-96 items-center justify-center border-l">
        <p className="gooey-text-muted text-xs">{t('scene.select')}</p>
      </div>
    );
  }

  return (
    <div
      className={`gooey-sidebar border-white/6 flex h-full w-96 flex-col border-l ${isDragOver ? 'ring-2 ring-inset ring-violet-500/30' : ''}`}
      onDragOver={(e) => {
        e.preventDefault();
        setDragOver(true);
      }}
      onDragLeave={() => setDragOver(false)}
      onDrop={handleDrop}
    >
      {/* Header */}
      <div className="border-white/6 border-b px-4 py-2">
        <span className="text-xs font-semibold uppercase tracking-wider text-white/30">
          {t('inspector.title')}
        </span>
        <p className="mt-0.5 text-sm text-white/70">
          {t('scene.header')} #{scene.index + 1}
        </p>
      </div>

      <div className="gooey-scrollbar flex-1 overflow-y-auto p-4">
        {/* Asset status */}
        <div className="space-y-2">
          <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-white/20">
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
            {audioError && <p className="text-[10px] text-red-400">{audioError}</p>}
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
            {subtitleError && <p className="text-[10px] text-red-400">{subtitleError}</p>}
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
            <button
              type="button"
              onClick={() => void handleComposeClip()}
              disabled={composeProcessing || scene.generatedImages.length === 0}
              className="gooey-btn-primary flex w-full items-center justify-center gap-1 px-2 py-1.5 text-[10px]"
            >
              {composeProcessing ? (
                <RefreshCw size={10} className="animate-spin" />
              ) : (
                <Film size={10} />
              )}
              {composeProcessing ? t('inspector.composing') : t('inspector.compose')}
            </button>
            {composeError && <p className="text-[10px] text-red-400">{composeError}</p>}
          </div>
        </div>

        {/* Grok Video Generation */}
        {scene.generatedImages.length > 0 && (
          <div className="mt-6 space-y-2">
            <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-white/20">
              {t('inspector.grokGenerate')}
            </h3>
            {/* Image selector */}
            <div className="flex gap-1">
              {scene.generatedImages.map((img) => (
                <button
                  key={img.path}
                  type="button"
                  onClick={() => setGrokSelectedImage(img.path)}
                  className={`h-12 w-12 overflow-hidden rounded border transition hover:border-white/30 ${
                    (grokSelectedImage ?? scene.generatedImages[0]?.path) === img.path
                      ? 'border-violet-400'
                      : 'border-white/10'
                  }`}
                  title={img.path.split('/').pop()}
                >
                  <GrokImageThumb path={img.path} />
                </button>
              ))}
            </div>
            {/* Prompt + Send */}
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
            {grokError && <p className="text-[10px] text-red-400">{grokError}</p>}
          </div>
        )}

        {/* Prompts */}
        {(scene.prompts.whisk ?? scene.prompts.imagefx ?? scene.prompts.grok) && (
          <div className="mt-6 space-y-2">
            <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-white/20">
              {t('inspector.prompts')}
            </h3>
            {scene.prompts.whisk && (
              <div className="gooey-badge rounded-xl p-2">
                <span className="text-[10px] uppercase text-white/25">Whisk</span>
                <p className="mt-0.5 text-xs text-white/45">{scene.prompts.whisk}</p>
              </div>
            )}
            {scene.prompts.grok && (
              <div className="gooey-badge rounded-xl p-2">
                <span className="text-[10px] uppercase text-white/25">Grok</span>
                <p className="mt-0.5 text-xs text-white/45">{scene.prompts.grok}</p>
              </div>
            )}
          </div>
        )}

        {/* Notes */}
        {scene.notes && (
          <div className="mt-6">
            <h3 className="mb-2 flex items-center gap-1 text-xs font-semibold uppercase tracking-wider text-white/20">
              <FileText size={12} /> {t('inspector.notes')}
            </h3>
            <p className="text-xs text-white/45">{scene.notes}</p>
          </div>
        )}
      </div>
    </div>
  );
}

/** Parsed ASS dialogue line */
interface DialogueLine {
  start: string;
  end: string;
  text: string;
  raw: string;
}

function parseAssDialogues(ass: string): { header: string; lines: DialogueLine[] } {
  const allLines = ass.split('\n');
  const headerLines: string[] = [];
  const dialogues: DialogueLine[] = [];

  for (const line of allLines) {
    if (line.startsWith('Dialogue:')) {
      const parts = line.split(',');
      if (parts.length >= 10) {
        dialogues.push({
          start: parts[1]?.trim() ?? '',
          end: parts[2]?.trim() ?? '',
          text: parts.slice(9).join(','),
          raw: line,
        });
      }
    } else {
      headerLines.push(line);
    }
  }

  return { header: headerLines.join('\n'), lines: dialogues };
}

function rebuildAss(header: string, lines: DialogueLine[]): string {
  const events = lines.map((l) => `Dialogue: 0,${l.start},${l.end},Default,,0,0,0,,${l.text}`);
  return header + '\n' + events.join('\n') + '\n';
}

function SubtitleEditor({
  assContent,
  images,
  imageAssignments,
  onSave,
  onAssignImage,
}: {
  assContent: string;
  images: AssetRef[];
  imageAssignments: Record<number, string>;
  onSave: (updated: string) => void;
  onAssignImage: (lineIdx: number, imagePath: string | null) => void;
}): JSX.Element {
  const [expanded, setExpanded] = useState(false);
  const [parsed, setParsed] = useState(() => parseAssDialogues(assContent));
  const [dirty, setDirty] = useState(false);
  const [imgUrls, setImgUrls] = useState<Map<string, string>>(new Map());
  const [pickerLine, setPickerLine] = useState<number | null>(null);

  useEffect(() => {
    setParsed(parseAssDialogues(assContent));
    setDirty(false);
  }, [assContent]);

  // Load image blob URLs
  useEffect(() => {
    if (images.length === 0) return;
    let cancelled = false;
    const load = async () => {
      const urls = new Map<string, string>();
      for (const img of images) {
        try {
          const { base64Data, mimeType } = await api.file.readBase64(img.path);
          const binary = atob(base64Data);
          const bytes = new Uint8Array(binary.length);
          for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
          const blob = new Blob([bytes], { type: mimeType });
          urls.set(img.path, URL.createObjectURL(blob));
        } catch {
          /* skip */
        }
      }
      if (!cancelled) setImgUrls(urls);
    };
    void load();
    return () => {
      cancelled = true;
    };
  }, [images]);

  const updateLine = (idx: number, field: keyof DialogueLine, value: string) => {
    setParsed((p) => ({
      ...p,
      lines: p.lines.map((l, i) => (i === idx ? { ...l, [field]: value } : l)),
    }));
    setDirty(true);
  };

  const deleteLine = (idx: number) => {
    setParsed((p) => ({ ...p, lines: p.lines.filter((_, i) => i !== idx) }));
    setDirty(true);
  };

  const handleSave = () => {
    onSave(rebuildAss(parsed.header, parsed.lines));
    setDirty(false);
  };

  return (
    <div className="border-white/8 mt-1 rounded-lg border bg-white/[0.02]">
      <button
        type="button"
        onClick={() => setExpanded(!expanded)}
        className="flex w-full items-center justify-between px-2 py-1.5 text-[10px] text-white/50 hover:text-white/70"
      >
        <span>자막 · 이미지 편집 ({parsed.lines.length}줄)</span>
        <span>{expanded ? '▲' : '▼'}</span>
      </button>

      {expanded && (
        <div className="border-white/8 border-t px-2 pb-2">
          <div className="gooey-scrollbar max-h-[70vh] overflow-y-auto">
            {parsed.lines.map((line, i) => {
              const assignedImg = imageAssignments[i];
              const assignedUrl = assignedImg ? imgUrls.get(assignedImg) : undefined;

              return (
                <div key={i} className="mt-2 rounded-lg border border-white/5 bg-white/[0.02] p-2">
                  <div className="flex gap-2">
                    {/* Image area */}
                    <button
                      type="button"
                      onClick={() => setPickerLine(pickerLine === i ? null : i)}
                      className="flex h-20 w-20 flex-shrink-0 items-center justify-center overflow-hidden rounded border border-white/10 bg-black/30 transition hover:border-white/25"
                      title="이미지 할당"
                    >
                      {assignedUrl ? (
                        <img src={assignedUrl} alt="" className="h-full w-full object-cover" />
                      ) : (
                        <Image size={14} className="text-white/15" />
                      )}
                    </button>

                    {/* Text + timecode area */}
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5">
                        <span className="w-5 text-[10px] font-medium text-white/25">{i + 1}</span>
                        <input
                          type="text"
                          value={line.start}
                          onChange={(e) => updateLine(i, 'start', e.target.value)}
                          className="gooey-input w-[80px] px-1.5 py-1 text-[11px]"
                          title="시작"
                        />
                        <span className="text-[10px] text-white/25">→</span>
                        <input
                          type="text"
                          value={line.end}
                          onChange={(e) => updateLine(i, 'end', e.target.value)}
                          className="gooey-input w-[80px] px-1.5 py-1 text-[11px]"
                          title="끝"
                        />
                        <button
                          type="button"
                          onClick={() => deleteLine(i)}
                          className="ml-auto text-white/25 hover:text-red-400"
                          title="삭제"
                        >
                          <X size={12} />
                        </button>
                      </div>
                      <input
                        type="text"
                        value={line.text}
                        onChange={(e) => updateLine(i, 'text', e.target.value)}
                        className="gooey-input mt-1.5 w-full px-1.5 py-1 text-[12px]"
                      />
                    </div>
                  </div>

                  {/* Image picker */}
                  {pickerLine === i && images.length > 0 && (
                    <div className="border-white/8 mt-1.5 rounded border bg-black/20 p-1">
                      <p className="mb-1 text-[8px] text-white/30">이미지 선택:</p>
                      <div className="flex flex-wrap gap-1">
                        {assignedImg && (
                          <button
                            type="button"
                            onClick={() => {
                              onAssignImage(i, null);
                              setPickerLine(null);
                            }}
                            className="flex h-14 w-14 items-center justify-center rounded border border-white/10 bg-black/30 text-[8px] text-white/30 hover:border-red-400/50 hover:text-red-400"
                            title="할당 해제"
                          >
                            <X size={12} />
                          </button>
                        )}
                        {images.map((img) => {
                          const url = imgUrls.get(img.path);
                          if (!url) return null;
                          const isActive = assignedImg === img.path;
                          return (
                            <button
                              key={img.path}
                              type="button"
                              onClick={() => {
                                onAssignImage(i, img.path);
                                setPickerLine(null);
                              }}
                              className={`h-14 w-14 overflow-hidden rounded border transition hover:border-white/30 ${
                                isActive ? 'border-purple-400' : 'border-white/10'
                              }`}
                            >
                              <img src={url} alt="" className="h-full w-full object-cover" />
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
          {dirty && (
            <button
              type="button"
              onClick={handleSave}
              className="gooey-btn-primary mt-2 w-full px-2 py-1 text-[10px]"
            >
              자막 저장
            </button>
          )}
        </div>
      )}
    </div>
  );
}
