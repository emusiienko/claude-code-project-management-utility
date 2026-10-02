import datetime
import uuid
from typing import Any

from sqlalchemy import DateTime, String, TypeDecorator
from sqlalchemy.engine import Dialect
from sqlalchemy.types import TypeEngine


class UUIDType(TypeDecorator[uuid.UUID]):
    # Portable UUID: VARCHAR(36) on all dialects.
    # Using native PG UUID caused SQLAlchemy to emit `$1::UUID` casts which
    # PostgreSQL rejects when the column is still VARCHAR(36) (operator does
    # not exist: character varying = uuid). Keeping VARCHAR(36) everywhere
    # avoids that cast entirely and keeps the column type consistent across
    # SQLite and PostgreSQL without requiring a data migration.
    impl = String(36)
    cache_ok = True

    def load_dialect_impl(self, dialect: Dialect) -> TypeEngine[Any]:
        # Always VARCHAR(36) — no dialect-specific branching so that
        # SQLAlchemy never generates ::UUID casts in generated SQL.
        return dialect.type_descriptor(String(36))

    def process_bind_param(
        self,
        value: uuid.UUID | str | None,
        dialect: Dialect,
    ) -> str | None:
        if value is None:
            return None
        return (
            str(value) if isinstance(value, uuid.UUID) else str(uuid.UUID(str(value)))
        )

    def process_result_value(
        self,
        value: str | None,
        dialect: Dialect,
    ) -> uuid.UUID | None:
        if value is None:
            return None
        return value if isinstance(value, uuid.UUID) else uuid.UUID(str(value))


class UTCDateTime(TypeDecorator[datetime.datetime]):
    # Portable timezone-aware DateTime. PostgreSQL's TIMESTAMPTZ round-trips the
    # UTC offset natively, but SQLite's DATETIME storage format carries no offset
    # at all (`sqlalchemy.dialects.sqlite.DATETIME` formats/parses year..microsecond
    # only) — a value written tz-aware always comes back naive. Reattaching UTC
    # tzinfo on read keeps `created_at`/`updated_at` consistent across a create
    # response and a later read on both dialects, since every writer in this
    # codebase constructs these values via `datetime.now(tz=timezone.utc)`.
    impl = DateTime(timezone=True)
    cache_ok = True

    def process_bind_param(
        self,
        value: datetime.datetime | None,
        dialect: Dialect,
    ) -> datetime.datetime | None:
        if value is None:
            return None
        if value.tzinfo is None:
            raise ValueError(
                "UTCDateTime requires a timezone-aware datetime; received a naive one."
            )
        return value.astimezone(datetime.timezone.utc)

    def process_result_value(
        self,
        value: datetime.datetime | None,
        dialect: Dialect,
    ) -> datetime.datetime | None:
        if value is None:
            return None
        if value.tzinfo is None:
            return value.replace(tzinfo=datetime.timezone.utc)
        return value
