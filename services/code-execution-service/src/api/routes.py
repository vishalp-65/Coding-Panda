from fastapi import APIRouter, HTTPException, BackgroundTasks, Query
from fastapi.responses import JSONResponse
from src.models.execution import ExecutionRequest, ExecutionResult
from src.execution.executor import CodeExecutor
from src.metrics.collector import MetricsCollector
from src.config.settings import settings
import logging

logger = logging.getLogger(__name__)

router = APIRouter()

# Lazy initialization to avoid Docker connection issues during testing
_executor = None
_metrics_collector = None


def get_executor() -> CodeExecutor:
    """Get or create CodeExecutor instance."""
    global _executor
    if _executor is None:
        _executor = CodeExecutor()
    return _executor


def get_metrics_collector() -> MetricsCollector:
    """Get or create MetricsCollector instance."""
    global _metrics_collector
    if _metrics_collector is None:
        _metrics_collector = MetricsCollector()
    return _metrics_collector


@router.post("/execute", response_model=ExecutionResult)
async def execute_code(
    request: ExecutionRequest, 
    background_tasks: BackgroundTasks
):
    """
    Execute code with test cases and return results.
    
    This endpoint:
    - Validates code for security violations
    - Executes code in isolated Docker containers
    - Runs all test cases
    - Returns detailed execution results
    """
    try:
        logger.info(
            f"Executing code for language: {request.language}, "
            f"test cases: {len(request.test_cases)}, "
            f"user: {request.user_id}"
        )
        
        # Execute code
        executor = get_executor()
        result = await executor.execute(request)
        
        # Schedule cleanup in background
        background_tasks.add_task(cleanup_resources)
        
        logger.info(
            f"Execution completed: status={result.status}, "
            f"passed={result.passed_tests}/{result.total_tests}"
        )
        
        return result
        
    except Exception as e:
        logger.error(f"Error in execute_code endpoint: {e}", exc_info=True)
        raise HTTPException(
            status_code=500, 
            detail=f"Internal server error: {str(e)}"
        )


@router.get("/health")
async def health_check():
    """
    Health check endpoint for monitoring.
    Returns service status and Docker connectivity.
    """
    try:
        # Check Docker connection
        executor = get_executor()
        health_status = await executor.health_check()
        
        return JSONResponse(
            content={
                "success": True,
                "data": {
                    "service": "Code Execution Service",
                    "status": health_status["status"],
                    "docker_status": health_status["docker"],
                    "timestamp": health_status["timestamp"],
                    "version": "1.0.0"
                }
            }, 
            status_code=200
        )
            
    except Exception as e:
        logger.error(f"Health check failed: {e}", exc_info=True)
        return JSONResponse(
            content={
                "success": False,
                "error": {
                    "code": "HEALTH_CHECK_FAILED",
                    "message": str(e)
                }
            },
            status_code=503
        )


@router.get("/metrics")
async def get_metrics(
    hours: int = Query(
        default=24, 
        ge=1, 
        le=168, 
        description="Number of hours to get metrics for (1-168)"
    )
):
    """
    Get execution metrics summary.
    
    Returns aggregated metrics including:
    - Total executions
    - Success/failure rates
    - Language statistics
    - Average execution time and memory usage
    """
    try:
        collector = get_metrics_collector()
        metrics = await collector.get_metrics_summary(hours)
        return metrics
        
    except Exception as e:
        logger.error(f"Error getting metrics: {e}", exc_info=True)
        # Return basic fallback metrics
        return {
            "status": "healthy",
            "service": "Code Execution Service",
            "total_executions": 0,
            "message": "Metrics temporarily unavailable"
        }


@router.get("/metrics/user/{user_id}")
async def get_user_metrics(
    user_id: str, 
    hours: int = Query(
        default=24, 
        ge=1, 
        le=168, 
        description="Number of hours to get metrics for (1-168)"
    )
):
    """
    Get metrics for a specific user.
    
    Returns user-specific execution statistics.
    """
    try:
        collector = get_metrics_collector()
        metrics = await collector.get_user_metrics(user_id, hours)
        return metrics
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting user metrics: {e}", exc_info=True)
        raise HTTPException(
            status_code=500, 
            detail=f"Failed to get user metrics: {str(e)}"
        )


@router.get("/languages")
async def get_supported_languages():
    """
    Get list of supported programming languages.
    
    Returns information about each supported language including:
    - Language name
    - Docker image used
    - File extension
    - Whether compilation is needed
    """
    languages = []
    
    for lang, config in settings.language_configs.items():
        languages.append({
            "language": lang,
            "image": config["image"],
            "file_extension": config["file_extension"],
            "needs_compilation": config.get("compile_command") is not None
        })
    
    return {
        "supported_languages": languages,
        "total": len(languages)
    }


@router.post("/admin/pull-images")
async def pull_docker_images():
    """
    Admin endpoint to pull all required Docker images.
    
    This should be run during deployment to ensure all
    language environments are available.
    """
    try:
        executor = get_executor()
        await executor.docker_manager.pull_images()
        
        return {
            "success": True,
            "message": "Docker images pulled successfully",
            "languages": list(settings.language_configs.keys())
        }
        
    except Exception as e:
        logger.error(f"Error pulling Docker images: {e}", exc_info=True)
        raise HTTPException(
            status_code=500, 
            detail=f"Failed to pull images: {str(e)}"
        )


@router.post("/admin/cleanup")
async def cleanup_resources():
    """
    Admin endpoint to cleanup old containers and metrics.
    
    Removes:
    - Stopped Docker containers older than 1 hour
    - Metrics older than 7 days
    """
    try:
        executor = get_executor()
        collector = get_metrics_collector()
        
        # Cleanup old containers
        executor.docker_manager.cleanup_old_containers()
        
        # Cleanup old metrics
        await collector.cleanup_old_metrics()
        
        return {
            "success": True,
            "message": "Cleanup completed successfully"
        }
        
    except Exception as e:
        logger.error(f"Error during cleanup: {e}", exc_info=True)
        raise HTTPException(
            status_code=500, 
            detail=f"Cleanup failed: {str(e)}"
        )