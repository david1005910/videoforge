import { useState, useEffect, useCallback } from 'react';
import { api } from '../lib/api';
import { useUiStore } from '../stores/ui-store';
import { useT } from '../i18n';
import type { WhisperModelInfo } from '@videoforge/shared';

/**
 * Settings page with API key management, auto-update toggle (P10-03),
 * Whisper model management (P12), accessibility/font size (P9-08),
 * and error report export (P9-10).
 */
export function SettingsPage() {
  const t = useT();
  const [apiKey, setApiKey] = useState('');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [autoUpdate, setAutoUpdate] = useState(false);
  const [exporting, setExporting] = useState(false);
  const fontScale = useUiStore((s) => s.fontScale);
  const setFontScale = useUiStore((s) => s.setFontScale);
  const theme = useUiStore((s) => s.theme);
  const setTheme = useUiStore((s) => s.setTheme);

  // Whisper state
  const [whisperModels, setWhisperModels] = useState<WhisperModelInfo[]>([]);
  const [binaryReady, setBinaryReady] = useState(false);
  const [downloadingBinary, setDownloadingBinary] = useState(false);
  const [downloadingModel, setDownloadingModel] = useState<string | null>(null);

  const loadWhisperModels = useCallback(async () => {
    try {
      const result = await api.stt.whisperModels();
      setWhisperModels(result.models);
      setBinaryReady(result.binaryReady);
    } catch (err) {
      console.error('whisperModels failed', err);
    }
  }, []);

  useEffect(() => {
    void api.keychain.get('auto-update-enabled').then((val) => {
      setAutoUpdate(val === 'true');
    });
    void loadWhisperModels();
  }, [loadWhisperModels]);

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

  const handleDownloadBinary = async () => {
    setDownloadingBinary(true);
    try {
      await api.stt.whisperBinaryDownload();
      setBinaryReady(true);
    } catch (err) {
      console.error('whisper binary download failed', err);
    } finally {
      setDownloadingBinary(false);
    }
  };

  const handleDownloadModel = async (modelId: string) => {
    setDownloadingModel(modelId);
    try {
      await api.stt.whisperDownload({ modelId: modelId as WhisperModelInfo['id'] });
      await loadWhisperModels();
    } catch (err) {
      console.error('whisper model download failed', err);
    } finally {
      setDownloadingModel(null);
    }
  };

  const handleDeleteModel = async (modelId: string) => {
    try {
      await api.stt.whisperDelete({ modelId: modelId as WhisperModelInfo['id'] });
      await loadWhisperModels();
    } catch (err) {
      console.error('whisper model delete failed', err);
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
              <label htmlFor="gemini-key" className="mb-1 block text-xs text-zinc-500">
                Gemini API Key
              </label>
              <div className="flex gap-2">
                <input
                  id="gemini-key"
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

        {/* Whisper Local (P12) */}
        <section>
          <h2 className="mb-3 text-sm font-medium text-zinc-400">{t('whisper.title')}</h2>

          {/* Binary status */}
          <div className="mb-4 rounded-lg border border-zinc-800 bg-zinc-900 p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-zinc-200">{t('whisper.binaryStatus')}</p>
                <p className="text-xs text-zinc-500">
                  {binaryReady ? (
                    <span className="text-green-400">{t('whisper.binaryReady')}</span>
                  ) : (
                    <span className="text-yellow-400">{t('whisper.binaryNotReady')}</span>
                  )}
                </p>
              </div>
              {!binaryReady && (
                <button
                  onClick={handleDownloadBinary}
                  disabled={downloadingBinary}
                  className="rounded-md bg-violet-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-violet-500 disabled:opacity-50"
                >
                  {downloadingBinary ? t('whisper.downloading') : t('whisper.downloadBinary')}
                </button>
              )}
            </div>
          </div>

          {/* Model list */}
          <div>
            <p className="mb-2 text-xs text-zinc-500">{t('whisper.models')}</p>
            <div className="space-y-2">
              {whisperModels.map((model) => (
                <div
                  key={model.id}
                  className="flex items-center justify-between rounded-lg border border-zinc-800 bg-zinc-900 px-4 py-3"
                >
                  <div className="min-w-0 flex-1">
                    <p className="text-sm text-zinc-200">
                      {model.label}
                      {model.id === 'ggml-large-v3-turbo-q5_0' && (
                        <span className="ml-2 rounded bg-violet-600/20 px-1.5 py-0.5 text-xs text-violet-300">
                          {t('whisper.recommended')}
                        </span>
                      )}
                    </p>
                    <p className="text-xs text-zinc-500">
                      {model.sizeMB}MB ·{' '}
                      {model.downloaded ? (
                        <span className="text-green-400">{t('whisper.downloaded')}</span>
                      ) : (
                        <span className="text-zinc-600">{t('whisper.notDownloaded')}</span>
                      )}
                    </p>
                  </div>
                  <div className="ml-3 flex gap-2">
                    {model.downloaded ? (
                      <button
                        onClick={() => void handleDeleteModel(model.id)}
                        className="rounded border border-zinc-700 px-2 py-1 text-xs text-zinc-400 hover:border-red-700 hover:text-red-400"
                      >
                        {t('whisper.delete')}
                      </button>
                    ) : (
                      <button
                        onClick={() => void handleDownloadModel(model.id)}
                        disabled={downloadingModel !== null}
                        className="rounded bg-violet-600 px-2 py-1 text-xs font-medium text-white hover:bg-violet-500 disabled:opacity-50"
                      >
                        {downloadingModel === model.id
                          ? t('whisper.downloading')
                          : t('whisper.download')}
                      </button>
                    )}
                  </div>
                </div>
              ))}
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
              aria-label="Auto-check for updates"
            >
              <span
                className={`absolute left-0.5 top-0.5 h-5 w-5 rounded-full bg-white transition-transform ${autoUpdate ? 'translate-x-5' : 'translate-x-0'}`}
              />
            </button>
          </div>
        </section>

        {/* Theme */}
        <section>
          <h2 className="mb-3 text-sm font-medium text-zinc-400">Theme</h2>
          <div className="flex gap-2" role="radiogroup" aria-label="Theme">
            {(['system', 'dark', 'light'] as const).map((opt) => (
              <button
                key={opt}
                onClick={() => setTheme(opt)}
                role="radio"
                aria-checked={theme === opt}
                className={`flex-1 rounded-lg border px-3 py-2 text-center text-sm capitalize ${
                  theme === opt
                    ? 'border-violet-500 bg-violet-500/10 text-violet-300'
                    : 'border-zinc-700 bg-zinc-900 text-zinc-400 hover:border-zinc-600'
                }`}
              >
                {opt}
              </button>
            ))}
          </div>
        </section>

        {/* Accessibility (P9-08) */}
        <section>
          <h2 className="mb-3 text-sm font-medium text-zinc-400">Accessibility</h2>
          <div className="space-y-3">
            <div>
              <label className="mb-2 block text-xs text-zinc-500">Font Size</label>
              <div className="flex gap-2" role="radiogroup" aria-label="Font size">
                {(['small', 'normal', 'large'] as const).map((scale) => (
                  <button
                    key={scale}
                    onClick={() => setFontScale(scale)}
                    role="radio"
                    aria-checked={fontScale === scale}
                    className={`flex-1 rounded-lg border px-3 py-2 text-center text-sm capitalize ${
                      fontScale === scale
                        ? 'border-violet-500 bg-violet-500/10 text-violet-300'
                        : 'border-zinc-700 bg-zinc-900 text-zinc-400 hover:border-zinc-600'
                    }`}
                  >
                    {scale}
                  </button>
                ))}
              </div>
            </div>
            <p className="text-xs text-zinc-600">
              Keyboard navigation: Use Tab/Shift+Tab to move between controls, Enter/Space to
              activate.
            </p>
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
