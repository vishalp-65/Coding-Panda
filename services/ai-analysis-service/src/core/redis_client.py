"""
Redis client configuration and connection management
"""
import logging
import json
from typing import Any, Optional
import redis.asyncio as redis
from redis.asyncio import Redis

from ..config import settings

logger = logging.getLogger(__name__)

# Global Redis client
redis_client: Optional[Redis] = None


async def init_redis():
    """Initialize Redis connection"""
    global redis_client
    
    try:
        redis_client = redis.from_url(
            settings.REDIS_URL,
            encoding="utf-8",
            decode_responses=True,
            socket_connect_timeout=5,
            socket_timeout=5,
            retry_on_timeout=True,
            health_check_interval=30
        )
        
        # Test connection
        await redis_client.ping()
        logger.info("Redis initialized successfully")
        
    except Exception as e:
        logger.error(f"Failed to initialize Redis: {e}")
        raise


async def get_redis() -> Redis:
    """Get Redis client"""
    if not redis_client:
        raise RuntimeError("Redis not initialized")
    return redis_client


async def cache_set(key: str, value: Any, expire: int = 3600):
    """Set cache value with expiration"""
    client = await get_redis()
    serialized_value = json.dumps(value) if not isinstance(value, str) else value
    await client.setex(key, expire, serialized_value)


async def cache_get(key: str) -> Optional[Any]:
    """Get cache value"""
    client = await get_redis()
    value = await client.get(key)
    if value:
        try:
            return json.loads(value)
        except json.JSONDecodeError:
            return value
    return None


async def cache_delete(key: str):
    """Delete cache key"""
    client = await get_redis()
    await client.delete(key)


async def close_redis():
    """Close Redis connection"""
    global redis_client
    if redis_client:
        await redis_client.close()
        logger.info("Redis connection closed")