import { useEffect, useRef } from 'react';

interface Props {
  /** ASS subtitle content string */
  assContent: string;
  /** Preview resolution */
  width?: number;
  height?: number;
}

/**
 * P3-08: ASS 자막 미리보기 컴포넌트.
 *
 * libass-wasm (SubtitlesOctopus)를 사용하여 canvas에 자막 렌더링.
 * 비디오 없이 단독 미리보기 가능.
 */
export function SubtitlePreview({ assContent, width = 960, height = 540 }: Props): JSX.Element {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const instanceRef = useRef<SubtitlesOctopusInstance | null>(null);

  useEffect(() => {
    if (!canvasRef.current || !assContent) return;

    const canvas = canvasRef.current;

    // Clear canvas with dark background
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.fillStyle = '#18181b';
      ctx.fillRect(0, 0, width, height);
    }

    let instance: SubtitlesOctopusInstance | null = null;

    async function initOctopus() {
      try {
        const SubtitlesOctopus = (await import('libass-wasm')).default;

        // Create a blob URL from ASS content
        const blob = new Blob([assContent], { type: 'text/plain' });
        const subUrl = URL.createObjectURL(blob);

        instance = new SubtitlesOctopus({
          canvas,
          subUrl,
          workerUrl: new URL('libass-wasm/dist/js/subtitles-octopus-worker.js', import.meta.url)
            .href,
          legacyWorkerUrl: new URL(
            'libass-wasm/dist/js/subtitles-octopus-worker-legacy.js',
            import.meta.url,
          ).href,
        }) as SubtitlesOctopusInstance;

        instanceRef.current = instance;

        // Render at t=1s to show first subtitle
        setTimeout(() => {
          instance?.setCurrentTime(1);
        }, 500);
      } catch (err) {
        console.warn('SubtitlesOctopus init failed, using canvas fallback:', err);
        renderFallback(canvas, assContent, width, height);
      }
    }

    void initOctopus();

    return () => {
      if (instance) {
        try {
          instance.dispose();
        } catch {
          // ignore cleanup errors
        }
      }
      instanceRef.current = null;
    };
  }, [assContent, width, height]);

  return (
    <div className="relative overflow-hidden rounded-lg border border-zinc-800">
      <canvas
        ref={canvasRef}
        width={width}
        height={height}
        className="block w-full"
        style={{ aspectRatio: `${width}/${height}` }}
      />
      <div className="absolute bottom-2 right-2 rounded bg-zinc-900/80 px-2 py-0.5 text-[10px] text-zinc-500">
        {width}×{height}
      </div>
    </div>
  );
}

/**
 * libass-wasm 로드 실패 시 canvas 2D fallback.
 * 첫 번째 Dialogue 라인의 텍스트를 표시.
 */
function renderFallback(canvas: HTMLCanvasElement, assContent: string, w: number, h: number): void {
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  ctx.fillStyle = '#18181b';
  ctx.fillRect(0, 0, w, h);

  // Parse first dialogue line
  const dialogueMatch = /^Dialogue:.*,,(.+)$/m.exec(assContent);
  if (!dialogueMatch?.[1]) return;

  const text = dialogueMatch[1]
    .replace(/\{[^}]*\}/g, '') // remove ASS tags
    .replace(/\\N/g, '\n')
    .replace(/\\n/g, '\n');

  ctx.font = `bold ${Math.round(h / 15)}px "Noto Sans KR", sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'bottom';

  // Outline
  ctx.strokeStyle = '#000';
  ctx.lineWidth = 3;
  ctx.strokeText(text, w / 2, h - Math.round(h / 10));

  // Fill
  ctx.fillStyle = '#fff';
  ctx.fillText(text, w / 2, h - Math.round(h / 10));
}

interface SubtitlesOctopusInstance {
  setCurrentTime(time: number): void;
  dispose(): void;
}
