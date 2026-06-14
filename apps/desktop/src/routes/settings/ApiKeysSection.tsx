import { useState } from 'react';
import { api } from '../../lib/api';

interface KeyRowProps {
  id: string;
  label: string;
  description: string;
  keychainKey: string;
}

function ApiKeyRow({ id, label, description, keychainKey }: KeyRowProps) {
  const [value, setValue] = useState('');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const handleSave = async () => {
    if (!value.trim()) return;
    setSaving(true);
    try {
      await api.keychain.set(keychainKey, value.trim());
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (err) {
      console.error('keychain.set failed', err);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      <label htmlFor={id} className="gooey-text-muted mb-1 block text-xs">
        {label}
      </label>
      <div className="flex gap-2">
        <input
          id={id}
          type="password"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder={`Enter ${label}…`}
          className="gooey-input flex-1 px-3 py-1.5 text-sm"
        />
        <button
          onClick={handleSave}
          disabled={saving || !value.trim()}
          className="gooey-btn-primary px-3 py-1.5 text-sm"
        >
          {saved ? 'Saved!' : 'Save'}
        </button>
      </div>
      <p className="gooey-text-muted mt-1 text-xs">{description}</p>
    </div>
  );
}

export function ApiKeysSection() {
  return (
    <section>
      <h2 className="gooey-text-secondary mb-3 text-sm font-medium">API Keys</h2>
      <div className="space-y-3">
        <ApiKeyRow
          id="gemini-key"
          label="Gemini API Key"
          keychainKey="gemini-api-key"
          description="Stored securely in macOS Keychain via safeStorage."
        />
        <ApiKeyRow
          id="openai-key"
          label="OpenAI API Key"
          keychainKey="openai-api-key"
          description="Used for STT (Whisper API) subtitle generation."
        />
        <ApiKeyRow
          id="xai-key"
          label="xAI API Key (Grok Video)"
          keychainKey="xai-api-key"
          description="Used for Grok Imagine Video API (auto video generation)."
        />
      </div>
    </section>
  );
}
