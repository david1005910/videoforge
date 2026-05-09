import { useState } from 'react';
import { api } from '../lib/api';
import type { ChatThumbnailResponse } from '@videoforge/shared';

/**
 * P8-07: Thumbnail analysis result visualization (score, suggestions).
 */
export function ThumbnailAnalysisPage() {
  const [imagePath, setImagePath] = useState('');
  const [title, setTitle] = useState('');
  const [genre, setGenre] = useState('');
  const [result, setResult] = useState<ChatThumbnailResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSelectImage = async () => {
    try {
      const res = await api.dialog.selectFolder('Select thumbnail folder');
      if (res.folderPath) setImagePath(res.folderPath);
    } catch {
      /* noop */
    }
  };

  const handleAnalyze = async () => {
    if (!imagePath || !title.trim()) return;
    setLoading(true);
    setError('');
    setResult(null);

    try {
      const res = await api.chat.thumbnail({
        imagePath,
        title: title.trim(),
        channelGenre: genre.trim() || undefined,
      });
      setResult(res);
    } catch (err) {
      setError(String(err));
    } finally {
      setLoading(false);
    }
  };

  const scoreColor = (score: number) => {
    if (score >= 80) return 'text-green-400';
    if (score >= 60) return 'text-yellow-400';
    if (score >= 40) return 'text-orange-400';
    return 'text-red-400';
  };

  return (
    <div className="flex h-full flex-col bg-zinc-950 text-zinc-100">
      <header className="border-b border-zinc-800 px-6 py-3">
        <h1 className="text-lg font-semibold">Thumbnail Analysis</h1>
        <p className="text-xs text-zinc-500">AI-powered clickability prediction</p>
      </header>

      <div className="flex-1 overflow-auto p-6">
        <div className="mx-auto max-w-2xl space-y-6">
          {/* Input Form */}
          <section className="space-y-3">
            <div>
              <label className="mb-1 block text-xs text-zinc-500">Thumbnail Image</label>
              <div className="flex gap-2">
                <input
                  value={imagePath}
                  onChange={(e) => setImagePath(e.target.value)}
                  placeholder="/path/to/thumbnail.png"
                  className="flex-1 rounded-md border border-zinc-700 bg-zinc-900 px-3 py-1.5 text-sm text-zinc-200 placeholder:text-zinc-600"
                />
                <button
                  onClick={handleSelectImage}
                  className="rounded-md border border-zinc-700 bg-zinc-900 px-3 py-1.5 text-sm hover:bg-zinc-800"
                >
                  Browse
                </button>
              </div>
            </div>
            <div>
              <label className="mb-1 block text-xs text-zinc-500">Video Title</label>
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Enter video title…"
                className="w-full rounded-md border border-zinc-700 bg-zinc-900 px-3 py-1.5 text-sm text-zinc-200 placeholder:text-zinc-600"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs text-zinc-500">Channel Genre (optional)</label>
              <input
                value={genre}
                onChange={(e) => setGenre(e.target.value)}
                placeholder="e.g., Tech, Gaming, Education…"
                className="w-full rounded-md border border-zinc-700 bg-zinc-900 px-3 py-1.5 text-sm text-zinc-200 placeholder:text-zinc-600"
              />
            </div>
            <button
              onClick={handleAnalyze}
              disabled={loading || !imagePath || !title.trim()}
              className="rounded-md bg-violet-600 px-4 py-2 text-sm font-medium text-white hover:bg-violet-500 disabled:opacity-50"
            >
              {loading ? 'Analyzing…' : 'Analyze Thumbnail'}
            </button>
          </section>

          {error && <p className="text-sm text-red-400">{error}</p>}

          {/* Results */}
          {result && (
            <section className="space-y-4">
              {/* Score */}
              <div className="rounded-lg border border-zinc-800 bg-zinc-900 p-6 text-center">
                <p className="text-xs uppercase tracking-wider text-zinc-500">Clickability Score</p>
                <p className={`mt-2 text-5xl font-bold ${scoreColor(result.score)}`}>
                  {result.score}
                </p>
                <p className="mt-1 text-sm text-zinc-400">/100</p>
              </div>

              {/* Strengths */}
              {result.strengths.length > 0 && (
                <div className="rounded-lg border border-zinc-800 bg-zinc-900 p-4">
                  <h3 className="mb-2 text-sm font-medium text-green-400">Strengths</h3>
                  <ul className="space-y-1">
                    {result.strengths.map((s, i) => (
                      <li key={i} className="flex items-start gap-2 text-sm text-zinc-300">
                        <span className="mt-0.5 text-green-500">+</span>
                        {s}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Weaknesses */}
              {result.weaknesses.length > 0 && (
                <div className="rounded-lg border border-zinc-800 bg-zinc-900 p-4">
                  <h3 className="mb-2 text-sm font-medium text-red-400">Weaknesses</h3>
                  <ul className="space-y-1">
                    {result.weaknesses.map((w, i) => (
                      <li key={i} className="flex items-start gap-2 text-sm text-zinc-300">
                        <span className="mt-0.5 text-red-500">-</span>
                        {w}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Suggestions */}
              {result.suggestions.length > 0 && (
                <div className="rounded-lg border border-zinc-800 bg-zinc-900 p-4">
                  <h3 className="mb-2 text-sm font-medium text-violet-400">Suggestions</h3>
                  <ul className="space-y-1">
                    {result.suggestions.map((s, i) => (
                      <li key={i} className="flex items-start gap-2 text-sm text-zinc-300">
                        <span className="mt-0.5 text-violet-500">&bull;</span>
                        {s}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </section>
          )}
        </div>
      </div>
    </div>
  );
}
