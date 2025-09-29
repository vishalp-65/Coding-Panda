"""
Integration tests for interview simulation system
"""
import pytest
import asyncio
from datetime import datetime
from unittest.mock import AsyncMock, patch
from fastapi.testclient import TestClient
from fastapi import FastAPI

from src.routers.interview import router
from src.services.interview_service import InterviewService
from src.models.interview import (
    InterviewType, CompanyType, DifficultyLevel, InterviewStatus, QuestionType
)
from src.models.analysis import ProgrammingLanguage
from src.models.learning import ConceptCategory


# Create test app
app = FastAPI()
app.include_router(router, prefix="/api/v1/interview")


class TestInterviewIntegration:
    """Integration tests for complete interview workflows"""
    
    @pytest.fixture
    def client(self):
        """Create test client"""
        return TestClient(app)
    
    @pytest.fixture
    def mock_user(self):
        """Mock authenticated user"""
        return {
            "user_id": "integration_test_user",
            "username": "testuser",
            "email": "test@example.com",
            "roles": ["user"],
            "is_admin": False
        }
    
    @pytest.fixture
    async def mock_interview_service(self):
        """Create mock interview service with realistic behavior"""
        service = InterviewService()
        
        # Mock dependencies
        service.redis_client = AsyncMock()
        service.ai_client = AsyncMock()
        
        # Mock Redis operations
        service.redis_client.setex = AsyncMock()
        service.redis_client.get = AsyncMock()
        
        # Mock AI responses
        service.ai_client.generate_text.return_value = {
            "question": "Implement a function to find the two sum in an array",
            "duration": 20,
            "criteria": ["Correctness", "Efficiency", "Edge cases"]
        }
        
        service.ai_client.evaluate_response.return_value = {
            "correctness_score": 8.5,
            "approach_score": 8.0,
            "code_quality_score": 7.5,
            "communication_score": 8.0,
            "technical_depth_score": 7.5,
            "time_efficiency": 8.0,
            "overall_score": 8.0,
            "strengths": ["Correct solution", "Good approach", "Clean code"],
            "improvements": ["Add comments", "Handle edge cases"],
            "detailed_feedback": "Solid implementation with good problem-solving approach",
            "communication_feedback": "Clear explanation of the solution",
            "technical_feedback": "Good understanding of algorithms"
        }
        
        service.ai_client.generate_feedback.return_value = {
            "strengths": ["Strong problem-solving skills", "Clear communication", "Good coding practices"],
            "improvements": ["Work on optimization", "Practice more complex problems", "Improve time complexity analysis"],
            "recommendations": [
                "Practice daily coding problems on LeetCode",
                "Study algorithm design patterns",
                "Focus on dynamic programming problems",
                "Work on system design fundamentals",
                "Practice explaining solutions clearly"
            ],
            "time_management": "Good time management throughout the interview",
            "communication_style": "Clear, methodical, and well-structured communication",
            "technical_depth": "Solid technical foundation with room for advanced topics",
            "practice_areas": [ConceptCategory.ALGORITHMS, ConceptCategory.DATA_STRUCTURES],
            "resources": ["Algorithm Design Manual", "LeetCode Premium", "System Design Interview book"],
            "confidence": 0.88
        }
        
        return service
    
    @patch('src.routers.interview.get_current_user')
    @patch('src.routers.interview.get_interview_service')
    @pytest.mark.asyncio
    async def test_complete_interview_workflow(self, mock_get_service, mock_get_user, client, mock_user, mock_interview_service):
        """Test complete interview workflow from creation to feedback"""
        
        mock_get_user.return_value = mock_user
        mock_get_service.return_value = mock_interview_service
        
        # Step 1: Create interview session
        create_request = {
            "user_id": "integration_test_user",
            "interview_type": "technical_coding",
            "company_type": "big_tech",
            "difficulty_level": "medium",
            "max_questions": 2,
            "time_limit": 45
        }
        
        response = client.post("/api/v1/interview/sessions", json=create_request)
        assert response.status_code == 200
        
        session_data = response.json()
        session_id = session_data["id"]
        
        # Verify session creation
        assert session_data["user_id"] == "integration_test_user"
        assert session_data["interview_type"] == "technical_coding"
        assert session_data["status"] == "scheduled"
        assert len(session_data["questions"]) == 2
        
        # Mock session retrieval for subsequent calls
        from src.models.interview import InterviewSession, InterviewQuestion
        
        session = InterviewSession(
            id=session_id,
            user_id="integration_test_user",
            interview_type=InterviewType.TECHNICAL_CODING,
            company_type=CompanyType.BIG_TECH,
            difficulty_level=DifficultyLevel.MEDIUM,
            status=InterviewStatus.SCHEDULED,
            questions=[
                InterviewQuestion(
                    id="q1",
                    type=QuestionType.CODING_PROBLEM,
                    content="Implement a function to find two sum in an array",
                    difficulty=DifficultyLevel.MEDIUM,
                    concepts=[ConceptCategory.ALGORITHMS],
                    expected_duration=20,
                    evaluation_criteria=["Correctness", "Efficiency"]
                ),
                InterviewQuestion(
                    id="q2",
                    type=QuestionType.CODING_PROBLEM,
                    content="Find the longest palindromic substring",
                    difficulty=DifficultyLevel.MEDIUM,
                    concepts=[ConceptCategory.ALGORITHMS, ConceptCategory.DYNAMIC_PROGRAMMING],
                    expected_duration=25,
                    evaluation_criteria=["Correctness", "Optimization"]
                )
            ],
            max_questions=2,
            time_limit=45
        )
        
        mock_interview_service.redis_client.get.return_value = session.json()
        
        # Step 2: Start interview session
        start_request = {
            "session_id": session_id,
            "user_preferences": {"allow_hints": True}
        }
        
        response = client.post(f"/api/v1/interview/sessions/{session_id}/start", json=start_request)
        assert response.status_code == 200
        
        started_session_data = response.json()
        assert started_session_data["status"] == "in_progress"
        assert started_session_data["start_time"] is not None
        
        # Update session status for subsequent calls
        session.status = InterviewStatus.IN_PROGRESS
        session.start_time = datetime.utcnow()
        mock_interview_service.redis_client.get.return_value = session.json()
        
        # Step 3: Get current question
        response = client.get(f"/api/v1/interview/sessions/{session_id}/current-question")
        assert response.status_code == 200
        
        question_data = response.json()
        assert question_data["id"] == "q1"
        assert "two sum" in question_data["content"].lower()
        
        # Step 4: Submit response to first question
        submit_request = {
            "session_id": session_id,
            "question_id": "q1",
            "response_text": "I'll solve this using a hash map to achieve O(n) time complexity",
            "code_solution": """
def two_sum(nums, target):
    num_map = {}
    for i, num in enumerate(nums):
        complement = target - num
        if complement in num_map:
            return [num_map[complement], i]
        num_map[num] = i
    return []
            """,
            "language": "python",
            "confidence_level": 4
        }
        
        # Mock the response submission
        from src.models.interview import InterviewResponse
        
        response_obj = InterviewResponse(
            question_id="q1",
            response_text=submit_request["response_text"],
            code_solution=submit_request["code_solution"],
            language=ProgrammingLanguage.PYTHON,
            response_time=300,
            confidence_level=4
        )
        
        session.responses.append(response_obj)
        session.current_question_index = 1
        
        mock_interview_service.submit_response.return_value = (session, session.questions[1])
        mock_interview_service.redis_client.get.return_value = session.json()
        
        response = client.post(f"/api/v1/interview/sessions/{session_id}/responses", json=submit_request)
        assert response.status_code == 200
        
        response_data = response.json()
        assert response_data["session_completed"] is False
        assert response_data["next_question"]["id"] == "q2"
        
        # Step 5: Submit response to second question
        submit_request_2 = {
            "session_id": session_id,
            "question_id": "q2",
            "response_text": "I'll use dynamic programming with expand around centers approach",
            "code_solution": """
def longest_palindrome(s):
    if not s:
        return ""
    
    start = 0
    max_len = 1
    
    for i in range(len(s)):
        # Check for odd length palindromes
        left, right = i, i
        while left >= 0 and right < len(s) and s[left] == s[right]:
            current_len = right - left + 1
            if current_len > max_len:
                start = left
                max_len = current_len
            left -= 1
            right += 1
        
        # Check for even length palindromes
        left, right = i, i + 1
        while left >= 0 and right < len(s) and s[left] == s[right]:
            current_len = right - left + 1
            if current_len > max_len:
                start = left
                max_len = current_len
            left -= 1
            right += 1
    
    return s[start:start + max_len]
            """,
            "language": "python",
            "confidence_level": 3
        }
        
        # Mock completion of interview
        response_obj_2 = InterviewResponse(
            question_id="q2",
            response_text=submit_request_2["response_text"],
            code_solution=submit_request_2["code_solution"],
            language=ProgrammingLanguage.PYTHON,
            response_time=450,
            confidence_level=3
        )
        
        session.responses.append(response_obj_2)
        session.current_question_index = 2
        session.status = InterviewStatus.COMPLETED
        session.end_time = datetime.utcnow()
        session.total_duration = 35
        
        mock_interview_service.submit_response.return_value = (session, None)
        mock_interview_service.redis_client.get.return_value = session.json()
        
        response = client.post(f"/api/v1/interview/sessions/{session_id}/responses", json=submit_request_2)
        assert response.status_code == 200
        
        response_data = response.json()
        assert response_data["session_completed"] is True
        assert response_data["next_question"] is None
        
        # Step 6: Complete interview session
        complete_request = {
            "session_id": session_id,
            "early_completion": False
        }
        
        response = client.post(f"/api/v1/interview/sessions/{session_id}/complete", json=complete_request)
        assert response.status_code == 200
        
        complete_data = response.json()
        assert "completed successfully" in complete_data["message"]
        assert complete_data["feedback_generation"] == "in_progress"
        
        # Step 7: Get interview feedback
        from src.models.interview import InterviewFeedback, QuestionEvaluation, CommunicationScore, CommunicationAspect
        
        # Mock feedback generation
        feedback = InterviewFeedback(
            session_id=session_id,
            user_id="integration_test_user",
            overall_score=8.2,
            technical_score=8.0,
            communication_score=8.5,
            problem_solving_score=8.3,
            question_evaluations=[
                QuestionEvaluation(
                    question_id="q1",
                    correctness_score=9.0,
                    approach_score=8.5,
                    code_quality_score=8.0,
                    communication_scores=[
                        CommunicationScore(
                            aspect=CommunicationAspect.CLARITY,
                            score=8.5,
                            feedback="Clear explanation of hash map approach"
                        )
                    ],
                    time_efficiency=8.0,
                    overall_score=8.5,
                    strengths=["Optimal solution", "Good explanation"],
                    areas_for_improvement=["Add more comments"],
                    detailed_feedback="Excellent solution with optimal time complexity"
                ),
                QuestionEvaluation(
                    question_id="q2",
                    correctness_score=8.0,
                    approach_score=8.0,
                    code_quality_score=7.5,
                    communication_scores=[
                        CommunicationScore(
                            aspect=CommunicationAspect.TECHNICAL_DEPTH,
                            score=8.0,
                            feedback="Good understanding of palindrome algorithms"
                        )
                    ],
                    time_efficiency=7.5,
                    overall_score=7.8,
                    strengths=["Correct approach", "Handles edge cases"],
                    areas_for_improvement=["Could optimize further"],
                    detailed_feedback="Good solution with room for optimization"
                )
            ],
            key_strengths=["Strong algorithmic thinking", "Clear communication", "Good problem-solving approach"],
            areas_for_improvement=["Code optimization", "Time complexity analysis"],
            specific_recommendations=[
                "Practice more dynamic programming problems",
                "Study advanced algorithm optimization techniques",
                "Work on explaining time/space complexity"
            ],
            time_management="Excellent time management",
            communication_style="Clear and methodical",
            technical_depth="Strong technical foundation",
            ai_confidence=0.88
        )
        
        mock_interview_service.redis_client.get.return_value = feedback.json()
        
        response = client.get(f"/api/v1/interview/sessions/{session_id}/feedback")
        assert response.status_code == 200
        
        feedback_data = response.json()
        assert feedback_data["session_id"] == session_id
        assert feedback_data["overall_score"] == 8.2
        assert len(feedback_data["question_evaluations"]) == 2
        assert len(feedback_data["key_strengths"]) == 3
        assert len(feedback_data["specific_recommendations"]) == 3
        assert feedback_data["ai_confidence"] == 0.88
        
        # Step 8: Get user analytics
        from src.models.interview import InterviewAnalytics
        
        analytics = InterviewAnalytics(
            user_id="integration_test_user",
            total_interviews=1,
            average_score=8.2,
            score_trend=[8.2],
            technical_scores=[8.0],
            communication_scores=[8.5],
            problem_solving_scores=[8.3],
            concept_performance={
                ConceptCategory.ALGORITHMS: 8.2,
                ConceptCategory.DATA_STRUCTURES: 8.0
            },
            improvement_rate=0.0,  # First interview
            consistency_score=1.0,  # Only one interview
            focus_areas=[ConceptCategory.DYNAMIC_PROGRAMMING],
            next_steps=["Continue practicing algorithms", "Focus on optimization"]
        )
        
        mock_interview_service.get_user_analytics.return_value = analytics
        
        response = client.get("/api/v1/interview/users/integration_test_user/analytics")
        assert response.status_code == 200
        
        analytics_data = response.json()
        assert analytics_data["user_id"] == "integration_test_user"
        assert analytics_data["total_interviews"] == 1
        assert analytics_data["average_score"] == 8.2
        assert len(analytics_data["technical_scores"]) == 1
        
        print("✅ Complete interview workflow test passed!")
    
    @patch('src.routers.interview.get_current_user')
    @patch('src.routers.interview.get_interview_service')
    def test_follow_up_question_workflow(self, mock_get_service, mock_get_user, client, mock_user, mock_interview_service):
        """Test follow-up question generation workflow"""
        
        mock_get_user.return_value = mock_user
        mock_get_service.return_value = mock_interview_service
        
        # Mock session
        from src.models.interview import InterviewSession, InterviewQuestion, InterviewResponse
        
        session = InterviewSession(
            id="follow_up_session",
            user_id="integration_test_user",
            interview_type=InterviewType.TECHNICAL_CODING,
            difficulty_level=DifficultyLevel.MEDIUM,
            status=InterviewStatus.IN_PROGRESS,
            questions=[
                InterviewQuestion(
                    id="original_q",
                    type=QuestionType.CODING_PROBLEM,
                    content="Implement binary search",
                    difficulty=DifficultyLevel.MEDIUM,
                    concepts=[ConceptCategory.ALGORITHMS],
                    expected_duration=15,
                    evaluation_criteria=["Correctness", "Efficiency"]
                )
            ]
        )
        
        mock_interview_service.redis_client.get.return_value = session.json()
        
        # Mock follow-up question generation
        from src.models.interview import InterviewQuestion
        
        follow_up = InterviewQuestion(
            id="follow_up_q",
            type=QuestionType.FOLLOW_UP,
            content="What would be the time complexity if the array was not sorted?",
            difficulty=DifficultyLevel.MEDIUM,
            concepts=[ConceptCategory.ALGORITHMS],
            expected_duration=5,
            evaluation_criteria=["Understanding of complexity"]
        )
        
        mock_interview_service.generate_follow_up_question.return_value = follow_up
        
        # Generate follow-up question
        follow_up_request = {
            "session_id": "follow_up_session",
            "previous_response": {
                "question_id": "original_q",
                "response_text": "I implemented binary search using divide and conquer",
                "code_solution": "def binary_search(arr, target): ...",
                "language": "python",
                "response_time": 300,
                "timestamp": datetime.utcnow().isoformat()
            },
            "context": "User provided correct solution"
        }
        
        response = client.post("/api/v1/interview/sessions/follow_up_session/follow-up", json=follow_up_request)
        assert response.status_code == 200
        
        follow_up_data = response.json()
        assert follow_up_data["type"] == "follow_up"
        assert "time complexity" in follow_up_data["content"].lower()
        assert follow_up_data["expected_duration"] == 5
        
        print("✅ Follow-up question workflow test passed!")
    
    @patch('src.routers.interview.get_current_user')
    @patch('src.routers.interview.get_interview_service')
    def test_company_specific_interview_patterns(self, mock_get_service, mock_get_user, client, mock_user, mock_interview_service):
        """Test company-specific interview pattern retrieval"""
        
        mock_get_user.return_value = mock_user
        mock_get_service.return_value = mock_interview_service
        
        # Mock company patterns
        mock_interview_service.company_patterns = {
            CompanyType.BIG_TECH: type('Pattern', (), {
                'typical_duration': 60,
                'question_distribution': {
                    QuestionType.CODING_PROBLEM: 0.6,
                    QuestionType.SYSTEM_DESIGN: 0.2,
                    QuestionType.BEHAVIORAL: 0.2
                },
                'common_concepts': [ConceptCategory.ALGORITHMS, ConceptCategory.SYSTEM_DESIGN],
                'difficulty_preference': DifficultyLevel.MEDIUM,
                'evaluation_criteria': ['Problem-solving', 'Communication', 'Technical depth']
            })(),
            CompanyType.STARTUP: type('Pattern', (), {
                'typical_duration': 45,
                'question_distribution': {
                    QuestionType.CODING_PROBLEM: 0.5,
                    QuestionType.TECHNICAL_CONCEPT: 0.3,
                    QuestionType.BEHAVIORAL: 0.2
                },
                'common_concepts': [ConceptCategory.ALGORITHMS, ConceptCategory.OBJECT_ORIENTED],
                'difficulty_preference': DifficultyLevel.MEDIUM,
                'evaluation_criteria': ['Adaptability', 'Practical skills', 'Cultural fit']
            })()
        }
        
        response = client.get("/api/v1/interview/company-patterns")
        assert response.status_code == 200
        
        patterns_data = response.json()
        assert "big_tech" in patterns_data
        assert "startup" in patterns_data
        
        big_tech_pattern = patterns_data["big_tech"]
        assert big_tech_pattern["typical_duration"] == 60
        assert "coding_problem" in big_tech_pattern["question_distribution"]
        assert big_tech_pattern["question_distribution"]["coding_problem"] == 0.6
        
        startup_pattern = patterns_data["startup"]
        assert startup_pattern["typical_duration"] == 45
        assert len(startup_pattern["evaluation_criteria"]) == 3
        
        print("✅ Company-specific patterns test passed!")
    
    def test_error_handling_and_validation(self, client):
        """Test error handling and request validation"""
        
        # Test creating session without authentication
        create_request = {
            "user_id": "test_user",
            "interview_type": "technical_coding",
            "difficulty_level": "medium"
        }
        
        response = client.post("/api/v1/interview/sessions", json=create_request)
        assert response.status_code == 403  # No authentication
        
        # Test invalid request data
        with patch('src.routers.interview.get_current_user') as mock_auth:
            mock_auth.return_value = {"user_id": "test_user", "is_admin": False}
            
            invalid_request = {
                "user_id": "test_user",
                "interview_type": "invalid_type",  # Invalid enum
                "difficulty_level": "medium"
            }
            
            response = client.post("/api/v1/interview/sessions", json=invalid_request)
            assert response.status_code == 422  # Validation error
        
        print("✅ Error handling and validation test passed!")


class TestInterviewServiceIntegration:
    """Integration tests for interview service components"""
    
    @pytest.mark.asyncio
    async def test_service_initialization(self):
        """Test interview service initialization"""
        service = InterviewService()
        
        # Mock dependencies
        service.redis_client = AsyncMock()
        service.ai_client = AsyncMock()
        
        await service.initialize()
        
        assert service.redis_client is not None
        assert service.ai_client is not None
        assert len(service.company_patterns) > 0
        assert CompanyType.BIG_TECH in service.company_patterns
    
    @pytest.mark.asyncio
    async def test_question_generation_with_fallback(self):
        """Test question generation with AI fallback"""
        service = InterviewService()
        service.redis_client = AsyncMock()
        service.ai_client = AsyncMock()
        
        # Test successful AI generation
        service.ai_client.generate_text.return_value = {
            "question": "Implement a LRU cache",
            "duration": 30,
            "criteria": ["Correctness", "Design", "Optimization"]
        }
        
        question = await service._generate_single_question(
            question_type=QuestionType.CODING_PROBLEM,
            difficulty=DifficultyLevel.HARD,
            concepts=[ConceptCategory.DATA_STRUCTURES],
            company_type=CompanyType.BIG_TECH
        )
        
        assert question.content == "Implement a LRU cache"
        assert question.expected_duration == 30
        
        # Test AI failure fallback
        service.ai_client.generate_text.side_effect = Exception("AI service down")
        
        fallback_question = await service._generate_single_question(
            question_type=QuestionType.CODING_PROBLEM,
            difficulty=DifficultyLevel.EASY,
            concepts=[ConceptCategory.ALGORITHMS],
            company_type=CompanyType.GENERIC
        )
        
        assert fallback_question.type == QuestionType.CODING_PROBLEM
        assert fallback_question.difficulty == DifficultyLevel.EASY
        assert "reverse a string" in fallback_question.content.lower()
    
    @pytest.mark.asyncio
    async def test_analytics_update_flow(self):
        """Test analytics update flow"""
        service = InterviewService()
        service.redis_client = AsyncMock()
        
        # Mock existing analytics
        from src.models.interview import InterviewAnalytics, InterviewFeedback
        
        existing_analytics = InterviewAnalytics(
            user_id="test_user",
            total_interviews=2,
            technical_scores=[7.5, 8.0],
            communication_scores=[8.0, 8.2],
            problem_solving_scores=[7.8, 8.1]
        )
        
        service.redis_client.get.return_value = existing_analytics.json()
        
        # Create new feedback
        new_feedback = InterviewFeedback(
            session_id="session_123",
            user_id="test_user",
            overall_score=8.5,
            technical_score=8.3,
            communication_score=8.7,
            problem_solving_score=8.4,
            ai_confidence=0.9
        )
        
        # Update analytics
        await service._update_user_analytics("test_user", new_feedback)
        
        # Verify Redis update was called
        service.redis_client.setex.assert_called()
        
        # Verify the call was made with updated analytics
        call_args = service.redis_client.setex.call_args
        analytics_key = call_args[0][0]
        assert analytics_key == "interview_analytics:test_user"


if __name__ == "__main__":
    pytest.main([__file__, "-v"])