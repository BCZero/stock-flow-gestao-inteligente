from pathlib import Path
from typing import Literal

from pydantic import Field, SecretStr, model_validator
from pydantic_settings import BaseSettings

CHAVE_DESENVOLVIMENTO = "supersecretkey123"


class Settings(BaseSettings):
    PROJECT_NAME: str = "StockFlow"
    # local: valores de desenvolvimento são aceitos. producao: exige SECRET_KEY própria (ex.: Render).
    AMBIENTE: Literal["local", "producao"] = "local"
    DATABASE_URL: str = "postgresql+pg8000://postgres:password@localhost:5432/stockflow_db"
    SECRET_KEY: str = CHAVE_DESENVOLVIMENTO
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    # Origens autorizadas a chamar a API pelo navegador, separadas por vírgula. "*" libera todas.
    CORS_ORIGENS: str = "*"
    ALERTAS_INTERVALO_SEGUNDOS: int = Field(900, ge=0)
    LLM_PROVIDER: Literal["openai", "ollama"] = "openai"
    LLM_CHAT_URL: str | None = None
    LLM_MODEL: str | None = None
    LLM_API_KEY: SecretStr | None = None
    LLM_TIMEOUT_SEGUNDOS: int = Field(8, ge=1, le=180)

    class Config:
        env_file = Path(__file__).resolve().parents[2] / ".env"
        env_file_encoding = "utf-8"

    @model_validator(mode="after")
    def exigir_chave_em_producao(self):
        if self.AMBIENTE == "producao" and (self.SECRET_KEY == CHAVE_DESENVOLVIMENTO or len(self.SECRET_KEY) < 32):
            raise ValueError("Em produção, defina SECRET_KEY com pelo menos 32 caracteres aleatórios.")
        return self

    @property
    def origens_cors(self) -> list[str]:
        return [origem.strip().rstrip("/") for origem in self.CORS_ORIGENS.split(",") if origem.strip()]


settings = Settings()
