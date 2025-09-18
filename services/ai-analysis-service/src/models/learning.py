"""
Learning and recommendation system models
"""
from datetime import datetime
from typing import List, Optional, Dict, Any
from pydantic import BaseModel, Field
from enum import Enum

from .analysis import ProgrammingLanguage, SeverityLevel


class SkillLevel(str, Enum):
    """User skill levels"""
    BEGINNER = "beginner"
    INTERMEDIATE = "intermediate"
    ADVANCED = "advanced"
    EXPERT = "expert"


class ConceptCategory(str, Enum):
    """Programming concept categories"""
    ALGORITHMS = "algorithms"
    DATA_STRUCTURES = "data_structures"
    DYNAMIC_PROGRAMMING = "dynamic_programming"
    GRAPH_THEORY = "graph_theory"
    TREE_ALGORITHMS = "tree_algorithms"
    STRING_PROCESSING = "string_processing"
    SORTING_SEARCHING = "sorting_searching"
    RECURSION = "recursion"
    GREEDY_ALGORITHMS = "greedy_algorithms"
    BACKTRACKING = "backtracking"
    MATH_NUMBER_THEORY = "math_number_theory"
    BIT_MANIPULATION = "bit_manipulation"
    SYSTEM_DESIGN = "system_design"
    OBJECT_ORIENTED = "object_oriented"
    FUNCTIONAL_PROGRAMMING = "functional_programming"


class DifficultyLevel(str, Enum):
    """Problem difficulty levels"""
    EASY = "easy"
    MEDIUM = "medium"
    HARD = "hard"


class LearningResourceType(str, Enum):
    """Types of learning resources"""
    ARTICLE = "article"
    VIDEO = "video"
    TUTORIAL = "tutorial"
    DOCUMENTATION = "documentation"
    PRACTICE_PROBLEM = "practice_problem"
    COURSE = "course"
    BOOK = "book"


class WeakArea(BaseModel):
    """Identified weak area for a user"""
    concept: ConceptCategory = Field(..., description="Concept category")
    confidence_score: float = Field(..., description="Confidence score (0-1)", ge=0, le=1)
    error_patterns: List[str] = Field(default=[], description="Common error patterns")
    improvement_suggestions: List[str] = Field(default=[], description="Improvement suggestions")
    last_assessed: datetime = Field(default_factory=datetime.utcnow, description="Last assessment time")


class SkillAssessment(BaseModel):
    """User skill assessment result"""
    user_id: str = Field(..., description="User ID")
    language: ProgrammingLanguage = Field(..., description="Programming language")
    overall_skill_level: SkillLevel = Field(..., description="Overall skill level")
    concept_scores: Dict[ConceptCategory, float] = Field(default={}, description="Scores by concept (0-1)")
    weak_areas: List[WeakArea] = Field(default=[], description="Identified weak areas")
    strong_areas: List[ConceptCategory] = Field(default=[], description="Strong concept areas")
    assessment_date: datetime = Field(default_factory=datetime.utcnow, description="Assessment date")
    total_problems_solved: int = Field(default=0, description="Total problems solved")
    accuracy_rate: float = Field(default=0.0, description="Overall accuracy rate", ge=0, le=1)


class LearningResource(BaseModel):
    """Learning resource recommendation"""
    id: str = Field(..., description="Resource ID")
    title: str = Field(..., description="Resource title")
    description: str = Field(..., description="Resource description")
    type: LearningResourceType = Field(..., description="Resource type")
    url: Optional[str] = Field(None, description="Resource URL")
    difficulty: DifficultyLevel = Field(..., description="Resource difficulty")
    concepts: List[ConceptCategory] = Field(default=[], description="Covered concepts")
    estimated_time: Optional[int] = Field(None, description="Estimated time in minutes")
    rating: Optional[float] = Field(None, description="Resource rating (0-5)", ge=0, le=5)
    relevance_score: float = Field(..., description="Relevance to user (0-1)", ge=0, le=1)


class LearningPath(BaseModel):
    """Personalized learning path"""
    id: str = Field(..., description="Learning path ID")
    user_id: str = Field(..., description="User ID")
    title: str = Field(..., description="Learning path title")
    description: str = Field(..., description="Path description")
    target_concepts: List[ConceptCategory] = Field(..., description="Target concepts to learn")
    current_step: int = Field(default=0, description="Current step in path")
    total_steps: int = Field(..., description="Total steps in path")
    estimated_duration: int = Field(..., description="Estimated duration in hours")
    difficulty_progression: List[DifficultyLevel] = Field(..., description="Difficulty progression")
    resources: List[LearningResource] = Field(default=[], description="Learning resources")
    practice_problems: List[str] = Field(default=[], description="Recommended problem IDs")
    milestones: List[str] = Field(default=[], description="Learning milestones")
    created_date: datetime = Field(default_factory=datetime.utcnow, description="Creation date")
    last_updated: datetime = Field(default_factory=datetime.utcnow, description="Last update date")
    completion_percentage: float = Field(default=0.0, description="Completion percentage", ge=0, le=100)


class ProgressiveHint(BaseModel):
    """Progressive hint with context awareness"""
    level: int = Field(..., description="Hint level (1-5)", ge=1, le=5)
    content: str = Field(..., description="Hint content")
    type: str = Field(..., description="Hint type")
    reveals_solution: bool = Field(default=False, description="Whether hint reveals solution")
    concept_focus: Optional[ConceptCategory] = Field(None, description="Focused concept")
    code_snippet: Optional[str] = Field(None, description="Code snippet example")
    learning_objective: Optional[str] = Field(None, description="Learning objective")
    prerequisite_concepts: List[ConceptCategory] = Field(default=[], description="Prerequisite concepts")


class ContextualRecommendation(BaseModel):
    """Context-aware learning recommendation"""
    recommendation_id: str = Field(..., description="Recommendation ID")
    user_id: str = Field(..., description="User ID")
    context: str = Field(..., description="Context (problem_solving, skill_gap, etc.)")
    recommended_resources: List[LearningResource] = Field(..., description="Recommended resources")
    recommended_problems: List[str] = Field(default=[], description="Recommended problem IDs")
    reasoning: str = Field(..., description="Recommendation reasoning")
    priority: SeverityLevel = Field(..., description="Recommendation priority")
    created_date: datetime = Field(default_factory=datetime.utcnow, description="Creation date")
    expires_date: Optional[datetime] = Field(None, description="Expiration date")


class PerformancePattern(BaseModel):
    """User performance pattern analysis"""
    user_id: str = Field(..., description="User ID")
    pattern_type: str = Field(..., description="Pattern type (time_of_day, problem_type, etc.)")
    pattern_data: Dict[str, Any] = Field(..., description="Pattern analysis data")
    insights: List[str] = Field(default=[], description="Performance insights")
    recommendations: List[str] = Field(default=[], description="Performance recommendations")
    confidence: float = Field(..., description="Pattern confidence (0-1)", ge=0, le=1)
    analysis_date: datetime = Field(default_factory=datetime.utcnow, description="Analysis date")


class DifficultyProgression(BaseModel):
    """Difficulty progression recommendation"""
    user_id: str = Field(..., description="User ID")
    current_level: DifficultyLevel = Field(..., description="Current difficulty level")
    recommended_level: DifficultyLevel = Field(..., description="Recommended next level")
    readiness_score: float = Field(..., description="Readiness score (0-1)", ge=0, le=1)
    supporting_evidence: List[str] = Field(default=[], description="Evidence for progression")
    prerequisite_skills: List[ConceptCategory] = Field(default=[], description="Required skills")
    estimated_success_rate: float = Field(..., description="Estimated success rate", ge=0, le=1)
    recommendation_date: datetime = Field(default_factory=datetime.utcnow, description="Recommendation date")


# Request/Response models for API endpoints

class SkillAssessmentRequest(BaseModel):
    """Request for skill assessment"""
    user_id: str = Field(..., description="User ID")
    language: ProgrammingLanguage = Field(..., description="Programming language")
    include_weak_areas: bool = Field(default=True, description="Include weak area analysis")
    assessment_depth: str = Field(default="standard", description="Assessment depth (quick, standard, comprehensive)")


class LearningPathRequest(BaseModel):
    """Request for learning path generation"""
    user_id: str = Field(..., description="User ID")
    target_concepts: List[ConceptCategory] = Field(..., description="Target concepts")
    time_commitment: int = Field(..., description="Weekly time commitment in hours")
    preferred_difficulty: Optional[DifficultyLevel] = Field(None, description="Preferred difficulty")
    learning_style: Optional[str] = Field(None, description="Learning style preference")


class RecommendationRequest(BaseModel):
    """Request for contextual recommendations"""
    user_id: str = Field(..., description="User ID")
    context: str = Field(..., description="Context for recommendations")
    problem_id: Optional[str] = Field(None, description="Current problem ID")
    recent_code: Optional[str] = Field(None, description="Recent code submission")
    language: Optional[ProgrammingLanguage] = Field(None, description="Programming language")
    max_recommendations: int = Field(default=5, description="Maximum recommendations", ge=1, le=20)


class ProgressiveHintRequest(BaseModel):
    """Request for progressive hints"""
    user_id: str = Field(..., description="User ID")
    problem_id: str = Field(..., description="Problem ID")
    current_code: str = Field(..., description="Current code attempt")
    language: ProgrammingLanguage = Field(..., description="Programming language")
    hint_level: int = Field(default=1, description="Requested hint level", ge=1, le=5)
    previous_hints: List[str] = Field(default=[], description="Previously given hints")
    stuck_duration: Optional[int] = Field(None, description="Time stuck in minutes")