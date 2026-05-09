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
│   ├── electron/preload/      # contextBridge (single file)
│   ├── src/                   # Renderer (React)
│   ├── e2e/                   # Playwright E2E tests
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

## Code Style

- Files: `kebab-case.ts`, components: `PascalCase.tsx`
- IPC channels: `domain:action` (e.g., `tts:edge`)
- Booleans: `is/has/should/can` prefix
- `async/await` only — no `.then()` chaining (streams excepted)
- Import order: node builtins → npm → `@videoforge/*` → relative
- 200 lines max per file, single responsibility per function
- No `any` — use `unknown` + zod guard

## Testing

- **Unit tests** (Vitest): `electron/**/*.test.ts` and `src/**/*.test.ts` in `apps/desktop/`
- **E2E tests** (Playwright Electron): `apps/desktop/e2e/*.spec.ts`
- **Puppeteer automation**: mock with express server (see `docs/implement.md` §10.3)
- Service functions must be IPC-independent and unit-testable

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

## Current Phase

**Phase 11 — Stabilization (complete).** All phases (0-11) implemented. Full IPC stack for all channels. 57 unit tests (17 shared + 40 desktop), 3 E2E tests, typecheck clean, production build verified. Routes: / (projects), /editor/$id, /tts, /assets, /grok, /imagegen, /chat, /about, /settings. Phase 12 items (local Whisper, Bridge extension, mobile companion) are future v1.1+ scope.

Tasks use IDs from `docs/tasks.md` (P1-01 ~ P1-16). PR titles include the ID:

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
- **ADR-004 Font**: Noto Sans KR Variable bundled (OFL).
- **ADR-005 Intel Env**: Local = x64 only, universal2 = CI. ffmpeg dev preset = `faster`. H.265 local forbidden.

## Session Hygiene (Intel notebook)

- Restart `pnpm dev` every 1-2 hours (Vite memory leak on Monterey)
- Keep Chrome tabs under 5, close Slack/Discord/Spotify during dev
- Always connect power adapter (battery mode = thermal throttling)
- On session end: `pnpm kill:dev && git status`
