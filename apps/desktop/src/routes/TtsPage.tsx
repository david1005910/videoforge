import { useState } from 'react';
import { useNavigate } from '@tanstack/react-router';
import { ArrowLeft, Play, Square, Download, Volume2, FolderOpen } from 'lucide-react';
import { api } from '../lib/api';
import { useT } from '../i18n';
import { EDGE_VOICES } from '../lib/voices';
import { Waveform } from '../components/Waveform';
import type { TtsResult } from '@videoforge/shared';

export function TtsPage(): JSX.Element {
  const t = useT();
  const navigate = useNavigate();

  const [text, setText] = useState('');
  const [voice, setVoice] = useState(EDGE_VOICES[0]?.id ?? 'ko-KR-SunHiNeural');
  const [speed, setSpeed] = useState(1.0);
  const [provider, setProvider] = useState<'edge' | 'google' | 'gemini'>('edge');
  const [isGenerating, setGenerating] = useState(false);
  const [result, setResult] = useState<TtsResult | null>(null);
  const [error, setError] = useState('');
  const [isPlaying, setPlaying] = useState(false);

  const filteredVoices = EDGE_VOICES.filter((v) => v.provider === provider);

  const [audioBlobUrl, setAudioBlobUrl] = useState<string | null>(null);

  /** file path -> blob URL (webSecurity: true) */
  const createBlobUrl = async (filePath: string): Promise<string> => {
    const { base64Data, mimeType } = await api.file.readBase64(filePath);
    const binary = atob(base64Data);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
    const blob = new Blob([bytes], { type: mimeType });
    return URL.createObjectURL(blob);
  };

  const releaseBlobUrl = () => {
    if (audioBlobUrl) {
      URL.revokeObjectURL(audioBlobUrl);
      setAudioBlobUrl(null);
    }
  };

  const handleGenerate = async () => {
    if (!text.trim()) return;
    setGenerating(true);
    setError('');
    setResult(null);
    releaseBlobUrl();
    setPlaying(false);

    try {
      let res: TtsResult;
      if (provider === 'edge') {
        res = await api.tts.edge({ text, voice, speed, pitch: 0 });
      } else if (provider === 'google') {
        res = await api.tts.google({ text, voice, speed, pitch: 0, voiceProfile: 'wavenet' });
      } else {
        res = await api.tts.gemini({ text, voice, speed, pitch: 0 });
      }
      const blobUrl = await createBlobUrl(res.audioPath);
      setAudioBlobUrl(blobUrl);
      setResult(res);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setGenerating(false);
    }
  };

  const handleLoadAudio = async () => {
    setError('');
    try {
      const { filePath } = await api.dialog.selectFile(t('tts.loadAudio'), undefined, [
        { name: 'Audio', extensions: ['mp3', 'wav', 'ogg', 'aac', 'm4a', 'flac', 'webm'] },
      ]);
      if (!filePath) return;

      releaseBlobUrl();
      setPlaying(false);

      const blobUrl = await createBlobUrl(filePath);
      setAudioBlobUrl(blobUrl);
      setResult({ audioPath: filePath, durationMs: 0, cached: false });
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  };

  const handlePlayPause = () => setPlaying((p) => !p);

  const handleSave = async () => {
    if (!result) return;
    try {
      await api.file.readBase64(result.audioPath).then(async (r) => {
        await api.file.saveToDisk(r.base64Data, 'narration.mp3');
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  };

  const formatDuration = (ms: number): string => {
    const s = Math.round(ms / 1000);
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m}:${sec.toString().padStart(2, '0')}`;
  };

  return (
    <div className="gooey-page flex h-full flex-col">
      {/* Titlebar */}
      <div className="titlebar-drag gooey-header flex h-10 items-center gap-3 px-4">
        <button
          type="button"
          onClick={() => void navigate({ to: '/' })}
          className="titlebar-no-drag gooey-btn-ghost flex items-center gap-1 px-2 py-1 text-xs"
        >
          <ArrowLeft size={14} />
          {t('projects.title')}
        </button>
        <span className="gooey-text-muted text-xs">TTS</span>
      </div>

      <main className="gooey-scrollbar flex-1 overflow-auto p-8">
        <div className="mx-auto max-w-3xl space-y-6">
          <h1 className="gooey-text-primary text-2xl font-bold">{t('tts.title')}</h1>

          {/* Provider */}
          <div className="flex gap-2">
            {(['edge', 'google', 'gemini'] as const).map((p) => (
              <button
                key={p}
                type="button"
                onClick={() => {
                  setProvider(p);
                  const first = EDGE_VOICES.find((v) => v.provider === p);
                  if (first) setVoice(first.id);
                }}
                className={`rounded-2xl px-4 py-2 text-sm font-medium transition ${
                  provider === p ? 'gooey-btn-primary' : 'gooey-btn-secondary'
                }`}
              >
                {p === 'edge' ? 'Edge TTS' : p === 'google' ? 'Google TTS' : 'Gemini TTS'}
              </button>
            ))}
          </div>

          {/* Voice + Speed */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="tts-voice" className="gooey-text-secondary mb-1 block text-sm">
                {t('tts.voice')}
              </label>
              <select
                id="tts-voice"
                value={voice}
                onChange={(e) => setVoice(e.target.value)}
                className="gooey-input w-full px-3 py-2 text-sm"
              >
                {filteredVoices.map((v) => (
                  <option key={v.id} value={v.id}>
                    {v.displayName} ({v.language})
                  </option>
                ))}
                {filteredVoices.length === 0 && <option value={voice}>{voice}</option>}
              </select>
            </div>
            <div>
              <label htmlFor="tts-speed" className="gooey-text-secondary mb-1 block text-sm">
                {t('tts.speed')}: {speed.toFixed(1)}x
              </label>
              <input
                id="tts-speed"
                type="range"
                min="0.5"
                max="2"
                step="0.1"
                value={speed}
                onChange={(e) => setSpeed(parseFloat(e.target.value))}
                className="mt-2 w-full accent-violet-500"
              />
            </div>
          </div>

          {/* Text Input */}
          <div>
            <label htmlFor="tts-text" className="gooey-text-secondary mb-1 block text-sm">
              {t('tts.text')}
            </label>
            <textarea
              id="tts-text"
              value={text}
              onChange={(e) => setText(e.target.value)}
              rows={6}
              className="gooey-input w-full px-3 py-2 text-sm"
              placeholder={t('tts.text.placeholder')}
            />
            <div className="gooey-text-muted mt-1 text-right text-xs">
              {text.length.toLocaleString()} / 50,000
            </div>
          </div>

          {/* Generate + Load */}
          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => void handleGenerate()}
              disabled={!text.trim() || isGenerating}
              className="gooey-btn-primary flex items-center gap-2 px-6 py-2.5 text-sm"
            >
              <Volume2 size={16} />
              {isGenerating ? t('tts.generating') : t('tts.generate')}
            </button>
            <button
              type="button"
              onClick={() => void handleLoadAudio()}
              disabled={isGenerating}
              className="gooey-btn-secondary flex items-center gap-2 px-6 py-2.5 text-sm"
            >
              <FolderOpen size={16} />
              {t('tts.loadAudio')}
            </button>
          </div>

          {/* Error */}
          {error && <div className="gooey-error p-3 text-sm">{error}</div>}

          {/* Result */}
          {result && (
            <div className="gooey-panel space-y-3 p-4">
              <div className="flex items-center justify-between">
                <div className="text-sm">
                  {result.durationMs > 0 && (
                    <>
                      <span className="gooey-text-secondary">{t('tts.duration')}:</span>{' '}
                      <span className="font-mono text-white/90">
                        {formatDuration(result.durationMs)}
                      </span>
                    </>
                  )}
                  {result.cached && (
                    <span className="ml-2 rounded-full bg-blue-500/15 px-1.5 py-0.5 text-xs text-blue-300">
                      {t('tts.cached')}
                    </span>
                  )}
                </div>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={handlePlayPause}
                    className="gooey-btn-secondary flex items-center gap-1 px-3 py-1.5 text-sm"
                  >
                    {isPlaying ? <Square size={14} /> : <Play size={14} />}
                    {isPlaying ? t('tts.stop') : t('tts.play')}
                  </button>
                  <button
                    type="button"
                    onClick={() => void handleSave()}
                    className="gooey-btn-secondary flex items-center gap-1 px-3 py-1.5 text-sm"
                  >
                    <Download size={14} />
                    {t('tts.save')}
                  </button>
                </div>
              </div>
              {audioBlobUrl && (
                <Waveform
                  audioPath={audioBlobUrl}
                  isPlaying={isPlaying}
                  onPlayPause={handlePlayPause}
                  onFinish={() => setPlaying(false)}
                />
              )}
              <div className="gooey-text-muted truncate text-xs">{result.audioPath}</div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
