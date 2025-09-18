"""
Tests for learning API endpoints
"""
import pytest
from fastapi.testclient import TestClient
from unittest.mock import AsyncMock, MagicMock, patch
import json

from src.main import app
from src.models.learning import (
    SkillAssessment, SkillLevel, ConceptCategory, LearningPath,
    ContextualRecommendation, ProgressiveHint, PerformancePattern,
    DifficultyProgression, DifficultyLevel, LearningResource,
    LearningResourceType
)
from src.models.analysis import ProgrammingLanguage, SeverityLevel


@pytest.fixture
def client():
    """Create test client"""
    return TestClient(app)


@pytest.fixture
def mock_skill_assessment():
    """Mock skill assessment response"""
    return SkillAssessment(
        user_id="test_user",
        language=ProgrammingLanguage.PYTHON,
        overall_skill_level=SkillLevel.INTERMEDIATE,
        concept_scores={ConceptCategory.ALGORITHMS: 0.8},
        weak_areas=[],
        strong_areas=[ConceptCategory.ALGORITHMS],
        total_problems_solved=25,
        accuracy_rate=0.75
    )


@pytest.fixture
def mock_learning_path():
    """Mock learning path response"""
    return LearningPath(
        id="path_123",
        user_id="test_user",
        title="Test Learning Path",
        description="A test learning path",
        target_concepts=[ConceptCategory.ALGORITHMS],
        total_steps=5,
        estimated_duration=10,
        difficulty_progression=[DifficultyLevel.EASY, DifficultyLevel.MEDIUM],
        resources=[],
        practice_problems=["problem_1", "problem_2"],
        milestones=["Complete basics", "Master fundamentals"]
    )


@pytest.fixture
def mock_contextual_recommendation():
    """Mock contextual recommendation response"""
    return ContextualRecommendation(
        recommendation_id="rec_123",
        user_id="test_user",
        context="problem_solving",
        recommended_resources=[],
        recommended_problems=["problem_1"],
        reasoning="Based on recent code analysis",
        priority=SeverityLevel.MEDIUM,
        expires_date=None
    )


@pytest.fixture
def mock_progressive_hints():
    """Mock progressive hints response"""
    return [
        ProgressiveHint(
            level=1,
            content="Think about the problem step by step",
            type="conceptual",
            reveals_solution=False,
            learning_objective="Problem decomposition",
            code_snippet="def two_sum(nums, target):\n    # Your code here\n    pass",
            concept_focus=ConceptCategory.ALGORITHMS
        ),
        ProgressiveHint(
            level=2,
            content="Consider using a hash map for O(1) lookups",
            type="implementation",
            reveals_solution=False,
            learning_objective="Data structure selection",
            code_snippet="def two_sum(nums, target):\n    num_map = {}\n    for i, num in enumerate(nums):\n        complement = target - num\n        if complement in num_map:\n            return [num_map[complement], i]\n        num_map[num] = i\n    return []",
            concept_focus=ConceptCategory.ALGORITHMS
        )
    ]


class TestSkillAssessmentEndpoints:
    """Test skill assessment endpoints"""
    
    def test_assess_user_skills_success(self, client, mock_skill_assessment):
        """Test successful skill assessment"""
        request_data = {
            "user_id": "test_user",
            "language": "python",
            "include_weak_areas": True,
            "assessment_depth": "standard"
        }
        
        with patch('src.routers.learning.learning_service.assess_user_skills', return_value=mock_skill_assessment):
            response = client.post("/api/v1/learning/assess-skills", json=request_data)
        
        assert response.status_code == 200
        data = response.json()
        
        assert data["user_id"] == "test_user"
        assert data["language"] == "python"
        assert data["overall_skill_level"] == "intermediate"
        assert data["total_problems_solved"] == 25
        assert data["accuracy_rate"] == 0.75
    
    def test_assess_user_skills_missing_user_id(self, client):
        """Test skill assessment with missing user ID"""
        request_data = {
            "language": "python"
        }
        
        response = client.post("/api/v1/learning/assess-skills", json=request_data)
        assert response.status_code == 422  # Validation error
    
    def test_assess_user_skills_invalid_language(self, client):
        """Test skill assessment with invalid language"""
        request_data = {
            "user_id": "test_user",
            "language": "invalid_language"
        }
        
        response = client.post("/api/v1/learning/assess-skills", json=request_data)
        assert response.status_code == 422  # Validation error
    
    def test_assess_user_skills_service_error(self, client):
        """Test skill assessment with service error"""
        request_data = {
            "user_id": "test_user",
            "language": "python"
        }
        
        with patch('src.routers.learning.learning_service.assess_user_skills', side_effect=Exception("Service error")):
            response = client.post("/api/v1/learning/assess-skills", json=request_data)
        
        assert response.status_code == 500
        assert "Internal server error" in response.json()["detail"]


class TestLearningPathEndpoints:
    """Test learning path endpoints"""
    
    def test_generate_learning_path_success(self, client, mock_learning_path):
        """Test successful learning path generation"""
        request_data = {
            "user_id": "test_user",
            "target_concepts": ["algorithms", "data_structures"],
            "time_commitment": 10,
            "preferred_difficulty": "medium"
        }
        
        with patch('src.routers.learning.learning_service.generate_learning_path', return_value=mock_learning_path):
            response = client.post("/api/v1/learning/generate-learning-path", json=request_data)
        
        assert response.status_code == 200
        data = response.json()
        
        assert data["id"] == "path_123"
        assert data["user_id"] == "test_user"
        assert data["title"] == "Test Learning Path"
        assert data["total_steps"] == 5
        assert data["estimated_duration"] == 10
    
    def test_generate_learning_path_missing_concepts(self, client):
        """Test learning path generation with missing target concepts"""
        request_data = {
            "user_id": "test_user",
            "target_concepts": [],
            "time_commitment": 10
        }
        
        response = client.post("/api/v1/learning/generate-learning-path", json=request_data)
        assert response.status_code == 400
        assert "At least one target concept is required" in response.json()["detail"]
    
    def test_generate_learning_path_invalid_time_commitment(self, client):
        """Test learning path generation with invalid time commitment"""
        request_data = {
            "user_id": "test_user",
            "target_concepts": ["algorithms"],
            "time_commitment": -5
        }
        
        response = client.post("/api/v1/learning/generate-learning-path", json=request_data)
        assert response.status_code == 400
        assert "Time commitment must be positive" in response.json()["detail"]


class TestRecommendationEndpoints:
    """Test recommendation endpoints"""
    
    def test_get_contextual_recommendations_success(self, client, mock_contextual_recommendation):
        """Test successful contextual recommendations"""
        request_data = {
            "user_id": "test_user",
            "context": "problem_solving",
            "recent_code": "def solution(): pass",
            "language": "python",
            "max_recommendations": 5
        }
        
        with patch('src.routers.learning.learning_service.generate_contextual_recommendations', return_value=mock_contextual_recommendation):
            response = client.post("/api/v1/learning/recommendations", json=request_data)
        
        assert response.status_code == 200
        data = response.json()
        
        assert data["recommendation_id"] == "rec_123"
        assert data["user_id"] == "test_user"
        assert data["context"] == "problem_solving"
        assert data["reasoning"] == "Based on recent code analysis"
    
    def test_get_contextual_recommendations_missing_context(self, client):
        """Test recommendations with missing context"""
        request_data = {
            "user_id": "test_user",
            "max_recommendations": 5
        }
        
        response = client.post("/api/v1/learning/recommendations", json=request_data)
        assert response.status_code == 422  # Validation error
    
    def test_get_contextual_recommendations_invalid_max(self, client):
        """Test recommendations with invalid max recommendations"""
        request_data = {
            "user_id": "test_user",
            "context": "skill_gap",
            "max_recommendations": 25  # Too high
        }
        
        response = client.post("/api/v1/learning/recommendations", json=request_data)
        assert response.status_code == 400
        assert "Max recommendations must be between 1 and 20" in response.json()["detail"]


class TestProgressiveHintEndpoints:
    """Test progressive hint endpoints"""
    
    def test_generate_progressive_hints_success(self, client, mock_progressive_hints):
        """Test successful progressive hint generation"""
        request_data = {
            "user_id": "test_user",
            "problem_id": "two_sum",
            "current_code": "def solution(nums, target): pass",
            "language": "python",
            "hint_level": 2,
            "previous_hints": [],
            "stuck_duration": 10
        }
        
        with patch('src.routers.learning.learning_service.generate_progressive_hints', return_value=mock_progressive_hints):
            response = client.post("/api/v1/learning/progressive-hints", json=request_data)
        
        assert response.status_code == 200
        data = response.json()
        
        assert len(data) == 2
        assert data[0]["level"] == 1
        assert data[0]["content"] == "Think about the problem step by step"
        assert data[0]["learning_objective"] == "Problem decomposition"
        assert data[1]["level"] == 2
        assert data[1]["type"] == "implementation"
    
    def test_generate_progressive_hints_empty_code(self, client):
        """Test progressive hints with empty code"""
        request_data = {
            "user_id": "test_user",
            "problem_id": "test_problem",
            "current_code": "   ",  # Empty/whitespace only
            "language": "python",
            "hint_level": 1
        }
        
        response = client.post("/api/v1/learning/progressive-hints", json=request_data)
        assert response.status_code == 400
        assert "Current code cannot be empty" in response.json()["detail"]
    
    def test_generate_progressive_hints_invalid_level(self, client):
        """Test progressive hints with invalid hint level"""
        request_data = {
            "user_id": "test_user",
            "problem_id": "test_problem",
            "current_code": "def solution(): pass",
            "language": "python",
            "hint_level": 10  # Too high
        }
        
        response = client.post("/api/v1/learning/progressive-hints", json=request_data)
        assert response.status_code == 400
        assert "Hint level must be between 1 and 5" in response.json()["detail"]


class TestPerformanceAnalysisEndpoints:
    """Test performance analysis endpoints"""
    
    def test_analyze_performance_patterns_success(self, client):
        """Test successful performance pattern analysis"""
        mock_patterns = [
            PerformancePattern(
                user_id="test_user",
                pattern_type="time_of_day",
                pattern_data={"best_hour": 14, "worst_hour": 22},
                insights=["Best performance at 2 PM", "Worst performance at 10 PM"],
                recommendations=["Schedule difficult problems in afternoon"],
                confidence=0.85
            )
        ]
        
        with patch('src.routers.learning.learning_service.analyze_performance_patterns', return_value=mock_patterns):
            response = client.get("/api/v1/learning/performance-patterns/test_user")
        
        assert response.status_code == 200
        data = response.json()
        
        assert len(data) == 1
        assert data[0]["user_id"] == "test_user"
        assert data[0]["pattern_type"] == "time_of_day"
        assert data[0]["confidence"] == 0.85
        assert len(data[0]["insights"]) > 0
        assert len(data[0]["recommendations"]) > 0
    
    def test_analyze_performance_patterns_empty_user_id(self, client):
        """Test performance patterns with empty user ID"""
        response = client.get("/api/v1/learning/performance-patterns/")
        assert response.status_code == 404  # Not found due to missing path parameter


class TestDifficultyProgressionEndpoints:
    """Test difficulty progression endpoints"""
    
    def test_get_difficulty_progression_success(self, client):
        """Test successful difficulty progression analysis"""
        mock_progression = DifficultyProgression(
            user_id="test_user",
            current_level=DifficultyLevel.EASY,
            recommended_level=DifficultyLevel.MEDIUM,
            readiness_score=0.8,
            supporting_evidence=["High success rate on easy problems"],
            prerequisite_skills=[ConceptCategory.ALGORITHMS],
            estimated_success_rate=0.75
        )
        
        with patch('src.routers.learning.learning_service.recommend_difficulty_progression', return_value=mock_progression):
            response = client.get("/api/v1/learning/difficulty-progression/test_user")
        
        assert response.status_code == 200
        data = response.json()
        
        assert data["user_id"] == "test_user"
        assert data["current_level"] == "easy"
        assert data["recommended_level"] == "medium"
        assert data["readiness_score"] == 0.8
        assert data["estimated_success_rate"] == 0.75
        assert len(data["supporting_evidence"]) > 0


class TestWeakAreaEndpoints:
    """Test weak area analysis endpoints"""
    
    def test_get_user_weak_areas_success(self, client, mock_skill_assessment):
        """Test successful weak area retrieval"""
        # Add weak areas to mock assessment
        from src.models.learning import WeakArea
        mock_skill_assessment.weak_areas = [
            WeakArea(
                concept=ConceptCategory.DATA_STRUCTURES,
                confidence_score=0.4,
                error_patterns=["Frequent wrong_answer errors"],
                improvement_suggestions=["Practice more data structure problems"]
            )
        ]
        
        with patch('src.routers.learning.learning_service.assess_user_skills', return_value=mock_skill_assessment):
            response = client.get("/api/v1/learning/weak-areas/test_user?language=python")
        
        assert response.status_code == 200
        data = response.json()
        
        assert data["user_id"] == "test_user"
        assert data["language"] == "python"
        assert len(data["weak_areas"]) == 1
        assert data["weak_areas"][0]["concept"] == "data_structures"
        assert data["weak_areas"][0]["confidence_score"] == 0.4
    
    def test_get_user_weak_areas_invalid_language(self, client):
        """Test weak areas with invalid language"""
        response = client.get("/api/v1/learning/weak-areas/test_user?language=invalid")
        assert response.status_code == 400
        assert "Unsupported language" in response.json()["detail"]


class TestLearningResourceEndpoints:
    """Test learning resource endpoints"""
    
    def test_get_learning_resources_success(self, client):
        """Test successful learning resource retrieval"""
        response = client.get("/api/v1/learning/learning-resources?concepts=algorithms&difficulty=easy&limit=5")
        
        assert response.status_code == 200
        data = response.json()
        
        assert "resources" in data
        assert "total_found" in data
        assert "filters_applied" in data
        assert data["filters_applied"]["concepts"] == ["algorithms"]
        assert data["filters_applied"]["difficulty"] == "easy"
        assert len(data["resources"]) <= 5
    
    def test_get_learning_resources_invalid_concept(self, client):
        """Test learning resources with invalid concept"""
        response = client.get("/api/v1/learning/learning-resources?concepts=invalid_concept")
        assert response.status_code == 400
        assert "Invalid concept" in response.json()["detail"]
    
    def test_get_learning_resources_invalid_difficulty(self, client):
        """Test learning resources with invalid difficulty"""
        response = client.get("/api/v1/learning/learning-resources?difficulty=invalid")
        assert response.status_code == 400
        assert "Invalid difficulty" in response.json()["detail"]
    
    def test_get_learning_resources_invalid_type(self, client):
        """Test learning resources with invalid resource type"""
        response = client.get("/api/v1/learning/learning-resources?resource_type=invalid")
        assert response.status_code == 400
        assert "Invalid resource type" in response.json()["detail"]


class TestMetadataEndpoints:
    """Test metadata endpoints"""
    
    def test_get_concept_categories(self, client):
        """Test concept categories endpoint"""
        response = client.get("/api/v1/learning/concept-categories")
        
        assert response.status_code == 200
        data = response.json()
        
        assert "categories" in data
        assert "count" in data
        assert len(data["categories"]) > 0
        
        # Check structure of category items
        category = data["categories"][0]
        assert "value" in category
        assert "display_name" in category
        assert "description" in category
    
    def test_get_skill_levels(self, client):
        """Test skill levels endpoint"""
        response = client.get("/api/v1/learning/skill-levels")
        
        assert response.status_code == 200
        data = response.json()
        
        assert "levels" in data
        assert "count" in data
        assert len(data["levels"]) == 4  # beginner, intermediate, advanced, expert
        
        # Check that all expected skill levels are present
        level_values = [level["value"] for level in data["levels"]]
        assert "beginner" in level_values
        assert "intermediate" in level_values
        assert "advanced" in level_values
        assert "expert" in level_values
    
    def test_get_difficulty_levels(self, client):
        """Test difficulty levels endpoint"""
        response = client.get("/api/v1/learning/difficulty-levels")
        
        assert response.status_code == 200
        data = response.json()
        
        assert "levels" in data
        assert "count" in data
        assert len(data["levels"]) == 3  # easy, medium, hard
        
        # Check that all expected difficulty levels are present
        level_values = [level["value"] for level in data["levels"]]
        assert "easy" in level_values
        assert "medium" in level_values
        assert "hard" in level_values


class TestBatchEndpoints:
    """Test batch processing endpoints"""
    
    def test_batch_assess_skills_success(self, client, mock_skill_assessment):
        """Test successful batch skill assessment"""
        request_data = [
            {
                "user_id": "user_1",
                "language": "python",
                "include_weak_areas": True
            },
            {
                "user_id": "user_2",
                "language": "javascript",
                "include_weak_areas": False
            }
        ]
        
        with patch('src.routers.learning.learning_service.assess_user_skills', return_value=mock_skill_assessment):
            response = client.post("/api/v1/learning/batch-assess-skills", json=request_data)
        
        assert response.status_code == 200
        data = response.json()
        
        assert "batch_id" in data
        assert data["total_requests"] == 2
        assert data["successful"] == 2
        assert data["failed"] == 0
        assert len(data["results"]) == 2
        
        # Check result structure
        for result in data["results"]:
            assert result["status"] == "success"
            assert "user_id" in result
            assert "assessment" in result
    
    def test_batch_assess_skills_too_many_requests(self, client):
        """Test batch assessment with too many requests"""
        request_data = [
            {"user_id": f"user_{i}", "language": "python"}
            for i in range(15)  # More than limit of 10
        ]
        
        response = client.post("/api/v1/learning/batch-assess-skills", json=request_data)
        assert response.status_code == 400
        assert "Batch size cannot exceed 10 requests" in response.json()["detail"]
    
    def test_batch_assess_skills_missing_user_id(self, client):
        """Test batch assessment with missing user ID"""
        request_data = [
            {"language": "python"}  # Missing user_id
        ]
        
        response = client.post("/api/v1/learning/batch-assess-skills", json=request_data)
        assert response.status_code == 400
        assert "User ID is required" in response.json()["detail"]
    
    def test_batch_assess_skills_partial_failure(self, client, mock_skill_assessment):
        """Test batch assessment with partial failures"""
        request_data = [
            {"user_id": "user_1", "language": "python"},
            {"user_id": "user_2", "language": "python"}
        ]
        
        # Mock service to fail for second user
        def mock_assess_skills(request):
            if request.user_id == "user_2":
                raise Exception("Assessment failed")
            return mock_skill_assessment
        
        with patch('src.routers.learning.learning_service.assess_user_skills', side_effect=mock_assess_skills):
            response = client.post("/api/v1/learning/batch-assess-skills", json=request_data)
        
        assert response.status_code == 200
        data = response.json()
        
        assert data["total_requests"] == 2
        assert data["successful"] == 1
        assert data["failed"] == 1
        
        # Check that one succeeded and one failed
        statuses = [result["status"] for result in data["results"]]
        assert "success" in statuses
        assert "error" in statuses


class TestLearningMetricsEndpoints:
    """Test learning metrics endpoints"""
    
    def test_get_learning_metrics(self, client):
        """Test learning metrics endpoint"""
        response = client.get("/api/v1/learning/learning-metrics")
        
        assert response.status_code == 200
        data = response.json()
        
        assert data["service"] == "Learning Service"
        assert data["version"] == "1.0.0"
        assert "supported_concepts" in data
        assert "supported_languages" in data
        assert "skill_levels" in data
        assert "difficulty_levels" in data
        
        # Check that numeric values are present (even if N/A)
        assert "total_learning_resources" in data
        assert "total_assessments_performed" in data
        assert "total_learning_paths_generated" in data


if __name__ == "__main__":
    pytest.main([__file__])