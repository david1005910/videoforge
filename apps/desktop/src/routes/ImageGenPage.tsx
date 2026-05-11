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
    <div className="gooey-page flex h-full flex-col">
      <header className="gooey-header flex items-center gap-4 px-6 py-3">
        <h1 className="gooey-text-primary text-lg font-semibold">Image Generation</h1>
        <div className="gooey-tab-group flex gap-1">
          <button
            className={`gooey-tab ${tab === 'whisk' ? 'gooey-tab-active' : 'gooey-tab-inactive'}`}
            onClick={() => setTab('whisk')}
          >
            Whisk
          </button>
          <button
            className={`gooey-tab ${tab === 'imagefx' ? 'gooey-tab-active' : 'gooey-tab-inactive'}`}
            onClick={() => setTab('imagefx')}
          >
            ImageFX
          </button>
        </div>
        <div className="flex-1" />
        <button onClick={handleLogin} className="gooey-btn-secondary px-3 py-1.5 text-sm">
          Login
        </button>
      </header>

      <div className="gooey-scrollbar flex-1 overflow-auto p-6">
        <div className="mb-6 space-y-3">
          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder={`Enter ${tab === 'whisk' ? 'Whisk' : 'ImageFX'} prompt…`}
            rows={3}
            className="gooey-input w-full p-3 text-sm"
          />
          <div className="flex items-center gap-3">
            <button
              onClick={handleSelectFolder}
              className="gooey-btn-secondary px-3 py-1.5 text-sm"
            >
              {outputDir || 'Select Output Folder'}
            </button>
            <div className="flex-1" />
            <button
              onClick={handleGenerate}
              disabled={!prompt.trim() || !outputDir || generating}
              className="gooey-btn-primary px-4 py-1.5 text-sm"
            >
              {generating ? 'Generating…' : 'Generate'}
            </button>
          </div>
        </div>

        {error && <p className="mb-4 text-sm text-red-400">{error}</p>}

        {results.length > 0 && (
          <div>
            <h2 className="gooey-text-secondary mb-3 text-sm font-medium">
              Results ({results.length})
            </h2>
            <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
              {results.map((img, i) => (
                <div key={i} className="gooey-card p-3">
                  <p className="truncate text-xs text-white/40">{img.path.split('/').pop()}</p>
                  <p className="text-xs text-white/25">
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
