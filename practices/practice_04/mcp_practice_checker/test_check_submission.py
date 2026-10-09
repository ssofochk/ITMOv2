#!/usr/bin/env python3
"""
Tests for check_submission logic.
Run with: python -m pytest practices/practice_04/mcp_practice_checker/test_check_submission.py -v
"""
import os
import sys
import tempfile
import shutil
from pathlib import Path

# Add the mcp_practice_checker to path
sys.path.insert(0, str(Path(__file__).parent))

from check_submission import check_submission


def test_nonexistent_path_returns_ok_false():
    """A. If path does not exist: return ok: false with clear error."""
    result = check_submission("/this/path/does/not/exist")
    assert result["ok"] is False
    assert "error" in result or "message" in result
    print("PASS: nonexistent path returns ok: false")


def test_existing_file_not_directory_returns_ok_false():
    """B. If path exists but is not a directory: return ok: false."""
    with tempfile.NamedTemporaryFile() as tmp:
        result = check_submission(tmp.name)
        assert result["ok"] is False
        assert "error" in result or "message" in result
    print("PASS: existing file (not dir) returns ok: false")


def test_valid_directory_returns_structured_result():
    """C. For valid directory (repo root): return ok: true with checked_root and missing list."""
    # Create a temp directory with all required artifacts at repo root level
    with tempfile.TemporaryDirectory() as tmpdir:
        root = Path(tmpdir)

        # Create all required files with parent directories
        (root / "AGENTS.md").write_text("# Rules\n")
        (root / "opencode.json").write_text('{"mcp": {"servers": {"context7": {}}}}')
        (root / "practices" / "practice_04" / "scripts").mkdir(parents=True)
        (root / "practices" / "practice_04" / "scripts" / "check.sh").write_text("#!/bin/bash\necho ok")
        (root / ".opencode" / "skills" / "test-driven-development").mkdir(parents=True)
        (root / ".opencode" / "skills" / "test-driven-development" / "SKILL.md").write_text("# Skill")
        (root / ".opencode" / "skills" / "test-driven-development" / "writing-good-tests.md").write_text("# Tests")
        (root / ".opencode" / "plugins").mkdir(parents=True)
        (root / ".opencode" / "plugins" / "check-after-edit.js").write_text("export default {}")
        (root / "practices" / "practice_04" / "mcp_practice_checker").mkdir(parents=True)
        (root / "practices" / "practice_04" / "mcp_practice_checker" / "check_submission.py").write_text("# MCP")

        result = check_submission(str(root))

        assert result["ok"] is True
        assert result["checked_root"] == str(root)
        assert "missing" in result
        assert isinstance(result["missing"], list)
        # All should be present, so missing should be empty (or only reflection.md)
        # reflection.md is optional per spec
    print("PASS: valid directory (repo root) returns structured result with ok: true")


def test_missing_required_artifacts_make_ok_false():
    """Missing REQUIRED artifacts should make ok: false."""
    with tempfile.TemporaryDirectory() as tmpdir:
        root = Path(tmpdir)

        # Create only some files - missing most required ones
        (root / "AGENTS.md").write_text("# Rules\n")
        (root / "opencode.json").write_text('{}')

        result = check_submission(str(root))

        # BUG REPRODUCTION: Currently returns ok: true, should be ok: false
        assert result["ok"] is False, f"Expected ok: false when required artifacts missing, got ok: {result['ok']}"
        assert "missing" in result
        missing = result["missing"]
        # Should list the missing required artifacts
        assert any("SKILL.md" in m for m in missing)
        assert any("writing-good-tests.md" in m for m in missing)
        assert any("check-after-edit.js" in m for m in missing)
        assert any("check.sh" in m for m in missing)
        assert any("mcp_practice_checker" in m for m in missing)
    print("PASS: missing required artifacts make ok: false")


def test_reflection_md_optional_not_required():
    """reflection.md absence should not cause ok: false, may appear in missing."""
    with tempfile.TemporaryDirectory() as tmpdir:
        root = Path(tmpdir)

        # Create all required files except reflection.md
        (root / "AGENTS.md").write_text("# Rules\n")
        (root / "opencode.json").write_text('{"mcp": {"servers": {"context7": {}}}}')
        (root / "practices" / "practice_04" / "scripts").mkdir(parents=True)
        (root / "practices" / "practice_04" / "scripts" / "check.sh").write_text("#!/bin/bash\necho ok")
        (root / ".opencode" / "skills" / "test-driven-development").mkdir(parents=True)
        (root / ".opencode" / "skills" / "test-driven-development" / "SKILL.md").write_text("# Skill")
        (root / ".opencode" / "skills" / "test-driven-development" / "writing-good-tests.md").write_text("# Tests")
        (root / ".opencode" / "plugins").mkdir(parents=True)
        (root / ".opencode" / "plugins" / "check-after-edit.js").write_text("export default {}")
        (root / "practices" / "practice_04" / "mcp_practice_checker").mkdir(parents=True)
        (root / "practices" / "practice_04" / "mcp_practice_checker" / "check_submission.py").write_text("# MCP")

        result = check_submission(str(root))

        assert result["ok"] is True
        # reflection.md may be in missing but should not make ok=false
    print("PASS: reflection.md optional")


def test_subdirectory_finds_repo_root_via_git():
    """When given a subdirectory (e.g. practices/practice_04), should find repo root via .git."""
    with tempfile.TemporaryDirectory() as tmpdir:
        root = Path(tmpdir)

        # Create .git to mark repo root
        (root / ".git").mkdir()

        # Create all required files at repo root
        (root / "AGENTS.md").write_text("# Rules\n")
        (root / "opencode.json").write_text('{"mcp": {"servers": {"context7": {}}}}')
        (root / "practices" / "practice_04" / "scripts").mkdir(parents=True)
        (root / "practices" / "practice_04" / "scripts" / "check.sh").write_text("#!/bin/bash\necho ok")
        (root / ".opencode" / "skills" / "test-driven-development").mkdir(parents=True)
        (root / ".opencode" / "skills" / "test-driven-development" / "SKILL.md").write_text("# Skill")
        (root / ".opencode" / "skills" / "test-driven-development" / "writing-good-tests.md").write_text("# Tests")
        (root / ".opencode" / "plugins").mkdir(parents=True)
        (root / ".opencode" / "plugins" / "check-after-edit.js").write_text("export default {}")
        (root / "practices" / "practice_04" / "mcp_practice_checker").mkdir(parents=True)
        (root / "practices" / "practice_04" / "mcp_practice_checker" / "check_submission.py").write_text("# MCP")

        # Pass the subdirectory, not the root
        subdir = root / "practices" / "practice_04"
        result = check_submission(str(subdir))

        # BUG REPRODUCTION: Currently checked_root is the subdir, should be the repo root
        assert result["checked_root"] == str(root), f"Expected checked_root={root}, got {result['checked_root']}"
        assert result["ok"] is True
    print("PASS: subdirectory finds repo root via .git")


def test_subdirectory_finds_repo_root_via_opencode_json():
    """When given a subdirectory, should find repo root via opencode.json if no .git."""
    with tempfile.TemporaryDirectory() as tmpdir:
        root = Path(tmpdir)

        # NO .git directory - use opencode.json as marker
        (root / "opencode.json").write_text('{"mcp": {"servers": {"context7": {}}}}')

        # Create all required files at repo root
        (root / "AGENTS.md").write_text("# Rules\n")
        (root / "practices" / "practice_04" / "scripts").mkdir(parents=True)
        (root / "practices" / "practice_04" / "scripts" / "check.sh").write_text("#!/bin/bash\necho ok")
        (root / ".opencode" / "skills" / "test-driven-development").mkdir(parents=True)
        (root / ".opencode" / "skills" / "test-driven-development" / "SKILL.md").write_text("# Skill")
        (root / ".opencode" / "skills" / "test-driven-development" / "writing-good-tests.md").write_text("# Tests")
        (root / ".opencode" / "plugins").mkdir(parents=True)
        (root / ".opencode" / "plugins" / "check-after-edit.js").write_text("export default {}")
        (root / "practices" / "practice_04" / "mcp_practice_checker").mkdir(parents=True)
        (root / "practices" / "practice_04" / "mcp_practice_checker" / "check_submission.py").write_text("# MCP")

        # Pass the subdirectory, not the root
        subdir = root / "practices" / "practice_04"
        result = check_submission(str(subdir))

        # BUG REPRODUCTION: Currently checked_root is the subdir, should be the repo root
        assert result["checked_root"] == str(root), f"Expected checked_root={root}, got {result['checked_root']}"
        assert result["ok"] is True
    print("PASS: subdirectory finds repo root via opencode.json")


def test_subdirectory_with_missing_artifacts_makes_ok_false():
    """When given subdirectory with missing required artifacts, ok should be false."""
    with tempfile.TemporaryDirectory() as tmpdir:
        root = Path(tmpdir)

        # Create .git to mark repo root
        (root / ".git").mkdir()

        # Create only some required files
        (root / "AGENTS.md").write_text("# Rules\n")
        (root / "opencode.json").write_text('{}')

        # Pass the subdirectory
        subdir = root / "practices" / "practice_04"
        subdir.mkdir(parents=True)

        result = check_submission(str(subdir))

        # BUG REPRODUCTION: Currently returns ok: true, should be ok: false
        assert result["checked_root"] == str(root), f"Expected checked_root={root}, got {result['checked_root']}"
        assert result["ok"] is False, f"Expected ok: false when required artifacts missing, got ok: {result['ok']}"
    print("PASS: subdirectory with missing artifacts makes ok: false")


if __name__ == "__main__":
    print("Running tests...")
    try:
        test_nonexistent_path_returns_ok_false()
        test_existing_file_not_directory_returns_ok_false()
        test_valid_directory_returns_structured_result()
        test_missing_required_artifacts_make_ok_false()
        test_reflection_md_optional_not_required()
        test_subdirectory_finds_repo_root_via_git()
        test_subdirectory_finds_repo_root_via_opencode_json()
        test_subdirectory_with_missing_artifacts_makes_ok_false()
        print("\n=== ALL TESTS PASSED ===")
    except AssertionError as e:
        print(f"\n=== TEST FAILED: {e} ===")
        sys.exit(1)
    except Exception as e:
        print(f"\n=== TEST ERROR: {e} ===")
        sys.exit(1)