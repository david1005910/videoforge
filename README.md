# VideoForge

> macOS-native AI video creation studio — HBAS YouTube 채널을 위한 올인원 영상 제작 도구.

## 주요 기능

- **AI 영상 생성** — Grok Imagine 웹 자동화로 텍스트/이미지 → 영상 배치 생성
- **AI 이미지 생성** — Google Whisk (참조 기반) + ImageFX (텍스트 기반)
- **TTS 합성** — Edge TTS (무료) / Google TTS / Gemini TTS, 다국어 지원
- **자막 자동화** — STT → Forced Alignment → ASS 자막, 단어 단위 타임 편집
- **영상 편집** — ffmpeg 기반 컴포지션, 이펙트, H.264/ProRes 내보내기
- **AI 채팅 어시스턴트** — DNA Script 대본 / Cinematography 조언 / 썸네일 분석
- **프로젝트 관리** — 씬 단위 구조, 에셋 라이브러리 (폰트 + SFX)
- **i18n** — 한국어 / English UI 전환

## Target Environment

| 항목      | 사양                                |
| --------- | ----------------------------------- |
| Hardware  | Intel x64 또는 Apple Silicon        |
| OS        | macOS 11.0 (Big Sur) 이상           |
| RAM       | 8GB 최소, 16GB 권장                 |
| 개발 환경 | Intel x64 16GB, macOS Monterey 12.x |
| Node      | 20 LTS                              |
| 로컬 빌드 | x64 only (universal2는 CI에서만)    |

## Quick Start

```bash
# 1. Xcode CLT
xcode-select --install

# 2. corepack → pnpm
corepack enable
corepack prepare pnpm@9.15.0 --activate

# 3. Node 20 LTS (nvm 권장)
nvm install 20 && nvm use 20

# 4. 설치 및 검증
pnpm install                 # 2~5분
pnpm typecheck               # 0 에러
pnpm test                    # 57개 통과
pnpm dev                     # Electron 창 떠야 성공
```

## 명령어

| Command                   | 설명                          | 추정 시간 (Intel 16GB) |
| ------------------------- | ----------------------------- | ---------------------- |
| `pnpm dev`                | Electron + HMR dev server     | 첫 시작 30~60초        |
| `pnpm build`              | 프로덕션 번들                 | 2~3분                  |
| `pnpm test`               | Vitest 단위 테스트 (57개)     | ~10초                  |
| `pnpm test:e2e`           | Playwright Electron E2E (6개) | 1~3분                  |
| `pnpm typecheck`          | TypeScript 검사               | ~15초                  |
| `pnpm lint`               | ESLint                        | ~30초                  |
| `pnpm perf:budget`        | 성능 예산 체크 (13항목)       | ~30초                  |
| `pnpm dist:mac:local`     | x64 DMG (로컬용)              | 8~12분                 |
| `pnpm dist:mac:universal` | universal2 DMG (**CI 전용**)  | 25~40분                |

> 로컬에서는 `dist:mac:local`만 사용. universal2 빌드는 GitHub Actions에 위임.

## 프로젝트 구조

```
videoforge/
├── apps/desktop/           # Electron 앱
│   ├── electron/main/      # 메인 프로세스 (18 서비스 도메인)
│   ├── electron/preload/   # contextBridge
│   ├── src/                # Renderer (React + Tailwind + Zustand)
│   │   ├── routes/         # 11개 페이지
│   │   └── i18n/           # 한국어 / English (87 키)
│   ├── e2e/                # Playwright E2E + mock servers
│   └── build/              # icon.icns
├── packages/shared/        # 공유 타입 + Zod 스키마 + IPC 채널
├── scripts/                # perf-budget.sh
├── docs/                   # spec-kit + 사용자 매뉴얼
│   └── user-manual.md      # 사용자 매뉴얼 (Korean)
└── .github/workflows/      # CI + release-please
```

## 아키텍처

**IPC 기반 프로세스 분리**: Renderer는 OS 자원에 직접 접근하지 않음. ffmpeg, fs, puppeteer, keychain 모든 작업은 IPC를 통해 메인 프로세스에서 처리.

**18개 서비스 도메인**: assets, audio, chat, diagnostics, dialog, file, grok, imagefx, keychain, project, settings, shell, stt, tts, update, video, whisk, window

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
- [`user-manual.md`](./docs/user-manual.md) — 사용자 매뉴얼
- [`CLAUDE.md`](./CLAUDE.md) — Claude Code 자동 컨텍스트

## 테스트

| 종류       | 도구                 | 수량                          |
| ---------- | -------------------- | ----------------------------- |
| Unit       | Vitest               | 57개 (17 shared + 40 desktop) |
| E2E (앱)   | Playwright Electron  | 3 spec (smoke, project, tts)  |
| E2E (모킹) | Playwright + Express | 3 spec (grok, imagegen, chat) |
| 성능 예산  | perf-budget.sh       | 13 체크                       |

## CI/CD

- **GitHub Actions CI**: lint + typecheck + test (Intel x64 + Apple Silicon 매트릭스)
- **자동 빌드**: main push 시 x64 DMG + universal2 DMG 생성
- **Release-Please**: 자동 버전 범핑 + CHANGELOG 생성

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
