import time
import uuid
from typing import List, Tuple
from src.models.execution import (
    ExecutionRequest, ExecutionResult, ExecutionStatus, 
    TestResult, ResourceLimits, ExecutionMetrics
)
from src.execution.docker_manager import DockerExecutionManager
from src.security.validator import SecurityValidator
from src.metrics.collector import MetricsCollector
import logging

logger = logging.getLogger(__name__)


class CodeExecutor:
    """Main code execution orchestrator."""
    
    def __init__(self):
        self.docker_manager = DockerExecutionManager()
        self.security_validator = SecurityValidator()
        self.metrics_collector = MetricsCollector()
    
    async def execute(self, request: ExecutionRequest) -> ExecutionResult:
        """Executes code with test cases and returns comprehensive results."""
        request_id = str(uuid.uuid4())
        start_time = time.time()
        
        try:
            # Security validation
            violations = self.security_validator.validate_code(request)
            if violations:
                return self._create_security_violation_result(
                    violations, len(request.test_cases)
                )
            
            # Sanitize code
            sanitized_code = self.security_validator.sanitize_code(
                request.code, request.language
            )
            
            # Set up resource limits
            limits = ResourceLimits(
                memory_limit=f"{request.memory_limit}m",
                time_limit=request.time_limit,
                cpu_limit="0.5"
            )
            
            # Handle compilation if needed
            compilation_output = None
            if self._needs_compilation(request.language):
                compile_result = await self._compile_code(
                    sanitized_code, request.language, limits
                )
                if compile_result:
                    return compile_result
                compilation_output = "Compilation successful"
            
            # Execute test cases
            test_results = await self._execute_test_cases(
                sanitized_code, request, limits
            )
            
            # Calculate final results
            result = self._create_execution_result(
                test_results, compilation_output
            )
            
            # Collect metrics
            await self._collect_metrics(
                request, result, request_id, time.time() - start_time
            )
            
            return result
            
        except Exception as e:
            logger.error(f"Unexpected error in code execution: {e}", exc_info=True)
            return self._create_error_result(
                str(e), len(request.test_cases)
            )
    
    def _create_security_violation_result(
        self, 
        violations: List[str], 
        total_tests: int
    ) -> ExecutionResult:
        """Creates a security violation result."""
        return ExecutionResult(
            status=ExecutionStatus.SECURITY_VIOLATION,
            output="",
            error="Security violations detected: " + "; ".join(violations),
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
        """Creates an internal error result."""
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
    
    async def _compile_code(
        self, 
        code: str, 
        language, 
        limits: ResourceLimits
    ) -> ExecutionResult | None:
        """Compiles code for compiled languages. Returns error result if failed."""
        stdout, stderr, exec_time, memory, status = \
            await self.docker_manager.execute_code(code, language, "", limits)
        
        if status != ExecutionStatus.SUCCESS:
            return ExecutionResult(
                status=ExecutionStatus.COMPILE_ERROR,
                output=stdout,
                error=stderr or "Compilation failed",
                execution_time=exec_time,
                memory_used=memory,
                test_results=[],
                total_tests=0,
                passed_tests=0,
                compilation_output=stderr
            )
        
        return None
    
    async def _execute_test_cases(
        self,
        sanitized_code: str,
        request: ExecutionRequest,
        limits: ResourceLimits
    ) -> List[TestResult]:
        """Executes all test cases and returns results."""
        test_results = []
        
        for i, test_case in enumerate(request.test_cases):
            try:
                # Validate test case
                test_violations = self.security_validator.validate_input_output(
                    test_case.input, test_case.expected_output
                )
                if test_violations:
                    test_results.append(self._create_validation_error_result(
                        test_case, test_violations
                    ))
                    continue
                
                # Execute test case
                stdout, stderr, exec_time, memory_used, status = \
                    await self.docker_manager.execute_code(
                        sanitized_code,
                        request.language,
                        test_case.input,
                        limits
                    )
                
                # Create test result
                test_result = self._create_test_result(
                    test_case, stdout, stderr, exec_time, memory_used, status
                )
                test_results.append(test_result)
                
            except Exception as e:
                logger.error(f"Error executing test case {i}: {e}", exc_info=True)
                test_results.append(self._create_test_execution_error(test_case, e))
        
        return test_results
    
    def _create_validation_error_result(
        self, 
        test_case, 
        violations: List[str]
    ) -> TestResult:
        """Creates a test result for validation errors."""
        return TestResult(
            passed=False,
            actual_output="",
            expected_output=test_case.expected_output,
            execution_time=0,
            memory_used=0,
            error_message=f"Validation failed: {'; '.join(violations)}"
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
        """Creates a test result from execution output."""
        if status != ExecutionStatus.SUCCESS:
            return TestResult(
                passed=False,
                actual_output=stdout,
                expected_output=test_case.expected_output,
                execution_time=exec_time,
                memory_used=memory_used,
                error_message=stderr or f"Execution failed: {status}"
            )
        
        # Compare output
        actual_output = stdout.strip()
        expected_output = test_case.expected_output.strip()
        passed = actual_output == expected_output
        
        return TestResult(
            passed=passed,
            actual_output=actual_output,
            expected_output=expected_output,
            execution_time=exec_time,
            memory_used=memory_used,
            error_message=stderr if stderr else None
        )
    
    def _create_test_execution_error(self, test_case, error: Exception) -> TestResult:
        """Creates a test result for execution errors."""
        return TestResult(
            passed=False,
            actual_output="",
            expected_output=test_case.expected_output,
            execution_time=0,
            memory_used=0,
            error_message=f"Internal error: {str(error)}"
        )
    
    def _create_execution_result(
        self,
        test_results: List[TestResult],
        compilation_output: str | None
    ) -> ExecutionResult:
        """Creates final execution result from test results."""
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
        else:
            status = ExecutionStatus.RUNTIME_ERROR
        
        # Calculate totals
        total_execution_time = sum(r.execution_time for r in test_results)
        max_memory_used = max((r.memory_used for r in test_results), default=0)
        
        # Get output and error from first test
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
        """Check if language needs compilation step."""
        compiled_languages = ['java', 'cpp', 'go', 'rust']
        return language.value in compiled_languages
    
    async def _collect_metrics(
        self, 
        request: ExecutionRequest, 
        result: ExecutionResult, 
        request_id: str,
        total_time: float
    ):
        """Collect execution metrics for monitoring."""
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
        """Perform health check of the execution service."""
        try:
            self.docker_manager.client.ping()
            docker_status = "healthy"
        except Exception as e:
            docker_status = f"unhealthy: {str(e)}"
        
        return {
            "status": "healthy" if docker_status == "healthy" else "unhealthy",
            "docker": docker_status,
            "timestamp": time.time()
        }