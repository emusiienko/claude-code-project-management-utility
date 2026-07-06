import logging
from typing import Any

from fastmcp.dependencies import Depends
from fastmcp.exceptions import ToolError

from app.container.mcp_dependencies import provide_settings_service
from app.core.errors import DomainError
from app.mcp.server import mcp_server_v1
from app.settings.schema import UpdateSettingsBody
from app.settings.service import SettingsService

logger = logging.getLogger(__name__)


@mcp_server_v1.tool()
async def get_system_settings(
    service: SettingsService = Depends(provide_settings_service),
) -> dict[str, Any]:
    try:
        return service.get_system_settings()
    except DomainError as exc:
        raise exc.to_tool_error() from exc
    except Exception as exc:
        logger.error("Unexpected error in get_system_settings: %s", exc, exc_info=exc)
        raise ToolError("Internal server error.") from exc


@mcp_server_v1.tool()
async def set_system_settings(
    body: UpdateSettingsBody,
    service: SettingsService = Depends(provide_settings_service),
) -> dict[str, Any]:
    try:
        return service.update_system_settings(body)
    except DomainError as exc:
        raise exc.to_tool_error() from exc
    except Exception as exc:
        logger.error("Unexpected error in set_system_settings: %s", exc, exc_info=exc)
        raise ToolError("Internal server error.") from exc


@mcp_server_v1.tool()
async def get_project_effective_settings(
    project_id: str,
    service: SettingsService = Depends(provide_settings_service),
) -> dict[str, Any]:
    try:
        return service.resolve_all(project_id=project_id)
    except DomainError as exc:
        raise exc.to_tool_error() from exc
    except Exception as exc:
        logger.error(
            "Unexpected error in get_project_effective_settings: %s", exc, exc_info=exc
        )
        raise ToolError("Internal server error.") from exc


@mcp_server_v1.tool()
async def set_project_settings(
    project_id: str,
    body: UpdateSettingsBody,
    service: SettingsService = Depends(provide_settings_service),
) -> dict[str, Any]:
    # Override fully replaces (never merges with) the system default for each key.
    try:
        return service.update_project_settings(project_id=project_id, body=body)
    except DomainError as exc:
        raise exc.to_tool_error() from exc
    except Exception as exc:
        logger.error("Unexpected error in set_project_settings: %s", exc, exc_info=exc)
        raise ToolError("Internal server error.") from exc


@mcp_server_v1.tool()
async def clear_project_setting(
    project_id: str,
    key: str,
    service: SettingsService = Depends(provide_settings_service),
) -> dict[str, Any]:
    # Clearing an absent override is a no-op — the system default is returned.
    try:
        return service.clear_project_setting(
            project_id=project_id,
            key=key,
        )
    except DomainError as exc:
        raise exc.to_tool_error() from exc
    except Exception as exc:
        logger.error("Unexpected error in clear_project_setting: %s", exc, exc_info=exc)
        raise ToolError("Internal server error.") from exc