"""
Authentication middleware for Code Execution Service.
Validates JWT tokens and extracts user information from headers.
"""

import jwt
import logging
from fastapi import HTTPException, Request, status, Depends
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from typing import Optional, Dict, Any
import os
import json

logger = logging.getLogger(__name__)

# JWT configuration
JWT_SECRET = os.getenv('JWT_SECRET', 'your-super-secret-jwt-key-change-in-production')
JWT_ALGORITHM = 'HS256'

# Create HTTPBearer instance
bearer_scheme = HTTPBearer(auto_error=False)


def extract_user_from_headers(request: Request) -> Optional[Dict[str, Any]]:
    """
    Extract user information from headers set by API Gateway.
    This is the preferred method when requests come through the gateway.
    """
    try:
        # Check both lowercase and original case headers
        user_id = request.headers.get('x-user-id') or request.headers.get('X-User-ID')
        user_email = request.headers.get('x-user-email') or request.headers.get('X-User-Email')
        user_roles_str = request.headers.get('x-user-roles') or request.headers.get('X-User-Roles')
        
        logger.debug(f"Header extraction - User ID: {user_id}, Email: {user_email}, Roles: {user_roles_str}")
        
        if user_id and user_email:
            user_roles = []
            if user_roles_str:
                try:
                    user_roles = json.loads(user_roles_str)
                except (json.JSONDecodeError, TypeError) as e:
                    logger.debug(f"Failed to parse user roles JSON: {e}")
                    user_roles = []
            
            logger.debug(f"Successfully extracted user from headers: {user_id}")
            return {
                'id': user_id,
                'email': user_email,
                'roles': user_roles
            }
        else:
            logger.debug(f"Missing required headers - User ID: {user_id}, Email: {user_email}")
    except Exception as e:
        logger.debug(f"Failed to extract user from headers: {e}")
    
    return None


def verify_jwt_token(token: str) -> Optional[Dict[str, Any]]:
    """Verify JWT token and extract user information."""
    try:
        logger.debug(f"Attempting JWT verification with secret: {JWT_SECRET[:10]}...")
        logger.debug(f"Token to verify: {token[:50]}...")
        
        # Verify with issuer and audience to match the Node.js AuthUtils
        payload = jwt.decode(
            token, 
            JWT_SECRET, 
            algorithms=[JWT_ALGORITHM],
            issuer='ai-platform',
            audience='ai-platform-users'
        )
        
        # The user service uses 'userId' instead of 'id'
        user_id = payload.get('userId') or payload.get('id')
        logger.debug(f"JWT token verified successfully for user: {user_id}")
        
        return {
            'id': user_id,
            'email': payload.get('email'),
            'username': payload.get('username'),
            'roles': payload.get('roles', [])
        }
    except jwt.ExpiredSignatureError as e:
        logger.error(f"JWT token has expired: {e}")
        return None
    except jwt.InvalidTokenError as e:
        logger.error(f"Invalid JWT token: {e}")
        return None
    except Exception as e:
        logger.error(f"JWT verification error: {e}")
        return None


def authenticate_user(request: Request, token: Optional[str] = None) -> Optional[Dict[str, Any]]:
    """
    Authenticate user from headers or JWT token.
    Priority: Headers from API Gateway > Direct JWT token
    """
    logger.debug(f"Authentication attempt - Headers: {dict(request.headers)}")
    logger.debug(f"Authentication attempt - Token present: {token is not None}")
    
    # First, try to get user from headers (API Gateway)
    user = extract_user_from_headers(request)
    if user:
        logger.debug("User authenticated via headers")
        return user
    
    # Fallback to JWT token validation (direct access)
    if token:
        logger.debug(f"Attempting JWT validation with token: {token[:20]}...")
        user = verify_jwt_token(token)
        if user:
            logger.debug("User authenticated via JWT token")
            return user
        else:
            logger.debug("JWT token validation failed")
    else:
        logger.debug("No token provided")
    
    logger.debug("Authentication failed - no valid method found")
    return None


async def get_current_user_required(
    request: Request,
    token: Optional[HTTPAuthorizationCredentials] = Depends(bearer_scheme)
) -> Dict[str, Any]:
    """Dependency for endpoints that require authentication."""
    
    # Extract token string
    token_str = None
    if token:
        token_str = token.credentials
    
    # Try to authenticate
    user = authenticate_user(request, token_str)
    
    if not user:
        logger.warning("Authentication failed - no valid user found")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication required",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    logger.debug(f"User authenticated successfully: {user['id']}")
    return user


async def get_current_user_optional(
    request: Request,
    token: Optional[HTTPAuthorizationCredentials] = Depends(bearer_scheme)
) -> Optional[Dict[str, Any]]:
    """Dependency for endpoints with optional authentication."""
    
    # Extract token string
    token_str = None
    if token:
        token_str = token.credentials
    
    # Try to authenticate (don't raise exception if fails)
    user = authenticate_user(request, token_str)
    
    if user:
        logger.debug(f"Optional auth successful for user: {user['id']}")
    else:
        logger.debug("Optional auth - no user authenticated")
    
    return user