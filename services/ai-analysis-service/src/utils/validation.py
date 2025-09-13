"""
Validation utilities for AI Analysis Service
"""
from typing import Any, Dict
from ..core.exceptions import ValidationError, CodeTooLongError, EmptyCodeError, BatchSizeExceededError
from ..core.constants import AnalysisLimits

class ValidationUtils:
    """Utility class for common validations"""
    
    @staticmethod
    def validate_required(value: Any, field_name: str) -> None:
        """Validate that a field is not empty"""
        if value is None or (isinstance(value, str) and not value.strip()):
            raise ValidationError(f"{field_name} is required")
    
    @staticmethod
    def validate_code_length(code: str, max_length: int = AnalysisLimits.MAX_CODE_LENGTH) -> None:
        """Validate code length"""
        if len(code) > max_length:
            raise CodeTooLongError(max_length)
    
    @staticmethod
    def validate_code_not_empty(code: str) -> None:
        """Validate code is not empty"""
        if not code.strip():
            raise EmptyCodeError()
    
    @staticmethod
    def validate_batch_size(items: list, max_size: int = AnalysisLimits.MAX_BATCH_SIZE) -> None:
        """Validate batch size"""
        if len(items) > max_size:
            raise BatchSizeExceededError(max_size)
    
    @staticmethod
    def validate_pagination(page: int = 1, limit: int = 10) -> Dict[str, int]:
        """Validate and normalize pagination parameters"""
        if page < 1:
            raise ValidationError("Page must be greater than 0")
        
        if limit < 1 or limit > 100:
            raise ValidationError("Limit must be between 1 and 100")
        
        return {"page": page, "limit": limit}
    
    @staticmethod
    def sanitize_string(value: str) -> str:
        """Sanitize string input"""
        if not isinstance(value, str):
            return str(value)
        return value.strip()
    
    @staticmethod
    def validate_problem_id(problem_id: str) -> None:
        """Validate problem ID format"""
        ValidationUtils.validate_required(problem_id, "Problem ID")
        
        # Add specific validation for problem ID format if needed
        if len(problem_id.strip()) < 1:
            raise ValidationError("Invalid problem ID format")