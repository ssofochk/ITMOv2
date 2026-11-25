#!/usr/bin/env python3
"""
MCP Server: practice-checker (FastMCP stdio implementation)

Provides the check_submission tool for validating practice_04 artifacts.
"""
from fastmcp import FastMCP

from check_submission import check_submission

mcp = FastMCP("practice-checker")


@mcp.tool
def check_submission_tool(path: str) -> dict:
    """Check practice_04 submission artifacts in the given directory."""
    return check_submission(path)


if __name__ == "__main__":
    mcp.run()