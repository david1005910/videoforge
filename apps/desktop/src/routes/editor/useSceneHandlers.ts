import { useCallback } from 'react';
import { ulid } from 'ulid';
import { api } from '../../lib/api';
import { useProjectStore } from '../../stores/project-store';
import type { Project, Scene } from '@videoforge/shared';

type SaveFn = (updated: Project) => void;

export function useSceneHandlers(
  currentProject: Project | null,
  saveProject: SaveFn,
  selectedSceneId: string | null,
  setSelectedSceneId: (id: string | null) => void,
  setDeleteConfirmId: (id: string | null) => void,
) {
  const { undo, redo } = useProjectStore();

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
    saveProject(updated);
  }, [currentProject, saveProject, setSelectedSceneId]);

  const handleDuplicateScene = useCallback(
    (id: string) => {
      if (!currentProject) return;
      const source = currentProject.scenes.find((s) => s.id === id);
      if (!source) return;
      const duplicated: Scene = { ...source, id: ulid(), index: source.index + 1 };
      const scenes = [...currentProject.scenes];
      scenes.splice(source.index + 1, 0, duplicated);
      const reindexed = scenes.map((s, i) => ({ ...s, index: i }));
      const updated: Project = {
        ...currentProject,
        scenes: reindexed,
        updatedAt: new Date().toISOString(),
      };
      setSelectedSceneId(duplicated.id);
      saveProject(updated);
    },
    [currentProject, saveProject, setSelectedSceneId],
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
      saveProject(updated);
    },
    [currentProject, selectedSceneId, saveProject, setSelectedSceneId, setDeleteConfirmId],
  );

  const handleRequestDelete = useCallback(
    (id: string) => {
      setDeleteConfirmId(id);
    },
    [setDeleteConfirmId],
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
      saveProject(updated);
    },
    [currentProject, saveProject],
  );

  const handleScriptChange = useCallback(
    (sceneId: string, field: 'scriptKo' | 'scriptOriginal', value: string) => {
      if (!currentProject) return;
      const scenes = currentProject.scenes.map((s) =>
        s.id === sceneId ? { ...s, [field]: value } : s,
      );
      saveProject({ ...currentProject, scenes, updatedAt: new Date().toISOString() });
    },
    [currentProject, saveProject],
  );

  const handleNotesChange = useCallback(
    (sceneId: string, value: string) => {
      if (!currentProject) return;
      const scenes = currentProject.scenes.map((s) =>
        s.id === sceneId ? { ...s, notes: value } : s,
      );
      saveProject({ ...currentProject, scenes, updatedAt: new Date().toISOString() });
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
      saveProject({ ...currentProject, scenes, updatedAt: new Date().toISOString() });
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
      saveProject({ ...currentProject, scenes, updatedAt: new Date().toISOString() });
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
      saveProject({ ...currentProject, scenes, updatedAt: new Date().toISOString() });
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
      saveProject({ ...currentProject, scenes, updatedAt: new Date().toISOString() });
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
      saveProject({ ...currentProject, scenes, updatedAt: new Date().toISOString() });
    },
    [currentProject, saveProject],
  );

  const handleAutoPipelineComplete = useCallback(
    (sceneClips: { sceneId: string; clipPath: string }[], _finalVideoPath?: string) => {
      if (!currentProject) return;
      const scenes = currentProject.scenes.map((s) => {
        const match = sceneClips.find((c) => c.sceneId === s.id);
        if (match) {
          return {
            ...s,
            finalClip: {
              kind: 'video' as const,
              path: match.clipPath,
              sha1: '0000000000000000000000000000000000000000',
            },
          };
        }
        return s;
      });
      saveProject({ ...currentProject, scenes, updatedAt: new Date().toISOString() });
    },
    [currentProject, saveProject],
  );

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

  return {
    handleAddScene,
    handleDuplicateScene,
    handleDeleteScene,
    handleRequestDelete,
    handleReorder,
    handleScriptChange,
    handleNotesChange,
    handleLoadNarration,
    handleDropImages,
    handleDropClips,
    handleSubtitleGenerated,
    handleFinalClipGenerated,
    handleAutoPipelineComplete,
    handleUndo,
    handleRedo,
  };
}
