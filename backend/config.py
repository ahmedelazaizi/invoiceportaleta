from pydantic_settings import BaseSettings
from typing import Optional
import os
from dotenv import load_dotenv

load_dotenv()

class Settings(BaseSettings):
    # Database settings
    DATABASE_URL: str = os.getenv("DATABASE_URL", "sqlite:///./app.db")
    
    # JWT settings
    SECRET_KEY: str = os.getenv("SECRET_KEY", "")
    ALGORITHM: str = os.getenv("ALGORITHM", "HS256")
    ACCESS_TOKEN_EXPIRE_MINUTES: int = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", "30"))
    REFRESH_TOKEN_EXPIRE_DAYS: int = int(os.getenv("REFRESH_TOKEN_EXPIRE_DAYS", "7"))
    
    # Email settings
    SMTP_TLS: bool = os.getenv("SMTP_TLS", "True").lower() == "true"
    SMTP_PORT: int = int(os.getenv("SMTP_PORT", "587"))
    SMTP_HOST: str = os.getenv("SMTP_HOST", "")
    SMTP_USER: str = os.getenv("SMTP_USER", "")
    SMTP_PASSWORD: str = os.getenv("SMTP_PASSWORD", "")
    
    # Company settings
    COMPANY_NAME: str = os.getenv("COMPANY_NAME", "")
    COMPANY_ADDRESS: str = os.getenv("COMPANY_ADDRESS", "")
    COMPANY_PHONE: str = os.getenv("COMPANY_PHONE", "")
    COMPANY_EMAIL: str = os.getenv("COMPANY_EMAIL", "")
    COMPANY_TAX_NUMBER: str = os.getenv("COMPANY_TAX_NUMBER", "")
    
    # ETA Settings
    ETA_API_URL: str = os.getenv("ETA_API_URL", "https://api.eta.gov.eg")
    ETA_CLIENT_ID: str = os.getenv("ETA_CLIENT_ID", "")
    ETA_CLIENT_SECRET: str = os.getenv("ETA_CLIENT_SECRET", "")
    ETA_ENVIRONMENT: str = os.getenv("ETA_ENVIRONMENT", "production")  # production or testing
    
    # Invoice Settings
    DEFAULT_CURRENCY: str = os.getenv("DEFAULT_CURRENCY", "EGP")
    DEFAULT_LANGUAGE: str = os.getenv("DEFAULT_LANGUAGE", "ar")
    TAX_RATE: float = float(os.getenv("TAX_RATE", "0.14"))  # 14% VAT rate
    
    class Config:
        env_file = ".env"

settings = Settings()
