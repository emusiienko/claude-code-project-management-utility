import logging
from typing import Any

from fastapi import Request
from fastapi.responses import JSONResponse

from app.core.errors import DomainError, ErrorCode

logger = logging.getLogger(__name__)


def _build_error_body(
    error_message: str,
    code: str,
    details: list[dict[str, str]] | None = None,
) -> dict[str, Any]:
    body: dict[str, Any] = {"error": error_message, "code": code}
    if details:
        body["details"] = details
    return body


async def domain_error_handler(
    request: Request, exc: DomainError
) -> JSONResponse:  # noqa: ARG001
    if exc.code == ErrorCode.INTERNAL_ERROR:
        logger.error("Internal error: %s", exc.message, exc_info=exc)
        # Never expose internal details to the client for 500 errors.
        return JSONResponse(
            status_code=exc.http_status,
            content=_build_error_body(
                "An unexpected error occurred.", ErrorCode.INTERNAL_ERROR
            ),
        )

    logger.debug("Domain error [%s]: %s", exc.code, exc.message)
    return JSONResponse(
        status_code=exc.http_status,
        content=_build_error_body(exc.message, exc.code, exc.details),
    )
