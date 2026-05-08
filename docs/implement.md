# VideoForge — Implement

> 이 문서는 **어떻게 정확히 코드를 짜는가**의 표준이다. 패턴, 안티패턴, 핵심 코드 예시.
> tasks.md의 작업을 시작하기 전에 해당 섹션을 먼저 읽는다.

---

## 0. 코드 스타일

### 0.1 General
- Indent 2 spaces. Semicolons. Single quote 우선.
- 파일 한 개 = 하나의 책임. 200줄 넘으면 분할 검토.
- 함수 한 개 = 하나의 동작. 한 함수에서 IO + 변환 + 검증 섞지 말 것.

### 0.2 Naming
- 파일: `kebab-case.ts`
- 컴포넌트 파일: `PascalCase.tsx`
- IPC 채널: `domain:action` (kebab inside)
- Type: `PascalCase`. 인터페이스 접두사 `I` 금지.
- Boolean: `is/has/should/can` 접두.

### 0.3 Imports 순서
```ts
// 1. node 내장
import path from 'node:path';
// 2. npm
import { app } from 'electron';
import { z } from 'zod';
// 3. 워크스페이스 (`@videoforge/*`)
import { TtsRequestSchema } from '@videoforge/shared';
// 4. 같은 패키지 내부 (상대)
import { logger } from '../logger';
```

### 0.4 비동기
- **`async/await` 만**. `.then()` 체이닝 금지(스트림 제외).
- `Promise.all` 적극 활용.
- 절대 `async` 함수 안에서 unhandled rejection 만들지 말 것 (try/catch 또는 명시적 처리).

---

## 1. 모노레포 / 워크스페이스

### 1.1 `pnpm-workspace.yaml`
```yaml
packages:
  - 'apps/*'
  - 'packages/*'
```

### 1.2 `tsconfig.base.json`
```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "Bundler",
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "exactOptionalPropertyTypes": true,
    "skipLibCheck": true,
    "esModuleInterop": true,
    "isolatedModules": true,
    "resolveJsonModule": true,
    "paths": {
      "@videoforge/shared": ["./packages/shared/src/index.ts"],
      "@videoforge/shared/*": ["./packages/shared/src/*"]
    }
  }
}
```

### 1.3 `electron.vite.config.ts`
```ts
import { defineConfig } from 'electron-vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'node:path';
import tsconfigPaths from 'vite-tsconfig-paths';

export default defineConfig({
  main: {
    plugins: [tsconfigPaths()],
    build: {
      rollupOptions: { external: ['better-sqlite3', 'sharp'] }
    }
  },
  preload: { plugins: [tsconfigPaths()] },
  renderer: {
    plugins: [react(), tsconfigPaths()],
    resolve: { alias: { '@': resolve('apps/desktop/src') } },
  },
});
```

---

## 2. IPC 패턴 (가장 중요)

### 2.1 채널 정의 (단일 진실)
```ts
// packages/shared/src/ipc-channels.ts
export const Channels = {
  Project: {
    Save: 'project:save',
    Load: 'project:load',
    List: 'project:list',
    Delete: 'project:delete',
  },
  Tts: {
    Edge: 'tts:edge',
    Google: 'tts:google',
    Gemini: 'tts:gemini',
    OnProgress: 'tts:onProgress',
  },
  // ...
} as const;
```

### 2.2 페이로드 zod 스키마
```ts
// packages/shared/src/schemas/tts.ts
import { z } from 'zod';

export const TtsRequest = z.object({
  text: z.string().min(1).max(50_000),
  voice: z.string().min(1),
  speed: z.number().min(0.5).max(2).default(1),
  pitch: z.number().min(-20).max(20).default(0),
  outputPath: z.string().optional(),
});
export type TtsRequest = z.infer<typeof TtsRequest>;

export const TtsResult = z.object({
  audioPath: z.string(),
  durationMs: z.number().nonnegative(),
});
export type TtsResult = z.infer<typeof TtsResult>;
```

### 2.3 메인 라우터 헬퍼 (타입 안전)
```ts
// apps/desktop/electron/main/ipc-router.ts
import { ipcMain } from 'electron';
import { z } from 'zod';
import { logger } from './logger';

type Handler<I, O> = (input: I, ctx: { senderId: number }) => Promise<O>;

export function registerHandler<I, O>(
  channel: string,
  inputSchema: z.ZodType<I>,
  handler: Handler<I, O>,
) {
  ipcMain.handle(channel, async (event, raw) => {
    const start = Date.now();
    try {
      const input = inputSchema.parse(raw);
      const output = await handler(input, { senderId: event.sender.id });
      logger.info({ ch: channel, ms: Date.now() - start }, 'ipc.ok');
      return { ok: true, data: output };
    } catch (err) {
      logger.error({ ch: channel, err }, 'ipc.err');
      return {
        ok: false,
        error: {
          code: err instanceof z.ZodError ? 'VALIDATION' : 'UNKNOWN',
          message: err instanceof Error ? err.message : String(err),
        },
      };
    }
  });
}
```

### 2.4 메인에서 등록
```ts
// apps/desktop/electron/main/services/tts/index.ts
registerHandler(Channels.Tts.Edge, TtsRequest, async (req) => {
  return ttsEdge(req);
});
```

### 2.5 preload (오직 한 곳)
```ts
// apps/desktop/electron/preload/index.ts
import { contextBridge, ipcRenderer } from 'electron';
import { Channels } from '@videoforge/shared';

const api = {
  project: {
    save:   (p: unknown) => ipcRenderer.invoke(Channels.Project.Save, p),
    load:   (id: string) => ipcRenderer.invoke(Channels.Project.Load, id),
    list:   () => ipcRenderer.invoke(Channels.Project.List),
    delete: (id: string) => ipcRenderer.invoke(Channels.Project.Delete, id),
  },
  tts: {
    edge:   (r: unknown) => ipcRenderer.invoke(Channels.Tts.Edge, r),
    google: (r: unknown) => ipcRenderer.invoke(Channels.Tts.Google, r),
    gemini: (r: unknown) => ipcRenderer.invoke(Channels.Tts.Gemini, r),
    onProgress: (cb: (p: unknown) => void) => {
      const wrapped = (_e: unknown, p: unknown) => cb(p);
      ipcRenderer.on(Channels.Tts.OnProgress, wrapped);
      return () => ipcRenderer.removeListener(Channels.Tts.OnProgress, wrapped);
    },
  },
  // ...
};

contextBridge.exposeInMainWorld('electronAPI', api);

// 타입 노출
export type ElectronAPI = typeof api;
```

```ts
// apps/desktop/src/types/window.d.ts
import type { ElectronAPI } from '../../../electron/preload';
declare global { interface Window { electronAPI: ElectronAPI } }
export {};
```

### 2.6 렌더러 사용 (zod로 응답 검증)
```ts
// apps/desktop/src/lib/api.ts
import { TtsResult, TtsRequest } from '@videoforge/shared';

export async function ttsEdge(req: TtsRequest): Promise<TtsResult> {
  const resp = await window.electronAPI.tts.edge(req);
  if (!resp.ok) throw new Error(`${resp.error.code}: ${resp.error.message}`);
  return TtsResult.parse(resp.data);
}
```

> **규칙**: 메인이 항상 `{ ok, data | error }` 봉투. 렌더러는 한 곳에서 unwrap.

---

## 3. Service 레이어 패턴

### 3.1 형식
```ts
// apps/desktop/electron/main/services/tts/edge.ts
import { EdgeTTS } from 'node-edge-tts';
import path from 'node:path';
import os from 'node:os';
import crypto from 'node:crypto';
import fs from 'fs-extra';
import type { TtsRequest, TtsResult } from '@videoforge/shared';
import { ttsCache } from './cache';
import { logger } from '../../logger';

const TEMP = path.join(os.tmpdir(), 'videoforge', 'tts');

export async function ttsEdge(req: TtsRequest): Promise<TtsResult> {
  const cacheKey = hashKey(req);
  const cached = await ttsCache.get(cacheKey);
  if (cached) return cached;

  await fs.ensureDir(TEMP);
  const out = req.outputPath ?? path.join(TEMP, `${cacheKey}.mp3`);

  const tts = new EdgeTTS({
    voice: req.voice,
    rate: pct(req.speed - 1),
    pitch: `${req.pitch}Hz`,
  });
  await tts.ttsPromise(req.text, out);

  const result: TtsResult = {
    audioPath: out,
    durationMs: await probeDuration(out),
  };
  await ttsCache.set(cacheKey, result);
  logger.info({ voice: req.voice, len: req.text.length, out }, 'tts.edge.ok');
  return result;
}

function hashKey(req: TtsRequest) {
  return crypto.createHash('sha1')
    .update(JSON.stringify({ t: req.text, v: req.voice, s: req.speed, p: req.pitch }))
    .digest('hex');
}
function pct(d: number) { return `${d >= 0 ? '+' : ''}${Math.round(d * 100)}%`; }
```

**규칙**
- service 함수는 IPC 비종속. 단위 테스트 가능.
- 절대 `BrowserWindow` 만지지 않는다 (그건 라우터/핸들러가 함).
- 진행률은 콜백 인자 또는 EventEmitter 반환.

---

## 4. FFmpeg 패턴

### 4.1 경로 분기
```ts
// apps/desktop/electron/main/services/system/ffmpeg-path.ts
import path from 'node:path';
import os from 'node:os';
import { app } from 'electron';

export function getFfmpegPath(): string {
  if (process.env.VF_FFMPEG_PATH) return process.env.VF_FFMPEG_PATH;
  const arch = os.arch();              // 'arm64' | 'x64'
  const base = app.isPackaged
    ? path.join(process.resourcesPath, 'ffmpeg', `darwin-${arch}`)
    : path.join(__dirname, '../../../resources/ffmpeg', `darwin-${arch}`);
  return path.join(base, 'ffmpeg');
}
```

### 4.2 child_process 실행 + 진행률
```ts
// apps/desktop/electron/main/services/video/ffmpeg-runner.ts
import { spawn } from 'node:child_process';
import { getFfmpegPath } from '../system/ffmpeg-path';
import { logger } from '../../logger';

interface RunOpts {
  args: string[];
  totalDurationMs: number;
  onProgress?: (percent: number) => void;
  signal?: AbortSignal;
}

export function runFfmpeg(opts: RunOpts): Promise<void> {
  return new Promise((resolve, reject) => {
    const proc = spawn(getFfmpegPath(), [
      '-hide_banner', '-loglevel', 'error',
      '-progress', 'pipe:1', '-nostats',
      ...opts.args,
    ]);

    let stderr = '';
    proc.stderr.on('data', (b: Buffer) => { stderr += b.toString(); });

    proc.stdout.on('data', (b: Buffer) => {
      const text = b.toString();
      const m = /out_time_ms=(\d+)/g;
      let last;
      while ((last = m.exec(text))) {
        const ms = Number(last[1]) / 1000;
        const pct = Math.min(100, (ms / opts.totalDurationMs) * 100);
        opts.onProgress?.(pct);
      }
    });

    opts.signal?.addEventListener('abort', () => {
      proc.kill('SIGTERM');
      setTimeout(() => proc.kill('SIGKILL'), 1000);
    });

    proc.on('exit', (code) => {
      if (code === 0) resolve();
      else reject(new Error(`ffmpeg exit ${code}\n${stderr}`));
    });
    proc.on('error', reject);

    logger.debug({ args: opts.args }, 'ffmpeg.spawn');
  });
}
```

### 4.3 Pipeline 컴파일 예시
```ts
// packages/ffmpeg-pipeline/src/compile.ts
export function compile(steps: PipelineStep[]): { args: string[]; out: string } {
  const inputs: string[] = [];
  const filters: string[] = [];
  let cur = '0:v';
  let aud = '0:a';

  for (const s of steps) {
    switch (s.kind) {
      case 'subtitleBurn': {
        const escPath = s.subPath.replace(/'/g, "'\\''");
        const fontsdir = s.fontsDir.replace(/:/g, '\\:');
        filters.push(`[${cur}]subtitles='${escPath}':fontsdir='${fontsdir}'[v_sub]`);
        cur = 'v_sub';
        break;
      }
      // ... 다른 step들
    }
  }
  // ...
  return { args: [...inputs, '-filter_complex', filters.join(';'), /* ... */], out: '' };
}
```

> **함정**: ffmpeg subtitles filter는 경로 escape에 매우 민감. 슬래시 / 콜론 / 따옴표 모두 처리.

---

## 5. Puppeteer 패턴

### 5.1 BrowserPool
```ts
// packages/automation-core/src/browser-pool.ts
import puppeteer, { Browser } from 'puppeteer-core';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import { addExtra } from 'puppeteer-extra';

const puppeteerExtra = addExtra(puppeteer as any);
puppeteerExtra.use(StealthPlugin());

interface PoolEntry { browser: Browser; lastUsed: number; }
const entries = new Map<string, PoolEntry>();
const IDLE_MS = 5 * 60_000;

export async function getBrowser(profileKey: string, userDataDir: string): Promise<Browser> {
  const existing = entries.get(profileKey);
  if (existing && existing.browser.connected) {
    existing.lastUsed = Date.now();
    return existing.browser;
  }
  const browser = await puppeteerExtra.launch({
    headless: false,            // 사용자 가시성 위해 시각화
    userDataDir,
    args: ['--no-first-run', '--disable-blink-features=AutomationControlled'],
  });
  entries.set(profileKey, { browser, lastUsed: Date.now() });
  scheduleIdleCheck();
  return browser;
}

function scheduleIdleCheck() {
  setInterval(async () => {
    for (const [k, e] of entries) {
      if (Date.now() - e.lastUsed > IDLE_MS) {
        await e.browser.close().catch(() => {});
        entries.delete(k);
      }
    }
  }, 60_000).unref();
}
```

### 5.2 Selector 추상화
```ts
// apps/desktop/electron/main/services/automation/grok/selectors.ts
import type { Page } from 'puppeteer-core';

export const sel = {
  promptInput: async (p: Page) =>
    p.waitForSelector('[data-testid="prompt-input"], textarea[placeholder*="prompt" i]'),
  generateBtn: async (p: Page) =>
    p.waitForSelector('[data-testid="generate"], button:has-text("Generate")'),
  // 변경 잦으면 여기만 패치
};
```

### 5.3 Failure Screenshot
```ts
// packages/automation-core/src/screenshot-on-fail.ts
import path from 'node:path';
import os from 'node:os';
import fs from 'fs-extra';
import type { Page } from 'puppeteer-core';

export async function withFailureCapture<T>(
  page: Page, label: string, fn: () => Promise<T>,
): Promise<T> {
  try { return await fn(); }
  catch (err) {
    const dir = path.join(os.homedir(), 'Library/Logs/VideoForge/automation-failures', label);
    await fs.ensureDir(dir);
    const ts = new Date().toISOString().replace(/[:.]/g, '-');
    await page.screenshot({ path: path.join(dir, `${ts}.png`), fullPage: true }).catch(() => {});
    await fs.writeFile(path.join(dir, `${ts}.html`), await page.content().catch(() => ''));
    throw err;
  }
}
```

---

## 6. ASS Generator

```ts
// packages/ass-generator/src/index.ts
import type { AlignedWord } from '@videoforge/shared';

export function buildAss(
  words: AlignedWord[],
  style: AssStyle,
  resolution: { w: number; h: number },
): string {
  const header = [
    '[Script Info]',
    'ScriptType: v4.00+',
    `PlayResX: ${resolution.w}`,
    `PlayResY: ${resolution.h}`,
    '',
    '[V4+ Styles]',
    'Format: Name, Fontname, Fontsize, PrimaryColour, OutlineColour, BackColour, Bold, BorderStyle, Outline, Shadow, Alignment, MarginV, Encoding',
    `Style: Default,${style.font},${style.size},${style.primary},${style.outline},&H80000000,${style.bold ? 1 : 0},1,${style.outlineWidth},${style.shadow},${style.alignment},${style.marginV},1`,
    '',
    '[Events]',
    'Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text',
  ];
  const lines = wordsToLines(words, { maxCharsPerLine: 22 });
  const events = lines.map(l =>
    `Dialogue: 0,${msToAss(l.start)},${msToAss(l.end)},Default,,0,0,0,,${l.text}`,
  );
  return [...header, ...events].join('\n');
}

function msToAss(ms: number) {
  const cs = Math.round(ms / 10);
  const h = Math.floor(cs / 360_000);
  const m = Math.floor((cs % 360_000) / 6_000);
  const s = Math.floor((cs % 6_000) / 100);
  const c = cs % 100;
  return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}.${String(c).padStart(2, '0')}`;
}
```

---

## 7. Keychain (safeStorage)

```ts
// apps/desktop/electron/main/services/system/keychain.ts
import { safeStorage, app } from 'electron';
import path from 'node:path';
import fs from 'fs-extra';

const FILE = path.join(app.getPath('userData'), 'Settings/credentials.bin');

interface Bag { [k: string]: string }

async function readBag(): Promise<Bag> {
  if (!await fs.pathExists(FILE)) return {};
  if (!safeStorage.isEncryptionAvailable()) throw new Error('Keychain unavailable');
  const buf = await fs.readFile(FILE);
  return JSON.parse(safeStorage.decryptString(buf));
}

async function writeBag(bag: Bag) {
  await fs.ensureDir(path.dirname(FILE));
  await fs.writeFile(FILE, safeStorage.encryptString(JSON.stringify(bag)));
}

export async function saveSecret(key: string, value: string) {
  const bag = await readBag();
  bag[key] = value;
  await writeBag(bag);
}
export async function loadSecret(key: string): Promise<string | null> {
  const bag = await readBag();
  return bag[key] ?? null;
}
```

> **macOS 첫 실행 시**: 사용자가 Keychain 다이얼로그를 한 번 승인.

---

## 8. Renderer: Zustand 패턴

```ts
// apps/desktop/src/stores/project.ts
import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import { ttsEdge } from '@/lib/api';

interface State {
  current?: Project;
  isSaving: boolean;
  ttsTasks: Record<string, { percent: number }>;
}
interface Actions {
  load: (id: string) => Promise<void>;
  save: () => Promise<void>;
  generateNarration: (sceneId: string, text: string, voice: string) => Promise<void>;
}

export const useProject = create<State & Actions>()(devtools((set, get) => ({
  isSaving: false,
  ttsTasks: {},

  load: async (id) => {
    const p = await window.electronAPI.project.load(id);
    set({ current: ProjectSchema.parse(p.data) });
  },
  save: async () => {
    const p = get().current; if (!p) return;
    set({ isSaving: true });
    try { await window.electronAPI.project.save(p); }
    finally { set({ isSaving: false }); }
  },
  generateNarration: async (sceneId, text, voice) => {
    const r = await ttsEdge({ text, voice, speed: 1, pitch: 0 });
    set(s => {
      const cur = s.current; if (!cur) return s;
      const scenes = cur.scenes.map(sc =>
        sc.id === sceneId ? { ...sc, narrationAudio: { kind: 'audio', path: r.audioPath, sha1: '' } } : sc
      );
      return { current: { ...cur, scenes } };
    });
  },
})));
```

---

## 9. Error Handling

### 9.1 사용자 메시지 vs 로그
```ts
// 항상 두 가지 분리
class UserFacingError extends Error {
  constructor(message: string, public hint?: string) { super(message); }
}

// service에서
if (!apiKey) {
  throw new UserFacingError('Gemini API 키가 설정되지 않았습니다', '설정 → API 키에서 등록하세요');
}
```

### 9.2 IPC 핸들러에서 변환
```ts
catch (err) {
  if (err instanceof UserFacingError) {
    return { ok: false, error: { code: 'USER', message: err.message, hint: err.hint } };
  }
  // 그 외는 로그만 자세히 + 사용자에게는 일반 메시지
}
```

---

## 10. Testing Patterns

### 10.1 Vitest (service 단위)
```ts
// services/tts/edge.test.ts
import { describe, it, expect, vi } from 'vitest';
vi.mock('node-edge-tts', () => ({
  EdgeTTS: vi.fn().mockImplementation(() => ({
    ttsPromise: vi.fn().mockResolvedValue(undefined),
  })),
}));
import { ttsEdge } from './edge';

describe('ttsEdge', () => {
  it('returns audioPath and durationMs', async () => {
    const r = await ttsEdge({ text: '안녕하세요', voice: 'ko-KR-SunHiNeural', speed: 1, pitch: 0 });
    expect(r.audioPath).toMatch(/\.mp3$/);
    expect(r.durationMs).toBeGreaterThan(0);
  });
});
```

### 10.2 Playwright Electron
```ts
// e2e/project.spec.ts
import { _electron as electron, test, expect } from '@playwright/test';

test('create and reopen project', async () => {
  const app = await electron.launch({ args: ['.'] });
  const win = await app.firstWindow();
  await win.click('text=새 프로젝트');
  await win.fill('[name=title]', '테스트');
  await win.click('text=생성');
  await expect(win.locator('h1')).toContainText('테스트');
  await app.close();
});
```

### 10.3 Puppeteer 모킹
```ts
// e2e/grok-mock-server.ts
import express from 'express';
const app = express();
app.get('/grok', (_req, res) => res.send(`
  <html><body>
    <textarea data-testid="prompt-input"></textarea>
    <button data-testid="generate" onclick="
      setTimeout(() => {
        const v = document.createElement('video');
        v.dataset.testid = 'generated-video';
        v.src = 'data:video/mp4;base64,AAAA';
        document.body.appendChild(v);
      }, 500);
    ">Generate</button>
  </body></html>
`));
app.listen(4567);
```

---

## 11. Logging

```ts
// apps/desktop/electron/main/logger.ts
import pino from 'pino';
import path from 'node:path';
import { app } from 'electron';
import fs from 'fs-extra';

const logPath = path.join(app.getPath('logs'), 'main.jsonl');
fs.ensureFileSync(logPath);

export const logger = pino({
  level: process.env.NODE_ENV === 'production' ? 'info' : 'debug',
  transport: app.isPackaged
    ? { target: 'pino/file', options: { destination: logPath, mkdir: true } }
    : { target: 'pino-pretty', options: { colorize: true } },
});
```

> 모든 IPC 호출에 `ms`, `ch`, 결과 분기. 그러면 사용자 버그 리포트에서 한 번에 진단 가능.

---

## 12. macOS Build (electron-builder)

### 12.1 `electron-builder.yml`
```yaml
appId: com.videoforge.app
productName: VideoForge
directories:
  output: dist
  buildResources: build
files:
  - 'out/**/*'
  - 'package.json'
asar: true
asarUnpack:
  - 'node_modules/sharp/**'
  - 'node_modules/ffmpeg-static/**'
mac:
  category: public.app-category.video
  icon: build/icon.icns
  target:
    - target: dmg
      arch: [universal]
    - target: zip
      arch: [universal]
  hardenedRuntime: true
  gatekeeperAssess: false
  entitlements: build/entitlements.mac.plist
  entitlementsInherit: build/entitlements.mac.plist
  notarize:
    teamId: ${env.APPLE_TEAM_ID}
extraResources:
  - from: 'resources/ffmpeg'
    to: 'ffmpeg'
```

### 12.2 `build/entitlements.mac.plist`
```xml
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>com.apple.security.cs.allow-jit</key><true/>
  <key>com.apple.security.cs.allow-unsigned-executable-memory</key><true/>
  <key>com.apple.security.cs.disable-library-validation</key><true/>
  <key>com.apple.security.cs.allow-dyld-environment-variables</key><true/>
  <key>com.apple.security.device.audio-input</key><true/>
  <key>com.apple.security.network.client</key><true/>
  <key>com.apple.security.network.server</key><true/>
  <key>com.apple.security.files.user-selected.read-write</key><true/>
</dict>
</plist>
```

### 12.3 GitHub Actions 핵심
```yaml
# .github/workflows/release.yml
- name: Import Apple cert
  uses: apple-actions/import-codesign-certs@v3
  with:
    p12-file-base64: ${{ secrets.APPLE_CERT_P12 }}
    p12-password: ${{ secrets.APPLE_CERT_PASSWORD }}
- name: Build & notarize
  env:
    APPLE_TEAM_ID: ${{ secrets.APPLE_TEAM_ID }}
    APPLE_ID: ${{ secrets.APPLE_ID }}
    APPLE_APP_SPECIFIC_PASSWORD: ${{ secrets.APPLE_APP_SPECIFIC_PASSWORD }}
  run: pnpm build && pnpm dist
```

---

## 13. Common Pitfalls (사전 경고)

1. **`asar` 안의 네이티브 모듈은 안 돈다.** sharp / ffmpeg-static 은 `asarUnpack` 필수.
2. **Universal 빌드 시 sharp 두 아키텍처 동시 설치** (`pnpm install --shamefully-hoist` 또는 별도 스크립트).
3. **Notarization은 첫 시도 실패가 정상**. `notarytool log` 로 사유 확인 → entitlements 보정.
4. **`subtitles=` filter 경로 escape**: 윈도우식 `\\` 두 번 vs macOS `/`. 따옴표·콜론·괄호 모두 escape.
5. **Puppeteer headless:false 권한**: macOS Sequoia 이후 화면 기록 권한 다이얼로그 — 사용자에게 안내.
6. **Edge TTS 토큰**: 가끔 IP 차단. fallback 으로 Google TTS 자동 전환 옵션 제공.
7. **wavesurfer.js v7 API**가 v6과 다름. 최신 API (`WaveSurfer.create({ container, ... })`) 사용.
8. **libass-wasm**: 대용량 wasm. 렌더러에서 lazy load 필요. `?init` import suffix 사용.
9. **macOS 메뉴 단축키 ⌘ vs Ctrl**: Electron 의 `Menu.buildFromTemplate` 의 `accelerator: 'CmdOrCtrl+S'` 패턴.
10. **윈도우 닫혀도 앱 종료 X (macOS 관습)**: `app.on('window-all-closed', () => process.platform !== 'darwin' && app.quit())`.
11. **DevTools 안 보이게**: 프로덕션 빌드는 `BrowserWindow({ webPreferences: { devTools: false } })`.
12. **타임라인 드래그&드롭 60fps**: react-konva 또는 css transform + RAF 직접 — 절대 setState 매 프레임 X.

---

## 14. Snippets — Knowledge Files

### `electron/knowledge/dna-script.md` (예시 시스템 프롬프트)
```markdown
당신은 HBAS YouTube 채널의 시니어 스크립트 작가입니다.

채널 스타일:
- 청중: 한국 기독교인. 30~60대 다수.
- 톤: 차분하지만 흥미진진. 학술용어 최소.
- 길이: 한 편 8~12분 분량. 7씬 구조.
- 자막 가독성을 위해 한 문장 22자 이내.

산출 포맷: JSON
{
  "title": "...",
  "scenes": [
    { "index": 1, "scriptKo": "...", "imagePrompt": "...", "videoPrompt": "..." }
  ]
}
```

> 이 파일들은 코드와 분리되어 있어 사용자가 직접 편집 가능. 본인 채널 톤을 학습.

---

## 15. Checklist (PR Description 템플릿)

```markdown
## What
- [ ] 어떤 specify.md 항목을 구현?
- [ ] 어떤 IPC 채널 추가/변경?

## How
- [ ] zod 스키마 추가
- [ ] 메인 service
- [ ] preload 노출
- [ ] 렌더러 사용

## Tests
- [ ] Vitest 단위
- [ ] Playwright E2E (해당 시)
- [ ] 수동 smoke (macOS arm64)
- [ ] 수동 smoke (macOS x64) ※ 가능하면

## Risks
- [ ] constitution.md N1~N10 위반 여부 검토
- [ ] 성능 예산 위반 여부

## Docs
- [ ] specify.md 갱신
- [ ] CHANGELOG 항목
```

---

## 16. 마지막 원칙

> **specify.md에 없으면 짓지 마라. plan.md와 다르게 짓지 마라. constitution.md와 충돌하면 멈춰라.**

이 다섯 문서가 일치하지 않는 채로 머지된 코드는 다음 사람을 고문한다.
