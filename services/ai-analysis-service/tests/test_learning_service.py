"""
Tests for learning service functionality
"""
import pytest
from datetime import datetime, timedelta
from unittest.mock import AsyncMock, MagicMock, patch

from src.services.learning_service import LearningService
from src.models.learning import (
    SkillAssessmentRequest, SkillLevel, ConceptCategory, LearningPathRequest,
    RecommendationRequest, ProgressiveHintRequest, DifficultyLevel
)
from src.models.analysis import ProgrammingLanguage


@pytest.fixture
def learning_service():
    """Create learning service instance for testing"""
    return LearningService()


@pytest.fixture
def mock_user_submissions():
    """Mock user submission data"""
    return [
        {
            "id": "sub_1",
            "problem_id": "problem_1",
            "code": "def solution(): pass",
            "language": "python",
            "status": "accepted",
            "difficulty": "easy",
            "concepts": ["algorithms"],
            "submitted_at": datetime.utcnow() - timedelta(days=1),
            "execution_time": 100
        },
        {
            "id": "sub_2",
            "problem_id": "problem_2",
            "code": "def solution(): return []",
            "language": "python",
            "status": "wrong_answer",
            "difficulty": "medium",
            "concepts": ["data_structures"],
            "submitted_at": datetime.utcnow() - timedelta(days=2),
            "execution_time": 200
        },
        {
            "id": "sub_3",
            "problem_id": "problem_3",
            "code": "def solution(): return True",
            "language": "python",
            "status": "accepted",
            "difficulty": "easy",
            "concepts": ["algorithms"],
            "submitted_at": datetime.utcnow() - timedelta(days=3),
            "execution_time": 150
        }
    ]


class TestSkillAssessment:
    """Test skill assessment functionality"""
    
    @pytest.mark.asyncio
    async def test_assess_user_skills_basic(self, learning_service, mock_user_submissions):
        """Test basic skill assessment"""
        request = SkillAssessmentRequest(
            user_id="test_user",
            language=ProgrammingLanguage.PYTHON,
            include_weak_areas=True
        )
        
        with patch.object(learning_service, '_get_user_submissions', return_value=mock_user_submissions):
            assessment = await learning_service.assess_user_skills(request)
        
        assert assessment.user_id == "test_user"
        assert assessment.language == ProgrammingLanguage.PYTHON
        assert assessment.overall_skill_level in [level for level in SkillLevel]
        assert assessment.total_problems_solved >= 0
        assert 0.0 <= assessment.accuracy_rate <= 1.0
    
    @pytest.mark.asyncio
    async def test_assess_user_skills_with_cache(self, learning_service):
        """Test skill assessment with cached results"""
        request = SkillAssessmentRequest(
            user_id="cached_user",
            language=ProgrammingLanguage.PYTHON
        )
        
        # Mock cached result
        cached_assessment = {
            "user_id": "cached_user",
            "language": "python",
            "overall_skill_level": "intermediate",
            "concept_scores": {"algorithms": 0.8},
            "weak_areas": [],
            "strong_areas": ["algorithms"],
            "assessment_date": datetime.utcnow().isoformat(),
            "total_problems_solved": 10,
            "accuracy_rate": 0.8
        }
        
        with patch('src.core.redis_client.cache_get', return_value=cached_assessment):
            assessment = await learning_service.assess_user_skills(request)
        
        assert assessment.user_id == "cached_user"
        assert assessment.overall_skill_level == SkillLevel.INTERMEDIATE
    
    @pytest.mark.asyncio
    async def test_assess_user_skills_empty_submissions(self, learning_service):
        """Test skill assessment with no submissions"""
        request = SkillAssessmentRequest(
            user_id="new_user",
            language=ProgrammingLanguage.PYTHON
        )
        
        with patch.object(learning_service, '_get_user_submissions', return_value=[]):
            assessment = await learning_service.assess_user_skills(request)
        
        assert assessment.user_id == "new_user"
        assert assessment.overall_skill_level == SkillLevel.BEGINNER
        assert assessment.total_problems_solved == 0
        assert assessment.accuracy_rate == 0.0
    
    @pytest.mark.asyncio
    async def test_identify_weak_areas(self, learning_service, mock_user_submissions):
        """Test weak area identification"""
        # Create submissions with poor performance in data structures
        poor_performance_submissions = [
            {
                "id": f"sub_{i}",
                "problem_id": f"problem_{i}",
                "status": "wrong_answer" if i % 3 != 0 else "accepted",
                "concepts": ["data_structures"],
                "submitted_at": datetime.utcnow() - timedelta(days=i)
            }
            for i in range(10)
        ]
        
        concept_scores = {ConceptCategory.DATA_STRUCTURES: 0.3}  # Low score
        weak_areas = await learning_service._identify_weak_areas(poor_performance_submissions, concept_scores)
        
        assert len(weak_areas) > 0
        assert any(wa.concept == ConceptCategory.DATA_STRUCTURES for wa in weak_areas)
        assert all(wa.confidence_score < 0.6 for wa in weak_areas)


class TestLearningPathGeneration:
    """Test learning path generation functionality"""
    
    @pytest.mark.asyncio
    async def test_generate_learning_path_basic(self, learning_service):
        """Test basic learning path generation"""
        request = LearningPathRequest(
            user_id="test_user",
            target_concepts=[ConceptCategory.ALGORITHMS, ConceptCategory.DATA_STRUCTURES],
            time_commitment=10,
            preferred_difficulty=DifficultyLevel.MEDIUM,
            learning_style="mixed"
        )
        
        # Mock skill assessment
        mock_assessment = MagicMock()
        mock_assessment.overall_skill_level = SkillLevel.BEGINNER
        mock_assessment.weak_areas = []
        
        with patch.object(learning_service, 'assess_user_skills', return_value=mock_assessment):
            learning_path = await learning_service.generate_learning_path(request)
        
        assert learning_path.user_id == "test_user"
        assert len(learning_path.target_concepts) == 2
        assert ConceptCategory.ALGORITHMS in learning_path.target_concepts
        assert ConceptCategory.DATA_STRUCTURES in learning_path.target_concepts
        assert learning_path.total_steps > 0
        assert learning_path.estimated_duration > 0
        assert len(learning_path.difficulty_progression) > 0
    
    @pytest.mark.asyncio
    async def test_generate_learning_path_advanced_user(self, learning_service):
        """Test learning path generation for advanced user"""
        request = LearningPathRequest(
            user_id="advanced_user",
            target_concepts=[ConceptCategory.DYNAMIC_PROGRAMMING],
            time_commitment=20,
            preferred_difficulty=DifficultyLevel.MEDIUM,
            learning_style="visual"
        )
        
        # Mock advanced skill assessment
        mock_assessment = MagicMock()
        mock_assessment.overall_skill_level = SkillLevel.ADVANCED
        mock_assessment.weak_areas = []
        
        with patch.object(learning_service, 'assess_user_skills', return_value=mock_assessment):
            learning_path = await learning_service.generate_learning_path(request)
        
        assert learning_path.user_id == "advanced_user"
        # Advanced users should get harder difficulty progression
        assert DifficultyLevel.HARD in learning_path.difficulty_progression
    
    @pytest.mark.asyncio
    async def test_learning_path_resource_selection(self, learning_service):
        """Test learning resource selection in path generation"""
        request = LearningPathRequest(
            user_id="test_user",
            target_concepts=[ConceptCategory.ALGORITHMS],
            time_commitment=5,
            preferred_difficulty=DifficultyLevel.MEDIUM,
            learning_style="textual"
        )
        
        mock_assessment = MagicMock()
        mock_assessment.overall_skill_level = SkillLevel.INTERMEDIATE
        mock_assessment.weak_areas = []
        
        with patch.object(learning_service, 'assess_user_skills', return_value=mock_assessment):
            learning_path = await learning_service.generate_learning_path(request)
        
        assert len(learning_path.resources) > 0
        assert len(learning_path.practice_problems) > 0
        assert len(learning_path.milestones) > 0
        
        # Check that resources are appropriate for the concepts
        resource_concepts = []
        for resource in learning_path.resources:
            resource_concepts.extend(resource.concepts)
        
        assert ConceptCategory.ALGORITHMS in resource_concepts


class TestContextualRecommendations:
    """Test contextual recommendation functionality"""
    
    @pytest.mark.asyncio
    async def test_problem_solving_recommendations(self, learning_service):
        """Test recommendations for problem solving context"""
        request = RecommendationRequest(
            problem_id="two_sum",
            user_id="test_user",
            context="problem_solving",
            recent_code="def solution(arr): return sorted(arr)",
            language=ProgrammingLanguage.PYTHON,
            max_recommendations=5
        )
        
        with patch.object(learning_service, '_analyze_code_concepts', return_value=[ConceptCategory.ALGORITHMS]):
            recommendation = await learning_service.generate_contextual_recommendations(request)
        
        assert recommendation.user_id == "test_user"
        assert recommendation.context == "problem_solving"
        assert len(recommendation.recommended_resources) <= 5
        assert len(recommendation.reasoning) > 0
    
    @pytest.mark.asyncio
    async def test_skill_gap_recommendations(self, learning_service):
        """Test recommendations for skill gap context"""
        request = RecommendationRequest(
            user_id="test_user",
            problem_id="two_sum",
            context="skill_gap",
            language=ProgrammingLanguage.PYTHON,
            max_recommendations=3,
            recent_code="def solution(arr): return sorted(arr)",
        )
        
        # Mock skill assessment with weak areas
        mock_assessment = MagicMock()
        mock_assessment.weak_areas = [
            MagicMock(concept=ConceptCategory.DATA_STRUCTURES),
            MagicMock(concept=ConceptCategory.DYNAMIC_PROGRAMMING)
        ]
        
        with patch.object(learning_service, 'assess_user_skills', return_value=mock_assessment):
            recommendation = await learning_service.generate_contextual_recommendations(request)
        
        assert recommendation.context == "skill_gap"
        assert len(recommendation.recommended_resources) <= 3
        assert "skill gaps" in recommendation.reasoning.lower()
    
    @pytest.mark.asyncio
    async def test_interview_prep_recommendations(self, learning_service):
        """Test recommendations for interview preparation context"""
        request = RecommendationRequest(
            user_id="test_user",
            problem_id="two_sum",
            context="skill_gap",
            language=ProgrammingLanguage.PYTHON,
            max_recommendations=3,
            recent_code="def solution(arr): return sorted(arr)",
        )
        
        recommendation = await learning_service.generate_contextual_recommendations(request)
        
        assert recommendation.context == "interview_prep"
        assert "interview" in recommendation.reasoning.lower()
        
        # Should include common interview concepts
        resource_concepts = []
        for resource in recommendation.recommended_resources:
            resource_concepts.extend(resource.concepts)
        
        interview_concepts = [
            ConceptCategory.ALGORITHMS,
            ConceptCategory.DATA_STRUCTURES,
            ConceptCategory.DYNAMIC_PROGRAMMING
        ]
        
        assert any(concept in resource_concepts for concept in interview_concepts)


class TestProgressiveHints:
    """Test progressive hint generation functionality"""
    
    @pytest.mark.asyncio
    async def test_generate_progressive_hints_basic(self, learning_service):
        """Test basic progressive hint generation"""
        request = ProgressiveHintRequest(
            user_id="test_user",
            problem_id="two_sum",
            current_code="def solution(nums, target): pass",
            language=ProgrammingLanguage.PYTHON,
            hint_level=3,
            stuck_duration=10
        )
        
        # Mock AI response
        mock_ai_response = '[{"level": 1, "content": "Think about using a hash map", "type": "conceptual", "reveals_solution": false}]'
        
        with patch('src.core.ai_client.generate_completion', return_value=mock_ai_response):
            with patch.object(learning_service, '_analyze_code_approach', return_value={"approach": "brute_force"}):
                with patch.object(learning_service, '_identify_problem_concepts', return_value=ConceptCategory.ALGORITHMS):
                    hints = await learning_service.generate_progressive_hints(request)
        
        assert len(hints) > 0
        assert all(hint.level >= 1 for hint in hints)
        assert all(hint.level <= 5 for hint in hints)
        assert all(len(hint.content) > 0 for hint in hints)
    
    @pytest.mark.asyncio
    async def test_progressive_hints_with_cache(self, learning_service):
        """Test progressive hints with cached results"""
        request = ProgressiveHintRequest(
            user_id="test_user",
            problem_id="cached_problem",
            current_code="def solution(): return None",
            language=ProgrammingLanguage.PYTHON,
            hint_level=3,
            stuck_duration=5,
        )
        
        # Mock cached hints
        cached_hints = [
            {
                "level": 1,
                "content": "Cached hint 1",
                "type": "conceptual",
                "reveals_solution": False,
                "concept_focus": None,
                "code_snippet": None,
                "learning_objective": None,
                "prerequisite_concepts": []
            }
        ]
        
        with patch('src.core.redis_client.cache_get', return_value=cached_hints):
            hints = await learning_service.generate_progressive_hints(request)
        
        assert len(hints) == 1
        assert hints[0].content == "Cached hint 1"
    
    @pytest.mark.asyncio
    async def test_progressive_hints_fallback(self, learning_service):
        """Test progressive hints fallback when AI fails"""
        request = ProgressiveHintRequest(
            user_id="test_user",
            problem_id="failing_problem",
            current_code="def solution(): raise Exception()",
            language=ProgrammingLanguage.PYTHON,
            hint_level=2,
            stuck_duration=15
        )
        
        # Mock AI failure
        with patch('src.core.ai_client.generate_completion', side_effect=Exception("AI failed")):
            with patch.object(learning_service, '_analyze_code_approach', return_value={}):
                with patch.object(learning_service, '_identify_problem_concepts', return_value=None):
                    hints = await learning_service.generate_progressive_hints(request)
        
        assert len(hints) == 1  # Should return fallback hint
        assert "problem requirements" in hints[0].content.lower()
    
    @pytest.mark.asyncio
    async def test_hint_learning_objectives(self, learning_service):
        """Test that hints include learning objectives"""
        request = ProgressiveHintRequest(
            user_id="test_user",
            problem_id="test_problem",
            current_code="def solution(): pass",
            language=ProgrammingLanguage.PYTHON,
            hint_level=1,
            stuck_duration=5
        )
        
        # Mock successful hint generation
        mock_hints = [
            {
                "level": 1,
                "content": "Consider the data structure",
                "type": "conceptual",
                "reveals_solution": False,
                "learning_objective": "Data structure selection"
            }
        ]
        
        with patch.object(learning_service, '_generate_ai_hints', return_value=[MagicMock(**hint) for hint in mock_hints]):
            with patch.object(learning_service, '_analyze_code_approach', return_value={}):
                with patch.object(learning_service, '_identify_problem_concepts', return_value=ConceptCategory.DATA_STRUCTURES):
                    hints = await learning_service.generate_progressive_hints(request)
        
        assert len(hints) > 0
        # Learning objectives should be enhanced
        for hint in hints:
            assert hasattr(hint, 'learning_objective')


class TestPerformancePatterns:
    """Test performance pattern analysis functionality"""
    
    @pytest.mark.asyncio
    async def test_analyze_performance_patterns_basic(self, learning_service, mock_user_submissions):
        """Test basic performance pattern analysis"""
        with patch.object(learning_service, '_get_user_submissions', return_value=mock_user_submissions):
            patterns = await learning_service.analyze_performance_patterns("test_user")
        
        assert isinstance(patterns, list)
        # Should return some patterns for the mock data
        for pattern in patterns:
            assert hasattr(pattern, 'pattern_type')
            assert hasattr(pattern, 'insights')
            assert hasattr(pattern, 'recommendations')
            assert hasattr(pattern, 'confidence')
            assert 0.0 <= pattern.confidence <= 1.0
    
    @pytest.mark.asyncio
    async def test_analyze_time_patterns(self, learning_service):
        """Test time-based performance pattern analysis"""
        # Create submissions with time patterns
        time_submissions = []
        for i in range(20):
            submission_time = datetime.utcnow().replace(hour=i % 24) - timedelta(days=i)
            time_submissions.append({
                "user_id": "test_user",
                "submitted_at": submission_time,
                "status": "accepted" if i % 3 == 0 else "wrong_answer"
            })
        
        pattern = learning_service._analyze_time_patterns(time_submissions)
        
        if pattern:  # Pattern might be None if insufficient data
            assert pattern.pattern_type == "time_of_day"
            assert len(pattern.insights) > 0
            assert len(pattern.recommendations) > 0
    
    @pytest.mark.asyncio
    async def test_analyze_difficulty_patterns(self, learning_service):
        """Test difficulty-based performance pattern analysis"""
        # Create submissions with difficulty patterns
        difficulty_submissions = []
        difficulties = ["easy", "medium", "hard"]
        
        for i in range(15):
            difficulty = difficulties[i % 3]
            # Make easy problems more successful
            status = "accepted" if (difficulty == "easy" and i % 2 == 0) or i % 5 == 0 else "wrong_answer"
            
            difficulty_submissions.append({
                "user_id": "test_user",
                "difficulty": difficulty,
                "status": status,
                "submitted_at": datetime.utcnow() - timedelta(days=i)
            })
        
        pattern = learning_service._analyze_difficulty_patterns(difficulty_submissions)
        
        if pattern:
            assert pattern.pattern_type == "difficulty_progression"
            assert "easy" in str(pattern.pattern_data).lower()


class TestDifficultyProgression:
    """Test difficulty progression functionality"""
    
    @pytest.mark.asyncio
    async def test_recommend_difficulty_progression_basic(self, learning_service):
        """Test basic difficulty progression recommendation"""
        # Mock recent submissions with good performance on easy problems
        recent_submissions = [
            {
                "difficulty": "easy",
                "status": "accepted",
                "submitted_at": datetime.utcnow() - timedelta(days=i)
            }
            for i in range(10)
        ]
        
        with patch.object(learning_service, '_get_recent_submissions', return_value=recent_submissions):
            progression = await learning_service.recommend_difficulty_progression("test_user")
        
        assert progression.user_id == "test_user"
        assert progression.current_level in [level for level in DifficultyLevel]
        assert progression.recommended_level in [level for level in DifficultyLevel]
        assert 0.0 <= progression.readiness_score <= 1.0
        assert 0.0 <= progression.estimated_success_rate <= 1.0
        assert len(progression.supporting_evidence) > 0
    
    @pytest.mark.asyncio
    async def test_difficulty_progression_ready_for_next_level(self, learning_service):
        """Test progression when user is ready for next level"""
        # Mock high-performance submissions
        high_performance_submissions = [
            {
                "difficulty": "easy",
                "status": "accepted",
                "submitted_at": datetime.utcnow() - timedelta(days=i)
            }
            for i in range(15)  # Many successful easy problems
        ]
        
        with patch.object(learning_service, '_get_recent_submissions', return_value=high_performance_submissions):
            progression = await learning_service.recommend_difficulty_progression("ready_user")
        
        # Should recommend progression to medium
        if progression.current_level == DifficultyLevel.EASY:
            assert progression.recommended_level == DifficultyLevel.MEDIUM
        
        # High readiness score expected
        assert progression.readiness_score >= 0.5
    
    @pytest.mark.asyncio
    async def test_difficulty_progression_insufficient_data(self, learning_service):
        """Test progression with insufficient data"""
        with patch.object(learning_service, '_get_recent_submissions', return_value=[]):
            progression = await learning_service.recommend_difficulty_progression("new_user")
        
        assert progression.user_id == "new_user"
        assert progression.current_level == DifficultyLevel.EASY
        assert progression.recommended_level == DifficultyLevel.EASY
        assert progression.readiness_score == 0.5  # Default safe value


class TestHelperMethods:
    """Test helper methods in learning service"""
    
    def test_calculate_overall_skill_level(self, learning_service):
        """Test overall skill level calculation"""
        # Test beginner level
        concept_scores = {ConceptCategory.ALGORITHMS: 0.4}
        submissions = [{"status": "accepted"} for _ in range(5)]
        
        skill_level = learning_service._calculate_overall_skill_level(concept_scores, submissions)
        assert skill_level == SkillLevel.BEGINNER
        
        # Test advanced level
        concept_scores = {
            ConceptCategory.ALGORITHMS: 0.9,
            ConceptCategory.DATA_STRUCTURES: 0.85
        }
        submissions = [{"status": "accepted"} for _ in range(60)]
        
        skill_level = learning_service._calculate_overall_skill_level(concept_scores, submissions)
        assert skill_level == SkillLevel.ADVANCED
    
    def test_identify_strong_areas(self, learning_service):
        """Test strong area identification"""
        concept_scores = {
            ConceptCategory.ALGORITHMS: 0.9,  # Strong
            ConceptCategory.DATA_STRUCTURES: 0.6,  # Not strong
            ConceptCategory.DYNAMIC_PROGRAMMING: 0.85  # Strong
        }
        
        strong_areas = learning_service._identify_strong_areas(concept_scores)
        
        assert ConceptCategory.ALGORITHMS in strong_areas
        assert ConceptCategory.DYNAMIC_PROGRAMMING in strong_areas
        assert ConceptCategory.DATA_STRUCTURES not in strong_areas
    
    def test_plan_difficulty_progression(self, learning_service):
        """Test difficulty progression planning"""
        # Mock skill assessment
        mock_assessment = MagicMock()
        mock_assessment.overall_skill_level = SkillLevel.BEGINNER
        
        target_concepts = [ConceptCategory.ALGORITHMS]
        time_commitment = 10
        
        progression = learning_service._plan_difficulty_progression(
            mock_assessment, target_concepts, time_commitment
        )
        
        assert isinstance(progression, list)
        assert len(progression) > 0
        assert all(isinstance(level, DifficultyLevel) for level in progression)
        
        # Beginner should start with easy problems
        assert DifficultyLevel.EASY in progression
    
    def test_estimate_learning_duration(self, learning_service):
        """Test learning duration estimation"""
        # Mock resources
        mock_resources = [
            MagicMock(estimated_time=30),  # 30 minutes
            MagicMock(estimated_time=45),  # 45 minutes
            MagicMock(estimated_time=None)  # No time estimate
        ]
        
        time_commitment = 5  # hours per week
        duration = learning_service._estimate_learning_duration(mock_resources, time_commitment)
        
        assert isinstance(duration, int)
        assert duration > 0
    
    @pytest.mark.asyncio
    async def test_analyze_code_concepts(self, learning_service):
        """Test code concept analysis"""
        # Code with sorting (algorithms concept)
        code = "def solution(arr): return sorted(arr)"
        language = ProgrammingLanguage.PYTHON
        
        concepts = await learning_service._analyze_code_concepts(code, language)
        
        assert isinstance(concepts, list)
        assert len(concepts) <= 5  # Should be limited
        # Should detect algorithms concept due to "sorted"
        assert ConceptCategory.ALGORITHMS in concepts
    
    def test_get_next_difficulty_level(self, learning_service):
        """Test next difficulty level determination"""
        assert learning_service._get_next_difficulty_level(DifficultyLevel.EASY) == DifficultyLevel.MEDIUM
        assert learning_service._get_next_difficulty_level(DifficultyLevel.MEDIUM) == DifficultyLevel.HARD
        assert learning_service._get_next_difficulty_level(DifficultyLevel.HARD) == DifficultyLevel.HARD


@pytest.mark.asyncio
async def test_learning_service_integration():
    """Integration test for learning service"""
    learning_service = LearningService()
    
    # Test that service initializes properly
    assert learning_service.concept_keywords is not None
    assert learning_service.learning_resources_db is not None
    
    # Test that concept keywords are properly initialized
    assert ConceptCategory.ALGORITHMS in learning_service.concept_keywords
    assert len(learning_service.concept_keywords[ConceptCategory.ALGORITHMS]) > 0
    
    # Test that learning resources are initialized
    assert ConceptCategory.ALGORITHMS in learning_service.learning_resources_db
    assert len(learning_service.learning_resources_db[ConceptCategory.ALGORITHMS]) > 0


if __name__ == "__main__":
    pytest.main([__file__])