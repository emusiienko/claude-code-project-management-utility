import logging

from fastmcp.dependencies import Depends
from fastmcp.exceptions import ToolError

from app.container.mcp_dependencies import provide_status_service
from app.core.errors import DomainError
from app.mcp.server import mcp_server_v1
from app.status.service import StatusService

logger = logging.getLogger(__name__)


@mcp_server_v1.tool()
async def get_status(
    service: StatusService = Depends(provide_status_service),
) -> dict:
    try:
        result = service.get_status()
        return {"data": result.model_dump()}
    except DomainError as exc:
        raise exc.to_tool_error() from exc
    except Exception as exc:
        logger.error("Unexpected error in get_status: %s", exc, exc_info=exc)
        raise ToolError("Internal server error.") from exc
