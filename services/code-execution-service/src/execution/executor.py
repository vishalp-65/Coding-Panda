import asyncio
import time
import uuid
from typing import List, Dict, Any
from src.models.execution import (
    ExecutionRequest, ExecutionResult, ExecutionStatus, 
    TestResult, TestCase, ResourceLimits, ExecutionMetrics
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
        """
        Executes code with test cases and returns comprehensive results.
        """
        request_id = str(uuid.uuid4())
        start_time = time.time()
        
        try:
            # Security validation
            violations = self.security_validator.validate_code(request)
            if violations:
                return ExecutionResult(
                    status=ExecutionStatus.SECURITY_VIOLATION,
                    output="",
                    error="Security violations detected",
                    execution_time=0,
                    memory_used=0,
                    test_results=[],
                    total_tests=len(request.test_cases),
                    passed_tests=0,
                    security_violations=violations
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
            
            # Execute test cases
            test_results = []
            total_execution_time = 0
            max_memory_used = 0
            compilation_output = None
            overall_status = ExecutionStatus.SUCCESS
            
            # First, try to compile if needed (for compiled languages)
            if self._needs_compilation(request.language):
                compile_result = await self._compile_code(
                    sanitized_code, request.language, limits
                )
                if compile_result[4] != ExecutionStatus.SUCCESS:
                    return ExecutionResult(
                        status=ExecutionStatus.COMPILE_ERROR,
                        output="",
                        error=compile_result[1],
                        execution_time=compile_result[2],
                        memory_used=compile_result[3],
                        test_results=[],
                        total_tests=len(request.test_cases),
                        passed_tests=0,
                        compilation_output=compile_result[1]
                    )
                compilation_output = compile_result[0]
            
            # Execute each test case
            for i, test_case in enumerate(request.test_cases):
                try:
                    # Validate test case
                    test_violations = self.security_validator.validate_input_output(
                        test_case.input, test_case.expected_output
                    )
                    if test_violations:
                        test_result = TestResult(
                            passed=False,
                            actual_output="",
                            expected_output=test_case.expected_output,
                            execution_time=0,
                            memory_used=0,
                            error_message=f"Test case validation failed: {'; '.join(test_violations)}"
                        )
                        test_results.append(test_result)
                        continue
                    
                    # Execute test case
                    stdout, stderr, exec_time, memory_used, status = await self.docker_manager.execute_code(
                        sanitized_code,
                        request.language,
                        test_case.input,
                        limits
                    )
                    
                    total_execution_time += exec_time
                    max_memory_used = max(max_memory_used, memory_used)
                    
                    # Check if execution failed
                    if status != ExecutionStatus.SUCCESS:
                        overall_status = status
                        test_result = TestResult(
                            passed=False,
                            actual_output=stdout,
                            expected_output=test_case.expected_output,
                            execution_time=exec_time,
                            memory_used=memory_used,
                            error_message=stderr or f"Execution failed with status: {status}"
                        )
                    else:
                        # Compare output
                        actual_output = stdout.strip()
                        expected_output = test_case.expected_output.strip()
                        passed = actual_output == expected_output
                        
                        if not passed and overall_status == ExecutionStatus.SUCCESS:
                            overall_status = ExecutionStatus.RUNTIME_ERROR
                        
                        test_result = TestResult(
                            passed=passed,
                            actual_output=actual_output,
                            expected_output=expected_output,
                            execution_time=exec_time,
                            memory_used=memory_used,
                            error_message=stderr if stderr else None
                        )
                    
                    test_results.append(test_result)
                    
                except Exception as e:
                    logger.error(f"Error executing test case {i}: {e}")
                    test_result = TestResult(
                        passed=False,
                        actual_output="",
                        expected_output=test_case.expected_output,
                        execution_time=0,
                        memory_used=0,
                        error_message=f"Internal error: {str(e)}"
                    )
                    test_results.append(test_result)
                    overall_status = ExecutionStatus.INTERNAL_ERROR
            
            # Calculate results
            passed_tests = sum(1 for result in test_results if result.passed)
            
            # Create final result
            result = ExecutionResult(
                status=overall_status,
                output=test_results[0].actual_output if test_results else "",
                error=test_results[0].error_message if test_results and test_results[0].error_message else None,
                execution_time=total_execution_time,
                memory_used=max_memory_used,
                test_results=test_results,
                total_tests=len(request.test_cases),
                passed_tests=passed_tests,
                compilation_output=compilation_output
            )
            
            # Collect metrics
            await self._collect_metrics(request, result, request_id, time.time() - start_time)
            
            return result
            
        except Exception as e:
            logger.error(f"Unexpected error in code execution: {e}")
            return ExecutionResult(
                status=ExecutionStatus.INTERNAL_ERROR,
                output="",
                error=f"Internal server error: {str(e)}",
                execution_time=0,
                memory_used=0,
                test_results=[],
                total_tests=len(request.test_cases),
                passed_tests=0
            )
    
    def _needs_compilation(self, language) -> bool:
        """Check if language needs compilation step."""
        compiled_languages = ['java', 'cpp', 'go', 'rust']
        return language.value in compiled_languages
    
    async def _compile_code(self, code: str, language, limits: ResourceLimits):
        """Compile code for compiled languages."""
        return await self.docker_manager.execute_code(
            code, language, "", limits
        )
    
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
    
    async def health_check(self) -> Dict[str, Any]:
        """Perform health check of the execution service."""
        try:
            # Test Docker connection
            self.docker_manager.client.ping()
            docker_status = "healthy"
        except Exception as e:
            docker_status = f"unhealthy: {str(e)}"
        
        return {
            "status": "healthy" if docker_status == "healthy" else "unhealthy",
            "docker": docker_status,
            "timestamp": time.time()
        }