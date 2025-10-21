from __future__ import annotations

import argparse
from pathlib import Path
from typing import Literal

from mcp.server.fastmcp import Context, FastMCP
from pydantic import BaseModel, Field
from sqlfluff.core import Linter
from sqlfluff.core.config import FluffConfig
from sqlfluff.core.errors import SQLBaseError

REPO_ROOT = Path(__file__).resolve().parent
SERVER = FastMCP(
    name="snowflake-sql-linter",
    instructions=(
        "Tools for linting Snowflake SQL queries and files with sqlfluff. "
        "Use `lint_snowflake_query` for ad-hoc SQL and `lint_snowflake_file` for repository files."
    ),
)

# Cache for configuration and linter with invalidation support
_cached_config: FluffConfig | None = None
_cached_linter: Linter | None = None
_config_file_mtime: float | None = None


class LintIssue(BaseModel):
    # TODO: Flesh out LintIssue methods
class LintResult(BaseModel):
    # TODO: Flesh out LintResult methods
def _get_config_file_path() -> Path:
    # TODO: Implement _get_config_file_path
    pass
def _get_config_file_mtime() -> float | None:
    # TODO: Implement _get_config_file_mtime
    pass
def _should_invalidate_cache() -> bool:
    # TODO: Implement _should_invalidate_cache
    pass
def _load_config() -> FluffConfig:
    # TODO: Implement _load_config
    pass
def _get_linter() -> Linter:
    # TODO: Implement _get_linter
    pass
def _convert_violation(violation: SQLBaseError) -> LintIssue:
    # TODO: Implement _convert_violation
    pass
def _lint_source(source: str, subject: str) -> LintResult:
    # TODO: Implement _lint_source
    pass
def _resolve_sql_file(raw_path: str) -> Path:
    # TODO: Implement _resolve_sql_file
    pass
@SERVER.tool(name="lint_snowflake_query", description="Lint an in-memory Snowflake SQL query using sqlfluff.")
async def lint_snowflake_query(query: str, ctx: Context | None = None) -> LintResult:
    # TODO: Implement lint_snowflake_query
    pass
@SERVER.tool(name="lint_snowflake_file", description="Lint a Snowflake SQL file from the repository using sqlfluff.")
async def lint_snowflake_file(path: str, ctx: Context | None = None) -> LintResult:
    # TODO: Implement lint_snowflake_file
    pass
def _parse_args() -> argparse.Namespace:
    # TODO: Implement _parse_args
    pass
def main() -> None:
    # TODO: Implement main
    pass
if __name__ == "__main__":
    main()
