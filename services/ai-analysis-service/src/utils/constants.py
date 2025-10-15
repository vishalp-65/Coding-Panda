"""
Constants for the AI Analysis Service
"""

class HTTPStatus:
    """HTTP status codes"""
    OK = 200
    CREATED = 201
    BAD_REQUEST = 400
    UNAUTHORIZED = 401
    FORBIDDEN = 403
    NOT_FOUND = 404
    CONFLICT = 409
    INTERNAL_SERVER_ERROR = 500


class ErrorCodes:
    """Error codes for API responses"""
    VALIDATION_ERROR = "VALIDATION_ERROR"
    NOT_FOUND = "NOT_FOUND"
    UNAUTHORIZED = "UNAUTHORIZED"
    FORBIDDEN = "FORBIDDEN"
    CONFLICT = "CONFLICT"
    INTERNAL_ERROR = "INTERNAL_ERROR"
    AI_SERVICE_ERROR = "AI_SERVICE_ERROR"
    DATABASE_ERROR = "DATABASE_ERROR"
    CACHE_ERROR = "CACHE_ERROR"


class AnalysisTypes:
    """Types of code analysis"""
    COMPLEXITY = "complexity"
    PERFORMANCE = "performance"
    SECURITY = "security"
    STYLE = "style"
    BUGS = "bugs"
    SUGGESTIONS = "suggestions"


class AIModels:
    """AI model identifiers"""
    GPT_4 = "gpt-4"
    GPT_3_5_TURBO = "gpt-3.5-turbo"
    CLAUDE_3 = "claude-3"
    GEMINI_PRO = "gemini-pro"


class CacheKeys:
    """Redis cache key patterns"""
    ANALYSIS_RESULT = "analysis:{user_id}:{problem_id}:{code_hash}"
    USER_PROGRESS = "progress:{user_id}"
    LEARNING_PATH = "learning:{user_id}:{topic}"
    INTERVIEW_SESSION = "interview:{session_id}"