import { create } from 'zustand';

type Theme = 'system' | 'light' | 'dark';
type FontScale = 'small' | 'normal' | 'large';

interface UiState {
  theme: Theme;
  /** 실제 적용되는 모드 (system이면 OS 따름) */
  resolvedTheme: 'light' | 'dark';
  /** 새 프로젝트 위저드 열림 */
  isNewProjectOpen: boolean;
  /** P9-08: Font size scaling */
  fontScale: FontScale;

  setTheme: (theme: Theme) => void;
  setResolvedTheme: (resolved: 'light' | 'dark') => void;
  setNewProjectOpen: (open: boolean) => void;
  setFontScale: (scale: FontScale) => void;
}

const FONT_SCALE_MAP: Record<FontScale, string> = {
  small: '14px',
  normal: '16px',
  large: '18px',
};

export function applyFontScale(scale: FontScale): void {
  document.documentElement.style.fontSize = FONT_SCALE_MAP[scale];
}

export const useUiStore = create<UiState>((set) => ({
  theme: 'system',
  resolvedTheme: 'dark',
  isNewProjectOpen: false,
  fontScale: 'normal',

  setTheme: (theme) => set({ theme }),
  setResolvedTheme: (resolvedTheme) => set({ resolvedTheme }),
  setNewProjectOpen: (isNewProjectOpen) => set({ isNewProjectOpen }),
  setFontScale: (fontScale) => {
    applyFontScale(fontScale);
    set({ fontScale });
  },
}));
