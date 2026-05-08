# VideoForge — Tasks

> 이 문서는 **작업 단위 분해**다. 각 태스크는 2~16시간 단위로 쪼개졌고, 의존성과 추정 시간이 명시.
> 한 사람 풀타임 기준 약 8~10주, 사이드 프로젝트(주 15~20시간) 기준 4~5개월.

---

## 0. 추정 단위
- `S` (Small): ≤4h
- `M` (Medium): 4~8h
- `L` (Large): 8~16h
- `XL`: >16h → 더 잘게 쪼개야 함 (이 문서에는 등장 X)

---

## Phase 0 — Bootstrap (1주)

목표: `pnpm dev` 한 번에 빈 Electron 창이 뜨고 IPC가 동작.

| ID | 작업 | 추정 | 의존 |
|---|---|---|---|
| B-01 | 모노레포 초기화 (pnpm + workspaces + tsconfig 베이스) | M | — |
| B-02 | electron-vite + React + Tailwind + shadcn/ui 셋업 | M | B-01 |
| B-03 | TypeScript 베이스 (strict, paths) | S | B-01 |
| B-04 | ESLint + Prettier + Husky + lint-staged | S | B-01 |
| B-05 | `packages/shared` 초기 (ipc-channels.ts 빈 enum, zod 베이스) | S | B-01 |
| B-06 | preload.ts + contextBridge 골격 | M | B-05 |
| B-07 | ipc-router.ts 골격 (타입 안전 핸들러 등록 헬퍼) | M | B-05 |
| B-08 | `app:ping` 1개 채널 round-trip 동작 (smoke) | S | B-06, B-07 |
| B-09 | pino 로거 + JSONL 트랜스포트 | M | — |
| B-10 | Vitest 베이스 + 첫 단위 테스트 | S | B-01 |
| B-11 | Playwright Electron E2E 베이스 + 첫 시나리오 (앱 시작) | M | B-02 |
| B-12 | GitHub Actions: lint + typecheck + test 매트릭스 | M | B-04, B-10 |

**Phase 0 총 추정**: 약 30h ≈ 1주 풀타임 / 2주 사이드.

---

## Phase 1 — Project Skeleton + Core IO (2주)

목표: 빈 프로젝트 만들고 저장/로드, 파일 시스템 IPC 동작.

| ID | 작업 | 추정 | 의존 |
|---|---|---|---|
| P1-01 | Project / Scene / AssetRef 도메인 타입 (`packages/shared/domain`) | M | B-05 |
| P1-02 | Project zod 스키마 + 마이그레이션 함수 자리 | M | P1-01 |
| P1-03 | ProjectStorage 서비스 (save/load/list/delete) — fs-extra | L | P1-02 |
| P1-04 | IPC: `project:save`, `project:load`, `project:list`, `project:delete` | M | P1-03 |
| P1-05 | 프로젝트 목록 화면 (Renderer) | M | P1-04 |
| P1-06 | 새 프로젝트 위저드 (제목/언어/해상도) | M | P1-04 |
| P1-07 | Editor 셸 (TanStack Router routes/editor) | L | P1-05 |
| P1-08 | IPC: `dialog:selectFolder`, `file:saveToDisk`, `file:readBase64` | M | B-08 |
| P1-09 | IPC: `shell:openExternal`, `clipboard:write` | S | B-08 |
| P1-10 | Settings 영구 저장 (preferences.json) | M | P1-03 |
| P1-11 | macOS 네이티브 메뉴바 (File / Edit / Window / Help) | M | B-08 |
| P1-12 | 멀티 윈도우 매니저 + `window:openNew` / `window:count` | L | B-08 |
| P1-13 | Zustand stores: app, project, ui | M | P1-07 |
| P1-14 | 다크 / 라이트 모드 (system 추종) | S | P1-07 |
| P1-15 | i18n 베이스 (ko/en) | M | B-02 |
| P1-16 | E2E: 새 프로젝트 → 저장 → 닫기 → 다시 열기 | M | P1-06 |

**Phase 1 총 추정**: 약 60h ≈ 2주 풀타임.

---

## Phase 2 — TTS (1주)

목표: 3개 프로바이더로 wav 파일 생성, UI에서 미리듣기.

| ID | 작업 | 추정 | 의존 |
|---|---|---|---|
| P2-01 | TtsRequest zod 스키마 | S | B-05 |
| P2-02 | EdgeTTS 클라이언트 (`node-edge-tts` 래퍼) | M | P2-01 |
| P2-03 | Google TTS REST 클라이언트 | M | P2-01 |
| P2-04 | Gemini TTS 클라이언트 (`@google/generative-ai`) | M | P2-01 |
| P2-05 | TTS 캐시 (text+voice+speed 해시 → wav) | M | P2-02 |
| P2-06 | IPC: `tts:edge`, `tts:google`, `tts:gemini`, `tts:onProgress` | M | P2-02..04 |
| P2-07 | Keychain 통한 API key 저장 (safeStorage) | M | — |
| P2-08 | TTS 화면 (보이스 선택, 텍스트 입력, 미리듣기, 저장) | L | P2-06 |
| P2-09 | wavesurfer.js 통합 (파형 표시) | M | P2-08 |
| P2-10 | 보이스 카탈로그 (Edge TTS 한·영·중·일·히 정리) | S | — |
| P2-11 | 단위 테스트: cache hit/miss, 에러 분기 | M | P2-05 |
| P2-12 | E2E: 텍스트 → wav 생성 + duration > 0 | M | P2-08 |

**Phase 2 총 추정**: 약 30h.

---

## Phase 3 — STT + Subtitle (1.5주)

목표: 오디오 → 텍스트 → 정렬 → ASS 자막.

| ID | 작업 | 추정 | 의존 |
|---|---|---|---|
| P3-01 | STT 추상 인터페이스 (provider 무관) | S | — |
| P3-02 | OpenAI Whisper API 클라이언트 (multipart upload) | M | P3-01 |
| P3-03 | Gemini STT 클라이언트 (대안) | M | P3-01 |
| P3-04 | `@bbc/stt-align-node` 래퍼 + 한국어 normalise tweak | M | P3-01 |
| P3-05 | IPC: `stt:transcribe`, `stt:align`, `stt:onProgress` | M | P3-02, P3-04 |
| P3-06 | `packages/ass-generator`: words → ASS 변환 | L | P3-04 |
| P3-07 | ASS 스타일 프리셋 (HBAS 톤, 일반 유튜브 톤) | M | P3-06 |
| P3-08 | libass-wasm 렌더러 컴포넌트 (자막 미리보기) | L | P3-06 |
| P3-09 | 자막 편집 UI (단어 단위 타임 조정) | L | P3-08 |
| P3-10 | 다국어 자막 (히브리어 RTL 포함) | M | P3-08 |
| P3-11 | E2E: 5분 오디오 → segments → ASS → libass 렌더 | M | P3-09 |

**Phase 3 총 추정**: 약 50h.

---

## Phase 4 — FFmpeg Pipeline (2주)

목표: 영상 편집 파이프라인 한 호출에 끝, 진행률/취소 동작.

| ID | 작업 | 추정 | 의존 |
|---|---|---|---|
| P4-01 | `packages/ffmpeg-pipeline`: PipelineStep enum + builder | M | B-05 |
| P4-02 | concat / subtitleBurn / audioMix / kenBurns 컴파일러 | L | P4-01 |
| P4-03 | effect (fade/blur/zoom) 컴파일러 | M | P4-01 |
| P4-04 | export step (h264/h265/prores 옵션) | M | P4-01 |
| P4-05 | ffmpeg-static 경로 분기 (darwin arm64/x64) | S | — |
| P4-06 | ffmpeg-runner.ts: child_process spawn + progress parsing | L | P4-05 |
| P4-07 | 진행률 throttle (P95 100ms) + UI 푸시 | M | P4-06 |
| P4-08 | 취소: SIGTERM → SIGKILL + 임시파일 cleanup | M | P4-06 |
| P4-09 | IPC: `video:edit`, `video:onProgress`, `video:cancel` | M | P4-06 |
| P4-10 | IPC: `video:frames:extract`, `video:frames:last` | M | P4-06 |
| P4-11 | IPC: `audio:merge`, `audio:mergeMulti`, `audio:saveExternal` | M | P4-06 |
| P4-12 | IPC: `video:saveTo`, `video:subtitleScreenshot` | M | P4-06 |
| P4-13 | Timeline UI (씬 드래그&드롭, ruler, 줌) | L | P4-09 |
| P4-14 | Inspector 패널 (선택된 클립 속성) | M | P4-13 |
| P4-15 | Export 다이얼로그 (해상도/코덱/비트레이트) | M | P4-04 |
| P4-16 | Visual regression: 자막 burn ssim > 0.95 | M | P4-09 |
| P4-17 | E2E: 3 클립 + 자막 + BGM → mp4 | M | P4-15 |

**Phase 4 총 추정**: 약 80h ≈ 2~3주.

---

## Phase 5 — Asset Library (3일)

| ID | 작업 | 추정 | 의존 |
|---|---|---|---|
| P5-01 | `assets:fonts:upload/list/delete` IPC + 시스템 폰트 통합 리스트 | M | B-08 |
| P5-02 | ffmpeg `fontsdir=` 경로 정확히 전달 검증 | S | P5-01 |
| P5-03 | `assets:sfx:upload/list/delete` IPC + 카테고리 휴리스틱 | M | B-08 |
| P5-04 | 폰트/SFX 라이브러리 UI | M | P5-01 |
| P5-05 | 기본 한국어 폰트 (Noto Sans KR) 동봉 검토 | S | — |

**Phase 5 총 추정**: 약 16h.

---

## Phase 6 — Web Automation: Grok (2주)

목표: Puppeteer로 Grok에 로그인, 단일/배치 영상 생성, 진행률 추적.

| ID | 작업 | 추정 | 의존 |
|---|---|---|---|
| P6-01 | `packages/automation-core`: BrowserPool + 라이프사이클 | L | — |
| P6-02 | Stealth 플러그인 통합 + Chromium 버전 핀 | M | P6-01 |
| P6-03 | Selector 추상화 (data-testid 우선 + fallback) | M | P6-01 |
| P6-04 | 자동 스크린샷 on fail (`automation-failures/`) | M | P6-01 |
| P6-05 | grok/login.ts: 사용자 직접 로그인 + 쿠키 저장 | L | P6-01 |
| P6-06 | grok/generate.ts: 텍스트→영상, 이미지→영상 | L | P6-05 |
| P6-07 | 다운로드 자동 (페이지 → 로컬 + sha1) | M | P6-06 |
| P6-08 | Batch 큐 (직렬 + 재시도 정책) | L | P6-06 |
| P6-09 | IPC: `grok:login/generate/cancel/close/status` | M | P6-06 |
| P6-10 | IPC: `grok:batch`, `grok:onProgress`, `grok:onVideoReady` | M | P6-08 |
| P6-11 | Grok 화면 (프롬프트 입력, 큐 가시화, 결과 갤러리) | L | P6-09 |
| P6-12 | 모킹 서버 (express + 가짜 Grok HTML) | M | — |
| P6-13 | E2E (모킹): batch 3 → 모두 100% 완료 | M | P6-10, P6-12 |

**Phase 6 총 추정**: 약 70h.

---

## Phase 7 — Web Automation: Whisk + ImageFX (1주)

| ID | 작업 | 추정 | 의존 |
|---|---|---|---|
| P7-01 | whisk/login.ts (Google 로그인 우회 X — 사용자 직접) | M | P6-01 |
| P7-02 | whisk/upload-ref.ts (subject/scene/style 업로드) | L | P7-01 |
| P7-03 | whisk/generate.ts | L | P7-02 |
| P7-04 | imagefx/login.ts + generate.ts | L | P6-01 |
| P7-05 | EXIF UserComment에 prompt 기록 (sharp) | M | — |
| P7-06 | IPC: whisk + imagefx 채널 일체 | M | P7-03, P7-04 |
| P7-07 | Whisk/ImageFX 통합 화면 | L | P7-06 |
| P7-08 | 모킹 서버 + E2E | M | P7-06 |

**Phase 7 총 추정**: 약 45h.

---

## Phase 8 — AI Chat Assistants (1주)

| ID | 작업 | 추정 | 의존 |
|---|---|---|---|
| P8-01 | Gemini 클라이언트 공통 (스트리밍 지원) | M | — |
| P8-02 | Knowledge 파일 로더 (수정 가능 마크다운) | M | — |
| P8-03 | csChat / dnaScriptChat / thumbnailAnalyze 서비스 | L | P8-01, P8-02 |
| P8-04 | 챗 히스토리 저장 (프로젝트별) | M | P1-03 |
| P8-05 | IPC: `chat:cs/csClear/dna/dnaClear/thumbnail` | M | P8-03 |
| P8-06 | 챗 UI (마크다운 렌더, 코드블록 복사) | L | P8-05 |
| P8-07 | 썸네일 분석 결과 시각화 (점수, 제안) | M | P8-05 |
| P8-08 | E2E (모킹): 챗 1라운드 + 클리어 | M | P8-05 |

**Phase 8 총 추정**: 약 35h.

---

## Phase 9 — macOS Polish (1주)

> Intel 16GB Monterey 환경: DMG 빌드는 CI 위임. 로컬에서는 x64 dev 빌드만.

| ID | 작업 | 추정 | 의존 |
|---|---|---|---|
| P9-01 | 앱 아이콘 (icns) + 시그니처 | M | — |
| P9-02 | electron-builder.yml 검증 (이미 x64-default 적용됨) + universal.yml 점검 | S | — |
| P9-03 | entitlements.mac.plist + Info.plist 키 (마이크 등) | S | — |
| P9-04 | Apple Developer ID 발급 + GitHub Secrets 등록 | M | — |
| P9-05 | CI workflow에 Notarization 활성화 (현재 주석 처리됨) | L | P9-04 |
| P9-06 | About 화면, 메뉴 단축키, 트래픽 라이트 위치 미세조정 | M | — |
| P9-07 | 풀스크린 모드 + 멀티 모니터 테스트 | M | — |
| P9-08 | 접근성 (키보드 네비, ARIA, 폰트 크기 토글) | L | — |
| P9-09 | 첫 실행 온보딩 (API key 설정 가이드) | M | — |
| P9-10 | "오류 리포트 zip" 메뉴 | M | — |

**Phase 9 총 추정**: 약 40h.

> ⚠️ **로컬에서 universal2 빌드 시도 금지**. `pnpm dist:mac:universal` 은 CI에서만.

---

## Phase 10 — Update System + Release (3일)

| ID | 작업 | 추정 | 의존 |
|---|---|---|---|
| P10-01 | electron-updater 통합 (GitHub Releases provider) | L | P9-05 |
| P10-02 | IPC: `update:on/download/install/status/recheck` | M | P10-01 |
| P10-03 | 설정에서 자동 업데이트 옵트인 토글 | S | P10-02 |
| P10-04 | release-please / changesets 자동 PR | M | — |
| P10-05 | CI: notarized DMG 업로드 + Sparkle 호환 RSS | M | P9-05 |

**Phase 10 총 추정**: 약 16h.

---

## Phase 11 — 안정화 / 베타 (2주)

| ID | 작업 | 추정 | 의존 |
|---|---|---|---|
| P11-01 | 베타 5명 모집 (HBAS 동료 + 유튜버) | — | — |
| P11-02 | 발견된 버그 일괄 수정 (16h 예약) | XL | — |
| P11-03 | 성능 회귀 측정 + 예산 위반 항목 수정 | L | — |
| P11-04 | 한국어 UX 카피 재검토 | M | — |
| P11-05 | 사용자 매뉴얼 (마크다운 + 스크린샷) | L | — |
| P11-06 | 1.0.0 릴리스 | M | All |

**Phase 11 총 추정**: 약 40h + 베타 피드백 반영분.

---

## Phase 12 — Future (자리 예약)

다음은 v1.1+ 후보로만 등록.

- Local Whisper (whisper.cpp universal2 빌드).
- Bridge 익스텐션 (사용자 자체 Chrome 사용).
- Mobile companion (`remote:*` IPC 활용, React Native).
- Cloud 동기화 (Supabase 옵트인).
- 자체 Veo / Sora 통합 (공식 API 출시 시).
- 협업 / 공유 라이브러리.

---

## 의존성 다이어그램 (요약)

```
Phase 0 → 1 → 2 → 3
              ↓    ↓
              4 ←──┘   (ffmpeg는 STT/자막 결과 소비)
              ↓
              5
              ↓
              6 → 7
              ↓
              8
              ↓
              9 → 10 → 11
```

Phase 6/7/8은 4 이후라면 병렬 가능. 단 사람이 1명이면 순차.

---

## 총합 추정 (Intel 16GB Monterey 기준)

| 단계 | 추정 (Intel x64) |
|---|---|
| Bootstrap | 30h |
| Project Skeleton | 60h |
| TTS | 30h |
| STT + Subtitle | 50h |
| FFmpeg Pipeline | 80h |
| Asset Library | 16h |
| Grok Automation | 70h |
| Whisk + ImageFX | 45h |
| AI Chat | 35h |
| macOS Polish | 40h |
| Update + Release | 16h |
| Stabilization | 40h+ |
| **합계** | **~512h ≈ 13주 풀타임 / 6~7개월 사이드 (주 18h)** |

> Intel 환경에서 빌드/인코딩 시간이 길어지는 만큼 위 추정은 약 5~10% 여유를 포함.
> Apple Silicon 16GB 머신에서는 약 1.3배 빠르게 진행 가능.

---

## 우선순위 시나리오

### "빠른 MVP" 시나리오 (Phase 0-4 + 6 only)
HBAS 한 편을 자동화로 만들 수 있는 최소 셋. 약 8주 풀타임.

### "1.0 풀 셋" 시나리오 (Phase 0-11)
모든 P0-P2 기능 + macOS 정식 배포. 약 13주 풀타임.

### "개인 사용 셋" 시나리오 (Phase 0-7, 코드사이닝/자동업데이트 생략)
Phase 9·10 생략, Phase 11 단축. 약 9~10주.

---

## 다음 액션 (작업 시작 시점)

1. Phase 0의 B-01 부터 순서대로.
2. 각 Phase 완료 시 `implement.md`의 코드 패턴과 대조.
3. PR 머지 시 `tasks.md`에 [x] 체크 + 실제 소요 시간 기록 → 다음 추정 보정.
