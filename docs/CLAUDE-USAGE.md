# Claude Code 사용 가이드 — Intel 16GB Monterey

> 이 프로젝트를 Claude Code로 이어서 개발하는 방법.
> 환경: Intel x64 + 16GB + macOS Monterey 노트북.

---

## 왜 Claude Code

이 프로젝트의 특성:

- **모노레포 + 다파일 변경**: 한 IPC 채널 추가 = 8개 파일 동시 수정. 채팅으로는 비효율.
- **타입 일관성**: `packages/shared` 의 타입이 메인 / 렌더러 / 테스트 동시 영향.
- **반복 패턴**: 새 IPC 채널 추가는 항상 같은 7단계 — 반자동화 가능.
- **터미널 통합**: `pnpm test`, `pnpm typecheck` 직접 실행 → 결과 보고 즉시 수정.
- **Intel 환경 자체 제약**: 빌드/인코딩 시간이 긴 만큼, 작업 단위를 작게 쪼개고 commit 자주 하는 게 핵심. Claude Code가 이걸 잘함.

---

## 설치 — Intel Monterey 안전 셋업

### Option A (권장): npm + 버전 핀

이전 Ivy Bridge에서 자동업데이트로 깨진 경험을 반복하지 않으려면 **버전 핀이 안전**.

```bash
# Node 20 LTS 활성화 상태에서
nvm use 20

# 핀된 버전으로 글로벌 설치
npm install -g @anthropic-ai/claude-code@2.1.74

# 자동 업데이트 차단
npm config set update-notifier false

# 추가로 ~/.zshrc 에 환경변수
echo 'export DISABLE_AUTOUPDATER=1' >> ~/.zshrc
source ~/.zshrc

# 확인
claude --version
```

만약 `2.1.74` 가 너무 옛 버전이라 동작 안 하면 `npm view @anthropic-ai/claude-code versions` 로 안정 버전 찾아 다시 핀.

### Option B: Native Installer (자동 업데이트 활성)

새 Mac 처음 셋업이거나 자동 업데이트 무관하다면:

```bash
curl -fsSL https://claude.ai/install.sh | bash
claude --version
```

Native installer 가 자동 업데이트를 백그라운드로 합니다. 본인 머신에서 안정 검증 후 옮긴다면 Option A.

### 인증

```bash
claude
```

처음 실행 시 브라우저로 Anthropic 인증. **Claude Pro ($20/월) 이상 필요** (Free는 Claude Code 미포함).

---

## 첫 셋업 (3분)

```bash
cd ~/Documents/HBAS-tools/videoforge

# CLAUDE.md 가 zip에 포함됨 (루트 위치 확인)
ls CLAUDE.md

# Claude Code 진입
claude

# (선택) 자동 분석 — CLAUDE.md 보강
> /init
```

`/init` 은 코드베이스 스캔해서 빌드 명령·테스트 프레임워크·코드 스타일을 추가로 채웁니다. 우리는 이미 CLAUDE.md를 짜놨으니 **머지 모드**로 돌리거나 그냥 건너뛰어도 됩니다.

---

## 효과적인 프롬프트 패턴

spec-kit 문서가 강력해서 **간결한 지시**로 충분합니다.

### Pattern A: Phase task ID로 위임 (가장 권장)

```
docs/tasks.md 의 P1-01 (Project / Scene / AssetRef 도메인 타입) 을 구현해줘.

요구사항:
- packages/shared/src/domain/project.ts 는 이미 zod 스키마가 있음. 검토하고 부족한 필드 보완.
- 단위 테스트 추가 (packages/shared/src/domain/project.test.ts).
- pnpm typecheck + pnpm test 통과까지 확인.
- Intel Monterey 환경 가정 (`docs/ENVIRONMENT.md` 참조).
```

Claude는 자동으로:
1. `docs/tasks.md` P1-01 항목 읽음
2. 기존 `packages/shared/src/domain/project.ts` 검사
3. 보완 + 테스트 추가
4. 직접 `pnpm test` 실행
5. 실패하면 자동 수정

### Pattern B: 새 IPC 채널 추가

```
TTS Edge 채널을 끝까지 구현해줘.

체크리스트:
1. apps/desktop/electron/main/services/tts/edge.ts 작성 — node-edge-tts 사용, 캐시 포함
2. apps/desktop/electron/main/services/tts/cache.ts 작성 — sha1 기반 파일 캐시
3. apps/desktop/electron/main/services/tts/index.ts 에 registerHandler 등록
4. apps/desktop/electron/main/index.ts 의 registerAppHandlers 다음에 registerTtsHandlers 호출
5. apps/desktop/electron/preload/index.ts 의 api 객체에 tts.edge / tts.onProgress 노출
6. apps/desktop/src/lib/api.ts 에 ttsEdge 래퍼
7. 단위 테스트: edge.test.ts (mock node-edge-tts)
8. pnpm test + pnpm typecheck 통과

스키마는 packages/shared/src/schemas/tts.ts 에 이미 있음.
패턴은 docs/implement.md §3 Service 레이어 패턴 참조.
```

### Pattern C: 디버그/수정

```
pnpm test 가 packages/shared/src/schemas.test.ts 에서 5개 실패해.
출력 보고 수정해줘.
```

### Pattern D: 환경별 디버깅

```
sharp 모듈 빌드 실패. macOS Monterey + Intel x64.
docs/ENVIRONMENT.md 의 §8 자주 나는 Monterey 함정 보고
어디 단계에서 실패하는지 진단해줘.
```

---

## 슬래시 명령

| 명령 | 용도 |
|---|---|
| `/init` | CLAUDE.md 자동 생성/보강 |
| `/clear` | 대화 컨텍스트 초기화 |
| `/compact` | 대화 요약하여 컨텍스트 축소 |
| `/cost` | 현재 세션 토큰/비용 |
| `/diff` | 마지막 변경 git diff |
| `/review` | 변경사항 자체 리뷰 |
| `/permissions` | 도구 권한 관리 |
| `/model` | 모델 선택 (opus / sonnet / haiku) |

---

## Phase 1 진행 추천 워크플로우 (Intel 노트북)

### 세션 시작 (1분)

```bash
# 어댑터 연결 + 메모리 확인
pmset -g batt | grep -i charging
vm_stat | head -5

cd ~/Documents/HBAS-tools/videoforge
git status                              # 깨끗한 상태 확인
git checkout -b feat/P1-01-domain       # 작업 브랜치
claude
```

Claude 안에서:

```
> 오늘 P1-01 부터 P1-04 까지 진행하려고 해.
  먼저 docs/tasks.md 의 해당 항목들을 읽고,
  의존성 순서대로 어떻게 갈지 정리해줘.
  실제 코드는 내가 다음 메시지에서 시작 신호 주면 그때부터.
```

### 작업 진행 (1.5시간)

```
> P1-01 부터 시작. 완료되면 git commit 하고 다음 작업 가기 전에 멈춰줘.
```

Claude는:
1. 코드 작성
2. `pnpm test` 직접 실행
3. 통과하면 `git add` + `git commit`
4. 멈춰서 사용자 확인 대기

문제 시:

```
> commit 메시지에 scope 빼먹었어. amend 해줘.
```

```
> 이 함수는 너무 길어. 50줄 넘으면 분할이 원칙이야 (constitution N).
  파일 분리해줘.
```

### 세션 마무리 (3분)

```
> 오늘 한 작업 정리해줘:
  - 완료한 task ID 목록
  - 추가/변경된 파일 수
  - tasks.md 의 추정 시간 vs 실제 시간 차이
  - 내일 이어서 할 첫 작업
```

이걸 그대로 PR description 에 붙입니다.

```bash
# 좀비 프로세스 정리 (Intel Monterey 권장)
pkill -f electron && pkill -f vite
```

---

## Plan Mode (중요)

복잡한 작업은 먼저 **계획만**:

```
> P1-12 (멀티 윈도우 매니저) 는 좀 복잡해.
  Plan Mode 로 가자: 코드는 쓰지 말고
  - 어떤 파일을 어떻게 바꿀지
  - 새 파일 어떤 것
  - 테스트 시나리오
  를 먼저 보여줘.
```

승인 후:

```
> 계획대로 진행해줘.
```

---

## 비용 관리

Claude Pro 5시간 윈도우당 약 50~200메시지. Phase 1~3 진행에 충분합니다.

토큰 절약:
- **CLAUDE.md 잘 짜둠** (이미 됨)
- 긴 세션은 `/compact` 로 요약
- 작업 단위마다 `/clear` 새 세션
- 가벼운 작업은 `claude --model sonnet` (Opus 대비 5배 저렴)
- Intel Monterey 환경 자체 제약 때문에 작업이 느린 경우, 모델 비용보다 빌드/테스트 대기 시간이 더 큼 — 모델 다운그레이드 신중히

---

## 안전망

```bash
git status        # 작업 전 항상
git stash list    # 잊은 stash 없는지
```

큰 변경 후:

```
> 지금 변경사항 보여줘
> /diff
```

마음에 안 들면:

```bash
git restore .
git clean -fd
```

또는:

```
> 마지막 변경 다 되돌리고 다시 시작하자. 이번엔 X 부분만 바꿔줘.
```

---

## Intel Monterey 특화 함정

### 1. Claude Code 자동 업데이트로 깨짐
- Option A (버전 핀) 사용 권장
- 만약 깨지면: `npm install -g @anthropic-ai/claude-code@<직전 버전>`

### 2. 빌드 실행 후 Claude Code 멈춤
- Intel Mac은 빌드가 길어서 (`pnpm build` 2~3분) 타임아웃 의심
- 해결: 명시적으로 백그라운드 또는 별도 터미널에서 빌드, Claude는 결과만 확인

```
> apps/desktop/electron/main/services/tts/edge.ts 만 작성해줘.
  빌드는 내가 별도 터미널에서 돌릴 테니까 너는 코드 작성만.
```

### 3. Puppeteer 작업 시 Chrome 권한 다이얼로그
- Phase 6+ 들어가면 Chromium 권한 (자동화 허용) 다이얼로그 자주 뜸
- 시스템 환경설정 → 보안 → 개인정보 보호 → 자동화 → Terminal 항목에 Chrome 체크

### 4. spec 문서 무시
Claude가 패턴 무시하고 개성껏 짜는 경우:

```
> 잠깐. docs/implement.md §2.3 의 registerHandler 패턴 다시 읽고,
  그 구조 그대로 따라서 다시 짜줘.
```

### 5. 검증 스킵
"구현 완료"라고만 하고 `pnpm test` 안 돌린 경우:

```
> pnpm test 통과 확인했어? 출력 보여줘.
```

### 6. 멀티 채널 한 번에
"TTS 3개 프로바이더 한 번에 다 짜줘" → 코드 폭주 + Intel Mac 빌드 실패율 증가. **Phase 단위로 잘라서**.

---

## 다음 액션

1. CLAUDE.md가 프로젝트 루트에 있는지 확인 (zip에 포함)
2. `claude` 실행
3. 첫 명령:
   ```
   > docs/decisions.md 의 ADR 5건을 검토해줘.
     특히 ADR-005 (Intel 환경 정책) 가 내 작업 방식과 맞는지.
     각 결정에 대해 동의 / 수정 의견 / 추가 질문 정리.
   ```
4. ADR 확정 후:
   ```
   > P1-01 부터 시작. CLAUDE.md Working Style 따라.
   ```

작업 흐름 손에 익으면 Phase 1 16개 task가 약 2~3주 (사이드 작업 기준) 안에 끝납니다.
