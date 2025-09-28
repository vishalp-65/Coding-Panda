from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.trustedhost import TrustedHostMiddleware
from fastapi.responses import JSONResponse
import logging
import time
import uvicorn
from src.api.routes import router
from src.config.settings import settings

# Configure logging
logging.basicConfig(
    level=getattr(logging, settings.log_level),
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Create FastAPI app
app = FastAPI(
    title=settings.app_name,
    description="Secure code execution service for the AI-powered coding platform",
    version="1.0.0",
    docs_url="/docs" if settings.debug else None,
    redoc_url="/redoc" if settings.debug else None
)

# Security middleware
app.add_middleware(
    TrustedHostMiddleware,
    allowed_hosts=["*"] if settings.debug else ["localhost", "127.0.0.1"]
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"] if settings.debug else ["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["GET", "POST"],
    allow_headers=["*"],
)


# Request logging middleware
@app.middleware("http")
async def log_requests(request: Request, call_next):
    start_time = time.time()
    
    # Log request
    logger.info(f"Request: {request.method} {request.url}")
    
    try:
        response = await call_next(request)
        
        # Log response
        process_time = time.time() - start_time
        logger.info(
            f"Response: {response.status_code} - {process_time:.3f}s"
        )
        
        # Add timing header
        response.headers["X-Process-Time"] = str(process_time)
        
        return response
        
    except Exception as e:
        process_time = time.time() - start_time
        logger.error(f"Request failed: {str(e)} - {process_time:.3f}s")
        
        return JSONResponse(
            status_code=500,
            content={"error": "Internal server error"},
            headers={"X-Process-Time": str(process_time)}
        )


# Global exception handler
@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    logger.error(f"Unhandled exception: {str(exc)}", exc_info=True)
    return JSONResponse(
        status_code=500,
        content={"error": "Internal server error"}
    )


# Include API routes
app.include_router(router, prefix="/api/v1")


# Root endpoint
@app.get("/")
async def root():
    return {
        "service": settings.app_name,
        "status": "running",
        "version": "1.0.0"
    }


# Startup event
@app.on_event("startup")
async def startup_event():
    logger.info(f"Starting {settings.app_name}")
    
    # Initialize Docker manager and pull images in background
    try:
        from src.execution.executor import CodeExecutor
        executor = CodeExecutor()
        
        # Pull Docker images in background
        import asyncio
        asyncio.create_task(executor.docker_manager.pull_images())
        
        logger.info("Service started successfully")
        
    except Exception as e:
        logger.error(f"Failed to start service: {e}")
        raise


# Shutdown event
@app.on_event("shutdown")
async def shutdown_event():
    logger.info(f"Shutting down {settings.app_name}")
    
    try:
        # Cleanup resources
        from src.execution.executor import CodeExecutor
        executor = CodeExecutor()
        executor.docker_manager.cleanup_old_containers()
        
        logger.info("Service shutdown completed")
        
    except Exception as e:
        logger.error(f"Error during shutdown: {e}")


if __name__ == "__main__":
    uvicorn.run(
        "src.main:app",
        host="0.0.0.0",
        port=3004,
        reload=settings.debug,
        log_level=settings.log_level.lower()
    )