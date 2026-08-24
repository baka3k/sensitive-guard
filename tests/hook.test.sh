#!/usr/bin/env bash

set -u

PROJECT_ROOT=$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)
HOOK_SOURCE="$PROJECT_ROOT/lib/hook.sh"
TEST_ROOT=$(mktemp -d "${TMPDIR:-/tmp}/sensitive-guard-test.XXXXXX")
PASSED=0
FAILED=0

cleanup() {
  rm -rf "$TEST_ROOT"
}
trap cleanup EXIT

run_case() {
  local name="$1" term="$2" content="$3" expected_status="$4"
  local repo="$TEST_ROOT/$name" actual_status=0

  mkdir -p "$repo"
  git -C "$repo" init -q
  cp "$HOOK_SOURCE" "$repo/.git/hooks/pre-commit"
  chmod +x "$repo/.git/hooks/pre-commit"
  printf '%s\n' "$term" > "$repo/.sensitive-terms"
  printf '%s\n' "$content" > "$repo/sample.txt"
  git -C "$repo" add sample.txt

  (
    cd "$repo" || exit 2
    .git/hooks/pre-commit >/dev/null 2>&1
  ) || actual_status=$?

  if [ "$actual_status" -eq "$expected_status" ]; then
    printf 'ok - %s\n' "$name"
    PASSED=$((PASSED + 1))
  else
    printf 'not ok - %s (expected %s, got %s)\n' \
      "$name" "$expected_status" "$actual_status"
    FAILED=$((FAILED + 1))
  fi
}

run_case "whole-word-no-substring" "baka3k" "mybaka3kvalue" 0
run_case "whole-word-exact" "baka3k" "baka3k" 1
run_case "whole-word-ignore-case" "baka3k" "BAKA3K" 1
run_case "whole-word-underscore" "baka3k" "baka3k_client" 0
run_case "case-sensitive-pass" "case:BAKA3K" "baka3k" 0
run_case "case-sensitive-block" "case:BAKA3K" "BAKA3K" 1
run_case "wildcard-prefix" "baka3k*" "baka3k_client" 1
run_case "wildcard-suffix" "*baka3k" "mybaka3k" 1
run_case "wildcard-contains" "*baka3k*" "mybaka3kvalue" 1
run_case "wildcard-middle" "baka*3k" "baka-project-3k" 1
run_case "wildcard-case-sensitive-pass" "case:BAKA3K*" "baka3k_client" 0
run_case "wildcard-case-sensitive-block" "case:BAKA3K*" "BAKA3K_client" 1
run_case "regex-character-literal-pass" "baka3k.dev" "baka3kXdev" 0
run_case "regex-character-literal-block" "baka3k.dev" "baka3k.dev" 1
run_case "comments-ignored" $'#baka3k\n\nother-term' "baka3k" 0

printf '\n%s passed, %s failed\n' "$PASSED" "$FAILED"
[ "$FAILED" -eq 0 ]
