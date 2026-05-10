import { useEffect, useRef, useCallback } from 'react';
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

  const handleFinish = useCallback(() => onFinish(), [onFinish]);

  useEffect(() => {
    if (!containerRef.current) return;

    const ws = WaveSurfer.create({
      container: containerRef.current,
      waveColor: '#52525b',
      progressColor: '#6d28d9',
      cursorColor: '#a78bfa',
      cursorWidth: 1,
      barWidth: 2,
      barGap: 1,
      barRadius: 2,
      height: 64,
      normalize: true,
    });

    ws.on('finish', handleFinish);
    ws.on('click', () => onPlayPause());

    const url =
      audioPath.startsWith('blob:') || audioPath.startsWith('http')
        ? audioPath
        : `file://${audioPath}`;
    void ws.load(url);
    wsRef.current = ws;

    return () => {
      ws.destroy();
      wsRef.current = null;
    };
  }, [audioPath, handleFinish, onPlayPause]);

  useEffect(() => {
    const ws = wsRef.current;
    if (!ws) return;

    if (isPlaying && !ws.isPlaying()) {
      void ws.play();
    } else if (!isPlaying && ws.isPlaying()) {
      ws.pause();
    }
  }, [isPlaying]);

  return (
    <div
      ref={containerRef}
      className="w-full cursor-pointer rounded-lg border border-zinc-800 bg-zinc-900/50 p-2"
    />
  );
}
