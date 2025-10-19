from typing import Dict, Any, List
from datetime import datetime, timedelta
from src.models.execution import ExecutionMetrics
import logging

logger = logging.getLogger(__name__)


class MetricsCollector:
    """Collects and stores execution metrics."""
    
    def __init__(self):
        # In-memory storage for metrics (in production, use Redis or database)
        self.metrics: List[ExecutionMetrics] = []
        self.max_metrics = 10000  # Keep last 10k metrics
    
    async def collect_execution_metrics(self, metrics: ExecutionMetrics):
        """Store execution metrics."""
        try:
            self.metrics.append(metrics)
            
            # Trim old metrics if exceeding max
            if len(self.metrics) > self.max_metrics:
                self.metrics = self.metrics[-self.max_metrics:]
            
            logger.debug(f"Collected metrics for request: {metrics.request_id}")
            
        except Exception as e:
            logger.error(f"Failed to collect metrics: {e}")
    
    async def get_metrics_summary(self, hours: int = 24) -> Dict[str, Any]:
        """Get metrics summary for the last N hours."""
        try:
            cutoff_time = datetime.utcnow() - timedelta(hours=hours)
            recent_metrics = [
                m for m in self.metrics 
                if m.timestamp >= cutoff_time
            ]
            
            if not recent_metrics:
                return self._empty_metrics_summary()
            
            # Calculate summary statistics
            total_executions = len(recent_metrics)
            successful = sum(1 for m in recent_metrics if m.status.value == "success")
            failed = total_executions - successful
            
            # Language breakdown
            language_stats = {}
            for m in recent_metrics:
                lang = m.language.value
                if lang not in language_stats:
                    language_stats[lang] = {"count": 0, "success": 0}
                language_stats[lang]["count"] += 1
                if m.status.value == "success":
                    language_stats[lang]["success"] += 1
            
            # Average metrics
            avg_execution_time = sum(m.execution_time for m in recent_metrics) / total_executions
            avg_memory = sum(m.memory_used for m in recent_metrics) / total_executions
            avg_test_count = sum(m.test_count for m in recent_metrics) / total_executions
            
            return {
                "status": "healthy",
                "service": "Code Execution Service",
                "time_window_hours": hours,
                "total_executions": total_executions,
                "successful_executions": successful,
                "failed_executions": failed,
                "success_rate": round(successful / total_executions * 100, 2),
                "average_execution_time": round(avg_execution_time, 3),
                "average_memory_used": round(avg_memory, 2),
                "average_test_count": round(avg_test_count, 2),
                "language_statistics": language_stats,
                "timestamp": datetime.utcnow().isoformat()
            }
            
        except Exception as e:
            logger.error(f"Failed to get metrics summary: {e}")
            return self._empty_metrics_summary()
    
    async def get_user_metrics(self, user_id: str, hours: int = 24) -> Dict[str, Any]:
        """Get metrics for a specific user."""
        try:
            cutoff_time = datetime.utcnow() - timedelta(hours=hours)
            user_metrics = [
                m for m in self.metrics 
                if m.user_id == user_id and m.timestamp >= cutoff_time
            ]
            
            if not user_metrics:
                return {
                    "user_id": user_id,
                    "total_executions": 0,
                    "message": "No executions found for this user"
                }
            
            total = len(user_metrics)
            successful = sum(1 for m in user_metrics if m.status.value == "success")
            
            # Language breakdown
            languages_used = {}
            for m in user_metrics:
                lang = m.language.value
                languages_used[lang] = languages_used.get(lang, 0) + 1
            
            return {
                "user_id": user_id,
                "time_window_hours": hours,
                "total_executions": total,
                "successful_executions": successful,
                "failed_executions": total - successful,
                "success_rate": round(successful / total * 100, 2),
                "languages_used": languages_used,
                "average_execution_time": round(
                    sum(m.execution_time for m in user_metrics) / total, 3
                ),
                "total_tests_run": sum(m.test_count for m in user_metrics),
                "timestamp": datetime.utcnow().isoformat()
            }
            
        except Exception as e:
            logger.error(f"Failed to get user metrics: {e}")
            raise
    
    async def cleanup_old_metrics(self, days: int = 7):
        """Remove metrics older than specified days."""
        try:
            cutoff_time = datetime.utcnow() - timedelta(days=days)
            original_count = len(self.metrics)
            
            self.metrics = [
                m for m in self.metrics 
                if m.timestamp >= cutoff_time
            ]
            
            removed_count = original_count - len(self.metrics)
            logger.info(f"Cleaned up {removed_count} old metrics")
            
        except Exception as e:
            logger.error(f"Failed to cleanup old metrics: {e}")
    
    def _empty_metrics_summary(self) -> Dict[str, Any]:
        """Returns empty metrics summary."""
        return {
            "status": "healthy",
            "service": "Code Execution Service",
            "total_executions": 0,
            "successful_executions": 0,
            "failed_executions": 0,
            "success_rate": 0.0,
            "message": "No metrics available"
        }