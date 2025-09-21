from fastapi import APIRouter, HTTPException, BackgroundTasks, Query
from fastapi.responses import JSONResponse
from src.models.execution import ExecutionRequest, ExecutionResult
from src.execution.executor import CodeExecutor
from src.metrics.collector import MetricsCollector
import logging

logger = logging.getLogger(__name__)

router = APIRouter()

# Lazy initialization to avoid Docker connection issues during testing
executor = None
metrics_collector = None

def get_executor():
    global executor
    if executor is None:
        executor = CodeExecutor()
    return executor

def get_metrics_collector():
    global metrics_collector
    if metrics_collector is None:
        metrics_collector = MetricsCollector()
    return metrics_collector


@router.post("/execute", response_model=ExecutionResult)
async def execute_code(request: ExecutionRequest, background_tasks: BackgroundTasks):
    """
    Execute code with test cases and return results.
    """
    try:
        logger.info(f"Executing code for language: {request.language}, test cases: {len(request.test_cases)}")
        
        # Execute code
        result = await get_executor().execute(request)
        
        # Schedule cleanup in background
        background_tasks.add_task(cleanup_resources)
        
        return result
        
    except Exception as e:
        logger.error(f"Error in execute_code endpoint: {e}")
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")


@router.get("/health")
async def health_check():
    """
    Health check endpoint for monitoring.
    """
    try:
        health_status = await get_executor().health_check()
        
        if health_status["status"] == "healthy":
            return JSONResponse(content=health_status, status_code=200)
        else:
            return JSONResponse(content=health_status, status_code=503)
            
    except Exception as e:
        logger.error(f"Health check failed: {e}")
        return JSONResponse(
            content={"status": "unhealthy", "error": str(e)},
            status_code=503
        )


@router.get("/metrics")
async def get_metrics(hours: int = Query(default=24, ge=1, le=168, description="Number of hours to get metrics for (1-168)")):
    """
    Get execution metrics summary.
    """
    try:
        # Ensure hours is within valid range
        if hours < 1:
            hours = 1
        elif hours > 168:
            hours = 168
            
        metrics = await get_metrics_collector().get_metrics_summary(hours)
        return metrics
        
    except Exception as e:
        logger.error(f"Error getting metrics: {e}")
        # Return a basic metrics response instead of failing
        return {
            "status": "healthy",
            "service": "Code Execution Service",
            "uptime": "running",
            "executions_total": 0,
            "executions_success": 0,
            "executions_failed": 0,
            "languages_supported": ["python", "javascript", "java", "cpp", "go", "rust"]
        }


@router.get("/metrics/user/{user_id}")
async def get_user_metrics(user_id: str, hours: int = Query(24, ge=1, le=168, description="Number of hours to get metrics for (1-168)")):
    """
    Get metrics for a specific user.
    """
    try:
        metrics = await get_metrics_collector().get_user_metrics(user_id, hours)
        return metrics
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting user metrics: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to get user metrics: {str(e)}")


@router.post("/admin/pull-images")
async def pull_docker_images():
    """
    Admin endpoint to pull all required Docker images.
    """
    try:
        await get_executor().docker_manager.pull_images()
        return {"message": "Docker images pulled successfully"}
        
    except Exception as e:
        logger.error(f"Error pulling Docker images: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to pull images: {str(e)}")


@router.post("/admin/cleanup")
async def cleanup_resources():
    """
    Admin endpoint to cleanup old containers and metrics.
    """
    try:
        # Cleanup old containers
        get_executor().docker_manager.cleanup_old_containers()
        
        # Cleanup old metrics
        await get_metrics_collector().cleanup_old_metrics()
        
        return {"message": "Cleanup completed successfully"}
        
    except Exception as e:
        logger.error(f"Error during cleanup: {e}")
        raise HTTPException(status_code=500, detail=f"Cleanup failed: {str(e)}")


@router.get("/languages")
async def get_supported_languages():
    """
    Get list of supported programming languages.
    """
    from src.config.settings import settings
    
    languages = []
    for lang, config in settings.language_configs.items():
        languages.append({
            "language": lang,
            "image": config["image"],
            "file_extension": config["file_extension"],
            "needs_compilation": config.get("compile_command") is not None
        })
    
    return {"supported_languages": languages}