import { create } from 'zustand';
import type { Project, ProjectMeta } from '@videoforge/shared';

interface ProjectState {
  /** 현재 열려있는 프로젝트 */
  currentProject: Project | null;
  /** 프로젝트 목록 (메타데이터만) */
  projectList: ProjectMeta[];
  /** 목록 로딩 중 */
  isListLoading: boolean;
  /** 프로젝트 저장 중 */
  isSaving: boolean;

  setCurrentProject: (project: Project | null) => void;
  setProjectList: (list: ProjectMeta[]) => void;
  setListLoading: (v: boolean) => void;
  setSaving: (v: boolean) => void;
}

export const useProjectStore = create<ProjectState>((set) => ({
  currentProject: null,
  projectList: [],
  isListLoading: false,
  isSaving: false,

  setCurrentProject: (currentProject) => set({ currentProject }),
  setProjectList: (projectList) => set({ projectList }),
  setListLoading: (isListLoading) => set({ isListLoading }),
  setSaving: (isSaving) => set({ isSaving }),
}));
