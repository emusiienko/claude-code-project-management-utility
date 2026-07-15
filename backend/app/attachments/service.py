import base64
import datetime
import urllib.parse
import uuid
from typing import TYPE_CHECKING, Protocol, runtime_checkable

from app.attachments.model import Attachment
from app.attachments.repository import AttachmentRepository
from app.attachments.schema import (
    ALL_CONTAINER_TYPES,
    CONTAINER_MILESTONE,
    CONTAINER_STORY,
    CONTAINER_TASK,
    KIND_EXTERNAL_REF,
    MAX_UPLOAD_SIZE_BYTES,
    MIME_ALLOW_LIST_BY_KIND,
    STORED_FILE_KINDS,
    Attachment as AttachmentSchema,
    AttachmentCreateInput,
)
from app.core.errors import NotFoundError, UnprocessableError, ValidationError
from app.core.storage import FilesystemStorage

if TYPE_CHECKING:
    from app.milestones.model import Milestone as MilestoneModel
    from app.stories.model import Story as StoryModel
    from app.tasks.model import Task as TaskModel

_CONTAINER_TYPE_INVALID_MSG = "container_type must be one of: {allowed}."
_TITLE_REQUIRED_MSG = "title is required and must not be empty."
_FILE_TOO_LARGE_MSG = "File must be smaller than 10 MB."
_MIME_NOT_ALLOWED_MSG = "MIME type '{mime}' is not allowed for kind '{kind}'."
_URL_INVALID_MSG = "external_url must be a valid URL."
_EXTERNAL_REF_NO_FILE_MSG = "External reference attachments do not have a stored file."
_KIND_NOT_SUPPORTED_MSG = "kind '{kind}' is not supported."

_LIST_DEFAULT_LIMIT = 20
_LIST_MAX_LIMIT = 100
_LIST_DEFAULT_PAGE = 1


@runtime_checkable
class StoryReaderProtocol(Protocol):
    def get_by_id(self, story_id: str | uuid.UUID) -> "StoryModel | None": ...


@runtime_checkable
class TaskReaderProtocol(Protocol):
    def get_by_id(self, task_id: str | uuid.UUID) -> "TaskModel | None": ...


@runtime_checkable
class MilestoneReaderProtocol(Protocol):
    def get_by_id(self, milestone_id: str | uuid.UUID) -> "MilestoneModel | None": ...


@runtime_checkable
class AttachmentReaderProtocol(Protocol):
    """Satisfied structurally by AttachmentService; injected into the story,
    task, and milestone services (never the concrete class) so those domains
    can compose attachments into their detail responses and cascade-remove
    them on container delete without depending on the attachments package."""

    def list_all_for_container(
        self, container_type: str, container_id: uuid.UUID
    ) -> list[AttachmentSchema]: ...

    def delete_all_for_container(
        self, container_type: str, container_id: uuid.UUID
    ) -> None: ...


class AttachmentService:
    def __init__(
        self,
        repo: AttachmentRepository,
        storage: FilesystemStorage,
        story_reader: StoryReaderProtocol,
        task_reader: TaskReaderProtocol,
        milestone_reader: MilestoneReaderProtocol,
    ) -> None:
        self._repo = repo
        self._storage = storage
        self._story_reader = story_reader
        self._task_reader = task_reader
        self._milestone_reader = milestone_reader

    # ------------------------------------------------------------------
    # Create
    # ------------------------------------------------------------------

    def create(
        self,
        container_type: str,
        container_id: str,
        data: AttachmentCreateInput,
    ) -> Attachment:
        self._assert_container_type_valid(container_type)
        container_uuid = self._resolve_container(container_type, container_id)
        self._assert_title_not_empty(data.title)

        now = datetime.datetime.now(tz=datetime.timezone.utc)
        attachment_id = uuid.uuid4()

        if data.kind == KIND_EXTERNAL_REF:
            self._assert_url_valid(data.external_url)
            attachment = Attachment(
                id=attachment_id,
                container_type=container_type,
                container_id=container_uuid,
                title=data.title,
                kind=data.kind,
                mime_type=None,
                file_size_bytes=None,
                file_path=None,
                external_url=data.external_url,
                external_status=data.external_status,
                author_role=data.author_role,
                created_at=now,
                updated_at=now,
            )
        elif data.kind in STORED_FILE_KINDS:
            content_bytes = (
                data.file_bytes
                if data.file_bytes is not None
                else self._encode_text(data.text_content)
            )
            self._assert_size_allowed(content_bytes)
            self._assert_mime_allowed(data.kind, data.mime_type)
            relative_path = self._build_relative_path(
                container_type, container_uuid, attachment_id
            )
            self._storage.write(content_bytes, relative_path)
            attachment = Attachment(
                id=attachment_id,
                container_type=container_type,
                container_id=container_uuid,
                title=data.title,
                kind=data.kind,
                mime_type=data.mime_type,
                file_size_bytes=len(content_bytes),
                file_path=relative_path,
                external_url=None,
                external_status=None,
                author_role=data.author_role,
                created_at=now,
                updated_at=now,
            )
        else:
            raise UnprocessableError(_KIND_NOT_SUPPORTED_MSG.format(kind=data.kind))

        return self._repo.save(attachment)

    # ------------------------------------------------------------------
    # Read
    # ------------------------------------------------------------------

    def get_by_id(self, attachment_id: str) -> Attachment:
        attachment = self._repo.get_by_id(attachment_id)
        if attachment is None:
            raise NotFoundError(f"Attachment '{attachment_id}' not found.")
        return attachment

    def get_file(self, attachment_id: str) -> tuple[bytes, str]:
        attachment = self.get_by_id(attachment_id)
        if attachment.kind == KIND_EXTERNAL_REF or attachment.file_path is None:
            raise ValidationError(_EXTERNAL_REF_NO_FILE_MSG)
        content = self._storage.read(attachment.file_path)
        mime_type = attachment.mime_type or "application/octet-stream"
        return content, mime_type

    def get_file_base64(self, attachment_id: str) -> tuple[str, str]:
        content, mime_type = self.get_file(attachment_id)
        return base64.b64encode(content).decode("ascii"), mime_type

    def list_paginated(
        self,
        container_type: str,
        container_id: str,
        page: int = _LIST_DEFAULT_PAGE,
        limit: int = _LIST_DEFAULT_LIMIT,
        kind_filter: str | None = None,
    ) -> tuple[list[Attachment], int]:
        self._assert_container_type_valid(container_type)
        container_uuid = self._resolve_container(container_type, container_id)

        effective_limit = min(limit, _LIST_MAX_LIMIT)
        offset = (page - 1) * effective_limit

        return self._repo.list_paginated(
            container_type=container_type,
            container_id=container_uuid,
            limit=effective_limit,
            offset=offset,
            kind_filter=kind_filter,
        )

    # ------------------------------------------------------------------
    # Delete
    # ------------------------------------------------------------------

    def delete(self, attachment_id: str) -> None:
        attachment = self.get_by_id(attachment_id)
        if attachment.file_path is not None:
            self._storage.delete(attachment.file_path)
        self._repo.delete(attachment)

    # ------------------------------------------------------------------
    # AttachmentReaderProtocol — consumed by story/task/milestone services
    # ------------------------------------------------------------------

    def list_all_for_container(
        self, container_type: str, container_id: uuid.UUID
    ) -> list[AttachmentSchema]:
        rows = self._repo.list_all_for_container(container_type, container_id)
        return [AttachmentSchema.model_validate(row) for row in rows]

    def delete_all_for_container(
        self, container_type: str, container_id: uuid.UUID
    ) -> None:
        # Files are removed before the rows: file_path only exists on the row,
        # so it must be read before delete_all_for_container drops it.
        rows = self._repo.list_all_for_container(container_type, container_id)
        for row in rows:
            if row.file_path is not None:
                self._storage.delete(row.file_path)
        self._repo.delete_all_for_container(container_type, container_id)

    # ------------------------------------------------------------------
    # Private helpers
    # ------------------------------------------------------------------

    @staticmethod
    def _assert_container_type_valid(container_type: str) -> None:
        if container_type not in ALL_CONTAINER_TYPES:
            allowed = ", ".join(sorted(ALL_CONTAINER_TYPES))
            raise UnprocessableError(
                _CONTAINER_TYPE_INVALID_MSG.format(allowed=allowed)
            )

    def _resolve_container(
        self, container_type: str, container_id: str
    ) -> uuid.UUID:
        # Validates container existence (404) and returns its UUID.
        if container_type == CONTAINER_STORY:
            story = self._story_reader.get_by_id(container_id)
            if story is None:
                raise NotFoundError(f"Story '{container_id}' not found.")
            return story.id

        if container_type == CONTAINER_TASK:
            task = self._task_reader.get_by_id(container_id)
            if task is None:
                raise NotFoundError(f"Task '{container_id}' not found.")
            return task.id

        milestone = self._milestone_reader.get_by_id(container_id)
        if milestone is None:
            raise NotFoundError(f"Milestone '{container_id}' not found.")
        return milestone.id

    @staticmethod
    def _assert_title_not_empty(title: str) -> None:
        # Backstop across all create paths — the request-boundary schemas
        # already reject missing/empty title, but this keeps the service
        # itself safe against any future caller that skips schema validation.
        if not title or not title.strip():
            raise ValidationError(_TITLE_REQUIRED_MSG)

    @staticmethod
    def _assert_size_allowed(content: bytes) -> None:
        if len(content) > MAX_UPLOAD_SIZE_BYTES:
            raise ValidationError(_FILE_TOO_LARGE_MSG)

    @staticmethod
    def _assert_mime_allowed(kind: str, mime_type: str | None) -> None:
        allow_list = MIME_ALLOW_LIST_BY_KIND[kind]
        if mime_type not in allow_list:
            raise ValidationError(
                _MIME_NOT_ALLOWED_MSG.format(mime=mime_type, kind=kind)
            )

    @staticmethod
    def _assert_url_valid(external_url: str | None) -> None:
        if not external_url:
            raise ValidationError(_URL_INVALID_MSG)
        parsed = urllib.parse.urlparse(external_url)
        if not parsed.scheme or not parsed.netloc:
            raise ValidationError(_URL_INVALID_MSG)

    @staticmethod
    def _encode_text(text_content: str | None) -> bytes:
        # Only reached for kind=document created via inline JSON text.
        return (text_content or "").encode("utf-8")

    @staticmethod
    def _build_relative_path(
        container_type: str, container_id: uuid.UUID, attachment_id: uuid.UUID
    ) -> str:
        return f"{container_type}/{container_id}/{attachment_id}"
