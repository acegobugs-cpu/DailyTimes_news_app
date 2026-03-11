from pydantic_settings import BaseSettings
from typing import Optional

class Settings(BaseSettings):
    PROJECT_NAME: str = "FastAPI Project"
    API_V1_STR: str = "/api/v1"

    # Database
    DB_HOST: str
    DB_PORT: str
    DB_NAME: str
    DB_USER: str
    DB_PASSWORD: str
    DATABASE_URL_DB: str

    GMAIL_USERNAME: str
    GMAIL_PASSWORD: str # from https://myaccount.google.com/apppasswords
    MAIL_FROM: str
    FRONTEND_URL: str
    SECRET_KEY: str
    
    # MinIO / S3 Configuration
    MINIO_HOST: str
    MINIO_ENDPOINT: str
    MINIO_ACCESS_KEY: str
    MINIO_SECRET_KEY: str
    MINIO_BUCKET: str
    MINIO_PUBLIC_URL: Optional[str] = None
    MINIO_SECURE: str  # true if using HTTPS in production
    
    # Constants
    MAX_FILE_SIZE: int = 100 * 1024 * 1024  # 100MB

    class Config:
        env_file = ".env"
        case_sensitive = True

settings = Settings()