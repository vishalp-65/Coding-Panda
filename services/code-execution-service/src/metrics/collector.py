import asyncio
import logging
from typing import Dict, List, Optional
from datetime import datetime, timedelta
from src.models.execution import ExecutionMetrics, ExecutionStatus, Language
import json

logger = logging.getLogger(__name__)


class MetricsCollector:
    """
    Collects and aggregates execution metrics for monitoring and analytics.
    """
    
    def __init__(self):
        self.metrics_buffer: List[ExecutionMetrics] = []
        self.buffer_lock = asyncio.Lock()
        self.max_buffer_size = 1000
        
        # In-memory aggregations for quick access
        self.hourly_stats: Dict[str, Dict] = {}
        self.daily_stats: Dict[str, Dict] = {}
        
        # Start background tasks
        asyncio.create_task(self._flush_metrics_periodically())
        asyncio.create_task(self._cleanup_old_stats())
    
    async def collect_execution_metrics(self, metrics: ExecutionMetrics):
        """
        Collect execution metrics.
        
        Args:
            metrics: ExecutionMetrics object
        """
        try:
            async with self.buffer_lock:
                self.metrics_buffer.append(metrics)
                
                # Update real-time aggregations
                await self._update_aggregations(metrics)
                
                # Flush if buffer is full
                if len(self.metrics_buffer) >= self.max_buffer_size:
                    await self._flush_metrics()
                    
        except Exception as e:
            logger.error(f"Failed to collect metrics: {e}")
    
    async def _update_aggregations(self, metrics: ExecutionMetrics):
        """Update in-memory aggregations."""
        try:
            # Get hour and day keys
            hour_key = metrics.timestamp.strftime('%Y-%m-%d-%H')
            day_key = metrics.timestamp.strftime('%Y-%m-%d')
            
            # Update hourly stats
            if hour_key not in self.hourly_stats:
                self.hourly_stats[hour_key] = self._create_empty_stats()
            
            self._update_stats(self.hourly_stats[hour_key], metrics)
            
            # Update daily stats
            if day_key not in self.daily_stats:
                self.daily_stats[day_key] = self._create_empty_stats()
            
            self._update_stats(self.daily_stats[day_key], metrics)
            
        except Exception as e:
            logger.error(f"Failed to update aggregations: {e}")
    
    def _create_empty_stats(self) -> Dict:
        """Create empty stats structure."""
        return {
            'total_executions': 0,
            'successful_executions': 0,
            'failed_executions': 0,
            'avg_execution_time': 0.0,
            'avg_memory_used': 0,
            'avg_code_length': 0,
            'language_breakdown': {lang.value: 0 for lang in Language},
            'status_breakdown': {status.value: 0 for status in ExecutionStatus},
            'total_execution_time': 0.0,
            'total_memory_used': 0,
            'total_code_length': 0,
            'test_pass_rate': 0.0,
            'total_tests': 0,
            'total_passed_tests': 0,
        }
    
    def _update_stats(self, stats: Dict, metrics: ExecutionMetrics):
        """Update stats with new metrics."""
        stats['total_executions'] += 1
        
        if metrics.status == ExecutionStatus.SUCCESS:
            stats['successful_executions'] += 1
        else:
            stats['failed_executions'] += 1
        
        # Update totals
        stats['total_execution_time'] += metrics.execution_time
        stats['total_memory_used'] += metrics.memory_used
        stats['total_code_length'] += metrics.code_length
        stats['total_tests'] += metrics.test_count
        stats['total_passed_tests'] += metrics.passed_tests
        
        # Update breakdowns
        stats['language_breakdown'][metrics.language.value] += 1
        stats['status_breakdown'][metrics.status.value] += 1
        
        # Recalculate averages
        total = stats['total_executions']
        stats['avg_execution_time'] = stats['total_execution_time'] / total
        stats['avg_memory_used'] = stats['total_memory_used'] / total
        stats['avg_code_length'] = stats['total_code_length'] / total
        
        # Calculate test pass rate
        if stats['total_tests'] > 0:
            stats['test_pass_rate'] = stats['total_passed_tests'] / stats['total_tests']
    
    async def _flush_metrics(self):
        """Flush metrics buffer to persistent storage."""
        try:
            if not self.metrics_buffer:
                return
            
            # In a real implementation, this would write to a database
            # For now, we'll just log the metrics
            logger.info(f"Flushing {len(self.metrics_buffer)} metrics to storage")
            
            # Here you would typically:
            # 1. Write to database (MongoDB, PostgreSQL, etc.)
            # 2. Send to monitoring system (Prometheus, DataDog, etc.)
            # 3. Write to log aggregation system (ELK stack, etc.)
            
            # Example: Write to JSON file (for demonstration)
            await self._write_metrics_to_file(self.metrics_buffer)
            
            # Clear buffer
            self.metrics_buffer.clear()
            
        except Exception as e:
            logger.error(f"Failed to flush metrics: {e}")
    
    async def _write_metrics_to_file(self, metrics: List[ExecutionMetrics]):
        """Write metrics to file (example implementation)."""
        try:
            # Convert to JSON-serializable format
            metrics_data = []
            for metric in metrics:
                metrics_data.append({
                    'request_id': metric.request_id,
                    'user_id': metric.user_id,
                    'language': metric.language.value,
                    'code_length': metric.code_length,
                    'execution_time': metric.execution_time,
                    'memory_used': metric.memory_used,
                    'status': metric.status.value,
                    'test_count': metric.test_count,
                    'passed_tests': metric.passed_tests,
                    'timestamp': metric.timestamp.isoformat(),
                })
            
            # In a real implementation, you'd write to a proper storage system
            logger.debug(f"Would write {len(metrics_data)} metrics to storage")
            
        except Exception as e:
            logger.error(f"Failed to write metrics to file: {e}")
    
    async def _flush_metrics_periodically(self):
        """Periodically flush metrics buffer."""
        while True:
            try:
                await asyncio.sleep(60)  # Flush every minute
                async with self.buffer_lock:
                    if self.metrics_buffer:
                        await self._flush_metrics()
            except Exception as e:
                logger.error(f"Error in periodic metrics flush: {e}")
    
    async def _cleanup_old_stats(self):
        """Clean up old in-memory stats to prevent memory leaks."""
        while True:
            try:
                await asyncio.sleep(3600)  # Clean up every hour
                
                now = datetime.utcnow()
                cutoff_hour = now - timedelta(hours=24)
                cutoff_day = now - timedelta(days=30)
                
                # Clean up hourly stats older than 24 hours
                hour_keys_to_remove = []
                for hour_key in self.hourly_stats:
                    try:
                        hour_time = datetime.strptime(hour_key, '%Y-%m-%d-%H')
                        if hour_time < cutoff_hour:
                            hour_keys_to_remove.append(hour_key)
                    except ValueError:
                        continue
                
                for key in hour_keys_to_remove:
                    del self.hourly_stats[key]
                
                # Clean up daily stats older than 30 days
                day_keys_to_remove = []
                for day_key in self.daily_stats:
                    try:
                        day_time = datetime.strptime(day_key, '%Y-%m-%d')
                        if day_time < cutoff_day:
                            day_keys_to_remove.append(day_key)
                    except ValueError:
                        continue
                
                for key in day_keys_to_remove:
                    del self.daily_stats[key]
                
                logger.info(f"Cleaned up {len(hour_keys_to_remove)} hourly and {len(day_keys_to_remove)} daily stats")
                
            except Exception as e:
                logger.error(f"Error in stats cleanup: {e}")
    
    async def get_hourly_stats(self, hours_back: int = 24) -> Dict[str, Dict]:
        """
        Get hourly statistics for the last N hours.
        
        Args:
            hours_back: Number of hours to look back
            
        Returns:
            Dictionary of hourly stats
        """
        try:
            now = datetime.utcnow()
            result = {}
            
            for i in range(hours_back):
                hour_time = now - timedelta(hours=i)
                hour_key = hour_time.strftime('%Y-%m-%d-%H')
                
                if hour_key in self.hourly_stats:
                    result[hour_key] = self.hourly_stats[hour_key].copy()
                else:
                    result[hour_key] = self._create_empty_stats()
            
            return result
            
        except Exception as e:
            logger.error(f"Failed to get hourly stats: {e}")
            return {}
    
    async def get_daily_stats(self, days_back: int = 7) -> Dict[str, Dict]:
        """
        Get daily statistics for the last N days.
        
        Args:
            days_back: Number of days to look back
            
        Returns:
            Dictionary of daily stats
        """
        try:
            now = datetime.utcnow()
            result = {}
            
            for i in range(days_back):
                day_time = now - timedelta(days=i)
                day_key = day_time.strftime('%Y-%m-%d')
                
                if day_key in self.daily_stats:
                    result[day_key] = self.daily_stats[day_key].copy()
                else:
                    result[day_key] = self._create_empty_stats()
            
            return result
            
        except Exception as e:
            logger.error(f"Failed to get daily stats: {e}")
            return {}
    
    async def get_language_performance(self) -> Dict[str, Dict]:
        """Get performance metrics by programming language."""
        try:
            result = {}
            
            # Aggregate from daily stats
            for day_stats in self.daily_stats.values():
                for lang, count in day_stats['language_breakdown'].items():
                    if count > 0:
                        if lang not in result:
                            result[lang] = {
                                'total_executions': 0,
                                'avg_execution_time': 0.0,
                                'avg_memory_used': 0,
                                'success_rate': 0.0,
                            }
                        
                        # This is a simplified aggregation
                        # In a real system, you'd want more sophisticated calculations
                        result[lang]['total_executions'] += count
            
            return result
            
        except Exception as e:
            logger.error(f"Failed to get language performance: {e}")
            return {}
    
    async def get_system_health(self) -> Dict:
        """Get system health metrics."""
        try:
            # Get recent stats (last hour)
            recent_stats = await self.get_hourly_stats(1)
            
            if not recent_stats:
                return {
                    'status': 'unknown',
                    'total_executions': 0,
                    'success_rate': 0.0,
                    'avg_execution_time': 0.0,
                }
            
            # Get the most recent hour's stats
            latest_hour = max(recent_stats.keys())
            stats = recent_stats[latest_hour]
            
            # Calculate success rate
            total = stats['total_executions']
            success_rate = stats['successful_executions'] / total if total > 0 else 0.0
            
            # Determine health status
            if success_rate >= 0.95 and stats['avg_execution_time'] < 10.0:
                status = 'healthy'
            elif success_rate >= 0.8 and stats['avg_execution_time'] < 20.0:
                status = 'degraded'
            else:
                status = 'unhealthy'
            
            return {
                'status': status,
                'total_executions': total,
                'success_rate': success_rate,
                'avg_execution_time': stats['avg_execution_time'],
                'avg_memory_used': stats['avg_memory_used'],
                'buffer_size': len(self.metrics_buffer),
            }
            
        except Exception as e:
            logger.error(f"Failed to get system health: {e}")
            return {
                'status': 'error',
                'error': str(e),
            }