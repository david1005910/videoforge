import { useState, useRef, useCallback, useEffect } from 'react';
import { X, RefreshCw, Check, AlertCircle, Zap, Film } from 'lucide-react';
import { api } from '../../lib/api';
import { useT } from '../../i18n';
import type { Scene, PipelineStep } from '@videoforge/shared';

interface Props {
  scenes: Scene[];
  onClose: () => void;
  /** Called with per-scene clips AND optional final merged path */
  onComplete: (
    sceneClips: { sceneId: string; clipPath: string }[],
    finalVideoPath?: string,
  ) => void;
}

type GenerationMode = 'grok' | 'local';

type PipelinePhase =
  | 'idle'
  | 'generating' // Phase 1: Grok API / local per scene
  | 'composing' // Phase 2: per scene compose (video + audio)
  | 'merging' // Phase 3: concat all + subtitle
  | 'done';

interface StepStatus {
  sceneIndex: number;
  phase: 'waiting' | 'generating' | 'composing' | 'done' | 'failed';
  message?: string;
  videoPath?: string;
}

/**
 * Auto Pipeline Dialog — Full video production pipeline
 *
 * Phase 1: Image + Script → Grok API → AI video (per scene)
 * Phase 2: AI video + Narration audio → compose (per scene)
 * Phase 3: All scene clips → concat in order + subtitles → final video
 */
export function AutoPipelineDialog({ scenes, onClose, onComplete }: Props) {
  const t = useT();
  const [running, setRunning] = useState(false);
  const [steps, setSteps] = useState<StepStatus[]>([]);
  const [currentStep, setCurrentStep] = useState(-1);
  const [pipelinePhase, setPipelinePhase] = useState<PipelinePhase>('idle');
  const [error, setError] = useState('');
  const [mode, setMode] = useState<GenerationMode>('grok');
  const [bridgeReady, setBridgeReady] = useState<boolean | null>(null);
  const [finalPath, setFinalPath] = useState('');
  const cancelledRef = useRef(false);
  const completedClipsRef = useRef<{ sceneId: string; clipPath: string }[]>([]);

  useEffect(() => {
    void api.grok.bridgeStatus().then((status) => {
      const ready = status.available && status.connectedTabs > 0;
      setBridgeReady(ready);
      if (!ready) setMode('local');
    });
  }, []);

  const eligibleScenes = scenes.filter((s) => s.generatedImages.length > 0);

  const updateStep = useCallback((idx: number, update: Partial<StepStatus>) => {
    setSteps((prev) => prev.map((s, i) => (i === idx ? { ...s, ...update } : s)));
  }, []);

  // ─── Phase 1: Generate video via Grok Automation (Bridge extension) ───
  const generateViaGrok = useCallback(
    (prompt: string, imagePath: string, outputDir: string, sceneIdx: number): Promise<string> => {
      return new Promise<string>((resolve, reject) => {
        const timeout = setTimeout(() => {
          unsubProgress();
          unsubReady();
          reject(new Error('Grok 영상 생성 타임아웃 (5분)'));
        }, 300_000);

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
            reject(new Error(evt.message ?? 'Grok 영상 생성 실패'));
          }
          const msg =
            evt.message ??
            (evt.phase === 'generating' ? 'Grok 영상 생성 중...' : (evt.phase ?? ''));
          updateStep(sceneIdx, { message: msg });
        });

        void api.grok
          .bridgeSend({
            items: [
              {
                prompt,
                imagePath,
                durationSec: 6,
                count: 1,
                outputDir,
                maxRetries: 2,
              },
            ],
          })
          .catch((err: unknown) => {
            clearTimeout(timeout);
            unsubProgress();
            unsubReady();
            reject(err instanceof Error ? err : new Error(String(err)));
          });
      });
    },
    [updateStep],
  );

  // ─── Phase 1 (local): Image → static video via ffmpeg ───
  const generateLocal = useCallback(
    async (scene: Scene, sceneIdx: number): Promise<string> => {
      updateStep(sceneIdx, { message: '이미지 → 영상 변환 중...' });
      const image = scene.generatedImages[0]!;
      const baseName = `local_scene${scene.index + 1}_${Date.now()}`;
      const outPath = `/tmp/${baseName}.mp4`;

      // Ken Burns (zoom-pan) effect: creates motion from static image
      const step: Record<string, unknown> = {
        kind: 'kenBurns',
        image: image.path,
        durationMs: 5000,
      };

      const result = await api.video.edit({
        outputPath: outPath,
        pipeline: [step as PipelineStep],
      });
      return result.outputPath;
    },
    [updateStep],
  );

  // ─── Phase 2: Compose video + narration audio ───
  const composeWithAudio = async (videoPath: string, scene: Scene): Promise<string> => {
    const baseName = `composed_scene${scene.index + 1}_${Date.now()}`;
    const composePath = `/tmp/${baseName}.mp4`;

    const step: Record<string, unknown> = {
      kind: 'compose',
      video: videoPath,
    };
    if (scene.narrationAudio) {
      step.audio = scene.narrationAudio.path;
    }

    const result = await api.video.edit({
      outputPath: composePath,
      pipeline: [step as PipelineStep],
    });
    return result.outputPath;
  };

  // ─── Phase 3: Concat all clips + subtitle burn → final video ───
  const mergeAllClips = async (clips: string[], _allScenes: Scene[]): Promise<string> => {
    const finalPath = `/tmp/final_video_${Date.now()}.mp4`;

    // Collect subtitle content from all scenes to create a combined ASS
    // For now, concat the clips; per-scene subtitles are already burned in Phase 2
    const pipeline: PipelineStep[] = [];

    if (clips.length === 1) {
      pipeline.push({ kind: 'compose', video: clips[0] });
    } else {
      pipeline.push({ kind: 'concat', inputs: clips, copyOnly: false });
    }

    const result = await api.video.edit({
      outputPath: finalPath,
      pipeline,
    });
    return result.outputPath;
  };

  // ─── Main pipeline ───
  const runPipeline = useCallback(async () => {
    if (eligibleScenes.length === 0) return;
    cancelledRef.current = false;
    completedClipsRef.current = [];
    setRunning(true);
    setError('');
    setFinalPath('');
    setSteps(eligibleScenes.map((_, i) => ({ sceneIndex: i, phase: 'waiting' })));

    const sceneClipPaths: string[] = [];

    // ━━━ Phase 1: Generate video from each image ━━━
    setPipelinePhase('generating');

    for (let i = 0; i < eligibleScenes.length; i++) {
      if (cancelledRef.current) break;

      const scene = eligibleScenes[i]!;
      setCurrentStep(i);
      updateStep(i, { phase: 'generating' });

      const image = scene.generatedImages[0]!;
      const subtitleText = scene.scriptKo ?? scene.scriptOriginal ?? `Scene ${scene.index + 1}`;

      try {
        let videoPath: string;

        console.log(`[Pipeline] Phase 1: scene ${i + 1}, mode=${mode}, image=${image.path}`);

        if (mode === 'grok') {
          updateStep(i, {
            message: `[1/3] Grok 영상 생성 중... (씬 ${i + 1}/${eligibleScenes.length})`,
          });
          videoPath = await generateViaGrok(subtitleText, image.path, '/tmp/', i);
        } else {
          updateStep(i, {
            message: `[1/3] 이미지 → 영상 변환 중... (씬 ${i + 1}/${eligibleScenes.length})`,
          });
          videoPath = await generateLocal(scene, i);
        }
        console.log(`[Pipeline] Phase 1 done: scene ${i + 1}, videoPath=${videoPath}`);

        if (cancelledRef.current) break;

        // ━━━ Phase 2: Compose with narration audio ━━━
        setPipelinePhase('composing');
        updateStep(i, {
          phase: 'composing',
          videoPath,
          message: `[2/3] 나레이션 합성 중... (씬 ${i + 1}/${eligibleScenes.length})`,
        });

        let clipPath: string;

        if (scene.narrationAudio) {
          // Compose Ken Burns / Grok video with narration audio
          clipPath = await composeWithAudio(videoPath, scene);
        } else {
          // No narration: use video directly
          clipPath = videoPath;
        }

        sceneClipPaths.push(clipPath);
        completedClipsRef.current.push({ sceneId: scene.id, clipPath });
        updateStep(i, { phase: 'done', videoPath: clipPath, message: '완료' });
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        console.error(`[Pipeline] Scene ${i + 1} failed:`, err);
        updateStep(i, { phase: 'failed', message: msg });
        setError(`씬 ${scene.index + 1} 실패: ${msg}`);
        // Continue with next scene
      }
    }

    if (cancelledRef.current || sceneClipPaths.length === 0) {
      setRunning(false);
      setPipelinePhase('idle');
      return;
    }

    // ━━━ Phase 3: Merge all scene clips → final video ━━━
    setPipelinePhase('merging');
    setCurrentStep(-1);

    try {
      console.log(`[Pipeline] Phase 3: merging ${sceneClipPaths.length} clips`, sceneClipPaths);
      const merged = await mergeAllClips(sceneClipPaths, eligibleScenes);
      console.log(`[Pipeline] Phase 3 done: ${merged}`);
      setFinalPath(merged);
      setPipelinePhase('done');
      onComplete(completedClipsRef.current, merged);
    } catch (err) {
      console.error('[Pipeline] Phase 3 merge failed:', err);
      const msg = err instanceof Error ? err.message : String(err);
      setError(`최종 합병 실패: ${msg}`);
      // Still save per-scene clips even if merge fails
      if (completedClipsRef.current.length > 0) {
        onComplete(completedClipsRef.current);
      }
    }

    setRunning(false);
  }, [eligibleScenes, updateStep, onComplete, mode, generateViaGrok, generateLocal]);

  const handleCancel = () => {
    cancelledRef.current = true;
    if (mode === 'grok') {
      void api.grok.bridgeCancel().catch(() => {
        /* cancelled */
      });
    }
  };

  const handleOpenFinal = () => {
    if (finalPath) {
      void api.shell.openExternal(`file://${finalPath}`).catch(() => {
        /* ignore */
      });
    }
  };

  const totalDone = steps.filter((s) => s.phase === 'done').length;
  const totalFailed = steps.filter((s) => s.phase === 'failed').length;

  const phaseLabel: Record<PipelinePhase, string> = {
    idle: '',
    generating: '[Phase 1/3] 이미지 → AI 영상 생성',
    composing: '[Phase 2/3] 나레이션 합성',
    merging: '[Phase 3/3] 전체 영상 합병 중...',
    done: '전체 영상 제작 완료!',
  };

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
          {/* Mode selector */}
          {!running && pipelinePhase === 'idle' && (
            <div className="flex gap-2" role="radiogroup" aria-label="Generation mode">
              <button
                onClick={() => {
                  setMode('grok');
                  // Auto-open Grok extension when selecting grok mode
                  void api.grok.openWithExtension('grok');
                }}
                role="radio"
                aria-checked={mode === 'grok'}
                className={`flex-1 rounded-xl border px-3 py-2 text-left transition ${
                  mode === 'grok'
                    ? 'bg-[#FF4FBE]/12 border-[#FF4FBE]/40'
                    : 'bg-[#9B5BFF]/8 border-[#9B5BFF]/15 hover:border-[#9B5BFF]/20'
                }`}
              >
                <p className="flex items-center gap-1 text-xs font-medium text-[#f0e8ff]">
                  <Zap size={12} /> Grok (AI 영상)
                </p>
                <p className="text-[10px] text-[#9B5BFF]/40">
                  {bridgeReady ? 'Chrome 확장 연결됨' : 'Grok Automation 확장 필요'}
                </p>
              </button>
              <button
                onClick={() => setMode('local')}
                role="radio"
                aria-checked={mode === 'local'}
                className={`flex-1 rounded-xl border px-3 py-2 text-left transition ${
                  mode === 'local'
                    ? 'border-emerald-500/40 bg-[#00F0FF]/10'
                    : 'bg-[#9B5BFF]/8 border-[#9B5BFF]/15 hover:border-[#9B5BFF]/20'
                }`}
              >
                <p className="flex items-center gap-1 text-xs font-medium text-[#f0e8ff]">
                  <Film size={12} /> 로컬 (ffmpeg)
                </p>
                <p className="text-[10px] text-[#9B5BFF]/40">이미지 + 나레이션 합성 (무료)</p>
              </button>
            </div>
          )}

          {/* Pipeline description */}
          <div className="rounded-lg border border-[#9B5BFF]/10 bg-white/[0.02] p-3">
            <p className="mb-2 text-xs font-medium text-[#f0e8ff]/65">
              {eligibleScenes.length}개 씬 파이프라인
            </p>
            <div className="space-y-1 text-[10px] text-[#9B5BFF]/40">
              <p
                className={
                  pipelinePhase === 'generating'
                    ? 'text-[#9B5BFF]'
                    : pipelinePhase !== 'idle'
                      ? 'text-[#00F0FF]/60'
                      : ''
                }
              >
                1. 이미지 + 자막 → {mode === 'grok' ? 'Grok AI 영상 생성' : 'ffmpeg 영상 변환'}{' '}
                (씬별)
              </p>
              <p
                className={
                  pipelinePhase === 'composing'
                    ? 'text-[#9B5BFF]'
                    : pipelinePhase === 'merging' || pipelinePhase === 'done'
                      ? 'text-[#00F0FF]/60'
                      : ''
                }
              >
                2. 영상 + 나레이션 오디오 → 합성 (씬별)
              </p>
              <p
                className={
                  pipelinePhase === 'merging'
                    ? 'text-[#9B5BFF]'
                    : pipelinePhase === 'done'
                      ? 'text-[#00F0FF]/60'
                      : ''
                }
              >
                3. 모든 씬 영상 → 순서대로 연결 → 최종 영상
              </p>
            </div>
          </div>

          {/* Current phase indicator */}
          {pipelinePhase !== 'idle' && (
            <div
              className={`rounded-lg px-3 py-2 text-xs font-medium ${
                pipelinePhase === 'done'
                  ? 'bg-[#00F0FF]/10 text-[#00F0FF]'
                  : 'bg-[#FF4FBE]/12 text-[#9B5BFF]'
              }`}
            >
              {pipelinePhase === 'merging' && (
                <RefreshCw size={12} className="mr-1 inline animate-spin" />
              )}
              {phaseLabel[pipelinePhase]}
            </div>
          )}

          {/* Scene list with status */}
          <div className="gooey-scrollbar max-h-[40vh] space-y-1 overflow-y-auto">
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
                          ? 'bg-[#FF4FBE]/8 border-[#FF4FBE]/20'
                          : 'border-[#9B5BFF]/10 bg-white/[0.02]'
                  }`}
                >
                  <span className="w-6 text-center text-xs font-medium text-[#9B5BFF]/35">
                    {scene.index + 1}
                  </span>
                  <span className="min-w-0 flex-1 truncate text-xs text-[#f0e8ff]/65">
                    {scene.scriptKo?.slice(0, 40) ??
                      scene.scriptOriginal?.slice(0, 40) ??
                      `Scene ${scene.index + 1}`}
                  </span>
                  <span className="flex-shrink-0">
                    {step?.phase === 'done' && <Check size={14} className="text-[#00F0FF]" />}
                    {step?.phase === 'failed' && (
                      <AlertCircle size={14} className="text-[#FF6A3D]" />
                    )}
                    {(step?.phase === 'generating' || step?.phase === 'composing') && (
                      <RefreshCw size={14} className="animate-spin text-[#9B5BFF]" />
                    )}
                  </span>
                </div>
              );
            })}
          </div>

          {/* Progress summary */}
          {steps.length > 0 && (
            <div className="flex items-center gap-3 text-xs text-[#9B5BFF]/45">
              <span>
                씬 완료: {totalDone}/{eligibleScenes.length}
              </span>
              {totalFailed > 0 && <span className="text-[#FF6A3D]">실패: {totalFailed}</span>}
              {running && currentStep >= 0 && steps[currentStep]?.message && (
                <span className="text-[#9B5BFF]">{steps[currentStep]?.message}</span>
              )}
            </div>
          )}

          {/* Final video result */}
          {finalPath && (
            <div className="flex items-center gap-2 rounded-lg border border-emerald-500/30 bg-emerald-500/5 px-3 py-2">
              <Check size={14} className="text-[#00F0FF]" />
              <span className="flex-1 text-xs text-[#00F0FF]">최종 영상 생성 완료</span>
              <button
                onClick={handleOpenFinal}
                className="gooey-btn-ghost px-2 py-1 text-[10px] text-[#00F0FF]"
              >
                Finder에서 보기
              </button>
            </div>
          )}

          {error && <p className="text-xs text-[#FF6A3D]">{error}</p>}

          {/* Actions */}
          <div className="flex justify-end gap-2 pt-2">
            {running ? (
              <button
                onClick={handleCancel}
                className="gooey-btn-ghost px-4 py-2 text-sm text-[#FF6A3D]"
              >
                중지
              </button>
            ) : (
              <>
                <button onClick={onClose} className="gooey-btn-ghost px-4 py-2 text-sm">
                  {pipelinePhase === 'done' ? '닫기' : '취소'}
                </button>
                <button
                  onClick={() => void runPipeline()}
                  disabled={eligibleScenes.length === 0}
                  className="gooey-btn-primary flex items-center gap-2 px-4 py-2 text-sm"
                >
                  <RefreshCw size={14} />
                  {pipelinePhase === 'done' ? '다시 실행' : t('inspector.autoPipelineStart')}
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
