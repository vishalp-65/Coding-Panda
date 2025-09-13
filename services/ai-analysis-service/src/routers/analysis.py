"""
Analysis API router
"""
import logging
from typing import List
from fastapi import APIRouter, BackgroundTasks, Depends

from ..models.analysis import (
    AnalysisRequest, AnalysisResult, HintRequest, Hint,
    ExplanationRequest, CodeExplanation
)
from ..services.analysis_service import AnalysisService
from ..utils.response_handler import ResponseHandler
from ..utils.validation import ValidationUtils
from ..core.exceptions import AnalysisServiceException
from ..config import settings

logger = logging.getLogger(__name__)
router = APIRouter()

# Global analysis service instance
analysis_service = AnalysisService()


@router.post("/analyze", response_model=AnalysisResult)
async def analyze_code(request: AnalysisRequest):
    """
    Analyze code for quality, security, performance, and other issues
    """
    try:
        # Validate request
        ValidationUtils.validate_code_length(request.code)
        ValidationUtils.validate_code_not_empty(request.code)
        
        # Perform analysis
        result = await analysis_service.analyze_code(request)
        
        return result
        
    except AnalysisServiceException as e:
        logger.error(f"Analysis service error: {e}")
        raise ResponseHandler.error(e.message, e.code, e.status_code)
    except Exception as e:
        logger.error(f"Code analysis failed: {e}")
        raise ResponseHandler.internal_error("Internal server error during code analysis")


@router.post("/hints", response_model=List[Hint])
async def generate_hints(request: HintRequest):
    """
    Generate progressive hints for a coding problem
    """
    try:
        # Validate request
        ValidationUtils.validate_problem_id(request.problem_id)
        ValidationUtils.validate_code_length(request.user_code)
        
        # Generate hints
        hints = await analysis_service.generate_hints(request)
        
        return hints
        
    except AnalysisServiceException as e:
        logger.error(f"Hint generation error: {e}")
        raise ResponseHandler.error(e.message, e.code, e.status_code)
    except Exception as e:
        logger.error(f"Hint generation failed: {e}")
        raise ResponseHandler.internal_error("Internal server error during hint generation")


@router.post("/explain", response_model=CodeExplanation)
async def explain_code(request: ExplanationRequest):
    """
    Generate detailed explanation of code
    """
    try:
        # Validate request
        if not request.code.strip():
            raise HTTPException(
                status_code=400,
                detail="Code cannot be empty"
            )
        
        if len(request.code) > settings.MAX_CODE_LENGTH:
            raise HTTPException(
                status_code=400,
                detail=f"Code length exceeds maximum of {settings.MAX_CODE_LENGTH} characters"
            )
        
        # Generate explanation
        explanation = await analysis_service.explain_code(request)
        
        return explanation
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Code explanation failed: {e}")
        raise HTTPException(
            status_code=500,
            detail="Internal server error during code explanation"
        )


@router.get("/languages")
async def get_supported_languages():
    """
    Get list of supported programming languages
    """
    from ..models.analysis import ProgrammingLanguage
    
    return {
        "languages": [lang.value for lang in ProgrammingLanguage],
        "count": len(ProgrammingLanguage)
    }


@router.get("/analysis-types")
async def get_analysis_types():
    """
    Get list of available analysis types
    """
    from ..models.analysis import AnalysisType
    
    return {
        "analysis_types": [atype.value for atype in AnalysisType],
        "count": len(AnalysisType)
    }


@router.post("/batch-analyze")
async def batch_analyze_code(
    requests: List[AnalysisRequest],
    background_tasks: BackgroundTasks
):
    """
    Analyze multiple code samples in batch
    """
    try:
        # Validate batch size
        ValidationUtils.validate_batch_size(requests)
        
        # Validate all requests
        for i, request in enumerate(requests):
            try:
                ValidationUtils.validate_code_length(request.code)
                ValidationUtils.validate_code_not_empty(request.code)
            except AnalysisServiceException as e:
                raise ResponseHandler.validation_error(f"Request {i}: {e.message}")
        
        # Process requests
        results = []
        for request in requests:
            try:
                result = await analysis_service.analyze_code(request)
                results.append({
                    "status": "success",
                    "result": result
                })
            except Exception as e:
                logger.error(f"Batch analysis item failed: {e}")
                results.append({
                    "status": "error",
                    "error": str(e)
                })
        
        return ResponseHandler.success({
            "batch_id": f"batch_{hash(str(requests))}",
            "total_requests": len(requests),
            "results": results
        })
        
    except AnalysisServiceException as e:
        logger.error(f"Batch analysis validation error: {e}")
        raise ResponseHandler.error(e.message, e.code, e.status_code)
    except Exception as e:
        logger.error(f"Batch analysis failed: {e}")
        raise ResponseHandler.internal_error("Internal server error during batch analysis")


@router.get("/metrics")
async def get_service_metrics():
    """
    Get service metrics and statistics
    """
    try:
        # In a real implementation, you would collect actual metrics
        # from monitoring systems, database, etc.
        
        return {
            "service": "AI Analysis Service",
            "version": "1.0.0",
            "uptime": "N/A",  # Would be calculated from start time
            "total_analyses": "N/A",  # Would be from database/metrics
            "cache_hit_rate": "N/A",  # Would be from Redis metrics
            "average_analysis_time": "N/A",  # Would be calculated
            "supported_languages": len([lang.value for lang in __import__('..models.analysis', fromlist=['ProgrammingLanguage']).ProgrammingLanguage]),
            "ai_provider": settings.AI_MODEL_PROVIDER,
            "ai_model": settings.AI_MODEL_NAME
        }
        
    except Exception as e:
        logger.error(f"Failed to get metrics: {e}")
        raise HTTPException(
            status_code=500,
            detail="Internal server error while retrieving metrics"
        )