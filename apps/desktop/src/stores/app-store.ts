import { create } from 'zustand';

interface AppState {
  /** 앱 버전 (main에서 가져옴) */
  appVersion: string;
  /** 현재 언어 */
  language: 'ko' | 'en';

  setAppVersion: (v: string) => void;
  setLanguage: (lang: 'ko' | 'en') => void;
}

export const useAppStore = create<AppState>((set) => ({
  appVersion: '',
  language: 'ko',

  setAppVersion: (appVersion) => set({ appVersion }),
  setLanguage: (language) => set({ language }),
}));
