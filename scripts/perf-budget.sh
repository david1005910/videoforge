#!/usr/bin/env bash
# Performance budget check for VideoForge (Intel 16GB Monterey)
# P11-03: Measures bundle sizes, dependency counts, and typecheck speed.

set -euo pipefail
cd "$(dirname "$0")/.."

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
NC='\033[0m'

PASS=0
WARN=0
FAIL=0

check() {
  local label="$1" actual="$2" limit="$3" unit="$4"
  if [ "$actual" -le "$limit" ]; then
    echo -e "  ${GREEN}✓${NC} ${label}: ${actual}${unit} (limit: ${limit}${unit})"
    PASS=$((PASS + 1))
  else
    echo -e "  ${RED}✗${NC} ${label}: ${actual}${unit} (limit: ${limit}${unit})"
    FAIL=$((FAIL + 1))
  fi
}

warn_check() {
  local label="$1" actual="$2" limit="$3" unit="$4"
  if [ "$actual" -le "$limit" ]; then
    echo -e "  ${GREEN}✓${NC} ${label}: ${actual}${unit} (limit: ${limit}${unit})"
    PASS=$((PASS + 1))
  else
    echo -e "  ${YELLOW}⚠${NC} ${label}: ${actual}${unit} (limit: ${limit}${unit})"
    WARN=$((WARN + 1))
  fi
}

echo "╔══════════════════════════════════════════╗"
echo "║   VideoForge Performance Budget Check    ║"
echo "╚══════════════════════════════════════════╝"
echo ""

# 1. Package dependency counts
echo "── Dependencies ──"
SHARED_DEPS=$(jq '.dependencies // {} | length' packages/shared/package.json)
DESKTOP_DEPS=$(jq '.dependencies // {} | length' apps/desktop/package.json)
DESKTOP_DEV_DEPS=$(jq '.devDependencies // {} | length' apps/desktop/package.json)

check "shared dependencies" "$SHARED_DEPS" 10 ""
check "desktop dependencies" "$DESKTOP_DEPS" 40 ""
warn_check "desktop devDependencies" "$DESKTOP_DEV_DEPS" 50 ""
echo ""

# 2. Source file counts and sizes
echo "── Source Size ──"
SHARED_TS=$(find packages/shared/src -name '*.ts' | wc -l | tr -d ' ')
DESKTOP_TS=$(find apps/desktop/electron -name '*.ts' | wc -l | tr -d ' ')
RENDERER_TSX=$(find apps/desktop/src -name '*.ts' -o -name '*.tsx' | wc -l | tr -d ' ')
TOTAL_SRC=$((SHARED_TS + DESKTOP_TS + RENDERER_TSX))

warn_check "shared source files" "$SHARED_TS" 30 ""
warn_check "main process files" "$DESKTOP_TS" 80 ""
warn_check "renderer files" "$RENDERER_TSX" 60 ""
warn_check "total source files" "$TOTAL_SRC" 150 ""
echo ""

# 3. Lines of code (excluding tests and generated)
echo "── Lines of Code ──"
SHARED_LOC=$(find packages/shared/src -name '*.ts' ! -name '*.test.ts' -exec cat {} + | wc -l | tr -d ' ')
MAIN_LOC=$(find apps/desktop/electron -name '*.ts' ! -name '*.test.ts' -exec cat {} + | wc -l | tr -d ' ')
RENDERER_LOC=$(find apps/desktop/src -name '*.ts' -o -name '*.tsx' | xargs cat | wc -l | tr -d ' ')
TOTAL_LOC=$((SHARED_LOC + MAIN_LOC + RENDERER_LOC))

warn_check "shared LoC" "$SHARED_LOC" 3000 ""
warn_check "main process LoC" "$MAIN_LOC" 6000 ""
warn_check "renderer LoC" "$RENDERER_LOC" 5000 ""
echo "  Total LoC: ${TOTAL_LOC}"
echo ""

# 4. Typecheck speed
echo "── TypeScript Check ──"
TC_START=$(date +%s)
pnpm typecheck > /dev/null 2>&1
TC_END=$(date +%s)
TC_DURATION=$((TC_END - TC_START))

check "typecheck duration" "$TC_DURATION" 30 "s"
echo ""

# 5. Unit test speed
echo "── Unit Tests ──"
TEST_START=$(date +%s)
pnpm test > /dev/null 2>&1
TEST_END=$(date +%s)
TEST_DURATION=$((TEST_END - TEST_START))
TEST_COUNT=$(pnpm test 2>&1 | grep -o '[0-9]* passed' | awk '{sum += $1} END {print sum}')

check "test duration" "$TEST_DURATION" 30 "s"
echo "  Tests: ${TEST_COUNT:-?} passed"
echo ""

# 6. i18n coverage
echo "── i18n Coverage ──"
KO_KEYS=$(grep -cE "^\s+'[a-z]" apps/desktop/src/i18n/ko.ts || true)
EN_KEYS=$(grep -cE "^\s+'[a-z]" apps/desktop/src/i18n/en.ts || true)
if [ "$KO_KEYS" -eq "$EN_KEYS" ]; then
  echo -e "  ${GREEN}✓${NC} ko/en key count match: ${KO_KEYS} keys"
  PASS=$((PASS + 1))
else
  echo -e "  ${RED}✗${NC} ko/en key mismatch: ko=${KO_KEYS} en=${EN_KEYS}"
  FAIL=$((FAIL + 1))
fi
echo ""

# 7. Large file check (>300 lines, excluding tests)
echo "── Large Files (>300 lines, excluding tests) ──"
LARGE_COUNT=0
while IFS= read -r f; do
  LOC=$(wc -l < "$f" | tr -d ' ')
  if [ "$LOC" -gt 300 ]; then
    echo -e "  ${YELLOW}⚠${NC} ${f#./}: ${LOC} lines"
    LARGE_COUNT=$((LARGE_COUNT + 1))
  fi
done < <(find apps/desktop/src apps/desktop/electron packages/shared/src -name '*.ts' -o -name '*.tsx' | grep -v '.test.ts' | grep -v 'node_modules')

if [ "$LARGE_COUNT" -eq 0 ]; then
  echo -e "  ${GREEN}✓${NC} No files exceed 300 lines"
fi
echo ""

# Summary
echo "══════════════════════════════════════════"
echo -e "  ${GREEN}Passed${NC}: ${PASS}  ${YELLOW}Warnings${NC}: ${WARN}  ${RED}Failed${NC}: ${FAIL}"
echo "══════════════════════════════════════════"

if [ "$FAIL" -gt 0 ]; then
  exit 1
fi
