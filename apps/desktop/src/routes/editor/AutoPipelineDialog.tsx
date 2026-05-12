import { useState, useRef, useCallback } from 'react';
import { X, RefreshCw, Check, AlertCircle } from 'lucide-react';
import { api } from '../../lib/api';
import { useT } from '../../i18n';
import type { Scene, PipelineStep } from '@videoforge/shared';

interface Props {
  scenes: Scene[];
  onClose: () => void;
  onComplete: (sceneClips: { sceneId: string; clipPath: string }[]) => void;
}

interface StepStatus {
  sceneIndex: number;
  phase: 'waiting' | 'generating' | 'composing' | 'done' | 'failed';
  message?: string;
  videoPath?: string;
}

/**
 * Auto Pipeline: images + subtitles → Grok videos → concat → subtitle burn → final
 *
 * Flow per scene:
 * 1. Send image + subtitle text to Grok → receive video
 * 2. Compose video + narration audio + subtitle → final clip
 *
 * After all scenes:
 * 3. Each scene gets its finalClip set
 */
export function AutoPipelineDialog({ scenes, onClose, onComplete }: Props) {
  const t = useT();
  const [running, setRunning] = useState(false);
  const [steps, setSteps] = useState<StepStatus[]>([]);
  const [currentStep, setCurrentStep] = useState(-1);
  const [error, setError] = useState('');
  const cancelledRef = useRef(false);
  const completedClipsRef = useRef<{ sceneId: string; clipPath: string }[]>([]);

  // Filter scenes that have images
  const eligibleScenes = scenes.filter((s) => s.generatedImages.length > 0);

  const updateStep = useCallback((idx: number, update: Partial<StepStatus>) => {
    setSteps((prev) => prev.map((s, i) => (i === idx ? { ...s, ...update } : s)));
  }, []);

  const runPipeline = useCallback(async () => {
    if (eligibleScenes.length === 0) return;
    cancelledRef.current = false;
    completedClipsRef.current = [];
    setRunning(true);
    setError('');
    setSteps(eligibleScenes.map((_, i) => ({ sceneIndex: i, phase: 'waiting' })));

    for (let i = 0; i < eligibleScenes.length; i++) {
      if (cancelledRef.current) break;

      const scene = eligibleScenes[i]!;
      setCurrentStep(i);
      updateStep(i, { phase: 'generating' });

      const image = scene.generatedImages[0]!;
      const subtitleText = scene.scriptKo ?? scene.scriptOriginal ?? `Scene ${scene.index + 1}`;
      const outputDir = '/tmp/';

      try {
        // Step 1: Generate video via Grok
        const videoPath = await new Promise<string>((resolve, reject) => {
          const timeout = setTimeout(() => {
            unsubProgress();
            unsubReady();
            reject(new Error('Grok generation timeout (3min)'));
          }, 180_000);

          const unsubReady = api.grok.onVideoReady((payload: unknown) => {
            const evt = payload as { localPath?: string };
            if (evt.localPath) {
              clearTimeout(timeout);
              unsubProgress();
              unsubReady();
              resolve(evt.localPath);
            }
          });

          const unsubProgress = api.grok.onProgress((payload: unknown) => {
            const evt = payload as { phase?: string; message?: string };
            if (evt.phase === 'failed') {
              clearTimeout(timeout);
              unsubProgress();
              unsubReady();
              reject(new Error(evt.message ?? 'Grok generation failed'));
            }
            const msg = evt.phase === 'generating' ? 'Grok 영상 생성 중...' : (evt.phase ?? '');
            updateStep(i, { message: msg });
          });

          // Try bridge first, fall back to direct
          void (async () => {
            try {
              const bridgeOk = await api.grok
                .bridgeStatus()
                .then((s) => s.available && s.connectedTabs > 0)
                .catch(() => false);

              if (bridgeOk) {
                await api.grok.bridgeSend({
                  items: [
                    {
                      prompt: subtitleText,
                      imagePath: image.path,
                      durationSec: 6,
                      count: 1,
                      outputDir,
                      maxRetries: 1,
                    },
                  ],
                });
              } else {
                await api.grok.generate({
                  prompt: subtitleText,
                  imagePath: image.path,
                  durationSec: 6,
                  count: 1,
                  outputDir,
                  maxRetries: 1,
                });
              }
            } catch (err) {
              clearTimeout(timeout);
              unsubProgress();
              unsubReady();
              reject(err instanceof Error ? err : new Error(String(err)));
            }
          })();
        });

        if (cancelledRef.current) break;
        updateStep(i, { phase: 'composing', videoPath, message: '영상 합성 중...' });

        // Step 2: Compose video + audio + subtitle
        const baseName = `auto_scene${scene.index + 1}_${Date.now()}`;
        const composePath = `/tmp/${baseName}.mp4`;

        const step: Record<string, unknown> = {
          kind: 'compose',
          video: videoPath,
        };
        if (scene.narrationAudio) {
          step.audio = scene.narrationAudio.path;
        }
        if (typeof scene.subtitleAss?.meta?.content === 'string') {
          step.subtitleContent = scene.subtitleAss.meta.content;
        }

        const result = await api.video.edit({
          outputPath: composePath,
          pipeline: [step as PipelineStep],
        });

        completedClipsRef.current.push({ sceneId: scene.id, clipPath: result.outputPath });
        updateStep(i, { phase: 'done', videoPath: result.outputPath, message: '완료' });
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        updateStep(i, { phase: 'failed', message: msg });
        setError(`씬 ${scene.index + 1} 실패: ${msg}`);
        // Continue with next scene instead of stopping
      }
    }

    setRunning(false);
    if (completedClipsRef.current.length > 0) {
      onComplete(completedClipsRef.current);
    }
  }, [eligibleScenes, updateStep, onComplete]);

  const handleCancel = () => {
    cancelledRef.current = true;
    void api.grok.cancel({}).catch(() => {
      /* cancelled */
    });
  };

  const totalDone = steps.filter((s) => s.phase === 'done').length;
  const totalFailed = steps.filter((s) => s.phase === 'failed').length;

  return (
    <div className="gooey-modal-backdrop fixed inset-0 z-50 flex items-center justify-center">
      <div className="gooey-modal w-full max-w-lg p-6">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="gooey-text-primary text-lg font-semibold">
            {t('inspector.autoPipeline')}
          </h2>
          <button
            onClick={onClose}
            disabled={running}
            className="gooey-btn-ghost p-1"
            aria-label="Close"
          >
            <X size={18} />
          </button>
        </div>

        <div className="space-y-3">
          <p className="text-xs text-white/40">
            {eligibleScenes.length}개 씬의 이미지 + 자막을 Grok에 보내 영상을 자동 생성하고
            합성합니다. 씬당 약 1~2분 소요됩니다.
          </p>

          {/* Scene list with status */}
          <div className="gooey-scrollbar max-h-[50vh] space-y-1 overflow-y-auto">
            {eligibleScenes.map((scene, i) => {
              const step = steps[i];
              return (
                <div
                  key={scene.id}
                  className={`flex items-center gap-2 rounded-lg border px-3 py-2 ${
                    step?.phase === 'done'
                      ? 'border-emerald-500/20 bg-emerald-500/5'
                      : step?.phase === 'failed'
                        ? 'border-red-500/20 bg-red-500/5'
                        : step?.phase === 'generating' || step?.phase === 'composing'
                          ? 'border-violet-500/20 bg-violet-500/5'
                          : 'border-white/5 bg-white/[0.02]'
                  }`}
                >
                  <span className="w-6 text-center text-xs font-medium text-white/30">
                    {scene.index + 1}
                  </span>
                  <span className="min-w-0 flex-1 truncate text-xs text-white/60">
                    {scene.scriptKo?.slice(0, 40) ??
                      scene.scriptOriginal?.slice(0, 40) ??
                      `Scene ${scene.index + 1}`}
                  </span>
                  <span className="flex-shrink-0">
                    {step?.phase === 'done' && <Check size={14} className="text-emerald-400" />}
                    {step?.phase === 'failed' && <AlertCircle size={14} className="text-red-400" />}
                    {(step?.phase === 'generating' || step?.phase === 'composing') && (
                      <RefreshCw size={14} className="animate-spin text-violet-400" />
                    )}
                  </span>
                </div>
              );
            })}
          </div>

          {/* Progress summary */}
          {steps.length > 0 && (
            <div className="flex items-center gap-3 text-xs text-white/40">
              <span>
                완료: {totalDone}/{eligibleScenes.length}
              </span>
              {totalFailed > 0 && <span className="text-red-400">실패: {totalFailed}</span>}
              {running && currentStep >= 0 && (
                <span className="text-violet-400">
                  {steps[currentStep]?.message ?? '처리 중...'}
                </span>
              )}
            </div>
          )}

          {error && <p className="text-xs text-red-400">{error}</p>}

          {/* Actions */}
          <div className="flex justify-end gap-2 pt-2">
            {running ? (
              <button
                onClick={handleCancel}
                className="gooey-btn-ghost px-4 py-2 text-sm text-red-400"
              >
                중지
              </button>
            ) : (
              <>
                <button onClick={onClose} className="gooey-btn-ghost px-4 py-2 text-sm">
                  {totalDone > 0 ? '닫기' : '취소'}
                </button>
                <button
                  onClick={() => void runPipeline()}
                  disabled={eligibleScenes.length === 0}
                  className="gooey-btn-primary flex items-center gap-2 px-4 py-2 text-sm"
                >
                  <RefreshCw size={14} />
                  {totalDone > 0 ? '다시 실행' : t('inspector.autoPipelineStart')}
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
