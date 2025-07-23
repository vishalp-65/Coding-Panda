"""
Learning and recommendation API router
"""
import logging
from typing import List
from fastapi import APIRouter, HTTPException, Query
from fastapi.responses import JSONResponse

from ..models.learning import (
    SkillAssessment, SkillAssessmentRequest, LearningPath, LearningPathRequest,
    ContextualRecommendation, RecommendationRequest, ProgressiveHint,
    ProgressiveHintRequest, PerformancePattern, DifficultyProgression
)
from ..services.learning_service import LearningService
from ..config import settings

logger = logging.getLogger(__name__)
router = APIRouter()

# Global learning service instance
learning_service = LearningService()


@router.post("/assess-skills", response_model=SkillAssessment)
async def assess_user_skills(request: SkillAssessmentRequest):
    """
    Perform comprehensive skill assessment for a user
    """
    try:
        # Validate request
        if not request.user_id:
            raise HTTPException(
                status_code=400,
                detail="User ID is required"
            )
        
        # Perform skill assessment
        assessment = await learning_service.assess_user_skills(request)
        
        return assessment
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Skill assessment failed for user {request.user_id}: {e}")
        raise HTTPException(
            status_code=500,
            detail="Internal server error during skill assessment"
        )


@router.post("/generate-learning-path", response_model=LearningPath)
async def generate_learning_path(request: LearningPathRequest):
    """
    Generate personalized learning path for a user
    """
    try:
        # Validate request
        if not request.user_id:
            raise HTTPException(
                status_code=400,
                detail="User ID is required"
            )
        
        if not request.target_concepts:
            raise HTTPException(
                status_code=400,
                detail="At least one target concept is required"
            )
        
        if request.time_commitment <= 0:
            raise HTTPException(
                status_code=400,
                detail="Time commitment must be positive"
            )
        
        # Generate learning path
        learning_path = await learning_service.generate_learning_path(request)
        
        return learning_path
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Learning path generation failed for user {request.user_id}: {e}")
        raise HTTPException(
            status_code=500,
            detail="Internal server error during learning path generation"
        )


@router.post("/recommendations", response_model=ContextualRecommendation)
async def get_contextual_recommendations(request: RecommendationRequest):
    """
    Get context-aware learning recommendations
    """
    try:
        # Validate request
        if not request.user_id:
            raise HTTPException(
                status_code=400,
                detail="User ID is required"
            )
        
        if not request.context:
            raise HTTPException(
                status_code=400,
                detail="Context is required"
            )
        
        if request.max_recommendations <= 0 or request.max_recommendations > 20:
            raise HTTPException(
                status_code=400,
                detail="Max recommendations must be between 1 and 20"
            )
        
        # Generate recommendations
        recommendations = await learning_service.generate_contextual_recommendations(request)
        
        return recommendations
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Recommendation generation failed for user {request.user_id}: {e}")
        raise HTTPException(
            status_code=500,
            detail="Internal server error during recommendation generation"
        )


@router.post("/progressive-hints", response_model=List[ProgressiveHint])
async def generate_progressive_hints(request: ProgressiveHintRequest):
    """
    Generate progressive, context-aware hints for a problem
    """
    try:
        # Validate request
        if not request.user_id:
            raise HTTPException(
                status_code=400,
                detail="User ID is required"
            )
        
        if not request.problem_id:
            raise HTTPException(
                status_code=400,
                detail="Problem ID is required"
            )
        
        if not request.current_code.strip():
            raise HTTPException(
                status_code=400,
                detail="Current code cannot be empty"
            )
        
        if len(request.current_code) > settings.MAX_CODE_LENGTH:
            raise HTTPException(
                status_code=400,
                detail=f"Code length exceeds maximum of {settings.MAX_CODE_LENGTH} characters"
            )
        
        if request.hint_level < 1 or request.hint_level > 5:
            raise HTTPException(
                status_code=400,
                detail="Hint level must be between 1 and 5"
            )
        
        # Generate progressive hints
        hints = await learning_service.generate_progressive_hints(request)
        
        return hints
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Progressive hint generation failed: {e}")
        raise HTTPException(
            status_code=500,
            detail="Internal server error during hint generation"
        )


@router.get("/performance-patterns/{user_id}", response_model=List[PerformancePattern])
async def analyze_performance_patterns(user_id: str):
    """
    Analyze user performance patterns
    """
    try:
        # Validate user ID
        if not user_id:
            raise HTTPException(
                status_code=400,
                detail="User ID is required"
            )
        
        # Analyze performance patterns
        patterns = await learning_service.analyze_performance_patterns(user_id)
        
        return patterns
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Performance pattern analysis failed for user {user_id}: {e}")
        raise HTTPException(
            status_code=500,
            detail="Internal server error during performance analysis"
        )


@router.get("/difficulty-progression/{user_id}", response_model=DifficultyProgression)
async def get_difficulty_progression(user_id: str):
    """
    Get difficulty progression recommendation for a user
    """
    try:
        # Validate user ID
        if not user_id:
            raise HTTPException(
                status_code=400,
                detail="User ID is required"
            )
        
        # Get difficulty progression recommendation
        progression = await learning_service.recommend_difficulty_progression(user_id)
        
        return progression
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Difficulty progression analysis failed for user {user_id}: {e}")
        raise HTTPException(
            status_code=500,
            detail="Internal server error during difficulty progression analysis"
        )


@router.get("/weak-areas/{user_id}")
async def get_user_weak_areas(
    user_id: str,
    language: str = Query(default="python", description="Programming language")
):
    """
    Get identified weak areas for a user
    """
    try:
        from ..models.analysis import ProgrammingLanguage
        
        # Validate inputs
        if not user_id:
            raise HTTPException(
                status_code=400,
                detail="User ID is required"
            )
        
        try:
            prog_language = ProgrammingLanguage(language.lower())
        except ValueError:
            raise HTTPException(
                status_code=400,
                detail=f"Unsupported language: {language}"
            )
        
        # Get skill assessment with weak areas
        assessment_request = SkillAssessmentRequest(
            user_id=user_id,
            language=prog_language,
            include_weak_areas=True
        )
        
        assessment = await learning_service.assess_user_skills(assessment_request)
        
        return {
            "user_id": user_id,
            "language": language,
            "weak_areas": assessment.weak_areas,
            "assessment_date": assessment.assessment_date
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Weak area analysis failed for user {user_id}: {e}")
        raise HTTPException(
            status_code=500,
            detail="Internal server error during weak area analysis"
        )


@router.get("/learning-resources")
async def get_learning_resources(
    concepts: List[str] = Query(default=[], description="Concept categories to filter by"),
    difficulty: str = Query(default=None, description="Difficulty level filter"),
    resource_type: str = Query(default=None, description="Resource type filter"),
    limit: int = Query(default=10, ge=1, le=50, description="Maximum number of resources")
):
    """
    Get learning resources filtered by criteria
    """
    try:
        from ..models.learning import ConceptCategory, DifficultyLevel, LearningResourceType
        
        # Validate and convert filters
        concept_filters = []
        if concepts:
            for concept_str in concepts:
                try:
                    concept_filters.append(ConceptCategory(concept_str.lower()))
                except ValueError:
                    raise HTTPException(
                        status_code=400,
                        detail=f"Invalid concept: {concept_str}"
                    )
        
        difficulty_filter = None
        if difficulty:
            try:
                difficulty_filter = DifficultyLevel(difficulty.lower())
            except ValueError:
                raise HTTPException(
                    status_code=400,
                    detail=f"Invalid difficulty: {difficulty}"
                )
        
        resource_type_filter = None
        if resource_type:
            try:
                resource_type_filter = LearningResourceType(resource_type.lower())
            except ValueError:
                raise HTTPException(
                    status_code=400,
                    detail=f"Invalid resource type: {resource_type}"
                )
        
        # Get filtered resources (mock implementation)
        all_resources = []
        for concept in (concept_filters or list(ConceptCategory)):
            concept_resources = learning_service.learning_resources_db.get(concept, [])
            
            # Apply filters
            filtered_resources = concept_resources
            
            if difficulty_filter:
                filtered_resources = [r for r in filtered_resources if r.difficulty == difficulty_filter]
            
            if resource_type_filter:
                filtered_resources = [r for r in filtered_resources if r.type == resource_type_filter]
            
            all_resources.extend(filtered_resources)
        
        # Remove duplicates and limit results
        unique_resources = []
        seen_ids = set()
        for resource in all_resources:
            if resource.id not in seen_ids:
                unique_resources.append(resource)
                seen_ids.add(resource.id)
        
        # Sort by relevance and limit
        sorted_resources = sorted(unique_resources, key=lambda x: x.relevance_score, reverse=True)
        limited_resources = sorted_resources[:limit]
        
        return {
            "resources": limited_resources,
            "total_found": len(unique_resources),
            "filters_applied": {
                "concepts": [c.value for c in concept_filters],
                "difficulty": difficulty_filter.value if difficulty_filter else None,
                "resource_type": resource_type_filter.value if resource_type_filter else None
            }
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Learning resource retrieval failed: {e}")
        raise HTTPException(
            status_code=500,
            detail="Internal server error during resource retrieval"
        )


@router.get("/concept-categories")
async def get_concept_categories():
    """
    Get list of available concept categories
    """
    from ..models.learning import ConceptCategory
    
    return {
        "categories": [
            {
                "value": category.value,
                "display_name": category.value.replace('_', ' ').title(),
                "description": f"Problems and concepts related to {category.value.replace('_', ' ')}"
            }
            for category in ConceptCategory
        ],
        "count": len(ConceptCategory)
    }


@router.get("/skill-levels")
async def get_skill_levels():
    """
    Get list of available skill levels
    """
    from ..models.learning import SkillLevel
    
    return {
        "levels": [
            {
                "value": level.value,
                "display_name": level.value.title(),
                "description": f"{level.value.title()} level programmer"
            }
            for level in SkillLevel
        ],
        "count": len(SkillLevel)
    }


@router.get("/difficulty-levels")
async def get_difficulty_levels():
    """
    Get list of available difficulty levels
    """
    from ..models.learning import DifficultyLevel
    
    return {
        "levels": [
            {
                "value": level.value,
                "display_name": level.value.title(),
                "description": f"{level.value.title()} difficulty problems"
            }
            for level in DifficultyLevel
        ],
        "count": len(DifficultyLevel)
    }


@router.post("/batch-assess-skills")
async def batch_assess_skills(requests: List[SkillAssessmentRequest]):
    """
    Perform batch skill assessments for multiple users
    """
    try:
        if len(requests) > 10:  # Limit batch size
            raise HTTPException(
                status_code=400,
                detail="Batch size cannot exceed 10 requests"
            )
        
        # Validate all requests
        for i, request in enumerate(requests):
            if not request.user_id:
                raise HTTPException(
                    status_code=400,
                    detail=f"Request {i}: User ID is required"
                )
        
        # Process requests
        results = []
        for request in requests:
            try:
                assessment = await learning_service.assess_user_skills(request)
                results.append({
                    "status": "success",
                    "user_id": request.user_id,
                    "assessment": assessment
                })
            except Exception as e:
                logger.error(f"Batch skill assessment failed for user {request.user_id}: {e}")
                results.append({
                    "status": "error",
                    "user_id": request.user_id,
                    "error": str(e)
                })
        
        return {
            "batch_id": f"batch_assess_{hash(str(requests))}",
            "total_requests": len(requests),
            "successful": len([r for r in results if r["status"] == "success"]),
            "failed": len([r for r in results if r["status"] == "error"]),
            "results": results
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Batch skill assessment failed: {e}")
        raise HTTPException(
            status_code=500,
            detail="Internal server error during batch skill assessment"
        )


@router.get("/learning-metrics")
async def get_learning_metrics():
    """
    Get learning service metrics and statistics
    """
    try:
        # In a real implementation, collect actual metrics
        from ..models.learning import ConceptCategory, SkillLevel, DifficultyLevel
        from ..models.analysis import ProgrammingLanguage
        
        return {
            "service": "Learning Service",
            "version": "1.0.0",
            "supported_concepts": len([c for c in ConceptCategory]),
            "supported_languages": len([l for l in ProgrammingLanguage]),
            "skill_levels": len([s for s in SkillLevel]),
            "difficulty_levels": len([d for d in DifficultyLevel]),
            "total_learning_resources": "N/A",  # Would be from database
            "total_assessments_performed": "N/A",  # Would be from metrics
            "total_learning_paths_generated": "N/A",  # Would be from metrics
            "average_assessment_time": "N/A",  # Would be calculated
            "cache_hit_rate": "N/A"  # Would be from Redis metrics
        }
        
    except Exception as e:
        logger.error(f"Failed to get learning metrics: {e}")
        raise HTTPException(
            status_code=500,
            detail="Internal server error while retrieving learning metrics"
        )