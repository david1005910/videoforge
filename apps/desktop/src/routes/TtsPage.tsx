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

  const handleGenerate = async () => {
    if (!text.trim()) return;
    setGenerating(true);
    setError('');
    setResult(null);

    try {
      let res: TtsResult;
      if (provider === 'edge') {
        res = await api.tts.edge({ text, voice, speed, pitch: 0 });
      } else if (provider === 'google') {
        res = await api.tts.google({ text, voice, speed, pitch: 0, voiceProfile: 'wavenet' });
      } else {
        res = await api.tts.gemini({ text, voice, speed, pitch: 0 });
      }
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
      setResult({ audioPath: filePath, durationMs: 0, cached: false });
      setPlaying(false);
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
    <div className="flex h-full flex-col">
      {/* 타이틀바 */}
      <div className="titlebar-drag flex h-10 items-center gap-3 border-b border-zinc-800 px-4">
        <button
          type="button"
          onClick={() => void navigate({ to: '/' })}
          className="titlebar-no-drag flex items-center gap-1 rounded-md px-2 py-1 text-xs text-zinc-400 transition hover:bg-zinc-800 hover:text-zinc-200"
        >
          <ArrowLeft size={14} />
          {t('projects.title')}
        </button>
        <span className="text-xs text-zinc-500">TTS</span>
      </div>

      <main className="flex-1 overflow-auto p-8">
        <div className="mx-auto max-w-3xl space-y-6">
          <h1 className="text-2xl font-bold">{t('tts.title')}</h1>

          {/* Provider 선택 */}
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
                className={`rounded-lg px-4 py-2 text-sm font-medium transition ${
                  provider === p
                    ? 'bg-accent text-white'
                    : 'border border-zinc-700 text-zinc-400 hover:bg-zinc-800'
                }`}
              >
                {p === 'edge' ? 'Edge TTS' : p === 'google' ? 'Google TTS' : 'Gemini TTS'}
              </button>
            ))}
          </div>

          {/* 보이스 + 속도 */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="tts-voice" className="mb-1 block text-sm text-zinc-400">
                {t('tts.voice')}
              </label>
              <select
                id="tts-voice"
                value={voice}
                onChange={(e) => setVoice(e.target.value)}
                className="focus:border-accent w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm focus:outline-none"
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
              <label htmlFor="tts-speed" className="mb-1 block text-sm text-zinc-400">
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
                className="accent-accent mt-2 w-full"
              />
            </div>
          </div>

          {/* 텍스트 입력 */}
          <div>
            <label htmlFor="tts-text" className="mb-1 block text-sm text-zinc-400">
              {t('tts.text')}
            </label>
            <textarea
              id="tts-text"
              value={text}
              onChange={(e) => setText(e.target.value)}
              rows={6}
              className="focus:border-accent w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm focus:outline-none"
              placeholder={t('tts.text.placeholder')}
            />
            <div className="mt-1 text-right text-xs text-zinc-600">
              {text.length.toLocaleString()} / 50,000
            </div>
          </div>

          {/* 생성 버튼 + 파일 불러오기 */}
          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => void handleGenerate()}
              disabled={!text.trim() || isGenerating}
              className="bg-accent hover:bg-accent-600 flex items-center gap-2 rounded-lg px-6 py-2.5 text-sm font-medium text-white transition disabled:opacity-50"
            >
              <Volume2 size={16} />
              {isGenerating ? t('tts.generating') : t('tts.generate')}
            </button>
            <button
              type="button"
              onClick={() => void handleLoadAudio()}
              disabled={isGenerating}
              className="flex items-center gap-2 rounded-lg border border-zinc-700 px-6 py-2.5 text-sm font-medium text-zinc-300 transition hover:bg-zinc-800 disabled:opacity-50"
            >
              <FolderOpen size={16} />
              {t('tts.loadAudio')}
            </button>
          </div>

          {/* 에러 */}
          {error && (
            <div className="rounded-lg border border-red-800 bg-red-950/30 p-3 text-sm text-red-400">
              {error}
            </div>
          )}

          {/* 결과 */}
          {result && (
            <div className="space-y-3 rounded-lg border border-zinc-700 bg-zinc-900/50 p-4">
              <div className="flex items-center justify-between">
                <div className="text-sm">
                  {result.durationMs > 0 && (
                    <>
                      <span className="text-zinc-400">{t('tts.duration')}:</span>{' '}
                      <span className="font-mono">{formatDuration(result.durationMs)}</span>
                    </>
                  )}
                  {result.cached && (
                    <span className="ml-2 rounded bg-blue-900/40 px-1.5 py-0.5 text-xs text-blue-300">
                      {t('tts.cached')}
                    </span>
                  )}
                </div>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={handlePlayPause}
                    className="flex items-center gap-1 rounded-md border border-zinc-700 px-3 py-1.5 text-sm transition hover:bg-zinc-800"
                  >
                    {isPlaying ? <Square size={14} /> : <Play size={14} />}
                    {isPlaying ? t('tts.stop') : t('tts.play')}
                  </button>
                  <button
                    type="button"
                    onClick={() => void handleSave()}
                    className="flex items-center gap-1 rounded-md border border-zinc-700 px-3 py-1.5 text-sm transition hover:bg-zinc-800"
                  >
                    <Download size={14} />
                    {t('tts.save')}
                  </button>
                </div>
              </div>
              <Waveform
                audioPath={result.audioPath}
                isPlaying={isPlaying}
                onPlayPause={handlePlayPause}
                onFinish={() => setPlaying(false)}
              />
              <div className="truncate text-xs text-zinc-600">{result.audioPath}</div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
