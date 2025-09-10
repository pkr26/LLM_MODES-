"""
Configuration module for LLM_MODES backend.

This module handles environment variables, logging configuration,
and application settings in a centralized manner.
"""

import os
import logging
import logging.config
from typing import Optional
from pydantic_settings import BaseSettings
from pydantic import Field, validator


class Settings(BaseSettings):
    """Application settings with validation."""
    
    # Database
    database_url: str = Field(
        default="sqlite:///./app.db",
        env="DATABASE_URL",
        description="Database connection URL"
    )
    
    # Security
    secret_key: str = Field(
        ...,
        env="SECRET_KEY",
        description="Secret key for JWT tokens"
    )
    
    algorithm: str = Field(
        default="HS256",
        env="ALGORITHM",
        description="JWT algorithm"
    )
    
    access_token_expire_minutes: int = Field(
        default=15,
        env="ACCESS_TOKEN_EXPIRE_MINUTES",
        description="Access token expiration time in minutes"
    )
    
    refresh_token_expire_days: int = Field(
        default=7,
        env="REFRESH_TOKEN_EXPIRE_DAYS",
        description="Refresh token expiration time in days"
    )
    
    # Security policies
    max_login_attempts: int = Field(
        default=5,
        env="MAX_LOGIN_ATTEMPTS",
        description="Maximum failed login attempts before lockout"
    )
    
    lockout_duration_minutes: int = Field(
        default=30,
        env="LOCKOUT_DURATION_MINUTES",
        description="Account lockout duration in minutes"
    )
    
    password_history_count: int = Field(
        default=5,
        env="PASSWORD_HISTORY_COUNT",
        description="Number of previous passwords to remember"
    )
    
    # Application
    debug: bool = Field(
        default=False,
        env="DEBUG",
        description="Enable debug mode"
    )
    
    environment: str = Field(
        default="development",
        env="ENVIRONMENT",
        description="Application environment"
    )
    
    log_level: str = Field(
        default="INFO",
        env="LOG_LEVEL",
        description="Logging level"
    )
    
    # CORS
    allowed_origins: list[str] = Field(
        default=["http://localhost:3000", "http://localhost:3001"],
        env="ALLOWED_ORIGINS",
        description="Allowed CORS origins"
    )
    
    @validator('allowed_origins', pre=True)
    def parse_origins(cls, v):
        if isinstance(v, str):
            origins = [origin.strip() for origin in v.split(',') if origin.strip()]
            return origins if origins else ["http://localhost:3000"]
        return v if v else ["http://localhost:3000"]
    
    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"


def setup_logging(log_level: str = "INFO", log_format: Optional[str] = None) -> None:
    """
    Configure logging for the application.
    
    Args:
        log_level: Logging level (DEBUG, INFO, WARNING, ERROR, CRITICAL)
        log_format: Optional custom log format string
    """
    
    if log_format is None:
        log_format = (
            "%(asctime)s - %(name)s - %(levelname)s - "
            "%(filename)s:%(lineno)d - %(message)s"
        )
    
    logging_config = {
        "version": 1,
        "disable_existing_loggers": False,
        "formatters": {
            "standard": {
                "format": log_format,
                "datefmt": "%Y-%m-%d %H:%M:%S",
            },
            "detailed": {
                "format": (
                    "%(asctime)s - %(name)s - %(levelname)s - "
                    "%(pathname)s:%(lineno)d - %(funcName)s() - %(message)s"
                ),
                "datefmt": "%Y-%m-%d %H:%M:%S",
            },
        },
        "handlers": {
            "console": {
                "class": "logging.StreamHandler",
                "level": log_level,
                "formatter": "standard",
                "stream": "ext://sys.stdout",
            },
            "file": {
                "class": "logging.handlers.RotatingFileHandler",
                "level": log_level,
                "formatter": "detailed",
                "filename": "logs/app.log",
                "maxBytes": 10485760,  # 10MB
                "backupCount": 5,
                "encoding": "utf-8",
            },
        },
        "loggers": {
            "": {  # Root logger
                "handlers": ["console", "file"],
                "level": log_level,
                "propagate": False,
            },
            "uvicorn": {
                "handlers": ["console"],
                "level": "INFO",
                "propagate": False,
            },
            "uvicorn.access": {
                "handlers": ["file"],
                "level": "INFO",
                "propagate": False,
            },
            "sqlalchemy.engine": {
                "handlers": ["file"],
                "level": "WARNING",
                "propagate": False,
            },
        },
    }
    
    # Create logs directory if it doesn't exist
    os.makedirs("logs", exist_ok=True)
    
    logging.config.dictConfig(logging_config)


# Create settings instance
settings = Settings()

# Setup logging
setup_logging(settings.log_level)

# Get logger
logger = logging.getLogger(__name__)
logger.info(f"Application started with environment: {settings.environment}")