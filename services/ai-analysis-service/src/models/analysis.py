"""
Analysis data models
"""
from datetime import datetime
from typing import List, Optional, Dict, Any
from pydantic import BaseModel, Field
from enum import Enum


class AnalysisType(str, Enum):
    """Types of code analysis"""
    QUALITY = "quality"
    SECURITY = "security"
    PERFORMANCE = "performance"
    COMPLEXITY = "complexity"
    GENERAL = "general"


class SeverityLevel(str, Enum):
    """Severity levels for issues"""
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    CRITICAL = "critical"


class ProgrammingLanguage(str, Enum):
    """Supported programming languages"""
    PYTHON = "python"
    JAVASCRIPT = "javascript"
    TYPESCRIPT = "typescript"
    JAVA = "java"
    CPP = "cpp"
    C = "c"
    GO = "go"
    RUST = "rust"
    CSHARP = "csharp"


class SecurityIssue(BaseModel):
    """Security issue model"""
    type: str = Field(..., description="Type of security issue")
    severity: SeverityLevel = Field(..., description="Severity level")
    description: str = Field(..., description="Issue description")
    line: Optional[int] = Field(None, description="Line number where issue occurs")
    cwe_id: Optional[str] = Field(None, description="CWE identifier")
    recommendation: Optional[str] = Field(None, description="Fix recommendation")


class PerformanceIssue(BaseModel):
    """Performance issue model"""
    type: str = Field(..., description="Type of performance issue")
    severity: SeverityLevel = Field(..., description="Severity level")
    description: str = Field(..., description="Issue description")
    suggestion: str = Field(..., description="Improvement suggestion")
    impact: Optional[str] = Field(None, description="Performance impact description")


class CodeSmell(BaseModel):
    """Code smell model"""
    type: str = Field(..., description="Type of code smell")
    description: str = Field(..., description="Smell description")
    suggestion: str = Field(..., description="Improvement suggestion")
    line: Optional[int] = Field(None, description="Line number")


class ComplexityMetrics(BaseModel):
    """Code complexity metrics"""
    cyclomatic_complexity: int = Field(..., description="Cyclomatic complexity")
    cognitive_complexity: int = Field(..., description="Cognitive complexity")
    lines_of_code: int = Field(..., description="Total lines of code")
    maintainability_index: float = Field(..., description="Maintainability index (0-100)")
    halstead_difficulty: Optional[float] = Field(None, description="Halstead difficulty")
    halstead_volume: Optional[float] = Field(None, description="Halstead volume")


class Suggestion(BaseModel):
    """General improvement suggestion"""
    category: str = Field(..., description="Suggestion category")
    description: str = Field(..., description="Suggestion description")
    priority: SeverityLevel = Field(..., description="Priority level")
    code_example: Optional[str] = Field(None, description="Example code")


class AnalysisRequest(BaseModel):
    """Code analysis request model"""
    code: str = Field(..., description="Code to analyze", max_length=50000)
    language: ProgrammingLanguage = Field(..., description="Programming language")
    analysis_types: List[AnalysisType] = Field(default=[AnalysisType.GENERAL], description="Types of analysis to perform")
    user_id: Optional[str] = Field(None, description="User ID for personalized analysis")
    problem_context: Optional[str] = Field(None, description="Problem context for better analysis")
    include_ai_feedback: bool = Field(default=True, description="Include AI-generated feedback")


class AnalysisResult(BaseModel):
    """Code analysis result model"""
    analysis_id: str = Field(..., description="Unique analysis ID")
    timestamp: datetime = Field(default_factory=datetime.utcnow, description="Analysis timestamp")
    language: ProgrammingLanguage = Field(..., description="Programming language")
    
    # Scores (0-100)
    quality_score: float = Field(..., description="Overall code quality score", ge=0, le=100)
    security_score: float = Field(..., description="Security score", ge=0, le=100)
    performance_score: float = Field(..., description="Performance score", ge=0, le=100)
    maintainability_score: float = Field(..., description="Maintainability score", ge=0, le=100)
    
    # Detailed analysis
    complexity_metrics: ComplexityMetrics = Field(..., description="Complexity metrics")
    security_issues: List[SecurityIssue] = Field(default=[], description="Security issues found")
    performance_issues: List[PerformanceIssue] = Field(default=[], description="Performance issues")
    code_smells: List[CodeSmell] = Field(default=[], description="Code smells detected")
    suggestions: List[Suggestion] = Field(default=[], description="Improvement suggestions")
    
    # AI-generated content
    ai_feedback: Optional[str] = Field(None, description="AI-generated feedback")
    explanation: Optional[str] = Field(None, description="Code explanation")
    
    # Metadata
    analysis_duration: float = Field(..., description="Analysis duration in seconds")
    cached: bool = Field(default=False, description="Whether result was cached")


class HintRequest(BaseModel):
    """Hint generation request"""
    problem_id: str = Field(..., description="Problem ID")
    user_code: str = Field(..., description="User's current code")
    language: ProgrammingLanguage = Field(..., description="Programming language")
    hint_level: int = Field(default=1, description="Hint level (1-5)", ge=1, le=5)
    user_id: Optional[str] = Field(None, description="User ID")


class Hint(BaseModel):
    """Generated hint model"""
    level: int = Field(..., description="Hint level")
    content: str = Field(..., description="Hint content")
    type: str = Field(..., description="Hint type (conceptual, implementation, debugging)")
    reveals_solution: bool = Field(default=False, description="Whether hint reveals solution")


class ExplanationRequest(BaseModel):
    """Code explanation request"""
    code: str = Field(..., description="Code to explain")
    language: ProgrammingLanguage = Field(..., description="Programming language")
    explanation_type: str = Field(default="general", description="Type of explanation")
    detail_level: str = Field(default="medium", description="Detail level (basic, medium, detailed)")


class CodeExplanation(BaseModel):
    """Code explanation model"""
    summary: str = Field(..., description="Brief summary of what the code does")
    detailed_explanation: str = Field(..., description="Detailed explanation")
    algorithm_analysis: Optional[str] = Field(None, description="Algorithm analysis")
    time_complexity: Optional[str] = Field(None, description="Time complexity")
    space_complexity: Optional[str] = Field(None, description="Space complexity")
    key_concepts: List[str] = Field(default=[], description="Key programming concepts used")
    learning_resources: List[str] = Field(default=[], description="Recommended learning resources")