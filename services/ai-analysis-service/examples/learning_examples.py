"""
Examples demonstrating the intelligent learning systems
"""
import asyncio
import sys
import os

# Add parent directory to path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from src.services.learning_service import LearningService
from src.models.learning import (
    SkillAssessmentRequest, LearningPathRequest, RecommendationRequest,
    ProgressiveHintRequest, ConceptCategory
)
from src.models.analysis import ProgrammingLanguage


async def example_skill_assessment():
    """Example: Assess user programming skills"""
    print("=== Skill Assessment Example ===")
    
    learning_service = LearningService()
    
    # Create assessment request
    request = SkillAssessmentRequest(
        user_id="example_user",
        language=ProgrammingLanguage.PYTHON,
        include_weak_areas=True,
        assessment_depth="standard"
    )
    
    # Perform assessment
    assessment = await learning_service.assess_user_skills(request)
    
    print(f"User: {assessment.user_id}")
    print(f"Language: {assessment.language}")
    print(f"Overall Skill Level: {assessment.overall_skill_level}")
    print(f"Problems Solved: {assessment.total_problems_solved}")
    print(f"Accuracy Rate: {assessment.accuracy_rate:.1%}")
    
    if assessment.concept_scores:
        print("\nConcept Scores:")
        for concept, score in assessment.concept_scores.items():
            print(f"  {concept.value.replace('_', ' ').title()}: {score:.1%}")
    
    if assessment.weak_areas:
        print(f"\nWeak Areas ({len(assessment.weak_areas)}):")
        for weak_area in assessment.weak_areas:
            print(f"  {weak_area.concept.value.replace('_', ' ').title()}: {weak_area.confidence_score:.1%}")
            for suggestion in weak_area.improvement_suggestions[:2]:
                print(f"    - {suggestion}")
    
    if assessment.strong_areas:
        print(f"\nStrong Areas: {[area.value.replace('_', ' ').title() for area in assessment.strong_areas]}")


async def example_learning_path():
    """Example: Generate personalized learning path"""
    print("\n=== Learning Path Generation Example ===")
    
    learning_service = LearningService()
    
    # Create learning path request
    request = LearningPathRequest(
        user_id="example_user",
        target_concepts=[
            ConceptCategory.ALGORITHMS,
            ConceptCategory.DATA_STRUCTURES,
            ConceptCategory.DYNAMIC_PROGRAMMING
        ],
        time_commitment=8,  # 8 hours per week
        preferred_difficulty=None,  # Let system decide
        learning_style="mixed"
    )
    
    # Generate learning path
    path = await learning_service.generate_learning_path(request)
    
    print(f"Learning Path: {path.title}")
    print(f"Description: {path.description}")
    print(f"Target Concepts: {[c.value.replace('_', ' ').title() for c in path.target_concepts]}")
    print(f"Total Steps: {path.total_steps}")
    print(f"Estimated Duration: {path.estimated_duration} hours")
    print(f"Current Progress: {path.completion_percentage}%")
    
    print(f"\nDifficulty Progression: {[d.value.title() for d in path.difficulty_progression]}")
    
    if path.resources:
        print(f"\nLearning Resources ({len(path.resources)}):")
        for resource in path.resources[:3]:  # Show first 3
            print(f"  - {resource.title} ({resource.type.value}, {resource.difficulty.value})")
            print(f"    {resource.description}")
            if resource.estimated_time:
                print(f"    Estimated time: {resource.estimated_time} minutes")
    
    if path.practice_problems:
        print(f"\nPractice Problems ({len(path.practice_problems)}):")
        for problem in path.practice_problems[:5]:  # Show first 5
            print(f"  - {problem}")
    
    if path.milestones:
        print(f"\nMilestones ({len(path.milestones)}):")
        for i, milestone in enumerate(path.milestones, 1):
            print(f"  {i}. {milestone}")


async def example_contextual_recommendations():
    """Example: Get contextual recommendations"""
    print("\n=== Contextual Recommendations Example ===")
    
    learning_service = LearningService()
    
    # Example 1: Problem-solving context
    request1 = RecommendationRequest(
        user_id="example_user",
        problem_id="two_sum",
        context="problem_solving",
        recent_code="""
def two_sum(nums, target):
    for i in range(len(nums)):
        for j in range(i + 1, len(nums)):
            if nums[i] + nums[j] == target:
                return [i, j]
    return []
        """,
        language=ProgrammingLanguage.PYTHON,
        max_recommendations=3
    )
    
    recommendations1 = await learning_service.generate_contextual_recommendations(request1)
    
    print("Problem-Solving Context:")
    print(f"  Reasoning: {recommendations1.reasoning}")
    print(f"  Priority: {recommendations1.priority}")
    print(f"  Resources ({len(recommendations1.recommended_resources)}):")
    for resource in recommendations1.recommended_resources:
        print(f"    - {resource.title} ({resource.type.value})")
    print(f"  Recommended Problems: {recommendations1.recommended_problems}")
    
    # Example 2: Interview prep context
    request2 = RecommendationRequest(
        user_id="example_user",
        context="interview_prep",
        max_recommendations=5,
        language=ProgrammingLanguage.PYTHON,
        problem_id=None,
        recent_code=None
    )
    
    recommendations2 = await learning_service.generate_contextual_recommendations(request2)
    
    print(f"\nInterview Preparation Context:")
    print(f"  Reasoning: {recommendations2.reasoning}")
    print(f"  Resources ({len(recommendations2.recommended_resources)}):")
    for resource in recommendations2.recommended_resources[:3]:
        print(f"    - {resource.title} ({resource.difficulty.value})")
    print(f"  Recommended Problems: {recommendations2.recommended_problems}")


async def example_progressive_hints():
    """Example: Generate progressive hints"""
    print("\n=== Progressive Hints Example ===")
    
    learning_service = LearningService()
    
    # Example: User stuck on two sum problem
    request = ProgressiveHintRequest(
        user_id="example_user",
        problem_id="two_sum",
        current_code="""
def two_sum(nums, target):
    # I know I need to find two numbers that add up to target
    # But I'm not sure how to do it efficiently
    pass
        """,
        language=ProgrammingLanguage.PYTHON,
        hint_level=3,
        previous_hints=[],
        stuck_duration=15  # 15 minutes
    )
    
    hints = await learning_service.generate_progressive_hints(request)
    
    print(f"Progressive Hints for Two Sum Problem:")
    print(f"User has been stuck for {request.stuck_duration} minutes")
    print(f"Generated {len(hints)} hints:")
    
    for hint in hints:
        print(f"\n  Level {hint.level} ({hint.type}):")
        print(f"    {hint.content}")
        if hint.learning_objective:
            print(f"    Learning Objective: {hint.learning_objective}")
        if hint.code_snippet:
            print(f"    Code Example: {hint.code_snippet}")
        if hint.reveals_solution:
            print(f"    ⚠️  This hint reveals part of the solution")


async def example_performance_analysis():
    """Example: Analyze performance patterns"""
    print("\n=== Performance Pattern Analysis Example ===")
    
    learning_service = LearningService()
    
    # Analyze performance patterns
    patterns = await learning_service.analyze_performance_patterns("example_user")
    
    if patterns:
        print(f"Found {len(patterns)} performance patterns:")
        
        for pattern in patterns:
            print(f"\n  Pattern Type: {pattern.pattern_type.replace('_', ' ').title()}")
            print(f"  Confidence: {pattern.confidence:.1%}")
            
            if pattern.insights:
                print("  Insights:")
                for insight in pattern.insights:
                    print(f"    - {insight}")
            
            if pattern.recommendations:
                print("  Recommendations:")
                for recommendation in pattern.recommendations:
                    print(f"    - {recommendation}")
    else:
        print("No performance patterns found (insufficient data)")


async def example_difficulty_progression():
    """Example: Get difficulty progression recommendation"""
    print("\n=== Difficulty Progression Example ===")
    
    learning_service = LearningService()
    
    # Get difficulty progression recommendation
    progression = await learning_service.recommend_difficulty_progression("example_user")
    
    print(f"Current Difficulty Level: {progression.current_level.value.title()}")
    print(f"Recommended Level: {progression.recommended_level.value.title()}")
    print(f"Readiness Score: {progression.readiness_score:.1%}")
    print(f"Estimated Success Rate: {progression.estimated_success_rate:.1%}")
    
    if progression.supporting_evidence:
        print("\nSupporting Evidence:")
        for evidence in progression.supporting_evidence:
            print(f"  - {evidence}")
    
    if progression.prerequisite_skills:
        print(f"\nPrerequisite Skills:")
        for skill in progression.prerequisite_skills:
            print(f"  - {skill.value.replace('_', ' ').title()}")
    
    # Recommendation
    if progression.recommended_level != progression.current_level:
        print(f"\n✅ Ready to advance to {progression.recommended_level.value} problems!")
    else:
        print(f"\n📚 Continue practicing {progression.current_level.value} problems")


async def main():
    """Run all examples"""
    print("🎓 Intelligent Learning Systems Examples")
    print("=" * 50)
    
    try:
        await example_skill_assessment()
        await example_learning_path()
        await example_contextual_recommendations()
        await example_progressive_hints()
        await example_performance_analysis()
        await example_difficulty_progression()
        
        print("\n" + "=" * 50)
        print("✅ All examples completed successfully!")
        
    except Exception as e:
        print(f"\n❌ Error running examples: {e}")


if __name__ == "__main__":
    asyncio.run(main())