import os

from dotenv import load_dotenv
from pydantic import BaseModel


load_dotenv()


class Settings(BaseModel):
    app_name: str = "Thesis2Journal AI API"
    app_version: str = "0.1.0"
    database_url: str = os.getenv("DATABASE_URL", "")
    openai_api_key: str = os.getenv("OPENAI_API_KEY", "")
    openai_model: str = os.getenv("OPENAI_MODEL", "gpt-4.1-mini")
    cors_origins: list[str] = [
        "http://localhost:3000",
        "http://127.0.0.1:3000",
    ]


settings = Settings()
