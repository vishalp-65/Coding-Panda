from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
import logging
import asyncio
from contextlib import asynccontextmanager
from src.api.execution_routes import router as execution_router
from src.config.settings import settings
from src.execution.executor import CodeExecutor
import uvicorn

# Configure logging
logging.basicConfig(
    level=getattr(logging, settings.log_level),
    format=settings.log_format
)
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan manager for startup and shutdown tasks."""
    # Startup
    logger.info("Starting Code Execution Service")
    
    # Initialize executor and warm up
    executor = CodeExecutor()
    
    # Start background tasks
    cleanup_task = asyncio.create_task(periodic_cleanup(executor))
    
    try:
        # Warm up the service (non-blocking)
        try:
            await executor.warmup()
            logger.info("Service warmup completed")
        except Exception as e:
            logger.warning(f"Service warmup failed, but continuing: {e}")
        
        yield
        
    finally:
        # Shutdown
        logger.info("Shutting down Code Execution Service")
        
        # Cancel background tasks
        cleanup_task.cancel()
        try:
            await cleanup_task
        except asyncio.CancelledError:
            pass
        
        # Clear cache
        await executor.clear_cache()
        
        logger.info("Service shutdown completed")


async def periodic_cleanup(executor: CodeExecutor):
    """Periodic cleanup task for containers and cache."""
    while True:
        try:
            await asyncio.sleep(settings.cleanup_interval)
            
            # Cleanup old containers
            await executor.docker_manager.cleanup_old_containers()
            
            logger.debug("Periodic cleanup completed")
            
        except asyncio.CancelledError:
            break
        except Exception as e:
            logger.error(f"Periodic cleanup failed: {e}")


# Create FastAPI application
app = FastAPI(
    title="Code Execution Service",
    description="LeetCode-style code execution service with hidden code merging",
    version="1.0.0",
    lifespan=lifespan
)

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Configure appropriately for production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    """Global exception handler."""
    logger.error(f"Unhandled exception: {exc}", exc_info=True)
    return JSONResponse(
        status_code=500,
        content={
            "error": "Internal server error",
            "message": "An unexpected error occurred",
            "request_id": getattr(request.state, 'request_id', None)
        }
    )


@app.middleware("http")
async def add_request_id(request: Request, call_next):
    """Add request ID for tracing."""
    import uuid
    request_id = str(uuid.uuid4())
    request.state.request_id = request_id
    
    response = await call_next(request)
    response.headers["X-Request-ID"] = request_id
    
    return response


# Include routers
app.include_router(execution_router)


@app.get("/")
async def root():
    """Root endpoint with service information."""
    return {
        "service": "Code Execution Service",
        "version": "1.0.0",
        "description": "LeetCode-style code execution with hidden code merging",
        "supported_languages": list(settings.language_configs.keys()),
        "endpoints": {
            "execute": "/api/v1/execution/execute",
            "validate": "/api/v1/execution/validate",
            "health": "/api/v1/execution/health",
            "metrics": "/api/v1/execution/metrics"
        }
    }


@app.get("/api/v1/health")
async def health():
    """Simple health check endpoint."""
    return {"status": "healthy", "service": "code-execution-service"}


if __name__ == "__main__":
    uvicorn.run(
        "main:app",
        host=settings.api_host,
        port=settings.api_port,
        workers=1,  # Use 1 worker for development
        reload=False,
        log_level=settings.log_level.lower()
    )