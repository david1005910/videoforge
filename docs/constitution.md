# VideoForge — Constitution

> **목적**: macOS(Apple Silicon + Intel) 네이티브 AI 영상 제작 스튜디오. EasyVideo(Windows/Electron)의 기능적 동등물을 클린룸 구현으로 재작성.
>
> 이 문서는 모든 설계 결정의 최종 심판자다. specify / plan / tasks / implement 가 이 문서와 충돌하면 이 문서가 이긴다.

---

## 1. Mission

크리에이터가 다음 작업을 한 앱 안에서 끝낼 수 있어야 한다:

1. AI 영상 생성기(Grok Imagine) · AI 이미지 생성기(Google Whisk / ImageFX)에 **웹 자동화로 작업을 배치 위임**
2. 멀티 프로바이더 TTS로 **여러 나레이션 보이스를 즉시 합성**
3. STT + Forced Alignment로 **타이밍이 정확한 ASS 자막을 자동 생성**
4. ffmpeg 기반 **영상 컴포지션·이펙트·내보내기**
5. **프로젝트 단위 저장**으로 작업물을 영구 보관 / 재편집

그 외 곁가지 기능(폰트 라이브러리, SFX, AI 챗 보조 등)은 1~5의 효율을 높이는 도구다.

---

## 2. Core Principles

### 2.1 Spec-First, Single Source of Truth
- 모든 기능은 `specify.md`에 명세된 IPC API 한 줄로 환원되어야 한다.
- 코드가 specify와 어긋나면 코드를 고친다 (또는 specify를 PR로 갱신).
- preload.js의 `contextBridge.exposeInMainWorld('electronAPI', ...)` 가 곧 specify의 거울이다.

### 2.2 TypeScript Everywhere
- 메인 / 프리로드 / 렌더러 / 워커 전부 TypeScript.
- IPC 채널은 **타입 공유 패키지**(`@videoforge/shared`)에 정의 → 채널명/페이로드 오타 컴파일 타임 차단.
- `any`는 코드 리뷰에서 막는다 (정말 필요하면 `unknown` + 가드).

### 2.3 Process Boundary = Capability Boundary
- **Renderer는 OS 자원에 직접 접근하지 않는다.** ffmpeg, fs, puppeteer, keychain 모두 메인 프로세스 IPC 경유.
- 무거운 작업(인코딩, 자동화, 추론)은 **메인 프로세스의 worker_threads / child_process** 로 분리하여 UI 멈춤 금지.
- `nodeIntegration: false`, `contextIsolation: true`, `sandbox: true` 는 비협상.

### 2.4 macOS-Native Feel
- **개발 환경**: Intel x64 16GB Monterey 노트북 (`docs/ENVIRONMENT.md` 참조)
- **배포**: Universal2 binary (CI에서). 로컬은 x64 only.
- Hardened Runtime + Notarization (Apple Developer ID 필요).
- 자격증명은 **macOS Keychain** (`safeStorage`).
- 메뉴바, 트래픽 라이트, 풀스크린, 네이티브 스크롤바, 드래그 윈도우 영역(`-webkit-app-region`) 정상 동작.
- Microphone / Camera / Files & Folders 권한 Info.plist에 명시.

### 2.5 Local-First, Cloud-Optional
- 프로젝트 파일은 **사용자 디스크의 휴대 가능한 JSON + 에셋 폴더**.
- 클라우드 동기화 / 라이선스 서버 / 텔레메트리는 **모두 옵트인 Phase 3 기능**.
- 인터넷 끊긴 상태에서도 편집·렌더링·파일 작업은 100% 동작해야 한다.

### 2.6 Web Automation Is First-Class
- Grok Imagine / Whisk / ImageFX의 공식 API가 없는 한, **Puppeteer 브릿지가 정식 통합 방식**이다.
- Stealth 플러그인은 사용하되 ToS 위반 회피 목적으로만 — 캡차 우회·결제 우회·Rate-limit 회피 금지.
- 자동화 코드는 **사용자가 직접 그 사이트에 로그인**한 동일 브라우저 컨텍스트를 사용 (자격증명 가로채기 금지).

### 2.7 Reproducibility
- 모든 빌드는 lockfile + 고정된 ffmpeg 바이너리 버전 + 고정된 Electron 버전.
- 개발자가 다른 Mac에서 `pnpm install && pnpm dev` 한 번으로 동일 결과.
- CI는 GitHub Actions의 `macos-14`(arm64) + `macos-13`(x64) 매트릭스.

### 2.8 Observability
- 모든 IPC 호출은 구조화 로그(JSON Lines)에 기록 (개발 모드: stdout, 프로덕션: `~/Library/Logs/VideoForge/*.jsonl`).
- ffmpeg / puppeteer 의 stderr 는 그대로 보존(잘라내지 않음).
- 사용자가 "오류 리포트 모으기" 메뉴로 30초 내에 zip 패키지를 만들 수 있어야 한다.

---

## 3. Non-Negotiables

| # | 규칙 | 위반 시 |
|---|------|--------|
| N1 | **배포용** Universal2 binary (arm64 + x64) — CI에서 빌드. **로컬 빌드는 x64 단일** (Intel 16GB Monterey 환경) | M1 사용자 호환은 CI가 보장 |
| N2 | Hardened Runtime + Notarization (CI에서) | Gatekeeper 차단 = 사용자 못 씀 |
| N3 | 자격증명은 Keychain만 | 평문 저장 = 즉시 reject |
| N4 | bytenode / 코드 난독화 금지 (v1) | 디버깅·유지보수 비용 폭증 |
| N5 | Renderer에서 `require('fs')` 등 직접 접근 금지 | 보안 + 멀티 윈도우 일관성 깨짐 |
| N6 | IPC 페이로드 1MB 초과 금지 (큰 데이터는 파일 경로로 전달) | 메인 ↔ 렌더러 직렬화 비용 폭주 |
| N7 | 사용자 데이터는 로컬 우선, 외부 전송은 옵트인 + 명시 동의 | 신뢰 = 채널의 생명 |
| N8 | 외부 사이트(Grok·Whisk·OpenAI·Microsoft) ToS 준수 | 계정 정지 + 법적 리스크 |
| N9 | 모든 ffmpeg 명령은 사용자에게 보여줄 수 있는 형태로 로깅 | 디버깅 가능성 = 신뢰 |
| N10 | 프로젝트 파일 포맷은 SemVer + 마이그레이션 함수 필수 | 사용자가 v1.0 프로젝트를 v2.x에서 못 열면 신뢰 0 |

---

## 4. Architecture Pillars

```
┌──────────────────────────────────────────────────────────────┐
│  Renderer (React + Vite + Tailwind + shadcn/ui + Zustand)    │
│  ─ OS 자원 0 접근. window.electronAPI.* 만 호출.              │
└────────────────────────┬─────────────────────────────────────┘
                         │ contextBridge / preload.ts (zod 검증)
┌────────────────────────▼─────────────────────────────────────┐
│  Main Process (TypeScript)                                    │
│  ─ ipc-router → service 레이어로 디스패치                      │
│  ─ 모든 OS-bound 작업의 단일 게이트웨이                        │
└──┬───────────┬───────────┬───────────┬───────────┬───────────┘
   │           │           │           │           │
   ▼           ▼           ▼           ▼           ▼
┌──────┐  ┌────────┐  ┌────────┐  ┌────────┐  ┌──────────┐
│ FFmpeg│  │ Puppeteer│ │  TTS  │  │  STT   │  │ Project  │
│ Worker│  │  Worker  │ │ Worker │  │ Worker │  │ Storage  │
└──────┘  └────────┘  └────────┘  └────────┘  └──────────┘
```

- 각 Worker는 **child_process 또는 worker_threads**.
- 메인은 라우터 + 큐 매니저 + 윈도우 매니저 역할만.
- 워커끼리는 직접 통신하지 않는다 (메인 경유).

---

## 5. Definition of Done

기능 단위가 `done` 되려면:

1. specify.md의 IPC 항목 + 페이로드 스키마(zod)가 갱신되었다.
2. 메인 측 service + 워커가 구현되었다.
3. 렌더러 UI가 결과를 보여준다.
4. **macOS arm64 + x64 두 빌드에서 수동 smoke test** 통과.
5. 에러 케이스가 사용자에게 한국어 메시지로 노출된다(스택 트레이스만 X).
6. 로그가 `~/Library/Logs/VideoForge/*.jsonl` 에 남는다.

---

## 6. Out of Scope (v1)

다음은 의도적으로 제외:

- Windows / Linux 빌드 (macOS만)
- 모바일 컴패니언 앱 (단, "remote-listener" IPC 자리는 Phase 4 예약)
- 협업·실시간 공동편집
- 멀티 유저 / 권한 관리
- 자체 AI 모델 호스팅 (모두 외부 API/웹 자동화)
- bytenode·DRM·ESET 같은 무거운 보호

---

## 7. Glossary

- **HBAS**: 사용자가 운영하는 Hebrew Bible Animation Studio YouTube 채널. 본 앱의 1차 사용처.
- **ASS**: Advanced SubStation Alpha 자막 포맷. libass-wasm 으로 렌더.
- **Forced Alignment**: 텍스트 + 음성 → 단어별 타임코드.
- **Whisk**: Google Labs 이미지 생성기 (subject/scene/style 이미지 입력).
- **ImageFX**: Google Labs 이미지 생성기 (텍스트 프롬프트 중심).
- **Grok Imagine**: xAI의 이미지/영상 생성기.
- **Bridge**: VideoForge ↔ 외부 웹 사이트(Puppeteer 컨트롤되는 Chromium) 사이의 자동화 채널.

---

## 8. Amendment Process

이 헌장은 **PR로만 수정 가능**. 변경 시:

1. PR description에 `왜 바꾸는가 / 어떤 N-rule 을 약화하는가 / 대안은 검토했는가` 3섹션 필수.
2. 다른 4종 spec 문서(specify·plan·tasks·implement) 동시 갱신.
3. CHANGELOG.md 의 `## Constitution Changes` 섹션에 기록.

> 이 5종 문서가 일관되지 않으면 어떤 코드도 머지하지 않는다.
