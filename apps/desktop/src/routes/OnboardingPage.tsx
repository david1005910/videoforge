import { useState } from 'react';
import { api } from '../lib/api';
import { useNavigate } from '@tanstack/react-router';

/**
 * P9-09: First-run onboarding — API key setup guide.
 */

type Step = 'welcome' | 'apiKey' | 'done';

export function OnboardingPage() {
  const [step, setStep] = useState<Step>('welcome');
  const [geminiKey, setGeminiKey] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleSaveKey = async () => {
    if (!geminiKey.trim()) {
      setStep('done');
      return;
    }
    setSaving(true);
    setError('');
    try {
      await api.keychain.set('gemini-api-key', geminiKey.trim());
      setStep('done');
    } catch (err) {
      setError(String(err));
    } finally {
      setSaving(false);
    }
  };

  const handleFinish = async () => {
    try {
      await api.keychain.set('onboarding-complete', 'true');
    } catch {
      /* noop */
    }
    void navigate({ to: '/' });
  };

  return (
    <div className="gooey-page flex h-full items-center justify-center">
      <div className="gooey-modal w-full max-w-lg p-8">
        {step === 'welcome' && (
          <div className="space-y-4 text-center">
            <h1 className="gooey-text-primary text-2xl font-bold">VideoForge</h1>
            <p className="gooey-text-secondary text-sm">
              AI video creation studio for macOS. Let&apos;s set up a few things to get started.
            </p>
            <button
              onClick={() => setStep('apiKey')}
              className="gooey-btn-primary mt-4 px-6 py-2.5 text-sm"
            >
              Get Started
            </button>
          </div>
        )}

        {step === 'apiKey' && (
          <div className="space-y-4">
            <h2 className="gooey-text-primary text-lg font-semibold">API Key Setup</h2>
            <p className="gooey-text-secondary text-sm">
              VideoForge uses Google Gemini for AI features (chat, thumbnail analysis, TTS). Enter
              your API key below, or skip to set it up later in Settings.
            </p>
            <div>
              <label className="gooey-text-muted mb-1 block text-xs">Gemini API Key</label>
              <input
                type="password"
                value={geminiKey}
                onChange={(e) => setGeminiKey(e.target.value)}
                placeholder="AIza…"
                className="gooey-input w-full px-3 py-2 text-sm"
              />
              <p className="gooey-text-muted mt-1 text-xs">
                Stored securely in macOS Keychain via safeStorage.
              </p>
            </div>
            {error && <p className="text-sm text-red-400">{error}</p>}
            <div className="flex justify-between pt-2">
              <button onClick={() => setStep('done')} className="gooey-btn-ghost px-4 py-2 text-sm">
                Skip
              </button>
              <button
                onClick={handleSaveKey}
                disabled={saving}
                className="gooey-btn-primary px-6 py-2 text-sm"
              >
                {saving ? 'Saving…' : geminiKey.trim() ? 'Save & Continue' : 'Continue'}
              </button>
            </div>
          </div>
        )}

        {step === 'done' && (
          <div className="space-y-4 text-center">
            <h2 className="gooey-text-primary text-lg font-semibold">All Set!</h2>
            <p className="gooey-text-secondary text-sm">
              You can always change settings later from the Settings page.
            </p>
            <button onClick={handleFinish} className="gooey-btn-primary mt-4 px-6 py-2.5 text-sm">
              Start Using VideoForge
            </button>
          </div>
        )}

        {/* Step indicator */}
        <div className="mt-6 flex justify-center gap-2">
          {(['welcome', 'apiKey', 'done'] as Step[]).map((s) => (
            <div
              key={s}
              className={`h-1.5 w-8 rounded-full transition-all ${
                s === step
                  ? 'bg-gradient-to-r from-violet-500 to-pink-500 shadow-[0_0_8px_rgba(139,92,246,0.4)]'
                  : 'bg-white/10'
              }`}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
