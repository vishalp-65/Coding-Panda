"""
Authentication and authorization utilities
"""
import jwt
import logging
from datetime import datetime, timedelta
from typing import Optional, Dict, Any
from fastapi import HTTPException, Depends, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from pydantic import BaseModel

from ..config import settings


logger = logging.getLogger(__name__)
security = HTTPBearer()


class TokenData(BaseModel):
    """Token data model"""
    user_id: str
    username: str
    email: str
    roles: list = []
    exp: datetime
    iat: datetime


class AuthenticationError(Exception):
    """Authentication error"""
    pass


class AuthorizationError(Exception):
    """Authorization error"""
    pass


def create_access_token(data: Dict[str, Any], expires_delta: Optional[timedelta] = None) -> str:
    """Create JWT access token"""
    to_encode = data.copy()
    
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(hours=24)
    
    to_encode.update({"exp": expire, "iat": datetime.utcnow()})
    
    try:
        encoded_jwt = jwt.encode(
            to_encode, 
            settings.JWT_SECRET_KEY, 
            algorithm=settings.JWT_ALGORITHM
        )
        return encoded_jwt
    except Exception as e:
        logger.error(f"Error creating access token: {e}")
        raise AuthenticationError("Failed to create access token")


def verify_token(token: str) -> TokenData:
    """Verify and decode JWT token"""
    try:
        payload = jwt.decode(
            token, 
            settings.JWT_SECRET_KEY, 
            algorithms=[settings.JWT_ALGORITHM]
        )
        
        user_id = payload.get("user_id")
        if not user_id:
            raise AuthenticationError("Invalid token: missing user_id")
        
        token_data = TokenData(
            user_id=user_id,
            username=payload.get("username", ""),
            email=payload.get("email", ""),
            roles=payload.get("roles", []),
            exp=datetime.fromtimestamp(payload.get("exp", 0)),
            iat=datetime.fromtimestamp(payload.get("iat", 0))
        )
        
        return token_data
        
    except jwt.ExpiredSignatureError:
        raise AuthenticationError("Token has expired")
    except jwt.JWTError as e:
        logger.error(f"JWT error: {e}")
        raise AuthenticationError("Invalid token")
    except Exception as e:
        logger.error(f"Token verification error: {e}")
        raise AuthenticationError("Token verification failed")


async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)) -> Dict[str, Any]:
    """Get current authenticated user from JWT token"""
    
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    
    try:
        token = credentials.credentials
        token_data = verify_token(token)
        
        # Check if token is expired
        if token_data.exp < datetime.utcnow():
            raise credentials_exception
        
        user_data = {
            "user_id": token_data.user_id,
            "username": token_data.username,
            "email": token_data.email,
            "roles": token_data.roles,
            "is_admin": "admin" in token_data.roles
        }
        
        return user_data
        
    except AuthenticationError:
        raise credentials_exception
    except Exception as e:
        logger.error(f"Authentication error: {e}")
        raise credentials_exception


async def get_current_active_user(current_user: Dict[str, Any] = Depends(get_current_user)) -> Dict[str, Any]:
    """Get current active user (additional checks can be added here)"""
    # Add any additional user validation logic here
    # For example, check if user is active, not banned, etc.
    return current_user


def require_roles(required_roles: list):
    """Decorator to require specific roles"""
    def role_checker(current_user: Dict[str, Any] = Depends(get_current_user)):
        user_roles = current_user.get("roles", [])
        
        if not any(role in user_roles for role in required_roles):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Insufficient permissions"
            )
        
        return current_user
    
    return role_checker


def require_admin(current_user: Dict[str, Any] = Depends(get_current_user)) -> Dict[str, Any]:
    """Require admin role"""
    if not current_user.get("is_admin", False):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin access required"
        )
    
    return current_user


def create_mock_user_for_testing() -> Dict[str, Any]:
    """Create mock user for testing purposes"""
    return {
        "user_id": "test_user_123",
        "username": "testuser",
        "email": "test@example.com",
        "roles": ["user"],
        "is_admin": False
    }


# Optional: Mock authentication for development
async def get_mock_current_user() -> Dict[str, Any]:
    """Mock current user for development/testing"""
    return create_mock_user_for_testing()


# Use this for development when you don't have full auth setup
# Replace get_current_user with get_mock_current_user in dependencies
if getattr(settings, 'USE_MOCK_AUTH', False):
    logger.warning("Using mock authentication - DO NOT USE IN PRODUCTION")
    get_current_user = get_mock_current_user