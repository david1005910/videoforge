import { useState, useEffect, useCallback } from 'react';
import { api } from '../lib/api';
import { useT } from '../i18n';
import type { FontInfo, SfxItem, SfxCategory } from '@videoforge/shared';

const SFX_CATEGORY_VALUES: (SfxCategory | '')[] = [
  '',
  'whoosh',
  'impact',
  'click',
  'transition',
  'ambient',
  'notification',
  'other',
];

export function AssetsPage() {
  const t = useT();
  const [tab, setTab] = useState<'fonts' | 'sfx'>('fonts');

  return (
    <div className="gooey-page flex h-full flex-col">
      <header className="gooey-header flex items-center gap-4 px-6 py-3">
        <h1 className="gooey-text-primary text-lg font-semibold">{t('assets.title')}</h1>
        <div className="gooey-tab-group flex gap-1">
          <button
            className={`gooey-tab ${tab === 'fonts' ? 'gooey-tab-active' : 'gooey-tab-inactive'}`}
            onClick={() => setTab('fonts')}
          >
            {t('assets.fonts')}
          </button>
          <button
            className={`gooey-tab ${tab === 'sfx' ? 'gooey-tab-active' : 'gooey-tab-inactive'}`}
            onClick={() => setTab('sfx')}
          >
            {t('assets.sfx')}
          </button>
        </div>
      </header>
      <div className="gooey-scrollbar flex-1 overflow-auto p-6">
        {tab === 'fonts' ? <FontsPanel /> : <SfxPanel />}
      </div>
    </div>
  );
}

function FontsPanel() {
  const t = useT();
  const [fonts, setFonts] = useState<FontInfo[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.assets.fontsList();
      setFonts(res.fonts);
    } catch (err) {
      console.error('fonts.list failed', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const handleUpload = async () => {
    try {
      const res = await api.assets.fontsUpload();
      if (res.added.length > 0) await refresh();
    } catch (err) {
      console.error('fonts.upload failed', err);
    }
  };

  const handleDelete = async (font: FontInfo) => {
    try {
      await api.assets.fontsDelete({ postscriptName: font.postscriptName });
      await refresh();
    } catch (err) {
      console.error('fonts.delete failed', err);
    }
  };

  if (loading) return <p className="gooey-text-muted">{t('assets.loadingFonts')}</p>;

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <p className="gooey-text-secondary text-sm">
          {fonts.length} {t('assets.fontsCount')}
        </p>
        <button onClick={handleUpload} className="gooey-btn-primary px-3 py-1.5 text-sm">
          {t('assets.uploadFont')}
        </button>
      </div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {fonts.map((f) => (
          <div key={f.postscriptName} className="gooey-card flex items-center justify-between p-4">
            <div className="min-w-0">
              <p className="truncate font-medium text-white/90">{f.family}</p>
              <p className="text-xs text-white/35">
                {f.source} · {f.scripts.join(', ')}
                {f.italic ? ' · italic' : ''}
              </p>
            </div>
            {f.source === 'user' && (
              <button
                onClick={() => handleDelete(f)}
                className="ml-2 shrink-0 text-xs text-red-400 hover:text-red-300"
              >
                {t('assets.delete')}
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

function SfxPanel() {
  const t = useT();
  const [items, setItems] = useState<SfxItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [category, setCategory] = useState<SfxCategory | ''>('');
  const [query, setQuery] = useState('');

  const categoryLabels: Record<string, string> = {
    '': t('assets.all'),
    whoosh: 'Whoosh',
    impact: 'Impact',
    click: 'Click',
    transition: 'Transition',
    ambient: 'Ambient',
    notification: 'Notification',
    other: 'Other',
  };

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const req: { category?: SfxCategory; query?: string } = {};
      if (category) req.category = category;
      if (query) req.query = query;
      const res = await api.assets.sfxList(req);
      setItems(res.items);
    } catch (err) {
      console.error('sfx.list failed', err);
    } finally {
      setLoading(false);
    }
  }, [category, query]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const handleUpload = async () => {
    try {
      const res = await api.assets.sfxUpload();
      if (res.added.length > 0) await refresh();
    } catch (err) {
      console.error('sfx.upload failed', err);
    }
  };

  const handleDelete = async (item: SfxItem) => {
    try {
      await api.assets.sfxDelete({ id: item.name });
      await refresh();
    } catch (err) {
      console.error('sfx.delete failed', err);
    }
  };

  const formatDuration = (ms: number) => {
    const s = ms / 1000;
    return s < 60
      ? `${s.toFixed(1)}s`
      : `${Math.floor(s / 60)}:${String(Math.round(s % 60)).padStart(2, '0')}`;
  };

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <select
          value={category}
          onChange={(e) => setCategory(e.target.value as SfxCategory | '')}
          className="gooey-input px-2 py-1.5 text-sm"
        >
          {SFX_CATEGORY_VALUES.map((c) => (
            <option key={c} value={c}>
              {categoryLabels[c]}
            </option>
          ))}
        </select>
        <input
          type="text"
          placeholder={t('assets.search')}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="gooey-input px-3 py-1.5 text-sm"
        />
        <div className="flex-1" />
        <p className="gooey-text-secondary text-sm">
          {items.length} {t('assets.itemsCount')}
        </p>
        <button onClick={handleUpload} className="gooey-btn-primary px-3 py-1.5 text-sm">
          {t('assets.uploadSfx')}
        </button>
      </div>
      {loading ? (
        <p className="gooey-text-muted">{t('assets.loadingSfx')}</p>
      ) : items.length === 0 ? (
        <p className="gooey-text-muted">{t('assets.noSfx')}</p>
      ) : (
        <div className="space-y-2">
          {items.map((item) => (
            <div key={item.id} className="gooey-card flex items-center gap-4 px-4 py-3">
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium text-white/90">{item.name}</p>
                <p className="text-xs text-white/35">
                  {item.category} · {formatDuration(item.durationMs)}
                </p>
              </div>
              {item.source === 'user' && (
                <button
                  onClick={() => handleDelete(item)}
                  className="text-xs text-red-400 hover:text-red-300"
                >
                  {t('assets.delete')}
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
