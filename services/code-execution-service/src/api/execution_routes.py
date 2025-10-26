from fastapi import APIRouter, HTTPException, BackgroundTasks
from fastapi.responses import JSONResponse
from typing import Dict, Any
import logging
from src.models.execution import ExecutionRequest, ExecutionResult
from src.execution.executor import CodeExecutor
from src.services.CodeMergerService import CodeMergerService
import asyncio

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/v1/execution", tags=["execution"])

# Global instances will be initialized lazily
executor = None
code_merger = CodeMergerService()


def get_executor():
    """Get or create executor instance."""
    global executor
    if executor is None:
        executor = CodeExecutor()
    return executor


@router.post("/execute", response_model=ExecutionResult)
async def execute_code(request: ExecutionRequest) -> ExecutionResult:
    """
    Execute user code with LeetCode-style hidden code merging.
    
    This endpoint handles the complete LeetCode-style execution flow:
    1. Validates user code
    2. Merges user code with hidden infrastructure code
    3. Executes the complete program against test cases
    4. Returns detailed results
    """
    try:
        logger.info(f"Received execution request for {request.language} with {len(request.test_cases)} test cases")
        
        # Execute the code (merging is handled internally by the executor)
        executor_instance = get_executor()
        result = await executor_instance.execute(request)
        
        logger.info(f"Execution completed with status: {result.status}, passed: {result.passed_tests}/{result.total_tests}")
        
        return result
        
    except Exception as e:
        logger.error(f"Execution failed: {e}", exc_info=True)
        raise HTTPException(
            status_code=500,
            detail=f"Code execution failed: {str(e)}"
        )


@router.post("/validate", response_model=Dict[str, Any])
async def validate_code(request: ExecutionRequest) -> Dict[str, Any]:
    """
    Validate user code without executing it.
    
    This endpoint performs security validation and code structure checks
    without actually running the code.
    """
    try:
        # Validate user code structure and syntax
        is_valid, error_msg = code_merger.validate_user_code(
            request.code, request.language
        )
        
        if not is_valid:
            return {
                "valid": False,
                "error": error_msg,
                "suggestions": _get_validation_suggestions(request.language, str(error_msg))
            }
        
        # Security validation
        executor_instance = get_executor()
        violations = executor_instance.security_validator.validate_code(request)
        
        if violations:
            return {
                "valid": False,
                "error": "Security violations detected",
                "violations": violations[:5],  # Limit to first 5 violations
                "suggestions": _get_security_suggestions(violations)
            }
        
        # Extract function information
        function_name = code_merger.extract_function_name(request.code, request.language)
        
        return {
            "valid": True,
            "function_name": function_name,
            "language": request.language.value,
            "code_length": len(request.code),
            "estimated_complexity": _estimate_complexity(request.code)
        }
        
    except Exception as e:
        logger.error(f"Code validation failed: {e}", exc_info=True)
        raise HTTPException(
            status_code=500,
            detail=f"Code validation failed: {str(e)}"
        )


@router.post("/merge-preview", response_model=Dict[str, str])
async def preview_merged_code(request: ExecutionRequest) -> Dict[str, str]:
    """
    Preview how user code will be merged with hidden code.
    
    This is useful for debugging and understanding the complete program structure.
    Note: This endpoint should only be available in development/debug mode.
    """
    try:
        if not request.hidden_code:
            raise HTTPException(
                status_code=400,
                detail="Hidden code is required for merge preview"
            )
        
        # Validate user code first
        is_valid, error_msg = code_merger.validate_user_code(
            request.code, request.language
        )
        
        if not is_valid:
            raise HTTPException(
                status_code=400,
                detail=f"Invalid user code: {error_msg}"
            )
        
        # Merge the code
        merged_code = code_merger.merge_code(
            request.code, request.hidden_code, request.language
        )
        
        return {
            "user_code": request.code,
            "hidden_code": request.hidden_code,
            "merged_code": merged_code,
            "language": request.language.value
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Code merge preview failed: {e}", exc_info=True)
        raise HTTPException(
            status_code=500,
            detail=f"Code merge preview failed: {str(e)}"
        )


@router.get("/health")
async def health_check() -> Dict[str, Any]:
    """
    Health check endpoint for the execution service.
    """
    try:
        executor_instance = get_executor()
        health_status = await executor_instance.health_check()
        
        return {
            "service": "code-execution-service",
            "status": health_status.get("status", "unknown"),
            "timestamp": health_status.get("timestamp"),
            "details": {
                "docker": health_status.get("docker", "unknown"),
                "cache_size": health_status.get("cache_size", 0),
                "supported_languages": ["python", "javascript", "java", "cpp", "go", "rust"]
            }
        }
        
    except Exception as e:
        logger.error(f"Health check failed: {e}", exc_info=True)
        return {
            "service": "code-execution-service",
            "status": "unhealthy",
            "error": str(e),
            "timestamp": None
        }


@router.post("/warmup")
async def warmup_service(background_tasks: BackgroundTasks) -> Dict[str, str]:
    """
    Warm up the execution service by pre-pulling images and initializing containers.
    """
    try:
        executor_instance = get_executor()
        background_tasks.add_task(executor_instance.warmup)
        
        return {
            "message": "Warmup initiated",
            "status": "in_progress"
        }
        
    except Exception as e:
        logger.error(f"Warmup failed: {e}", exc_info=True)
        raise HTTPException(
            status_code=500,
            detail=f"Warmup failed: {str(e)}"
        )


@router.delete("/cache")
async def clear_cache() -> Dict[str, str]:
    """
    Clear the execution result cache.
    """
    try:
        executor_instance = get_executor()
        await executor_instance.clear_cache()
        
        return {
            "message": "Cache cleared successfully",
            "status": "success"
        }
        
    except Exception as e:
        logger.error(f"Cache clear failed: {e}", exc_info=True)
        raise HTTPException(
            status_code=500,
            detail=f"Cache clear failed: {str(e)}"
        )


@router.get("/metrics")
async def get_metrics() -> Dict[str, Any]:
    """
    Get execution metrics and statistics.
    """
    try:
        # Get system health
        executor_instance = get_executor()
        health = await executor_instance.health_check()
        
        # Get metrics from collector
        hourly_stats = await executor_instance.metrics_collector.get_hourly_stats(24)
        daily_stats = await executor_instance.metrics_collector.get_daily_stats(7)
        system_health = await executor_instance.metrics_collector.get_system_health()
        
        return {
            "system_health": system_health,
            "service_health": health,
            "hourly_stats": hourly_stats,
            "daily_stats": daily_stats,
            "cache_size": health.get("cache_size", 0)
        }
        
    except Exception as e:
        logger.error(f"Metrics retrieval failed: {e}", exc_info=True)
        raise HTTPException(
            status_code=500,
            detail=f"Metrics retrieval failed: {str(e)}"
        )


def _get_validation_suggestions(language, error_msg: str) -> list[str]:
    """Get validation suggestions based on error message."""
    suggestions = []
    
    if "function definition" in error_msg.lower():
        if language.value == "python":
            suggestions.append("Make sure your function starts with 'def function_name(parameters):'")
        elif language.value == "javascript":
            suggestions.append("Make sure your function starts with 'function functionName(parameters) {'")
        elif language.value == "java":
            suggestions.append("Make sure your method is public and follows Java syntax: 'public returnType methodName(parameters) {'")
    
    if "syntax error" in error_msg.lower():
        suggestions.append("Check for missing brackets, semicolons, or incorrect indentation")
        suggestions.append("Verify that all opening brackets have corresponding closing brackets")
    
    return suggestions


def _get_security_suggestions(violations: list[str]) -> list[str]:
    """Get security suggestions based on violations."""
    suggestions = []
    
    for violation in violations[:3]:  # Only process first 3 violations
        if "import" in violation.lower():
            suggestions.append("Remove unnecessary imports - only standard library functions are allowed")
        elif "dangerous pattern" in violation.lower():
            suggestions.append("Remove system calls, file operations, or network operations")
        elif "length" in violation.lower():
            suggestions.append("Reduce code length - focus on the core algorithm")
    
    return suggestions


def _estimate_complexity(code: str) -> str:
    """Estimate code complexity based on simple heuristics."""
    lines = len([line for line in code.split('\n') if line.strip()])
    
    if lines <= 10:
        return "low"
    elif lines <= 30:
        return "medium"
    else:
        return "high"