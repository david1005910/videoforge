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
    if (score >= 80) return 'text-emerald-400';
    if (score >= 60) return 'text-amber-400';
    if (score >= 40) return 'text-orange-400';
    return 'text-red-400';
  };

  return (
    <div className="gooey-page flex h-full flex-col">
      <header className="gooey-header px-6 py-3">
        <h1 className="gooey-text-primary text-lg font-semibold">Thumbnail Analysis</h1>
        <p className="gooey-text-muted text-xs">AI-powered clickability prediction</p>
      </header>

      <div className="gooey-scrollbar flex-1 overflow-auto p-6">
        <div className="mx-auto max-w-2xl space-y-6">
          {/* Input Form */}
          <section className="space-y-3">
            <div>
              <label className="gooey-text-muted mb-1 block text-xs">Thumbnail Image</label>
              <div className="flex gap-2">
                <input
                  value={imagePath}
                  onChange={(e) => setImagePath(e.target.value)}
                  placeholder="/path/to/thumbnail.png"
                  className="gooey-input flex-1 px-3 py-1.5 text-sm"
                />
                <button
                  onClick={handleSelectImage}
                  className="gooey-btn-secondary px-3 py-1.5 text-sm"
                >
                  Browse
                </button>
              </div>
            </div>
            <div>
              <label className="gooey-text-muted mb-1 block text-xs">Video Title</label>
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Enter video title…"
                className="gooey-input w-full px-3 py-1.5 text-sm"
              />
            </div>
            <div>
              <label className="gooey-text-muted mb-1 block text-xs">
                Channel Genre (optional)
              </label>
              <input
                value={genre}
                onChange={(e) => setGenre(e.target.value)}
                placeholder="e.g., Tech, Gaming, Education…"
                className="gooey-input w-full px-3 py-1.5 text-sm"
              />
            </div>
            <button
              onClick={handleAnalyze}
              disabled={loading || !imagePath || !title.trim()}
              className="gooey-btn-primary px-4 py-2 text-sm"
            >
              {loading ? 'Analyzing…' : 'Analyze Thumbnail'}
            </button>
          </section>

          {error && <p className="text-sm text-red-400">{error}</p>}

          {/* Results */}
          {result && (
            <section className="space-y-4">
              {/* Score */}
              <div className="gooey-score p-6 text-center">
                <p className="gooey-text-muted text-xs uppercase tracking-wider">
                  Clickability Score
                </p>
                <p className={`mt-2 text-5xl font-bold ${scoreColor(result.score)}`}>
                  {result.score}
                </p>
                <p className="gooey-text-muted mt-1 text-sm">/100</p>
              </div>

              {/* Strengths */}
              {result.strengths.length > 0 && (
                <div className="gooey-card p-4">
                  <h3 className="mb-2 text-sm font-medium text-emerald-400">Strengths</h3>
                  <ul className="space-y-1">
                    {result.strengths.map((s, i) => (
                      <li key={i} className="flex items-start gap-2 text-sm text-white/70">
                        <span className="mt-0.5 text-emerald-500">+</span>
                        {s}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Weaknesses */}
              {result.weaknesses.length > 0 && (
                <div className="gooey-card p-4">
                  <h3 className="mb-2 text-sm font-medium text-red-400">Weaknesses</h3>
                  <ul className="space-y-1">
                    {result.weaknesses.map((w, i) => (
                      <li key={i} className="flex items-start gap-2 text-sm text-white/70">
                        <span className="mt-0.5 text-red-500">-</span>
                        {w}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Suggestions */}
              {result.suggestions.length > 0 && (
                <div className="gooey-card p-4">
                  <h3 className="mb-2 text-sm font-medium text-violet-400">Suggestions</h3>
                  <ul className="space-y-1">
                    {result.suggestions.map((s, i) => (
                      <li key={i} className="flex items-start gap-2 text-sm text-white/70">
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
