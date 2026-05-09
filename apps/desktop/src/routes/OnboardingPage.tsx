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
    <div className="flex h-full items-center justify-center bg-zinc-950 text-zinc-100">
      <div className="w-full max-w-lg rounded-xl border border-zinc-800 bg-zinc-900 p-8">
        {step === 'welcome' && (
          <div className="space-y-4 text-center">
            <h1 className="text-2xl font-bold">VideoForge</h1>
            <p className="text-sm text-zinc-400">
              AI video creation studio for macOS. Let&apos;s set up a few things to get started.
            </p>
            <button
              onClick={() => setStep('apiKey')}
              className="mt-4 rounded-md bg-violet-600 px-6 py-2.5 text-sm font-medium text-white hover:bg-violet-500"
            >
              Get Started
            </button>
          </div>
        )}

        {step === 'apiKey' && (
          <div className="space-y-4">
            <h2 className="text-lg font-semibold">API Key Setup</h2>
            <p className="text-sm text-zinc-400">
              VideoForge uses Google Gemini for AI features (chat, thumbnail analysis, TTS). Enter
              your API key below, or skip to set it up later in Settings.
            </p>
            <div>
              <label className="mb-1 block text-xs text-zinc-500">Gemini API Key</label>
              <input
                type="password"
                value={geminiKey}
                onChange={(e) => setGeminiKey(e.target.value)}
                placeholder="AIza…"
                className="w-full rounded-md border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-zinc-200 placeholder:text-zinc-600"
              />
              <p className="mt-1 text-xs text-zinc-600">
                Stored securely in macOS Keychain via safeStorage.
              </p>
            </div>
            {error && <p className="text-sm text-red-400">{error}</p>}
            <div className="flex justify-between pt-2">
              <button
                onClick={() => setStep('done')}
                className="rounded-md px-4 py-2 text-sm text-zinc-400 hover:text-zinc-200"
              >
                Skip
              </button>
              <button
                onClick={handleSaveKey}
                disabled={saving}
                className="rounded-md bg-violet-600 px-6 py-2 text-sm font-medium text-white hover:bg-violet-500 disabled:opacity-50"
              >
                {saving ? 'Saving…' : geminiKey.trim() ? 'Save & Continue' : 'Continue'}
              </button>
            </div>
          </div>
        )}

        {step === 'done' && (
          <div className="space-y-4 text-center">
            <h2 className="text-lg font-semibold">All Set!</h2>
            <p className="text-sm text-zinc-400">
              You can always change settings later from the Settings page.
            </p>
            <button
              onClick={handleFinish}
              className="mt-4 rounded-md bg-violet-600 px-6 py-2.5 text-sm font-medium text-white hover:bg-violet-500"
            >
              Start Using VideoForge
            </button>
          </div>
        )}

        {/* Step indicator */}
        <div className="mt-6 flex justify-center gap-2">
          {(['welcome', 'apiKey', 'done'] as Step[]).map((s) => (
            <div
              key={s}
              className={`h-1.5 w-8 rounded-full ${s === step ? 'bg-violet-500' : 'bg-zinc-700'}`}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
