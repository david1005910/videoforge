import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from '@tanstack/react-router';
import {
  Plus,
  Search,
  FolderOpen,
  Trash2,
  Film,
  Volume2,
  Download,
  Upload,
  Clock,
  Settings,
} from 'lucide-react';
import { api } from '../lib/api';
import { useProjectStore } from '../stores/project-store';
import { useUiStore } from '../stores/ui-store';
import { useT } from '../i18n';
import { NewProjectWizard } from '../components/NewProjectWizard';

const RECENT_KEY = 'videoforge:recent-projects';
const MAX_RECENT = 5;

function getRecentIds(): string[] {
  try {
    const raw = localStorage.getItem(RECENT_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as string[];
  } catch {
    return [];
  }
}

function addRecentId(id: string): void {
  const ids = getRecentIds().filter((i) => i !== id);
  ids.unshift(id);
  localStorage.setItem(RECENT_KEY, JSON.stringify(ids.slice(0, MAX_RECENT)));
}

export function ProjectListPage(): JSX.Element {
  const t = useT();
  const navigate = useNavigate();
  const { projectList, setProjectList, isListLoading, setListLoading } = useProjectStore();
  const { isNewProjectOpen, setNewProjectOpen } = useUiStore();
  const [query, setQuery] = useState('');
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

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
    setDeleteConfirmId(null);
    try {
      await api.project.delete({ id, toTrash: true });
      void loadProjects();
    } catch (err) {
      console.error('Failed to delete project:', err);
    }
  };

  const handleOpen = (id: string) => {
    addRecentId(id);
    void navigate({ to: '/editor/$projectId', params: { projectId: id } });
  };

  const handleCreated = (projectId: string) => {
    setNewProjectOpen(false);
    void navigate({ to: '/editor/$projectId', params: { projectId } });
  };

  const handleExportProject = async (id: string) => {
    try {
      const project = await api.project.load(id);
      const json = JSON.stringify(project, null, 2);
      const base64 = btoa(unescape(encodeURIComponent(json)));
      await api.file.saveToDisk(base64, `${project.title.replace(/[/\\?%*:|"<>]/g, '_')}.json`);
    } catch (err) {
      console.error('Export failed:', err);
    }
  };

  const handleImportProject = async () => {
    try {
      const { filePath } = await api.dialog.selectFile(t('projects.import'), undefined, [
        { name: 'JSON', extensions: ['json'] },
      ]);
      if (!filePath) return;
      const { base64Data } = await api.file.readBase64(filePath);
      const json = decodeURIComponent(escape(atob(base64Data)));
      const parsed = JSON.parse(json) as Record<string, unknown>;
      await api.project.save({
        project: parsed as Parameters<typeof api.project.save>[0]['project'],
        asNewProject: true,
      });
      void loadProjects();
    } catch (err) {
      console.error('Import failed:', err);
    }
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
    <div className="gooey-page flex h-full flex-col">
      {/* Titlebar */}
      <div className="titlebar-drag gooey-header flex h-10 items-center justify-between px-4">
        <span className="text-xs text-white/30" />
        <span className="text-xs text-white/30">{t('app.name')}</span>
      </div>

      <main className="gooey-scrollbar flex-1 overflow-auto p-8">
        <div className="mx-auto max-w-4xl">
          {/* Header */}
          <div className="mb-6 flex items-center justify-between">
            <h1 className="gooey-text-primary text-2xl font-bold tracking-tight">
              {t('projects.title')}
            </h1>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => void navigate({ to: '/settings' })}
                className="titlebar-no-drag gooey-btn-secondary flex items-center gap-2 px-4 py-2 text-sm"
              >
                <Settings size={16} />
                {t('app.settings')}
              </button>
              <button
                type="button"
                onClick={() => void navigate({ to: '/tts' })}
                className="titlebar-no-drag gooey-btn-secondary flex items-center gap-2 px-4 py-2 text-sm"
              >
                <Volume2 size={16} />
                TTS
              </button>
              <button
                type="button"
                onClick={() => void handleImportProject()}
                className="titlebar-no-drag gooey-btn-secondary flex items-center gap-2 px-4 py-2 text-sm"
              >
                <Upload size={16} />
                {t('projects.import')}
              </button>
              <button
                type="button"
                onClick={() => setNewProjectOpen(true)}
                className="titlebar-no-drag gooey-btn-primary flex items-center gap-2 px-4 py-2 text-sm"
              >
                <Plus size={16} />
                {t('projects.newProject')}
              </button>
            </div>
          </div>

          {/* Search */}
          <div className="relative mb-6">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="titlebar-no-drag gooey-input w-full py-2 pl-10 pr-4 text-sm"
              placeholder={t('projects.search')}
            />
          </div>

          {/* Recent Projects */}
          {!query &&
            !isListLoading &&
            projectList.length > 0 &&
            (() => {
              const recentIds = getRecentIds();
              const recentProjects = recentIds
                .map((id) => projectList.find((p) => p.id === id))
                .filter((p): p is NonNullable<typeof p> => !!p);
              if (recentProjects.length === 0) return null;
              return (
                <div className="mb-6">
                  <h2 className="gooey-text-muted mb-2 flex items-center gap-1.5 text-xs font-medium">
                    <Clock size={12} />
                    Recent
                  </h2>
                  <div className="flex gap-2 overflow-x-auto pb-1">
                    {recentProjects.map((p) => (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => handleOpen(p.id)}
                        className="gooey-card shrink-0 px-4 py-3 text-left"
                        style={{ minWidth: '180px', maxWidth: '220px' }}
                      >
                        <p className="truncate text-sm font-medium text-white/85">{p.title}</p>
                        <p className="mt-1 text-[10px] text-white/30">
                          {p.sceneCount} {t('projects.scenes')} · {formatDate(p.updatedAt)}
                        </p>
                      </button>
                    ))}
                  </div>
                </div>
              );
            })()}

          {/* Project List */}
          {isListLoading ? (
            <div className="gooey-text-muted py-20 text-center text-sm">{t('common.loading')}</div>
          ) : projectList.length === 0 ? (
            <div className="py-20 text-center">
              <FolderOpen size={48} className="mx-auto mb-4 text-white/20" />
              <p className="text-white/50">{t('projects.empty')}</p>
              <p className="mt-1 text-sm text-white/25">{t('projects.empty.description')}</p>
            </div>
          ) : (
            <div className="grid gap-3">
              {projectList.map((p) => (
                <div key={p.id} className="gooey-card group flex items-center justify-between p-4">
                  <button
                    type="button"
                    onClick={() => handleOpen(p.id)}
                    className="flex-1 text-left"
                  >
                    <h3 className="font-medium text-white/90">{p.title}</h3>
                    <div className="mt-1 flex items-center gap-4 text-xs text-white/35">
                      <span className="flex items-center gap-1">
                        <Film size={12} />
                        {p.sceneCount} {t('projects.scenes')}
                      </span>
                      <span>{p.language.toUpperCase()}</span>
                      <span>{formatSize(p.sizeBytes)}</span>
                      <span>{formatDate(p.updatedAt)}</span>
                    </div>
                  </button>
                  <div className="ml-4 flex gap-1 opacity-0 transition group-hover:opacity-100">
                    <button
                      type="button"
                      onClick={() => void handleExportProject(p.id)}
                      className="titlebar-no-drag gooey-btn-ghost rounded-xl p-2"
                      title={t('projects.export')}
                    >
                      <Download size={16} />
                    </button>
                    <button
                      type="button"
                      onClick={() => setDeleteConfirmId(p.id)}
                      className="titlebar-no-drag rounded-xl p-2 text-white/30 transition hover:bg-red-500/10 hover:text-red-400"
                      title={t('projects.delete')}
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>

      {isNewProjectOpen && (
        <NewProjectWizard onCreated={handleCreated} onCancel={() => setNewProjectOpen(false)} />
      )}

      {/* Delete confirmation */}
      {deleteConfirmId && (
        <div className="gooey-modal-backdrop fixed inset-0 z-50 flex items-center justify-center">
          <div className="gooey-modal w-full max-w-xs p-5">
            <h3 className="text-sm font-semibold text-white/95">{t('projects.delete.confirm')}</h3>
            <p className="mt-1 text-xs text-white/40">{t('projects.delete.description')}</p>
            <div className="mt-4 flex justify-end gap-2">
              <button
                onClick={() => setDeleteConfirmId(null)}
                className="gooey-btn-ghost px-3 py-1.5 text-xs"
              >
                {t('common.cancel')}
              </button>
              <button
                onClick={() => void handleDelete(deleteConfirmId)}
                className="gooey-btn-danger px-3 py-1.5 text-xs"
              >
                {t('projects.delete')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
