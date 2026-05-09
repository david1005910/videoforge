import { useEffect } from 'react';
import { useUiStore } from '../stores/ui-store';

/**
 * system 테마 변경 감지 + <html> class 업데이트.
 * tailwind darkMode: 'class' 로 전환 시 자동 적용.
 */
export function useThemeSync(): void {
  const theme = useUiStore((s) => s.theme);
  const setResolvedTheme = useUiStore((s) => s.setResolvedTheme);

  useEffect(() => {
    const mql = window.matchMedia('(prefers-color-scheme: dark)');

    function apply() {
      const isDark = theme === 'dark' || (theme === 'system' && mql.matches);
      const resolved = isDark ? 'dark' : 'light';
      setResolvedTheme(resolved);

      document.documentElement.classList.toggle('dark', isDark);
    }

    apply();
    mql.addEventListener('change', apply);
    return () => mql.removeEventListener('change', apply);
  }, [theme, setResolvedTheme]);
}
