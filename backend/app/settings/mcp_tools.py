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

# ---------------------------------------------------------------------------
# link_types shape note (for MCP callers)
# ---------------------------------------------------------------------------
# Unlike the other four dictionaries (plain string arrays), `link_types` is a
# structured object array.  Each entry must be:
#   {"value": "<slug>", "outbound": "<label>", "inbound": "<label>"}
# where all three fields are required non-empty strings (1–200 chars) and
# `value` must be unique within the array.
#
# Example:
#   [
#     {"value": "depends-on", "outbound": "depends on", "inbound": "dependent"},
#     {"value": "creates",    "outbound": "creates",    "inbound": "created by"}
#   ]
#
# Passing a plain string instead of an object, omitting any field, or
# supplying duplicate `value` entries raises a 422 validation error from the
# service.  All validation lives in the service layer — these tools do not
# duplicate it.
# ---------------------------------------------------------------------------

# ---------------------------------------------------------------------------
# default_web_ui_role shape note (for MCP callers)
# ---------------------------------------------------------------------------
# Unlike the five dictionaries (list-valued), `default_web_ui_role` is a
# single scalar string. It is the role the Web UI pre-fills on any
# author/creator-style field it composes (currently: a Comment's
# `author_role`). On write it must be a non-empty member of the effective
# `participant_roles` for that scope (system `participant_roles` for a
# system write; the project's effective `participant_roles` for a project
# override) — violating this returns 422. It is never re-validated on read
# and never constrains a comment's own free-form `author_role`.
# ---------------------------------------------------------------------------


@mcp_server_v1.tool()
async def get_system_settings(
    service: SettingsService = Depends(provide_settings_service),
) -> dict[str, Any]:
    """Return the system-level settings for all five dictionaries plus
    `default_web_ui_role`.

    The response contains all five dictionary keys and the scalar
    `default_web_ui_role` key.  Four keys (`task_statuses`, `task_types`,
    `story_statuses`, `participant_roles`) are plain string arrays.
    `link_types` is a structured object array — see module-level note for
    the entry shape.  `default_web_ui_role` is a single string — see its
    module-level note.
    """
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
    """Update one or more system-level settings.

    Only the keys present in `body` are updated; absent keys are left unchanged.
    The four plain-string dictionaries (`task_statuses`, `task_types`,
    `story_statuses`, `participant_roles`) accept ``list[str]``.

    `link_types` must be provided as a structured object array.  Each entry
    must have the shape ``{"value": str, "outbound": str, "inbound": str}``
    with all three fields non-empty (1–200 chars) and unique `value` across
    the array.  Passing a plain string or omitting any field returns 422.

    `default_web_ui_role` accepts a single non-empty string that must be a
    member of the system `participant_roles` — see module-level note.

    Returns the updated system settings for all six keys.
    """
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
    """Return the effective (merged) settings for a project.

    Each key is resolved from the project-level override when one exists,
    otherwise from the system default.  All six keys are present in the
    response.  `link_types` is a structured object array — see module-level
    note for the entry shape.  `default_web_ui_role` is a single string —
    see its module-level note.
    """
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
    """Set project-level overrides for one or more settings.

    Each provided key fully replaces (never merges with) the system default
    for that key.  Absent keys are left unchanged.

    The four plain-string dictionaries (`task_statuses`, `task_types`,
    `story_statuses`, `participant_roles`) accept ``list[str]``.

    `link_types` must be provided as a structured object array.  Each entry
    must have the shape ``{"value": str, "outbound": str, "inbound": str}``
    with all three fields non-empty (1–200 chars) and unique `value` across
    the array.  Passing a plain string or omitting any field returns 422.

    `default_web_ui_role` accepts a single non-empty string that must be a
    member of the project's *effective* `participant_roles` — see
    module-level note.

    Returns the updated project overrides (only keys that have an override).
    """
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
    """Remove a project-level override for a single settings key.

    After clearing, the effective value for that key falls back to the system
    default.  Clearing an absent override is a no-op — the system default is
    returned.  `key` must be one of the six valid settings keys (five
    dictionaries plus `default_web_ui_role`).
    """
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
