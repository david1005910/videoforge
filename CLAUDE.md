# CLAUDE.md

> Claude Code 자동 컨텍스트. 프로젝트 루트에 두면 매 세션 자동 로드.

## Environment (LOCKED)

이 프로젝트는 다음 환경에 최적화되어 있다:

- **Hardware**: Intel x86_64, 16GB RAM, 노트북
- **OS**: macOS Monterey 12.x
- **Node**: 20 LTS (정확한 버전은 `package.json` engines)
- **pnpm**: 9.15.0 (corepack 관리)
- **Local builds**: x64 only — universal2는 CI 전용
- **Electron**: 33.0.2 (정확한 버전 핀)

다른 환경 가정 코드/명령은 작성하지 말 것. 환경별 분기는 `docs/ENVIRONMENT.md` 참조.

## Mission

VideoForge는 macOS-native AI 영상 제작 스튜디오. EasyVideo (Windows/Electron) 의 기능적 동등물을 클린룸으로 재구현. **HBAS YouTube 채널 + 개인 사용**.

## Authoritative Documents

다음 7종 문서는 모든 결정의 최종 심판자다. **코드 작성/수정 전에 반드시 관련 섹션 읽기**.

- `docs/constitution.md` — 핵심 원칙, 비협상 규칙 (N1~N10)
- `docs/specify.md` — 무엇을 만드는가 (IPC API 표면)
- `docs/plan.md` — 어떻게 (스택, 아키텍처)
- `docs/tasks.md` — 작업 분해 (Phase 0~11)
- `docs/implement.md` — 코드 패턴
- `docs/decisions.md` — ADR 5건 (ADR-005 Intel 환경 정책 포함)
- `docs/ENVIRONMENT.md` — **Intel 16GB Monterey 환경별 모든 결정**

문서가 코드와 충돌하면 **문서가 이긴다**.

## Tech Stack (이 환경에서 확정)

- **Frontend**: Electron 33.0.2 + React 18 + Vite 5 + electron-vite + Tailwind 3 + Zustand + TypeScript 5
- **Main process**: TypeScript, fluent-ffmpeg, sharp, puppeteer-core 21.11.0 (정확한 버전 핀)
- **Shared**: zod 스키마로 IPC 페이로드 검증 (`packages/shared/src/schemas/`)
- **Build**:
  - 로컬: `pnpm dist:mac:local` (x64 only, 8~12분)
  - CI: universal2 + Notarization (macos-14 러너)
- **Test**: Vitest 단위, Playwright Electron E2E
- **CI**: GitHub Actions, macos-13 (Intel) + macos-14 (M1) 매트릭스

## Repository Layout

```
videoforge/
├── apps/desktop/
│   ├── electron/main/         # 메인 프로세스
│   ├── electron/preload/      # contextBridge
│   ├── src/                   # Renderer (React)
│   ├── e2e/                   # Playwright E2E
│   ├── electron-builder.yml          # x64 default (로컬용)
│   └── electron-builder.universal.yml # universal2 (CI 전용)
├── packages/shared/
│   └── src/schemas/           # zod 스키마 — 메인↔렌더러 공유
└── docs/                      # spec-kit 5종 + 가이드
```

## Critical Patterns

### 1. IPC 채널 추가 시

순서를 정확히 따른다:

1. `packages/shared/src/ipc-channels.ts` 채널명 추가
2. `packages/shared/src/schemas/<도메인>.ts` zod 스키마 추가 (Request + Response)
3. `apps/desktop/electron/main/services/<도메인>/<기능>.ts` service 함수
4. 메인 `index.ts` 또는 services 등록 함수에서 `registerHandler(채널, 스키마, service)` 호출
5. `apps/desktop/electron/preload/index.ts` 의 `api` 객체에 노출
6. `apps/desktop/src/lib/api.ts` 에 unwrap + 응답 검증 래퍼
7. `packages/shared/SCHEMAS.md` 매핑 표 갱신
8. `docs/specify.md` §0 매핑 표 갱신

### 2. 무거운 작업은 메인 프로세스

renderer는 OS 자원에 직접 접근 금지 (`constitution.md` N5). ffmpeg, fs, puppeteer, keychain 모두 IPC 경유.

### 3. 진행률 이벤트

작업마다 `taskId` (ULID) 발급. `webContents.send('xxx:onProgress', { taskId, percent, ... })`. 렌더러는 `taskId` 로 필터링.

### 4. 큰 데이터는 파일 경로

IPC 페이로드 1MB 이하만 (`constitution.md` N6). 비디오·큰 오디오·큰 이미지는 메인이 임시 파일로 쓴 뒤 경로 전달.

### 5. 사용자 메시지 vs 로그

사용자에게 보여줄 에러는 `UserFacingError` 던짐. 일반 `Error` 는 "알 수 없는 오류" 로 마스킹.

### 6. Intel 16GB Monterey 특화 패턴

- **ffmpeg 프리셋**: dev = `faster`, prod = `medium` (분기 코드는 `packages/ffmpeg-pipeline/src/compile.ts`)
- **인코딩 동시성**: `maxConcurrent = 1` 강제
- **Puppeteer Chromium**: `find-chrome-bin` 으로 사용자 시스템 Chrome 우선 사용 (Phase 6)
- **로컬 DMG 빌드**: `pnpm dist:mac:local` 만 사용 (x64). universal2는 CI 위임.
- **H.265 인코딩**: 로컬 사용 금지 (속도 절반). 최종 산출물도 H.264 우선.

## Common Commands

```bash
pnpm dev                  # Electron + HMR (첫 시작 30~60초)
pnpm test                 # Vitest 단위 테스트
pnpm test:e2e             # Playwright Electron E2E
pnpm typecheck            # tsc -b --noEmit
pnpm lint                 # ESLint
pnpm build                # 프로덕션 번들
pnpm dist:mac:local       # 로컬 x64 DMG (8~12분)
pnpm clean:cache          # vite/out/dist 정리

# Intel Monterey 시 자주 쓰는 정리
pkill -f electron && pkill -f vite      # 좀비 프로세스
rm -rf apps/desktop/node_modules/.vite  # Vite 캐시 강제 정리
```

## Don't Do This (Intel 16GB Monterey 특화)

- ❌ `pnpm dist:mac:universal` 을 로컬에서 — 30분+ 풀로드, 발열, 메모리 7GB+
- ❌ Apple Silicon 가정 코드 (예: `process.arch === 'arm64'` 단정)
- ❌ AVX2 의존 라이브러리 추가 (whisper.cpp 등 Phase 12+ 만)
- ❌ ffmpeg 동시 작업 2개 이상 (큐 매니저 우회)
- ❌ H.265 인코딩을 디폴트로
- ❌ Puppeteer 자체 Chromium 다운로드 의존 (사용자 Chrome 사용)
- ❌ `apps/desktop/src/` 에서 `import { app } from 'electron'` (renderer Node 접근 X)
- ❌ `any` 타입 (`unknown` + zod 가드 사용)
- ❌ IPC 페이로드를 zod 검증 없이 메인에서 사용
- ❌ `nodeIntegration: true` 또는 `contextIsolation: false`
- ❌ ffmpeg 시스템 PATH 사용 (반드시 `ffmpeg-static` 동봉)
- ❌ 사용자 자격증명 평문 저장 (Keychain `safeStorage`)
- ❌ Electron `BrowserWindow`를 service 함수에서 직접 import

## Current Phase

**Phase 0 — Bootstrap 완료.** 다음은 Phase 1 (Project Skeleton + Core IO).

각 작업은 `docs/tasks.md` 의 P1-01 ~ P1-16 ID로 명시. PR title 에 ID:

```
feat(P1-04): IPC project:save / project:load / project:list / project:delete
```

## Working Style

새 기능 작업 시:

1. `docs/tasks.md` 에서 ID 확인 → 정의 명확화
2. `docs/specify.md` 의 관련 섹션 → IPC 시그니처
3. `docs/implement.md` 의 패턴 (특히 §2 IPC 패턴, §3 Service 레이어)
4. `packages/shared/SCHEMAS.md` 기존 스키마 충돌 확인
5. 구현 → `pnpm test` + `pnpm typecheck` 통과
6. PR description 에 7단계 체크리스트 (`docs/implement.md` §15)

## Active ADRs

- **ADR-001 STT**: Cloud(OpenAI) 기본, Local(whisper.cpp) Phase 12+. **Intel + AVX2 미지원 가능성으로 Cloud 강력 권장**.
- **ADR-002 자동화**: Puppeteer 단독, Bridge Phase 12+. Whisk/ImageFX는 별도 Google 계정 권장.
- **ADR-003 프로젝트 위치**: `~/Documents/VideoForge/Projects/` 기본, 사용자 변경 가능.
- **ADR-004 폰트**: Noto Sans KR Variable 동봉 (OFL).
- **ADR-005 Intel 환경**: 로컬 = x64만, universal2 = CI 전용. ffmpeg dev preset = `faster`. H.265 로컬 금지.

## Session Hygiene (Intel 노트북)

세션 시작:
```bash
# 어댑터 연결 확인
pmset -g batt | grep -i charging
# Chrome 탭 5개 이하, Slack/Discord/Spotify 닫기
```

세션 종료:
```bash
pkill -f electron && pkill -f vite
git status   # 미커밋 변경사항 확인
```

1~2시간 dev 세션 후엔 `pnpm dev` 재시작 (Vite 메모리 누수 방지).
