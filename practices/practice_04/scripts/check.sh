#!/usr/bin/env bash
set -euo pipefail

ROOT="/mnt/c/Users/user/Documents/avito_ai/ITMOv2"
FAIL=0

echo "=== practice_04 runner check ==="

# 1. AGENTS.md exists
if [ -f "$ROOT/AGENTS.md" ]; then
  echo "[OK] AGENTS.md exists"
else
  echo "[FAIL] AGENTS.md missing"
  FAIL=1
fi

# 2. Skill files exist
SKILL_DIR="$ROOT/.opencode/skills/test-driven-development"
if [ -f "$SKILL_DIR/SKILL.md" ]; then
  echo "[OK] SKILL.md exists"
else
  echo "[FAIL] SKILL.md missing"
  FAIL=1
fi

if [ -f "$SKILL_DIR/writing-good-tests.md" ]; then
  echo "[OK] writing-good-tests.md exists"
else
  echo "[FAIL] writing-good-tests.md missing"
  FAIL=1
fi

# 3. opencode.json exists
if [ -f "$ROOT/opencode.json" ]; then
  echo "[OK] opencode.json exists"
else
  echo "[FAIL] opencode.json missing"
  FAIL=1
fi

# 4. context7 config in opencode.json
if grep -q '"context7"' "$ROOT/opencode.json" 2>/dev/null; then
  echo "[OK] context7 config present in opencode.json"
else
  echo "[FAIL] context7 config missing in opencode.json"
  FAIL=1
fi

# 5. practice-checker MCP server exists
MCP_DIR="$ROOT/practices/practice_04/mcp_practice_checker"
if [ -f "$MCP_DIR/server.py" ] && [ -f "$MCP_DIR/check_submission.py" ]; then
  echo "[OK] practice-checker MCP server files exist"
else
  echo "[FAIL] practice-checker MCP server files missing"
  FAIL=1
fi

# 6. Run MCP tests
echo ""
echo "=== Running MCP unit tests ==="
if python3 "$MCP_DIR/test_check_submission.py"; then
  echo "[OK] MCP unit tests passed"
else
  echo "[FAIL] MCP unit tests failed"
  FAIL=1
fi

echo "=== done ==="
exit $FAIL