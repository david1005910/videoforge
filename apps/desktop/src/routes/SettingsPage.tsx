import { useState, useEffect } from 'react';
import { useNavigate } from '@tanstack/react-router';
import { ArrowLeft } from 'lucide-react';
import { api } from '../lib/api';
import { useT } from '../i18n';
import { ApiKeysSection } from './settings/ApiKeysSection';
import { WhisperSection } from './settings/WhisperSection';
import { AppearanceSection } from './settings/AppearanceSection';

export function SettingsPage() {
  const t = useT();
  const navigate = useNavigate();
  const [autoUpdate, setAutoUpdate] = useState(false);
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    void api.keychain.get('auto-update-enabled').then((val) => {
      setAutoUpdate(val === 'true');
    });
  }, []);

  const handleAutoUpdateToggle = async () => {
    const newVal = !autoUpdate;
    setAutoUpdate(newVal);
    try {
      await api.keychain.set('auto-update-enabled', String(newVal));
    } catch (err) {
      console.error('auto-update toggle failed', err);
      setAutoUpdate(!newVal);
    }
  };

  const handleExportErrorReport = async () => {
    setExporting(true);
    try {
      const res = await api.dialog.selectFolder('Select folder for error report');
      if (res.folderPath) {
        const report = await api.diagnostics.errorReport(res.folderPath);
        await api.shell.openExternal(`file://${report.reportPath}`);
      }
    } catch (err) {
      console.error('exportErrorReport failed', err);
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="gooey-page flex h-full flex-col">
      <header className="titlebar-drag gooey-header flex h-10 items-center gap-3 px-4">
        <button
          type="button"
          onClick={() => void navigate({ to: '/' })}
          className="titlebar-no-drag gooey-btn-ghost flex items-center gap-1 px-2 py-1 text-xs"
        >
          <ArrowLeft size={14} />
          {t('projects.title')}
        </button>
        <h1 className="gooey-text-primary text-sm font-semibold">{t('app.settings')}</h1>
      </header>

      <div className="gooey-scrollbar flex-1 space-y-8 overflow-auto p-6">
        <ApiKeysSection />
        <WhisperSection />

        {/* Auto Update Toggle */}
        <section>
          <h2 className="gooey-text-secondary mb-3 text-sm font-medium">Updates</h2>
          <div className="gooey-card flex items-center justify-between p-4">
            <div>
              <p className="text-sm text-[#f0e8ff]">Auto-check for updates</p>
              <p className="text-xs text-[#9B5BFF]/40">
                Automatically check for new versions on startup.
              </p>
            </div>
            <button
              onClick={handleAutoUpdateToggle}
              className={`gooey-toggle relative h-6 w-11 ${autoUpdate ? 'gooey-toggle-on' : 'gooey-toggle-off'}`}
              role="switch"
              aria-checked={autoUpdate}
              aria-label="Auto-check for updates"
            >
              <span
                className={`absolute left-0.5 top-0.5 h-5 w-5 rounded-full bg-white shadow-md transition-transform ${autoUpdate ? 'translate-x-5' : 'translate-x-0'}`}
              />
            </button>
          </div>
        </section>

        <AppearanceSection />

        {/* Diagnostics */}
        <section>
          <h2 className="gooey-text-secondary mb-3 text-sm font-medium">Diagnostics</h2>
          <button
            onClick={handleExportErrorReport}
            disabled={exporting}
            className="gooey-btn-secondary px-4 py-2 text-sm"
          >
            {exporting ? 'Exporting…' : 'Export Error Report'}
          </button>
          <p className="gooey-text-muted mt-1 text-xs">
            Collects logs, preferences, and system info into a folder for troubleshooting.
          </p>
        </section>
      </div>
    </div>
  );
}
