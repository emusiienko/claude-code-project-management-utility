import logging
from typing import Any

from fastapi import Request, status
from fastapi.responses import JSONResponse

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Error codes (single source of truth — never duplicated as inline strings)
# ---------------------------------------------------------------------------
CODE_VALIDATION_ERROR = "VALIDATION_ERROR"
CODE_NOT_FOUND = "NOT_FOUND"
CODE_CONFLICT = "CONFLICT"
CODE_UNPROCESSABLE = "UNPROCESSABLE"
CODE_INTERNAL_ERROR = "INTERNAL_ERROR"


# ---------------------------------------------------------------------------
# Domain error hierarchy
# ---------------------------------------------------------------------------


class DomainError(Exception):
    code: str = CODE_INTERNAL_ERROR
    http_status: int = status.HTTP_500_INTERNAL_SERVER_ERROR

    def __init__(
        self,
        message: str,
        details: list[dict[str, str]] | None = None,
    ) -> None:
        super().__init__(message)
        self.message = message
        self.details = details


class ValidationError(DomainError):
    code = CODE_VALIDATION_ERROR
    http_status = status.HTTP_400_BAD_REQUEST


class NotFoundError(DomainError):
    code = CODE_NOT_FOUND
    http_status = status.HTTP_404_NOT_FOUND


class ConflictError(DomainError):
    code = CODE_CONFLICT
    http_status = status.HTTP_409_CONFLICT


class UnprocessableError(DomainError):
    code = CODE_UNPROCESSABLE
    http_status = status.HTTP_422_UNPROCESSABLE_ENTITY


class InternalError(DomainError):
    code = CODE_INTERNAL_ERROR
    http_status = status.HTTP_500_INTERNAL_SERVER_ERROR


# ---------------------------------------------------------------------------
# Error response helpers
# ---------------------------------------------------------------------------


def _build_error_body(
    error_message: str,
    code: str,
    details: list[dict[str, str]] | None = None,
) -> dict[str, Any]:
    body: dict[str, Any] = {"error": error_message, "code": code}
    if details:
        body["details"] = details
    return body


# ---------------------------------------------------------------------------
# FastAPI exception handlers
# ---------------------------------------------------------------------------


async def domain_error_handler(request: Request, exc: DomainError) -> JSONResponse:
    if exc.code == CODE_INTERNAL_ERROR:
        logger.error("Internal error: %s", exc.message, exc_info=exc)
        # Never expose internal details to the client for 500 errors.
        return JSONResponse(
            status_code=exc.http_status,
            content=_build_error_body("An unexpected error occurred.", CODE_INTERNAL_ERROR),
        )

    logger.debug("Domain error [%s]: %s", exc.code, exc.message)
    return JSONResponse(
        status_code=exc.http_status,
        content=_build_error_body(exc.message, exc.code, exc.details),
    )
