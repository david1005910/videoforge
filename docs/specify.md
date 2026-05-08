# VideoForge — Specify

> 이 문서는 **무엇을 만드는가**를 정의한다. 사용자 시나리오, 기능 명세, IPC API 표면, 데이터 모델, 수용 기준.
> 구현 방식(어떻게)은 `plan.md`에서 다룬다.

---

## 0. 변환 매핑 (EasyVideo → VideoForge)

원본 EasyVideo의 `electron/preload.js`에서 `contextBridge.exposeInMainWorld('electronAPI', ...)`로 노출된 IPC 핸들러를 모두 추출하여 매핑. 이 표가 functional-parity의 정의다.

| EasyVideo IPC | VideoForge IPC | 카테고리 | 우선순위 |
|---|---|---|---|
| saveVideoFile | `video:saveTo` | 영상 I/O | P0 |
| openNewWindow / getWindowCount | `window:openNew` / `window:count` | 윈도우 | P1 |
| requestSTT / requestSttToken / requestForcedAlignment / onSTTProgress | `stt:transcribe` / `stt:getToken` / `stt:align` / `stt:onProgress` | STT | P0 |
| downloadLocalFile / downloadImageToTemp / saveBlobToTemp / saveImage | `file:downloadLocal` / `file:saveImageTemp` / `file:saveBlobTemp` / `file:saveImage` | 파일 | P0 |
| generateTTS / generateGeminiTTS / generateGoogleTTS / generateEdgeTTS / onGeminiTTSProgress | `tts:generate` / `tts:gemini` / `tts:google` / `tts:edge` / `tts:onProgress` | TTS | P0 |
| getHWID | `system:getHWID` | 시스템 | P3 |
| getFfmpegPath | `system:getFfmpegPath` | 시스템 | P0 |
| saveExternalAudio / saveBlobAsFile / mergeAudios / mergeMultiAudios | `audio:saveExternal` / `audio:saveBlob` / `audio:merge` / `audio:mergeMulti` | 오디오 | P0 |
| editVideo / applyImageEffect / cancelImageEffect / saveEffectVideo / onEditVideoProgress | `video:edit` / `video:applyEffect` / `video:cancelEffect` / `video:saveEffect` / `video:onProgress` | 영상 편집 | P0 |
| getFonts / uploadCustomFont / deleteCustomFont | `assets:fonts:list` / `assets:fonts:upload` / `assets:fonts:delete` | 에셋 | P1 |
| uploadCustomSfx / deleteCustomSfx / getCustomSfx | `assets:sfx:upload` / `assets:sfx:delete` / `assets:sfx:list` | 에셋 | P1 |
| saveFileToDisk / copyToClipboard / findInPage / stopFindInPage / onFoundInPage | `file:saveToDisk` / `clipboard:write` / `page:find` / `page:stopFind` / `page:onFound` | 유틸 | P1 |
| readFileAsBase64 / downloadImage / selectFolder / downloadImageToFolder / openExternal | `file:readBase64` / `file:downloadImage` / `dialog:selectFolder` / `file:downloadImageToFolder` / `shell:openExternal` | 파일/셸 | P0 |
| grokLogin / grokGenerateVideo / grokCancel / grokCloseBrowser / grokExtensionStatus / onGrokProgress | `grok:login` / `grok:generate` / `grok:cancel` / `grok:close` / `grok:status` / `grok:onProgress` | Grok 자동화 | P1 |
| grokBatchGenerate / grokBridgeStatus / grokBridgeSendTasks / grokBridgeCancelAll / grokBridgeSetProject / onGrokVideoReady | `grok:batch` / `grok:bridge:status` / `grok:bridge:send` / `grok:bridge:cancel` / `grok:bridge:setProject` / `grok:onVideoReady` | Grok 자동화 | P1 |
| imagefxLogin / imagefxGenerate / imagefxCloseBrowser | `imagefx:login` / `imagefx:generate` / `imagefx:close` | ImageFX | P2 |
| whiskUploadReference / whiskGenerate | `whisk:uploadRef` / `whisk:generate` | Whisk | P2 |
| extractVideoFrames / extractLastFrame / generateSubtitleScreenshot | `video:frames:extract` / `video:frames:last` / `video:subtitleScreenshot` | 영상 분석 | P0 |
| startDrag / copyToClipboardSync / showAlert / showConfirm | `drag:start` / `clipboard:writeSync` / `dialog:alert` / `dialog:confirm` | UX | P0 |
| saveProject / loadProject / listProjects / deleteProject | `project:save` / `project:load` / `project:list` / `project:delete` | 프로젝트 | P0 |
| csChat / csClearHistory / dnaScriptChat / dnaScriptClearHistory / thumbnailAnalyze | `chat:cs` / `chat:csClear` / `chat:dna` / `chat:dnaClear` / `chat:thumbnail` | AI 챗 | P2 |
| onUpdateStatus / startUpdateDownload / installUpdate / getUpdateStatus / recheckUpdate | `update:on` / `update:download` / `update:install` / `update:status` / `update:recheck` | 업데이트 | P3 |
| initRemoteListener / onRemoteGetScenes / sendRemoteScenesResponse / onRemoteCommand / sendRemoteResponse | `remote:init` / `remote:onGetScenes` / `remote:sendScenes` / `remote:onCommand` / `remote:sendResponse` | 모바일 브릿지 | P4 |

**우선순위 정의**
- P0: MVP. 없으면 앱이 의미 없음.
- P1: 1차 출시 필수.
- P2: 1차 출시 가능하면 포함. 빠지면 다음 마이너.
- P3: 안정화 단계.
- P4: 미래 확장 (자리만 예약).

---

## 1. Personas

### P-01 콘텐츠 크리에이터 (Sharkey 본인 시나리오)
- HBAS YouTube 채널을 운영. 한국어 + 히브리어 듀얼 자막의 3D 애니메이션 시리즈.
- 일주일에 여러 편을 산출. 자동화로 시간을 아끼는 게 핵심 KPI.
- 기술 친화적: Puppeteer가 Grok에서 무엇을 하는지 보고 싶어함.

### P-02 일반 유튜버
- 스토리텔링 채널 (음성 나레이션 + 스톡 영상/AI 이미지).
- 자막 정확도가 retention에 직결.
- TTS 보이스를 자주 바꿔가며 테스트.

---

## 2. Top User Journeys

### UJ-1 "AI 영상 시리즈 한 편 자동 생성"
1. 새 프로젝트 생성 → 제목/설명/언어/해상도 설정.
2. **DNA Script 챗**(`chat:dna`)으로 7장 분량의 씬 스크립트 작성.
3. 각 씬마다 프롬프트 → **Whisk/ImageFX**(`whisk:generate` / `imagefx:generate`)로 이미지 일괄 생성.
4. 이미지 → **Grok Imagine**(`grok:batch`)으로 영상 클립 일괄 생성. 백그라운드 큐 진행.
5. 나레이션 텍스트 → **Edge TTS**(`tts:edge`)로 합성.
6. STT(`stt:transcribe`) + Forced Alignment(`stt:align`)로 ASS 자막 생성.
7. **타임라인 컴포지션** → ffmpeg(`video:edit`)로 최종 1080p mp4 내보내기.
8. **썸네일 분석**(`chat:thumbnail`)으로 클릭률 예측 피드백.

### UJ-2 "기존 영상에 자막만 추가"
1. 영상 파일 드래그&드롭.
2. STT → 자막 자동 생성 → ASS 스타일 적용.
3. `video:applyEffect`로 자막 합성된 mp4 출력.

### UJ-3 "TTS 일괄 합성 + Audio 합치기"
1. 스크립트 텍스트 (XLSX 또는 직접 입력).
2. 보이스 선택 → `tts:edge` 일괄.
3. `audio:mergeMulti`로 한 트랙으로 결합.

---

## 3. Functional Specification

### 3.1 Project Management

**데이터 모델 (`Project`)**
```ts
interface Project {
  id: string;                  // ulid
  formatVersion: '1.0.0';      // SemVer
  title: string;
  description?: string;
  language: 'ko' | 'en' | 'he' | 'zh' | 'ja' | string;
  resolution: { w: number; h: number; fps: number };
  scenes: Scene[];
  assets: AssetIndex;          // 프로젝트 폴더 안 상대경로 인덱스
  createdAt: string;           // ISO
  updatedAt: string;
}

interface Scene {
  id: string;
  index: number;
  scriptKo?: string;
  scriptOriginal?: string;
  prompts: { whisk?: string; imagefx?: string; grok?: string };
  generatedImages: AssetRef[]; // Whisk/ImageFX 결과
  generatedClips: AssetRef[];  // Grok 결과
  narrationAudio?: AssetRef;
  subtitleAss?: AssetRef;
  finalClip?: AssetRef;
  notes?: string;
}

type AssetRef = { kind: 'image'|'audio'|'video'|'ass'|'font'|'sfx'; path: string; sha1: string };
```

**저장 구조**
```
~/Library/Application Support/VideoForge/Projects/<ulid>/
  project.json
  assets/
    images/
    audio/
    video/
    subs/
  thumbnails/
```

**IPC**
- `project:save` (project: Project) → { ok, savedAt }
- `project:load` (id: string) → Project
- `project:list` () → ProjectMeta[]
- `project:delete` (id: string) → { ok }

**수용 기준**
- 프로젝트 100개 / 각 50씬 / 각 씬 10에셋 = 50,000 에셋 인덱스 → 리스트 로딩 1초 이내.
- `project.json` 1MB 초과 금지 (대용량 데이터는 별도 파일 + 참조).
- v1.0 → v1.1 마이그레이션 함수 자리 예약.

---

### 3.2 TTS (Text-to-Speech)

**프로바이더 매트릭스**

| Provider | Auth | 비용 | 보이스 | 우선순위 |
|---|---|---|---|---|
| Microsoft Edge TTS | 무료 (Edge 토큰 자동) | 0 | 한·영·중·일·히 다수 | P0 |
| Google Cloud TTS | API key | 종량제 | WaveNet · Studio | P1 |
| Gemini TTS | API key | 종량제 | 표현력 높음 | P1 |

**IPC**
```ts
// 공통 페이로드
type TtsRequest = {
  text: string;
  voice: string;       // provider별 ID
  speed?: number;      // 0.5 ~ 2.0
  pitch?: number;
  outputPath?: string; // 미지정 시 temp
};

ipc('tts:edge',   TtsRequest) → { audioPath: string; durationMs: number }
ipc('tts:google', TtsRequest & { apiKey?: string }) → { ... }
ipc('tts:gemini', TtsRequest & { apiKey?: string; emotion?: string }) → { ... }
ipc('tts:onProgress', (p: { taskId, percent, eta }) => void)
```

**수용 기준**
- 1000자 한국어 → Edge TTS 5초 이내 합성 + WAV 저장.
- 네트워크 끊김 시 명확한 에러 메시지(`ECONN`, `ETIMEDOUT` 분기).

---

### 3.3 STT + Forced Alignment

**스택 선택**
- STT: OpenAI Whisper API (cloud) 또는 `whisper.cpp`(local). v1은 cloud, v2에서 로컬 모델 선택지 제공.
- Alignment: `@bbc/stt-align-node` (이미 검증된 BBC 라이브러리).

**IPC**
```ts
ipc('stt:transcribe', { audioPath, language, provider: 'openai'|'gemini' }) → { segments: STTSegment[] }
ipc('stt:align', { transcript: string; sttSegments: STTSegment[] }) → { words: AlignedWord[] }
ipc('stt:onProgress', cb)
```

**산출물 → ASS**
```
script ──┐
          ├─→ [stt:align] ──→ AlignedWord[] ──→ [ass-generator] ──→ subtitle.ass
audio ──┘
```

**수용 기준**
- 5분 한국어 오디오 → 30초 이내 segment 산출 (cloud).
- alignment 평균 오차 ±150ms 이하.
- ASS 파일은 libass-wasm 으로 즉시 렌더 가능해야 함.

---

### 3.4 Video Editing (ffmpeg)

**핵심 연산**

| 연산 | 입력 | 출력 | ffmpeg 전략 |
|---|---|---|---|
| Concat | 클립 N개 | 1 mp4 | `concat demuxer` (re-encode 회피 가능 시) |
| Subtitle Burn-in | mp4 + ass | mp4 | `subtitles=` filter |
| TTS overlay | mp4 + wav | mp4 | `amix` |
| BGM mix | mp4 + mp3 | mp4 | sidechain compressor |
| Image → motion clip | png + duration | mp4 | `zoompan` (Ken Burns) |
| Effect (fade/blur/zoom) | mp4 | mp4 | `xfade`, `boxblur`, `scale+crop` |
| Frame extract | mp4 + timestamp | png | `-ss -frames:v 1` |

**IPC**
```ts
ipc('video:edit', {
  taskId: string;
  outputPath: string;
  pipeline: PipelineStep[];   // 위 연산들의 시퀀스
}) → { duration, size }

ipc('video:onProgress', cb: (p: {taskId, percent, currentStep, fps}) => void)
ipc('video:cancel', { taskId }) → { ok }
```

**수용 기준**
- 1080p 5분 영상 + 자막 burn-in: M2 Pro에서 60초 이내.
- 진행률은 ffmpeg stderr `out_time_ms=` 파싱.
- 취소 시 child process SIGKILL + 임시파일 정리.

---

### 3.5 AI 자동화 — Grok Imagine

**아키텍처**
- Puppeteer-core + Stealth 플러그인.
- **사용자 로그인 세션 보존**: `userDataDir` 을 `~/Library/Application Support/VideoForge/PuppeteerProfiles/grok/` 으로 고정.
- 첫 사용 시 `grok:login` → 사용자가 직접 X.com / grok.com 로그인 → 쿠키 저장 → 이후 자동 로그인.

**Bridge 모드 (선택)**
- 사용자가 자기 일반 Chrome에 VideoForge 익스텐션 설치 → DevTools Protocol로 연결.
- 익스텐션이 더 안정적(rate-limit 회피용 아님 — UX 안정성용).

**IPC**
```ts
ipc('grok:login', {}) → { ok, profilePath }
ipc('grok:generate', { prompt, imagePath?, durationSec, count }) → { taskId }
ipc('grok:batch', { items: GrokTask[] }) → { batchId }
ipc('grok:cancel', { taskId | batchId }) → {}
ipc('grok:onProgress', cb)
ipc('grok:onVideoReady', cb: (r: {taskId, localPath}) => void)
```

**수용 기준**
- 10개 클립 배치 → 큐로 순차 진행, 사용자가 닫아도 보존.
- 다운로드 완료 시 자동으로 프로젝트 `assets/video/` 로 복사 + sha1 검증.
- ToS 위반 동작 (캡차 우회, 다중 계정 라운드로빈) 금지 — 코드에 자동 차단.

---

### 3.6 AI 자동화 — Google Whisk / ImageFX

**Whisk 특징**
- subject / scene / style 이미지를 각각 업로드 → 결합.
- `whisk:uploadRef` 가 별도 IPC인 이유.

**IPC**
```ts
ipc('whisk:uploadRef', { kind: 'subject'|'scene'|'style', imagePath }) → { refId }
ipc('whisk:generate', { refIds: {subject?, scene?, style?}, prompt, count }) → { images: string[] }
ipc('imagefx:login', {}) → { ok }
ipc('imagefx:generate', { prompt, aspectRatio: '1:1'|'16:9'|'9:16', count }) → { images: string[] }
```

**수용 기준**
- 일괄 생성 8장 / 평균 1분 이내 (Google 측 처리 시간 + 다운로드).
- 결과 이미지는 PNG, 메타데이터(생성 prompt)를 EXIF UserComment 에 기록.

---

### 3.7 AI Chat Assistants (Gemini)

3개 챗:
- `chat:cs`: Customer Support · 일반 도움.
- `chat:dna`: DNA Script — 사용자 채널 톤·구조·길이 학습된 시스템 프롬프트로 새 영상 스크립트 생성.
- `chat:thumbnail`: 썸네일 이미지 + 제목 분석 → 클릭 가능성 평가.

**IPC**
```ts
ipc('chat:cs', { messages: ChatMsg[] }) → { reply }
ipc('chat:dna', { messages, projectId? }) → { reply }
ipc('chat:thumbnail', { imagePath, title }) → { score, suggestions: string[] }
ipc('chat:csClear' / 'chat:dnaClear', {}) → {}
```

**Knowledge Files** (메인 프로세스에 정적 동봉)
- `electron/knowledge/cs.md`, `dna-script.md`, `thumbnail.md` — 시스템 프롬프트 본문.

---

### 3.8 Asset Library

**폰트**
- `assets:fonts:upload` → ttf/otf 파일 → `~/Library/Application Support/VideoForge/Fonts/` 복사 → 시스템 폰트 + 커스텀 폰트 통합 리스트 반환.
- 자막 burn-in 시 ffmpeg에 폰트 경로 정확히 전달 (`fontsdir=`).

**SFX**
- `assets:sfx:upload` → mp3/wav → `~/Library/Application Support/VideoForge/SFX/`.
- 카테고리 (transition / impact / ambient) 자동 분류 (파일명 휴리스틱).

---

### 3.9 Multi-Window Support

- 메인 윈도우 = 프로젝트 편집기.
- `window:openNew` → 새 프로젝트 / 두 번째 편집기 (멀티 모니터 사용).
- `window:count` 로 동시 인코딩 제한 (Mac 사양에 맞춰 자동 조절).

---

### 3.10 Update System

- v1: 수동 다운로드 (electron-updater 미통합).
- v2: GitHub Releases + electron-updater + Code Sign 검증.
- 자동 업데이트는 사용자 옵트인 (기본 OFF).

---

### 3.11 Remote Listener (Phase 4 자리예약)

- 모바일 → Mac 으로 씬 정보 push, 실행 명령 전송.
- v1에서는 IPC 핸들러 자리만 만들어두고 NotImplementedError 반환.

---

## 4. Non-Functional Requirements

### 4.1 Performance
- 콜드 스타트 (첫 실행) ≤ 3.0초 (M1 Air 기준).
- 워밍 스타트 ≤ 1.5초.
- 메모리 idle ≤ 350MB.
- 인코딩 중 메모리 ≤ 1.5GB.

### 4.2 Storage
- 프로젝트 1개 평균 1GB. 사용자 디스크 80% 차면 경고.
- 캐시(`~/Library/Caches/VideoForge/`)는 자동 정리 (30일 + 5GB 한도).

### 4.3 Accessibility
- 모든 버튼 키보드 단축키 가능.
- 스크린 리더 호환 ARIA 레이블.
- 폰트 크기 100%/125%/150% 토글.

### 4.4 i18n
- 1차: 한국어 / 영어. 텍스트는 `i18next` 키로 분리.
- 2차: 중국어 간체.

### 4.5 Security
- `nodeIntegration:false`, `contextIsolation:true`, `sandbox:true`, `webSecurity:true`.
- API key는 Keychain.
- 외부 URL 클릭은 `shell.openExternal` 만 허용.
- 자동 업데이트는 코드 사이닝 검증 후에만.

### 4.6 Privacy
- 텔레메트리 OFF가 기본.
- 사용자 텍스트는 외부 AI 호출 시에만 전송 (사용자 확인).
- "내 데이터 모두 삭제" 한 번에 실행 가능한 메뉴.

---

## 5. Acceptance Tests (요약)

각 P0 기능당 최소 1개 E2E 테스트. Playwright + Electron mode.

```
T-01  새 프로젝트 → 저장 → 닫기 → 다시 열기. 데이터 동일.
T-02  TTS Edge 한국어 합성 → wav 생성 → duration > 0.
T-03  audio merge 3개 → 단일 mp4. 길이 합 일치.
T-04  Whisper 5분 음성 → segment count > 0 + alignment 동작.
T-05  ffmpeg subtitle burn-in 후 ssim > 0.95 (원본 vs 결과).
T-06  Grok 모킹 서버로 batch 3개 → 모두 progress=100% 완료.
T-07  Whisk 모킹 → 이미지 4장 다운로드 + EXIF prompt 기록.
T-08  창 2개 동시 열고 각각 다른 프로젝트 편집 → 충돌 없음.
T-09  앱 종료 시 child_process 모두 정리 (좀비 0).
T-10  Notarized DMG 설치 → Gatekeeper 통과.
```

---

## 6. Open Questions (나중에 결정)

- [ ] Whisper: cloud (OpenAI) vs local (whisper.cpp) — 디스크 공간 vs 비용 트레이드오프.
- [ ] AI 챗 히스토리 저장 위치 (프로젝트별 vs 글로벌).
- [ ] Mobile companion 앱 — React Native vs PWA.
- [ ] 사용자 기본 언어 자동 감지 (macOS Locale)?
