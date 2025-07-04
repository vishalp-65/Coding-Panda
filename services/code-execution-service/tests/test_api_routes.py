import pytest
from fastapi.testclient import TestClient
from unittest.mock import patch, AsyncMock
from src.main import app
from src.models.execution import ExecutionResult, ExecutionStatus, TestResult, Language


class TestAPIRoutes:
    
    def setup_method(self):
        self.client = TestClient(app)
    
    def test_root_endpoint(self):
        """Test root endpoint."""
        response = self.client.get("/")
        assert response.status_code == 200
        data = response.json()
        assert "service" in data
        assert "status" in data
        assert data["status"] == "running"
    
    def test_health_endpoint_healthy(self):
        """Test health endpoint when service is healthy."""
        with patch('src.api.routes.executor.health_check') as mock_health:
            mock_health.return_value = {
                "status": "healthy",
                "docker": "healthy",
                "timestamp": 1234567890
            }
            
            response = self.client.get("/api/v1/health")
            assert response.status_code == 200
            data = response.json()
            assert data["status"] == "healthy"
    
    def test_health_endpoint_unhealthy(self):
        """Test health endpoint when service is unhealthy."""
        with patch('src.api.routes.executor.health_check') as mock_health:
            mock_health.return_value = {
                "status": "unhealthy",
                "docker": "unhealthy: Docker not available",
                "timestamp": 1234567890
            }
            
            response = self.client.get("/api/v1/health")
            assert response.status_code == 503
            data = response.json()
            assert data["status"] == "unhealthy"
    
    def test_execute_endpoint_success(self):
        """Test successful code execution."""
        request_data = {
            "code": "print('Hello, World!')",
            "language": "python",
            "test_cases": [
                {
                    "input": "",
                    "expected_output": "Hello, World!",
                    "is_hidden": False
                }
            ],
            "time_limit": 5,
            "memory_limit": 128
        }
        
        mock_result = ExecutionResult(
            status=ExecutionStatus.SUCCESS,
            output="Hello, World!",
            execution_time=0.1,
            memory_used=10,
            test_results=[
                TestResult(
                    passed=True,
                    actual_output="Hello, World!",
                    expected_output="Hello, World!",
                    execution_time=0.1,
                    memory_used=10
                )
            ],
            total_tests=1,
            passed_tests=1
        )
        
        with patch('src.api.routes.executor.execute') as mock_execute:
            mock_execute.return_value = mock_result
            
            response = self.client.post("/api/v1/execute", json=request_data)
            assert response.status_code == 200
            data = response.json()
            assert data["status"] == "success"
            assert data["passed_tests"] == 1
            assert data["total_tests"] == 1
    
    def test_execute_endpoint_security_violation(self):
        """Test code execution with security violation."""
        request_data = {
            "code": "import os; os.system('ls')",
            "language": "python",
            "test_cases": [
                {
                    "input": "",
                    "expected_output": "",
                    "is_hidden": False
                }
            ]
        }
        
        mock_result = ExecutionResult(
            status=ExecutionStatus.SECURITY_VIOLATION,
            output="",
            error="Security violations detected",
            execution_time=0,
            memory_used=0,
            test_results=[],
            total_tests=1,
            passed_tests=0,
            security_violations=["Blocked pattern detected: import\\s+(os)"]
        )
        
        with patch('src.api.routes.executor.execute') as mock_execute:
            mock_execute.return_value = mock_result
            
            response = self.client.post("/api/v1/execute", json=request_data)
            assert response.status_code == 200
            data = response.json()
            assert data["status"] == "security_violation"
            assert len(data["security_violations"]) > 0
    
    def test_execute_endpoint_invalid_request(self):
        """Test code execution with invalid request data."""
        invalid_requests = [
            # Missing required fields
            {"code": "print('test')"},
            # Invalid language
            {
                "code": "print('test')",
                "language": "invalid_language",
                "test_cases": []
            },
            # Empty test cases
            {
                "code": "print('test')",
                "language": "python",
                "test_cases": []
            },
            # Code too long
            {
                "code": "x = 1\n" * 30000,
                "language": "python",
                "test_cases": [{"input": "", "expected_output": ""}]
            }
        ]
        
        for request_data in invalid_requests:
            response = self.client.post("/api/v1/execute", json=request_data)
            assert response.status_code == 422  # Validation error
    
    def test_get_supported_languages(self):
        """Test getting supported languages."""
        response = self.client.get("/api/v1/languages")
        assert response.status_code == 200
        data = response.json()
        assert "supported_languages" in data
        
        languages = data["supported_languages"]
        assert len(languages) > 0
        
        # Check that all expected languages are present
        language_names = [lang["language"] for lang in languages]
        expected_languages = ["python", "javascript", "java", "cpp", "go", "rust"]
        for expected in expected_languages:
            assert expected in language_names
    
    def test_get_metrics(self):
        """Test getting metrics summary."""
        mock_metrics = {
            "languages": {"python": 100, "javascript": 50},
            "statuses": {"success": 120, "runtime_error": 30},
            "execution_times": {"0-100ms": 80, "100-500ms": 70},
            "memory_usage": {"0-16MB": 90, "16-32MB": 60},
            "total_executions": 150
        }
        
        with patch('src.api.routes.metrics_collector.get_metrics_summary') as mock_get_metrics:
            mock_get_metrics.return_value = mock_metrics
            
            response = self.client.get("/api/v1/metrics")
            assert response.status_code == 200
            data = response.json()
            assert data["total_executions"] == 150
            assert "python" in data["languages"]
    
    def test_get_metrics_invalid_hours(self):
        """Test getting metrics with invalid hours parameter."""
        # Too few hours
        response = self.client.get("/api/v1/metrics?hours=0")
        assert response.status_code == 400
        
        # Too many hours
        response = self.client.get("/api/v1/metrics?hours=200")
        assert response.status_code == 400
    
    def test_get_user_metrics(self):
        """Test getting user-specific metrics."""
        mock_user_metrics = {
            "user_id": "test_user",
            "total_executions": 25,
            "time_period_hours": 24
        }
        
        with patch('src.api.routes.metrics_collector.get_user_metrics') as mock_get_user_metrics:
            mock_get_user_metrics.return_value = mock_user_metrics
            
            response = self.client.get("/api/v1/metrics/user/test_user")
            assert response.status_code == 200
            data = response.json()
            assert data["user_id"] == "test_user"
            assert data["total_executions"] == 25
    
    def test_pull_docker_images_admin(self):
        """Test admin endpoint for pulling Docker images."""
        with patch('src.api.routes.executor.docker_manager.pull_images') as mock_pull:
            mock_pull.return_value = None
            
            response = self.client.post("/api/v1/admin/pull-images")
            assert response.status_code == 200
            data = response.json()
            assert "successfully" in data["message"]
    
    def test_cleanup_admin(self):
        """Test admin cleanup endpoint."""
        with patch('src.api.routes.executor.docker_manager.cleanup_old_containers') as mock_cleanup_containers:
            with patch('src.api.routes.metrics_collector.cleanup_old_metrics') as mock_cleanup_metrics:
                mock_cleanup_containers.return_value = None
                mock_cleanup_metrics.return_value = None
                
                response = self.client.post("/api/v1/admin/cleanup")
                assert response.status_code == 200
                data = response.json()
                assert "successfully" in data["message"]
    
    def test_execute_endpoint_internal_error(self):
        """Test handling of internal errors during execution."""
        request_data = {
            "code": "print('test')",
            "language": "python",
            "test_cases": [
                {
                    "input": "",
                    "expected_output": "test",
                    "is_hidden": False
                }
            ]
        }
        
        with patch('src.api.routes.executor.execute') as mock_execute:
            mock_execute.side_effect = Exception("Internal error")
            
            response = self.client.post("/api/v1/execute", json=request_data)
            assert response.status_code == 500
            data = response.json()
            assert "Internal server error" in data["detail"]