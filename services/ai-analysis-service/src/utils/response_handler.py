"""
Response handler utilities for consistent API responses
"""
from typing import Any, Dict, Optional
from fastapi import HTTPException
from fastapi.responses import JSONResponse
from .constants import HTTPStatus, ErrorCodes
import logging

logger = logging.getLogger(__name__)

class ResponseHandler:
    """Handles consistent API responses"""
    
    @staticmethod
    def success(
        data: Any = None,
        message: str = None,
        status_code: int = HTTPStatus.OK,
        pagination: Dict = None
    ) -> Dict[str, Any]:
        """Create success response"""
        response = {"success": True}
        
        if data is not None:
            response["data"] = data
        if message:
            response["message"] = message
        if pagination:
            response["pagination"] = pagination
            
        return response
    
    @staticmethod
    def error(
        message: str,
        code: str = ErrorCodes.INTERNAL_ERROR,
        status_code: int = HTTPStatus.INTERNAL_SERVER_ERROR,
        details: Dict = None
    ) -> HTTPException:
        """Create error response"""
        error_data = {
            "code": code,
            "message": message,
            "timestamp": "2024-01-01T00:00:00Z"  # Would use datetime.utcnow().isoformat()
        }
        
        if details:
            error_data["details"] = details
            
        return HTTPException(
            status_code=status_code,
            detail={"error": error_data}
        )
    
    @staticmethod
    def validation_error(message: str) -> HTTPException:
        """Create validation error response"""
        return ResponseHandler.error(
            message=message,
            code=ErrorCodes.VALIDATION_ERROR,
            status_code=HTTPStatus.BAD_REQUEST
        )
    
    @staticmethod
    def not_found(message: str = "Resource not found") -> HTTPException:
        """Create not found error response"""
        return ResponseHandler.error(
            message=message,
            code=ErrorCodes.NOT_FOUND,
            status_code=HTTPStatus.NOT_FOUND
        )
    
    @staticmethod
    def unauthorized(message: str = "Unauthorized") -> HTTPException:
        """Create unauthorized error response"""
        return ResponseHandler.error(
            message=message,
            code=ErrorCodes.UNAUTHORIZED,
            status_code=HTTPStatus.UNAUTHORIZED
        )
    
    @staticmethod
    def conflict(message: str = "Resource already exists") -> HTTPException:
        """Create conflict error response"""
        return ResponseHandler.error(
            message=message,
            code=ErrorCodes.CONFLICT,
            status_code=HTTPStatus.CONFLICT
        )
    
    @staticmethod
    def internal_error(message: str = "Internal server error") -> HTTPException:
        """Create internal server error response"""
        return ResponseHandler.error(
            message=message,
            code=ErrorCodes.INTERNAL_ERROR,
            status_code=HTTPStatus.INTERNAL_SERVER_ERROR
        )