from enum import Enum
from typing import TYPE_CHECKING

from fastapi import status

if TYPE_CHECKING:
    from fastmcp.exceptions import ToolError


# ---------------------------------------------------------------------------
# Error codes (single source of truth — never duplicated as inline strings)
# ---------------------------------------------------------------------------


class ErrorCode(str, Enum):
    VALIDATION_ERROR = "VALIDATION_ERROR"
    NOT_FOUND = "NOT_FOUND"
    CONFLICT = "CONFLICT"
    UNPROCESSABLE = "UNPROCESSABLE"
    INTERNAL_ERROR = "INTERNAL_ERROR"

    def __str__(self) -> str:
        return self.value


# ---------------------------------------------------------------------------
# Domain error hierarchy
# ---------------------------------------------------------------------------


class DomainError(Exception):
    code: str = ErrorCode.INTERNAL_ERROR
    http_status: int = status.HTTP_500_INTERNAL_SERVER_ERROR

    def __init__(
        self,
        message: str,
        details: list[dict[str, str]] | None = None,
    ) -> None:
        super().__init__(message)
        self.message = message
        self.details = details

    def __repr__(self) -> str:
        return f"{self.__class__.__name__}[{self.code}]: {self.message}"

    def to_tool_error(self) -> "ToolError":
        # Deferred import avoids a hard dependency on fastmcp in core/; fastmcp is
        # an MCP-layer concern and must not bleed into the domain error hierarchy.
        from fastmcp.exceptions import ToolError

        return ToolError(f"[{self.code}] {self.message}")


class ValidationError(DomainError):
    code = ErrorCode.VALIDATION_ERROR
    http_status = status.HTTP_400_BAD_REQUEST


class NotFoundError(DomainError):
    code = ErrorCode.NOT_FOUND
    http_status = status.HTTP_404_NOT_FOUND


class ConflictError(DomainError):
    code = ErrorCode.CONFLICT
    http_status = status.HTTP_409_CONFLICT


class UnprocessableError(DomainError):
    code = ErrorCode.UNPROCESSABLE
    http_status = status.HTTP_422_UNPROCESSABLE_ENTITY


class InternalError(DomainError):
    code = ErrorCode.INTERNAL_ERROR
    http_status = status.HTTP_500_INTERNAL_SERVER_ERROR