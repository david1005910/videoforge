import { ko } from './ko';
import { en } from './en';
import { useAppStore } from '../stores/app-store';

export type TranslationKey = keyof typeof ko;

const translations = { ko, en } as const;

export function t(key: TranslationKey, lang: 'ko' | 'en' = 'ko'): string {
  return translations[lang][key] ?? key;
}

export function useT(): (key: TranslationKey) => string {
  const lang = useAppStore((s) => s.language);
  return (key: TranslationKey) => t(key, lang);
}
