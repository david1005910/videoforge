import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from '@tanstack/react-router';
import { ArrowLeft } from 'lucide-react';
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
  const { currentProject, setCurrentProject } = useProjectStore();
  const [selectedSceneId, setSelectedSceneId] = useState<string | null>(null);
  const [showExport, setShowExport] = useState(false);

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
      setCurrentProject(updated);
      try {
        await api.project.save({ project: updated, asNewProject: false });
      } catch (err) {
        console.error('Auto-save failed:', err);
      }
    },
    [setCurrentProject],
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
      void saveProject(updated);
    },
    [currentProject, selectedSceneId, saveProject],
  );

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

  // 키보드 단축키
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      // textarea/input 내부에서는 무시
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
        handleDeleteScene(selectedSceneId);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [currentProject, selectedSceneId, handleAddScene, handleDuplicateScene, handleDeleteScene]);

  const handleBack = () => {
    setCurrentProject(null);
    void navigate({ to: '/' });
  };

  if (!currentProject) {
    return (
      <div className="flex h-full items-center justify-center">
        <p className="text-sm text-zinc-500">{t('common.loading')}</p>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col">
      {/* 타이틀바 */}
      <div className="titlebar-drag flex h-10 items-center gap-3 border-b border-zinc-800 px-4">
        <button
          type="button"
          onClick={handleBack}
          className="titlebar-no-drag flex items-center gap-1 rounded-md px-2 py-1 text-xs text-zinc-400 transition hover:bg-zinc-800 hover:text-zinc-200"
        >
          <ArrowLeft size={14} />
          {t('projects.title')}
        </button>
        <h2 className="text-xs text-zinc-500">{currentProject.title}</h2>
        <span className="ml-auto text-[10px] text-zinc-700">
          {currentProject.scenes.length} {t('projects.scenes')}
        </span>
        <button
          type="button"
          onClick={() => setShowExport(true)}
          className="titlebar-no-drag ml-2 rounded-md bg-violet-600 px-2.5 py-1 text-[10px] font-medium text-white hover:bg-violet-500"
        >
          Export
        </button>
      </div>

      {/* 3-패널 에디터 */}
      <main className="flex flex-1 overflow-hidden">
        <SceneList
          scenes={currentProject.scenes}
          selectedId={selectedSceneId}
          onSelect={setSelectedSceneId}
          onAdd={handleAddScene}
          onDelete={handleDeleteScene}
          onDuplicate={handleDuplicateScene}
          onReorder={handleReorder}
        />
        <ScriptEditor
          scene={selectedScene}
          projectLanguage={currentProject.language}
          onScriptChange={handleScriptChange}
          onNotesChange={handleNotesChange}
        />
        <Inspector
          scene={selectedScene}
          onLoadNarration={handleLoadNarration}
          onDropImages={handleDropImages}
        />
      </main>

      {/* P4-13: Timeline */}
      <Timeline
        scenes={currentProject.scenes}
        selectedId={selectedSceneId}
        onSelect={setSelectedSceneId}
        onReorder={handleReorder}
      />

      {/* P4-15: Export Dialog */}
      {showExport && (
        <ExportDialog projectTitle={currentProject.title} onClose={() => setShowExport(false)} />
      )}
    </div>
  );
}
