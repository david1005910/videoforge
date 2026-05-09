import { useState, useEffect } from 'react';
import { api } from '../lib/api';

export function AboutPage() {
  const [version, setVersion] = useState('');

  useEffect(() => {
    api.app
      .getVersion()
      .then((v) => setVersion(v.app))
      .catch(() => {
        /* noop */
      });
  }, []);

  return (
    <div className="flex h-full items-center justify-center bg-zinc-950 text-zinc-100">
      <div className="space-y-4 text-center">
        <h1 className="text-3xl font-bold">VideoForge</h1>
        <p className="text-sm text-zinc-400">macOS AI Video Creation Studio</p>
        {version && <p className="text-xs text-zinc-500">Version {version}</p>}
        <p className="text-xs text-zinc-600">Built for the HBAS YouTube channel</p>
        <div className="pt-4">
          <button
            onClick={() => api.shell.openExternal('https://github.com/user/videoforge')}
            className="rounded-md bg-zinc-800 px-4 py-2 text-sm text-zinc-300 hover:bg-zinc-700"
          >
            GitHub
          </button>
        </div>
      </div>
    </div>
  );
}
