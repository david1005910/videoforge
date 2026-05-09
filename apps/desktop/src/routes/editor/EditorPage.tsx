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
import type { Project, Scene } from '@videoforge/shared';

export function EditorPage(): JSX.Element {
  const t = useT();
  const navigate = useNavigate();
  const { projectId } = useParams({ from: '/editor/$projectId' });
  const { currentProject, setCurrentProject } = useProjectStore();
  const [selectedSceneId, setSelectedSceneId] = useState<string | null>(null);

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
      </div>

      {/* 3-패널 에디터 */}
      <main className="flex flex-1 overflow-hidden">
        <SceneList
          scenes={currentProject.scenes}
          selectedId={selectedSceneId}
          onSelect={setSelectedSceneId}
          onAdd={handleAddScene}
          onDelete={handleDeleteScene}
          onReorder={handleReorder}
        />
        <ScriptEditor
          scene={selectedScene}
          projectLanguage={currentProject.language}
          onScriptChange={handleScriptChange}
          onNotesChange={handleNotesChange}
        />
        <Inspector scene={selectedScene} />
      </main>
    </div>
  );
}
