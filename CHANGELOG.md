# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.0.1] — 2026-05-10

### Added

#### Phase 0 — Bootstrap

- Monorepo setup (pnpm workspaces + TypeScript strict)
- Electron 33 + electron-vite + React 18 + Tailwind 3
- ESLint + Prettier + Husky + lint-staged
- `packages/shared`: IPC channel names, Zod schemas, domain models
- Preload contextBridge + type-safe IPC router
- `app:ping` round-trip smoke test
- pino JSONL structured logging
- Vitest + Playwright Electron E2E base
- GitHub Actions CI (Intel x64 + Apple Silicon matrix)

#### Phase 1 — Project Skeleton + Core IO

- Project/Scene/AssetRef domain types
- ProjectStorage service (save/load/list/delete)
- IPC: project, dialog, file, shell, clipboard, settings, window channels
- Project list page with search + new project wizard
- Editor shell (3-panel: SceneList + ScriptEditor + Inspector)
- Zustand stores (app, project, ui)
- macOS native menubar (File/Edit/Window/Help)
- Multi-window manager
- i18n base (ko/en)

#### Phase 2 — TTS

- Edge TTS, Google TTS, Gemini TTS clients
- TTS cache (text+voice+speed hash → wav)
- Keychain credential storage (safeStorage)
- TTS page (voice selection, text input, waveform preview)
- wavesurfer.js integration
- Voice catalog (ko/en/ja/zh/he)

#### Phase 3 — STT + Subtitle

- OpenAI Whisper + Gemini STT clients
- `@bbc/stt-align-node` forced alignment
- ASS subtitle generator with style presets (Default + HBAS)
- libass-wasm subtitle preview
- Word-level timeline editor
- Multilingual subtitle support (Hebrew RTL)

#### Phase 4 — FFmpeg Pipeline

- PipelineStep builder (concat/subtitleBurn/audioMix/kenBurns/effects/export)
- ffmpeg-static path resolution (darwin x64)
- ffmpeg-runner with progress parsing + cancel (SIGTERM → SIGKILL)
- IPC: video edit/cancel/frames, audio merge/save
- Timeline UI with ruler, zoom (0.5x–3x), drag-to-reorder
- Export dialog (resolution/codec/bitrate selection + progress bar)

#### Phase 5 — Asset Library

- Font upload/list/delete IPC + system font integration
- SFX upload/list/delete IPC + category heuristics
- Font/SFX library UI
- Bundled Noto Sans KR Regular + Bold (OFL)

#### Phase 6 — Grok Automation

- BrowserPool + lifecycle management (puppeteer-core + stealth)
- Grok login (user-driven) + cookie persistence
- Grok video generation (text→video, image→video)
- Batch queue (serial + retry policy)
- Grok page UI (prompt input, queue visualization, result gallery)
- Express mock server + E2E tests

#### Phase 7 — Whisk + ImageFX

- Whisk login + reference upload + generate
- ImageFX login + generate
- EXIF prompt recording (sharp)
- Combined ImageGen page UI
- Mock server + E2E tests

#### Phase 8 — AI Chat Assistants

- Gemini streaming client
- Knowledge file loader (editable markdown system prompts)
- csChat / dnaScriptChat / thumbnailAnalyze services
- Chat history per project (load/save/clear)
- Chat UI (markdown render, code block copy)
- Thumbnail analysis visualization (score, strengths, weaknesses, suggestions)
- Mock server + E2E test

#### Phase 9 — macOS Polish

- App icon (icon.icns)
- electron-builder config (x64 local + universal2 CI)
- Entitlements (microphone, camera, network, file access)
- About page with version info
- Fullscreen + multi-monitor support
- Accessibility: keyboard navigation, ARIA attributes, font size toggle (small/normal/large)
- First-run onboarding (welcome → API key → done)
- Error report export (logs + prefs + system info)

#### Phase 10 — Update System + Release

- electron-updater integration (GitHub Releases provider)
- IPC: update check/download/install/status
- Auto-update opt-in toggle in settings
- release-please GitHub Actions workflow + config

#### Phase 11 — Stabilization

- Performance budget script (`pnpm perf:budget` — 13 checks)
- i18n UX review: 52 new translation keys, all hardcoded strings migrated
- User manual (`docs/user-manual.md` — 14 sections)
- README.md rewrite with full feature list + MIT license
- CHANGELOG.md

### Technical Stats

- **Source files**: 114 (17 shared + 63 main + 34 renderer)
- **Lines of code**: ~10,900
- **Unit tests**: 57 (17 shared + 40 desktop)
- **E2E tests**: 6 specs (3 app + 3 mock server)
- **i18n keys**: 87 (Korean + English)
- **Service domains**: 18
- **IPC channels**: 50+
- **Dependencies**: 18 runtime + 20 dev (desktop)
