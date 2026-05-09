import { useEffect } from 'react';
import { RouterProvider } from '@tanstack/react-router';
import { router } from './routes/router';
import { useAppStore } from './stores/app-store';
import { useThemeSync } from './hooks/use-theme';
import { api } from './lib/api';

export function App(): JSX.Element {
  const setAppVersion = useAppStore((s) => s.setAppVersion);

  useThemeSync();

  useEffect(() => {
    api.app
      .getVersion()
      .then((v) => setAppVersion(v.app))
      .catch((e: unknown) => console.error('Failed to get version:', e));
  }, [setAppVersion]);

  return <RouterProvider router={router} />;
}
