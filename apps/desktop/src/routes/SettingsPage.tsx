import { useState } from 'react';
import { api } from '../lib/api';

export function SettingsPage() {
  const [apiKey, setApiKey] = useState('');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

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

  const handleExportLogs = async () => {
    try {
      const res = await api.dialog.selectFolder('Select folder for error report');
      if (res.folderPath) {
        await api.shell.openExternal(`file://${res.folderPath}`);
      }
    } catch (err) {
      console.error('exportLogs failed', err);
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

        {/* Diagnostics */}
        <section>
          <h2 className="mb-3 text-sm font-medium text-zinc-400">Diagnostics</h2>
          <button
            onClick={handleExportLogs}
            className="rounded-md border border-zinc-700 bg-zinc-900 px-4 py-2 text-sm text-zinc-300 hover:bg-zinc-800"
          >
            Export Error Report
          </button>
          <p className="mt-1 text-xs text-zinc-600">
            Collects logs and system info for troubleshooting.
          </p>
        </section>
      </div>
    </div>
  );
}
