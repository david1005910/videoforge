# VideoForge

> macOS-native AI video creation studio. EasyVideo 기능 동등물의 클린룸 구현.

## 🎯 Target Environment (이 빌드는 다음 환경에 맞춰져 있습니다)

- **Hardware**: Intel x64 노트북, 16GB RAM
- **OS**: macOS Monterey (12.x)
- **Node**: 20 LTS
- **Local builds**: x64 only (universal2는 CI에서만)
- **개발 우선순위**: 빠른 반복, 낮은 발열, 메모리 절약

다른 환경(Apple Silicon / 8GB RAM / Big Sur 등)에서는 `docs/ENVIRONMENT.md` 의 alternative 섹션 참조.

## Quick start

```bash
# 1. Xcode CLT (없으면)
xcode-select --install

# 2. corepack → pnpm
corepack enable
corepack prepare pnpm@9.15.0 --activate

# 3. Node 20 LTS (nvm 권장)
nvm install 20 && nvm use 20

# 4. 설치 및 검증
pnpm install                 # 2~5분
pnpm typecheck               # 0 에러
pnpm test                    # 23개 통과
pnpm dev                     # Electron 창 떠야 성공
```

자세한 walkthrough: [`SETUP.md`](./SETUP.md)

## 명령어 (Intel 16GB Monterey 최적화)

| Command | 설명 | 추정 시간 (Intel 16GB) |
|---|---|---|
| `pnpm dev` | electron-vite dev (HMR) | 첫 시작 30~60초 |
| `pnpm build` | 프로덕션 번들 | 2~3분 |
| `pnpm dist:mac:local` | **x64 DMG/ZIP (로컬용)** | 8~12분 |
| `pnpm dist:mac:universal` | universal2 DMG (CI 전용 권장) | 25~40분 (로컬 시) |
| `pnpm test` | Vitest 단위 테스트 | 30초~1분 |
| `pnpm test:e2e` | Playwright Electron E2E | 1~3분 |
| `pnpm lint` | ESLint | 30초 |
| `pnpm typecheck` | tsc --noEmit | 1~2분 |

> 💡 **로컬에서는 `dist:mac:local` 만 사용**. universal2 빌드는 GitHub Actions에 위임.

## 프로젝트 구조

```
videoforge/
├── apps/desktop/        # Electron 앱
│   ├── electron/        # 메인 + preload (Node)
│   └── src/             # Renderer (React + Vite)
├── packages/shared/     # 메인↔렌더러 공유 타입 + zod 스키마
├── docs/                # spec-kit 6종 + 가이드
├── SETUP.md             # macOS Monterey 설치 가이드
└── CLAUDE.md            # Claude Code 자동 컨텍스트
```

## 문서 (`docs/` 안)

핵심 5종 (spec-kit):
- [`constitution.md`](./docs/constitution.md) — 핵심 원칙 / 비협상 규칙
- [`specify.md`](./docs/specify.md) — 무엇을 만드는가
- [`plan.md`](./docs/plan.md) — 어떻게
- [`tasks.md`](./docs/tasks.md) — 작업 분해
- [`implement.md`](./docs/implement.md) — 코드 패턴

추가:
- [`decisions.md`](./docs/decisions.md) — ADR 5건
- [`ENVIRONMENT.md`](./docs/ENVIRONMENT.md) — **Intel 16GB Monterey 환경별 가이드**
- [`CLAUDE-USAGE.md`](./docs/CLAUDE-USAGE.md) — Claude Code 사용법

## 라이선스

(개인 프로젝트, 추후 확정)
