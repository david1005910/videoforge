# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Environment (LOCKED)

- **Hardware**: Intel x86_64, 16GB RAM, notebook
- **OS**: macOS Monterey 12.x
- **Node**: 20 LTS (`package.json` engines)
- **pnpm**: 9.15.0 (corepack)
- **Electron**: 33.0.2 (pinned)
- **Local builds**: x64 only — universal2 is CI-only

Do not write code that assumes any other environment. See `docs/ENVIRONMENT.md` for env-specific decisions.

## Mission

VideoForge is a macOS-native AI video creation studio — clean-room reimplementation of EasyVideo (Windows/Electron) for the HBAS YouTube channel.

## Authoritative Documents

These 7 docs are the final authority. **Read relevant sections before writing code**. If code conflicts with docs, docs win.

- `docs/constitution.md` — Core principles, non-negotiable rules (N1-N10)
- `docs/specify.md` — What to build (IPC API surface)
- `docs/plan.md` — How (stack, architecture)
- `docs/tasks.md` — Work breakdown (Phase 0-11)
- `docs/implement.md` — Code patterns
- `docs/decisions.md` — ADR 5 items (ADR-005 Intel env policy)
- `docs/ENVIRONMENT.md` — Intel 16GB Monterey decisions
- `docs/user-manual.md` — End-user guide (Korean)

## Common Commands

```bash
pnpm dev                  # Electron + HMR (first start 30-60s)
pnpm test                 # Vitest unit tests (all packages)
pnpm test:e2e             # Playwright Electron E2E
pnpm typecheck            # tsc -b --noEmit
pnpm lint                 # ESLint
pnpm lint:fix             # ESLint --fix
pnpm format               # Prettier --write
pnpm build                # Production bundle
pnpm dist:mac:local       # Local x64 DMG (8-12 min)
pnpm perf:budget          # Performance budget check (deps, LoC, speed)
pnpm kill:dev             # Kill zombie electron/vite processes
pnpm clean:cache          # Clear vite/out/dist caches
```

### Running a single test

```bash
# Unit test (vitest) — from repo root or apps/desktop
cd apps/desktop && pnpm vitest run electron/main/services/ping.test.ts

# E2E (playwright) — specific spec file
cd apps/desktop && pnpm playwright test e2e/smoke.spec.ts
```

### Cleanup (Intel Monterey)

```bash
pkill -f electron && pkill -f vite      # zombie processes
rm -rf apps/desktop/node_modules/.vite  # force-clear Vite cache
```

## Architecture

### Monorepo (pnpm workspaces)

```
videoforge/
├── apps/desktop/
│   ├── electron/main/         # Main process (Node)
│   │   ├── services/          # 22 service domains (see below)
│   │   ├── ipc-router.ts      # Type-safe handler registration
│   │   ├── logger.ts          # pino JSONL logger
│   │   └── index.ts           # App entry + menu + handler wiring
│   ├── electron/preload/      # contextBridge (single file)
│   ├── electron/knowledge/    # AI chat system prompts (cs.md, dna-script.md, thumbnail.md)
│   ├── src/                   # Renderer (React + Tailwind + Zustand)
│   │   ├── routes/            # 11 page components + router.tsx
│   │   ├── i18n/              # ko.ts / en.ts (143 keys each)
│   │   └── lib/api.ts         # Renderer IPC wrapper (unwrap + zod-validate)
│   ├── e2e/                   # Playwright E2E + mock servers
│   ├── build/                 # icon.icns (macOS app icon)
│   ├── resources/fonts/       # Bundled Noto Sans KR (OFL)
│   ├── electron-builder.yml          # x64 (local)
│   └── electron-builder.universal.yml # universal2 (CI)
├── packages/shared/
│   └── src/
│       ├── ipc-channels.ts    # Channel names (single source of truth)
│       ├── schemas/           # Zod schemas per domain
│       ├── domain/            # Domain models (Project, etc.)
│       └── index.ts           # Re-exports with namespace pattern
├── scripts/
│   └── perf-budget.sh         # Performance budget checker
├── docs/                      # spec-kit + guides + user manual
└── .github/workflows/         # CI + release-please
```

### Service Domains (22)

`apps/desktop/electron/main/services/`:
assets, audio, chat, cloud, collab, diagnostics, dialog, file, grok, imagefx, keychain, project, remote, settings, shell, stt, tts, update, video, videogen, whisk, window

Plus `ping.ts` (app:ping / app:getVersion).

### Routes (11)

`/` (projects), `/editor/$projectId`, `/tts`, `/assets`, `/grok`, `/imagegen`, `/chat`, `/about`, `/settings`, `/onboarding`, `/thumbnail`

### Path Aliases

- `@videoforge/shared` → `packages/shared/src/index.ts` (used everywhere)
- `@` → `apps/desktop/src/` (renderer only)

### IPC Flow (the most important pattern)

All OS resources (ffmpeg, fs, puppeteer, keychain) go through IPC — renderer never touches them directly.

1. **Channel name** → `packages/shared/src/ipc-channels.ts` (`Channels.Domain.Action`)
2. **Zod schemas** → `packages/shared/src/schemas/<domain>.ts` (Request + Response)
3. **Service function** → `apps/desktop/electron/main/services/<domain>/` (pure, no BrowserWindow)
4. **Handler registration** → `registerHandler(channel, schema, service)` in `ipc-router.ts`
5. **Preload bridge** → `apps/desktop/electron/preload/index.ts` (single file, exposes `window.electronAPI`)
6. **Renderer wrapper** → `apps/desktop/src/lib/api.ts` (unwrap envelope + zod-validate response)

### IPC Response Envelope

All `ipcMain.handle` responses use the `IpcResponse<T>` envelope from `ipc-channels.ts`:

```
{ ok: true, data: T }  |  { ok: false, error: { code, message, hint? } }
```

Error codes: `VALIDATION` (zod), `USER` (UserFacingError), `NOT_IMPLEMENTED`, `UNKNOWN`.

### Schema Export Pattern

Schemas are exported as namespaces to avoid name collisions:

```ts
import { TtsSchemas, Channels } from '@videoforge/shared';
// Use: TtsSchemas.TtsEdgeRequest, Channels.Tts.Edge
```

Frequently-used types are also re-exported directly (e.g., `TtsEdgeRequest`, `PipelineStep`).

### Progress Events

Each long-running task gets a `taskId` (ULID). Main pushes `webContents.send('xxx:onProgress', { taskId, percent, ... })`. Renderer filters by `taskId`.

### Large Data

IPC payloads must stay under 1MB (`constitution.md` N6). Video/large audio/images: main writes to temp file, passes path.

### Puppeteer Automation

Grok, Whisk, ImageFX use `puppeteer-core` + `puppeteer-extra` + stealth plugin. Key patterns:

- `browser-pool.ts`: Profile-based browser management, idle timeout, failure screenshots
- System Chrome discovery (no bundled Chromium)
- Headless: false (automation sites require visible browser)
- E2E testing via express mock servers (`e2e/*-mock-server.ts`)

### i18n

- Translation files: `apps/desktop/src/i18n/ko.ts` (Korean) + `en.ts` (English)
- 145 keys across 14 categories: app, projects, wizard, editor, tts, scene/script/inspector, subtitle, assets, whisper, bridge, remote, cloud, videogen, collab, common
- Usage: `const t = useT()` hook → `t('key.name')` in components
- All user-facing strings must go through i18n — no hardcoded Korean/English in `.tsx` files

### Whisper Local STT (Phase 12)

Local speech-to-text via whisper.cpp, opt-in alternative to cloud providers (OpenAI/Gemini).

- **Binary**: whisper.cpp v1.7.3 pre-built macOS x64 from GitHub releases
- **Models**: 12 GGML models from HuggingFace `ggerganov/whisper.cpp`
- **Default model**: `ggml-large-v3-turbo-q5_0` (547MB, best quality/size for Intel)
- **Storage**: `~/Library/Application Support/VideoForge/whisper/` (models + binary)
- **Thread limit**: `min(cpuCount - 2, 4)` to avoid thermal throttle
- **Audio**: Non-WAV auto-converted to 16kHz mono PCM via ffmpeg-static
- **IPC channels**: `stt:whisper:models`, `stt:whisper:download`, `stt:whisper:delete`, `stt:whisper:binaryDownload`
- **Key files**:
  - `apps/desktop/electron/main/services/stt/whisper-model.ts` — model catalog, download, delete
  - `apps/desktop/electron/main/services/stt/whisper-local.ts` — child_process wrapper, JSON parsing
  - `packages/shared/src/schemas/stt.ts` — `WhisperModelId` enum, model management schemas

### Grok Bridge Extension (Phase 12+)

WebSocket bridge for Chrome extension to relay Grok video generation to user's own browser (bypasses bot detection).

- **Port**: 9821 (fixed)
- **Protocol**: JSON messages over WebSocket (`{ type, data }`)
- **IPC channels**: `grok:bridge:status/send/cancel/setProject`
- **Key files**:
  - `apps/desktop/electron/main/services/grok/bridge.ts` — WebSocket server, client management
  - `packages/shared/src/schemas/grok.ts` — `GrokBridgeStatusResponse`, `GrokBridgeSendRequest`, `GrokBridgeSetProjectRequest`

### Mobile Companion Remote (Phase 12+)

WebSocket server for mobile companion app to remotely control VideoForge.

- **Port**: Auto-detected (or user-specified)
- **Pairing**: 6-digit numeric code, 5-minute TTL
- **IPC channels**: `remote:init/sendScenes/sendResponse` + events `onGetScenes/onCommand`
- **Key files**:
  - `apps/desktop/electron/main/services/remote/index.ts` — WebSocket server, pairing, command relay
  - `packages/shared/src/schemas/chat-and-remote.ts` — `RemoteInitRequest/Response`, `RemoteSceneSummary`, `RemoteScenesResponse`

### Cloud Sync (Phase 12+ — Supabase opt-in)

Project sync via Supabase. Service skeleton ready, actual Supabase client deferred.

- **IPC channels**: `cloud:connect/disconnect/status/sync/listRemote`
- **Key files**:
  - `apps/desktop/electron/main/services/cloud/index.ts` — connect, disconnect, sync, listRemote
  - `packages/shared/src/schemas/cloud-sync.ts` — `CloudConnectRequest`, `CloudSyncRequest`, `CloudRemoteProject`

### Video Generation (Phase 12+ — Veo/Sora)

Official API-based video generation. Service skeleton ready, pending Veo/Sora API release.

- **Providers**: `veo`, `sora` (both currently unavailable)
- **IPC channels**: `videogen:generate/cancel/status` + events `onProgress/onComplete`
- **Key files**:
  - `apps/desktop/electron/main/services/videogen/index.ts` — generate, cancel, status
  - `packages/shared/src/schemas/videogen.ts` — `VideogenGenerateRequest`, `VideogenProgressEvent`

### Collaboration / Shared Library (Phase 12+)

Community asset sharing. Service skeleton ready, backend deferred.

- **Asset types**: template, font, sfx, preset, prompt
- **IPC channels**: `collab:publish/browse/download/delete`
- **Key files**:
  - `apps/desktop/electron/main/services/collab/index.ts` — publish, browse, download, delete
  - `packages/shared/src/schemas/collab.ts` — `SharedAsset`, `CollabPublishRequest`, `CollabBrowseRequest`

## Code Style

- Files: `kebab-case.ts`, components: `PascalCase.tsx`
- IPC channels: `domain:action` (e.g., `tts:edge`)
- Booleans: `is/has/should/can` prefix
- `async/await` only — no `.then()` chaining (streams excepted)
- Import order: node builtins → npm → `@videoforge/*` → relative
- 200 lines max per file, single responsibility per function
- No `any` — use `unknown` + zod guard
- `exactOptionalPropertyTypes: true` — cannot assign `undefined` to optional properties; conditionally build objects instead

## Testing

- **Unit tests** (Vitest): 110 tests — 17 shared + 93 desktop (`electron/**/*.test.ts`)
- **E2E tests** (Playwright Electron): 17 total — 3 app specs (`smoke`, `project-lifecycle`, `tts`) + 4 mock specs (`grok-mock`, `imagegen-mock`, `chat-mock`, `whisper-mock`)
- **Performance budget**: `pnpm perf:budget` — 13 checks (deps, LoC, typecheck speed, test speed, i18n coverage, large files)
- Service functions must be IPC-independent and unit-testable
- Font tests mock `app.isPackaged = true` to avoid scanning real `resources/fonts/`

## Performance Budget (current baseline)

| Metric       | Current         | Limit      |
| ------------ | --------------- | ---------- |
| Typecheck    | 14-17s          | 30s        |
| All tests    | 9-11s           | 30s        |
| Total LoC    | ~12,900         | —          |
| Shared deps  | 1               | 10         |
| Desktop deps | 18              | 40         |
| i18n keys    | 145 ko / 145 en | must match |

Run `pnpm perf:budget` after significant changes to check for regressions.

## Don't Do This

- `pnpm dist:mac:universal` locally — 30min+, 7GB+ RAM
- Apple Silicon assumptions (`process.arch === 'arm64'`)
- ffmpeg concurrency > 1 (queue manager bypass)
- H.265 encoding as default
- Puppeteer bundled Chromium download (use system Chrome)
- `import { app } from 'electron'` in renderer (`apps/desktop/src/`)
- IPC payloads without zod validation on main side
- `nodeIntegration: true` or `contextIsolation: false`
- ffmpeg system PATH (must use `ffmpeg-static`)
- Plaintext credential storage (use Keychain `safeStorage`)
- `BrowserWindow` import in service functions
- Assigning `undefined` to optional properties (use conditional object construction)
- Using `waitForTimeout` on Puppeteer Page (removed in newer versions; use `setTimeout` + `Promise`)
- Using `.then()` chains (use `async/await`; prefix fire-and-forget promises with `void`)
- Hardcoded Korean/English strings in `.tsx` — use `t('key')` via i18n
- WaveSurfer.js `backend: 'WebAudio'` — causes silent playback due to suspended AudioContext; use default HTML5 backend

## Current Phase

**Phases 0-12 complete. Phase 12+ extensions complete. Current version: v0.3.0.**

### Phase 12 completed:

- whisper-local STT provider (schemas, service, IPC, child_process wrapper)
- 4 IPC channels (`stt:whisper:models/download/delete/binaryDownload`)
- Model catalog (12 GGML models) + HuggingFace download
- whisper.cpp binary download from GitHub releases
- Settings UI: Whisper section (binary status, model list, download/delete)
- SubtitlePanel: whisper-local option in provider dropdown
- Whisper E2E mock test (4 specs)
- 14 i18n keys, 9 unit tests

### Phase 12+ completed:

- Grok Bridge extension WebSocket server (port 9821, 4 IPC channels)
- Mobile Companion remote WebSocket server (pairing code auth, 5 IPC channels)
- Cloud Sync service skeleton (Supabase opt-in, 5 IPC channels)
- Video Generation service skeleton (Veo/Sora, 5 IPC channels)
- Collaboration / Shared Library service skeleton (4 IPC channels)
- 42 new i18n keys, 33 unit tests

### v0.3.0 additional:

- All pre-existing lint warnings fixed (0 errors, 0 warnings)
- User manual expanded to 19 sections (Bridge, Remote, Cloud, Videogen, Collab docs added)
- CI notarization workflow prepared (commented, ready for P9-04 secrets)
- README.md rewritten for v0.3.0 (22 services, 110 tests, architecture, perf budget)
- tasks.md updated with completion status for all phases
- Full quality verification passed: typecheck, 110 unit tests, 17 E2E tests, lint 0 warnings, perf budget 13/13
- i18n Korean UX copy reviewed (144 keys, terminology consistent)
- P9-05 CI code signing + notarization workflow activated (conditional on secrets — safe skip when absent)
- Unsigned app installation guide added (user manual + README: xattr -cr, right-click, System Settings)
- Local x64 DMG built and verified: `VideoForge-0.3.0.dmg` (211MB)
- `dialog:selectFile` IPC channel added (8-step pattern) — file picker for renderer
- TTS page: "음성 파일 불러오기" button — load external audio files for waveform preview/playback
- i18n keys: 143 → 144 (added `tts.loadAudio`)
- Asset upload dialogs fixed: pass parent BrowserWindow to prevent dialogs opening behind app on macOS
- TTS audio loading: use base64 → blob URL instead of file:// (webSecurity: true compatibility)
- Waveform component: support blob: URL scheme
- Editor Inspector: narration audio preview (play/stop + waveform) and "음성 불러오기" file loading
- i18n keys: 144 → 145 (added `inspector.loadNarration`)
- Waveform audio fix: removed `backend: 'WebAudio'` — v7 WebAudioPlayer creates suspended AudioContext that never resumes; default HTML5 `<audio>` backend works correctly

### Local DMG build (개인 사용)

```bash
pnpm dist:mac:local                                    # 8-12min → apps/desktop/release/
xattr -cr /Applications/VideoForge.app                 # Gatekeeper 해제 (1회)
open /Applications/VideoForge.app                      # 실행
```

### Remaining (non-code):

- P9-04: Apple Developer ID (optional, $99/year — 공개 배포 시에만 필요)
- P10-05: CI notarized DMG upload (depends on P9-04)
- P11-01: Beta 5명 모집 (수동)
- P11-02: Beta 버그 수정 (피드백 의존)
- P11-06: 1.0.0 릴리스 (전체 의존)

**Repository**: `https://github.com/david1005910/videoforge.git`

Tasks use IDs from `docs/tasks.md` (B-01 ~ P11-06). PR/commit titles include the ID:

```
feat(P1-04): IPC project:save / project:load / project:list / project:delete
```

## Working Style

1. Check `docs/tasks.md` for task ID
2. Read `docs/specify.md` for IPC signatures
3. Read `docs/implement.md` for patterns (especially §2 IPC, §3 Service layer)
4. Check `packages/shared/SCHEMAS.md` for schema conflicts
5. Implement → `pnpm test` + `pnpm typecheck` must pass
6. Run `pnpm perf:budget` after significant changes
7. PR description uses 7-step checklist (`docs/implement.md` §15)

## Active ADRs

- **ADR-001 STT**: Cloud (OpenAI) default, local (whisper.cpp) opt-in. Phase 12 complete — backend + Settings UI + SubtitlePanel integration.
- **ADR-002 Automation**: Puppeteer standalone + Bridge extension (Phase 12+ complete). Whisk/ImageFX via separate Google account.
- **ADR-003 Project Location**: `~/Documents/VideoForge/Projects/` default, user-configurable.
- **ADR-004 Font**: Noto Sans KR Regular + Bold bundled (OFL). Located at `apps/desktop/resources/fonts/`.
- **ADR-005 Intel Env**: Local = x64 only, universal2 = CI. ffmpeg dev preset = `faster`. H.265 local forbidden.

## Session Hygiene (Intel notebook)

- Restart `pnpm dev` every 1-2 hours (Vite memory leak on Monterey)
- Keep Chrome tabs under 5, close Slack/Discord/Spotify during dev
- Always connect power adapter (battery mode = thermal throttling)
- On session end: `pnpm kill:dev && git status`
