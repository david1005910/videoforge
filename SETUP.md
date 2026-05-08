# VideoForge — 설치 가이드

> **Target environment**: Intel x64 + 16GB RAM + macOS Monterey 12.x notebook
>
> 다른 환경은 `docs/ENVIRONMENT.md` 참조.

---

## 사전 점검 (필수)

```bash
# 1) macOS 버전 — 12.0 (Monterey) 이상이어야 함
sw_vers -productVersion

# 2) CPU 아키텍처 — x86_64 여야 함 (Intel)
uname -m

# 3) CPU 세대 — Ivy Bridge / Haswell / Skylake 등 확인
sysctl -n machdep.cpu.brand_string

# 4) AVX2 지원 여부 (참고용)
sysctl -n machdep.cpu.features | tr ' ' '\n' | grep -E "AVX|FMA"

# 5) 가용 RAM
sysctl hw.memsize | awk '{print $2/1024/1024/1024 " GB"}'

# 6) 디스크 여유 — 최소 10GB
df -h /
```

기대 출력:
- macOS: `12.x.x` (Monterey)
- Arch: `x86_64`
- RAM: `16 GB`
- Free: `> 10 GB`

---

## Step 0 — Xcode Command Line Tools (필수)

`sharp`, `node-gyp` 같은 네이티브 모듈 빌드에 필요. Monterey에서는 이게 첫 단추입니다.

```bash
xcode-select --install   # 다이얼로그 뜨면 설치
xcode-select -p          # /Applications/Xcode.app/... 또는
                         # /Library/Developer/CommandLineTools 출력되어야 함

# 버전 확인 (Monterey면 Xcode 13~14 권장)
xcodebuild -version 2>/dev/null || echo "Xcode CLT only (앱 풀 설치 불필요)"
```

CLT만 있어도 충분. Xcode 풀 설치 (15GB+) 는 필요 없습니다.

---

## Step 1 — Homebrew (없으면)

Monterey에서는 Homebrew가 `/usr/local/` 경로에 설치됩니다 (Apple Silicon은 `/opt/homebrew/`).

```bash
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"

# Intel Mac 경로
echo 'export PATH="/usr/local/bin:$PATH"' >> ~/.zshrc
source ~/.zshrc

# 확인
brew --version
which brew    # /usr/local/bin/brew
```

> Monterey 12.0 ~ 12.2 일부 빌드에서 Homebrew 인스톨러가 macOS SDK 누락을 호소합니다. `xcode-select --install` 한 번 더 돌리면 해결.

---

## Step 2 — Node 20 LTS (nvm 권장)

Intel Mac + Monterey + Node 20 = 안정 조합.

```bash
# nvm 설치
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.7/install.sh | bash

# 셸 재시작 또는 source
source ~/.zshrc

# 만약 nvm 명령이 안 잡히면 ~/.zshrc 에 다음 추가:
#   export NVM_DIR="$HOME/.nvm"
#   [ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"

# Node 20 LTS 설치 + 기본 지정
nvm install 20
nvm alias default 20
nvm use 20

# 확인
node -v        # v20.x.x
which node     # ~/.nvm/versions/node/v20.x.x/bin/node
```

> `brew install node@20` 도 가능하지만, 글로벌 패키지 권한 문제가 자주 생겨 nvm 권장.

---

## Step 3 — pnpm 9 (corepack)

Node 20 내장 corepack 사용. 별도 설치 불필요.

```bash
corepack enable
corepack prepare pnpm@9.15.0 --activate

# 확인
pnpm -v        # 9.15.0
```

프로젝트 `package.json` 의 `packageManager: "pnpm@9.15.0"` 필드 덕분에 자동으로 같은 버전 사용.

---

## Step 4 — Git (없으면)

Monterey는 Git이 보통 깔려 있지만 확인:

```bash
git --version   # 2.x.x
```

없거나 너무 옛 버전이면:
```bash
brew install git
```

---

## Step 5 — 프로젝트 압축 해제

```bash
cd ~/Downloads
unzip videoforge-bootstrap-intel-monterey.zip

# 작업 폴더로 이동
mkdir -p ~/Documents/HBAS-tools
mv videoforge ~/Documents/HBAS-tools/

cd ~/Documents/HBAS-tools/videoforge
ls -la
```

다음 구조가 보여야 합니다:

```
videoforge/
├── apps/desktop/
├── packages/shared/
├── docs/
├── .github/
├── .vscode/
├── .husky/
├── CLAUDE.md          # ← Claude Code 자동 컨텍스트
├── SETUP.md           # ← 이 문서
├── README.md
└── package.json
```

---

## Step 6 — Git 초기화 (강력 권장)

Claude Code 작업 시 변경사항 추적 필수입니다. **이거 없으면 매우 위험**.

```bash
cd ~/Documents/HBAS-tools/videoforge

git init
git add .
git commit -m "chore: Phase 0 bootstrap (Intel 16GB Monterey)"

# (선택) GitHub 원격 — 백업 + CI 활성화
# 1. github.com에 새 private repo 생성
# 2. 다음 명령
git remote add origin git@github.com:<your-username>/videoforge.git
git branch -M main
git push -u origin main
```

---

## Step 7 — 의존성 설치

Intel Mac은 Apple Silicon 대비 빌드 시간이 1.5~2배 걸립니다. 첫 설치 5~8분 예상.

```bash
pnpm install
```

진행 중 자주 보이는 메시지:
- `node-gyp rebuild` (sharp, better-sqlite3 등) — 네이티브 모듈 빌드
- `Downloading Electron` — 약 200MB

만약 멈추거나 실패하면:

```bash
# 캐시 정리 후 재시도
pnpm store prune
rm -rf node_modules pnpm-lock.yaml
pnpm install

# Electron 다운로드만 별도 미러 사용 (회사 방화벽 등)
export ELECTRON_MIRROR=https://npmmirror.com/mirrors/electron/
pnpm install

# Xcode CLT 누락으로 sharp 빌드 실패 시
xcode-select --install
pnpm rebuild sharp
```

---

## Step 8 — 검증 (3단계, 모두 통과해야 함)

```bash
# 1) 타입 체크 — 에러 0이어야 함
pnpm typecheck
# 예상 시간: 1~2분

# 2) 단위 테스트 — 23개 모두 통과해야 함
pnpm test
# 예상 시간: 30초~1분
# 출력: "Test Files  1 passed (1) | Tests  23 passed (23)"

# 3) ESLint — 경고만 있고 에러는 없어야 함
pnpm lint
# 예상 시간: 30초
```

---

## Step 9 — 첫 실행

```bash
pnpm dev
```

처음 실행은 30~60초 걸립니다. electron-vite 가 main / preload / renderer 3개를 동시 컴파일.

**성공 시**:
- Electron 창이 떠야 합니다
- "VideoForge" 헤딩 표시
- "Runtime" 섹션에 `Electron 33.0.2 / Node 20.x / x64` 등 표시
- "IPC Ping" 입력창 + Send 버튼
- Send 클릭 시 초록색 echo 메시지 출력

이게 보이면 **Phase 0 완료**.

종료는 `Ctrl+C` 두 번.

---

## Step 10 — Monterey 특화 첫 실행 추가 작업

### 10-1. Gatekeeper 회피

처음 dev 빌드 실행 시 macOS가 "확인되지 않은 개발자" 다이얼로그를 띄웁니다.

```bash
# 옵션 A: GUI에서 한 번 허용 (권장)
# 시스템 환경설정 → 보안 및 개인정보 보호 → "확인 없이 열기"

# 옵션 B: CLI로 quarantine 속성 제거
xattr -dr com.apple.quarantine ~/Documents/HBAS-tools/videoforge/apps/desktop/out/
```

### 10-2. ffmpeg 바이너리 quarantine 제거 (Phase 4 진입 전)

```bash
cd ~/Documents/HBAS-tools/videoforge
xattr -d com.apple.quarantine apps/desktop/node_modules/ffmpeg-static/ffmpeg 2>/dev/null
xattr -d com.apple.quarantine apps/desktop/node_modules/ffprobe-static/bin/darwin/x64/ffprobe 2>/dev/null
```

### 10-3. 마이크 권한 (Phase 3 STT 진입 전)

시스템 환경설정 → 보안 및 개인정보 보호 → 마이크 → Terminal (또는 사용 중인 터미널 앱) 체크.

---

## 자주 발생하는 문제

### `sharp` 빌드 실패: `Could not load the "sharp" module`
- Xcode CLT 미설치. `xcode-select --install` → `pnpm rebuild sharp`
- Node 버전이 18 미만. `nvm use 20`

### `pnpm install` 도중 `EACCES: permission denied`
- Homebrew 글로벌 권한 문제. `sudo chown -R $(whoami) /usr/local/lib/node_modules`
- 또는 nvm 사용 (Step 2 재확인)

### `pnpm dev` 후 흰 화면
- DevTools (⌘+⌥+I) 열어서 콘솔 확인
- 거의 항상 preload 경로 미스매치
- 임시 해결: `pnpm clean:cache && pnpm dev`

### Electron 창이 Rosetta로 잘못 뜸
- Intel Mac에서는 무관 (Rosetta는 Apple Silicon용)
- 만약 발생하면: `arch -x86_64 pnpm dev`

### "Apple cannot check this app for malicious software"
- 첫 실행 시 정상 메시지. Step 10-1 참조.

### Vite watcher가 1시간 후 멈춤
- Monterey + Intel 조합에서 자주 발생. `Ctrl+C` 후 `pnpm dev` 재시작.

### 노트북이 너무 뜨거워짐
- 선풍기 또는 노트북 받침대 사용
- `pnpm dev` 만 실행 시에는 평이한 발열, 인코딩 / 빌드 시 강함
- 어댑터 연결 필수 (배터리 모드는 thermal throttling 강함)

---

## 다음 단계

Phase 0 통과하면:

1. **`docs/decisions.md`** 의 ADR 5건 검토 → 확정 (특히 ADR-005 Intel 환경 정책)
2. **`CLAUDE.md`** 가 프로젝트 루트에 있는지 확인 (zip에 포함됨)
3. **Claude Code 설치**:
   ```bash
   npm install -g @anthropic-ai/claude-code@2.1.74
   npm config set update-notifier false
   ```
4. **Phase 1 진입**: `docs/CLAUDE-USAGE.md` 참조

부트스트랩에서 막히는 부분이 있으면 정확한 명령어 + 에러 출력을 캡처해두시고 디버깅 진행하세요.
