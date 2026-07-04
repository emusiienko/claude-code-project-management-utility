import json
from typing import Annotated, Union

from pydantic import field_validator
from pydantic_settings import BaseSettings, NoDecode, SettingsConfigDict


class Settings(BaseSettings):
    # Database
    database_url: str = "sqlite:///data/app.db"

    # Storage
    attachments_dir: str = "/data/attachments"

    # CORS — accepts a space-separated string (e.g. "http://a http://b") or a
    # JSON array string (e.g. '["http://a","http://b"]') from the env file.
    cors_allowed_origins: Annotated[list[str], NoDecode] = ["http://localhost:3000"]

    # Application
    app_title: str = "AI Agent Coordination Utility"
    app_version: str = "1.0.0"

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
    )

    @field_validator("cors_allowed_origins", mode="before")
    @classmethod
    def parse_cors_origins(cls, v: Union[str, list]) -> list[str]:
        if isinstance(v, list):
            return v
        stripped = v.strip()
        if stripped.startswith("["):
            return json.loads(stripped)
        return [origin.strip() for origin in stripped.split() if origin.strip()]


settings = Settings()