"""
Interview simulation models
"""
from datetime import datetime
from typing import List, Optional, Dict, Any, Union
from pydantic import BaseModel, Field
from enum import Enum

from .analysis import ProgrammingLanguage
from .learning import SkillLevel, ConceptCategory, DifficultyLevel


class InterviewType(str, Enum):
    """Types of interviews"""
    TECHNICAL_CODING = "technical_coding"
    SYSTEM_DESIGN = "system_design"
    BEHAVIORAL = "behavioral"
    MIXED = "mixed"


class InterviewStatus(str, Enum):
    """Interview session status"""
    SCHEDULED = "scheduled"
    IN_PROGRESS = "in_progress"
    PAUSED = "paused"
    COMPLETED = "completed"
    CANCELLED = "cancelled"


class QuestionType(str, Enum):
    """Types of interview questions"""
    CODING_PROBLEM = "coding_problem"
    SYSTEM_DESIGN = "system_design"
    BEHAVIORAL = "behavioral"
    TECHNICAL_CONCEPT = "technical_concept"
    FOLLOW_UP = "follow_up"
    CLARIFICATION = "clarification"


class CommunicationAspect(str, Enum):
    """Communication aspects to evaluate"""
    CLARITY = "clarity"
    TECHNICAL_DEPTH = "technical_depth"
    PROBLEM_SOLVING_APPROACH = "problem_solving_approach"
    COLLABORATION = "collaboration"
    CONFIDENCE = "confidence"
    LISTENING_SKILLS = "listening_skills"


class CompanyType(str, Enum):
    """Company types for interview customization"""
    BIG_TECH = "big_tech"
    STARTUP = "startup"
    FINTECH = "fintech"
    HEALTHCARE = "healthcare"
    ECOMMERCE = "ecommerce"
    GAMING = "gaming"
    CONSULTING = "consulting"
    GENERIC = "generic"


class InterviewQuestion(BaseModel):
    """Interview question model"""
    id: str = Field(..., description="Question ID")
    type: QuestionType = Field(..., description="Question type")
    content: str = Field(..., description="Question content")
    difficulty: DifficultyLevel = Field(..., description="Question difficulty")
    concepts: List[ConceptCategory] = Field(default=[], description="Related concepts")
    expected_duration: int = Field(..., description="Expected duration in minutes")
    evaluation_criteria: List[str] = Field(default=[], description="Evaluation criteria")
    sample_answer: Optional[str] = Field(None, description="Sample answer")
    follow_up_questions: List[str] = Field(default=[], description="Potential follow-up questions")
    company_specific: bool = Field(default=False, description="Company-specific question")


class InterviewResponse(BaseModel):
    """User response to interview question"""
    question_id: str = Field(..., description="Question ID")
    response_text: Optional[str] = Field(None, description="Text response")
    code_solution: Optional[str] = Field(None, description="Code solution")
    language: Optional[ProgrammingLanguage] = Field(None, description="Programming language")
    response_time: int = Field(..., description="Response time in seconds")
    timestamp: datetime = Field(default_factory=datetime.utcnow, description="Response timestamp")
    confidence_level: Optional[int] = Field(None, description="Self-reported confidence (1-5)")


class CommunicationScore(BaseModel):
    """Communication assessment score"""
    aspect: CommunicationAspect = Field(..., description="Communication aspect")
    score: float = Field(..., description="Score (0-10)", ge=0, le=10)
    feedback: str = Field(..., description="Specific feedback")
    examples: List[str] = Field(default=[], description="Examples from response")


class QuestionEvaluation(BaseModel):
    """Evaluation of a single question response"""
    question_id: str = Field(..., description="Question ID")
    correctness_score: float = Field(..., description="Correctness score (0-10)", ge=0, le=10)
    approach_score: float = Field(..., description="Problem-solving approach score (0-10)", ge=0, le=10)
    code_quality_score: Optional[float] = Field(None, description="Code quality score (0-10)")
    communication_scores: List[CommunicationScore] = Field(default=[], description="Communication scores")
    time_efficiency: float = Field(..., description="Time efficiency score (0-10)", ge=0, le=10)
    overall_score: float = Field(..., description="Overall question score (0-10)", ge=0, le=10)
    strengths: List[str] = Field(default=[], description="Identified strengths")
    areas_for_improvement: List[str] = Field(default=[], description="Areas for improvement")
    detailed_feedback: str = Field(..., description="Detailed feedback")


class InterviewSession(BaseModel):
    """Interview session model"""
    id: str = Field(..., description="Session ID")
    user_id: str = Field(..., description="User ID")
    interview_type: InterviewType = Field(..., description="Interview type")
    company_type: CompanyType = Field(default=CompanyType.GENERIC, description="Company type")
    target_role: Optional[str] = Field(None, description="Target role")
    difficulty_level: DifficultyLevel = Field(..., description="Interview difficulty")
    
    # Session state
    status: InterviewStatus = Field(default=InterviewStatus.SCHEDULED, description="Session status")
    current_question_index: int = Field(default=0, description="Current question index")
    questions: List[InterviewQuestion] = Field(default=[], description="Interview questions")
    responses: List[InterviewResponse] = Field(default=[], description="User responses")
    
    # Timing
    scheduled_time: Optional[datetime] = Field(None, description="Scheduled start time")
    start_time: Optional[datetime] = Field(None, description="Actual start time")
    end_time: Optional[datetime] = Field(None, description="End time")
    total_duration: Optional[int] = Field(None, description="Total duration in minutes")
    
    # Configuration
    max_questions: int = Field(default=5, description="Maximum number of questions")
    time_limit: Optional[int] = Field(None, description="Time limit in minutes")
    allow_hints: bool = Field(default=True, description="Allow hints during interview")
    
    # Metadata
    created_at: datetime = Field(default_factory=datetime.utcnow, description="Creation timestamp")
    updated_at: datetime = Field(default_factory=datetime.utcnow, description="Last update timestamp")


class InterviewFeedback(BaseModel):
    """Comprehensive interview feedback"""
    session_id: str = Field(..., description="Session ID")
    user_id: str = Field(..., description="User ID")
    
    # Overall scores
    overall_score: float = Field(..., description="Overall interview score (0-10)", ge=0, le=10)
    technical_score: float = Field(..., description="Technical skills score (0-10)", ge=0, le=10)
    communication_score: float = Field(..., description="Communication score (0-10)", ge=0, le=10)
    problem_solving_score: float = Field(..., description="Problem-solving score (0-10)", ge=0, le=10)
    
    # Detailed evaluations
    question_evaluations: List[QuestionEvaluation] = Field(default=[], description="Question evaluations")
    
    # Strengths and improvements
    key_strengths: List[str] = Field(default=[], description="Key strengths identified")
    areas_for_improvement: List[str] = Field(default=[], description="Areas for improvement")
    specific_recommendations: List[str] = Field(default=[], description="Specific recommendations")
    
    # Performance insights
    time_management: str = Field(..., description="Time management feedback")
    communication_style: str = Field(..., description="Communication style feedback")
    technical_depth: str = Field(..., description="Technical depth assessment")
    
    # Comparison and benchmarking
    percentile_rank: Optional[float] = Field(None, description="Percentile rank compared to others")
    similar_role_comparison: Optional[str] = Field(None, description="Comparison to similar role candidates")
    
    # Next steps
    recommended_practice_areas: List[ConceptCategory] = Field(default=[], description="Recommended practice areas")
    suggested_resources: List[str] = Field(default=[], description="Suggested learning resources")
    next_interview_difficulty: Optional[DifficultyLevel] = Field(None, description="Recommended next difficulty")
    
    # Metadata
    generated_at: datetime = Field(default_factory=datetime.utcnow, description="Feedback generation time")
    ai_confidence: float = Field(..., description="AI confidence in assessment (0-1)", ge=0, le=1)


class CompanyInterviewPattern(BaseModel):
    """Company-specific interview patterns"""
    company_type: CompanyType = Field(..., description="Company type")
    typical_duration: int = Field(..., description="Typical interview duration in minutes")
    question_distribution: Dict[QuestionType, float] = Field(..., description="Question type distribution")
    common_concepts: List[ConceptCategory] = Field(default=[], description="Commonly tested concepts")
    difficulty_preference: DifficultyLevel = Field(..., description="Preferred difficulty level")
    communication_weight: float = Field(..., description="Communication assessment weight (0-1)", ge=0, le=1)
    technical_weight: float = Field(..., description="Technical assessment weight (0-1)", ge=0, le=1)
    behavioral_questions: List[str] = Field(default=[], description="Common behavioral questions")
    technical_focus_areas: List[str] = Field(default=[], description="Technical focus areas")
    evaluation_criteria: List[str] = Field(default=[], description="Key evaluation criteria")


class InterviewAnalytics(BaseModel):
    """Interview analytics and progress tracking"""
    user_id: str = Field(..., description="User ID")
    total_interviews: int = Field(default=0, description="Total interviews completed")
    average_score: float = Field(default=0.0, description="Average interview score", ge=0, le=10)
    score_trend: List[float] = Field(default=[], description="Score trend over time")
    
    # Performance by category
    technical_scores: List[float] = Field(default=[], description="Technical scores history")
    communication_scores: List[float] = Field(default=[], description="Communication scores history")
    problem_solving_scores: List[float] = Field(default=[], description="Problem-solving scores history")
    
    # Concept performance
    concept_performance: Dict[ConceptCategory, float] = Field(default={}, description="Performance by concept")
    weak_concepts: List[ConceptCategory] = Field(default=[], description="Consistently weak concepts")
    strong_concepts: List[ConceptCategory] = Field(default=[], description="Consistently strong concepts")
    
    # Company-specific performance
    company_performance: Dict[CompanyType, float] = Field(default={}, description="Performance by company type")
    
    # Progress tracking
    improvement_rate: float = Field(default=0.0, description="Rate of improvement")
    consistency_score: float = Field(default=0.0, description="Performance consistency (0-1)", ge=0, le=1)
    readiness_assessment: Dict[CompanyType, float] = Field(default={}, description="Readiness for each company type")
    
    # Recommendations
    focus_areas: List[ConceptCategory] = Field(default=[], description="Recommended focus areas")
    next_steps: List[str] = Field(default=[], description="Recommended next steps")
    
    # Metadata
    last_updated: datetime = Field(default_factory=datetime.utcnow, description="Last update timestamp")


# Request/Response models for API endpoints

class CreateInterviewRequest(BaseModel):
    """Request to create new interview session"""
    user_id: str = Field(..., description="User ID")
    interview_type: InterviewType = Field(..., description="Interview type")
    company_type: CompanyType = Field(default=CompanyType.GENERIC, description="Company type")
    target_role: Optional[str] = Field(None, description="Target role")
    difficulty_level: DifficultyLevel = Field(..., description="Difficulty level")
    max_questions: int = Field(default=5, description="Maximum questions", ge=1, le=10)
    time_limit: Optional[int] = Field(None, description="Time limit in minutes")
    scheduled_time: Optional[datetime] = Field(None, description="Scheduled start time")


class StartInterviewRequest(BaseModel):
    """Request to start interview session"""
    session_id: str = Field(..., description="Session ID")
    user_preferences: Optional[Dict[str, Any]] = Field(None, description="User preferences")


class SubmitResponseRequest(BaseModel):
    """Request to submit response to interview question"""
    session_id: str = Field(..., description="Session ID")
    question_id: str = Field(..., description="Question ID")
    response_text: Optional[str] = Field(None, description="Text response")
    code_solution: Optional[str] = Field(None, description="Code solution")
    language: Optional[ProgrammingLanguage] = Field(None, description="Programming language")
    confidence_level: Optional[int] = Field(None, description="Confidence level (1-5)", ge=1, le=5)


class GetNextQuestionRequest(BaseModel):
    """Request to get next interview question"""
    session_id: str = Field(..., description="Session ID")
    context: Optional[Dict[str, Any]] = Field(None, description="Additional context")


class GenerateFollowUpRequest(BaseModel):
    """Request to generate follow-up question"""
    session_id: str = Field(..., description="Session ID")
    previous_response: InterviewResponse = Field(..., description="Previous response")
    context: Optional[str] = Field(None, description="Additional context")


class CompleteInterviewRequest(BaseModel):
    """Request to complete interview session"""
    session_id: str = Field(..., description="Session ID")
    early_completion: bool = Field(default=False, description="Whether completed early")
    completion_reason: Optional[str] = Field(None, description="Reason for completion")


class GetAnalyticsRequest(BaseModel):
    """Request to get interview analytics"""
    user_id: str = Field(..., description="User ID")
    time_range: Optional[str] = Field(None, description="Time range (week, month, year, all)")
    company_type: Optional[CompanyType] = Field(None, description="Filter by company type")
    include_detailed: bool = Field(default=False, description="Include detailed analytics")