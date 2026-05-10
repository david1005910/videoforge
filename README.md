# VideoForge

> macOS-native AI video creation studio — HBAS YouTube 채널을 위한 올인원 영상 제작 도구.

## 주요 기능

### 영상 제작 핵심

- **AI 영상 생성** — Grok Imagine 웹 자동화로 텍스트/이미지 → 영상 배치 생성
- **AI 이미지 생성** — Google Whisk (참조 기반) + ImageFX (텍스트 기반)
- **TTS 합성** — Edge TTS (무료) / Google TTS / Gemini TTS, 다국어 지원
- **자막 자동화** — STT → Forced Alignment → ASS 자막, 단어 단위 타임 편집
- **영상 편집** — ffmpeg 기반 컴포지션, 이펙트, H.264/ProRes 내보내기
- **프로젝트 관리** — 씬 단위 구조, 에셋 라이브러리 (폰트 + SFX)

### AI 어시스턴트

- **DNA Script 대본** — Gemini 기반 스크립트 작성 보조
- **Cinematography 조언** — 촬영 기법 / 연출 제안
- **썸네일 분석** — AI 기반 점수·강점·약점·개선안

### 고급 기능 (Phase 12+)

- **Whisper Local STT** — whisper.cpp 기반 오프라인 음성 인식 (OpenAI/Gemini 대안)
- **Grok Bridge Extension** — Chrome 확장 프로그램을 통한 WebSocket 브릿지 (포트 9821)
- **Mobile Companion** — 모바일 앱에서 VideoForge 원격 제어 (페어링 코드 인증)
- **Cloud Sync** — Supabase 기반 프로젝트 동기화 (서비스 준비됨, 백엔드 예정)
- **AI Video Generation** — Veo/Sora API 기반 영상 생성 (서비스 준비됨, API 예정)
- **Shared Library** — 커뮤니티 에셋 공유 (템플릿, 폰트, SFX, 프리셋, 프롬프트)
- **i18n** — 한국어 / English UI 전환 (143 키)

## Target Environment

| 항목      | 사양                                |
| --------- | ----------------------------------- |
| Hardware  | Intel x64 또는 Apple Silicon        |
| OS        | macOS 11.0 (Big Sur) 이상           |
| RAM       | 8GB 최소, 16GB 권장                 |
| 개발 환경 | Intel x64 16GB, macOS Monterey 12.x |
| Node      | 20 LTS                              |
| 로컬 빌드 | x64 only (universal2는 CI에서만)    |

## 앱 설치 (개인 사용)

1. CI Artifacts 또는 로컬 빌드(`pnpm dist:mac:local`)에서 `.dmg` 다운로드
2. DMG 열기 → VideoForge.app을 `/Applications`로 드래그
3. Gatekeeper 해제 (미서명 앱이므로 최초 1회 필요):

```bash
# 터미널에서 한 줄로 해제
xattr -cr /Applications/VideoForge.app
```

또는 Finder에서 앱 **우클릭 → 열기 → 열기 확인** (1회만).

## 개발 환경 Quick Start

```bash
# 1. Xcode CLT
xcode-select --install

# 2. corepack → pnpm
corepack enable
corepack prepare pnpm@9.15.0 --activate

# 3. Node 20 LTS (nvm 권장)
nvm install 20 && nvm use 20

# 4. 설치 및 검증
cd videoforge
pnpm install                 # 2~5분
pnpm typecheck               # 0 에러
pnpm test                    # 110개 통과
pnpm dev                     # Electron 창 떠야 성공
```

## 명령어

| Command                   | 설명                               | 추정 시간 (Intel 16GB) |
| ------------------------- | ---------------------------------- | ---------------------- |
| `pnpm dev`                | Electron + HMR dev server          | 첫 시작 30~60초        |
| `pnpm build`              | 프로덕션 번들                      | 2~3분                  |
| `pnpm test`               | Vitest 단위 테스트 (110개)         | ~11초                  |
| `pnpm test:e2e`           | Playwright Electron E2E (10개)     | 1~3분                  |
| `pnpm typecheck`          | TypeScript 검사                    | ~15초                  |
| `pnpm lint`               | ESLint                             | ~30초                  |
| `pnpm perf:budget`        | 성능 예산 체크 (13항목)            | ~30초                  |
| `pnpm dist:mac:local`     | x64 DMG (로컬용)                   | 8~12분                 |
| `pnpm dist:mac:universal` | universal2 DMG (**CI 전용**)       | 25~40분                |
| `pnpm kill:dev`           | zombie electron/vite 프로세스 종료 | 즉시                   |
| `pnpm clean:cache`        | vite/out/dist 캐시 삭제            | 즉시                   |

> 로컬에서는 `dist:mac:local`만 사용. universal2 빌드는 GitHub Actions에 위임.

## 프로젝트 구조

```
videoforge/
├── apps/desktop/           # Electron 앱
│   ├── electron/main/      # 메인 프로세스 (22 서비스 도메인)
│   │   └── services/       # assets, audio, chat, cloud, collab, diagnostics,
│   │                       # dialog, file, grok, imagefx, keychain, project,
│   │                       # remote, settings, shell, stt, tts, update,
│   │                       # video, videogen, whisk, window
│   ├── electron/preload/   # contextBridge (단일 파일)
│   ├── electron/knowledge/ # AI 채팅 시스템 프롬프트
│   ├── src/                # Renderer (React + Tailwind + Zustand)
│   │   ├── routes/         # 11개 페이지
│   │   ├── i18n/           # 한국어 / English (143 키)
│   │   └── lib/api.ts      # Renderer IPC 래퍼
│   ├── e2e/                # Playwright E2E + mock servers
│   ├── build/              # icon.icns
│   └── resources/fonts/    # Noto Sans KR (OFL)
├── packages/shared/        # 공유 타입 + Zod 스키마 + IPC 채널
├── scripts/                # perf-budget.sh
├── docs/                   # spec-kit + 사용자 매뉴얼
│   └── user-manual.md      # 사용자 매뉴얼 19섹션 (Korean)
└── .github/workflows/      # CI + release-please
```

## 아키텍처

**IPC 기반 프로세스 분리**: Renderer는 OS 자원에 직접 접근하지 않음. ffmpeg, fs, puppeteer, keychain 모든 작업은 IPC를 통해 메인 프로세스에서 처리.

```
Renderer (React)
  → src/lib/api.ts (zod-validated wrapper)
  → preload/index.ts (contextBridge)
  → ipc-router.ts (registerHandler + zod validation)
  → services/<domain>/ (순수 비즈니스 로직)
```

**22개 서비스 도메인**: assets, audio, chat, cloud, collab, diagnostics, dialog, file, grok, imagefx, keychain, project, remote, settings, shell, stt, tts, update, video, videogen, whisk, window

**11개 라우트**: 프로젝트 목록, 에디터, TTS, 에셋, Grok, ImageGen, 채팅, 설정, 온보딩, 정보, 썸네일

## 문서

**Spec-kit** (5종):

- [`constitution.md`](./docs/constitution.md) — 핵심 원칙, 비협상 규칙 (N1-N10)
- [`specify.md`](./docs/specify.md) — IPC API 명세
- [`plan.md`](./docs/plan.md) — 스택, 아키텍처
- [`tasks.md`](./docs/tasks.md) — 작업 분해 (Phase 0-11)
- [`implement.md`](./docs/implement.md) — 코드 패턴

**추가 문서**:

- [`decisions.md`](./docs/decisions.md) — ADR 5건
- [`ENVIRONMENT.md`](./docs/ENVIRONMENT.md) — Intel 16GB Monterey 환경 가이드
- [`user-manual.md`](./docs/user-manual.md) — 사용자 매뉴얼 (19섹션, Korean)
- [`CLAUDE.md`](./CLAUDE.md) — Claude Code 자동 컨텍스트
- [`CHANGELOG.md`](./CHANGELOG.md) — 변경 이력

## 테스트

| 종류       | 도구                 | 수량                                   |
| ---------- | -------------------- | -------------------------------------- |
| Unit       | Vitest               | 110개 (17 shared + 93 desktop)         |
| E2E (앱)   | Playwright Electron  | 3 spec (smoke, project, tts)           |
| E2E (모킹) | Playwright + Express | 4 spec (grok, imagegen, chat, whisper) |
| 성능 예산  | perf-budget.sh       | 13 체크                                |

## 성능 예산 (v0.3.0 기준)

| Metric       | Current | Limit |
| ------------ | ------- | ----- |
| Typecheck    | 15s     | 30s   |
| Unit tests   | 11s     | 30s   |
| Total LoC    | ~12,900 | —     |
| Shared deps  | 1       | 10    |
| Desktop deps | 18      | 40    |
| i18n keys    | 143/143 | match |

## CI/CD

- **GitHub Actions CI**: lint + typecheck + build + test (Intel x64 + Apple Silicon 매트릭스)
- **자동 빌드**: main push 시 x64 DMG + universal2 DMG 생성
- **Release-Please**: 자동 버전 범핑 + CHANGELOG 생성
- **Notarization**: Apple Developer ID 등록 후 활성화 예정 (CI workflow 준비 완료)

## API 키 설정

VideoForge는 다음 외부 서비스를 선택적으로 사용합니다:

| 서비스     | 용도              | 필수 여부 |
| ---------- | ----------------- | --------- |
| Gemini API | AI 채팅, TTS, STT | 선택      |
| OpenAI API | Whisper STT       | 선택      |

API 키는 macOS Keychain (`safeStorage`)에 암호화 저장됩니다. 설정 페이지에서 입력하거나, 첫 실행 온보딩에서 설정할 수 있습니다.

Whisper Local STT를 사용하면 클라우드 API 키 없이도 음성 인식이 가능합니다.

## 라이선스

MIT License

Copyright (c) 2026 VideoForge

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
