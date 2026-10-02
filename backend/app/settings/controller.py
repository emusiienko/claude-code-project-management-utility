from dependency_injector.wiring import Closing, Provide, inject
from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session

from app.container.container import AppContainer
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
@inject
async def get_system_settings(
    _db: Session = Depends(Closing[Provide[AppContainer.db_session]]),
    service: SettingsService = Depends(Provide[AppContainer.settings_service]),
) -> dict:
    data = service.get_system_settings()
    return {"data": SettingsResponse.from_dict(data).model_dump()}


@router.put(
    "/system/settings",
    status_code=status.HTTP_200_OK,
    response_model=dict,
)
@inject
async def update_system_settings(
    body: UpdateSettingsBody,
    _db: Session = Depends(Closing[Provide[AppContainer.db_session]]),
    service: SettingsService = Depends(Provide[AppContainer.settings_service]),
) -> dict:
    data = service.update_system_settings(body)
    return {"data": SettingsResponse.from_dict(data).model_dump()}


# ---------------------------------------------------------------------------
# Project settings (overrides)
# ---------------------------------------------------------------------------


@router.get(
    "/projects/{project_id}/settings",
    status_code=status.HTTP_200_OK,
    response_model=dict,
)
@inject
async def get_project_settings(
    project_id: str,
    _db: Session = Depends(Closing[Provide[AppContainer.db_session]]),
    service: SettingsService = Depends(Provide[AppContainer.settings_service]),
) -> dict:
    data = service.get_project_settings(project_id)
    return {
        "data": SettingsOverridesResponse.from_dict(data).model_dump(exclude_none=True)
    }


@router.get(
    "/projects/{project_id}/settings/effective",
    status_code=status.HTTP_200_OK,
    response_model=dict,
)
@inject
async def get_effective_project_settings(
    project_id: str,
    _db: Session = Depends(Closing[Provide[AppContainer.db_session]]),
    service: SettingsService = Depends(Provide[AppContainer.settings_service]),
) -> dict:
    data = service.get_effective_settings(project_id)
    return {"data": SettingsResponse.from_dict(data).model_dump()}


@router.put(
    "/projects/{project_id}/settings",
    status_code=status.HTTP_200_OK,
    response_model=dict,
)
@inject
async def update_project_settings(
    project_id: str,
    body: UpdateSettingsBody,
    _db: Session = Depends(Closing[Provide[AppContainer.db_session]]),
    service: SettingsService = Depends(Provide[AppContainer.settings_service]),
) -> dict:
    data = service.update_project_settings(project_id, body)
    return {"data": SettingsResponse.from_dict(data).model_dump()}
