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
│   │   ├── services/          # 18 service domains (see below)
│   │   ├── ipc-router.ts      # Type-safe handler registration
│   │   ├── logger.ts          # pino JSONL logger
│   │   └── index.ts           # App entry + menu + handler wiring
│   ├── electron/preload/      # contextBridge (single file)
│   ├── electron/knowledge/    # AI chat system prompts (cs.md, dna-script.md, thumbnail.md)
│   ├── src/                   # Renderer (React + Tailwind + Zustand)
│   │   ├── routes/            # 11 page components + router.tsx
│   │   └── lib/api.ts         # Renderer IPC wrapper (unwrap + zod-validate)
│   ├── e2e/                   # Playwright E2E + mock servers
│   ├── resources/fonts/       # Bundled Noto Sans KR (OFL)
│   ├── electron-builder.yml          # x64 (local)
│   └── electron-builder.universal.yml # universal2 (CI)
├── packages/shared/
│   └── src/
│       ├── ipc-channels.ts    # Channel names (single source of truth)
│       ├── schemas/           # Zod schemas per domain
│       ├── domain/            # Domain models (Project, etc.)
│       └── index.ts           # Re-exports with namespace pattern
└── docs/                      # spec-kit + guides
```

### Service Domains (18)

`apps/desktop/electron/main/services/`:
assets, audio, chat, diagnostics, dialog, file, grok, imagefx, keychain, project, settings, shell, stt, tts, update, video, whisk, window

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

- **Unit tests** (Vitest): 57 tests — 17 shared + 40 desktop (`electron/**/*.test.ts`)
- **E2E tests** (Playwright Electron): 3 app specs (`smoke`, `project-lifecycle`, `tts`)
- **E2E mock servers** (Playwright + express): 3 mock specs (`grok-mock`, `imagegen-mock`, `chat-mock`)
- Service functions must be IPC-independent and unit-testable
- Font tests mock `app.isPackaged = true` to avoid scanning real `resources/fonts/`

## Don't Do This

- `pnpm dist:mac:universal` locally — 30min+, 7GB+ RAM
- Apple Silicon assumptions (`process.arch === 'arm64'`)
- AVX2-dependent libraries (whisper.cpp etc. Phase 12+ only)
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

## Current Phase

**All phases (0-11) complete.** Every task in `docs/tasks.md` is implemented, including all previously skipped items (P5-05, P6-12/13, P7-08, P8-04/07/08, P9-09/10, P10-03). Phase 12 items (local Whisper, Bridge extension, mobile companion) are future v1.1+ scope.

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
6. PR description uses 7-step checklist (`docs/implement.md` §15)

## Active ADRs

- **ADR-001 STT**: Cloud (OpenAI) default, local (whisper.cpp) Phase 12+. Intel AVX2 uncertainty → Cloud strongly recommended.
- **ADR-002 Automation**: Puppeteer standalone, Bridge Phase 12+. Whisk/ImageFX via separate Google account.
- **ADR-003 Project Location**: `~/Documents/VideoForge/Projects/` default, user-configurable.
- **ADR-004 Font**: Noto Sans KR Regular + Bold bundled (OFL). Located at `apps/desktop/resources/fonts/`.
- **ADR-005 Intel Env**: Local = x64 only, universal2 = CI. ffmpeg dev preset = `faster`. H.265 local forbidden.

## Session Hygiene (Intel notebook)

- Restart `pnpm dev` every 1-2 hours (Vite memory leak on Monterey)
- Keep Chrome tabs under 5, close Slack/Discord/Spotify during dev
- Always connect power adapter (battery mode = thermal throttling)
- On session end: `pnpm kill:dev && git status`
