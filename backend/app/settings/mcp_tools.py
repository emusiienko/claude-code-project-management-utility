import logging
from contextlib import contextmanager
from typing import Any, Generator

from mcp.server.fastmcp import FastMCP
from mcp.shared.exceptions import McpError
from mcp.types import INTERNAL_ERROR, INVALID_PARAMS, ErrorData

from app.container import container
from app.container.project_checker import SqlProjectChecker
from app.core.errors import DomainError
from app.settings.repository import ProjectSettingsRepository, SystemSettingsRepository
from app.settings.service import SettingsService

logger = logging.getLogger(__name__)


@contextmanager
def _build_service() -> Generator[SettingsService, None, None]:
    # Builds a SettingsService with a single shared DB session for the
    # duration of one MCP tool call.
    #
    # All three repositories receive the same Session instance so writes
    # within a tool call are atomic.  session.begin() commits on clean exit
    # and rolls back on any exception.  The session is always closed in the
    # finally block regardless of outcome.
    #
    # container.session_factory() returns the Singleton sessionmaker; calling
    # it again () produces a new Session.  This bypasses the container's
    # per-call Factory scoping (designed for FastAPI Depends) so that all
    # repositories share the same session.
    session = container.session_factory()()
    try:
        with session.begin():
            yield SettingsService(
                system_repo=SystemSettingsRepository(session=session),
                project_repo=ProjectSettingsRepository(session=session),
                project_checker=SqlProjectChecker(session=session),
            )
    finally:
        session.close()


def _to_mcp_error(exc: DomainError) -> McpError:
    # Maps a domain error to McpError, preserving the error code and message.
    # Uses INVALID_PARAMS (-32602) for client errors (4xx) and INTERNAL_ERROR
    # (-32603) for server errors (5xx).
    mcp_code = INVALID_PARAMS if exc.http_status < 500 else INTERNAL_ERROR
    return McpError(ErrorData(code=mcp_code, message=f"[{exc.code}] {exc.message}"))


def register_settings_tools(mcp_server: FastMCP) -> None:
    # Registers all Settings MCP tools on the provided FastMCP server instance.
    # Called once from mcp/server.py at startup.

    @mcp_server.tool()
    def get_system_settings() -> dict[str, Any]:
        try:
            with _build_service() as svc:
                return svc.get_system_settings()
        except DomainError as exc:
            raise _to_mcp_error(exc) from exc
        except Exception as exc:
            logger.error("Unexpected error in get_system_settings: %s", exc, exc_info=exc)
            raise McpError(ErrorData(code=-32603, message="Internal server error.")) from exc

    @mcp_server.tool()
    def set_system_setting(key: str, values: list[str]) -> dict[str, Any]:
        try:
            with _build_service() as svc:
                return svc.update_system_setting(key=key, values=values)
        except DomainError as exc:
            raise _to_mcp_error(exc) from exc
        except Exception as exc:
            logger.error("Unexpected error in set_system_setting: %s", exc, exc_info=exc)
            raise McpError(ErrorData(code=-32603, message="Internal server error.")) from exc

    @mcp_server.tool()
    def get_project_effective_settings(project_id: str) -> dict[str, Any]:
        # Returns effective settings for a project: project override per key if present,
        # otherwise the system default.  Returns NOT_FOUND if the project does not exist.
        try:
            with _build_service() as svc:
                return svc.resolve_all(project_id=project_id)
        except DomainError as exc:
            raise _to_mcp_error(exc) from exc
        except Exception as exc:
            logger.error(
                "Unexpected error in get_project_effective_settings: %s", exc, exc_info=exc
            )
            raise McpError(ErrorData(code=-32603, message="Internal server error.")) from exc

    @mcp_server.tool()
    def set_project_setting(
        project_id: str,
        key: str,
        values: list[str],
    ) -> dict[str, Any]:
        # Override fully replaces (never merges with) the system default for the key.
        # Returns the full effective settings for the project after the update.
        try:
            with _build_service() as svc:
                return svc.update_project_setting(
                    project_id=project_id,
                    key=key,
                    values=values,
                )
        except DomainError as exc:
            raise _to_mcp_error(exc) from exc
        except Exception as exc:
            logger.error("Unexpected error in set_project_setting: %s", exc, exc_info=exc)
            raise McpError(ErrorData(code=-32603, message="Internal server error.")) from exc

    @mcp_server.tool()
    def clear_project_setting(project_id: str, key: str) -> dict[str, Any]:
        # Removes the project override for one key; other keys are unaffected.
        # Clearing an absent override is a no-op — the system default is returned.
        # Returns the full effective settings after the change.
        try:
            with _build_service() as svc:
                return svc.clear_project_setting(
                    project_id=project_id,
                    key=key,
                )
        except DomainError as exc:
            raise _to_mcp_error(exc) from exc
        except Exception as exc:
            logger.error("Unexpected error in clear_project_setting: %s", exc, exc_info=exc)
            raise McpError(ErrorData(code=-32603, message="Internal server error.")) from exc
