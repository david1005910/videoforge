import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate } from '@tanstack/react-router';
import { ArrowLeft, Check, Keyboard, X } from 'lucide-react';
import { ulid } from 'ulid';
import { api } from '../../lib/api';
import { useProjectStore } from '../../stores/project-store';
import { useT } from '../../i18n';
import { SceneList } from './SceneList';
import { ScriptEditor } from './ScriptEditor';
import { Inspector } from './Inspector';
import { Timeline } from './Timeline';
import { ExportDialog } from './ExportDialog';
import type { Project, Scene } from '@videoforge/shared';

export function EditorPage(): JSX.Element {
  const t = useT();
  const navigate = useNavigate();
  const { projectId } = useParams({ from: '/editor/$projectId' });
  const { currentProject, setCurrentProject, pushProject, undo, redo } = useProjectStore();
  const [selectedSceneId, setSelectedSceneId] = useState<string | null>(null);
  const [showExport, setShowExport] = useState(false);
  const [showShortcuts, setShowShortcuts] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle');
  const [editingTitle, setEditingTitle] = useState(false);
  const [titleDraft, setTitleDraft] = useState('');
  const titleInputRef = useRef<HTMLInputElement>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const project = await api.project.load(projectId);
        if (!cancelled) {
          const p = project;
          setCurrentProject(p);
          const first = p.scenes[0];
          if (first) setSelectedSceneId(first.id);
        }
      } catch (err) {
        console.error('Failed to load project:', err);
        if (!cancelled) void navigate({ to: '/' });
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, [projectId, setCurrentProject, navigate]);

  const selectedScene = currentProject?.scenes.find((s) => s.id === selectedSceneId) ?? null;

  const saveProject = useCallback(
    async (updated: Project) => {
      pushProject(updated);
      setSaveStatus('saving');
      try {
        await api.project.save({ project: updated, asNewProject: false });
        setSaveStatus('saved');
        setTimeout(() => setSaveStatus('idle'), 1500);
      } catch (err) {
        console.error('Auto-save failed:', err);
        setSaveStatus('idle');
      }
    },
    [pushProject],
  );

  const handleAddScene = useCallback(() => {
    if (!currentProject) return;
    const newScene: Scene = {
      id: ulid(),
      index: currentProject.scenes.length,
      prompts: {},
      generatedImages: [],
      generatedClips: [],
    };
    const updated: Project = {
      ...currentProject,
      scenes: [...currentProject.scenes, newScene],
      updatedAt: new Date().toISOString(),
    };
    setSelectedSceneId(newScene.id);
    void saveProject(updated);
  }, [currentProject, saveProject]);

  const handleDuplicateScene = useCallback(
    (id: string) => {
      if (!currentProject) return;
      const source = currentProject.scenes.find((s) => s.id === id);
      if (!source) return;
      const duplicated: Scene = {
        ...source,
        id: ulid(),
        index: source.index + 1,
      };
      const scenes = [...currentProject.scenes];
      scenes.splice(source.index + 1, 0, duplicated);
      const reindexed = scenes.map((s, i) => ({ ...s, index: i }));
      const updated: Project = {
        ...currentProject,
        scenes: reindexed,
        updatedAt: new Date().toISOString(),
      };
      setSelectedSceneId(duplicated.id);
      void saveProject(updated);
    },
    [currentProject, saveProject],
  );

  const handleDeleteScene = useCallback(
    (id: string) => {
      if (!currentProject) return;
      const filtered = currentProject.scenes
        .filter((s) => s.id !== id)
        .map((s, i) => ({ ...s, index: i }));
      const updated: Project = {
        ...currentProject,
        scenes: filtered,
        updatedAt: new Date().toISOString(),
      };
      if (selectedSceneId === id) {
        setSelectedSceneId(filtered[0]?.id ?? null);
      }
      setDeleteConfirmId(null);
      void saveProject(updated);
    },
    [currentProject, selectedSceneId, saveProject],
  );

  const handleRequestDelete = useCallback((id: string) => {
    setDeleteConfirmId(id);
  }, []);

  const handleReorder = useCallback(
    (fromIdx: number, toIdx: number) => {
      if (!currentProject) return;
      const scenes = [...currentProject.scenes];
      const moved = scenes.splice(fromIdx, 1)[0];
      if (!moved) return;
      scenes.splice(toIdx, 0, moved);
      const reindexed = scenes.map((s, i) => ({ ...s, index: i }));
      const updated: Project = {
        ...currentProject,
        scenes: reindexed,
        updatedAt: new Date().toISOString(),
      };
      void saveProject(updated);
    },
    [currentProject, saveProject],
  );

  const handleScriptChange = useCallback(
    (sceneId: string, field: 'scriptKo' | 'scriptOriginal', value: string) => {
      if (!currentProject) return;
      const scenes = currentProject.scenes.map((s) =>
        s.id === sceneId ? { ...s, [field]: value } : s,
      );
      const updated: Project = {
        ...currentProject,
        scenes,
        updatedAt: new Date().toISOString(),
      };
      void saveProject(updated);
    },
    [currentProject, saveProject],
  );

  const handleNotesChange = useCallback(
    (sceneId: string, value: string) => {
      if (!currentProject) return;
      const scenes = currentProject.scenes.map((s) =>
        s.id === sceneId ? { ...s, notes: value } : s,
      );
      const updated: Project = {
        ...currentProject,
        scenes,
        updatedAt: new Date().toISOString(),
      };
      void saveProject(updated);
    },
    [currentProject, saveProject],
  );

  const handleLoadNarration = useCallback(
    (sceneId: string, filePath: string) => {
      if (!currentProject) return;
      const scenes = currentProject.scenes.map((s) =>
        s.id === sceneId
          ? {
              ...s,
              narrationAudio: {
                kind: 'audio' as const,
                path: filePath,
                sha1: '0000000000000000000000000000000000000000',
              },
            }
          : s,
      );
      const updated: Project = {
        ...currentProject,
        scenes,
        updatedAt: new Date().toISOString(),
      };
      void saveProject(updated);
    },
    [currentProject, saveProject],
  );

  const handleDropImages = useCallback(
    (sceneId: string, paths: string[]) => {
      if (!currentProject) return;
      const scenes = currentProject.scenes.map((s) =>
        s.id === sceneId
          ? {
              ...s,
              generatedImages: [
                ...s.generatedImages,
                ...paths.map((p) => ({
                  kind: 'image' as const,
                  path: p,
                  sha1: '0000000000000000000000000000000000000000',
                })),
              ],
            }
          : s,
      );
      const updated: Project = {
        ...currentProject,
        scenes,
        updatedAt: new Date().toISOString(),
      };
      void saveProject(updated);
    },
    [currentProject, saveProject],
  );

  const handleSubtitleGenerated = useCallback(
    (sceneId: string, assContent: string) => {
      if (!currentProject) return;
      const scenes = currentProject.scenes.map((s) =>
        s.id === sceneId
          ? {
              ...s,
              subtitleAss: {
                kind: 'ass' as const,
                path: `assets/subs/${sceneId}.ass`,
                sha1: '0000000000000000000000000000000000000000',
                meta: { content: assContent },
              },
            }
          : s,
      );
      const updated: Project = {
        ...currentProject,
        scenes,
        updatedAt: new Date().toISOString(),
      };
      void saveProject(updated);
    },
    [currentProject, saveProject],
  );

  const handleDropClips = useCallback(
    (sceneId: string, paths: string[]) => {
      if (!currentProject) return;
      const scenes = currentProject.scenes.map((s) =>
        s.id === sceneId
          ? {
              ...s,
              generatedClips: [
                ...s.generatedClips,
                ...paths.map((p) => ({
                  kind: 'video' as const,
                  path: p,
                  sha1: '0000000000000000000000000000000000000000',
                })),
              ],
            }
          : s,
      );
      const updated: Project = {
        ...currentProject,
        scenes,
        updatedAt: new Date().toISOString(),
      };
      void saveProject(updated);
    },
    [currentProject, saveProject],
  );

  const handleFinalClipGenerated = useCallback(
    (sceneId: string, clipPath: string) => {
      if (!currentProject) return;
      const scenes = currentProject.scenes.map((s) =>
        s.id === sceneId
          ? {
              ...s,
              finalClip: {
                kind: 'video' as const,
                path: clipPath,
                sha1: '0000000000000000000000000000000000000000',
              },
            }
          : s,
      );
      const updated: Project = {
        ...currentProject,
        scenes,
        updatedAt: new Date().toISOString(),
      };
      void saveProject(updated);
    },
    [currentProject, saveProject],
  );

  const handleTitleEdit = useCallback(() => {
    if (!currentProject) return;
    setTitleDraft(currentProject.title);
    setEditingTitle(true);
    setTimeout(() => titleInputRef.current?.select(), 0);
  }, [currentProject]);

  const handleTitleSave = useCallback(() => {
    if (!currentProject || !titleDraft.trim()) {
      setEditingTitle(false);
      return;
    }
    const updated: Project = {
      ...currentProject,
      title: titleDraft.trim(),
      updatedAt: new Date().toISOString(),
    };
    setEditingTitle(false);
    void saveProject(updated);
  }, [currentProject, titleDraft, saveProject]);

  const handleUndo = useCallback(() => {
    undo();
    const proj = useProjectStore.getState().currentProject;
    if (proj) void api.project.save({ project: proj, asNewProject: false });
  }, [undo]);

  const handleRedo = useCallback(() => {
    redo();
    const proj = useProjectStore.getState().currentProject;
    if (proj) void api.project.save({ project: proj, asNewProject: false });
  }, [redo]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'z' && (e.metaKey || e.ctrlKey) && !e.shiftKey) {
        e.preventDefault();
        handleUndo();
        return;
      }
      if (e.key === 'z' && (e.metaKey || e.ctrlKey) && e.shiftKey) {
        e.preventDefault();
        handleRedo();
        return;
      }

      if (e.key === '/' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setShowShortcuts((v) => !v);
        return;
      }
      if (e.key === 'Escape') {
        setShowShortcuts(false);
        setDeleteConfirmId(null);
        return;
      }

      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === 'TEXTAREA' || tag === 'INPUT' || tag === 'SELECT') return;
      if (!currentProject) return;

      const scenes = currentProject.scenes;
      const currentIdx = scenes.findIndex((s) => s.id === selectedSceneId);

      if (e.key === 'ArrowUp' || e.key === 'ArrowLeft') {
        e.preventDefault();
        if (currentIdx > 0) setSelectedSceneId(scenes[currentIdx - 1]!.id);
      } else if (e.key === 'ArrowDown' || e.key === 'ArrowRight') {
        e.preventDefault();
        if (currentIdx < scenes.length - 1) setSelectedSceneId(scenes[currentIdx + 1]!.id);
      } else if (e.key === 'n' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        handleAddScene();
      } else if (e.key === 'd' && (e.metaKey || e.ctrlKey) && selectedSceneId) {
        e.preventDefault();
        handleDuplicateScene(selectedSceneId);
      } else if (e.key === 'Backspace' && (e.metaKey || e.ctrlKey) && selectedSceneId) {
        e.preventDefault();
        handleRequestDelete(selectedSceneId);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [
    currentProject,
    selectedSceneId,
    handleAddScene,
    handleDuplicateScene,
    handleRequestDelete,
    handleUndo,
    handleRedo,
  ]);

  const handleBack = () => {
    setCurrentProject(null);
    void navigate({ to: '/' });
  };

  if (!currentProject) {
    return (
      <div className="flex h-full items-center justify-center">
        <p className="gooey-text-muted text-sm">{t('common.loading')}</p>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col">
      {/* Titlebar */}
      <div className="titlebar-drag gooey-header flex h-10 items-center gap-3 px-4">
        <button
          type="button"
          onClick={handleBack}
          className="titlebar-no-drag gooey-btn-ghost flex items-center gap-1 px-2 py-1 text-xs"
        >
          <ArrowLeft size={14} />
          {t('projects.title')}
        </button>
        {editingTitle ? (
          <input
            ref={titleInputRef}
            value={titleDraft}
            onChange={(e) => setTitleDraft(e.target.value)}
            onBlur={handleTitleSave}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleTitleSave();
              if (e.key === 'Escape') setEditingTitle(false);
            }}
            className="titlebar-no-drag gooey-input w-40 px-1.5 py-0.5 text-xs"
          />
        ) : (
          <button
            type="button"
            onClick={handleTitleEdit}
            className="titlebar-no-drag gooey-btn-ghost rounded-lg px-1 text-xs"
          >
            {currentProject.title}
          </button>
        )}
        {saveStatus !== 'idle' && (
          <span className="flex items-center gap-1 text-[10px] text-white/30">
            {saveStatus === 'saving' && 'Saving…'}
            {saveStatus === 'saved' && (
              <>
                <Check size={10} className="text-emerald-400" /> Saved
              </>
            )}
          </span>
        )}
        <span className="ml-auto text-[10px] text-white/25">
          {currentProject.scenes.length} {t('projects.scenes')}
        </span>
        <button
          type="button"
          onClick={() => setShowShortcuts(true)}
          className="titlebar-no-drag gooey-btn-ghost p-1"
          title="Keyboard Shortcuts (⌘/)"
        >
          <Keyboard size={14} />
        </button>
        <button
          type="button"
          onClick={() => setShowExport(true)}
          className="titlebar-no-drag gooey-btn-primary ml-1 px-2.5 py-1 text-[10px]"
        >
          Export
        </button>
      </div>

      {/* 3-panel editor */}
      <main className="flex flex-1 overflow-hidden">
        <SceneList
          scenes={currentProject.scenes}
          selectedId={selectedSceneId}
          onSelect={setSelectedSceneId}
          onAdd={handleAddScene}
          onDelete={handleRequestDelete}
          onDuplicate={handleDuplicateScene}
          onReorder={handleReorder}
        />
        <ScriptEditor
          scene={selectedScene}
          projectLanguage={currentProject.language}
          onScriptChange={handleScriptChange}
          onNotesChange={handleNotesChange}
          onLoadNarration={handleLoadNarration}
        />
        <Inspector
          scene={selectedScene}
          projectLanguage={currentProject.language}
          onLoadNarration={handleLoadNarration}
          onDropImages={handleDropImages}
          onDropClips={handleDropClips}
          onSubtitleGenerated={handleSubtitleGenerated}
          onFinalClipGenerated={handleFinalClipGenerated}
        />
      </main>

      {/* Timeline */}
      <Timeline
        scenes={currentProject.scenes}
        selectedId={selectedSceneId}
        onSelect={setSelectedSceneId}
        onReorder={handleReorder}
      />

      {/* Export Dialog */}
      {showExport && (
        <ExportDialog projectTitle={currentProject.title} onClose={() => setShowExport(false)} />
      )}

      {/* Delete confirmation */}
      {deleteConfirmId && (
        <div className="gooey-modal-backdrop fixed inset-0 z-50 flex items-center justify-center">
          <div className="gooey-modal w-full max-w-xs p-5">
            <h3 className="text-sm font-semibold text-white/95">{t('projects.delete.confirm')}</h3>
            <p className="mt-1 text-xs text-white/40">
              {t('scene.header')} #
              {(currentProject.scenes.find((s) => s.id === deleteConfirmId)?.index ?? 0) + 1}
            </p>
            <div className="mt-4 flex justify-end gap-2">
              <button
                onClick={() => setDeleteConfirmId(null)}
                className="gooey-btn-ghost px-3 py-1.5 text-xs"
              >
                {t('common.cancel')}
              </button>
              <button
                onClick={() => handleDeleteScene(deleteConfirmId)}
                className="gooey-btn-danger px-3 py-1.5 text-xs"
              >
                {t('scene.delete')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Keyboard shortcuts overlay */}
      {showShortcuts && (
        <div
          className="gooey-modal-backdrop fixed inset-0 z-50 flex items-center justify-center"
          onClick={() => setShowShortcuts(false)}
        >
          <div className="gooey-modal w-full max-w-sm p-6" onClick={(e) => e.stopPropagation()}>
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-sm font-semibold text-white/95">Keyboard Shortcuts</h2>
              <button onClick={() => setShowShortcuts(false)} className="gooey-btn-ghost p-1">
                <X size={16} />
              </button>
            </div>
            <div className="space-y-2 text-xs">
              {[
                ['⌘ Z', 'Undo'],
                ['⌘ ⇧ Z', 'Redo'],
                ['↑ / ↓', 'Navigate scenes'],
                ['⌘ N', 'Add scene'],
                ['⌘ D', 'Duplicate scene'],
                ['⌘ ⌫', 'Delete scene'],
                ['⌘ /', 'Toggle shortcuts'],
                ['Esc', 'Close overlay'],
              ].map(([key, desc]) => (
                <div key={key} className="flex items-center justify-between">
                  <span className="text-white/50">{desc}</span>
                  <kbd className="rounded-lg border border-white/10 bg-white/5 px-1.5 py-0.5 font-mono text-[10px] text-white/70">
                    {key}
                  </kbd>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
