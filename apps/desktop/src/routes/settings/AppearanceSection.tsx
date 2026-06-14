import { useUiStore } from '../../stores/ui-store';

export function AppearanceSection() {
  const theme = useUiStore((s) => s.theme);
  const setTheme = useUiStore((s) => s.setTheme);
  const fontScale = useUiStore((s) => s.fontScale);
  const setFontScale = useUiStore((s) => s.setFontScale);

  return (
    <>
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
                  ? 'border-[#FF4FBE]/40 bg-[#FF4FBE]/10 text-[#FF7AD9] shadow-[0_0_12px_rgba(255,79,190,0.2)]'
                  : 'bg-[#9B5BFF]/8 border-[#9B5BFF]/15 text-[#9B5BFF]/45 hover:border-[#9B5BFF]/25'
              }`}
            >
              {opt}
            </button>
          ))}
        </div>
      </section>

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
                      ? 'border-[#FF4FBE]/40 bg-[#FF4FBE]/10 text-[#FF7AD9] shadow-[0_0_12px_rgba(255,79,190,0.2)]'
                      : 'bg-[#9B5BFF]/8 border-[#9B5BFF]/15 text-[#9B5BFF]/45 hover:border-[#9B5BFF]/25'
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
    </>
  );
}
