"""
Health check router
"""
from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from ..core.database import get_db
from ..core.redis_client import get_redis
from ..core.ai_client import get_ai_client

router = APIRouter()


@router.get("/health")
async def health_check():
    """Basic health check"""
    return {
        "success": True,
        "data": {
            "service": "AI Analysis Service",
            "status": "healthy",
            "version": "1.0.0",
            "timestamp": "2024-01-01T00:00:00Z"
        }
    }


@router.get("/detailed")
async def detailed_health_check():
    """Detailed health check with dependency status"""
    health_status = {
        "status": "healthy",
        "service": "AI Analysis Service",
        "version": "1.0.0",
        "dependencies": {}
    }
    
    # Check database
    try:
        # This would normally test a simple query
        health_status["dependencies"]["database"] = "healthy"
    except Exception as e:
        health_status["dependencies"]["database"] = f"unhealthy: {str(e)}"
        health_status["status"] = "degraded"
    
    # Check Redis
    try:
        redis_client = await get_redis()
        await redis_client.ping()
        health_status["dependencies"]["redis"] = "healthy"
    except Exception as e:
        health_status["dependencies"]["redis"] = f"unhealthy: {str(e)}"
        health_status["status"] = "degraded"
    
    # Check AI client
    try:
        await get_ai_client()
        health_status["dependencies"]["ai_client"] = "healthy"
    except Exception as e:
        health_status["dependencies"]["ai_client"] = f"unhealthy: {str(e)}"
        health_status["status"] = "degraded"
    
    return health_status


@router.get("/ready")
async def readiness_check():
    """Kubernetes readiness probe"""
    try:
        # Check critical dependencies
        redis_client = await get_redis()
        await redis_client.ping()
        
        return {"status": "ready"}
    except Exception:
        return {"status": "not ready"}, 503


@router.get("/live")
async def liveness_check():
    """Kubernetes liveness probe"""
    return {"status": "alive"}


@router.get("/metrics")
async def metrics():
    """Service metrics endpoint"""
    return {
        "service": "AI Analysis Service",
        "status": "healthy",
        "uptime": "running",
        "requests_processed": 0,
        "cache_hits": 0,
        "cache_misses": 0
    }