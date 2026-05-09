import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from '@tanstack/react-router';
import { Plus, Search, FolderOpen, Trash2, Film, Volume2 } from 'lucide-react';
import { api } from '../lib/api';
import { useProjectStore } from '../stores/project-store';
import { useUiStore } from '../stores/ui-store';
import { useT } from '../i18n';
import { NewProjectWizard } from '../components/NewProjectWizard';

export function ProjectListPage(): JSX.Element {
  const t = useT();
  const navigate = useNavigate();
  const { projectList, setProjectList, isListLoading, setListLoading } = useProjectStore();
  const { isNewProjectOpen, setNewProjectOpen } = useUiStore();
  const [query, setQuery] = useState('');

  const loadProjects = useCallback(async () => {
    setListLoading(true);
    try {
      const result = await api.project.list({
        sortBy: 'updatedAt',
        sortOrder: 'desc',
        limit: 100,
        query: query || undefined,
      });
      setProjectList(result.items);
    } catch (err) {
      console.error('Failed to load projects:', err);
    } finally {
      setListLoading(false);
    }
  }, [query, setProjectList, setListLoading]);

  useEffect(() => {
    void loadProjects();
  }, [loadProjects]);

  const handleDelete = async (id: string) => {
    try {
      await api.project.delete({ id, toTrash: true });
      void loadProjects();
    } catch (err) {
      console.error('Failed to delete project:', err);
    }
  };

  const handleOpen = (id: string) => {
    void navigate({ to: '/editor/$projectId', params: { projectId: id } });
  };

  const handleCreated = (projectId: string) => {
    setNewProjectOpen(false);
    void navigate({ to: '/editor/$projectId', params: { projectId } });
  };

  const formatSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
  };

  const formatDate = (iso: string): string => {
    const d = new Date(iso);
    return d.toLocaleDateString('ko-KR', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    });
  };

  return (
    <div className="flex h-full flex-col">
      {/* 타이틀바 */}
      <div className="titlebar-drag flex h-10 items-center justify-between border-b border-zinc-800 px-4">
        <span className="text-xs text-zinc-500" />
        <span className="text-xs text-zinc-500">{t('app.name')}</span>
      </div>

      <main className="flex-1 overflow-auto p-8">
        <div className="mx-auto max-w-4xl">
          {/* 헤더 */}
          <div className="mb-6 flex items-center justify-between">
            <h1 className="text-2xl font-bold tracking-tight">{t('projects.title')}</h1>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => void navigate({ to: '/tts' })}
                className="titlebar-no-drag flex items-center gap-2 rounded-lg border border-zinc-700 px-4 py-2 text-sm text-zinc-300 transition hover:bg-zinc-800"
              >
                <Volume2 size={16} />
                TTS
              </button>
              <button
                type="button"
                onClick={() => setNewProjectOpen(true)}
                className="titlebar-no-drag bg-accent hover:bg-accent-600 flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium text-white transition"
              >
                <Plus size={16} />
                {t('projects.newProject')}
              </button>
            </div>
          </div>

          {/* 검색 */}
          <div className="relative mb-6">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="titlebar-no-drag focus:border-accent w-full rounded-lg border border-zinc-700 bg-zinc-900 py-2 pl-10 pr-4 text-sm text-zinc-200 placeholder-zinc-500 focus:outline-none"
              placeholder={t('projects.search')}
            />
          </div>

          {/* 프로젝트 목록 */}
          {isListLoading ? (
            <div className="py-20 text-center text-sm text-zinc-500">{t('common.loading')}</div>
          ) : projectList.length === 0 ? (
            <div className="py-20 text-center">
              <FolderOpen size={48} className="mx-auto mb-4 text-zinc-600" />
              <p className="text-zinc-400">{t('projects.empty')}</p>
              <p className="mt-1 text-sm text-zinc-600">{t('projects.empty.description')}</p>
            </div>
          ) : (
            <div className="grid gap-3">
              {projectList.map((p) => (
                <div
                  key={p.id}
                  className="group flex items-center justify-between rounded-lg border border-zinc-800 bg-zinc-900/50 p-4 transition hover:border-zinc-700"
                >
                  <button
                    type="button"
                    onClick={() => handleOpen(p.id)}
                    className="flex-1 text-left"
                  >
                    <h3 className="font-medium text-zinc-200">{p.title}</h3>
                    <div className="mt-1 flex items-center gap-4 text-xs text-zinc-500">
                      <span className="flex items-center gap-1">
                        <Film size={12} />
                        {p.sceneCount} {t('projects.scenes')}
                      </span>
                      <span>{p.language.toUpperCase()}</span>
                      <span>{formatSize(p.sizeBytes)}</span>
                      <span>{formatDate(p.updatedAt)}</span>
                    </div>
                  </button>
                  <button
                    type="button"
                    onClick={() => void handleDelete(p.id)}
                    className="titlebar-no-drag ml-4 rounded-md p-2 text-zinc-600 opacity-0 transition hover:bg-red-950/50 hover:text-red-400 group-hover:opacity-100"
                    title={t('projects.delete')}
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>

      {isNewProjectOpen && (
        <NewProjectWizard onCreated={handleCreated} onCancel={() => setNewProjectOpen(false)} />
      )}
    </div>
  );
}
