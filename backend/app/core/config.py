from pydantic_settings import BaseSettings
from typing import Optional


class Settings(BaseSettings):
    # App
    APP_NAME: str = "Gas Station Dashboard"
    DEBUG: bool = True

    # Database - Using SQLite for easy local development (no PostgreSQL needed)
    DATABASE_URL: str = "sqlite:///./gasstation.db"

    # JWT
    SECRET_KEY: str = "your-secret-key-change-in-production-minimum-32-characters"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24 * 7  # 7 days

    # Demo Account
    DEMO_EMAIL: str = "demo@gasstation.com"
    DEMO_PASSWORD: str = "demo123"

    class Config:
        env_file = ".env"


settings = Settings()
