"""
FastAPI application factory for consistent app creation
"""
from contextlib import asynccontextmanager
from typing import Dict, Any, Optional
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.trustedhost import TrustedHostMiddleware
from fastapi.responses import JSONResponse
import logging
import time

from .exceptions import AnalysisServiceException
from ..utils.response_handler import ResponseHandler

logger = logging.getLogger(__name__)

class AppConfig:
    """Configuration for FastAPI app"""
    def __init__(
        self,
        title: str,
        description: str,
        version: str = "1.0.0",
        debug: bool = False,
        allowed_hosts: list = None,
        cors_origins: list = None
    ):
        self.title = title
        self.description = description
        self.version = version
        self.debug = debug
        self.allowed_hosts = allowed_hosts or (["*"] if debug else ["localhost", "127.0.0.1"])
        self.cors_origins = cors_origins or (["*"] if debug else ["http://localhost:3000"])

def create_base_app(
    config: AppConfig,
    lifespan_handler: Optional[Any] = None
) -> FastAPI:
    """Create a FastAPI application with common middleware and handlers"""
    
    app = FastAPI(
        title=config.title,
        description=config.description,
        version=config.version,
        docs_url="/docs" if config.debug else None,
        redoc_url="/redoc" if config.debug else None,
        lifespan=lifespan_handler
    )

    # Security middleware
    app.add_middleware(
        TrustedHostMiddleware,
        allowed_hosts=config.allowed_hosts
    )

    # CORS middleware
    app.add_middleware(
        CORSMiddleware,
        allow_origins=config.cors_origins,
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
            logger.info(f"Response: {response.status_code} - {process_time:.3f}s")
            
            # Add timing header
            response.headers["X-Process-Time"] = str(process_time)
            
            return response
            
        except Exception as e:
            process_time = time.time() - start_time
            logger.error(f"Request failed: {str(e)} - {process_time:.3f}s")
            
            return JSONResponse(
                status_code=500,
                content=ResponseHandler.error("Internal server error").detail,
                headers={"X-Process-Time": str(process_time)}
            )

    # Global exception handler for service exceptions
    @app.exception_handler(AnalysisServiceException)
    async def service_exception_handler(request: Request, exc: AnalysisServiceException):
        logger.error(f"Service exception: {exc.message}")
        return JSONResponse(
            status_code=exc.status_code,
            content={"error": {
                "code": exc.code,
                "message": exc.message,
                "timestamp": "2024-01-01T00:00:00Z"  # Would use datetime.utcnow().isoformat()
            }}
        )

    # Global exception handler
    @app.exception_handler(Exception)
    async def global_exception_handler(request: Request, exc: Exception):
        logger.error(f"Unhandled exception: {str(exc)}", exc_info=True)
        return JSONResponse(
            status_code=500,
            content=ResponseHandler.internal_error().detail
        )

    # Root endpoint
    @app.get("/")
    async def root():
        return ResponseHandler.success({
            "service": config.title,
            "status": "running",
            "version": config.version
        })

    # Health endpoint
    @app.get("/health")
    async def health():
        return ResponseHandler.success({
            "status": "healthy",
            "service": config.title,
            "timestamp": "2024-01-01T00:00:00Z"  # Would use datetime.utcnow().isoformat()
        })

    return app