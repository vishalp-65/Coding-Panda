"""
Configuration settings for AI Analysis Service
"""
import os
from typing import Optional
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    """Application settings"""
    
    # Server Configuration
    HOST: str = "0.0.0.0"
    PORT: int = 8001
    DEBUG: bool = True
    
    # Database Configuration
    DATABASE_URL: str = "postgresql+asyncpg://user:password@localhost:5432/ai_analysis_db"
    REDIS_URL: str = "redis://localhost:6379/0"
    
    # AI Service Configuration
    OPENAI_API_KEY: Optional[str] = None
    ANTHROPIC_API_KEY: Optional[str] = None
    AI_MODEL_PROVIDER: str = "openai"
    AI_MODEL_NAME: str = "gpt-4"
    
    # Security Configuration
    SECRET_KEY: str = "your_secret_key_here"
    JWT_SECRET_KEY: str = "your_jwt_secret_key_here"
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    
    # Authentication Configuration
    USE_MOCK_AUTH: bool = True  # Set to False in production
    
    # Analysis Configuration
    MAX_CODE_LENGTH: int = 50000
    ANALYSIS_TIMEOUT: int = 30
    MAX_CONCURRENT_ANALYSES: int = 10
    
    # Logging Configuration
    LOG_LEVEL: str = "INFO"
    LOG_FORMAT: str = "json"
    
    class Config:
        env_file = ".env"
        case_sensitive = True


# Global settings instance
settings = Settings()