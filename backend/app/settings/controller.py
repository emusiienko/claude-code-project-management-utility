from fastapi import APIRouter, Depends, status

from app.settings.dependencies import get_settings_service
from app.settings.schema import (
    SettingsOverridesResponse,
    SettingsResponse,
    UpdateSettingsBody,
)
from app.settings.service import SettingsService

router = APIRouter(tags=["settings"])


# ---------------------------------------------------------------------------
# System settings
# ---------------------------------------------------------------------------


@router.get(
    "/system/settings",
    status_code=status.HTTP_200_OK,
    response_model=dict,
)
def get_system_settings(
    service: SettingsService = Depends(get_settings_service),
) -> dict:
    data = service.get_system_settings()
    return {"data": SettingsResponse.from_dict(data).model_dump()}


@router.put(
    "/system/settings",
    status_code=status.HTTP_200_OK,
    response_model=dict,
)
def update_system_settings(
    body: UpdateSettingsBody,
    service: SettingsService = Depends(get_settings_service),
) -> dict:
    # Apply each provided key in sequence within the same session.
    # ValidationError (400) is raised by the service for unknown keys or
    # empty values and mapped to the standard error envelope by the centralized
    # handler — no error handling here.
    pairs = body.to_key_value_pairs()
    if not pairs:
        # No keys provided — return current settings without any write.
        data = service.get_system_settings()
        return {"data": SettingsResponse.from_dict(data).model_dump()}

    result: dict[str, list[str]] = {}
    for key, values in pairs:
        result = service.update_system_setting(key, values)
    return {"data": SettingsResponse.from_dict(result).model_dump()}


# ---------------------------------------------------------------------------
# Project settings (overrides)
# ---------------------------------------------------------------------------


@router.get(
    "/projects/{project_id}/settings",
    status_code=status.HTTP_200_OK,
    response_model=dict,
)
def get_project_settings(
    project_id: str,
    service: SettingsService = Depends(get_settings_service),
) -> dict:
    # Returns only stored overrides; {} (empty object) when none exist.
    # NotFoundError (404) is raised by the service if the project does not exist.
    data = service.get_project_settings(project_id)
    return {
        "data": SettingsOverridesResponse.from_dict(data).model_dump(exclude_none=True)
    }


@router.get(
    "/projects/{project_id}/settings/effective",
    status_code=status.HTTP_200_OK,
    response_model=dict,
)
def get_effective_project_settings(
    project_id: str,
    service: SettingsService = Depends(get_settings_service),
) -> dict:
    # Returns the resolved Settings for all six keys:
    # project override if a row exists, otherwise the system default.
    # NotFoundError (404) is raised by the service if the project does not exist.
    data = service.get_effective_settings(project_id)
    return {"data": SettingsResponse.from_dict(data).model_dump()}


@router.put(
    "/projects/{project_id}/settings",
    status_code=status.HTTP_200_OK,
    response_model=dict,
)
def update_project_settings(
    project_id: str,
    body: UpdateSettingsBody,
    service: SettingsService = Depends(get_settings_service),
) -> dict:
    # Applies each provided key as a full replace override for the project.
    # Returns effective settings (all six keys resolved) after the update.
    # ValidationError (400) for unknown keys or empty values.
    # NotFoundError (404) if the project does not exist.
    pairs = body.to_key_value_pairs()
    if not pairs:
        # No keys provided — assert project exists and return effective settings.
        data = service.get_effective_settings(project_id)
        return {"data": SettingsResponse.from_dict(data).model_dump()}

    result: dict[str, list[str]] = {}
    for key, values in pairs:
        result = service.update_project_setting(project_id, key, values)
    return {"data": SettingsResponse.from_dict(result).model_dump()}
