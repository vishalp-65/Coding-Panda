import time
import uuid
import hashlib
from typing import List, Optional
from src.models.execution import (
    ExecutionRequest, ExecutionResult, ExecutionStatus, 
    TestResult, ResourceLimits, ExecutionMetrics
)
from src.execution.docker_manager import DockerExecutionManager
from src.security.validator import SecurityValidator
from src.metrics.collector import MetricsCollector
from src.services.CodeMergerService import CodeMergerService
import logging
import asyncio
from functools import lru_cache

logger = logging.getLogger(__name__)


class CodeExecutor:
    """Highly optimized code execution orchestrator with caching and pooling."""
    
    def __init__(self):
        self.docker_manager = DockerExecutionManager()
        self.security_validator = SecurityValidator()
        self.metrics_collector = MetricsCollector()
        self.code_merger = CodeMergerService()
        
        # Result cache for identical submissions (LRU cache)
        self._result_cache = {}
        self._cache_lock = asyncio.Lock()
        self._max_cache_size = 1000
        
        # Execution semaphore for rate limiting
        self._execution_semaphore = asyncio.Semaphore(
            10  # Max 10 concurrent executions
        )
    
    def _get_cache_key(self, request: ExecutionRequest) -> str:
        """Generate cache key for execution request."""
        # Create deterministic hash from code + language + test cases
        cache_data = f"{request.code}|{request.language.value}|"
        cache_data += "|".join(
            f"{tc.input}:{tc.expected_output}" for tc in request.test_cases
        )
        return hashlib.sha256(cache_data.encode()).hexdigest()
    
    async def _get_cached_result(self, cache_key: str) -> Optional[ExecutionResult]:
        """Retrieve cached result if available."""
        async with self._cache_lock:
            if cache_key in self._result_cache:
                cached = self._result_cache[cache_key]
                # Check if cache is still fresh (5 minutes)
                if time.time() - cached['timestamp'] < 300:
                    logger.info(f"Cache hit for key: {cache_key[:8]}")
                    return cached['result']
                else:
                    # Remove stale cache
                    del self._result_cache[cache_key]
        return None
    
    async def _cache_result(self, cache_key: str, result: ExecutionResult):
        """Cache execution result."""
        async with self._cache_lock:
            # Implement LRU eviction
            if len(self._result_cache) >= self._max_cache_size:
                # Remove oldest entry
                oldest_key = min(
                    self._result_cache.keys(),
                    key=lambda k: self._result_cache[k]['timestamp']
                )
                del self._result_cache[oldest_key]
            
            self._result_cache[cache_key] = {
                'result': result,
                'timestamp': time.time()
            }
    
    async def execute(self, request: ExecutionRequest) -> ExecutionResult:
        """Execute code with optimizations: caching, batching, rate limiting."""
        request_id = str(uuid.uuid4())
        start_time = time.time()
        
        # Check cache first
        cache_key = self._get_cache_key(request)
        cached_result = await self._get_cached_result(cache_key)
        # if cached_result:
        #     return cached_result
        
        # Apply rate limiting
        async with self._execution_semaphore:
            try:
                # Security validation (fast path)
                violations = self.security_validator.validate_code(request)
                if violations:
                    return self._create_security_violation_result(
                        violations, len(request.test_cases)
                    )
                
                # Merge user code with hidden infrastructure code if provided
                if request.hidden_code:
                    # Validate user code first
                    is_valid, error_msg = self.code_merger.validate_user_code(
                        request.code, request.language
                    )
                    if not is_valid:
                        return ExecutionResult(
                            status=ExecutionStatus.COMPILE_ERROR,
                            output="",
                            error=f"Code validation failed: {error_msg}",
                            execution_time=0,
                            memory_used=0,
                            test_results=[],
                            total_tests=len(request.test_cases),
                            passed_tests=0,
                            compilation_output=error_msg
                        )
                    
                    # Merge user code with hidden code
                    merged_code = self.code_merger.merge_code(
                        request.code, request.hidden_code, request.language
                    )
                    logger.info(f"Code merged : {merged_code}")
                    sanitized_code = self.security_validator.sanitize_code(
                        merged_code, request.language
                    )
                else:
                    # Use user code directly (legacy mode)
                    sanitized_code = self.security_validator.sanitize_code(
                        request.code, request.language
                    )
                
                # Set up resource limits with adaptive sizing
                limits = self._get_resource_limits(request)
                
                # Validate test cases in parallel
                test_inputs, validation_errors = await self._validate_test_cases_batch(
                    request.test_cases
                )
                
                # Execute all test cases in optimized batch
                execution_results = await self.docker_manager.execute_code_batch(
                    sanitized_code,
                    request.language,
                    test_inputs,
                    limits
                )
                
                # Handle compilation errors
                if (execution_results and 
                    execution_results[0][4] == ExecutionStatus.COMPILE_ERROR):
                    result = ExecutionResult(
                        status=ExecutionStatus.COMPILE_ERROR,
                        output=execution_results[0][0],
                        error=execution_results[0][1] or "Compilation failed",
                        execution_time=execution_results[0][2],
                        memory_used=execution_results[0][3],
                        test_results=[],
                        total_tests=len(request.test_cases),
                        passed_tests=0,
                        compilation_output=execution_results[0][1]
                    )
                    await self._cache_result(cache_key, result)
                    return result
                
                # Build test results efficiently
                test_results = self._build_test_results(
                    request.test_cases,
                    execution_results,
                    validation_errors
                )
                
                # Create final result
                result = self._create_execution_result(
                    test_results,
                    "Compilation successful" if self._needs_compilation(request.language) else None
                )
                
                # Cache successful results
                if result.status in [ExecutionStatus.SUCCESS, ExecutionStatus.RUNTIME_ERROR]:
                    await self._cache_result(cache_key, result)
                
                # Collect metrics asynchronously (fire and forget)
                asyncio.create_task(
                    self._collect_metrics(
                        request, result, request_id, time.time() - start_time
                    )
                )
                
                return result
                
            except Exception as e:
                logger.error(f"Unexpected error in code execution: {e}", exc_info=True)
                return self._create_error_result(
                    str(e), len(request.test_cases)
                )
    
    def _get_resource_limits(self, request: ExecutionRequest) -> ResourceLimits:
        """Get resource limits with adaptive sizing based on language."""
        # Adaptive memory limits based on language
        memory_multipliers = {
            'java': 1.5,  # Java needs more memory for JVM
            'rust': 1.2,  # Rust compilation needs more memory
            'cpp': 1.0,
            'go': 1.0,
            'python': 0.8,
            'javascript': 0.8,
        }
        
        multiplier = memory_multipliers.get(request.language.value, 1.0)
        adjusted_memory = int(request.memory_limit * multiplier)
        adjusted_memory = min(adjusted_memory, 512)  # Cap at 512MB
        
        return ResourceLimits(
            memory_limit=f"{adjusted_memory}m",
            time_limit=request.time_limit,
            cpu_limit="0.5",
            network_disabled=True,
            read_only_filesystem=True,
            max_file_size=10485760  # 10MB
        )
    
    async def _validate_test_cases_batch(
        self, 
        test_cases: List
    ) -> tuple[List[str], List[tuple[int, List[str]]]]:
        """Validate all test cases in parallel."""
        test_inputs = []
        validation_errors = []
        
        async def validate_single(i, test_case):
            violations = self.security_validator.validate_input_output(
                test_case.input, test_case.expected_output
            )
            if violations:
                return (i, violations, None)
            return (i, None, test_case.input)
        
        # Validate in parallel
        tasks = [
            validate_single(i, tc) 
            for i, tc in enumerate(test_cases)
        ]
        results = await asyncio.gather(*tasks)
        
        for i, violations, test_input in results:
            if violations:
                validation_errors.append((i, violations))
            else:
                test_inputs.append(test_input)
        
        return test_inputs, validation_errors
    
    def _build_test_results(
        self,
        test_cases: List,
        execution_results: List,
        validation_errors: List[tuple[int, List[str]]]
    ) -> List[TestResult]:
        """Build test results efficiently."""
        test_results = []
        exec_result_idx = 0
        
        for i, test_case in enumerate(test_cases):
            # Check for validation errors
            validation_error = next(
                (err for idx, err in validation_errors if idx == i),
                None
            )
            
            if validation_error:
                test_results.append(self._create_validation_error_result(
                    test_case, validation_error
                ))
            else:
                # Get execution result
                stdout, stderr, exec_time, memory_used, status = \
                    execution_results[exec_result_idx]
                exec_result_idx += 1
                
                test_result = self._create_test_result(
                    test_case, stdout, stderr, exec_time, memory_used, status
                )
                test_results.append(test_result)
        
        return test_results
    
    def _create_security_violation_result(
        self, 
        violations: List[str], 
        total_tests: int
    ) -> ExecutionResult:
        """Create security violation result."""
        return ExecutionResult(
            status=ExecutionStatus.SECURITY_VIOLATION,
            output="",
            error="Security violations detected: " + "; ".join(violations[:3]),
            execution_time=0,
            memory_used=0,
            test_results=[],
            total_tests=total_tests,
            passed_tests=0,
            security_violations=violations
        )
    
    def _create_error_result(
        self, 
        error_message: str, 
        total_tests: int
    ) -> ExecutionResult:
        """Create internal error result."""
        return ExecutionResult(
            status=ExecutionStatus.INTERNAL_ERROR,
            output="",
            error=f"Internal server error: {error_message}",
            execution_time=0,
            memory_used=0,
            test_results=[],
            total_tests=total_tests,
            passed_tests=0
        )
    
    def _create_validation_error_result(
        self, 
        test_case, 
        violations: List[str]
    ) -> TestResult:
        """Create validation error test result."""
        return TestResult(
            passed=False,
            actual_output="",
            expected_output=test_case.expected_output,
            execution_time=0,
            memory_used=0,
            error_message=f"Validation failed: {'; '.join(violations[:2])}"
        )
    
    def _create_test_result(
        self,
        test_case,
        stdout: str,
        stderr: str,
        exec_time: float,
        memory_used: int,
        status: ExecutionStatus
    ) -> TestResult:
        """Create test result from execution output."""
        if status != ExecutionStatus.SUCCESS:
            return TestResult(
                passed=False,
                actual_output=stdout[:1000],  # Truncate for performance
                expected_output=test_case.expected_output[:1000],
                execution_time=exec_time,
                memory_used=memory_used,
                error_message=stderr[:500] or f"Execution failed: {status}"
            )
        
        # Fast output comparison
        actual_output = stdout.strip()
        expected_output = test_case.expected_output.strip()
        passed = actual_output == expected_output
        
        return TestResult(
            passed=passed,
            actual_output=actual_output[:1000],
            expected_output=expected_output[:1000],
            execution_time=exec_time,
            memory_used=memory_used,
            error_message=stderr[:500] if stderr else None
        )
    
    def _create_execution_result(
        self,
        test_results: List[TestResult],
        compilation_output: str | None
    ) -> ExecutionResult:
        """Create final execution result."""
        passed_tests = sum(1 for r in test_results if r.passed)
        total_tests = len(test_results)
        
        # Determine overall status
        if not test_results:
            status = ExecutionStatus.INTERNAL_ERROR
        elif passed_tests == total_tests:
            status = ExecutionStatus.SUCCESS
        elif any(r.error_message and "Time limit" in r.error_message for r in test_results):
            status = ExecutionStatus.TIME_LIMIT_EXCEEDED
        elif any(r.error_message and "Memory limit" in r.error_message for r in test_results):
            status = ExecutionStatus.MEMORY_LIMIT_EXCEEDED
        elif any(r.error_message and r.error_message not in ["", None] and 
                 "Time limit" not in r.error_message and 
                 "Memory limit" not in r.error_message for r in test_results):
            # Only set RUNTIME_ERROR if there are actual error messages (exceptions, crashes, etc.)
            status = ExecutionStatus.RUNTIME_ERROR
        else:
            # Code executed successfully but produced wrong output - this is still SUCCESS
            status = ExecutionStatus.SUCCESS
        
        # Calculate aggregates
        total_execution_time = sum(r.execution_time for r in test_results)
        max_memory_used = max((r.memory_used for r in test_results), default=0)
        
        # Get representative output/error
        output = test_results[0].actual_output if test_results else ""
        error = test_results[0].error_message if test_results and test_results[0].error_message else None
        
        return ExecutionResult(
            status=status,
            output=output,
            error=error,
            execution_time=total_execution_time,
            memory_used=max_memory_used,
            test_results=test_results,
            total_tests=total_tests,
            passed_tests=passed_tests,
            compilation_output=compilation_output
        )
    
    def _needs_compilation(self, language) -> bool:
        """Check if language needs compilation."""
        compiled_languages = ['java', 'cpp', 'go', 'rust']
        return language.value in compiled_languages
    
    async def _collect_metrics(
        self, 
        request: ExecutionRequest, 
        result: ExecutionResult, 
        request_id: str,
        total_time: float
    ):
        """Collect metrics asynchronously."""
        try:
            metrics = ExecutionMetrics(
                request_id=request_id,
                user_id=request.user_id,
                language=request.language,
                code_length=len(request.code),
                execution_time=result.execution_time,
                memory_used=result.memory_used,
                status=result.status,
                test_count=result.total_tests,
                passed_tests=result.passed_tests
            )
            
            await self.metrics_collector.collect_execution_metrics(metrics)
            
        except Exception as e:
            logger.warning(f"Failed to collect metrics: {e}")
    
    async def health_check(self) -> dict:
        """Perform health check."""
        try:
            self.docker_manager.client.ping()
            docker_status = "healthy"
        except Exception as e:
            docker_status = f"unhealthy: {str(e)}"
        
        cache_size = len(self._result_cache)
        
        return {
            "status": "healthy" if docker_status == "healthy" else "unhealthy",
            "docker": docker_status,
            "cache_size": cache_size,
            "timestamp": time.time()
        }
    
    async def clear_cache(self):
        """Clear result cache."""
        async with self._cache_lock:
            self._result_cache.clear()
            logger.info("Result cache cleared")
    
    async def warmup(self):
        """Warm up the execution environment."""
        await self.docker_manager.warmup()