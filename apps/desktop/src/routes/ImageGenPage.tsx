import { useState } from 'react';
import { api } from '../lib/api';
import type { WhiskGenerateResponse, ImagefxGenerateResponse } from '@videoforge/shared';

interface GeneratedImage {
  path: string;
  width: number;
  height: number;
}

export function ImageGenPage() {
  const [tab, setTab] = useState<'whisk' | 'imagefx'>('whisk');
  const [prompt, setPrompt] = useState('');
  const [outputDir, setOutputDir] = useState('');
  const [generating, setGenerating] = useState(false);
  const [results, setResults] = useState<GeneratedImage[]>([]);
  const [error, setError] = useState('');

  const handleSelectFolder = async () => {
    try {
      const res = await api.dialog.selectFolder('Select output folder');
      if (res.folderPath) setOutputDir(res.folderPath);
    } catch (err) {
      console.error('selectFolder failed', err);
    }
  };

  const handleGenerate = async () => {
    if (!prompt.trim() || !outputDir) return;
    setGenerating(true);
    setError('');
    setResults([]);

    try {
      let res: WhiskGenerateResponse | ImagefxGenerateResponse;
      if (tab === 'whisk') {
        res = await api.whisk.generate({
          prompt: prompt.trim(),
          outputDir,
          count: 4,
          aspectRatio: '16:9',
          refIds: {},
        });
      } else {
        res = await api.imagefx.generate({
          prompt: prompt.trim(),
          outputDir,
          count: 4,
          aspectRatio: '16:9',
        });
      }
      setResults(res.images);
    } catch (err) {
      setError(String(err));
    } finally {
      setGenerating(false);
    }
  };

  const handleLogin = async () => {
    try {
      if (tab === 'imagefx') {
        await api.imagefx.login();
      }
      // Whisk shares the login flow via uploadRef
    } catch (err) {
      setError(String(err));
    }
  };

  return (
    <div className="flex h-full flex-col bg-zinc-950 text-zinc-100">
      <header className="flex items-center gap-4 border-b border-zinc-800 px-6 py-3">
        <h1 className="text-lg font-semibold">Image Generation</h1>
        <div className="flex gap-1 rounded-lg bg-zinc-900 p-1">
          <button
            className={`rounded-md px-3 py-1 text-sm ${tab === 'whisk' ? 'bg-violet-600 text-white' : 'text-zinc-400 hover:text-zinc-200'}`}
            onClick={() => setTab('whisk')}
          >
            Whisk
          </button>
          <button
            className={`rounded-md px-3 py-1 text-sm ${tab === 'imagefx' ? 'bg-violet-600 text-white' : 'text-zinc-400 hover:text-zinc-200'}`}
            onClick={() => setTab('imagefx')}
          >
            ImageFX
          </button>
        </div>
        <div className="flex-1" />
        <button
          onClick={handleLogin}
          className="rounded-md bg-zinc-800 px-3 py-1.5 text-sm hover:bg-zinc-700"
        >
          Login
        </button>
      </header>

      <div className="flex-1 overflow-auto p-6">
        <div className="mb-6 space-y-3">
          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder={`Enter ${tab === 'whisk' ? 'Whisk' : 'ImageFX'} prompt…`}
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
              disabled={!prompt.trim() || !outputDir || generating}
              className="rounded-md bg-violet-600 px-4 py-1.5 text-sm font-medium text-white hover:bg-violet-500 disabled:opacity-50"
            >
              {generating ? 'Generating…' : 'Generate'}
            </button>
          </div>
        </div>

        {error && <p className="mb-4 text-sm text-red-400">{error}</p>}

        {results.length > 0 && (
          <div>
            <h2 className="mb-3 text-sm font-medium text-zinc-400">Results ({results.length})</h2>
            <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
              {results.map((img, i) => (
                <div key={i} className="rounded-lg border border-zinc-800 bg-zinc-900 p-2">
                  <p className="truncate text-xs text-zinc-500">{img.path.split('/').pop()}</p>
                  <p className="text-xs text-zinc-600">
                    {img.width}×{img.height}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
