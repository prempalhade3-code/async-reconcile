from typing import List
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    ENVIRONMENT: str = "development"
    API_PORT: int = 8000
    API_HOST: str = "127.0.0.1"
    CORS_ORIGINS: str = "http://localhost:5173,http://127.0.0.1:5173,http://localhost:3000"
    DATABASE_URL: str = "sqlite:///./asyncreconcile.db"

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore"
    )

    @property
    def cors_origin_list(self) -> List[str]:
        return [origin.strip() for origin in self.CORS_ORIGINS.split(",") if origin.strip()]


settings = Settings()
