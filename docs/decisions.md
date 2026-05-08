# VideoForge — Architectural Decisions

> `plan.md` 섹션 14의 4가지 미해결 결정사항에 대한 비교 분석 + 권고.
> 각 항목은 ADR (Architectural Decision Record) 형식: 컨텍스트 → 옵션 → 트레이드오프 → 권고 → 변경 비용.

---

## ADR-001: STT 프로바이더 — Cloud(OpenAI) vs Local(whisper.cpp)

### 컨텍스트
HBAS 채널은 **한국어 자막 정확도가 retention KPI에 직결**된다 (장기 메모리: "viewers dropping off in the first 30 seconds"). 잘못된 자막은 채널 신뢰도를 떨어뜨린다.

VideoForge는 두 가지 STT 경로 중 하나(또는 둘 다)를 선택해야 한다.

### 옵션

#### Option A: OpenAI Whisper API (Cloud)
- 엔드포인트: `https://api.openai.com/v1/audio/transcriptions`
- 모델: `whisper-1` (현재) / `gpt-4o-transcribe` (신형)
- 사용자: API 키 발급 → Keychain 저장.

#### Option B: whisper.cpp (Local)
- C++ 포트, GGML/GGUF 양자화 모델.
- Apple Silicon Core ML 가속 지원 (large-v3 모델 + Metal).
- 모델 다운로드 (large-v3-turbo q5: ~1.5GB).
- Node.js 바인딩: `nodejs-whisper`, `smart-whisper`, 또는 직접 child_process.

#### Option C: 하이브리드 (둘 다 제공, 사용자 토글)
- 설정에서 "기본 STT 프로바이더" 선택.
- 무거운 작업은 cloud, 짧은 검수는 local.

### 비교 매트릭스

| 항목 | Cloud (OpenAI) | Local (whisper.cpp) |
|---|---|---|
| **한국어 정확도** | ★★★★★ (large-v3 기반, OpenAI 후처리 포함) | ★★★★☆ (large-v3 동일하지만 후처리 없음) |
| **5분 오디오 처리 시간** | 30~60초 (네트워크 + 큐 대기) | M2 Pro: 50~90초, M1 Air: 2~3분 |
| **비용** | $0.006/분 (whisper-1) ≈ 5분당 $0.03 | 첫 모델 다운 후 0원 |
| **오프라인 동작** | ❌ | ✅ |
| **개인정보** | 음성이 OpenAI로 전송 | 100% 로컬 |
| **앱 크기** | +0MB (HTTPS 클라이언트만) | +1.5GB (모델 동봉) 또는 사용자가 다운로드 |
| **첫 사용 마찰** | API 키 발급 필요 | 모델 다운 (10분~) 필요 |
| **Universal2 빌드 복잡도** | 낮음 | 높음 (arm64+x64 별도 바이너리) |
| **유지보수 부담** | 낮음 (OpenAI가 모델 개선) | 중간 (whisper.cpp 버전 추적 필요) |
| **민감 콘텐츠 (사역/종교)** | 일부 사용자 거부감 | 안심 |

### 트레이드오프

**Cloud 강점**: 정확도가 가장 높고, 코드 단순하고, 빌드 사이즈 작다. 90% 이상의 macOS 사용자가 즉시 사용 가능.

**Cloud 약점**: 비용 누적. 매일 30분 생성하면 월 약 $4.5. 인터넷 끊기면 멈춤. HBAS의 종교 콘텐츠 일부에 대해 사용자가 클라우드 전송을 꺼릴 수 있음.

**Local 강점**: 무료. 오프라인. 프라이버시. 한 번 셋업하면 무한 사용.

**Local 약점**: M1 Air에서는 5분 영상이 3분 가까이 걸림 (편집 워크플로우 흐름 끊김). 모델 관리 부담. 빌드 복잡도.

### 권고: **Option C — 하이브리드, Cloud 기본값**

이유:
1. **MVP 빠르게**: Phase 1~3에서는 Cloud만 구현 (코드 단순, 진입 장벽 ↓).
2. **사용자 선택권**: Phase 5+에서 Local 추가. 설정에서 토글.
3. **정확도 우선이 본질**: HBAS retention KPI 직결 = 정확도가 비용보다 비싸다. Cloud가 명확히 더 정확.

### 구현 단계
| Phase | 내용 |
|---|---|
| Phase 3 (P3-02) | OpenAI Whisper API 구현 — MVP |
| Phase 3 (P3-03) | Gemini STT 백업 (가격/품질 대안) |
| Phase 5+ | whisper.cpp 통합 — 사용자 옵트인 |

### 변경 비용
나중에 Local로 추가하는 비용은 **약 30~40시간** (Phase 12 항목). 지금 Local만 가는 것은 권하지 않음.

---

## ADR-002: Web Automation — Puppeteer 단독 vs Bridge 익스텐션

### 컨텍스트
Grok / Whisk / ImageFX는 공식 API가 없거나 불안정. Web 자동화가 정식 통합 채널이다 (`constitution.md` §2.6).

두 가지 통합 방식이 가능:

### 옵션

#### Option A: Puppeteer 단독
- 앱이 자체 Chromium을 다운로드/관리.
- userDataDir로 세션 격리.
- 사용자가 앱 안에서 (또는 띄워준 창에서) 직접 로그인.

#### Option B: Bridge 익스텐션 + 사용자 일반 Chrome
- 별도 Chrome 익스텐션을 사용자 브라우저에 설치.
- 익스텐션과 앱이 native messaging 또는 WebSocket으로 통신.
- 앱이 "이 페이지에서 이걸 해주세요" 명령 → 익스텐션이 사용자의 활성 탭에서 실행.

#### Option C: 둘 다 — Puppeteer 우선, Bridge는 옵션
- Puppeteer를 기본값으로.
- 안정성 문제 / 캡차 / 봇 탐지 시 Bridge로 fallback 안내.

### 비교 매트릭스

| 항목 | Puppeteer 단독 | Bridge 익스텐션 |
|---|---|---|
| **첫 사용 셋업** | 즉시 (Chromium 자동 다운) | 익스텐션 설치 + 권한 승인 필요 |
| **로그인 보존** | userDataDir에 쿠키 영구 | 사용자가 평소 쓰던 세션 그대로 |
| **봇 탐지 회피** | Stealth로 80% 우회 | 100% (실제 사용자 브라우저) |
| **사이트 UI 변경 대응** | selector 패치 필요 | 동일 (selector 의존) |
| **개발 복잡도** | 중간 | 높음 (Manifest V3 + native messaging) |
| **2FA / 캡차** | 사용자가 직접 풀어야 (창 보이게) | 자동 (사용자가 평소 풀던 대로) |
| **Google 계정 정책** | 자동화 의심 → 차단 가능 | 평소 사용 패턴이라 안전 |
| **앱 크기** | +200MB (Chromium) | +0MB |
| **유지보수** | Chromium 버전 추적 | Manifest V3 정책 추적 |
| **사용자 통제권** | 낮음 (앱이 별도 브라우저) | 높음 (자기 브라우저, 익스텐션 끄면 끝) |
| **다중 인스턴스** | 가능 (사이트별 분리) | Chrome이 1개라 한계 |

### 핵심 위험: **Google 계정 정책**

Whisk와 ImageFX는 Google 계정 인증 필수. Puppeteer로 자동화된 Chromium에 Google 로그인하면:
- 자주 reCAPTCHA 트리거.
- 계정에 "비정상 활동" 플래그 → 임시 잠김 가능.
- 최악: 계정 영구 정지 (HBAS YouTube 채널과 동일 계정이면 치명적).

**이게 Bridge 옵션을 진지하게 고려하는 이유**다.

### 권고: **Option C — Puppeteer 우선, Bridge는 Phase 12로 예약**

근거:
1. **MVP 단순함**: 익스텐션은 별도 Chrome Web Store 등록 + 사용자 설치 안내 = UX 마찰. Phase 1에서 필요 없음.
2. **Grok**은 X.com 계정 — HBAS 채널과 분리 가능, 위험 낮음.
3. **Whisk/ImageFX**는 위험. **별도 Google 계정 권장 가이드**를 사용자 매뉴얼에 명시.
4. Bridge 익스텐션은 Phase 12 후보. 사용자 피드백으로 우선순위 조정.

### 구현 가이드라인 (Puppeteer 안전 프로파일)

```ts
// packages/automation-core/src/google-account-policy.ts
// 사용자에게 보여줄 경고
export const GOOGLE_AUTOMATION_WARNING = `
⚠️ Whisk / ImageFX는 Google 계정 인증을 사용합니다.

  • HBAS YouTube 채널 계정과 동일한 Google 계정 사용 시,
    자동화 의심으로 채널이 임시 정지될 위험이 있습니다.

  • **별도 보조 Google 계정** 사용을 강력히 권장합니다.

  • 첫 로그인 시 reCAPTCHA가 표시될 수 있습니다 — 직접 풀어주세요.
`;
```

이 경고를 첫 Whisk 사용 시 다이얼로그로 띄우고, 동의해야 진행.

### 변경 비용
Phase 12에서 Bridge 추가 시 약 **40~60시간** (익스텐션 빌드 + native messaging + Chrome Web Store 등록 + 사용자 설치 가이드).

---

## ADR-003: 프로젝트 파일 위치 — 고정 vs 사용자 선택

### 컨텍스트
프로젝트 데이터(JSON + 에셋 폴더)를 어디에 둘 것인가. macOS 컨벤션과 사용자 자율성 사이 트레이드오프.

### 옵션

#### Option A: `~/Library/Application Support/VideoForge/Projects/` 고정
- macOS 표준 위치.
- 앱이 자동 관리.
- 백업/이전 어려움 (Finder에서 숨겨진 경로).

#### Option B: 사용자 지정 폴더 (예: `~/Documents/VideoForge/`)
- 첫 실행 시 위치 선택.
- 사용자가 보고/백업/iCloud Drive 동기화 가능.
- 경로 변경 시 마이그레이션 필요.

#### Option C: 프로젝트마다 임의 폴더 (Final Cut Pro 방식)
- "새 프로젝트" 시 매번 저장 위치 선택.
- 가장 자유롭지만 "프로젝트 목록" 화면이 복잡 (사용자가 어디 뒀는지 잊음).

### 비교 매트릭스

| 항목 | A 고정 | B 사용자 폴더 | C 매번 선택 |
|---|---|---|---|
| **사용자 마찰** | 0 | 첫 실행 1회 | 프로젝트마다 |
| **백업 / 이전** | 어려움 (숨김 경로) | 쉬움 | 쉬움 |
| **iCloud Drive 동기화** | 불가 (Library 동기화 X) | 가능 | 가능 |
| **외장 SSD에 두기** | 불가 | 가능 (사용자가 외장 폴더 선택) | 가능 |
| **프로젝트 목록 구현** | 단순 (한 폴더 스캔) | 단순 | 복잡 (DB 인덱스 필요) |
| **앱 삭제 시 데이터** | 함께 삭제 (실수 유발) | 보존 | 보존 |
| **에셋 용량 (수십 GB)** | Library 비대화 | OK | OK |
| **macOS 관습** | ✅ | 부분적 | ✅ (Final Cut, Logic 방식) |

### 사용자 컨텍스트 고려

Sharkey는:
- HBAS 영상을 매주 여러 편 제작 → **에셋 용량 큼**.
- 외장 SSD나 NAS 백업 가능성 있음.
- iCloud Drive 동기화 필요 가능 (다른 Mac에서 작업).

→ **B 또는 C가 더 적합**.

### 권고: **Option B 변형 — 기본은 `~/Documents/VideoForge/`, 사용자 변경 가능**

설계:
1. 첫 실행 온보딩에서 "프로젝트 보관 폴더" 묻기. 기본값: `~/Documents/VideoForge/Projects/`.
2. **설정 → 보관 위치**에서 언제든 변경. 변경 시 기존 프로젝트 마이그레이션 (이동 또는 복사).
3. **외장 SSD에 두려는 사용자**도 한 번에 가능.
4. iCloud Drive 폴더 사용 시 **경고**: 동시 편집 충돌 가능 (선택은 사용자 자유).

추가 데이터:
- **앱 메타데이터** (설정, 캐시, Puppeteer 프로필): `~/Library/Application Support/VideoForge/`. 변경 불가 (앱 내부용).
- **로그**: `~/Library/Logs/VideoForge/`. 변경 불가.

| 데이터 | 위치 | 사용자 변경 |
|---|---|---|
| 프로젝트 + 에셋 | `~/Documents/VideoForge/Projects/` (기본) | ✅ |
| 설정 / 자격증명 | `~/Library/Application Support/VideoForge/` | ❌ |
| Puppeteer 프로필 | `~/Library/Application Support/VideoForge/PuppeteerProfiles/` | ❌ |
| 로그 | `~/Library/Logs/VideoForge/` | ❌ |
| 캐시 (TTS, 썸네일) | `~/Library/Caches/VideoForge/` | ❌ |

### specify.md 갱신 필요
`specify.md` §3.1 "저장 구조" 부분을 위처럼 수정.

### 변경 비용
**낮음**. Phase 1 시점에 합의하면 30분 작업. 나중에 변경하면 마이그레이션 함수가 추가로 필요해서 4~6시간.

---

## ADR-004: Noto Sans KR 폰트 동봉

### 컨텍스트
ASS 자막 burn-in 시 ffmpeg는 시스템 폰트 또는 명시된 fontsdir의 폰트를 사용한다. macOS는 한국어 폰트가 기본 설치되어 있지만:

- **Apple SD Gothic Neo**: 화면용. 자막 burn-in에 좋지만 라이선스가 macOS 시스템에 묶여있어 다른 OS로 영상이 갈 때 fallback 깨짐.
- **Apple Color Emoji**: 이모지용. 라이선스 동일.

YouTube 영상은 **시청자의 디바이스에서 재생**되므로 burn-in된 자막은 폰트가 이미 픽셀에 박혀있다. 즉 발신자의 폰트만 중요. 하지만:

1. 영상 편집기에서 **미리보기**를 정확히 하려면 동일 폰트 필요.
2. 다른 협업자 Mac에 시스템 폰트 동일 보장 어려움.
3. **재현 가능성** (헌장 §2.7): 다른 머신에서 같은 입력 → 같은 출력 보장.

### 옵션

#### Option A: 동봉 안 함 (시스템 폰트만)
- 첫 실행에서 macOS의 한글 폰트 자동 감지.
- 사용자가 마음대로 폰트 추가 가능.

#### Option B: Noto Sans KR 동봉 (Variable Font, ~10MB)
- Google Noto Project, OFL 라이선스 (자유 배포 가능).
- Variable font 파일 (`NotoSansKR-VariableFont_wght.ttf`) 이면 9개 굵기 한 파일에.
- 약 10MB 추가.

#### Option C: 여러 한국어 폰트 동봉 (Pretendard + Noto Sans KR + Nanum Gothic 등 ~50MB)
- 다양한 톤 즉시 가용.
- 앱 크기 비대.

### 비교 매트릭스

| 항목 | A 동봉X | B Noto만 | C 다종 |
|---|---|---|---|
| **앱 크기 증가** | 0 | ~10MB | ~50MB |
| **첫 실행 즉시 사용** | 시스템 폰트 의존 | ✅ | ✅ |
| **재현 가능성** | 약함 (각 Mac마다 다름) | 강함 | 강함 |
| **동봉 라이선스** | N/A | OFL ✅ | 모두 OFL/SIL 확인 필요 |
| **HBAS 톤 (차분)** | Apple SD Gothic Neo로 가능 | Noto Sans KR로 가능 | 더 풍부 |
| **사용자 폰트 추가** | 가능 | 가능 (Phase 5) | 가능 |
| **macOS DMG 크기** | 250MB | 260MB | 300MB |

### 권고: **Option B — Noto Sans KR Variable 동봉**

근거:
1. **10MB는 무시할 수 있는 크기**. DMG 250MB → 260MB는 사용자 인지 차이 없음.
2. **재현 가능성** (헌장 §2.7) 확보 — burn-in 결과가 모든 Mac에서 동일.
3. **OFL 라이선스** 명확. 동봉/재배포/수정 모두 합법.
4. **HBAS 톤에 적합**: Noto Sans KR 자체가 한글 자막에 가독성 좋고 차분.
5. 사용자 커스텀 폰트는 Phase 5의 `assets:fonts:upload` IPC로 추가 (이미 계획 됨).

### 폰트 라이선스 검증

```
Noto Sans KR Variable Font
- License: SIL Open Font License 1.1 (OFL)
- Copyright: Google LLC
- 동봉/재배포: ✅
- 수정: ✅
- 자막 burn-in 영상의 상업적 사용: ✅ (Bundled font를 영상으로 변환한 결과는 OFL 적용 X)
- 라이선스 파일 동봉 의무: ✅ (resources/fonts/OFL.txt)
```

### 구현 단계
| 작업 | Phase | 추정 |
|---|---|---|
| Noto Sans KR Variable 다운로드 + `resources/fonts/` 배치 | Phase 0~1 | 30분 |
| OFL.txt 라이선스 동봉 | 동시 | 5분 |
| ffmpeg fontsdir 경로 분기에 포함 | Phase 4 | 이미 계획에 포함 |
| About 화면에 폰트 라이선스 명시 | Phase 9 | 30분 |

### 변경 비용
**0**. Phase 0에서 폰트 한 개 추가하는 것은 무시할 수 있는 비용. 나중에 추가해도 0.

---

---

## ADR-005: Intel 16GB Monterey 노트북 환경 정책

### 컨텍스트

개발 머신이 **Intel x64 + 16GB RAM + macOS Monterey 12.x 노트북**으로 확정. 이전 ADR들이 환경에 미치는 영향과, 이 환경 자체에서 발생하는 트레이드오프를 한 번에 정리.

### 환경 제약

- **CPU**: Intel x64. Sustained load 시 thermal throttling 강함.
- **RAM**: 16GB. 일상 앱(Chrome, Slack 등) + 개발 환경 동시 가용.
- **AVX2**: 세대에 따라 다름. Ivy Bridge는 미지원, Haswell+ 지원.
- **OS**: Monterey 12. Electron 33 LTS 호환, notarytool 지원.
- **Form**: 노트북. 배터리 + 발열 + 휴대성 트레이드오프.

### 결정

#### D-1. 로컬 빌드는 x64 only
- 기본 `electron-builder.yml` 의 `arch: [x64]`
- universal2 빌드는 `electron-builder.universal.yml` 별도 설정으로 분리
- universal2 는 **CI 전용** (macos-14 러너에서)
- 명령어:
  - `pnpm dist:mac:local` → x64 (8~12분)
  - `pnpm dist:mac:universal` → universal2 (CI 권장, 로컬 시 25~40분)

#### D-2. ffmpeg 프리셋 환경 분기
- dev: `-preset faster` (Intel 노트북 빠른 반복)
- prod / CI: `-preset medium` (퀄리티 우선)
- H.265 인코딩은 로컬 디폴트 금지 (속도 절반)

#### D-3. 인코딩 동시성 1개로 제한
- 큐 매니저 `maxConcurrent = 1`
- Intel 노트북 thermal throttling 방어
- (Apple Silicon 전환 시 2~3으로 완화 검토)

#### D-4. Puppeteer Chromium 핀
- `puppeteer-core@21.11.0` (Chromium 122)
- `find-chrome-bin` 으로 사용자 시스템 Chrome 우선 사용 (자체 Chromium 다운로드 회피)

#### D-5. ADR-001 (STT) 재확인
- Cloud (OpenAI Whisper) 강력 권장
- Ivy Bridge 가능성 (AVX2 미지원) 시 whisper.cpp 로컬은 Phase 12 이후로도 권장하지 않음

#### D-6. Phase 9 DMG 빌드는 CI 전용
- 코드 사이닝 + Notarization 모두 CI 의 macos-14 러너에서
- 로컬에서는 코드 사이닝 안 된 dev 빌드만 (`pnpm dist:mac:local`)
- 시크릿: GitHub repo settings 에 `APPLE_ID`, `APPLE_TEAM_ID`, `APPLE_APP_SPECIFIC_PASSWORD`, `APPLE_CERT_P12_BASE64`, `APPLE_CERT_PASSWORD`

#### D-7. 작업 위생 (노트북 특화)
- 어댑터 상시 연결 (배터리 모드 thermal throttling 강함)
- Vite watcher 1~2시간마다 재시작 (메모리 누수)
- 무거운 작업 (Phase 6 Puppeteer, Phase 9 빌드) 전 Chrome 탭 정리, 비필수 앱 닫기
- 세션 종료 시 `pkill -f electron && pkill -f vite`

### 트레이드오프

**얻는 것**:
- 로컬 빌드 시간 절반 이하 (universal2 25~40분 → x64 8~12분)
- 발열·팬 소음 감소
- 배터리 소모 절감
- 낮은 메모리 사용 (universal2 빌드 7GB → x64 3GB)

**잃는 것**:
- 로컬에서 Apple Silicon 호환성 직접 검증 불가 → CI 의존 강화
- 나중에 본인이 Apple Silicon Mac 추가 시 빌드 정책 재논의 필요

### 검증

CI 매트릭스가 `macos-13` (Intel) + `macos-14` (M1) 둘 다 테스트하므로 로컬 검증 부족분을 CI가 메움.

### 변경 비용

- 환경 변경 시 (예: Apple Silicon Mac 추가):
  - electron-builder.yml 의 `arch` 값 조정 (5분)
  - ffmpeg dev preset 완화 (5분)
  - 큐 매니저 `maxConcurrent` 조정 (5분)
  - **총 30분 미만의 설정 작업**
- 환경 다운그레이드 시 (예: Big Sur 등 더 옛 OS):
  - Electron 33 → 32 다운그레이드 가능성
  - notarytool → altool fallback 검토
  - **2~4시간 작업**

### 향후 재논의 시점

- Phase 5 끝나는 시점 (성능 누적 평가)
- Phase 9 진입 시점 (CI 시크릿 설정 + Apple Developer 계정)
- 사용자 환경 변경 시 (RAM 증설, 머신 추가, OS 업그레이드)

---

## 결정 요약 (cheatsheet)

| ADR | 결정 | Phase | 변경 비용 |
|---|---|---|---|
| 001 STT | Cloud(OpenAI) 기본, Local(whisper.cpp) Phase 12+ | Phase 3 | 30~40h 추가 |
| 002 Automation | Puppeteer 단독, Bridge Phase 12+ | Phase 6 | 40~60h 추가 |
| 003 프로젝트 위치 | `~/Documents/VideoForge/Projects/` 기본, 사용자 변경 가능 | Phase 1 | 0~6h |
| 004 폰트 | Noto Sans KR Variable 동봉 | Phase 0~1 | 0 |
| 005 Intel 환경 | 로컬 = x64만, ffmpeg dev preset = faster, H.265 로컬 금지, universal2 = CI 전용 | Phase 0+ | 0 (이미 적용) |

---

## specify.md 영향 받는 섹션

이 결정사항들이 확정되면 다음 섹션 갱신 필요:
- **§3.1 Project Management → 저장 구조**: ADR-003 반영.
- **§3.3 STT → 스택 선택**: ADR-001 반영.
- **§3.5 Grok / §3.6 Whisk**: ADR-002의 Google 계정 경고 추가.
- **§3.4 Video Editing → fontsdir**: ADR-004의 Noto Sans KR 경로 명시.

각 섹션별 변경 PR을 별도로 잘라서 머지하면 추적이 깔끔.

---

## 결정 권한

이 4건은 모두 **개발 시작 전 확정**해야 한다. Phase 0~1 진입 시점에 사용자(Sharkey) 확인 필요.

각 ADR은 향후 PR description에 "ADR-001 확정에 따른 구현"처럼 참조해서 traceability 유지.
