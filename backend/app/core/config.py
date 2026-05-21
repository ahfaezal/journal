import os

from dotenv import load_dotenv
from pydantic import BaseModel


load_dotenv()


def parse_cors_origins() -> list[str]:
    origins = os.getenv("CORS_ORIGINS", "")
    if not origins:
        return [
            "http://localhost:3000",
            "http://127.0.0.1:3000",
        ]

    return [origin.strip() for origin in origins.split(",") if origin.strip()]


class Settings(BaseModel):
    app_name: str = "Thesis2Journal AI API"
    app_version: str = "0.1.0"
    database_url: str = os.getenv("DATABASE_URL", "")
    openai_api_key: str = os.getenv("OPENAI_API_KEY", "")
    openai_model: str = os.getenv("OPENAI_MODEL", "gpt-4.1-mini")
    cors_origins: list[str] = parse_cors_origins()


settings = Settings()
