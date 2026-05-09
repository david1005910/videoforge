import { useState } from 'react';
import { X } from 'lucide-react';
import { ulid } from 'ulid';
import { api } from '../lib/api';
import { useT } from '../i18n';

interface Props {
  onCreated: (projectId: string) => void;
  onCancel: () => void;
}

const RESOLUTIONS = [
  { label: '1080p (1920x1080)', w: 1920, h: 1080, fps: 30 },
  { label: '720p (1280x720)', w: 1280, h: 720, fps: 30 },
  { label: '4K (3840x2160)', w: 3840, h: 2160, fps: 30 },
] as const;

const LANGUAGES = [
  { value: 'ko', label: '한국어' },
  { value: 'en', label: 'English' },
  { value: 'ja', label: '日本語' },
  { value: 'zh', label: '中文' },
] as const;

export function NewProjectWizard({ onCreated, onCancel }: Props): JSX.Element {
  const t = useT();
  const [title, setTitle] = useState('');
  const [language, setLanguage] = useState('ko');
  const [resolutionIdx, setResolutionIdx] = useState(0);
  const [isCreating, setCreating] = useState(false);
  const [error, setError] = useState('');

  const handleCreate = async () => {
    const trimmed = title.trim();
    if (!trimmed) return;

    setCreating(true);
    setError('');
    try {
      const res = RESOLUTIONS[resolutionIdx]!;
      const now = new Date().toISOString();
      const result = await api.project.save({
        project: {
          id: ulid(),
          formatVersion: '1.0.0',
          title: trimmed,
          language,
          resolution: { w: res.w, h: res.h, fps: res.fps },
          scenes: [],
          assets: {},
          createdAt: now,
          updatedAt: now,
        },
        asNewProject: true,
      });
      // projectFolder 에서 ID 추출 (마지막 path segment)
      const parts = result.projectFolder.split('/');
      const projectId = parts[parts.length - 1] ?? '';
      onCreated(projectId);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
      <div className="w-full max-w-md rounded-xl border border-zinc-700 bg-zinc-900 p-6 shadow-2xl">
        {/* 헤더 */}
        <div className="mb-6 flex items-center justify-between">
          <h2 className="text-lg font-semibold">{t('wizard.title')}</h2>
          <button
            type="button"
            onClick={onCancel}
            className="rounded-md p-1 text-zinc-400 transition hover:bg-zinc-800 hover:text-zinc-200"
          >
            <X size={18} />
          </button>
        </div>

        {/* 폼 */}
        <div className="space-y-4">
          {/* 제목 */}
          <div>
            <label htmlFor="project-title" className="mb-1 block text-sm text-zinc-400">
              {t('wizard.projectTitle')}
            </label>
            <input
              id="project-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="focus:border-accent w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm focus:outline-none"
              placeholder={t('wizard.projectTitle.placeholder')}
              autoFocus
            />
          </div>

          {/* 언어 */}
          <div>
            <label htmlFor="project-language" className="mb-1 block text-sm text-zinc-400">
              {t('wizard.language')}
            </label>
            <select
              id="project-language"
              value={language}
              onChange={(e) => setLanguage(e.target.value)}
              className="focus:border-accent w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm focus:outline-none"
            >
              {LANGUAGES.map((l) => (
                <option key={l.value} value={l.value}>
                  {l.label}
                </option>
              ))}
            </select>
          </div>

          {/* 해상도 */}
          <div>
            <label htmlFor="project-resolution" className="mb-1 block text-sm text-zinc-400">
              {t('wizard.resolution')}
            </label>
            <select
              id="project-resolution"
              value={resolutionIdx}
              onChange={(e) => setResolutionIdx(Number(e.target.value))}
              className="focus:border-accent w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm focus:outline-none"
            >
              {RESOLUTIONS.map((r, i) => (
                <option key={r.label} value={i}>
                  {r.label}
                </option>
              ))}
            </select>
          </div>

          {error && <p className="rounded-md bg-red-950/50 p-2 text-xs text-red-400">{error}</p>}
        </div>

        {/* 버튼 */}
        <div className="mt-6 flex justify-end gap-3">
          <button
            type="button"
            onClick={onCancel}
            className="rounded-lg border border-zinc-700 px-4 py-2 text-sm text-zinc-300 transition hover:bg-zinc-800"
          >
            {t('wizard.cancel')}
          </button>
          <button
            type="button"
            onClick={() => void handleCreate()}
            disabled={!title.trim() || isCreating}
            className="bg-accent hover:bg-accent-600 rounded-lg px-4 py-2 text-sm font-medium text-white transition disabled:opacity-50"
          >
            {isCreating ? t('common.loading') : t('wizard.create')}
          </button>
        </div>
      </div>
    </div>
  );
}
