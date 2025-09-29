"""
Interview simulation API endpoints
"""
import logging
from datetime import datetime
from typing import Optional
from fastapi import APIRouter, HTTPException, Depends, BackgroundTasks
from fastapi.responses import JSONResponse

from ..models.interview import (
    CreateInterviewRequest, StartInterviewRequest, SubmitResponseRequest,
    GetNextQuestionRequest, GenerateFollowUpRequest, CompleteInterviewRequest,
    GetAnalyticsRequest, InterviewSession, InterviewQuestion, InterviewFeedback,
    InterviewAnalytics, InterviewResponse, InterviewType, CompanyType, DifficultyLevel
)
from ..services.interview_service import get_interview_service, InterviewService
from ..core.auth import get_current_user


logger = logging.getLogger(__name__)
router = APIRouter()


@router.post("/sessions", response_model=InterviewSession)
async def create_interview_session(
    request: CreateInterviewRequest,
    current_user: dict = Depends(get_current_user),
    interview_service: InterviewService = Depends(get_interview_service)
):
    """Create a new interview session"""
    try:
        # Validate user authorization
        if request.user_id != current_user.get('user_id') and not current_user.get('is_admin'):
            raise HTTPException(status_code=403, detail="Not authorized to create session for this user")
        
        session = await interview_service.create_interview_session(
            user_id=request.user_id,
            interview_type=request.interview_type,
            company_type=request.company_type,
            target_role=request.target_role,
            difficulty_level=request.difficulty_level,
            max_questions=request.max_questions,
            time_limit=request.time_limit,
            scheduled_time=request.scheduled_time
        )
        
        logger.info(f"Created interview session {session.id} for user {request.user_id}")
        return session
        
    except ValueError as e:
        logger.error(f"Error creating interview session: {e}")
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Unexpected error creating interview session: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")


@router.post("/sessions/{session_id}/start", response_model=InterviewSession)
async def start_interview_session(
    session_id: str,
    request: StartInterviewRequest,
    current_user: dict = Depends(get_current_user),
    interview_service: InterviewService = Depends(get_interview_service)
):
    """Start an interview session"""
    try:
        # Validate session ownership
        session = await interview_service._get_session(session_id)
        if not session:
            raise HTTPException(status_code=404, detail="Interview session not found")
        
        if session.user_id != current_user.get('user_id') and not current_user.get('is_admin'):
            raise HTTPException(status_code=403, detail="Not authorized to access this session")
        
        started_session = await interview_service.start_interview_session(
            session_id=session_id,
            user_preferences=request.user_preferences
        )
        
        logger.info(f"Started interview session {session_id}")
        return started_session
        
    except ValueError as e:
        logger.error(f"Error starting interview session: {e}")
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Unexpected error starting interview session: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")


@router.get("/sessions/{session_id}", response_model=InterviewSession)
async def get_interview_session(
    session_id: str,
    current_user: dict = Depends(get_current_user),
    interview_service: InterviewService = Depends(get_interview_service)
):
    """Get interview session details"""
    try:
        session = await interview_service._get_session(session_id)
        if not session:
            raise HTTPException(status_code=404, detail="Interview session not found")
        
        # Validate session ownership
        if session.user_id != current_user.get('user_id') and not current_user.get('is_admin'):
            raise HTTPException(status_code=403, detail="Not authorized to access this session")
        
        return session
        
    except Exception as e:
        logger.error(f"Error retrieving interview session: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")


@router.get("/sessions/{session_id}/current-question", response_model=Optional[InterviewQuestion])
async def get_current_question(
    session_id: str,
    current_user: dict = Depends(get_current_user),
    interview_service: InterviewService = Depends(get_interview_service)
):
    """Get the current question for the interview session"""
    try:
        # Validate session ownership
        session = await interview_service._get_session(session_id)
        if not session:
            raise HTTPException(status_code=404, detail="Interview session not found")
        
        if session.user_id != current_user.get('user_id') and not current_user.get('is_admin'):
            raise HTTPException(status_code=403, detail="Not authorized to access this session")
        
        question = await interview_service.get_current_question(session_id)
        return question
        
    except ValueError as e:
        logger.error(f"Error getting current question: {e}")
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Unexpected error getting current question: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")


@router.post("/sessions/{session_id}/responses")
async def submit_response(
    session_id: str,
    request: SubmitResponseRequest,
    current_user: dict = Depends(get_current_user),
    interview_service: InterviewService = Depends(get_interview_service)
):
    """Submit a response to the current interview question"""
    try:
        # Validate session ownership
        session = await interview_service._get_session(session_id)
        if not session:
            raise HTTPException(status_code=404, detail="Interview session not found")
        
        if session.user_id != current_user.get('user_id') and not current_user.get('is_admin'):
            raise HTTPException(status_code=403, detail="Not authorized to access this session")
        
        updated_session, next_question = await interview_service.submit_response(
            session_id=session_id,
            question_id=request.question_id,
            response_text=request.response_text,
            code_solution=request.code_solution,
            language=request.language,
            confidence_level=request.confidence_level
        )
        
        response_data = {
            "session": updated_session,
            "next_question": next_question,
            "session_completed": updated_session.status.value == "completed"
        }
        
        logger.info(f"Submitted response for question {request.question_id} in session {session_id}")
        return JSONResponse(content=response_data)
        
    except ValueError as e:
        logger.error(f"Error submitting response: {e}")
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Unexpected error submitting response: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")


@router.post("/sessions/{session_id}/follow-up", response_model=InterviewQuestion)
async def generate_follow_up_question(
    session_id: str,
    request: GenerateFollowUpRequest,
    current_user: dict = Depends(get_current_user),
    interview_service: InterviewService = Depends(get_interview_service)
):
    """Generate a follow-up question based on the previous response"""
    try:
        # Validate session ownership
        session = await interview_service._get_session(session_id)
        if not session:
            raise HTTPException(status_code=404, detail="Interview session not found")
        
        if session.user_id != current_user.get('user_id') and not current_user.get('is_admin'):
            raise HTTPException(status_code=403, detail="Not authorized to access this session")
        
        follow_up_question = await interview_service.generate_follow_up_question(
            session_id=session_id,
            previous_response=request.previous_response,
            context=request.context
        )
        
        logger.info(f"Generated follow-up question for session {session_id}")
        return follow_up_question
        
    except ValueError as e:
        logger.error(f"Error generating follow-up question: {e}")
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Unexpected error generating follow-up question: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")


@router.post("/sessions/{session_id}/complete")
async def complete_interview_session(
    session_id: str,
    request: CompleteInterviewRequest,
    background_tasks: BackgroundTasks,
    current_user: dict = Depends(get_current_user),
    interview_service: InterviewService = Depends(get_interview_service)
):
    """Complete an interview session and generate feedback"""
    try:
        # Validate session ownership
        session = await interview_service._get_session(session_id)
        if not session:
            raise HTTPException(status_code=404, detail="Interview session not found")
        
        if session.user_id != current_user.get('user_id') and not current_user.get('is_admin'):
            raise HTTPException(status_code=403, detail="Not authorized to access this session")
        
        # Mark session as completed if not already
        if session.status.value != "completed":
            session.status = "completed"
            session.end_time = datetime.utcnow()
            if session.start_time:
                duration = session.end_time - session.start_time
                session.total_duration = int(duration.total_seconds() / 60)
            await interview_service._store_session(session)
        
        # Generate feedback in background
        background_tasks.add_task(
            interview_service.evaluate_interview_performance,
            session_id
        )
        
        logger.info(f"Completed interview session {session_id}")
        return JSONResponse(content={
            "message": "Interview session completed successfully",
            "session_id": session_id,
            "feedback_generation": "in_progress"
        })
        
    except ValueError as e:
        logger.error(f"Error completing interview session: {e}")
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Unexpected error completing interview session: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")


@router.get("/sessions/{session_id}/feedback", response_model=InterviewFeedback)
async def get_interview_feedback(
    session_id: str,
    current_user: dict = Depends(get_current_user),
    interview_service: InterviewService = Depends(get_interview_service)
):
    """Get feedback for a completed interview session"""
    try:
        # Validate session ownership
        session = await interview_service._get_session(session_id)
        if not session:
            raise HTTPException(status_code=404, detail="Interview session not found")
        
        if session.user_id != current_user.get('user_id') and not current_user.get('is_admin'):
            raise HTTPException(status_code=403, detail="Not authorized to access this session")
        
        # Check if feedback exists
        feedback_key = f"interview_feedback:{session_id}"
        feedback_data = await interview_service.redis_client.get(feedback_key)
        
        if not feedback_data:
            # Generate feedback if not exists
            if session.status.value == "completed":
                feedback = await interview_service.evaluate_interview_performance(session_id)
                return feedback
            else:
                raise HTTPException(status_code=400, detail="Interview session not completed")
        
        feedback = InterviewFeedback.parse_raw(feedback_data)
        return feedback
        
    except ValueError as e:
        logger.error(f"Error getting interview feedback: {e}")
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Unexpected error getting interview feedback: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")


@router.get("/users/{user_id}/analytics", response_model=InterviewAnalytics)
async def get_user_interview_analytics(
    user_id: str,
    time_range: Optional[str] = None,
    company_type: Optional[CompanyType] = None,
    current_user: dict = Depends(get_current_user),
    interview_service: InterviewService = Depends(get_interview_service)
):
    """Get interview analytics for a user"""
    try:
        # Validate user authorization
        if user_id != current_user.get('user_id') and not current_user.get('is_admin'):
            raise HTTPException(status_code=403, detail="Not authorized to access this user's analytics")
        
        analytics = await interview_service.get_user_analytics(
            user_id=user_id,
            time_range=time_range,
            company_type=company_type
        )
        
        return analytics
        
    except Exception as e:
        logger.error(f"Error getting user analytics: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")


@router.get("/company-patterns", response_model=dict)
async def get_company_interview_patterns(
    current_user: dict = Depends(get_current_user),
    interview_service: InterviewService = Depends(get_interview_service)
):
    """Get available company interview patterns"""
    try:
        patterns = {}
        for company_type, pattern in interview_service.company_patterns.items():
            patterns[company_type.value] = {
                "typical_duration": pattern.typical_duration,
                "question_distribution": {qt.value: ratio for qt, ratio in pattern.question_distribution.items()},
                "common_concepts": [c.value for c in pattern.common_concepts],
                "difficulty_preference": pattern.difficulty_preference.value,
                "evaluation_criteria": pattern.evaluation_criteria
            }
        
        return patterns
        
    except Exception as e:
        logger.error(f"Error getting company patterns: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")


@router.get("/health")
async def health_check():
    """Health check endpoint for interview service"""
    return {
        "service": "Interview Simulation Service",
        "status": "healthy",
        "timestamp": datetime.utcnow().isoformat()
    }