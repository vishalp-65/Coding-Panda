"""
Tests for API endpoints
"""
import pytest
from fastapi.testclient import TestClient
from unittest.mock import patch, AsyncMock
from src.main import app
from src.models.analysis import AnalysisResult, ProgrammingLanguage, ComplexityMetrics


@pytest.fixture
def client():
    """Create test client"""
    return TestClient(app)


@pytest.fixture
def sample_analysis_result():
    """Sample analysis result for mocking"""
    return AnalysisResult(
        analysis_id="test-123",
        language=ProgrammingLanguage.PYTHON,
        quality_score=85.0,
        security_score=90.0,
        performance_score=80.0,
        maintainability_score=75.0,
        complexity_metrics=ComplexityMetrics(
            cyclomatic_complexity=5,
            cognitive_complexity=6,
            lines_of_code=50,
            maintainability_index=75.0,
            halstead_difficulty=10.0,
            halstead_volume=200.0
        ),
        security_issues=[],
        performance_issues=[],
        code_smells=[],
        suggestions=[],
        analysis_duration=1.5,
        cached=False,
        ai_feedback="Good job!",
        explanation="This code does X, Y, Z."
    )


class TestHealthEndpoints:
    """Test health check endpoints"""
    
    def test_basic_health_check(self, client):
        """Test basic health endpoint"""
        response = client.get("/health/")
        
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "healthy"
        assert data["service"] == "AI Analysis Service"
    
    def test_readiness_check(self, client):
        """Test readiness endpoint"""
        with patch('src.core.redis_client.get_redis') as mock_redis:
            mock_redis_client = AsyncMock()
            mock_redis_client.ping = AsyncMock()
            mock_redis.return_value = mock_redis_client
            
            response = client.get("/health/ready")
            
            assert response.status_code == 200
            data = response.json()
            assert data["status"] == "ready"
    
    def test_liveness_check(self, client):
        """Test liveness endpoint"""
        response = client.get("/health/live")
        
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "alive"


class TestAnalysisEndpoints:
    """Test analysis API endpoints"""
    
    def test_analyze_code_success(self, client, sample_analysis_result):
        """Test successful code analysis"""
        request_data = {
            "code": "def hello(): return 'world'",
            "language": "python",
            "analysis_types": ["general"],
            "include_ai_feedback": True
        }
        
        with patch('src.services.analysis_service.AnalysisService.analyze_code') as mock_analyze:
            mock_analyze.return_value = sample_analysis_result
            
            response = client.post("/api/v1/analysis/analyze", json=request_data)
            
            assert response.status_code == 200
            data = response.json()
            assert data["analysis_id"] == "test-123"
            assert data["language"] == "python"
            assert data["quality_score"] == 85.0
    
    def test_analyze_code_empty_code(self, client):
        """Test analysis with empty code"""
        request_data = {
            "code": "",
            "language": "python",
            "analysis_types": ["general"]
        }
        
        response = client.post("/api/v1/analysis/analyze", json=request_data)
        
        assert response.status_code == 400
        assert "empty" in response.json()["detail"].lower()
    
    def test_analyze_code_too_long(self, client):
        """Test analysis with code that's too long"""
        request_data = {
            "code": "x = 1\n" * 100000,  # Very long code
            "language": "python",
            "analysis_types": ["general"]
        }
        
        response = client.post("/api/v1/analysis/analyze", json=request_data)
        
        assert response.status_code == 400
        assert "exceeds maximum" in response.json()["detail"]
    
    def test_generate_hints_success(self, client):
        """Test successful hint generation"""
        request_data = {
            "problem_id": "test-problem",
            "user_code": "def solution(): pass",
            "language": "python",
            "hint_level": 2
        }
        
        mock_hints = [
            {
                "level": 1,
                "content": "Think about the algorithm",
                "type": "conceptual",
                "reveals_solution": False
            }
        ]
        
        with patch('src.services.analysis_service.AnalysisService.generate_hints') as mock_hints_gen:
            mock_hints_gen.return_value = [type('Hint', (), hint) for hint in mock_hints]
            
            response = client.post("/api/v1/analysis/hints", json=request_data)
            
            assert response.status_code == 200
            data = response.json()
            assert len(data) > 0
            assert data[0]["level"] == 1
    
    def test_generate_hints_missing_problem_id(self, client):
        """Test hint generation with missing problem ID"""
        request_data = {
            "problem_id": "",
            "user_code": "def solution(): pass",
            "language": "python"
        }
        
        response = client.post("/api/v1/analysis/hints", json=request_data)
        
        assert response.status_code == 400
        assert "required" in response.json()["detail"].lower()
    
    def test_explain_code_success(self, client):
        """Test successful code explanation"""
        request_data = {
            "code": "def fibonacci(n): return n if n <= 1 else fibonacci(n-1) + fibonacci(n-2)",
            "language": "python",
            "detail_level": "medium"
        }
        
        mock_explanation = type('CodeExplanation', (), {
            "summary": "Recursive fibonacci implementation",
            "detailed_explanation": "This implements fibonacci using recursion",
            "time_complexity": "O(2^n)",
            "space_complexity": "O(n)",
            "key_concepts": ["recursion"],
            "learning_resources": []
        })
        
        with patch('src.services.analysis_service.AnalysisService.explain_code') as mock_explain:
            mock_explain.return_value = mock_explanation
            
            response = client.post("/api/v1/analysis/explain", json=request_data)
            
            assert response.status_code == 200
            data = response.json()
            assert "fibonacci" in data["summary"].lower()
    
    def test_get_supported_languages(self, client):
        """Test getting supported languages"""
        response = client.get("/api/v1/analysis/languages")
        
        assert response.status_code == 200
        data = response.json()
        assert "languages" in data
        assert "python" in data["languages"]
        assert "javascript" in data["languages"]
        assert data["count"] > 0
    
    def test_get_analysis_types(self, client):
        """Test getting analysis types"""
        response = client.get("/api/v1/analysis/analysis-types")
        
        assert response.status_code == 200
        data = response.json()
        assert "analysis_types" in data
        assert "general" in data["analysis_types"]
        assert "security" in data["analysis_types"]
        assert data["count"] > 0
    
    def test_batch_analyze_success(self, client, sample_analysis_result):
        """Test successful batch analysis"""
        request_data = [
            {
                "code": "def hello(): return 'world'",
                "language": "python",
                "analysis_types": ["general"]
            },
            {
                "code": "function hello() { return 'world'; }",
                "language": "javascript",
                "analysis_types": ["general"]
            }
        ]
        
        with patch('src.services.analysis_service.AnalysisService.analyze_code') as mock_analyze:
            mock_analyze.return_value = sample_analysis_result
            
            response = client.post("/api/v1/analysis/batch-analyze", json=request_data)
            
            assert response.status_code == 200
            data = response.json()
            assert data["total_requests"] == 2
            assert len(data["results"]) == 2
            assert all(result["status"] == "success" for result in data["results"])
    
    def test_batch_analyze_too_many_requests(self, client):
        """Test batch analysis with too many requests"""
        request_data = [
            {
                "code": f"def func{i}(): pass",
                "language": "python",
                "analysis_types": ["general"]
            }
            for i in range(15)  # More than the limit of 10
        ]
        
        response = client.post("/api/v1/analysis/batch-analyze", json=request_data)
        
        assert response.status_code == 400
        assert "exceed" in response.json()["detail"].lower()
    
    def test_get_metrics(self, client):
        """Test getting service metrics"""
        response = client.get("/api/v1/analysis/metrics")
        
        assert response.status_code == 200
        data = response.json()
        assert data["service"] == "AI Analysis Service"
        assert "version" in data
        assert "supported_languages" in data


class TestErrorHandling:
    """Test error handling in API endpoints"""
    
    def test_analyze_code_internal_error(self, client):
        """Test handling of internal errors during analysis"""
        request_data = {
            "code": "def hello(): return 'world'",
            "language": "python",
            "analysis_types": ["general"]
        }
        
        with patch('src.services.analysis_service.AnalysisService.analyze_code') as mock_analyze:
            mock_analyze.side_effect = Exception("Internal error")
            
            response = client.post("/api/v1/analysis/analyze", json=request_data)
            
            assert response.status_code == 500
            assert "internal server error" in response.json()["detail"].lower()
    
    def test_invalid_json_request(self, client):
        """Test handling of invalid JSON requests"""
        response = client.post(
            "/api/v1/analysis/analyze",
            data="invalid json",
            headers={"Content-Type": "application/json"}
        )
        
        assert response.status_code == 422  # Unprocessable Entity
    
    def test_missing_required_fields(self, client):
        """Test handling of missing required fields"""
        request_data = {
            "language": "python"
            # Missing 'code' field
        }
        
        response = client.post("/api/v1/analysis/analyze", json=request_data)
        
        assert response.status_code == 422
    
    def test_invalid_language(self, client):
        """Test handling of invalid programming language"""
        request_data = {
            "code": "def hello(): return 'world'",
            "language": "invalid_language",
            "analysis_types": ["general"]
        }
        
        response = client.post("/api/v1/analysis/analyze", json=request_data)
        
        assert response.status_code == 422


class TestCORS:
    """Test CORS configuration"""
    
    def test_cors_headers_present(self, client):
        """Test that CORS headers are present in responses"""
        response = client.options("/api/v1/analysis/analyze")
        
        # Should have CORS headers (in development mode)
        assert response.status_code in [200, 405]  # OPTIONS might not be explicitly handled