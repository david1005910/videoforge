import { create } from 'zustand';
import type { Project, ProjectMeta } from '@videoforge/shared';

const MAX_HISTORY = 50;

interface ProjectState {
  /** 현재 열려있는 프로젝트 */
  currentProject: Project | null;
  /** 프로젝트 목록 (메타데이터만) */
  projectList: ProjectMeta[];
  /** 목록 로딩 중 */
  isListLoading: boolean;
  /** 프로젝트 저장 중 */
  isSaving: boolean;
  /** Undo history stack */
  undoStack: Project[];
  /** Redo history stack */
  redoStack: Project[];
  /** Whether undo is available */
  canUndo: boolean;
  /** Whether redo is available */
  canRedo: boolean;

  setCurrentProject: (project: Project | null) => void;
  /** Push current state to undo stack, then set new project */
  pushProject: (project: Project) => void;
  undo: () => void;
  redo: () => void;
  setProjectList: (list: ProjectMeta[]) => void;
  setListLoading: (v: boolean) => void;
  setSaving: (v: boolean) => void;
}

export const useProjectStore = create<ProjectState>((set, get) => ({
  currentProject: null,
  projectList: [],
  isListLoading: false,
  isSaving: false,
  undoStack: [],
  redoStack: [],
  canUndo: false,
  canRedo: false,

  setCurrentProject: (currentProject) =>
    set({ currentProject, undoStack: [], redoStack: [], canUndo: false, canRedo: false }),

  pushProject: (project) => {
    const { currentProject, undoStack } = get();
    if (!currentProject) {
      set({ currentProject: project });
      return;
    }
    const newUndo = [...undoStack, currentProject].slice(-MAX_HISTORY);
    set({
      currentProject: project,
      undoStack: newUndo,
      redoStack: [],
      canUndo: newUndo.length > 0,
      canRedo: false,
    });
  },

  undo: () => {
    const { currentProject, undoStack, redoStack } = get();
    if (undoStack.length === 0 || !currentProject) return;
    const prev = undoStack[undoStack.length - 1]!;
    const newUndo = undoStack.slice(0, -1);
    const newRedo = [...redoStack, currentProject];
    set({
      currentProject: prev,
      undoStack: newUndo,
      redoStack: newRedo,
      canUndo: newUndo.length > 0,
      canRedo: true,
    });
  },

  redo: () => {
    const { currentProject, undoStack, redoStack } = get();
    if (redoStack.length === 0 || !currentProject) return;
    const next = redoStack[redoStack.length - 1]!;
    const newRedo = redoStack.slice(0, -1);
    const newUndo = [...undoStack, currentProject];
    set({
      currentProject: next,
      undoStack: newUndo,
      redoStack: newRedo,
      canUndo: true,
      canRedo: newRedo.length > 0,
    });
  },

  setProjectList: (projectList) => set({ projectList }),
  setListLoading: (isListLoading) => set({ isListLoading }),
  setSaving: (isSaving) => set({ isSaving }),
}));
