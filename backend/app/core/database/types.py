import uuid
from typing import Any

from sqlalchemy import String, TypeDecorator
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
        return str(value) if isinstance(value, uuid.UUID) else str(uuid.UUID(str(value)))

    def process_result_value(
        self,
        value: str | None,
        dialect: Dialect,
    ) -> uuid.UUID | None:
        if value is None:
            return None
        return value if isinstance(value, uuid.UUID) else uuid.UUID(str(value))
