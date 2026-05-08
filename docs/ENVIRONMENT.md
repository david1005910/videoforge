# Environment — Intel 16GB Monterey Notebook

> 이 프로젝트는 다음 환경을 1순위로 가정한다. 다른 환경은 부차적.
>
> **CPU**: Intel x86_64 (Ivy Bridge 이상)
> **RAM**: 16 GB
> **OS**: macOS Monterey 12.x
> **Form**: Notebook (열·배터리 제약)

이 문서는 그 환경에서 발생하는 모든 결정과 트레이드오프를 모은다. 다른 spec 문서가 이 문서와 충돌하면 **이 문서가 우선**한다 (Intel/Monterey 한정).

---

## 1. macOS Monterey 호환 매트릭스

VideoForge가 의존하는 도구들의 Monterey 호환 상태:

| 항목 | 요구 OS | Monterey 12 | 비고 |
|---|---|---|---|
| Electron 33 LTS | ≥ 11.0 | ✅ | 정상 동작 |
| Node 20 LTS | ≥ 10.15 | ✅ | nvm으로 설치 |
| pnpm 9 | OS-agnostic | ✅ | corepack 내장 |
| ffmpeg-static | ≥ 10.13 | ✅ | x64 darwin 바이너리 동봉 |
| sharp | ≥ 10.13 | ✅ | x64 prebuilt 사용 |
| puppeteer-core | Chromium에 따름 | ⚠️ | 최신 버전 일부 크래시 — **버전 핀 필수** |
| libass-wasm | OS-agnostic | ✅ | WASM, OS 무관 |
| @bbc/stt-align-node | OS-agnostic | ✅ | 순수 JS |
| Xcode CLT | Monterey 호환 | ✅ | `xcode-select --install` |
| Apple notarytool | ≥ 11.3 | ✅ | Xcode 13+ 동봉 |
| Hardened Runtime | ≥ 10.15 | ✅ | — |
| Code Signing (Developer ID) | OS-agnostic | ✅ | Apple Developer Program 필요 ($99/년) |

> Electron 34+는 macOS 12+를 요구합니다. Monterey 12.x 이면 Electron 34도 가능하지만 **이 프로젝트는 33 LTS에 핀**하여 안정성 우선.

---

## 2. Hardware Constraints (Intel 16GB)

### 2.1 메모리 분포 (예상)

VideoForge dev 모드 가동 시:

| 항목 | 메모리 |
|---|---|
| macOS Monterey 베이스라인 | ~3.0 GB |
| Chrome (탭 10~15) | ~1.5 GB |
| VS Code | ~700 MB |
| `pnpm dev` 본체 (Electron + Vite + watcher) | ~1.2 GB |
| Claude Code CLI | ~250 MB |
| **상시 합계** | **~6.7 GB** |
| 여유 | **~9.3 GB** |

여유 9GB가 있어서:
- Phase 4 ffmpeg 동시 인코딩 1~2개 OK
- Phase 6 Puppeteer Chromium (~700MB) 동시 실행 OK
- 빌드 산출물·테스트 동시 실행 OK

### 2.2 CPU/Thermal

Intel 노트북은 sustained load에서 thermal throttling이 강합니다.

- **연속 5분 이상** ffmpeg 인코딩 → CPU 클럭 50% 하락 가능
- **Puppeteer + ffmpeg 동시 실행** → 팬 풀가동 + 발열
- **Universal2 빌드** → x64 + arm64 동시 컴파일로 30분 이상 풀로드 → **금지** (CI로)

대응:
- 인코딩 중에는 다른 빌드 작업 동시에 시작하지 않기
- 노트북 받침대로 통풍 확보 (특히 여름)
- 큐 매니저 `maxConcurrent = 1` 강제 (`constitution.md` N6)

### 2.3 배터리

- `pnpm dev` 가동 중: 배터리 2~3시간
- 빌드 1회: 약 5~8% 소모
- ffmpeg 인코딩 1회 (5분 영상): 약 3~5% 소모

권장: **상시 어댑터 연결**. 배터리 모드는 thermal throttling이 더 심해 빌드 시간이 1.5~2배 길어집니다.

### 2.4 AVX/AVX2

- Ivy Bridge: AVX 지원, **AVX2 미지원**
- Haswell 이후: AVX2 지원
- 확인:
  ```bash
  sysctl -n machdep.cpu.features | tr ' ' '\n' | grep -E "AVX|FMA"
  ```

VideoForge Phase 1~11 의존성 중 **AVX2 필수인 것은 없습니다**. Phase 12+의 whisper.cpp 로컬 모드만 영향받음 (SSE fallback으로 동작은 하지만 매우 느림).

---

## 3. 빌드 전략 — 로컬 vs CI

### 3.1 빌드 매트릭스

| 빌드 종류 | 어디서 | 명령어 | 시간 (Intel 16GB Monterey) | 산출물 |
|---|---|---|---|---|
| Dev 빌드 | 로컬 | `pnpm build` | 2~3분 | `out/` 디렉토리 |
| 로컬 DMG | 로컬 | `pnpm dist:mac:local` | 8~12분 | x64 DMG + ZIP |
| Universal DMG | **CI 전용** | (GitHub Actions) | 25~40분 | universal2 DMG (배포용) |
| Notarized DMG | CI 전용 | (자동) | +10분 | Apple 인증된 DMG |

### 3.2 로컬은 x64만

`apps/desktop/electron-builder.yml` 의 기본 설정이 **x64 단일 아키**로 잡혀 있습니다:

```yaml
mac:
  target:
    - target: dmg
      arch: [x64]
    - target: zip
      arch: [x64]
```

universal2가 필요하면 `--config electron-builder.universal.yml` 플래그로 명시.

### 3.3 CI에서 universal2

`.github/workflows/ci.yml`:
- **Test job**: macos-13 (Intel x64) 만 — 사용자와 동일 환경에서 검증
- **Distribution job**: macos-14 (M1) — universal2 빌드 + Notarization. main 브랜치 push 시 자동.

→ 사용자께서 universal2를 한 번도 로컬에서 만들 일이 없음.

### 3.4 Notarization on Monterey

Monterey 12.x는 `notarytool` 을 지원하므로 로컬에서도 가능합니다. 다만 권장하지 않습니다:

- Apple ID + app-specific password를 macOS Keychain에 영구 저장해야 함
- 첫 시도 실패 시 디버깅이 macOS 버전 의존적
- CI가 더 깔끔 (시크릿은 GitHub repo settings에)

Phase 9 진입 시 CI에 시크릿 등록만 하면 자동화됩니다 (`.github/workflows/ci.yml` 내 주석 처리된 부분 활성화).

---

## 4. Tech Stack — Intel 16GB Monterey 핀

### 4.1 의존성 버전 핀

`package.json` 에서 캐럿(`^`) 없이 정확한 버전 사용:

| 패키지 | 버전 | 이유 |
|---|---|---|
| `electron` | `33.0.2` | macOS 11+ 호환, V8 안정 |
| `node` (engine) | `20.x LTS` | Intel x64 binary 보장 |
| `puppeteer-core` | `21.11.0` | Chromium 122 — Monterey 안정 |
| `ffmpeg-static` | `^5.3.0` | x64 darwin 바이너리 명시 |
| `ffprobe-static` | `^3.1.0` | x64 darwin 바이너리 명시 |
| `sharp` | `^0.33.5` | x64 prebuilt 사용 (libvips 동봉) |
| `electron-builder` | `25.1.8` | Monterey 호환 검증 |
| `electron-vite` | `2.3.0` | 안정 LTS |

업그레이드 정책: **Phase 11 안정화 시점에 한 번** 일괄 검토. 그 전엔 보안 패치만.

### 4.2 ffmpeg 프리셋 분리

`packages/ffmpeg-pipeline/src/compile.ts`:

```ts
const presetArgs = process.env['NODE_ENV'] === 'production'
  ? ['-preset', 'medium']         // CI / 최종 배포
  : ['-preset', 'faster'];         // Intel 로컬 개발
```

- 로컬 dev: `faster` 프리셋 → 5분 1080p 영상 인코딩 약 60초
- CI 또는 사용자 최종 인코딩: `medium` → 같은 영상 약 180초 (퀄리티 우선)

### 4.3 H.265 정책

Intel 노트북에서 H.265 (HEVC) 인코딩은 H.264 대비 2~3배 느립니다. 정책:

- **개발 / 미리보기**: H.264만
- **최종 산출 (YouTube 업로드용)**: H.264 권장. 굳이 H.265 필요하면 `pnpm dist:mac:local` 빌드 후 사용자가 별도 batch로 (밤새 인코딩 등).

### 4.4 Puppeteer 구체 셋업

`apps/desktop/electron/main/services/automation/grok/browser.ts` (Phase 6 진입 시 작성):

```ts
import puppeteer from 'puppeteer-core';
import { findChrome } from 'find-chrome-bin';

// 사용자가 이미 설치한 Chrome을 우선 사용
// puppeteer 자체 Chromium 다운로드 (200MB) 회피
const chrome = await findChrome();
const browser = await puppeteer.launch({
  executablePath: chrome.executablePath,
  // ...
});
```

→ Puppeteer가 자체 Chromium을 다운받지 않게 하여 Intel Mac의 Chromium-Monterey 호환 이슈 회피.

---

## 5. Phase별 현실 평가

| Phase | 가능 | 추정 시간 (Intel 16GB) | 비고 |
|---|---|---|---|
| 0 Bootstrap | 🟢 | 30분 | 부트스트랩 zip으로 즉시 |
| 1 Project Skeleton | 🟢 편함 | 2주 사이드 (40h) | Chrome+IDE+dev 동시 OK |
| 2 TTS | 🟢 편함 | 1주 (20h) | 네트워크 IO만 |
| 3 STT + 자막 | 🟢 편함 | 1.5주 (30h) | OpenAI API (ADR-001) |
| 4 ffmpeg Pipeline | 🟡 적정 | 3주 (60h) | faster 프리셋, 동시 1개 |
| 5 Asset Library | 🟢 편함 | 3일 (10h) | 가벼움 |
| 6 Grok Puppeteer | 🟡 적정 | 2.5주 (50h) | 별도 Google 계정 (ADR-002) |
| 7 Whisk + ImageFX | 🟡 적정 | 1.5주 (30h) | Phase 6과 동일 |
| 8 AI Chat | 🟢 편함 | 1주 (20h) | 가벼움 |
| 9 Polish + DMG | 🟠 CI 위임 | 2주 (40h) | universal2는 CI |
| 10 Update | 🟢 편함 | 3일 (10h) | — |
| 11 안정화 | 🟢 편함 | 2주 (30h) | — |
| **총합** | — | **~12주 풀타임 / 6~7개월 사이드 (주 18h)** | Apple Silicon 대비 1.3배 |
| 12+ Local Whisper | 🔴 어려움 | — | AVX2 미지원 시 매우 느림 — Cloud 유지 |

---

## 6. Working Hygiene — Notebook 특화

### 6.1 세션 시작 체크리스트

```bash
# 1) 어댑터 연결 확인
pmset -g batt | grep -i charging

# 2) 메모리 압력 점검
vm_stat | head -5

# 3) 디스크 여유 (DMG 빌드는 ~3GB 임시)
df -h /

# 4) 작업 브랜치
cd ~/Documents/HBAS-tools/videoforge
git checkout -b feat/<phase>-<task>
```

### 6.2 무거운 작업 전

- Chrome 탭 5개 이하로
- Slack / Discord / Spotify 닫기
- macOS Activity Monitor 띄우기 (Memory + CPU 두 컬럼)
- "방해 금지" 모드 ON (알림 스파이크 방지)

### 6.3 세션 마무리

```bash
# Vite watcher / Electron 좀비 프로세스 청소
pkill -f electron
pkill -f vite

# 임시 파일 정리 (월 1회)
rm -rf ~/Library/Caches/VideoForge/*
rm -rf node_modules/.vite
```

---

## 7. Apple Silicon 빌드 머신 검토 (Phase 6+ 시점)

Phase 0~5 까지는 Intel 16GB로 충분합니다. Phase 6 들어갈 즈음 한 번 자가 평가:

- 빌드 1회에 15분 이상 걸리는가
- ffmpeg 인코딩 중 다른 작업 불가능한가
- 발열·팬 소음이 작업 흐름을 끊는가
- 배터리 1~2시간 작업도 불편한가

세 개 이상 해당하면 **Mac mini M4 16GB** (약 90만원) 추가 구매 검토 추천.

활용 시나리오:
- 노트북 = 코드 작성 (이동성), Mac mini = 빌드 + ffmpeg 렌더링 (성능)
- SSH로 노트북에서 mini로 명령 보내기
- HBAS YouTube 영상 자동 생성도 mini에서 백그라운드 실행
- MusicTube Studio 등 다른 자동화 프로젝트와 공유

지금은 결정 보류. Phase 5 마무리 시점에 다시 검토.

---

## 8. 자주 나는 Monterey 특화 함정

### 8.1 첫 실행 시 "확인되지 않은 개발자" 차단
- 시스템 환경설정 → 보안 및 개인정보 보호 → "확인 없이 열기" 클릭
- 또는 우클릭 → 열기 → 확인

### 8.2 Microphone 권한 (STT 작업 시)
- 시스템 환경설정 → 보안 및 개인정보 보호 → 마이크 → VideoForge / Terminal 체크

### 8.3 keychain 다이얼로그 반복 팝업
- Keychain Access 앱에서 "VideoForge" 관련 항목 → 정보 → 액세스 제어 → "이 항목을 사용할 때 항상 허용"

### 8.4 ffmpeg 첫 실행 시 Gatekeeper 차단
- `chmod +x` 만으로는 부족. 첫 1회는:
  ```bash
  xattr -d com.apple.quarantine apps/desktop/resources/ffmpeg/darwin-x64/ffmpeg
  ```

### 8.5 Vite HMR 메모리 누수
- 1~2시간 dev 세션 후 `pnpm dev` 재시작 권장
- Intel + Monterey 조합에서 특히 두드러짐

---

## 9. 향후 환경 변경 시

이 문서는 사용자 환경이 바뀌면 갱신:
- macOS 업그레이드 → §1 호환 매트릭스 재검증
- Apple Silicon 머신 추가 → §3 빌드 전략에 새 옵션
- RAM 32GB 등으로 업그레이드 → §2.1 메모리 분포, §6 작업 위생 완화
- Phase 6 진입 → §7 추가 머신 검토 결과 기록
