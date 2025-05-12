from pydantic_settings import BaseSettings
from typing import Optional
import os
from dotenv import load_dotenv

load_dotenv()

class Settings(BaseSettings):
    # Database settings
    DATABASE_URL: str = "sqlite:///./app.db"
    
    # JWT settings
    SECRET_KEY: str = "your-secret-key-here"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    
    # Email settings
    SMTP_TLS: bool = True
    SMTP_PORT: int = 587
    SMTP_HOST: str = "smtp.gmail.com"
    SMTP_USER: str = "your-email@gmail.com"
    SMTP_PASSWORD: str = "your-app-password"
    
    # Company settings
    COMPANY_NAME: str = "Your Company Name"
    COMPANY_ADDRESS: str = "Your Company Address"
    COMPANY_PHONE: str = "Your Company Phone"
    COMPANY_EMAIL: str = "your-company@email.com"
    COMPANY_TAX_NUMBER: str = "Your Tax Number"
    
    # ETA Settings
    ETA_API_URL: str = os.getenv("ETA_API_URL", "https://api.eta.gov.eg")
    ETA_CLIENT_ID: str = os.getenv("ETA_CLIENT_ID", "")
    ETA_CLIENT_SECRET: str = os.getenv("ETA_CLIENT_SECRET", "")
    ETA_ENVIRONMENT: str = os.getenv("ETA_ENVIRONMENT", "production")  # production or testing
    
    # Invoice Settings
    DEFAULT_CURRENCY: str = "EGP"
    DEFAULT_LANGUAGE: str = "ar"
    TAX_RATE: float = 0.14  # 14% VAT rate
    
    class Config:
        env_file = ".env"

settings = Settings() 