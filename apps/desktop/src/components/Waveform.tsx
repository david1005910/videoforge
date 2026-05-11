import { useEffect, useRef } from 'react';
import WaveSurfer from 'wavesurfer.js';

interface Props {
  audioPath: string;
  isPlaying: boolean;
  onPlayPause: () => void;
  onFinish: () => void;
}

export function Waveform({ audioPath, isPlaying, onPlayPause, onFinish }: Props): JSX.Element {
  const containerRef = useRef<HTMLDivElement>(null);
  const wsRef = useRef<WaveSurfer | null>(null);
  const readyRef = useRef(false);
  const onPlayPauseRef = useRef(onPlayPause);
  const onFinishRef = useRef(onFinish);

  // Keep refs current without triggering WaveSurfer recreation
  useEffect(() => {
    onPlayPauseRef.current = onPlayPause;
  }, [onPlayPause]);
  useEffect(() => {
    onFinishRef.current = onFinish;
  }, [onFinish]);

  useEffect(() => {
    if (!containerRef.current) return;

    readyRef.current = false;

    const ws = WaveSurfer.create({
      container: containerRef.current,
      waveColor: 'rgba(255,255,255,0.3)',
      progressColor: '#a855f7',
      cursorColor: '#c084fc',
      cursorWidth: 1,
      barWidth: 2,
      barGap: 1,
      barRadius: 2,
      height: 64,
      normalize: true,
    });

    ws.on('ready', () => {
      readyRef.current = true;
    });
    ws.on('finish', () => onFinishRef.current());
    ws.on('click', () => onPlayPauseRef.current());
    ws.on('error', (err) => {
      console.error('[Waveform] load error:', err);
    });

    const url =
      audioPath.startsWith('blob:') || audioPath.startsWith('http')
        ? audioPath
        : `file://${audioPath}`;
    void ws.load(url);
    wsRef.current = ws;

    return () => {
      ws.destroy();
      wsRef.current = null;
      readyRef.current = false;
    };
  }, [audioPath]);

  useEffect(() => {
    const ws = wsRef.current;
    if (!ws) return;

    const doPlayPause = () => {
      if (isPlaying && !ws.isPlaying()) {
        void ws.play().catch((err: unknown) => console.error('[Waveform] play error:', err));
      } else if (!isPlaying && ws.isPlaying()) {
        ws.pause();
      }
    };

    if (readyRef.current) {
      doPlayPause();
    } else if (isPlaying) {
      // Audio not ready yet — wait for ready then auto-play
      const onReady = () => {
        readyRef.current = true;
        doPlayPause();
      };
      ws.once('ready', onReady);
      return () => {
        ws.un('ready', onReady);
      };
    }
  }, [isPlaying]);

  return <div ref={containerRef} className="gooey-card w-full cursor-pointer p-2" />;
}
