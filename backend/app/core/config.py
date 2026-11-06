from pathlib import Path
from typing import Literal

from pydantic import Field, SecretStr
from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    PROJECT_NAME: str = "StockFlow"
    DATABASE_URL: str = "postgresql+pg8000://postgres:password@localhost:5432/stockflow_db"
    SECRET_KEY: str = "supersecretkey123"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    ALERTAS_INTERVALO_SEGUNDOS: int = Field(900, ge=0)
    LLM_PROVIDER: Literal["openai", "ollama"] = "openai"
    LLM_CHAT_URL: str | None = None
    LLM_MODEL: str | None = None
    LLM_API_KEY: SecretStr | None = None
    LLM_TIMEOUT_SEGUNDOS: int = Field(8, ge=1, le=180)

    class Config:
        env_file = Path(__file__).resolve().parents[2] / ".env"
        env_file_encoding = "utf-8"

settings = Settings()
