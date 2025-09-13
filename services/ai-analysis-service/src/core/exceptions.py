"""
Custom exceptions for AI Analysis Service
"""

class AnalysisServiceException(Exception):
    """Base exception for analysis service"""
    def __init__(self, message: str, code: str = "INTERNAL_ERROR", status_code: int = 500):
        self.message = message
        self.code = code
        self.status_code = status_code
        super().__init__(self.message)

class ValidationError(AnalysisServiceException):
    """Raised when validation fails"""
    def __init__(self, message: str):
        super().__init__(message, "VALIDATION_ERROR", 400)

class CodeTooLongError(ValidationError):
    """Raised when code exceeds maximum length"""
    def __init__(self, max_length: int):
        super().__init__(f"Code length exceeds maximum of {max_length} characters")

class EmptyCodeError(ValidationError):
    """Raised when code is empty"""
    def __init__(self):
        super().__init__("Code cannot be empty")

class AnalysisTimeoutError(AnalysisServiceException):
    """Raised when analysis times out"""
    def __init__(self):
        super().__init__("Analysis timed out", "ANALYSIS_TIMEOUT", 408)

class UnsupportedLanguageError(ValidationError):
    """Raised when programming language is not supported"""
    def __init__(self, language: str):
        super().__init__(f"Programming language '{language}' is not supported")

class BatchSizeExceededError(ValidationError):
    """Raised when batch size exceeds limit"""
    def __init__(self, max_size: int):
        super().__init__(f"Batch size cannot exceed {max_size} requests")