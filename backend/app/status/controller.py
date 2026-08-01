from dependency_injector.wiring import Provide, inject
from fastapi import APIRouter, Depends, status

from app.container.container import AppContainer
from app.status.service import StatusService

router = APIRouter(tags=["status"])


@router.get(
    "",
    status_code=status.HTTP_200_OK,
    response_model=dict,
)
@inject
async def get_status(
    service: StatusService = Depends(Provide[AppContainer.status_service]),
) -> dict:
    result = service.get_status()
    return {"data": result.model_dump()}
