import redis.asyncio as redis
import json
import time
from typing import Dict, Any, Optional
from src.models.execution import ExecutionMetrics
from src.config.settings import settings
import logging

logger = logging.getLogger(__name__)


class MetricsCollector:
    """Collects and stores execution metrics for monitoring and analytics."""
    
    def __init__(self):
        try:
            self.redis_client = redis.Redis(
                host=settings.redis_host,
                port=settings.redis_port,
                db=settings.redis_db,
                password=settings.redis_password if settings.redis_password else None,
                decode_responses=True
            )
            logger.info("Redis client initialized successfully")
        except Exception as e:
            logger.warning(f"Failed to initialize Redis client: {e}")
            self.redis_client = None
    
    async def test_connection(self):
        """Test Redis connection asynchronously."""
        if self.redis_client:
            try:
                await self.redis_client.ping()
                return True
            except Exception as e:
                logger.error(f"Redis connection test failed: {e}")
                return False
        return False
    
    async def collect_execution_metrics(self, metrics: ExecutionMetrics):
        """Store execution metrics in Redis."""
        if not self.redis_client or not settings.metrics_enabled:
            return
        
        try:
            # Store individual execution record
            key = f"execution_metrics:{metrics.request_id}"
            data = metrics.model_dump_json()
            await self.redis_client.setex(key, 86400, data)  # 24 hours TTL
            
            # Update aggregated metrics
            await self._update_aggregated_metrics(metrics)
            
        except Exception as e:
            logger.error(f"Failed to collect execution metrics: {e}")
    
    async def _update_aggregated_metrics(self, metrics: ExecutionMetrics):
        """Update aggregated metrics for dashboards."""
        if not self.redis_client:
            return
            
        try:
            current_hour = int(time.time() // 3600)
            
            # Language usage statistics
            lang_key = f"metrics:language:{metrics.language}:{current_hour}"
            await self.redis_client.incr(lang_key)
            await self.redis_client.expire(lang_key, 86400 * 7)  # 7 days
            
            # Status statistics
            status_key = f"metrics:status:{metrics.status}:{current_hour}"
            await self.redis_client.incr(status_key)
            await self.redis_client.expire(status_key, 86400 * 7)
            
            # Execution time histogram
            time_bucket = self._get_time_bucket(metrics.execution_time)
            time_key = f"metrics:execution_time:{time_bucket}:{current_hour}"
            await self.redis_client.incr(time_key)
            await self.redis_client.expire(time_key, 86400 * 7)
            
            # Memory usage histogram
            memory_bucket = self._get_memory_bucket(metrics.memory_used)
            memory_key = f"metrics:memory:{memory_bucket}:{current_hour}"
            await self.redis_client.incr(memory_key)
            await self.redis_client.expire(memory_key, 86400 * 7)
            
            # User activity (if user_id provided)
            if metrics.user_id:
                user_key = f"metrics:user:{metrics.user_id}:{current_hour}"
                await self.redis_client.incr(user_key)
                await self.redis_client.expire(user_key, 86400 * 30)  # 30 days
            
        except Exception as e:
            logger.error(f"Failed to update aggregated metrics: {e}")
    
    def _get_time_bucket(self, execution_time: float) -> str:
        """Get time bucket for histogram."""
        if execution_time < 0.1:
            return "0-100ms"
        elif execution_time < 0.5:
            return "100-500ms"
        elif execution_time < 1.0:
            return "500ms-1s"
        elif execution_time < 2.0:
            return "1-2s"
        elif execution_time < 5.0:
            return "2-5s"
        else:
            return "5s+"
    
    def _get_memory_bucket(self, memory_used: int) -> str:
        """Get memory bucket for histogram."""
        if memory_used < 16:
            return "0-16MB"
        elif memory_used < 32:
            return "16-32MB"
        elif memory_used < 64:
            return "32-64MB"
        elif memory_used < 128:
            return "64-128MB"
        else:
            return "128MB+"
    
    async def get_metrics_summary(self, hours: int = 24) -> Dict[str, Any]:
        """Get aggregated metrics summary."""
        if not self.redis_client:
            return {}
        
        try:
            current_hour = int(time.time() // 3600)
            summary = {
                "languages": {},
                "statuses": {},
                "execution_times": {},
                "memory_usage": {},
                "total_executions": 0
            }
            
            # Collect data for the specified time range
            for hour_offset in range(hours):
                hour = current_hour - hour_offset
                
                # Language metrics
                for lang in ["python", "javascript", "java", "cpp", "go", "rust"]:
                    key = f"metrics:language:{lang}:{hour}"
                    count = await self.redis_client.get(key)
                    if count is not None:
                        count_int = int(count)
                        summary["languages"][lang] = summary["languages"].get(lang, 0) + count_int
                        summary["total_executions"] += count_int
                
                # Status metrics
                for status in ["success", "runtime_error", "compile_error", "time_limit_exceeded", "memory_limit_exceeded"]:
                    key = f"metrics:status:{status}:{hour}"
                    count = await self.redis_client.get(key)
                    if count is not None:
                        summary["statuses"][status] = summary["statuses"].get(status, 0) + int(count)
                
                # Time buckets
                for bucket in ["0-100ms", "100-500ms", "500ms-1s", "1-2s", "2-5s", "5s+"]:
                    key = f"metrics:execution_time:{bucket}:{hour}"
                    count = await self.redis_client.get(key)
                    if count is not None:
                        summary["execution_times"][bucket] = summary["execution_times"].get(bucket, 0) + int(count)
                
                # Memory buckets
                for bucket in ["0-16MB", "16-32MB", "32-64MB", "64-128MB", "128MB+"]:
                    key = f"metrics:memory:{bucket}:{hour}"
                    count = await self.redis_client.get(key)
                    if count is not None:
                        summary["memory_usage"][bucket] = summary["memory_usage"].get(bucket, 0) + int(count)
            
            return summary
            
        except Exception as e:
            logger.error(f"Failed to get metrics summary: {e}")
            return {}
    
    async def get_user_metrics(self, user_id: str, hours: int = 24) -> Dict[str, Any]:
        """Get metrics for a specific user."""
        if not self.redis_client:
            return {}
        
        try:
            current_hour = int(time.time() // 3600)
            total_executions = 0
            
            for hour_offset in range(hours):
                hour = current_hour - hour_offset
                key = f"metrics:user:{user_id}:{hour}"
                count = await self.redis_client.get(key)
                if count is not None:
                    total_executions += int(count)
            
            return {
                "user_id": user_id,
                "total_executions": total_executions,
                "time_period_hours": hours
            }
            
        except Exception as e:
            logger.error(f"Failed to get user metrics: {e}")
            return {}
    
    async def cleanup_old_metrics(self):
        """Clean up old metrics data."""
        if not self.redis_client:
            return
        
        try:
            # This is handled by Redis TTL, but we can add additional cleanup logic here
            logger.info("Metrics cleanup completed (handled by Redis TTL)")
        except Exception as e:
            logger.error(f"Failed to cleanup old metrics: {e}")
    
    async def close(self):
        """Close Redis connection properly."""
        if self.redis_client:
            try:
                await self.redis_client.aclose()
                logger.info("Redis connection closed")
            except Exception as e:
                logger.error(f"Failed to close Redis connection: {e}")