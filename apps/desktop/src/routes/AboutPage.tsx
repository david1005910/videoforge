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
    <div className="gooey-page flex h-full items-center justify-center">
      <div className="gooey-panel space-y-4 p-10 text-center">
        <h1 className="gooey-text-primary text-3xl font-bold">VideoForge</h1>
        <p className="gooey-text-secondary text-sm">macOS AI Video Creation Studio</p>
        {version && <p className="gooey-text-muted text-xs">Version {version}</p>}
        <p className="gooey-text-muted text-xs">Built for the HBAS YouTube channel</p>
        <div className="pt-4">
          <button
            onClick={() => api.shell.openExternal('https://github.com/user/videoforge')}
            className="gooey-btn-secondary px-5 py-2.5 text-sm"
          >
            GitHub
          </button>
        </div>
      </div>
    </div>
  );
}
