# Intelligent Learning Systems

This document describes the intelligent hint and learning systems implemented in the AI Analysis Service.

## Overview

The learning systems provide AI-powered personalized learning experiences including:

- **Progressive Hint Generation**: Context-aware hints that guide users without revealing solutions
- **Skill Assessment**: Comprehensive analysis of user programming skills and weak areas
- **Learning Path Generation**: Personalized learning paths based on user goals and current skills
- **Contextual Recommendations**: Smart recommendations based on user context and recent activity
- **Performance Pattern Analysis**: Analysis of user performance patterns over time
- **Difficulty Progression**: Intelligent recommendations for when to advance to harder problems

## Core Components

### 1. Learning Service (`learning_service.py`)

The main service that orchestrates all learning functionality:

```python
from src.services.learning_service import LearningService

learning_service = LearningService()

# Assess user skills
assessment = await learning_service.assess_user_skills(request)

# Generate learning path
path = await learning_service.generate_learning_path(request)

# Get contextual recommendations
recommendations = await learning_service.generate_contextual_recommendations(request)
```

### 2. Learning Models (`models/learning.py`)

Comprehensive data models for all learning-related functionality:

- `SkillAssessment`: User skill analysis results
- `LearningPath`: Personalized learning paths
- `ProgressiveHint`: Context-aware hints
- `ContextualRecommendation`: Smart recommendations
- `PerformancePattern`: Performance analysis results
- `DifficultyProgression`: Difficulty advancement recommendations

### 3. API Endpoints (`routers/learning.py`)

RESTful API endpoints for all learning functionality:

- `POST /api/v1/learning/assess-skills`: Skill assessment
- `POST /api/v1/learning/generate-learning-path`: Learning path generation
- `POST /api/v1/learning/recommendations`: Contextual recommendations
- `POST /api/v1/learning/progressive-hints`: Progressive hints
- `GET /api/v1/learning/performance-patterns/{user_id}`: Performance analysis
- `GET /api/v1/learning/difficulty-progression/{user_id}`: Difficulty progression

## Key Features

### Progressive Hint Generation

Generates context-aware hints that progressively guide users toward solutions:

```python
# Request progressive hints
request = ProgressiveHintRequest(
    user_id="user123",
    problem_id="two_sum",
    current_code="def solution(nums, target): pass",
    language=ProgrammingLanguage.PYTHON,
    hint_level=3
)

hints = await learning_service.generate_progressive_hints(request)

# Example hints:
# Level 1: "Think about what data structure allows O(1) lookups"
# Level 2: "Consider using a hash map to store values you've seen"
# Level 3: "For each number, check if target - number exists in your hash map"
```

**Features:**
- AI-powered hint generation using LLM
- Progressive difficulty (levels 1-5)
- Context awareness based on user's current code
- Learning objectives for each hint
- Concept-focused guidance

### Skill Assessment Engine

Comprehensive analysis of user programming skills:

```python
# Assess user skills
request = SkillAssessmentRequest(
    user_id="user123",
    language=ProgrammingLanguage.PYTHON,
    include_weak_areas=True,
    assessment_depth="comprehensive"
)

assessment = await learning_service.assess_user_skills(request)

print(f"Overall skill level: {assessment.overall_skill_level}")
print(f"Concept scores: {assessment.concept_scores}")
print(f"Weak areas: {len(assessment.weak_areas)}")
```

**Analysis includes:**
- Overall skill level (Beginner, Intermediate, Advanced, Expert)
- Performance by concept category (algorithms, data structures, etc.)
- Weak area identification with improvement suggestions
- Strong area recognition
- Accuracy rates and problem-solving statistics

### Personalized Learning Paths

Generate customized learning paths based on user goals and current skills:

```python
# Generate learning path
request = LearningPathRequest(
    user_id="user123",
    target_concepts=[ConceptCategory.ALGORITHMS, ConceptCategory.DATA_STRUCTURES],
    time_commitment=10,  # hours per week
    preferred_difficulty=DifficultyLevel.MEDIUM
)

path = await learning_service.generate_learning_path(request)

print(f"Learning path: {path.title}")
print(f"Estimated duration: {path.estimated_duration} hours")
print(f"Resources: {len(path.resources)}")
print(f"Practice problems: {len(path.practice_problems)}")
```

**Features:**
- Personalized based on current skill assessment
- Adaptive difficulty progression
- Curated learning resources
- Practice problem recommendations
- Progress milestones
- Time-based planning

### Context-Aware Recommendations

Smart recommendations based on user context and recent activity:

```python
# Get recommendations for problem solving
request = RecommendationRequest(
    user_id="user123",
    context="problem_solving",
    recent_code="def solution(arr): return sorted(arr)",
    language=ProgrammingLanguage.PYTHON,
    max_recommendations=5
)

recommendations = await learning_service.generate_contextual_recommendations(request)
```

**Context types:**
- `problem_solving`: Based on recent code submissions
- `skill_gap`: Based on identified weak areas
- `interview_prep`: Focused on interview concepts
- `general`: General learning recommendations

### Performance Pattern Analysis

Analyze user performance patterns to provide insights:

```python
# Analyze performance patterns
patterns = await learning_service.analyze_performance_patterns("user123")

for pattern in patterns:
    print(f"Pattern: {pattern.pattern_type}")
    print(f"Insights: {pattern.insights}")
    print(f"Recommendations: {pattern.recommendations}")
```

**Pattern types:**
- Time-based patterns (best/worst hours for coding)
- Difficulty progression patterns
- Concept performance patterns
- Consistency analysis

### Difficulty Progression

Intelligent recommendations for advancing to harder problems:

```python
# Get difficulty progression recommendation
progression = await learning_service.recommend_difficulty_progression("user123")

print(f"Current level: {progression.current_level}")
print(f"Recommended level: {progression.recommended_level}")
print(f"Readiness score: {progression.readiness_score:.2%}")
print(f"Estimated success rate: {progression.estimated_success_rate:.2%}")
```

**Features:**
- Readiness score calculation
- Success rate estimation
- Supporting evidence
- Prerequisite skill identification

## API Usage Examples

### Skill Assessment

```bash
curl -X POST "http://localhost:8000/api/v1/learning/assess-skills" \
  -H "Content-Type: application/json" \
  -d '{
    "user_id": "user123",
    "language": "python",
    "include_weak_areas": true,
    "assessment_depth": "standard"
  }'
```

### Learning Path Generation

```bash
curl -X POST "http://localhost:8000/api/v1/learning/generate-learning-path" \
  -H "Content-Type: application/json" \
  -d '{
    "user_id": "user123",
    "target_concepts": ["algorithms", "data_structures"],
    "time_commitment": 10,
    "preferred_difficulty": "medium"
  }'
```

### Progressive Hints

```bash
curl -X POST "http://localhost:8000/api/v1/learning/progressive-hints" \
  -H "Content-Type: application/json" \
  -d '{
    "user_id": "user123",
    "problem_id": "two_sum",
    "current_code": "def solution(nums, target): pass",
    "language": "python",
    "hint_level": 2
  }'
```

### Contextual Recommendations

```bash
curl -X POST "http://localhost:8000/api/v1/learning/recommendations" \
  -H "Content-Type: application/json" \
  -d '{
    "user_id": "user123",
    "context": "problem_solving",
    "recent_code": "def solution(arr): return sorted(arr)",
    "language": "python",
    "max_recommendations": 5
  }'
```

## Concept Categories

The system supports 15 concept categories:

- **Algorithms**: General algorithmic thinking
- **Data Structures**: Arrays, lists, trees, graphs, etc.
- **Dynamic Programming**: DP problems and optimization
- **Graph Theory**: Graph algorithms and traversal
- **Tree Algorithms**: Tree-specific algorithms
- **String Processing**: String manipulation and parsing
- **Sorting & Searching**: Sorting and search algorithms
- **Recursion**: Recursive problem solving
- **Greedy Algorithms**: Greedy approach problems
- **Backtracking**: Backtracking and constraint satisfaction
- **Math & Number Theory**: Mathematical problems
- **Bit Manipulation**: Bitwise operations
- **System Design**: High-level system design
- **Object-Oriented**: OOP concepts and design patterns
- **Functional Programming**: Functional programming concepts

## Skill Levels

Four skill levels are supported:

- **Beginner**: New to programming or specific concepts
- **Intermediate**: Comfortable with basics, learning advanced concepts
- **Advanced**: Strong skills, tackling complex problems
- **Expert**: Mastery level, can solve most problems efficiently

## Difficulty Levels

Three difficulty levels for problems and resources:

- **Easy**: Fundamental concepts, straightforward implementation
- **Medium**: Moderate complexity, requires good understanding
- **Hard**: Complex problems, advanced algorithms and optimization

## Configuration

The learning systems can be configured through environment variables:

```env
# AI Configuration
AI_MODEL_PROVIDER=openai
AI_MODEL_NAME=gpt-4
OPENAI_API_KEY=your_key_here

# Analysis Configuration
MAX_CODE_LENGTH=50000
ANALYSIS_TIMEOUT=30

# Database Configuration
DATABASE_URL=postgresql+asyncpg://user:password@localhost:5432/db
REDIS_URL=redis://localhost:6379/0
```

## Testing

Comprehensive tests are provided:

```bash
# Run learning service tests
python -m pytest tests/test_learning_service.py -v

# Run API endpoint tests
python -m pytest tests/test_learning_endpoints.py -v

# Run integration tests
python test_learning_integration.py
```

## Performance Considerations

- **Caching**: Results are cached in Redis for improved performance
- **Async Processing**: All operations are asynchronous
- **Batch Operations**: Support for batch processing multiple requests
- **Rate Limiting**: Built-in rate limiting for API endpoints
- **Database Optimization**: Efficient queries and indexing

## Error Handling

Robust error handling with:

- Graceful degradation when AI services are unavailable
- Fallback responses for critical functionality
- Comprehensive logging and monitoring
- User-friendly error messages

## Future Enhancements

Planned improvements:

- **Machine Learning Models**: Custom ML models for better predictions
- **Real-time Learning**: Live adaptation based on user behavior
- **Collaborative Filtering**: Recommendations based on similar users
- **Advanced Analytics**: More sophisticated performance analysis
- **Multi-language Support**: Support for more programming languages
- **Integration with LMS**: Learning Management System integration

## Dependencies

Key dependencies:

- **FastAPI**: Web framework
- **Pydantic**: Data validation
- **SQLAlchemy**: Database ORM
- **Redis**: Caching and session storage
- **OpenAI/Anthropic**: AI/LLM services
- **Pytest**: Testing framework

## Contributing

When contributing to the learning systems:

1. Follow the existing code structure and patterns
2. Add comprehensive tests for new functionality
3. Update documentation and examples
4. Consider performance and scalability implications
5. Ensure error handling and fallback mechanisms

## License

This learning system is part of the AI-powered coding platform and follows the same licensing terms.