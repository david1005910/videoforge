import { useState, useEffect, useCallback, useRef } from 'react';
import { api } from '../lib/api';
import type { GrokProgressEvent, GrokVideoReadyEvent } from '@videoforge/shared';

interface QueueItem {
  taskId: string;
  prompt: string;
  phase: string;
  percent: number;
  localPath?: string | undefined;
  error?: string | undefined;
}

export function GrokPage() {
  const [connected, setConnected] = useState(false);
  const [prompt, setPrompt] = useState('');
  const [outputDir, setOutputDir] = useState('');
  const [queue, setQueue] = useState<QueueItem[]>([]);
  const [logging, setLogging] = useState(false);
  const cleanupRef = useRef<(() => void)[]>([]);

  const checkStatus = useCallback(async () => {
    try {
      const s = await api.grok.status();
      setConnected(s.browserConnected);
    } catch {
      setConnected(false);
    }
  }, []);

  useEffect(() => {
    void checkStatus();

    const offProgress = api.grok.onProgress((raw) => {
      const evt = raw as GrokProgressEvent;
      setQueue((prev) => {
        const idx = prev.findIndex((q) => q.taskId === evt.taskId);
        if (idx >= 0) {
          const updated = [...prev];
          const base = { ...updated[idx]!, phase: evt.phase, percent: evt.percent };
          if (evt.phase === 'failed' && evt.message) {
            updated[idx] = { ...base, error: evt.message };
          } else {
            updated[idx] = base;
          }
          return updated;
        }
        return [
          ...prev,
          { taskId: evt.taskId, prompt: '', phase: evt.phase, percent: evt.percent },
        ];
      });
    });

    const offReady = api.grok.onVideoReady((raw) => {
      const evt = raw as GrokVideoReadyEvent;
      setQueue((prev) =>
        prev.map((q) =>
          q.taskId === evt.taskId
            ? { ...q, phase: 'complete', percent: 100, localPath: evt.localPath }
            : q,
        ),
      );
    });

    cleanupRef.current = [offProgress, offReady];
    return () => cleanupRef.current.forEach((fn) => fn());
  }, [checkStatus]);

  const handleLogin = async () => {
    setLogging(true);
    try {
      await api.grok.login();
      setConnected(true);
    } catch (err) {
      console.error('grok.login failed', err);
    } finally {
      setLogging(false);
    }
  };

  const handleGenerate = async () => {
    if (!prompt.trim() || !outputDir) return;
    try {
      const res = await api.grok.generate({
        prompt: prompt.trim(),
        outputDir,
        durationSec: 6,
        count: 1,
        maxRetries: 2,
      });
      setQueue((prev) => [
        ...prev,
        { taskId: res.taskId, prompt: prompt.trim(), phase: 'queued', percent: 0 },
      ]);
      setPrompt('');
    } catch (err) {
      console.error('grok.generate failed', err);
    }
  };

  const handleSelectFolder = async () => {
    try {
      const res = await api.dialog.selectFolder('Select output folder');
      if (res.folderPath) setOutputDir(res.folderPath);
    } catch (err) {
      console.error('selectFolder failed', err);
    }
  };

  const handleClose = async () => {
    await api.grok.close();
    setConnected(false);
  };

  const phaseColor = (phase: string) => {
    switch (phase) {
      case 'complete':
        return 'text-green-400';
      case 'failed':
        return 'text-red-400';
      case 'generating':
        return 'text-yellow-400';
      default:
        return 'text-zinc-400';
    }
  };

  return (
    <div className="flex h-full flex-col bg-zinc-950 text-zinc-100">
      <header className="flex items-center gap-4 border-b border-zinc-800 px-6 py-3">
        <h1 className="text-lg font-semibold">Grok Video Generation</h1>
        <span className={`text-xs ${connected ? 'text-green-400' : 'text-zinc-500'}`}>
          {connected ? 'Connected' : 'Disconnected'}
        </span>
        <div className="flex-1" />
        {connected ? (
          <button
            onClick={handleClose}
            className="rounded-md bg-zinc-800 px-3 py-1.5 text-sm hover:bg-zinc-700"
          >
            Close Browser
          </button>
        ) : (
          <button
            onClick={handleLogin}
            disabled={logging}
            className="rounded-md bg-violet-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-violet-500 disabled:opacity-50"
          >
            {logging ? 'Opening…' : 'Login to Grok'}
          </button>
        )}
      </header>

      <div className="flex-1 overflow-auto p-6">
        {/* Generate form */}
        <div className="mb-6 space-y-3">
          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="Enter video generation prompt…"
            rows={3}
            className="w-full rounded-lg border border-zinc-700 bg-zinc-900 p-3 text-sm text-zinc-200 placeholder:text-zinc-600"
          />
          <div className="flex items-center gap-3">
            <button
              onClick={handleSelectFolder}
              className="rounded-md border border-zinc-700 bg-zinc-900 px-3 py-1.5 text-sm text-zinc-300 hover:bg-zinc-800"
            >
              {outputDir || 'Select Output Folder'}
            </button>
            <div className="flex-1" />
            <button
              onClick={handleGenerate}
              disabled={!prompt.trim() || !outputDir || !connected}
              className="rounded-md bg-violet-600 px-4 py-1.5 text-sm font-medium text-white hover:bg-violet-500 disabled:opacity-50"
            >
              Generate
            </button>
          </div>
        </div>

        {/* Queue */}
        <h2 className="mb-3 text-sm font-medium text-zinc-400">Queue ({queue.length})</h2>
        {queue.length === 0 ? (
          <p className="text-sm text-zinc-600">No tasks yet. Generate a video to get started.</p>
        ) : (
          <div className="space-y-2">
            {queue.map((item) => (
              <div key={item.taskId} className="rounded-lg border border-zinc-800 bg-zinc-900 p-4">
                <div className="flex items-center justify-between">
                  <p className="truncate text-sm font-medium">{item.prompt || item.taskId}</p>
                  <span className={`text-xs ${phaseColor(item.phase)}`}>{item.phase}</span>
                </div>
                {item.phase !== 'complete' && item.phase !== 'failed' && (
                  <div className="mt-2 h-1.5 rounded-full bg-zinc-800">
                    <div
                      className="h-full rounded-full bg-violet-600 transition-all"
                      style={{ width: `${item.percent}%` }}
                    />
                  </div>
                )}
                {item.localPath && (
                  <p className="mt-1 truncate text-xs text-zinc-500">{item.localPath}</p>
                )}
                {item.error && <p className="mt-1 text-xs text-red-400">{item.error}</p>}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
