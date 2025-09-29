"""
Tests for interview simulation API endpoints
"""
import pytest
import json
from datetime import datetime
from unittest.mock import AsyncMock, patch
from fastapi.testclient import TestClient
from fastapi import FastAPI

from src.routers.interview import router
from src.models.interview import (
    InterviewSession, InterviewQuestion, InterviewResponse, InterviewFeedback,
    InterviewAnalytics, InterviewType, InterviewStatus, QuestionType,
    CompanyType, DifficultyLevel
)
from src.models.analysis import ProgrammingLanguage
from src.models.learning import ConceptCategory


# Create test app
app = FastAPI()
app.include_router(router, prefix="/api/v1/interview")


class TestInterviewRouter:
    """Test cases for interview API endpoints"""
    
    @pytest.fixture
    def client(self):
        """Create test client"""
        return TestClient(app)
    
    @pytest.fixture
    def mock_current_user(self):
        """Mock current user for authentication"""
        return {
            "user_id": "test_user_123",
            "username": "testuser",
            "email": "test@example.com",
            "roles": ["user"],
            "is_admin": False
        }
    
    @pytest.fixture
    def mock_admin_user(self):
        """Mock admin user for authentication"""
        return {
            "user_id": "admin_user_123",
            "username": "admin",
            "email": "admin@example.com",
            "roles": ["admin"],
            "is_admin": True
        }
    
    @pytest.fixture
    def sample_interview_session(self):
        """Create sample interview session"""
        return InterviewSession(
            id="test_session_123",
            user_id="test_user_123",
            interview_type=InterviewType.TECHNICAL_CODING,
            company_type=CompanyType.BIG_TECH,
            difficulty_level=DifficultyLevel.MEDIUM,
            status=InterviewStatus.SCHEDULED,
            questions=[
                InterviewQuestion(
                    id="q1",
                    type=QuestionType.CODING_PROBLEM,
                    content="Implement a function to reverse a string",
                    difficulty=DifficultyLevel.EASY,
                    concepts=[ConceptCategory.ALGORITHMS],
                    expected_duration=15,
                    evaluation_criteria=["Correctness", "Efficiency"]
                )
            ],
            max_questions=5
        )
    
    @pytest.fixture
    def sample_interview_feedback(self):
        """Create sample interview feedback"""
        return InterviewFeedback(
            session_id="test_session_123",
            user_id="test_user_123",
            overall_score=8.5,
            technical_score=8.0,
            communication_score=8.5,
            problem_solving_score=9.0,
            key_strengths=["Strong problem-solving", "Clear communication"],
            areas_for_improvement=["Code optimization", "Edge case handling"],
            specific_recommendations=["Practice more algorithms", "Study complexity analysis"],
            time_management="Excellent time management",
            communication_style="Clear and methodical",
            technical_depth="Good understanding of algorithms",
            ai_confidence=0.9
        )
    
    @patch('src.routers.interview.get_current_user')
    @patch('src.routers.interview.get_interview_service')
    def test_create_interview_session(self, mock_get_service, mock_get_user, client, mock_current_user, sample_interview_session):
        """Test creating a new interview session"""
        mock_get_user.return_value = mock_current_user
        
        mock_service = AsyncMock()
        mock_service.create_interview_session.return_value = sample_interview_session
        mock_get_service.return_value = mock_service
        
        request_data = {
            "user_id": "test_user_123",
            "interview_type": "technical_coding",
            "company_type": "big_tech",
            "difficulty_level": "medium",
            "max_questions": 5
        }
        
        response = client.post("/api/v1/interview/sessions", json=request_data)
        
        assert response.status_code == 200
        data = response.json()
        assert data["id"] == "test_session_123"
        assert data["user_id"] == "test_user_123"
        assert data["interview_type"] == "technical_coding"
        assert data["company_type"] == "big_tech"
        
        mock_service.create_interview_session.assert_called_once()
    
    @patch('src.routers.interview.get_current_user')
    @patch('src.routers.interview.get_interview_service')
    def test_create_interview_session_unauthorized(self, mock_get_service, mock_get_user, client, mock_current_user):
        """Test creating session for different user without admin rights"""
        mock_get_user.return_value = mock_current_user
        
        request_data = {
            "user_id": "different_user_456",  # Different user
            "interview_type": "technical_coding",
            "company_type": "big_tech",
            "difficulty_level": "medium"
        }
        
        response = client.post("/api/v1/interview/sessions", json=request_data)
        
        assert response.status_code == 403
        assert "Not authorized" in response.json()["detail"]
    
    @patch('src.routers.interview.get_current_user')
    @patch('src.routers.interview.get_interview_service')
    def test_start_interview_session(self, mock_get_service, mock_get_user, client, mock_current_user, sample_interview_session):
        """Test starting an interview session"""
        mock_get_user.return_value = mock_current_user
        
        mock_service = AsyncMock()
        mock_service._get_session.return_value = sample_interview_session
        
        started_session = sample_interview_session.copy()
        started_session.status = InterviewStatus.IN_PROGRESS
        started_session.start_time = datetime.utcnow()
        
        mock_service.start_interview_session.return_value = started_session
        mock_get_service.return_value = mock_service
        
        request_data = {
            "session_id": "test_session_123",
            "user_preferences": {"allow_hints": True}
        }
        
        response = client.post("/api/v1/interview/sessions/test_session_123/start", json=request_data)
        
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "in_progress"
        assert data["start_time"] is not None
        
        mock_service.start_interview_session.assert_called_once()
    
    @patch('src.routers.interview.get_current_user')
    @patch('src.routers.interview.get_interview_service')
    def test_get_interview_session(self, mock_get_service, mock_get_user, client, mock_current_user, sample_interview_session):
        """Test getting interview session details"""
        mock_get_user.return_value = mock_current_user
        
        mock_service = AsyncMock()
        mock_service._get_session.return_value = sample_interview_session
        mock_get_service.return_value = mock_service
        
        response = client.get("/api/v1/interview/sessions/test_session_123")
        
        assert response.status_code == 200
        data = response.json()
        assert data["id"] == "test_session_123"
        assert data["user_id"] == "test_user_123"
    
    @patch('src.routers.interview.get_current_user')
    @patch('src.routers.interview.get_interview_service')
    def test_get_interview_session_not_found(self, mock_get_service, mock_get_user, client, mock_current_user):
        """Test getting non-existent interview session"""
        mock_get_user.return_value = mock_current_user
        
        mock_service = AsyncMock()
        mock_service._get_session.return_value = None
        mock_get_service.return_value = mock_service
        
        response = client.get("/api/v1/interview/sessions/nonexistent")
        
        assert response.status_code == 404
        assert "not found" in response.json()["detail"]
    
    @patch('src.routers.interview.get_current_user')
    @patch('src.routers.interview.get_interview_service')
    def test_get_current_question(self, mock_get_service, mock_get_user, client, mock_current_user, sample_interview_session):
        """Test getting current question"""
        mock_get_user.return_value = mock_current_user
        
        mock_service = AsyncMock()
        mock_service._get_session.return_value = sample_interview_session
        mock_service.get_current_question.return_value = sample_interview_session.questions[0]
        mock_get_service.return_value = mock_service
        
        response = client.get("/api/v1/interview/sessions/test_session_123/current-question")
        
        assert response.status_code == 200
        data = response.json()
        assert data["id"] == "q1"
        assert data["type"] == "coding_problem"
        assert "reverse a string" in data["content"]
    
    @patch('src.routers.interview.get_current_user')
    @patch('src.routers.interview.get_interview_service')
    def test_submit_response(self, mock_get_service, mock_get_user, client, mock_current_user, sample_interview_session):
        """Test submitting a response"""
        mock_get_user.return_value = mock_current_user
        
        mock_service = AsyncMock()
        mock_service._get_session.return_value = sample_interview_session
        
        # Mock response submission
        updated_session = sample_interview_session.copy()
        updated_session.status = InterviewStatus.COMPLETED
        updated_session.current_question_index = 1
        
        mock_service.submit_response.return_value = (updated_session, None)
        mock_get_service.return_value = mock_service
        
        request_data = {
            "session_id": "test_session_123",
            "question_id": "q1",
            "response_text": "I'll use string slicing",
            "code_solution": "def reverse_string(s): return s[::-1]",
            "language": "python",
            "confidence_level": 4
        }
        
        response = client.post("/api/v1/interview/sessions/test_session_123/responses", json=request_data)
        
        assert response.status_code == 200
        data = response.json()
        assert data["session_completed"] is True
        assert data["next_question"] is None
        
        mock_service.submit_response.assert_called_once()
    
    @patch('src.routers.interview.get_current_user')
    @patch('src.routers.interview.get_interview_service')
    def test_generate_follow_up_question(self, mock_get_service, mock_get_user, client, mock_current_user, sample_interview_session):
        """Test generating follow-up question"""
        mock_get_user.return_value = mock_current_user
        
        mock_service = AsyncMock()
        mock_service._get_session.return_value = sample_interview_session
        
        follow_up_question = InterviewQuestion(
            id="follow_up_1",
            type=QuestionType.FOLLOW_UP,
            content="Can you optimize this solution?",
            difficulty=DifficultyLevel.MEDIUM,
            concepts=[ConceptCategory.ALGORITHMS],
            expected_duration=5,
            evaluation_criteria=["Optimization thinking"]
        )
        
        mock_service.generate_follow_up_question.return_value = follow_up_question
        mock_get_service.return_value = mock_service
        
        request_data = {
            "session_id": "test_session_123",
            "previous_response": {
                "question_id": "q1",
                "response_text": "I used string slicing",
                "code_solution": "def reverse_string(s): return s[::-1]",
                "language": "python",
                "response_time": 300,
                "timestamp": datetime.utcnow().isoformat()
            },
            "context": "User provided basic solution"
        }
        
        response = client.post("/api/v1/interview/sessions/test_session_123/follow-up", json=request_data)
        
        assert response.status_code == 200
        data = response.json()
        assert data["type"] == "follow_up"
        assert "optimize" in data["content"].lower()
    
    @patch('src.routers.interview.get_current_user')
    @patch('src.routers.interview.get_interview_service')
    def test_complete_interview_session(self, mock_get_service, mock_get_user, client, mock_current_user, sample_interview_session):
        """Test completing interview session"""
        mock_get_user.return_value = mock_current_user
        
        mock_service = AsyncMock()
        mock_service._get_session.return_value = sample_interview_session
        mock_service._store_session = AsyncMock()
        mock_get_service.return_value = mock_service
        
        request_data = {
            "session_id": "test_session_123",
            "early_completion": False
        }
        
        response = client.post("/api/v1/interview/sessions/test_session_123/complete", json=request_data)
        
        assert response.status_code == 200
        data = response.json()
        assert "completed successfully" in data["message"]
        assert data["session_id"] == "test_session_123"
        assert data["feedback_generation"] == "in_progress"
    
    @patch('src.routers.interview.get_current_user')
    @patch('src.routers.interview.get_interview_service')
    def test_get_interview_feedback(self, mock_get_service, mock_get_user, client, mock_current_user, sample_interview_session, sample_interview_feedback):
        """Test getting interview feedback"""
        mock_get_user.return_value = mock_current_user
        
        mock_service = AsyncMock()
        mock_service._get_session.return_value = sample_interview_session
        mock_service.redis_client = AsyncMock()
        mock_service.redis_client.get.return_value = sample_interview_feedback.json()
        mock_get_service.return_value = mock_service
        
        response = client.get("/api/v1/interview/sessions/test_session_123/feedback")
        
        assert response.status_code == 200
        data = response.json()
        assert data["session_id"] == "test_session_123"
        assert data["overall_score"] == 8.5
        assert len(data["key_strengths"]) == 2
    
    @patch('src.routers.interview.get_current_user')
    @patch('src.routers.interview.get_interview_service')
    def test_get_user_analytics(self, mock_get_service, mock_get_user, client, mock_current_user):
        """Test getting user interview analytics"""
        mock_get_user.return_value = mock_current_user
        
        mock_service = AsyncMock()
        analytics = InterviewAnalytics(
            user_id="test_user_123",
            total_interviews=5,
            average_score=7.8,
            technical_scores=[7.5, 8.0, 8.2, 7.8, 8.1],
            communication_scores=[8.0, 7.5, 8.5, 8.0, 8.2],
            problem_solving_scores=[7.8, 8.2, 8.0, 7.9, 8.3]
        )
        mock_service.get_user_analytics.return_value = analytics
        mock_get_service.return_value = mock_service
        
        response = client.get("/api/v1/interview/users/test_user_123/analytics")
        
        assert response.status_code == 200
        data = response.json()
        assert data["user_id"] == "test_user_123"
        assert data["total_interviews"] == 5
        assert data["average_score"] == 7.8
    
    @patch('src.routers.interview.get_current_user')
    @patch('src.routers.interview.get_interview_service')
    def test_get_user_analytics_unauthorized(self, mock_get_service, mock_get_user, client, mock_current_user):
        """Test getting analytics for different user without admin rights"""
        mock_get_user.return_value = mock_current_user
        
        response = client.get("/api/v1/interview/users/different_user_456/analytics")
        
        assert response.status_code == 403
        assert "Not authorized" in response.json()["detail"]
    
    @patch('src.routers.interview.get_current_user')
    @patch('src.routers.interview.get_interview_service')
    def test_get_company_patterns(self, mock_get_service, mock_get_user, client, mock_current_user):
        """Test getting company interview patterns"""
        mock_get_user.return_value = mock_current_user
        
        mock_service = AsyncMock()
        mock_service.company_patterns = {
            CompanyType.BIG_TECH: type('Pattern', (), {
                'typical_duration': 60,
                'question_distribution': {QuestionType.CODING_PROBLEM: 0.6},
                'common_concepts': [ConceptCategory.ALGORITHMS],
                'difficulty_preference': DifficultyLevel.MEDIUM,
                'evaluation_criteria': ['Problem-solving', 'Communication']
            })()
        }
        mock_get_service.return_value = mock_service
        
        response = client.get("/api/v1/interview/company-patterns")
        
        assert response.status_code == 200
        data = response.json()
        assert "big_tech" in data
        assert data["big_tech"]["typical_duration"] == 60
    
    def test_health_check(self, client):
        """Test health check endpoint"""
        response = client.get("/api/v1/interview/health")
        
        assert response.status_code == 200
        data = response.json()
        assert data["service"] == "Interview Simulation Service"
        assert data["status"] == "healthy"
        assert "timestamp" in data
    
    @patch('src.routers.interview.get_current_user')
    @patch('src.routers.interview.get_interview_service')
    def test_session_ownership_validation(self, mock_get_service, mock_get_user, client, mock_current_user, sample_interview_session):
        """Test that users can only access their own sessions"""
        mock_get_user.return_value = mock_current_user
        
        # Create session owned by different user
        different_user_session = sample_interview_session.copy()
        different_user_session.user_id = "different_user_456"
        
        mock_service = AsyncMock()
        mock_service._get_session.return_value = different_user_session
        mock_get_service.return_value = mock_service
        
        response = client.get("/api/v1/interview/sessions/test_session_123")
        
        assert response.status_code == 403
        assert "Not authorized" in response.json()["detail"]
    
    @patch('src.routers.interview.get_current_user')
    @patch('src.routers.interview.get_interview_service')
    def test_admin_can_access_any_session(self, mock_get_service, mock_get_user, client, mock_admin_user, sample_interview_session):
        """Test that admin users can access any session"""
        mock_get_user.return_value = mock_admin_user
        
        mock_service = AsyncMock()
        mock_service._get_session.return_value = sample_interview_session
        mock_get_service.return_value = mock_service
        
        response = client.get("/api/v1/interview/sessions/test_session_123")
        
        assert response.status_code == 200
        data = response.json()
        assert data["id"] == "test_session_123"
    
    @patch('src.routers.interview.get_current_user')
    @patch('src.routers.interview.get_interview_service')
    def test_error_handling_service_failure(self, mock_get_service, mock_get_user, client, mock_current_user):
        """Test error handling when service fails"""
        mock_get_user.return_value = mock_current_user
        
        mock_service = AsyncMock()
        mock_service.create_interview_session.side_effect = Exception("Service unavailable")
        mock_get_service.return_value = mock_service
        
        request_data = {
            "user_id": "test_user_123",
            "interview_type": "technical_coding",
            "company_type": "big_tech",
            "difficulty_level": "medium"
        }
        
        response = client.post("/api/v1/interview/sessions", json=request_data)
        
        assert response.status_code == 500
        assert "Internal server error" in response.json()["detail"]


class TestInterviewRouterValidation:
    """Test request validation for interview endpoints"""
    
    @pytest.fixture
    def client(self):
        """Create test client"""
        return TestClient(app)
    
    @patch('src.routers.interview.get_current_user')
    def test_create_session_invalid_data(self, mock_get_user, client):
        """Test creating session with invalid data"""
        mock_get_user.return_value = {"user_id": "test_user", "is_admin": False}
        
        # Missing required fields
        request_data = {
            "user_id": "test_user_123"
            # Missing interview_type, difficulty_level
        }
        
        response = client.post("/api/v1/interview/sessions", json=request_data)
        
        assert response.status_code == 422  # Validation error
    
    @patch('src.routers.interview.get_current_user')
    def test_create_session_invalid_enum_values(self, mock_get_user, client):
        """Test creating session with invalid enum values"""
        mock_get_user.return_value = {"user_id": "test_user", "is_admin": False}
        
        request_data = {
            "user_id": "test_user_123",
            "interview_type": "invalid_type",  # Invalid enum
            "company_type": "invalid_company",  # Invalid enum
            "difficulty_level": "invalid_difficulty"  # Invalid enum
        }
        
        response = client.post("/api/v1/interview/sessions", json=request_data)
        
        assert response.status_code == 422  # Validation error


if __name__ == "__main__":
    pytest.main([__file__])