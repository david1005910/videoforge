import { useState, useEffect, useCallback } from 'react';
import { api } from '../../lib/api';
import { useT } from '../../i18n';
import type { WhisperModelInfo } from '@videoforge/shared';

export function WhisperSection() {
  const t = useT();
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
    void loadWhisperModels();
  }, [loadWhisperModels]);

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

  return (
    <section>
      <h2 className="gooey-text-secondary mb-3 text-sm font-medium">{t('whisper.title')}</h2>

      <div className="gooey-card mb-4 p-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-[#f0e8ff]">{t('whisper.binaryStatus')}</p>
            <p className="text-xs">
              {binaryReady ? (
                <span className="text-[#00F0FF]">{t('whisper.binaryReady')}</span>
              ) : (
                <span className="text-[#FF7AD9]">{t('whisper.binaryNotReady')}</span>
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

      <div>
        <p className="gooey-text-muted mb-2 text-xs">{t('whisper.models')}</p>
        <div className="space-y-2">
          {whisperModels.map((model) => (
            <div key={model.id} className="gooey-card flex items-center justify-between px-4 py-3">
              <div className="min-w-0 flex-1">
                <p className="text-sm text-[#f0e8ff]">
                  {model.label}
                  {model.id === 'ggml-large-v3-turbo-q5_0' && (
                    <span className="ml-2 rounded-full bg-[#FF4FBE]/15 px-1.5 py-0.5 text-xs text-[#FF7AD9]">
                      {t('whisper.recommended')}
                    </span>
                  )}
                </p>
                <p className="text-xs text-[#9B5BFF]/40">
                  {model.sizeMB}MB ·{' '}
                  {model.downloaded ? (
                    <span className="text-[#00F0FF]">{t('whisper.downloaded')}</span>
                  ) : (
                    <span className="text-[#9B5BFF]/30">{t('whisper.notDownloaded')}</span>
                  )}
                </p>
              </div>
              <div className="ml-3 flex gap-2">
                {model.downloaded ? (
                  <button
                    onClick={() => void handleDeleteModel(model.id)}
                    className="gooey-btn-secondary px-2 py-1 text-xs hover:border-[#FF6A3D]/30 hover:text-[#FF6A3D]"
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
  );
}
