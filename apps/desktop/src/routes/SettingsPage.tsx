import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from '@tanstack/react-router';
import { ArrowLeft } from 'lucide-react';
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
  const navigate = useNavigate();
  const [apiKey, setApiKey] = useState('');
  const [openaiKey, setOpenaiKey] = useState('');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [savingOpenai, setSavingOpenai] = useState(false);
  const [savedOpenai, setSavedOpenai] = useState(false);
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

  const handleSaveOpenaiKey = async () => {
    if (!openaiKey.trim()) return;
    setSavingOpenai(true);
    try {
      await api.keychain.set('openai-api-key', openaiKey.trim());
      setSavedOpenai(true);
      setTimeout(() => setSavedOpenai(false), 2000);
    } catch (err) {
      console.error('keychain.set failed', err);
    } finally {
      setSavingOpenai(false);
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
        {/* API Keys */}
        <section>
          <h2 className="gooey-text-secondary mb-3 text-sm font-medium">API Keys</h2>
          <div className="space-y-3">
            <div>
              <label htmlFor="gemini-key" className="gooey-text-muted mb-1 block text-xs">
                Gemini API Key
              </label>
              <div className="flex gap-2">
                <input
                  id="gemini-key"
                  type="password"
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  placeholder="Enter Gemini API key…"
                  className="gooey-input flex-1 px-3 py-1.5 text-sm"
                />
                <button
                  onClick={handleSaveApiKey}
                  disabled={saving || !apiKey.trim()}
                  className="gooey-btn-primary px-3 py-1.5 text-sm"
                >
                  {saved ? 'Saved!' : 'Save'}
                </button>
              </div>
              <p className="gooey-text-muted mt-1 text-xs">
                Stored securely in macOS Keychain via safeStorage.
              </p>
            </div>
            <div>
              <label htmlFor="openai-key" className="gooey-text-muted mb-1 block text-xs">
                OpenAI API Key
              </label>
              <div className="flex gap-2">
                <input
                  id="openai-key"
                  type="password"
                  value={openaiKey}
                  onChange={(e) => setOpenaiKey(e.target.value)}
                  placeholder="Enter OpenAI API key…"
                  className="gooey-input flex-1 px-3 py-1.5 text-sm"
                />
                <button
                  onClick={handleSaveOpenaiKey}
                  disabled={savingOpenai || !openaiKey.trim()}
                  className="gooey-btn-primary px-3 py-1.5 text-sm"
                >
                  {savedOpenai ? 'Saved!' : 'Save'}
                </button>
              </div>
              <p className="gooey-text-muted mt-1 text-xs">
                Used for STT (Whisper API) subtitle generation.
              </p>
            </div>
          </div>
        </section>

        {/* Whisper Local (P12) */}
        <section>
          <h2 className="gooey-text-secondary mb-3 text-sm font-medium">{t('whisper.title')}</h2>

          {/* Binary status */}
          <div className="gooey-card mb-4 p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-white/85">{t('whisper.binaryStatus')}</p>
                <p className="text-xs">
                  {binaryReady ? (
                    <span className="text-emerald-400">{t('whisper.binaryReady')}</span>
                  ) : (
                    <span className="text-amber-400">{t('whisper.binaryNotReady')}</span>
                  )}
                </p>
              </div>
              {!binaryReady && (
                <button
                  onClick={handleDownloadBinary}
                  disabled={downloadingBinary}
                  className="gooey-btn-primary px-3 py-1.5 text-sm"
                >
                  {downloadingBinary ? t('whisper.downloading') : t('whisper.downloadBinary')}
                </button>
              )}
            </div>
          </div>

          {/* Model list */}
          <div>
            <p className="gooey-text-muted mb-2 text-xs">{t('whisper.models')}</p>
            <div className="space-y-2">
              {whisperModels.map((model) => (
                <div
                  key={model.id}
                  className="gooey-card flex items-center justify-between px-4 py-3"
                >
                  <div className="min-w-0 flex-1">
                    <p className="text-sm text-white/85">
                      {model.label}
                      {model.id === 'ggml-large-v3-turbo-q5_0' && (
                        <span className="ml-2 rounded-full bg-violet-500/20 px-1.5 py-0.5 text-xs text-violet-300">
                          {t('whisper.recommended')}
                        </span>
                      )}
                    </p>
                    <p className="text-xs text-white/35">
                      {model.sizeMB}MB ·{' '}
                      {model.downloaded ? (
                        <span className="text-emerald-400">{t('whisper.downloaded')}</span>
                      ) : (
                        <span className="text-white/25">{t('whisper.notDownloaded')}</span>
                      )}
                    </p>
                  </div>
                  <div className="ml-3 flex gap-2">
                    {model.downloaded ? (
                      <button
                        onClick={() => void handleDeleteModel(model.id)}
                        className="gooey-btn-secondary px-2 py-1 text-xs hover:border-red-500/30 hover:text-red-400"
                      >
                        {t('whisper.delete')}
                      </button>
                    ) : (
                      <button
                        onClick={() => void handleDownloadModel(model.id)}
                        disabled={downloadingModel !== null}
                        className="gooey-btn-primary px-2 py-1 text-xs"
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
          <h2 className="gooey-text-secondary mb-3 text-sm font-medium">Updates</h2>
          <div className="gooey-card flex items-center justify-between p-4">
            <div>
              <p className="text-sm text-white/85">Auto-check for updates</p>
              <p className="text-xs text-white/35">
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

        {/* Theme */}
        <section>
          <h2 className="gooey-text-secondary mb-3 text-sm font-medium">Theme</h2>
          <div className="flex gap-2" role="radiogroup" aria-label="Theme">
            {(['system', 'dark', 'light'] as const).map((opt) => (
              <button
                key={opt}
                onClick={() => setTheme(opt)}
                role="radio"
                aria-checked={theme === opt}
                className={`flex-1 rounded-2xl border px-3 py-2 text-center text-sm capitalize transition ${
                  theme === opt
                    ? 'border-violet-500/40 bg-violet-500/10 text-violet-300 shadow-[0_0_12px_rgba(139,92,246,0.15)]'
                    : 'border-white/8 bg-white/4 hover:border-white/12 text-white/40'
                }`}
              >
                {opt}
              </button>
            ))}
          </div>
        </section>

        {/* Accessibility (P9-08) */}
        <section>
          <h2 className="gooey-text-secondary mb-3 text-sm font-medium">Accessibility</h2>
          <div className="space-y-3">
            <div>
              <label className="gooey-text-muted mb-2 block text-xs">Font Size</label>
              <div className="flex gap-2" role="radiogroup" aria-label="Font size">
                {(['small', 'normal', 'large'] as const).map((scale) => (
                  <button
                    key={scale}
                    onClick={() => setFontScale(scale)}
                    role="radio"
                    aria-checked={fontScale === scale}
                    className={`flex-1 rounded-2xl border px-3 py-2 text-center text-sm capitalize transition ${
                      fontScale === scale
                        ? 'border-violet-500/40 bg-violet-500/10 text-violet-300 shadow-[0_0_12px_rgba(139,92,246,0.15)]'
                        : 'border-white/8 bg-white/4 hover:border-white/12 text-white/40'
                    }`}
                  >
                    {scale}
                  </button>
                ))}
              </div>
            </div>
            <p className="gooey-text-muted text-xs">
              Keyboard navigation: Use Tab/Shift+Tab to move between controls, Enter/Space to
              activate.
            </p>
          </div>
        </section>

        {/* Diagnostics (P9-10) */}
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
