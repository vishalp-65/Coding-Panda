"""
Tests for interview simulation service
"""
import pytest
import asyncio
from datetime import datetime, timedelta
from unittest.mock import AsyncMock, MagicMock, patch
from uuid import uuid4

from src.services.interview_service import InterviewService, get_interview_service
from src.models.interview import (
    InterviewSession, InterviewQuestion, InterviewResponse, InterviewFeedback,
    InterviewType, InterviewStatus, QuestionType, CompanyType, DifficultyLevel
)
from src.models.analysis import ProgrammingLanguage
from src.models.learning import ConceptCategory


class TestInterviewService:
    """Test cases for InterviewService"""
    
    @pytest.fixture
    def interview_service(self):
        """Create interview service instance for testing"""
        service = InterviewService()
        
        # Mock dependencies
        service.redis_client = AsyncMock()
        service.ai_client = AsyncMock()
        
        # Mock Redis operations
        service.redis_client.setex = AsyncMock()
        service.redis_client.get = AsyncMock()
        
        # Mock AI client operations
        service.ai_client.generate_text = AsyncMock()
        service.ai_client.evaluate_response = AsyncMock()
        service.ai_client.generate_feedback = AsyncMock()
        
        return service
    
    @pytest.fixture
    def sample_interview_session(self):
        """Create sample interview session"""
        return InterviewSession(
            id="test_session_123",
            user_id="test_user_456",
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
    def sample_interview_response(self):
        """Create sample interview response"""
        return InterviewResponse(
            question_id="q1",
            response_text="I'll implement this using a simple loop approach",
            code_solution="def reverse_string(s): return s[::-1]",
            language=ProgrammingLanguage.PYTHON,
            response_time=300,
            confidence_level=4
        )
    
    @pytest.mark.asyncio
    async def test_create_interview_session(self, interview_service):
        """Test creating a new interview session"""
        # Mock AI question generation
        interview_service.ai_client.generate_text.return_value = {
            "question": "Test question content",
            "duration": 15,
            "criteria": ["Correctness", "Approach"]
        }
        
        session = await interview_service.create_interview_session(
            user_id="test_user",
            interview_type=InterviewType.TECHNICAL_CODING,
            company_type=CompanyType.BIG_TECH,
            difficulty_level=DifficultyLevel.MEDIUM,
            max_questions=3
        )
        
        assert session.user_id == "test_user"
        assert session.interview_type == InterviewType.TECHNICAL_CODING
        assert session.company_type == CompanyType.BIG_TECH
        assert session.difficulty_level == DifficultyLevel.MEDIUM
        assert session.status == InterviewStatus.SCHEDULED
        assert len(session.questions) == 3
        assert session.max_questions == 3
        
        # Verify Redis storage was called
        interview_service.redis_client.setex.assert_called_once()
    
    @pytest.mark.asyncio
    async def test_start_interview_session(self, interview_service, sample_interview_session):
        """Test starting an interview session"""
        # Mock Redis get to return the session
        interview_service.redis_client.get.return_value = sample_interview_session.json()
        
        started_session = await interview_service.start_interview_session(
            session_id="test_session_123",
            user_preferences={"allow_hints": True}
        )
        
        assert started_session.status == InterviewStatus.IN_PROGRESS
        assert started_session.start_time is not None
        assert started_session.allow_hints is True
        
        # Verify Redis update was called
        interview_service.redis_client.setex.assert_called()
    
    @pytest.mark.asyncio
    async def test_start_invalid_session(self, interview_service):
        """Test starting a non-existent session"""
        # Mock Redis get to return None
        interview_service.redis_client.get.return_value = None
        
        with pytest.raises(ValueError, match="Interview session .* not found"):
            await interview_service.start_interview_session("invalid_session")
    
    @pytest.mark.asyncio
    async def test_get_current_question(self, interview_service, sample_interview_session):
        """Test getting current question"""
        # Mock Redis get to return the session
        interview_service.redis_client.get.return_value = sample_interview_session.json()
        
        question = await interview_service.get_current_question("test_session_123")
        
        assert question is not None
        assert question.id == "q1"
        assert question.type == QuestionType.CODING_PROBLEM
        assert question.content == "Implement a function to reverse a string"
    
    @pytest.mark.asyncio
    async def test_get_current_question_completed_session(self, interview_service, sample_interview_session):
        """Test getting current question when all questions are completed"""
        # Set current question index beyond available questions
        sample_interview_session.current_question_index = 1
        interview_service.redis_client.get.return_value = sample_interview_session.json()
        
        question = await interview_service.get_current_question("test_session_123")
        
        assert question is None
    
    @pytest.mark.asyncio
    async def test_submit_response(self, interview_service, sample_interview_session):
        """Test submitting a response to a question"""
        # Set session to in progress
        sample_interview_session.status = InterviewStatus.IN_PROGRESS
        interview_service.redis_client.get.return_value = sample_interview_session.json()
        
        updated_session, next_question = await interview_service.submit_response(
            session_id="test_session_123",
            question_id="q1",
            response_text="My solution approach",
            code_solution="def reverse_string(s): return s[::-1]",
            language=ProgrammingLanguage.PYTHON,
            confidence_level=4,
            response_time=300
        )
        
        assert len(updated_session.responses) == 1
        assert updated_session.current_question_index == 1
        assert updated_session.responses[0].question_id == "q1"
        assert updated_session.responses[0].code_solution == "def reverse_string(s): return s[::-1]"
        assert updated_session.responses[0].language == ProgrammingLanguage.PYTHON
        
        # Since we only have 1 question, session should be completed
        assert updated_session.status == InterviewStatus.COMPLETED
        assert updated_session.end_time is not None
        assert next_question is None
    
    @pytest.mark.asyncio
    async def test_submit_response_invalid_question(self, interview_service, sample_interview_session):
        """Test submitting response with invalid question ID"""
        sample_interview_session.status = InterviewStatus.IN_PROGRESS
        interview_service.redis_client.get.return_value = sample_interview_session.json()
        
        with pytest.raises(ValueError, match="Invalid question ID"):
            await interview_service.submit_response(
                session_id="test_session_123",
                question_id="invalid_question",
                response_text="My response"
            )
    
    @pytest.mark.asyncio
    async def test_generate_follow_up_question(self, interview_service, sample_interview_session, sample_interview_response):
        """Test generating a follow-up question"""
        interview_service.redis_client.get.return_value = sample_interview_session.json()
        interview_service.ai_client.generate_text.return_value = {
            "follow_up_question": "Can you optimize this solution for better time complexity?"
        }
        
        follow_up = await interview_service.generate_follow_up_question(
            session_id="test_session_123",
            previous_response=sample_interview_response,
            context="User provided a basic solution"
        )
        
        assert follow_up.type == QuestionType.FOLLOW_UP
        assert "optimize" in follow_up.content.lower()
        assert follow_up.expected_duration == 5  # Follow-ups are shorter
        
        # Verify AI was called
        interview_service.ai_client.generate_text.assert_called_once()
    
    @pytest.mark.asyncio
    async def test_evaluate_interview_performance(self, interview_service, sample_interview_session):
        """Test evaluating completed interview performance"""
        # Set up completed session with responses
        sample_interview_session.status = InterviewStatus.COMPLETED
        sample_interview_session.responses = [
            InterviewResponse(
                question_id="q1",
                response_text="I used string slicing",
                code_solution="def reverse_string(s): return s[::-1]",
                language=ProgrammingLanguage.PYTHON,
                response_time=300,
                confidence_level=4
            )
        ]
        
        interview_service.redis_client.get.return_value = sample_interview_session.json()
        
        # Mock AI evaluation
        interview_service.ai_client.evaluate_response.return_value = {
            "correctness_score": 9.0,
            "approach_score": 8.0,
            "code_quality_score": 8.5,
            "communication_score": 7.5,
            "technical_depth_score": 7.0,
            "time_efficiency": 8.0,
            "overall_score": 8.0,
            "strengths": ["Correct solution", "Clean code"],
            "improvements": ["Could explain complexity"],
            "detailed_feedback": "Good solution with room for improvement"
        }
        
        interview_service.ai_client.generate_feedback.return_value = {
            "strengths": ["Strong problem-solving", "Clean code"],
            "improvements": ["Explain complexity", "Consider edge cases"],
            "recommendations": ["Practice more algorithms", "Study time complexity"],
            "time_management": "Good time management",
            "communication_style": "Clear and concise",
            "technical_depth": "Good technical understanding",
            "practice_areas": [ConceptCategory.ALGORITHMS],
            "resources": ["Algorithm books", "LeetCode practice"],
            "confidence": 0.85
        }
        
        feedback = await interview_service.evaluate_interview_performance("test_session_123")
        
        assert feedback.session_id == "test_session_123"
        assert feedback.user_id == "test_user_456"
        assert feedback.overall_score == 8.0
        assert len(feedback.question_evaluations) == 1
        assert len(feedback.key_strengths) == 2
        assert len(feedback.areas_for_improvement) == 2
        assert feedback.ai_confidence == 0.85
        
        # Verify feedback storage
        interview_service.redis_client.setex.assert_called()
    
    @pytest.mark.asyncio
    async def test_evaluate_incomplete_session(self, interview_service, sample_interview_session):
        """Test evaluating incomplete session should fail"""
        # Session is still scheduled, not completed
        interview_service.redis_client.get.return_value = sample_interview_session.json()
        
        with pytest.raises(ValueError, match="Cannot evaluate incomplete session"):
            await interview_service.evaluate_interview_performance("test_session_123")
    
    @pytest.mark.asyncio
    async def test_get_user_analytics_new_user(self, interview_service):
        """Test getting analytics for new user"""
        # Mock Redis get to return None (new user)
        interview_service.redis_client.get.return_value = None
        
        analytics = await interview_service.get_user_analytics("new_user")
        
        assert analytics.user_id == "new_user"
        assert analytics.total_interviews == 0
        assert analytics.average_score == 0.0
        assert len(analytics.technical_scores) == 0
    
    @pytest.mark.asyncio
    async def test_company_patterns_loaded(self, interview_service):
        """Test that company patterns are properly loaded"""
        patterns = interview_service.company_patterns
        
        assert CompanyType.BIG_TECH in patterns
        assert CompanyType.STARTUP in patterns
        assert CompanyType.FINTECH in patterns
        
        big_tech_pattern = patterns[CompanyType.BIG_TECH]
        assert big_tech_pattern.typical_duration == 60
        assert QuestionType.CODING_PROBLEM in big_tech_pattern.question_distribution
        assert ConceptCategory.ALGORITHMS in big_tech_pattern.common_concepts
    
    @pytest.mark.asyncio
    async def test_generate_single_question_fallback(self, interview_service):
        """Test question generation with AI failure fallback"""
        # Mock AI failure
        interview_service.ai_client.generate_text.side_effect = Exception("AI service unavailable")
        
        question = await interview_service._generate_single_question(
            question_type=QuestionType.CODING_PROBLEM,
            difficulty=DifficultyLevel.EASY,
            concepts=[ConceptCategory.ALGORITHMS],
            company_type=CompanyType.GENERIC
        )
        
        assert question.type == QuestionType.CODING_PROBLEM
        assert question.difficulty == DifficultyLevel.EASY
        assert "reverse a string" in question.content.lower()  # Default easy question
    
    @pytest.mark.asyncio
    async def test_session_storage_and_retrieval(self, interview_service, sample_interview_session):
        """Test session storage and retrieval"""
        # Test storage
        await interview_service._store_session(sample_interview_session)
        
        expected_key = f"interview_session:{sample_interview_session.id}"
        interview_service.redis_client.setex.assert_called_with(
            expected_key,
            86400,  # 24 hours TTL
            sample_interview_session.json()
        )
        
        # Test retrieval
        interview_service.redis_client.get.return_value = sample_interview_session.json()
        retrieved_session = await interview_service._get_session(sample_interview_session.id)
        
        assert retrieved_session is not None
        assert retrieved_session.id == sample_interview_session.id
        assert retrieved_session.user_id == sample_interview_session.user_id
    
    @pytest.mark.asyncio
    async def test_session_retrieval_not_found(self, interview_service):
        """Test session retrieval when session doesn't exist"""
        interview_service.redis_client.get.return_value = None
        
        session = await interview_service._get_session("nonexistent_session")
        
        assert session is None


class TestInterviewServiceIntegration:
    """Integration tests for interview service"""
    
    @pytest.mark.asyncio
    async def test_complete_interview_flow(self):
        """Test complete interview flow from creation to evaluation"""
        service = InterviewService()
        
        # Mock dependencies
        service.redis_client = AsyncMock()
        service.ai_client = AsyncMock()
        
        # Mock AI responses
        service.ai_client.generate_text.return_value = {
            "question": "Implement a binary search algorithm",
            "duration": 20,
            "criteria": ["Correctness", "Efficiency", "Edge cases"]
        }
        
        service.ai_client.evaluate_response.return_value = {
            "correctness_score": 8.5,
            "approach_score": 8.0,
            "code_quality_score": 7.5,
            "communication_score": 8.0,
            "overall_score": 8.0,
            "strengths": ["Correct implementation", "Good variable names"],
            "improvements": ["Add comments", "Handle edge cases"],
            "detailed_feedback": "Solid implementation with minor improvements needed"
        }
        
        service.ai_client.generate_feedback.return_value = {
            "strengths": ["Strong algorithmic thinking", "Clean code structure"],
            "improvements": ["Add more comments", "Consider edge cases"],
            "recommendations": ["Practice more search algorithms", "Study complexity analysis"],
            "time_management": "Excellent time management",
            "communication_style": "Clear and methodical",
            "technical_depth": "Good understanding of algorithms",
            "practice_areas": [ConceptCategory.ALGORITHMS, ConceptCategory.DATA_STRUCTURES],
            "resources": ["Algorithm textbooks", "Online coding platforms"],
            "confidence": 0.9
        }
        
        # 1. Create session
        session = await service.create_interview_session(
            user_id="test_user",
            interview_type=InterviewType.TECHNICAL_CODING,
            company_type=CompanyType.BIG_TECH,
            difficulty_level=DifficultyLevel.MEDIUM,
            max_questions=1
        )
        
        assert session.status == InterviewStatus.SCHEDULED
        
        # Mock session retrieval for subsequent calls
        service.redis_client.get.return_value = session.json()
        
        # 2. Start session
        started_session = await service.start_interview_session(session.id)
        started_session.status = InterviewStatus.IN_PROGRESS
        service.redis_client.get.return_value = started_session.json()
        
        # 3. Get current question
        question = await service.get_current_question(session.id)
        assert question is not None
        
        # 4. Submit response
        updated_session, next_question = await service.submit_response(
            session_id=session.id,
            question_id=question.id,
            response_text="I'll implement binary search using divide and conquer",
            code_solution="""
def binary_search(arr, target):
    left, right = 0, len(arr) - 1
    while left <= right:
        mid = (left + right) // 2
        if arr[mid] == target:
            return mid
        elif arr[mid] < target:
            left = mid + 1
        else:
            right = mid - 1
    return -1
            """,
            language=ProgrammingLanguage.PYTHON,
            confidence_level=4
        )
        
        assert updated_session.status == InterviewStatus.COMPLETED
        assert len(updated_session.responses) == 1
        
        # Update mock to return completed session
        service.redis_client.get.return_value = updated_session.json()
        
        # 5. Evaluate performance
        feedback = await service.evaluate_interview_performance(session.id)
        
        assert feedback.overall_score == 8.0
        assert len(feedback.question_evaluations) == 1
        assert feedback.ai_confidence == 0.9
        
        # Verify all Redis operations were called
        assert service.redis_client.setex.call_count >= 3  # Session creation, updates, feedback storage


@pytest.mark.asyncio
async def test_get_interview_service():
    """Test getting interview service instance"""
    with patch('src.services.interview_service.interview_service') as mock_service:
        mock_service.redis_client = None
        mock_service.initialize = AsyncMock()
        
        service = await get_interview_service()
        
        assert service is not None
        mock_service.initialize.assert_called_once()


if __name__ == "__main__":
    pytest.main([__file__])