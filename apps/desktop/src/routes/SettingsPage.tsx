import { useState, useEffect } from 'react';
import { api } from '../lib/api';

/**
 * Settings page with API key management, auto-update toggle (P10-03),
 * and error report export (P9-10).
 */
export function SettingsPage() {
  const [apiKey, setApiKey] = useState('');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [autoUpdate, setAutoUpdate] = useState(false);
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    void api.keychain.get('auto-update-enabled').then((val) => {
      setAutoUpdate(val === 'true');
    });
  }, []);

  const handleSaveApiKey = async () => {
    if (!apiKey.trim()) return;
    setSaving(true);
    try {
      await api.keychain.set('gemini-api-key', apiKey.trim());
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (err) {
      console.error('keychain.set failed', err);
    } finally {
      setSaving(false);
    }
  };

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
    <div className="flex h-full flex-col bg-zinc-950 text-zinc-100">
      <header className="border-b border-zinc-800 px-6 py-3">
        <h1 className="text-lg font-semibold">Settings</h1>
      </header>

      <div className="flex-1 space-y-8 overflow-auto p-6">
        {/* API Keys */}
        <section>
          <h2 className="mb-3 text-sm font-medium text-zinc-400">API Keys</h2>
          <div className="space-y-3">
            <div>
              <label className="mb-1 block text-xs text-zinc-500">Gemini API Key</label>
              <div className="flex gap-2">
                <input
                  type="password"
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  placeholder="Enter Gemini API key…"
                  className="flex-1 rounded-md border border-zinc-700 bg-zinc-900 px-3 py-1.5 text-sm text-zinc-200 placeholder:text-zinc-600"
                />
                <button
                  onClick={handleSaveApiKey}
                  disabled={saving || !apiKey.trim()}
                  className="rounded-md bg-violet-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-violet-500 disabled:opacity-50"
                >
                  {saved ? 'Saved!' : 'Save'}
                </button>
              </div>
              <p className="mt-1 text-xs text-zinc-600">
                Stored securely in macOS Keychain via safeStorage.
              </p>
            </div>
          </div>
        </section>

        {/* Auto Update Toggle (P10-03) */}
        <section>
          <h2 className="mb-3 text-sm font-medium text-zinc-400">Updates</h2>
          <div className="flex items-center justify-between rounded-lg border border-zinc-800 bg-zinc-900 p-4">
            <div>
              <p className="text-sm text-zinc-200">Auto-check for updates</p>
              <p className="text-xs text-zinc-500">
                Automatically check for new versions on startup.
              </p>
            </div>
            <button
              onClick={handleAutoUpdateToggle}
              className={`relative h-6 w-11 rounded-full transition-colors ${autoUpdate ? 'bg-violet-600' : 'bg-zinc-700'}`}
              role="switch"
              aria-checked={autoUpdate}
            >
              <span
                className={`absolute left-0.5 top-0.5 h-5 w-5 rounded-full bg-white transition-transform ${autoUpdate ? 'translate-x-5' : 'translate-x-0'}`}
              />
            </button>
          </div>
        </section>

        {/* Diagnostics (P9-10) */}
        <section>
          <h2 className="mb-3 text-sm font-medium text-zinc-400">Diagnostics</h2>
          <button
            onClick={handleExportErrorReport}
            disabled={exporting}
            className="rounded-md border border-zinc-700 bg-zinc-900 px-4 py-2 text-sm text-zinc-300 hover:bg-zinc-800 disabled:opacity-50"
          >
            {exporting ? 'Exporting…' : 'Export Error Report'}
          </button>
          <p className="mt-1 text-xs text-zinc-600">
            Collects logs, preferences, and system info into a folder for troubleshooting.
          </p>
        </section>
      </div>
    </div>
  );
}
