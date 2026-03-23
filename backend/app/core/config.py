import os
from pydantic_settings import BaseSettings, SettingsConfigDict
from pydantic import computed_field


class Settings(BaseSettings):
    # Railway / cloud providers give DATABASE_URL directly
    DATABASE_URL: str = ""

    # Individual Postgres vars (used if DATABASE_URL is not set)
    POSTGRES_USER: str = "admin"
    POSTGRES_PASSWORD: str = ""
    POSTGRES_DB: str = "quickscan_db"
    POSTGRES_HOST: str = "localhost"
    POSTGRES_PORT: int = 5432

    PASETO_SECRET_KEY: str = ""
    GOOGLE_CLIENT_ID: str = ""

    # Frontend origin for CORS (comma-separated for multiple)
    FRONTEND_URL: str = "*"

    @computed_field
    @property
    def ASYNC_DATABASE_URL(self) -> str:
        """Returns an asyncpg-compatible connection string."""
        if self.DATABASE_URL:
            url = self.DATABASE_URL
            # Railway gives postgres:// but asyncpg needs postgresql+asyncpg://
            url = url.replace("postgres://", "postgresql+asyncpg://", 1)
            url = url.replace("postgresql://", "postgresql+asyncpg://", 1)
            return url
        return f"postgresql+asyncpg://{self.POSTGRES_USER}:{self.POSTGRES_PASSWORD}@{self.POSTGRES_HOST}:{self.POSTGRES_PORT}/{self.POSTGRES_DB}"

    model_config = SettingsConfigDict(env_file=".env", extra="ignore")


settings = Settings()