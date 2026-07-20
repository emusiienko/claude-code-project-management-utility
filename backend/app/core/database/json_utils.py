import json

from sqlalchemy import Select, text
from sqlalchemy.orm import Session


def apply_json_array_filter(
    stmt: Select,  # type: ignore[type-arg]
    session: Session,
    table_alias: str,
    label_key: str | None,
    label_value: str | None,
) -> Select:  # type: ignore[type-arg]
    # Dispatch to the dialect-specific implementation. All SQL differences
    # between SQLite and PostgreSQL for JSON label filtering are isolated here
    # so no domain repository contains inline dialect branches.
    dialect = session.get_bind().dialect.name  # type: ignore[union-attr]
    if dialect == "sqlite":
        return _apply_sqlite(stmt, table_alias, label_key, label_value)
    return _apply_postgresql(stmt, table_alias, label_key, label_value)


def _apply_sqlite(
    stmt: Select,  # type: ignore[type-arg]
    table_alias: str,
    label_key: str | None,
    label_value: str | None,
) -> Select:  # type: ignore[type-arg]
    # json_each(labels) expands the JSON array; each row exposes the raw
    # JSON element via .value — we extract the key/value fields from it.
    conditions: list[str] = []
    params: dict[str, str] = {}

    if label_key is not None:
        conditions.append("json_extract(je.value, '$.key') = :lk")
        params["lk"] = label_key

    if label_value is not None:
        conditions.append("json_extract(je.value, '$.value') = :lv")
        params["lv"] = label_value

    where_clause = " AND ".join(conditions)
    subquery_sql = (
        f"SELECT 1 FROM json_each({table_alias}.labels) AS je WHERE {where_clause}"
    )
    return stmt.where(text(f"EXISTS ({subquery_sql})").bindparams(**params))


def _apply_postgresql(
    stmt: Select,  # type: ignore[type-arg]
    table_alias: str,
    label_key: str | None,
    label_value: str | None,
) -> Select:  # type: ignore[type-arg]
    # jsonb_array_elements expands the labels array; @> (containment) checks
    # that each element object contains the required key/value fragment.
    fragment: dict[str, str] = {}
    if label_key is not None:
        fragment["key"] = label_key
    if label_value is not None:
        fragment["value"] = label_value

    fragment_json = json.dumps(fragment)
    return stmt.where(
        text(
            "EXISTS ("
            f"  SELECT 1 FROM jsonb_array_elements({table_alias}.labels::jsonb) AS elem"
            "  WHERE elem @> CAST(:fragment AS jsonb)"
            ")"
        ).bindparams(fragment=fragment_json)
    )


def apply_json_scalar_array_contains_filter(
    stmt: Select,  # type: ignore[type-arg]
    session: Session,
    table_alias: str,
    column: str,
    value: str,
) -> Select:  # type: ignore[type-arg]
    """Filter rows whose JSON array `column` contains the scalar string `value`.

    Distinct from `apply_json_array_filter`, which matches key/value fragments
    inside an array of *objects* (labels). This helper matches a plain string
    element inside an array of *scalars* — used by the comments `ancestors`
    materialized-path sub-thread filter (`descendant_of`).
    """
    dialect = session.get_bind().dialect.name  # type: ignore[union-attr]
    if dialect == "sqlite":
        return _apply_sqlite_scalar_contains(stmt, table_alias, column, value)
    return _apply_postgresql_scalar_contains(stmt, table_alias, column, value)


def _apply_sqlite_scalar_contains(
    stmt: Select,  # type: ignore[type-arg]
    table_alias: str,
    column: str,
    value: str,
) -> Select:  # type: ignore[type-arg]
    subquery_sql = (
        f"SELECT 1 FROM json_each({table_alias}.{column}) AS je WHERE je.value = :val"
    )
    return stmt.where(text(f"EXISTS ({subquery_sql})").bindparams(val=value))


def _apply_postgresql_scalar_contains(
    stmt: Select,  # type: ignore[type-arg]
    table_alias: str,
    column: str,
    value: str,
) -> Select:  # type: ignore[type-arg]
    # jsonb_array_elements_text extracts scalar text elements directly — no
    # containment operator needed since we compare exact string equality.
    return stmt.where(
        text(
            "EXISTS ("
            f"  SELECT 1 FROM jsonb_array_elements_text({table_alias}.{column}::jsonb) AS elem"
            "  WHERE elem = :val"
            ")"
        ).bindparams(val=value)
    )
