import pytest
import asyncio
from unittest.mock import Mock, patch, AsyncMock
from src.execution.executor import CodeExecutor
from src.models.execution import (
    ExecutionRequest, Language, TestCase, ExecutionStatus, ExecutionResult
)


class TestCodeExecutor:
    
    def setup_method(self):
        self.executor = CodeExecutor()
    
    @pytest.mark.asyncio
    async def test_execute_simple_python_code(self):
        """Test execution of simple Python code."""
        request = ExecutionRequest(
            code="print('Hello, World!')",
            language=Language.PYTHON,
            test_cases=[TestCase(input="", expected_output="Hello, World!")]
        )
        
        # Mock the docker manager
        with patch.object(self.executor.docker_manager, 'execute_code') as mock_execute:
            mock_execute.return_value = ("Hello, World!", "", 0.1, 10, ExecutionStatus.SUCCESS)
            
            result = await self.executor.execute(request)
            
            assert result.status == ExecutionStatus.SUCCESS
            assert result.passed_tests == 1
            assert result.total_tests == 1
            assert len(result.test_results) == 1
            assert result.test_results[0].passed is True
    
    @pytest.mark.asyncio
    async def test_execute_with_security_violation(self):
        """Test execution with security violations."""
        request = ExecutionRequest(
            code="import os\nos.system('ls')",
            language=Language.PYTHON,
            test_cases=[TestCase(input="", expected_output="")]
        )
        
        result = await self.executor.execute(request)
        
        assert result.status == ExecutionStatus.SECURITY_VIOLATION
        assert len(result.security_violations) > 0
        assert result.passed_tests == 0
    
    @pytest.mark.asyncio
    async def test_execute_with_runtime_error(self):
        """Test execution with runtime error."""
        request = ExecutionRequest(
            code="print(1/0)",
            language=Language.PYTHON,
            test_cases=[TestCase(input="", expected_output="")]
        )
        
        with patch.object(self.executor.docker_manager, 'execute_code') as mock_execute:
            mock_execute.return_value = ("", "ZeroDivisionError: division by zero", 0.1, 10, ExecutionStatus.RUNTIME_ERROR)
            
            result = await self.executor.execute(request)
            
            assert result.status == ExecutionStatus.RUNTIME_ERROR
            assert result.passed_tests == 0
            assert "ZeroDivisionError" in result.test_results[0].error_message
    
    @pytest.mark.asyncio
    async def test_execute_with_time_limit_exceeded(self):
        """Test execution with time limit exceeded."""
        request = ExecutionRequest(
            code="while True: pass",
            language=Language.PYTHON,
            test_cases=[TestCase(input="", expected_output="")],
            time_limit=1
        )
        
        with patch.object(self.executor.docker_manager, 'execute_code') as mock_execute:
            mock_execute.return_value = ("", "Time limit exceeded", 1.0, 10, ExecutionStatus.TIME_LIMIT_EXCEEDED)
            
            result = await self.executor.execute(request)
            
            assert result.status == ExecutionStatus.TIME_LIMIT_EXCEEDED
            assert result.passed_tests == 0
    
    @pytest.mark.asyncio
    async def test_execute_multiple_test_cases(self):
        """Test execution with multiple test cases."""
        request = ExecutionRequest(
            code="x = int(input())\nprint(x * 2)",
            language=Language.PYTHON,
            test_cases=[
                TestCase(input="5", expected_output="10"),
                TestCase(input="3", expected_output="6"),
                TestCase(input="0", expected_output="0")
            ]
        )
        
        with patch.object(self.executor.docker_manager, 'execute_code') as mock_execute:
            # Mock different outputs for different inputs
            def side_effect(code, lang, input_data, limits):
                if input_data == "5":
                    return ("10", "", 0.1, 10, ExecutionStatus.SUCCESS)
                elif input_data == "3":
                    return ("6", "", 0.1, 10, ExecutionStatus.SUCCESS)
                elif input_data == "0":
                    return ("0", "", 0.1, 10, ExecutionStatus.SUCCESS)
                return ("", "Error", 0.1, 10, ExecutionStatus.RUNTIME_ERROR)
            
            mock_execute.side_effect = side_effect
            
            result = await self.executor.execute(request)
            
            assert result.status == ExecutionStatus.SUCCESS
            assert result.passed_tests == 3
            assert result.total_tests == 3
            assert all(test.passed for test in result.test_results)
    
    @pytest.mark.asyncio
    async def test_execute_with_wrong_output(self):
        """Test execution with wrong output."""
        request = ExecutionRequest(
            code="print('Wrong answer')",
            language=Language.PYTHON,
            test_cases=[TestCase(input="", expected_output="Correct answer")]
        )
        
        with patch.object(self.executor.docker_manager, 'execute_code') as mock_execute:
            mock_execute.return_value = ("Wrong answer", "", 0.1, 10, ExecutionStatus.SUCCESS)
            
            result = await self.executor.execute(request)
            
            assert result.status == ExecutionStatus.RUNTIME_ERROR  # Wrong output counts as runtime error
            assert result.passed_tests == 0
            assert result.test_results[0].passed is False
            assert result.test_results[0].actual_output == "Wrong answer"
            assert result.test_results[0].expected_output == "Correct answer"
    
    @pytest.mark.asyncio
    async def test_needs_compilation(self):
        """Test compilation detection for different languages."""
        assert self.executor._needs_compilation(Language.JAVA) is True
        assert self.executor._needs_compilation(Language.CPP) is True
        assert self.executor._needs_compilation(Language.GO) is True
        assert self.executor._needs_compilation(Language.RUST) is True
        assert self.executor._needs_compilation(Language.PYTHON) is False
        assert self.executor._needs_compilation(Language.JAVASCRIPT) is False
    
    @pytest.mark.asyncio
    async def test_compile_error(self):
        """Test handling of compilation errors."""
        request = ExecutionRequest(
            code="public class Solution { invalid syntax }",
            language=Language.JAVA,
            test_cases=[TestCase(input="", expected_output="")]
        )
        
        with patch.object(self.executor.docker_manager, 'execute_code') as mock_execute:
            mock_execute.return_value = ("", "Compilation error: syntax error", 0.1, 10, ExecutionStatus.COMPILE_ERROR)
            
            result = await self.executor.execute(request)
            
            assert result.status == ExecutionStatus.COMPILE_ERROR
            assert "Compilation error" in result.error
            assert result.compilation_output is not None
    
    @pytest.mark.asyncio
    async def test_health_check(self):
        """Test health check functionality."""
        with patch.object(self.executor.docker_manager.client, 'ping') as mock_ping:
            mock_ping.return_value = True
            
            health = await self.executor.health_check()
            
            assert health["status"] == "healthy"
            assert health["docker"] == "healthy"
            assert "timestamp" in health
    
    @pytest.mark.asyncio
    async def test_health_check_docker_failure(self):
        """Test health check with Docker failure."""
        with patch.object(self.executor.docker_manager.client, 'ping') as mock_ping:
            mock_ping.side_effect = Exception("Docker not available")
            
            health = await self.executor.health_check()
            
            assert health["status"] == "unhealthy"
            assert "Docker not available" in health["docker"]
    
    @pytest.mark.asyncio
    async def test_metrics_collection(self):
        """Test that metrics are collected during execution."""
        request = ExecutionRequest(
            code="print('test')",
            language=Language.PYTHON,
            test_cases=[TestCase(input="", expected_output="test")],
            user_id="test_user"
        )
        
        with patch.object(self.executor.docker_manager, 'execute_code') as mock_execute:
            mock_execute.return_value = ("test", "", 0.1, 10, ExecutionStatus.SUCCESS)
            
            with patch.object(self.executor.metrics_collector, 'collect_execution_metrics') as mock_collect:
                mock_collect.return_value = None
                
                result = await self.executor.execute(request)
                
                assert result.status == ExecutionStatus.SUCCESS
                mock_collect.assert_called_once()
                
                # Check that metrics were collected with correct data
                call_args = mock_collect.call_args[0][0]
                assert call_args.user_id == "test_user"
                assert call_args.language == Language.PYTHON
                assert call_args.status == ExecutionStatus.SUCCESS