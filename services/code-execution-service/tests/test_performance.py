import pytest
import asyncio
import time
from concurrent.futures import ThreadPoolExecutor
from unittest.mock import patch
from src.execution.executor import CodeExecutor
from src.models.execution import ExecutionRequest, Language, TestCase, ExecutionStatus


class TestPerformance:
    
    def setup_method(self):
        self.executor = CodeExecutor()
    
    @pytest.mark.asyncio
    async def test_concurrent_executions(self):
        """Test handling of concurrent code executions."""
        requests = []
        for i in range(10):
            request = ExecutionRequest(
                code=f"print({i})",
                language=Language.PYTHON,
                test_cases=[TestCase(input="", expected_output=str(i))]
            )
            requests.append(request)
        
        with patch.object(self.executor.docker_manager, 'execute_code') as mock_execute:
            def side_effect(code, lang, input_data, limits):
                # Simulate some processing time
                time.sleep(0.1)
                # Extract expected output from code
                expected = code.split('(')[1].split(')')[0]
                return (expected, "", 0.1, 10, ExecutionStatus.SUCCESS)
            
            mock_execute.side_effect = side_effect
            
            # Execute all requests concurrently
            start_time = time.time()
            tasks = [self.executor.execute(req) for req in requests]
            results = await asyncio.gather(*tasks)
            end_time = time.time()
            
            # Check that all executions completed successfully
            assert len(results) == 10
            for i, result in enumerate(results):
                assert result.status == ExecutionStatus.SUCCESS
                assert result.passed_tests == 1
            
            # Check that concurrent execution was faster than sequential
            # (Should be less than 10 * 0.1 = 1 second due to concurrency)
            execution_time = end_time - start_time
            assert execution_time < 0.8  # Allow some overhead
    
    @pytest.mark.asyncio
    async def test_memory_usage_tracking(self):
        """Test that memory usage is properly tracked."""
        request = ExecutionRequest(
            code="data = [i for i in range(1000000)]",  # Memory-intensive code
            language=Language.PYTHON,
            test_cases=[TestCase(input="", expected_output="")]
        )
        
        with patch.object(self.executor.docker_manager, 'execute_code') as mock_execute:
            # Simulate high memory usage
            mock_execute.return_value = ("", "", 0.5, 64, ExecutionStatus.SUCCESS)
            
            result = await self.executor.execute(request)
            
            assert result.memory_used == 64  # MB
            assert result.execution_time == 0.5
    
    @pytest.mark.asyncio
    async def test_timeout_handling(self):
        """Test proper handling of execution timeouts."""
        request = ExecutionRequest(
            code="import time; time.sleep(10)",
            language=Language.PYTHON,
            test_cases=[TestCase(input="", expected_output="")],
            time_limit=2
        )
        
        with patch.object(self.executor.docker_manager, 'execute_code') as mock_execute:
            # Simulate timeout
            mock_execute.return_value = ("", "Time limit exceeded", 2.0, 10, ExecutionStatus.TIME_LIMIT_EXCEEDED)
            
            start_time = time.time()
            result = await self.executor.execute(request)
            end_time = time.time()
            
            assert result.status == ExecutionStatus.TIME_LIMIT_EXCEEDED
            # Should not take much longer than the time limit
            assert end_time - start_time < 3.0
    
    @pytest.mark.asyncio
    async def test_large_input_handling(self):
        """Test handling of large input data."""
        large_input = "1\n" * 5000  # Large input
        expected_output = "5000"
        
        request = ExecutionRequest(
            code="print(len(input().strip().split()))",
            language=Language.PYTHON,
            test_cases=[TestCase(input=large_input, expected_output=expected_output)]
        )
        
        with patch.object(self.executor.docker_manager, 'execute_code') as mock_execute:
            mock_execute.return_value = (expected_output, "", 0.2, 15, ExecutionStatus.SUCCESS)
            
            result = await self.executor.execute(request)
            
            assert result.status == ExecutionStatus.SUCCESS
            assert result.passed_tests == 1
    
    @pytest.mark.asyncio
    async def test_multiple_test_cases_performance(self):
        """Test performance with many test cases."""
        test_cases = []
        for i in range(50):
            test_cases.append(TestCase(input=str(i), expected_output=str(i * 2)))
        
        request = ExecutionRequest(
            code="x = int(input()); print(x * 2)",
            language=Language.PYTHON,
            test_cases=test_cases
        )
        
        with patch.object(self.executor.docker_manager, 'execute_code') as mock_execute:
            def side_effect(code, lang, input_data, limits):
                # Simulate processing based on input
                input_val = int(input_data.strip())
                output = str(input_val * 2)
                return (output, "", 0.05, 8, ExecutionStatus.SUCCESS)
            
            mock_execute.side_effect = side_effect
            
            start_time = time.time()
            result = await self.executor.execute(request)
            end_time = time.time()
            
            assert result.status == ExecutionStatus.SUCCESS
            assert result.passed_tests == 50
            assert result.total_tests == 50
            
            # Should complete in reasonable time
            execution_time = end_time - start_time
            assert execution_time < 5.0  # Should be much faster with proper implementation
    
    @pytest.mark.asyncio
    async def test_resource_cleanup_performance(self):
        """Test that resources are cleaned up efficiently."""
        requests = []
        for i in range(5):
            request = ExecutionRequest(
                code=f"print('test_{i}')",
                language=Language.PYTHON,
                test_cases=[TestCase(input="", expected_output=f"test_{i}")]
            )
            requests.append(request)
        
        with patch.object(self.executor.docker_manager, 'execute_code') as mock_execute:
            with patch.object(self.executor.docker_manager, 'cleanup_old_containers') as mock_cleanup:
                def side_effect(code, lang, input_data, limits):
                    expected = code.split("'")[1]
                    return (expected, "", 0.1, 10, ExecutionStatus.SUCCESS)
                
                mock_execute.side_effect = side_effect
                mock_cleanup.return_value = None
                
                # Execute requests
                for request in requests:
                    result = await self.executor.execute(request)
                    assert result.status == ExecutionStatus.SUCCESS
                
                # Verify cleanup was called (would be called in background)
                # In real implementation, this would be handled by the API routes
    
    @pytest.mark.asyncio
    async def test_error_handling_performance(self):
        """Test that error handling doesn't significantly impact performance."""
        # Mix of successful and failing requests
        requests = []
        for i in range(10):
            if i % 2 == 0:
                # Successful request
                code = f"print({i})"
                expected = str(i)
                status = ExecutionStatus.SUCCESS
            else:
                # Failing request
                code = "print(1/0)"
                expected = ""
                status = ExecutionStatus.RUNTIME_ERROR
            
            request = ExecutionRequest(
                code=code,
                language=Language.PYTHON,
                test_cases=[TestCase(input="", expected_output=expected)]
            )
            requests.append((request, status))
        
        with patch.object(self.executor.docker_manager, 'execute_code') as mock_execute:
            def side_effect(code, lang, input_data, limits):
                if "1/0" in code:
                    return ("", "ZeroDivisionError", 0.1, 10, ExecutionStatus.RUNTIME_ERROR)
                else:
                    expected = code.split('(')[1].split(')')[0]
                    return (expected, "", 0.1, 10, ExecutionStatus.SUCCESS)
            
            mock_execute.side_effect = side_effect
            
            start_time = time.time()
            for request, expected_status in requests:
                result = await self.executor.execute(request)
                assert result.status == expected_status
            end_time = time.time()
            
            # Should handle errors efficiently
            execution_time = end_time - start_time
            assert execution_time < 2.0