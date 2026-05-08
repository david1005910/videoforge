# VideoForge — Plan

> 이 문서는 **어떻게 만드는가**를 정의한다. 기술 스택, 아키텍처, 디렉토리 구조, 빌드/배포 파이프라인.
> 무엇을 만드는가는 `specify.md`, 왜 그렇게 만드는가는 `constitution.md`.

---

## 1. Technology Stack (확정)

### 1.1 Frontend (Renderer)
| 영역 | 선택 | 이유 |
|---|---|---|
| Framework | **React 18** | 사용자 친숙, Electron 베스트 프랙티스 |
| Build | **Vite + electron-vite** | 빠른 HMR, 사용자 선호 스택과 일치 |
| Language | **TypeScript 5.x** | 타입 안전성 (N2) |
| Styling | **Tailwind CSS 4.x** | 사용자 선호 |
| UI Kit | **shadcn/ui** + Radix Primitives | 접근성 + 커스터마이징 |
| State | **Zustand** | 원본과 동일, 가벼움 |
| Routing | **TanStack Router** | 타입 안전 라우팅 |
| Forms | **react-hook-form** + **zod** | 검증 일관성 |
| Icons | **lucide-react** | 원본과 동일 |
| Audio Wave | **wavesurfer.js** | 원본과 동일 |
| Subtitle Renderer | **libass-wasm** | ASS 정확도 |

### 1.2 Backend (Main + Workers)
| 영역 | 선택 | 이유 |
|---|---|---|
| Runtime | **Electron 33.x** | LTS, security baseline |
| Language | **TypeScript 5.x** | 메인-렌더러 타입 공유 |
| Video | **fluent-ffmpeg** + **ffmpeg-static** | 원본과 동일, 경로만 darwin 분기 |
| ffprobe | **ffprobe-static** (darwin 바이너리 동봉) | 동일 |
| Image | **sharp** (cross-platform) | EXIF 메타·썸네일 |
| STT-Align | **@bbc/stt-align-node** | 검증된 라이브러리 |
| TTS Edge | **node-edge-tts** | 무료 + 보이스 풍부 |
| AI SDK | **@google/generative-ai** | Gemini |
| Web Automation | **puppeteer-core** + **puppeteer-extra-plugin-stealth** | Grok·Whisk·ImageFX |
| HTTP | **undici** | Node 내장 fetch보다 안정적 |
| Logging | **pino** + custom JSONL transport | 구조화 로그 |
| Schema | **zod** | IPC 페이로드 검증 |

### 1.3 Build / Packaging
| 영역 | 선택 |
|---|---|
| Bundler | electron-vite (esbuild + rollup) |
| Packager | electron-builder |
| Code Signing | Apple Developer ID + notarytool |
| Installer | DMG (drag-to-Applications) + ZIP |
| Architecture | Universal2 (arm64 + x64) |
| Min macOS | 11.0 Big Sur |

### 1.4 Tooling
| 영역 | 선택 |
|---|---|
| Package Manager | **pnpm** (워크스페이스) |
| Monorepo | pnpm workspaces (단일 repo, 멀티 패키지) |
| Lint | ESLint + @typescript-eslint |
| Format | Prettier |
| Test (Unit) | Vitest |
| Test (E2E) | Playwright (Electron 모드) |
| Test (IPC) | 자체 mock 메인 + 렌더러 |
| CI | GitHub Actions (macos-14 + macos-13 매트릭스) |
| Hooks | husky + lint-staged |
| Versioning | changesets |

---

## 2. Repository Layout

```
videoforge/
├── package.json                  # pnpm workspace root
├── pnpm-workspace.yaml
├── electron-builder.yml
├── electron.vite.config.ts
├── tsconfig.json                 # 베이스 (paths)
├── .github/workflows/build.yml
├── apps/
│   └── desktop/
│       ├── package.json
│       ├── electron/
│       │   ├── main/
│       │   │   ├── index.ts                # 앱 진입점
│       │   │   ├── window-manager.ts
│       │   │   ├── ipc-router.ts           # 모든 IPC 라우팅
│       │   │   ├── menu.ts                 # macOS 네이티브 메뉴
│       │   │   ├── auto-updater.ts
│       │   │   ├── permissions.ts
│       │   │   └── services/
│       │   │       ├── project.service.ts
│       │   │       ├── tts/
│       │   │       │   ├── edge.ts
│       │   │       │   ├── google.ts
│       │   │       │   └── gemini.ts
│       │   │       ├── stt/
│       │   │       │   ├── transcribe.ts
│       │   │       │   └── align.ts
│       │   │       ├── video/
│       │   │       │   ├── ffmpeg-runner.ts
│       │   │       │   ├── pipeline.ts
│       │   │       │   ├── frames.ts
│       │   │       │   └── effects.ts
│       │   │       ├── audio/
│       │   │       │   └── merge.ts
│       │   │       ├── automation/
│       │   │       │   ├── grok/
│       │   │       │   │   ├── browser.ts
│       │   │       │   │   ├── login.ts
│       │   │       │   │   ├── generate.ts
│       │   │       │   │   └── bridge.ts
│       │   │       │   ├── whisk/
│       │   │       │   └── imagefx/
│       │   │       ├── chat/
│       │   │       │   ├── gemini-client.ts
│       │   │       │   ├── cs-knowledge.ts
│       │   │       │   ├── dna-script-knowledge.ts
│       │   │       │   └── thumbnail-knowledge.ts
│       │   │       ├── assets/
│       │   │       │   ├── fonts.ts
│       │   │       │   └── sfx.ts
│       │   │       ├── files/
│       │   │       └── system/
│       │   │           ├── hwid.ts
│       │   │           ├── ffmpeg-path.ts
│       │   │           └── keychain.ts
│       │   ├── preload/
│       │   │   └── index.ts                # contextBridge 노출 (오직 한 곳)
│       │   └── workers/
│       │       ├── ffmpeg.worker.ts
│       │       └── puppeteer.worker.ts
│       ├── src/                            # Renderer
│       │   ├── main.tsx
│       │   ├── App.tsx
│       │   ├── routes/
│       │   │   ├── projects.tsx
│       │   │   ├── editor/
│       │   │   │   ├── timeline.tsx
│       │   │   │   ├── scene-list.tsx
│       │   │   │   └── inspector.tsx
│       │   │   ├── tts.tsx
│       │   │   ├── stt.tsx
│       │   │   ├── grok.tsx
│       │   │   ├── whisk.tsx
│       │   │   └── settings/
│       │   ├── components/
│       │   │   ├── ui/                     # shadcn 생성물
│       │   │   ├── timeline/
│       │   │   ├── waveform/
│       │   │   ├── subtitle-preview/       # libass-wasm 호스팅
│       │   │   └── progress/
│       │   ├── stores/                     # Zustand
│       │   ├── hooks/
│       │   ├── lib/
│       │   │   └── api.ts                  # window.electronAPI 래퍼
│       │   ├── i18n/
│       │   │   ├── ko.json
│       │   │   └── en.json
│       │   └── styles/
│       └── resources/
│           ├── icon.icns
│           ├── ffmpeg/                     # darwin 바이너리 (universal)
│           └── fonts/
├── packages/
│   ├── shared/                             # 메인-렌더러 공유 타입
│   │   ├── src/
│   │   │   ├── ipc-channels.ts             # 채널명 enum + 페이로드 타입
│   │   │   ├── schemas/                    # zod 스키마
│   │   │   ├── domain/                     # Project, Scene, ...
│   │   │   └── index.ts
│   │   └── package.json
│   ├── ass-generator/                      # script + alignment → ASS
│   ├── ffmpeg-pipeline/                    # PipelineStep 빌더
│   └── automation-core/                    # Puppeteer 공통 (browser pool, retry)
└── docs/
    ├── constitution.md
    ├── specify.md
    ├── plan.md
    ├── tasks.md
    └── implement.md
```

---

## 3. Process & Worker Topology

```
┌─────────────────── Electron App ───────────────────┐
│                                                     │
│  ┌─ Main Process (Node) ──────────────────┐         │
│  │  ipc-router → service 메서드             │         │
│  │  WindowManager, AutoUpdater, Menu        │         │
│  └─┬──────────┬──────────┬──────────────────┘       │
│    │          │          │                          │
│    │ spawn    │ spawn    │ spawn                    │
│    ▼          ▼          ▼                          │
│  ┌─────────┐┌─────────┐┌──────────────┐             │
│  │ ffmpeg  ││Puppeteer││ Whisper      │             │
│  │ child   ││ worker  ││ (cloud HTTP) │             │
│  │ process ││         ││ undici fetch │             │
│  └─────────┘└─────────┘└──────────────┘             │
│                                                     │
│  ┌─ Renderer Window 1 (Chromium) ─┐                 │
│  │ React UI ── window.electronAPI │                 │
│  └────────────────────────────────┘                 │
│  ┌─ Renderer Window 2 (Chromium) ─┐                 │
│  │ React UI                       │                 │
│  └────────────────────────────────┘                 │
└─────────────────────────────────────────────────────┘
```

**규칙**
- 무거운 라이브러리(@bbc/stt-align-node, sharp, libass-wasm 일부) 는 **메인 프로세스의 worker_threads**.
- ffmpeg / puppeteer 는 **child_process**(독립 메모리, 크래시 격리).
- 워커-메인 통신은 메시지 패싱 (`postMessage` / `parentPort`).
- 메인-렌더러는 `ipcMain.handle` (request/response) + `webContents.send` (push).

---

## 4. IPC Architecture

### 4.1 Channel 명명 규칙
- `<domain>:<action>` 케밥. 예) `video:edit`, `tts:edge`, `grok:onProgress`.
- 이벤트(메인→렌더러) 는 `on` 접두 (`grok:onProgress`).
- 모든 채널은 `packages/shared/src/ipc-channels.ts` 에 enum 등록.

### 4.2 페이로드 검증
```ts
// shared/schemas/tts.ts
export const TtsRequestSchema = z.object({
  text: z.string().min(1).max(50_000),
  voice: z.string(),
  speed: z.number().min(0.5).max(2).optional(),
  outputPath: z.string().optional(),
});
export type TtsRequest = z.infer<typeof TtsRequestSchema>;
```

```ts
// main/ipc-router.ts
ipcMain.handle('tts:edge', async (e, raw) => {
  const req = TtsRequestSchema.parse(raw);     // 실패 시 자동 거부
  return ttsService.edge(req);
});
```

### 4.3 진행률 이벤트
- 작업마다 `taskId` 발급 (ulid).
- `webContents.send('xxx:onProgress', { taskId, percent, eta })`.
- 렌더러는 `taskId`로 필터링하여 해당 컴포넌트만 업데이트.
- 윈도우 닫혔다가 다시 열려도 진행 중인 작업은 main에서 보존.

### 4.4 큰 데이터 전달 규칙
| 데이터 | 방식 |
|---|---|
| 작은 JSON (<1MB) | IPC 직접 |
| 이미지 (>1MB) | 임시 파일 경로 |
| 비디오 | 항상 파일 경로 |
| 오디오 단편 (<5MB) | base64 가능, 그 이상 파일 |
| 스트림 데이터 | 메인이 파일로 쓴 뒤 경로 전달 |

---

## 5. ffmpeg Pipeline Design

### 5.1 PipelineStep 모델
```ts
type PipelineStep =
  | { kind: 'concat'; inputs: string[] }
  | { kind: 'subtitleBurn'; subPath: string; fontsDir: string; style?: AssStyleOverride }
  | { kind: 'audioMix'; tracks: { path: string; volume: number; offsetMs: number }[] }
  | { kind: 'kenBurns'; image: string; durationMs: number; from: Rect; to: Rect }
  | { kind: 'effect'; type: 'fade'|'blur'|'zoom'; params: Record<string, unknown> }
  | { kind: 'export'; resolution: {w,h,fps}; codec: 'h264'|'h265'|'prores'; bitrate: string };
```

### 5.2 빌더 → 단일 ffmpeg 호출
- `packages/ffmpeg-pipeline` 가 `PipelineStep[]` → ffmpeg complex_filter 그래프로 컴파일.
- 가능하면 **단일 ffmpeg 프로세스**로 끝내 디스크 I/O 절감.
- 불가능한 경우(예: ASS burn-in 후 다시 effect)만 중간 파일 사용.

### 5.3 Progress Parsing
- `-progress pipe:1` 옵션으로 stdout JSON-like.
- `out_time_us` / `out_time_ms` 파싱 → 총 길이 대비 percent.

### 5.4 Cancel
- child의 PID 기억 → SIGTERM(우아한 종료) → 1초 후 SIGKILL.
- 임시 파일 cleanup은 메인의 finally 블록.

---

## 6. Puppeteer Strategy

### 6.1 Browser Pool
- 사이트별 단일 인스턴스 (Grok, Whisk, ImageFX 각 1).
- `userDataDir` 분리 → 세션 격리.
- 사용 안 하면 5분 후 자동 종료 (메모리 절감).

### 6.2 Stealth
- `puppeteer-extra-plugin-stealth` 적용.
- **단** ToS 위반 옵션(WebRTC IP 가리기 등) 끔 — 단지 기본적 봇 탐지 우회만.

### 6.3 Login Flow
1. `grok:login` IPC → 새 BrowserWindow 또는 Puppeteer 창을 사용자에게 노출.
2. 사용자가 직접 로그인 (자격증명 가로채기 X).
3. 쿠키 자동 저장 → 다음 실행 시 재사용.

### 6.4 Robustness
- 모든 selector 는 `data-testid` 우선, 없으면 텍스트 + 구조 매칭.
- selector 실패 시 스크린샷 자동 저장 (`~/Library/Logs/VideoForge/automation-failures/`) → 사용자가 리포트하기 쉬움.
- 사이트 UI 변경 대비 — automation 코드를 작은 함수로 분리해 패치 PR이 쉽게.

### 6.5 Bridge Mode (대안)
- 향후 Phase 3: VideoForge Companion 익스텐션 (Manifest v3) → 사용자 자체 Chrome에서 직접 동작.
- DevTools Protocol over WebSocket 으로 메인이 익스텐션과 통신.

---

## 7. macOS Specifics

### 7.1 Code Signing & Notarization
- Apple Developer Program 가입 ($99/year) 필수.
- `electron-builder.yml`:
  ```yaml
  mac:
    category: public.app-category.video
    target:
      - target: dmg
        arch: [universal]
      - target: zip
        arch: [universal]
    hardenedRuntime: true
    gatekeeperAssess: false
    entitlements: build/entitlements.mac.plist
    notarize:
      teamId: <TEAM_ID>
  ```

### 7.2 Entitlements (`entitlements.mac.plist`)
```xml
<key>com.apple.security.cs.allow-jit</key><true/>
<key>com.apple.security.cs.allow-unsigned-executable-memory</key><true/>
<key>com.apple.security.cs.disable-library-validation</key><true/>
<key>com.apple.security.device.audio-input</key><true/>
<key>com.apple.security.network.client</key><true/>
<key>com.apple.security.network.server</key><true/>
<key>com.apple.security.files.user-selected.read-write</key><true/>
```
- JIT 권한은 V8/Chromium 위해 필수.
- Microphone 권한은 Whisper STT 입력에서 필요할 수 있음.

### 7.3 Info.plist 키
- `NSMicrophoneUsageDescription`: "음성 인식 및 자막 생성에 사용됩니다"
- `NSCameraUsageDescription`: "썸네일 캡처에 사용됩니다" (선택)
- `NSDocumentsFolderUsageDescription` / `NSDownloadsFolderUsageDescription`

### 7.4 Keychain 사용
```ts
import { safeStorage } from 'electron';
// 저장
const encrypted = safeStorage.encryptString(apiKey);
fs.writeFileSync(path, encrypted);
// 로드
const apiKey = safeStorage.decryptString(fs.readFileSync(path));
```
- macOS에서는 자동으로 Keychain 백엔드 사용.

### 7.5 Universal2 빌드 정책 (Intel 환경)
- **로컬 = x64 only** (`pnpm dist:mac:local`, 8~12분)
- **CI = universal2** (macos-14 러너에서 빌드 + Notarization)
- 정책 근거: `docs/decisions.md` ADR-005
- 변경 시: `apps/desktop/electron-builder.yml` 의 `arch` 와 `package.json` 의 dist 스크립트 동시 갱신

---

## 8. Storage Layout

```
~/Library/
├── Application Support/VideoForge/
│   ├── Projects/
│   │   └── <ulid>/project.json + assets/...
│   ├── Fonts/
│   ├── SFX/
│   ├── PuppeteerProfiles/
│   │   ├── grok/
│   │   ├── whisk/
│   │   └── imagefx/
│   ├── Settings/
│   │   ├── preferences.json
│   │   └── credentials.bin       # safeStorage 암호화
│   └── Knowledge/                # AI 챗 시스템 프롬프트 (수정 가능)
├── Logs/VideoForge/
│   ├── main.jsonl
│   ├── automation-failures/
│   └── ffmpeg/<taskId>.log
└── Caches/VideoForge/
    ├── tts/                      # TTS 캐시 (text+voice 해시 → wav)
    ├── thumbnails/
    └── ffprobe-cache.json
```

---

## 9. Testing Strategy

### 9.1 단위 테스트 (Vitest)
- service 레이어 100% (mock된 ffmpeg/puppeteer/fetch 사용).
- shared schemas 의 invariant 테스트.

### 9.2 IPC 통합 테스트
- 메인 프로세스를 spawn → 가짜 렌더러 (`@electron/remote` 흉내) → 채널별 round-trip.

### 9.3 E2E (Playwright Electron)
- 실제 앱 빌드 → 시나리오 자동화 → 스크린샷 회귀.
- Puppeteer 자동화는 **모킹 서버** (express + 사이트 HTML 흉내) 로 격리.

### 9.4 Visual Regression
- 자막 burn-in 결과의 SSIM 측정.
- libass-wasm 렌더링 결과를 기준 PNG와 비교.

### 9.5 Manual Smoke Checklist
배포 전 매번 통과시킬 8개 시나리오 (`docs/manual-smoke.md`).

---

## 10. CI/CD

### 10.1 GitHub Actions
```yaml
strategy:
  matrix:
    os: [macos-14, macos-13]   # arm64 + x64
steps:
  - lint, typecheck, unit, e2e
  - electron-builder --mac --universal
  - notarize (macos-14만)
  - upload artifacts to GitHub Releases
```

### 10.2 Release 프로세스
1. `pnpm changeset` 으로 버전 변경 기록.
2. PR 머지 → release-please bot 이 자동 PR.
3. 머지 시 GitHub Action 트리거 → DMG 빌드 + Notarize.
4. Sparkle 호환 RSS 갱신 (auto-update 용).

---

## 11. Performance Budgets

> 측정 환경: Intel x64 16GB Monterey 노트북 (어댑터 연결, Chrome 닫힘 상태).
> Apple Silicon 16GB 머신에서는 일반적으로 1.3~1.5배 더 빠름.

| 메트릭 | 목표 (Intel) | 측정 |
|---|---|---|
| Cold start | ≤5.0s | `app.whenReady` 까지 |
| Renderer first paint | ≤800ms | Performance API |
| IPC round-trip | <8ms (P50) | 자체 계측 |
| TTS 100자 (Edge) | <2s | 단위 테스트 |
| Subtitle burn 5분 1080p | <120s (faster preset) | 매뉴얼 smoke |
| Memory idle | <450MB | Activity Monitor |
| 로컬 x64 DMG 빌드 | <12분 | `pnpm dist:mac:local` |
| pnpm install (cold) | <10분 | 첫 클론 |

성능 회귀는 PR에서 차단.

---

## 12. Risk Register

| 리스크 | 영향 | 대응 |
|---|---|---|
| Grok / Whisk DOM 변경 | 자동화 깨짐 | selector 추상화 + auto-screenshot on fail + 빠른 패치 릴리스 |
| Apple Notarization 실패 | 사용자 설치 불가 | CI에서 staple 검증 자동화 |
| Edge TTS 토큰 정책 변경 | TTS 무료 보이스 끊김 | Google TTS fallback |
| FFmpeg 버전과 사용자 환경 충돌 | 인코딩 실패 | static 바이너리 동봉, 시스템 ffmpeg 절대 사용 X |
| Puppeteer Chromium 버전 ↔ Stealth 호환 | 자동화 우회 실패 | Chromium 버전 핀, 정기 업데이트 PR |
| 한국어 폰트 라이선스 | 자막 burn-in 분쟁 | 기본 폰트는 OFL 라이선스만 (Noto Sans KR) |

---

## 13. Migration & Versioning

### 13.1 Project File 마이그레이션
```ts
const migrations: Record<string, (p: any) => any> = {
  '1.0.0->1.1.0': p => ({ ...p, formatVersion: '1.1.0', /* ... */ }),
};
```

### 13.2 SemVer
- App: SemVer (MAJOR.MINOR.PATCH).
- ProjectFormat: 별도 SemVer.
- IPC: breaking change = MAJOR.

---

## 14. Open Decisions (확정 필요)

- [ ] STT: OpenAI Whisper API vs whisper.cpp local?
- [ ] Bridge 익스텐션 vs Puppeteer 단독?
- [ ] 프로젝트 파일 위치: `~/Library/Application Support/` 고정 vs 사용자 선택?
- [ ] 기본 한국어 폰트 동봉 (Noto Sans KR ~30MB)?
