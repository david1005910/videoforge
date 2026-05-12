# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.3.0](https://github.com/david1005910/videoforge/compare/v0.2.0...v0.3.0) (2026-05-12)


### Features

* add 6 editor enhancements ([2cfc718](https://github.com/david1005910/videoforge/commit/2cfc718618cda7224273e678570aab5ea3ffdfcb))
* add audio file loading to TTS page via dialog:selectFile IPC ([7d49099](https://github.com/david1005910/videoforge/commit/7d490996d61d3f33a929e0b2364d2c526167f492))
* add auto video pipeline — Grok batch generation + compose per scene ([b13f5a8](https://github.com/david1005910/videoforge/commit/b13f5a8e44aa6ce0f62412e2e98593d962c75693))
* add delete confirm, inline title edit, shortcuts overlay, save indicator ([d01c433](https://github.com/david1005910/videoforge/commit/d01c4332d33a49a44dbc4f5ef72eb2c91110d1b6))
* add final clip compose button and Grok image-to-video in Inspector ([bc684f0](https://github.com/david1005910/videoforge/commit/bc684f08fd04c8685757a929bb8fe758ad6f0cea))
* add final clip preview with playback, save-as, and Grok Puppeteer fixes ([35abf4f](https://github.com/david1005910/videoforge/commit/35abf4f712a3748d3a6cbe32bf427b6a375ea188))
* add narration audio preview and loading in editor Inspector ([b11c65b](https://github.com/david1005910/videoforge/commit/b11c65bc755942ddca8574104ccfa967fcbeabc3))
* add scene DnD reorder, undo/redo, duration display, inline TTS, recent projects ([38fbe1c](https://github.com/david1005910/videoforge/commit/38fbe1c53a9d7744bc9dac277f0c08e87ba9b04b))
* **P12+:** add cloud sync, videogen (Veo/Sora), and collab services ([e67d5c3](https://github.com/david1005910/videoforge/commit/e67d5c3fb13010e96e50273da9444a271d58864b))
* **P12+:** add Grok bridge extension and mobile companion remote services ([f6c041d](https://github.com/david1005910/videoforge/commit/f6c041d1a132d5e93e92ed93d18a5310139280ec))
* **P9-05:** activate CI code signing and notarization workflow ([49cd728](https://github.com/david1005910/videoforge/commit/49cd728e92ddfe592bd79cc13320b4c213f703ec))


### Bug Fixes

* attach parent window to asset upload dialogs and use blob URL for audio loading ([142e27f](https://github.com/david1005910/videoforge/commit/142e27ffdfa4cbaaa864906cc6904c6680316792))
* export uses scene final clips as source and allow file:// in shell ([0411611](https://github.com/david1005910/videoforge/commit/0411611f8b43d04ceb8c0389c5433e2a1f67cdbf))
* remove WebAudio backend to fix audio playback in Waveform ([578697b](https://github.com/david1005910/videoforge/commit/578697b653224454e7c031a938ead232ce8670c7))
* resolve Inspector infinite re-render and SFX delete bug ([65cedbd](https://github.com/david1005910/videoforge/commit/65cedbd1a41ade7c4437c7cd593e182ff13e4972))
* STT subtitle generation and add subtitle/image editor ([9726ca4](https://github.com/david1005910/videoforge/commit/9726ca4ea241d66c2da8c4c2e6b8af53667133b5))
* support video clip compose in addition to image-based compose ([61a9ae7](https://github.com/david1005910/videoforge/commit/61a9ae7e20c74e5e93f633d00100ac4f0a2178d7))
* use blob URL for TTS audio playback (webSecurity compatibility) ([06ac55d](https://github.com/david1005910/videoforge/commit/06ac55d386c90362140cf6f5dd3b97da6489b309))

## [0.3.0] — 2026-05-10

### Added

#### Phase 12+ — Cloud Sync, Videogen, Collab, Bridge, Remote

See v0.2.0 Phase 12+ entries below for details.

### Changed

- Version bump to 0.3.0 (all Phase 12+ features complete)

---

## [0.2.0] — 2026-05-10

### Added

#### Phase 12 — Local Whisper STT

- whisper.cpp child_process wrapper for local speech-to-text
- 12 GGML model catalog with HuggingFace download
- whisper.cpp binary download from GitHub releases (macOS x64)
- 4 new IPC channels: `stt:whisper:models/download/delete/binaryDownload`
- Settings UI: Whisper section with binary status, model list, download/delete
- SubtitlePanel: whisper-local provider option in STT dropdown
- Auto WAV conversion via ffmpeg-static (16kHz mono PCM)
- Thread count auto-tuning (capped at 4 for Intel thermal management)
- Mock server + 4 E2E tests for whisper flow
- 14 new i18n keys (Korean + English), 9 unit tests

#### Phase 12+ — Cloud Sync (Supabase)

- Cloud sync service skeleton with connect/disconnect/sync/listRemote
- 5 IPC channels: `cloud:connect/disconnect/status/sync/listRemote`
- Zod schemas: CloudConnectRequest, CloudSyncRequest, CloudRemoteProject, etc.
- 10 new i18n keys (Korean + English), 7 unit tests

#### Phase 12+ — Video Generation (Veo/Sora)

- Videogen service skeleton with generate/cancel/status
- 5 IPC channels: `videogen:generate/cancel/status/onProgress/onComplete`
- Zod schemas: VideogenGenerateRequest, VideogenProgressEvent, etc.
- Provider enum: `veo`, `sora` (pending official API release)
- 9 new i18n keys (Korean + English), 6 unit tests

#### Phase 12+ — Collaboration / Shared Library

- Collab service skeleton with publish/browse/download/delete
- 4 IPC channels: `collab:publish/browse/download/delete`
- Zod schemas: SharedAsset, CollabPublishRequest, CollabBrowseRequest, etc.
- Asset types: template, font, sfx, preset, prompt
- 8 new i18n keys (Korean + English), 7 unit tests

#### Phase 12+ — Grok Bridge Extension

- WebSocket bridge server for Chrome extension communication (port 9821)
- Bridge IPC: `grok:bridge:status/send/cancel/setProject`
- Extension message relay (progress, videoReady events)
- Project context forwarding to connected extensions
- 5 new i18n keys (Korean + English), 6 unit tests

#### Phase 12+ — Mobile Companion (Remote)

- WebSocket remote server with pairing code authentication
- Auto port detection, 5-minute pairing TTL
- Remote IPC: `remote:init/sendScenes/sendResponse` + events
- Scene summary relay + command forwarding
- 8 new i18n keys (Korean + English), 7 unit tests

### Technical Stats

- **Source files**: 126 (20 shared + 72 main + 34 renderer)
- **Lines of code**: ~12,900
- **Unit tests**: 110 (17 shared + 93 desktop)
- **E2E tests**: 10 specs (3 app + 4 mock server)
- **i18n keys**: 143 (Korean + English)
- **IPC channels**: 77+

---

## [0.1.0] — 2026-05-10

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
