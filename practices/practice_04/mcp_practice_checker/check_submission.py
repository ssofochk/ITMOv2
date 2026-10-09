#!/usr/bin/env python3
"""
MCP tool: check_submission(path: str) -> dict

Checks practice_04 artifacts in the given directory.
"""
import json
from pathlib import Path
from typing import Any


REQUIRED_ARTIFACTS = [
    "AGENTS.md",
    "opencode.json",
    "practices/practice_04/scripts/check.sh",
    ".opencode/skills/test-driven-development/SKILL.md",
    ".opencode/skills/test-driven-development/writing-good-tests.md",
    ".opencode/plugins/check-after-edit.js",
    "practices/practice_04/mcp_practice_checker",
]

OPTIONAL_ARTIFACTS = [
    "practices/practice_04/reflection.md",
]


def find_repo_root(start_path: Path) -> Path:
    """
    Find the repository root by walking up from start_path
    looking for .git directory or opencode.json file.
    """
    current = start_path.resolve()

    # If start_path is a file, start from its parent
    if current.is_file():
        current = current.parent

    while current != current.parent:  # Stop at filesystem root
        if (current / ".git").exists() or (current / "opencode.json").exists():
            return current
        current = current.parent

    # If no marker found, return the original resolved path
    return start_path.resolve()


def check_submission(path: str) -> dict[str, Any]:
    """
    Check practice_04 submission artifacts.

    Returns:
        dict with ok, checked_root, missing (and error/message on failure)
    """
    start_path = Path(path)

    # A. Path does not exist
    if not start_path.exists():
        return {
            "ok": False,
            "error": f"Path does not exist: {path}",
            "checked_root": str(start_path.resolve()),
            "missing": [],
        }

    # B. Path exists but is not a directory
    if not start_path.is_dir():
        return {
            "ok": False,
            "error": f"Path is not a directory: {path}",
            "checked_root": str(start_path.resolve()),
            "missing": [],
        }

    # C. Valid directory - find repo root
    repo_root = find_repo_root(start_path)

    # Check artifacts relative to repo root
    missing = []
    required_missing = []

    for artifact in REQUIRED_ARTIFACTS:
        artifact_path = repo_root / artifact
        if not artifact_path.exists():
            missing.append(artifact)
            required_missing.append(artifact)

    # Optional artifacts - track but don't fail
    for artifact in OPTIONAL_ARTIFACTS:
        artifact_path = repo_root / artifact
        if not artifact_path.exists():
            missing.append(artifact + " (optional)")

    ok = len(required_missing) == 0

    return {
        "ok": ok,
        "checked_root": str(repo_root),
        "missing": missing,
    }


if __name__ == "__main__":
    # Quick manual test
    import sys
    if len(sys.argv) > 1:
        result = check_submission(sys.argv[1])
        print(json.dumps(result, indent=2))