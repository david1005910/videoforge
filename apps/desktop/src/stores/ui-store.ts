import { create } from 'zustand';

type Theme = 'system' | 'light' | 'dark';

interface UiState {
  theme: Theme;
  /** 실제 적용되는 모드 (system이면 OS 따름) */
  resolvedTheme: 'light' | 'dark';
  /** 새 프로젝트 위저드 열림 */
  isNewProjectOpen: boolean;

  setTheme: (theme: Theme) => void;
  setResolvedTheme: (resolved: 'light' | 'dark') => void;
  setNewProjectOpen: (open: boolean) => void;
}

export const useUiStore = create<UiState>((set) => ({
  theme: 'system',
  resolvedTheme: 'dark',
  isNewProjectOpen: false,

  setTheme: (theme) => set({ theme }),
  setResolvedTheme: (resolvedTheme) => set({ resolvedTheme }),
  setNewProjectOpen: (isNewProjectOpen) => set({ isNewProjectOpen }),
}));
