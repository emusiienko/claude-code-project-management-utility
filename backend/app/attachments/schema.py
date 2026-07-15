import datetime
import uuid
from typing import Annotated, Literal, Union

from pydantic import BaseModel, ConfigDict, Field, TypeAdapter, field_validator

# ---------------------------------------------------------------------------
# Domain constants — single source of truth for kinds, containers, and the
# per-kind MIME allow-lists / size limit.
# ---------------------------------------------------------------------------

KIND_DOCUMENT = "document"
KIND_IMAGE = "image"
KIND_FILE = "file"
KIND_EXTERNAL_REF = "external-ref"

STORED_FILE_KINDS: frozenset[str] = frozenset({KIND_DOCUMENT, KIND_IMAGE, KIND_FILE})
ALL_KINDS: frozenset[str] = STORED_FILE_KINDS | {KIND_EXTERNAL_REF}

CONTAINER_STORY = "story"
CONTAINER_TASK = "task"
CONTAINER_MILESTONE = "milestone"
ALL_CONTAINER_TYPES: frozenset[str] = frozenset(
    {CONTAINER_STORY, CONTAINER_TASK, CONTAINER_MILESTONE}
)

MAX_UPLOAD_SIZE_BYTES = 10 * 1024 * 1024

DOCUMENT_MIME_TYPES: frozenset[str] = frozenset({"text/markdown", "text/plain"})
IMAGE_MIME_TYPES: frozenset[str] = frozenset(
    {"image/png", "image/jpeg", "image/gif", "image/webp"}
)
FILE_MIME_TYPES: frozenset[str] = frozenset(
    {
        "application/pdf",
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "application/vnd.openxmlformats-officedocument.presentationml.presentation",
        "text/csv",
        "text/plain",
        "application/json",
        "application/zip",
    }
)

MIME_ALLOW_LIST_BY_KIND: dict[str, frozenset[str]] = {
    KIND_DOCUMENT: DOCUMENT_MIME_TYPES,
    KIND_IMAGE: IMAGE_MIME_TYPES,
    KIND_FILE: FILE_MIME_TYPES,
}

TITLE_MAX_LENGTH = 500

_TITLE_REQUIRED_MSG = "title is required and must not be empty."
_TITLE_TOO_LONG_MSG = f"title must not exceed {TITLE_MAX_LENGTH} characters."
_CONTENT_REQUIRED_MSG = "content is required and must not be empty."
_MIME_TYPE_REQUIRED_MSG = "mime_type is required and must not be empty."
_EXTERNAL_URL_REQUIRED_MSG = "external_url is required and must not be empty."
_CONTENT_BASE64_REQUIRED_MSG = "content_base64 is required and must not be empty."
_KIND_STORED_FILE_MSG = "kind must be one of: {allowed}."


def _assert_title_not_too_long(v: str) -> str:
    if len(v) > TITLE_MAX_LENGTH:
        raise ValueError(_TITLE_TOO_LONG_MSG)
    return v


def _assert_stored_file_kind(v: str) -> str:
    if v not in STORED_FILE_KINDS:
        raise ValueError(
            _KIND_STORED_FILE_MSG.format(allowed=", ".join(sorted(STORED_FILE_KINDS)))
        )
    return v


def _normalize_optional(v: str | None) -> str | None:
    # Empty/whitespace-only optional strings are stored as absent, not "".
    if v is None:
        return None
    stripped = v.strip()
    return stripped or None


# ---------------------------------------------------------------------------
# Request schemas — document-as-text (REST JSON + MCP)
# ---------------------------------------------------------------------------


class _DocumentTextFields(BaseModel):
    title: str
    content: str
    mime_type: str
    author_role: str | None = None

    @field_validator("title")
    @classmethod
    def title_not_empty(cls, v: str) -> str:
        if not v or not v.strip():
            raise ValueError(_TITLE_REQUIRED_MSG)
        return v

    @field_validator("title")
    @classmethod
    def title_not_too_long(cls, v: str) -> str:
        return _assert_title_not_too_long(v)

    @field_validator("content")
    @classmethod
    def content_not_empty(cls, v: str) -> str:
        if not v or not v.strip():
            raise ValueError(_CONTENT_REQUIRED_MSG)
        return v

    @field_validator("mime_type")
    @classmethod
    def mime_type_not_empty(cls, v: str) -> str:
        if not v or not v.strip():
            raise ValueError(_MIME_TYPE_REQUIRED_MSG)
        return v

    @field_validator("author_role")
    @classmethod
    def author_role_normalized(cls, v: str | None) -> str | None:
        return _normalize_optional(v)


class CreateDocumentAttachmentText(_DocumentTextFields):
    """MCP create input for a document supplied as inline UTF-8 text."""


class CreateDocumentAttachmentJson(_DocumentTextFields):
    """REST JSON create input — 'kind' discriminates the JSON union."""

    kind: Literal["document"]


# ---------------------------------------------------------------------------
# Request schemas — external-ref (REST JSON + MCP)
# ---------------------------------------------------------------------------


class _ExternalRefFields(BaseModel):
    title: str
    external_url: str
    external_status: str | None = None
    author_role: str | None = None

    @field_validator("title")
    @classmethod
    def title_not_empty(cls, v: str) -> str:
        if not v or not v.strip():
            raise ValueError(_TITLE_REQUIRED_MSG)
        return v

    @field_validator("title")
    @classmethod
    def title_not_too_long(cls, v: str) -> str:
        return _assert_title_not_too_long(v)

    @field_validator("external_url")
    @classmethod
    def external_url_not_empty(cls, v: str) -> str:
        if not v or not v.strip():
            raise ValueError(_EXTERNAL_URL_REQUIRED_MSG)
        return v

    @field_validator("external_status", "author_role")
    @classmethod
    def optional_fields_normalized(cls, v: str | None) -> str | None:
        return _normalize_optional(v)


class CreateExternalRefAttachment(_ExternalRefFields):
    """MCP create input for an external-reference attachment."""


class CreateExternalRefAttachmentJson(_ExternalRefFields):
    """REST JSON create input — 'kind' discriminates the JSON union."""

    kind: Literal["external-ref"]


# ---------------------------------------------------------------------------
# REST JSON create — discriminated union of the two JSON-capable kinds
# ---------------------------------------------------------------------------

CreateAttachmentJson = Annotated[
    Union[CreateDocumentAttachmentJson, CreateExternalRefAttachmentJson],
    Field(discriminator="kind"),
]
CreateAttachmentJsonAdapter: TypeAdapter = TypeAdapter(CreateAttachmentJson)


# ---------------------------------------------------------------------------
# Request schema — multipart create (REST only), any stored-file kind
# ---------------------------------------------------------------------------


class CreateStoredFileAttachmentForm(BaseModel):
    # title is optional here only because its default (the uploaded file's
    # name) is resolved at the multipart request boundary in the controller,
    # not in this schema — see _build_create_input_from_multipart. A `None`
    # here means the form field was absent; an empty/whitespace string means
    # it was present-but-empty and must fail validation (not silently default).
    title: str | None = None
    kind: str
    mime_type: str
    author_role: str | None = None

    @field_validator("title")
    @classmethod
    def title_not_empty_when_present(cls, v: str | None) -> str | None:
        if v is not None and not v.strip():
            raise ValueError(_TITLE_REQUIRED_MSG)
        return v

    @field_validator("title")
    @classmethod
    def title_not_too_long_when_present(cls, v: str | None) -> str | None:
        if v is None:
            return v
        return _assert_title_not_too_long(v)

    @field_validator("kind")
    @classmethod
    def kind_is_stored_file_kind(cls, v: str) -> str:
        return _assert_stored_file_kind(v)

    @field_validator("mime_type")
    @classmethod
    def mime_type_not_empty(cls, v: str) -> str:
        if not v or not v.strip():
            raise ValueError(_MIME_TYPE_REQUIRED_MSG)
        return v

    @field_validator("author_role")
    @classmethod
    def author_role_normalized(cls, v: str | None) -> str | None:
        return _normalize_optional(v)


# ---------------------------------------------------------------------------
# Request schema — MCP base64 create, any stored-file kind
# ---------------------------------------------------------------------------


class CreateBase64FileAttachment(BaseModel):
    title: str
    kind: str
    mime_type: str
    content_base64: str
    author_role: str | None = None

    @field_validator("title")
    @classmethod
    def title_not_empty(cls, v: str) -> str:
        if not v or not v.strip():
            raise ValueError(_TITLE_REQUIRED_MSG)
        return v

    @field_validator("title")
    @classmethod
    def title_not_too_long(cls, v: str) -> str:
        return _assert_title_not_too_long(v)

    @field_validator("kind")
    @classmethod
    def kind_is_stored_file_kind(cls, v: str) -> str:
        return _assert_stored_file_kind(v)

    @field_validator("mime_type")
    @classmethod
    def mime_type_not_empty(cls, v: str) -> str:
        if not v or not v.strip():
            raise ValueError(_MIME_TYPE_REQUIRED_MSG)
        return v

    @field_validator("content_base64")
    @classmethod
    def content_base64_not_empty(cls, v: str) -> str:
        if not v or not v.strip():
            raise ValueError(_CONTENT_BASE64_REQUIRED_MSG)
        return v

    @field_validator("author_role")
    @classmethod
    def author_role_normalized(cls, v: str | None) -> str | None:
        return _normalize_optional(v)


# ---------------------------------------------------------------------------
# Internal, normalized service input — the single shape AttachmentService.create
# accepts. Built by the controller/MCP layer from whichever boundary schema
# above was used; multipart bytes and base64-decoded bytes converge here as
# plain `file_bytes`.
# ---------------------------------------------------------------------------


class AttachmentCreateInput(BaseModel):
    # title arrives here fully resolved — the request boundary (controller /
    # mcp_tools) has already applied any filename-default and rejected
    # missing/empty values that don't qualify for a default.
    title: str
    kind: str
    author_role: str | None = None
    text_content: str | None = None
    file_bytes: bytes | None = None
    mime_type: str | None = None
    external_url: str | None = None
    external_status: str | None = None


# ---------------------------------------------------------------------------
# Response schemas
# ---------------------------------------------------------------------------


class Attachment(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    container_type: str
    container_id: uuid.UUID
    title: str
    kind: str
    mime_type: str | None
    file_size_bytes: int | None
    external_url: str | None
    external_status: str | None
    author_role: str | None
    created_at: datetime.datetime
    updated_at: datetime.datetime


class PaginationMeta(BaseModel):
    total: int
    page: int
    limit: int
    totalPages: int
