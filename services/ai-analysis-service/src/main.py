"""
AI Analysis Service - Main FastAPI application
"""
import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI
import uvicorn

from .config import settings
from .routers import analysis, health, learning, interview
from .core.database import init_db
from .core.redis_client import init_redis
from .core.ai_client import init_ai_clients
from .core.app_factory import create_base_app, AppConfig

# Configure logging
logging.basicConfig(
    level=getattr(logging, settings.LOG_LEVEL),
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan manager"""
    # Startup
    logger.info("Starting AI Analysis Service...")
    
    try:
        # Initialize database
        await init_db()
        logger.info("Database initialized")
        
        # Initialize Redis
        await init_redis()
        logger.info("Redis initialized")
        
        # Initialize AI clients
        await init_ai_clients()
        logger.info("AI clients initialized")
        
        logger.info("AI Analysis Service started successfully")
    except Exception as e:
        logger.error(f"Failed to initialize service: {e}")
        raise
    
    yield
    
    # Shutdown
    logger.info("Shutting down AI Analysis Service...")


# Create application configuration
app_config = AppConfig(
    title="AI Analysis Service",
    description="AI-powered code analysis and feedback service",
    version="1.0.0",
    debug=settings.DEBUG,
    allowed_hosts=["*"] if settings.DEBUG else ["yourdomain.com", "*.yourdomain.com"],
    cors_origins=["*"] if settings.DEBUG else ["https://yourdomain.com"]
)

# Create FastAPI application
app = create_base_app(app_config, lifespan)

# Include routers
app.include_router(analysis.router, prefix="/api/v1/analysis", tags=["analysis"])
app.include_router(learning.router, prefix="/api/v1/learning", tags=["learning"])
app.include_router(interview.router, prefix="/api/v1/interview", tags=["interview"])

# Add metrics endpoint
@app.get("/metrics")
async def metrics():
    """Service metrics endpoint"""
    from ..utils.response_handler import ResponseHandler
    
    return ResponseHandler.success({
        "service": "AI Analysis Service",
        "status": "healthy",
        "uptime": "running",
        "requests_processed": 0,
        "cache_hits": 0,
        "cache_misses": 0,
        "ai_provider": settings.AI_MODEL_PROVIDER,
        "ai_model": settings.AI_MODEL_NAME
    })


if __name__ == "__main__":
    uvicorn.run(
        "main:app",
        host=settings.HOST,
        port=settings.PORT,
        reload=settings.DEBUG,
        log_level=settings.LOG_LEVEL.lower()
    )