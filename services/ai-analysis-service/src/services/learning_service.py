"""
Intelligent learning and recommendation service
"""
import logging
import uuid
import json
from datetime import datetime, timedelta
from typing import List, Dict, Optional, Tuple
import asyncio
from collections import defaultdict, Counter

from ..models.learning import (
    SkillAssessment, SkillAssessmentRequest, SkillLevel, ConceptCategory,
    WeakArea, LearningPath, LearningPathRequest, LearningResource,
    ContextualRecommendation, RecommendationRequest, ProgressiveHint,
    ProgressiveHintRequest, PerformancePattern, DifficultyProgression,
    DifficultyLevel, LearningResourceType
)
from ..models.analysis import ProgrammingLanguage, SeverityLevel
from ..core.ai_client import generate_completion, analyze_code_with_ai
from ..core.redis_client import cache_get, cache_set
from ..core.database import get_database

logger = logging.getLogger(__name__)


class LearningService:
    """Intelligent learning and recommendation service"""
    
    def __init__(self):
        self.concept_keywords = self._initialize_concept_keywords()
        self.learning_resources_db = self._initialize_learning_resources()
    
    def _initialize_concept_keywords(self) -> Dict[ConceptCategory, List[str]]:
        """Initialize concept detection keywords"""
        return {
            ConceptCategory.ALGORITHMS: [
                "algorithm", "sort", "search", "complexity", "optimization",
                "divide and conquer", "brute force", "efficient"
            ],
            ConceptCategory.DATA_STRUCTURES: [
                "array", "list", "stack", "queue", "heap", "hash", "map",
                "set", "tree", "graph", "linked list", "dictionary"
            ],
            ConceptCategory.DYNAMIC_PROGRAMMING: [
                "dp", "dynamic programming", "memoization", "tabulation",
                "optimal substructure", "overlapping subproblems"
            ],
            ConceptCategory.GRAPH_THEORY: [
                "graph", "node", "edge", "vertex", "bfs", "dfs", "dijkstra",
                "shortest path", "connected components", "cycle"
            ],
            ConceptCategory.TREE_ALGORITHMS: [
                "tree", "binary tree", "bst", "traversal", "inorder",
                "preorder", "postorder", "leaf", "root", "subtree"
            ],
            ConceptCategory.STRING_PROCESSING: [
                "string", "substring", "pattern", "regex", "parsing",
                "tokenization", "matching", "character"
            ],
            ConceptCategory.RECURSION: [
                "recursion", "recursive", "base case", "recursive call",
                "stack overflow", "tail recursion"
            ],
            ConceptCategory.GREEDY_ALGORITHMS: [
                "greedy", "local optimum", "greedy choice", "activity selection",
                "minimum spanning tree", "huffman"
            ],
            ConceptCategory.BACKTRACKING: [
                "backtrack", "backtracking", "permutation", "combination",
                "n-queens", "sudoku", "constraint satisfaction"
            ],
            ConceptCategory.BIT_MANIPULATION: [
                "bit", "bitwise", "xor", "and", "or", "shift", "mask",
                "binary", "bit manipulation"
            ]
        }
    
    def _initialize_learning_resources(self) -> Dict[ConceptCategory, List[LearningResource]]:
        """Initialize learning resources database"""
        resources = {}
        
        # Sample resources for each concept
        for concept in ConceptCategory:
            resources[concept] = [
                LearningResource(
                    id=f"{concept.value}_article_1",
                    title=f"Introduction to {concept.value.replace('_', ' ').title()}",
                    description=f"Comprehensive guide to {concept.value.replace('_', ' ')}",
                    type=LearningResourceType.ARTICLE,
                    difficulty=DifficultyLevel.EASY,
                    concepts=[concept],
                    estimated_time=30,
                    rating=4.2,
                    relevance_score=0.8,
                    url=None
                ),
                LearningResource(
                    id=f"{concept.value}_video_1",
                    title=f"Mastering {concept.value.replace('_', ' ').title()}",
                    description=f"Video tutorial on {concept.value.replace('_', ' ')}",
                    type=LearningResourceType.VIDEO,
                    difficulty=DifficultyLevel.MEDIUM,
                    concepts=[concept],
                    estimated_time=45,
                    rating=4.5,
                    relevance_score=0.9,
                    url = None
                )
            ]
        
        return resources
    
    async def assess_user_skills(self, request: SkillAssessmentRequest) -> SkillAssessment:
        """Perform comprehensive skill assessment for a user"""
        try:
            logger.info(f"Starting skill assessment for user {request.user_id}")
            
            # Check cache first
            cache_key = f"skill_assessment:{request.user_id}:{request.language.value}"
            cached_assessment = await cache_get(cache_key)
            
            if cached_assessment and request.assessment_depth != "comprehensive":
                return SkillAssessment(**cached_assessment)
            
            # Get user's submission history from database
            db = await get_database()
            user_submissions = await self._get_user_submissions(db, request.user_id, request.language)
            
            # Analyze performance patterns
            concept_scores = await self._analyze_concept_performance(user_submissions)
            weak_areas = await self._identify_weak_areas(user_submissions, concept_scores)
            strong_areas = self._identify_strong_areas(concept_scores)
            
            # Determine overall skill level
            overall_skill = self._calculate_overall_skill_level(concept_scores, user_submissions)
            
            # Calculate accuracy rate
            total_submissions = len(user_submissions)
            successful_submissions = len([s for s in user_submissions if s.get('status') == 'accepted'])
            accuracy_rate = successful_submissions / total_submissions if total_submissions > 0 else 0.0
            
            assessment = SkillAssessment(
                user_id=request.user_id,
                language=request.language,
                overall_skill_level=overall_skill,
                concept_scores=concept_scores,
                weak_areas=weak_areas if request.include_weak_areas else [],
                strong_areas=strong_areas,
                total_problems_solved=successful_submissions,
                accuracy_rate=accuracy_rate
            )
            
            # Cache assessment
            await cache_set(cache_key, assessment.dict(), expire=3600)
            
            logger.info(f"Completed skill assessment for user {request.user_id}")
            return assessment
            
        except Exception as e:
            logger.error(f"Skill assessment failed for user {request.user_id}: {e}")
            # Return basic assessment
            return SkillAssessment(
                user_id=request.user_id,
                language=request.language,
                overall_skill_level=SkillLevel.BEGINNER,
                concept_scores={},
                weak_areas=[],
                strong_areas=[]
            )
    
    async def generate_learning_path(self, request: LearningPathRequest) -> LearningPath:
        """Generate personalized learning path"""
        try:
            logger.info(f"Generating learning path for user {request.user_id}")
            
            # Get user's current skill assessment
            skill_request = SkillAssessmentRequest(
                user_id=request.user_id,
                language=ProgrammingLanguage.PYTHON,  # Default, could be parameterized
                include_weak_areas=True
            )
            skill_assessment = await self.assess_user_skills(skill_request)
            
            # Generate path based on target concepts and current skills
            path_id = str(uuid.uuid4())
            
            # Determine difficulty progression
            difficulty_progression = self._plan_difficulty_progression(
                skill_assessment, request.target_concepts, request.time_commitment
            )
            
            # Select appropriate resources
            resources = self._select_learning_resources(
                request.target_concepts, skill_assessment, difficulty_progression
            )
            
            # Generate practice problems
            practice_problems = await self._recommend_practice_problems(
                request.target_concepts, skill_assessment
            )
            
            # Create milestones
            milestones = self._create_learning_milestones(request.target_concepts)
            
            # Estimate duration
            estimated_duration = self._estimate_learning_duration(
                resources, request.time_commitment
            )
            
            learning_path = LearningPath(
                id=path_id,
                user_id=request.user_id,
                title=f"Personalized Path: {', '.join([c.value.replace('_', ' ').title() for c in request.target_concepts[:3]])}",
                description=f"Customized learning path focusing on {len(request.target_concepts)} key concepts",
                target_concepts=request.target_concepts,
                total_steps=len(resources) + len(practice_problems),
                estimated_duration=estimated_duration,
                difficulty_progression=difficulty_progression,
                resources=resources,
                practice_problems=practice_problems,
                milestones=milestones
            )
            
            # Cache the learning path
            cache_key = f"learning_path:{path_id}"
            await cache_set(cache_key, learning_path.dict(), expire=86400)  # 24 hours
            
            logger.info(f"Generated learning path {path_id} for user {request.user_id}")
            return learning_path
            
        except Exception as e:
            logger.error(f"Learning path generation failed for user {request.user_id}: {e}")
            raise
    
    async def generate_contextual_recommendations(self, request: RecommendationRequest) -> ContextualRecommendation:
        """Generate context-aware learning recommendations"""
        try:
            logger.info(f"Generating recommendations for user {request.user_id}, context: {request.context}")
            
            recommendation_id = str(uuid.uuid4())
            
            # Analyze context and determine recommendation strategy
            if request.context == "problem_solving" and request.recent_code:
                # Analyze recent code for concept gaps
                concepts_used = await self._analyze_code_concepts(request.recent_code, request.language)
                recommended_resources = self._get_concept_resources(concepts_used)
                reasoning = "Based on your recent code, focusing on strengthening these concepts"
                
            elif request.context == "skill_gap":
                # Get skill assessment and recommend for weak areas
                skill_request = SkillAssessmentRequest(
                    user_id=request.user_id,
                    language=request.language or ProgrammingLanguage.PYTHON
                )
                skill_assessment = await self.assess_user_skills(skill_request)
                
                weak_concepts = [wa.concept for wa in skill_assessment.weak_areas[:3]]
                recommended_resources = self._get_concept_resources(weak_concepts)
                reasoning = "Recommendations based on identified skill gaps"
                
            elif request.context == "interview_prep":
                # Focus on common interview concepts
                interview_concepts = [
                    ConceptCategory.ALGORITHMS,
                    ConceptCategory.DATA_STRUCTURES,
                    ConceptCategory.DYNAMIC_PROGRAMMING,
                    ConceptCategory.GRAPH_THEORY
                ]
                recommended_resources = self._get_concept_resources(interview_concepts)
                reasoning = "Essential concepts for technical interviews"
                
            else:
                # General recommendations
                recommended_resources = self._get_general_recommendations()
                reasoning = "General learning recommendations"
            
            # Limit recommendations
            recommended_resources = recommended_resources[:request.max_recommendations]
            
            # Get recommended problems
            recommended_problems = await self._get_contextual_problems(
                request.context, request.user_id
            )
            
            recommendation = ContextualRecommendation(
                recommendation_id=recommendation_id,
                user_id=request.user_id,
                context=request.context,
                recommended_resources=recommended_resources,
                recommended_problems=recommended_problems,
                reasoning=reasoning,
                priority=SeverityLevel.MEDIUM,
                expires_date=datetime.utcnow() + timedelta(days=7)
            )
            
            logger.info(f"Generated {len(recommended_resources)} recommendations for user {request.user_id}")
            return recommendation
            
        except Exception as e:
            logger.error(f"Recommendation generation failed for user {request.user_id}: {e}")
            raise
    
    async def generate_progressive_hints(self, request: ProgressiveHintRequest) -> List[ProgressiveHint]:
        """Generate progressive, context-aware hints"""
        try:
            logger.info(f"Generating progressive hints for user {request.user_id}, problem {request.problem_id}")
            
            # Check cache
            cache_key = f"progressive_hints:{request.problem_id}:{hash(request.current_code)}:{request.hint_level}"
            cached_hints = await cache_get(cache_key)
            
            if cached_hints:
                return [ProgressiveHint(**hint) for hint in cached_hints]
            
            # Analyze current code to understand user's approach
            code_analysis = await self._analyze_code_approach(request.current_code, request.language)
            
            # Identify the concept focus
            concept_focus = await self._identify_problem_concepts(request.problem_id)
            
            # Generate hints using AI with context
            hints = await self._generate_ai_hints(
                request, code_analysis, concept_focus
            )
            
            # Enhance hints with learning objectives
            enhanced_hints = self._enhance_hints_with_learning_objectives(hints, concept_focus)
            
            # Cache hints
            await cache_set(cache_key, [hint.dict() for hint in enhanced_hints], expire=1800)
            
            logger.info(f"Generated {len(enhanced_hints)} progressive hints")
            return enhanced_hints
            
        except Exception as e:
            logger.error(f"Progressive hint generation failed: {e}")
            # Return fallback hints
            return [
                ProgressiveHint(
                    level=1,
                    content="Consider breaking down the problem into smaller steps.",
                    type="conceptual",
                    reveals_solution=False,
                    learning_objective="Problem decomposition skills",
                    code_snippet=None,
                    concept_focus=None
                )
            ]
    
    async def analyze_performance_patterns(self, user_id: str) -> List[PerformancePattern]:
        """Analyze user performance patterns"""
        try:
            logger.info(f"Analyzing performance patterns for user {user_id}")
            
            # Get user submission history
            db = await get_database()
            submissions = await self._get_user_submissions(db, user_id)
            
            patterns = []
            
            # Time-based patterns
            time_pattern = self._analyze_time_patterns(submissions)
            if time_pattern:
                patterns.append(time_pattern)
            
            # Difficulty progression patterns
            difficulty_pattern = self._analyze_difficulty_patterns(submissions)
            if difficulty_pattern:
                patterns.append(difficulty_pattern)
            
            # Concept performance patterns
            concept_pattern = self._analyze_concept_patterns(submissions)
            if concept_pattern:
                patterns.append(concept_pattern)
            
            logger.info(f"Identified {len(patterns)} performance patterns")
            return patterns
            
        except Exception as e:
            logger.error(f"Performance pattern analysis failed for user {user_id}: {e}")
            return []
    
    async def recommend_difficulty_progression(self, user_id: str) -> DifficultyProgression:
        """Recommend difficulty progression for user"""
        try:
            logger.info(f"Analyzing difficulty progression for user {user_id}")
            
            # Get recent performance data
            db = await get_database()
            recent_submissions = await self._get_recent_submissions(db, user_id, days=30)
            
            # Analyze current performance level
            current_level = self._determine_current_difficulty_level(recent_submissions)
            
            # Calculate readiness for next level
            readiness_score = self._calculate_readiness_score(recent_submissions, current_level)
            
            # Determine recommended level
            if readiness_score >= 0.8:
                recommended_level = self._get_next_difficulty_level(current_level)
            else:
                recommended_level = current_level
            
            # Generate supporting evidence
            evidence = self._generate_progression_evidence(recent_submissions, readiness_score)
            
            # Identify prerequisite skills
            prerequisites = self._identify_prerequisite_skills(recommended_level)
            
            # Estimate success rate
            success_rate = min(readiness_score * 1.2, 1.0)
            
            progression = DifficultyProgression(
                user_id=user_id,
                current_level=current_level,
                recommended_level=recommended_level,
                readiness_score=readiness_score,
                supporting_evidence=evidence,
                prerequisite_skills=prerequisites,
                estimated_success_rate=success_rate
            )
            
            logger.info(f"Recommended progression from {current_level} to {recommended_level}")
            return progression
            
        except Exception as e:
            logger.error(f"Difficulty progression analysis failed for user {user_id}: {e}")
            # Return safe default
            return DifficultyProgression(
                user_id=user_id,
                current_level=DifficultyLevel.EASY,
                recommended_level=DifficultyLevel.EASY,
                readiness_score=0.5,
                supporting_evidence=["Insufficient data for analysis"],
                prerequisite_skills=[],
                estimated_success_rate=0.5
            )
    
    # Helper methods
    
    async def _get_user_submissions(self, db, user_id: str, language: Optional[ProgrammingLanguage] = None) -> List[Dict]:
        """Get user submission history from database"""
        # Mock implementation - in real system, query actual database
        return [
            {
                "id": f"sub_{i}",
                "problem_id": f"problem_{i % 10}",
                "code": f"sample code {i}",
                "language": language.value if language else "python",
                "status": "accepted" if i % 3 == 0 else "wrong_answer",
                "difficulty": ["easy", "medium", "hard"][i % 3],
                "concepts": ["algorithms", "data_structures"][i % 2],
                "submitted_at": datetime.utcnow() - timedelta(days=i),
                "execution_time": 100 + i * 10
            }
            for i in range(20)  # Mock 20 submissions
        ]
    
    async def _get_recent_submissions(self, db, user_id: str, days: int = 30) -> List[Dict]:
        """Get recent user submissions"""
        all_submissions = await self._get_user_submissions(db, user_id)
        cutoff_date = datetime.utcnow() - timedelta(days=days)
        return [s for s in all_submissions if s["submitted_at"] >= cutoff_date]
    
    async def _analyze_concept_performance(self, submissions: List[Dict]) -> Dict[ConceptCategory, float]:
        """Analyze performance by concept"""
        concept_scores = {}
        concept_stats = defaultdict(list)
        
        for submission in submissions:
            concepts = submission.get("concepts", [])
            success = submission.get("status") == "accepted"
            
            for concept_str in concepts:
                try:
                    concept = ConceptCategory(concept_str)
                    concept_stats[concept].append(1.0 if success else 0.0)
                except ValueError:
                    continue
        
        for concept, scores in concept_stats.items():
            concept_scores[concept] = sum(scores) / len(scores) if scores else 0.0
        
        return concept_scores
    
    async def _identify_weak_areas(self, submissions: List[Dict], concept_scores: Dict[ConceptCategory, float]) -> List[WeakArea]:
        """Identify weak areas based on performance"""
        weak_areas = []
        
        for concept, score in concept_scores.items():
            if score < 0.6:  # Threshold for weak area
                # Analyze error patterns for this concept
                concept_submissions = [
                    s for s in submissions 
                    if concept.value in s.get("concepts", [])
                ]
                
                error_patterns = self._analyze_error_patterns(concept_submissions)
                suggestions = self._generate_improvement_suggestions(concept, error_patterns)
                
                weak_area = WeakArea(
                    concept=concept,
                    confidence_score=score,
                    error_patterns=error_patterns,
                    improvement_suggestions=suggestions
                )
                weak_areas.append(weak_area)
        
        return weak_areas
    
    def _identify_strong_areas(self, concept_scores: Dict[ConceptCategory, float]) -> List[ConceptCategory]:
        """Identify strong concept areas"""
        return [concept for concept, score in concept_scores.items() if score >= 0.8]
    
    def _calculate_overall_skill_level(self, concept_scores: Dict[ConceptCategory, float], submissions: List[Dict]) -> SkillLevel:
        """Calculate overall skill level"""
        if not concept_scores:
            return SkillLevel.BEGINNER
        
        avg_score = sum(concept_scores.values()) / len(concept_scores)
        total_problems = len([s for s in submissions if s.get("status") == "accepted"])
        
        if avg_score >= 0.9 and total_problems >= 100:
            return SkillLevel.EXPERT
        elif avg_score >= 0.75 and total_problems >= 50:
            return SkillLevel.ADVANCED
        elif avg_score >= 0.6 and total_problems >= 20:
            return SkillLevel.INTERMEDIATE
        else:
            return SkillLevel.BEGINNER
    
    def _analyze_error_patterns(self, submissions: List[Dict]) -> List[str]:
        """Analyze common error patterns"""
        error_types = [s.get("status", "") for s in submissions if s.get("status") != "accepted"]
        error_counter = Counter(error_types)
        
        patterns = []
        for error_type, count in error_counter.most_common(3):
            if count >= 2:
                patterns.append(f"Frequent {error_type.replace('_', ' ')} errors")
        
        return patterns
    
    def _generate_improvement_suggestions(self, concept: ConceptCategory, error_patterns: List[str]) -> List[str]:
        """Generate improvement suggestions for a concept"""
        suggestions = [
            f"Practice more {concept.value.replace('_', ' ')} problems",
            f"Review fundamental {concept.value.replace('_', ' ')} concepts",
            f"Focus on edge cases in {concept.value.replace('_', ' ')} problems"
        ]
        
        if "time_limit_exceeded" in str(error_patterns):
            suggestions.append("Work on optimizing algorithm efficiency")
        
        if "wrong_answer" in str(error_patterns):
            suggestions.append("Pay attention to problem constraints and edge cases")
        
        return suggestions[:3]
    
    def _plan_difficulty_progression(self, skill_assessment: SkillAssessment, target_concepts: List[ConceptCategory], time_commitment: int) -> List[DifficultyLevel]:
        """Plan difficulty progression based on skill level"""
        if skill_assessment.overall_skill_level == SkillLevel.BEGINNER:
            return [DifficultyLevel.EASY, DifficultyLevel.EASY, DifficultyLevel.MEDIUM]
        elif skill_assessment.overall_skill_level == SkillLevel.INTERMEDIATE:
            return [DifficultyLevel.EASY, DifficultyLevel.MEDIUM, DifficultyLevel.MEDIUM, DifficultyLevel.HARD]
        else:
            return [DifficultyLevel.MEDIUM, DifficultyLevel.HARD, DifficultyLevel.HARD]
    
    def _select_learning_resources(self, target_concepts: List[ConceptCategory], skill_assessment: SkillAssessment, difficulty_progression: List[DifficultyLevel]) -> List[LearningResource]:
        """Select appropriate learning resources"""
        resources = []
        
        for concept in target_concepts:
            concept_resources = self.learning_resources_db.get(concept, [])
            
            # Filter by skill level
            if skill_assessment.overall_skill_level == SkillLevel.BEGINNER:
                filtered_resources = [r for r in concept_resources if r.difficulty in [DifficultyLevel.EASY, DifficultyLevel.MEDIUM]]
            else:
                filtered_resources = concept_resources
            
            # Select top resources
            sorted_resources = sorted(filtered_resources, key=lambda x: x.relevance_score, reverse=True)
            resources.extend(sorted_resources[:2])  # Top 2 per concept
        
        return resources
    
    async def _recommend_practice_problems(self, target_concepts: List[ConceptCategory], skill_assessment: SkillAssessment) -> List[str]:
        """Recommend practice problems"""
        # Mock implementation - in real system, query problem database
        problems = []
        for concept in target_concepts:
            concept_problems = [f"{concept.value}_problem_{i}" for i in range(1, 4)]
            problems.extend(concept_problems)
        
        return problems[:10]  # Limit to 10 problems
    
    def _create_learning_milestones(self, target_concepts: List[ConceptCategory]) -> List[str]:
        """Create learning milestones"""
        milestones = []
        for i, concept in enumerate(target_concepts, 1):
            milestones.append(f"Master {concept.value.replace('_', ' ').title()} fundamentals")
            if i % 2 == 0:
                milestones.append(f"Complete practice problems for concepts 1-{i}")
        
        milestones.append("Complete final assessment")
        return milestones
    
    def _estimate_learning_duration(self, resources: List[LearningResource], time_commitment: int) -> int:
        """Estimate learning duration in hours"""
        total_resource_time = sum(r.estimated_time or 30 for r in resources) / 60  # Convert to hours
        practice_time = len(resources) * 2  # 2 hours practice per resource
        
        total_time = total_resource_time + practice_time
        return int(total_time)
    
    async def _analyze_code_concepts(self, code: str, language: Optional[ProgrammingLanguage]) -> List[ConceptCategory]:
        """Analyze code to identify concepts used"""
        concepts = []
        code_lower = code.lower()
        
        for concept, keywords in self.concept_keywords.items():
            if any(keyword in code_lower for keyword in keywords):
                concepts.append(concept)
        
        return concepts[:5]  # Limit to top 5 concepts
    
    def _get_concept_resources(self, concepts: List[ConceptCategory]) -> List[LearningResource]:
        """Get resources for specific concepts"""
        resources = []
        for concept in concepts:
            concept_resources = self.learning_resources_db.get(concept, [])
            resources.extend(concept_resources[:2])  # Top 2 per concept
        
        return resources
    
    def _get_general_recommendations(self) -> List[LearningResource]:
        """Get general learning recommendations"""
        # Return resources for fundamental concepts
        fundamental_concepts = [
            ConceptCategory.ALGORITHMS,
            ConceptCategory.DATA_STRUCTURES,
            ConceptCategory.RECURSION
        ]
        return self._get_concept_resources(fundamental_concepts)
    
    async def _get_contextual_problems(self, context: str, user_id: str) -> List[str]:
        """Get contextual problem recommendations"""
        # Mock implementation
        if context == "interview_prep":
            return ["two_sum", "reverse_linked_list", "valid_parentheses", "merge_intervals"]
        elif context == "skill_gap":
            return ["easy_array_problem", "basic_string_problem", "simple_tree_problem"]
        else:
            return ["general_problem_1", "general_problem_2", "general_problem_3"]
    
    async def _analyze_code_approach(self, code: str, language: ProgrammingLanguage) -> Dict:
        """Analyze user's code approach"""
        # Use AI to analyze the approach
        try:
            analysis = await analyze_code_with_ai(code, language.value, "approach_analysis")
            return analysis
        except Exception:
            return {"approach": "unknown", "patterns": [], "issues": []}
    
    async def _identify_problem_concepts(self, problem_id: str) -> Optional[ConceptCategory]:
        """Identify main concept for a problem"""
        # Mock implementation - in real system, query problem metadata
        concept_mapping = {
            "two_sum": ConceptCategory.ALGORITHMS,
            "reverse_linked_list": ConceptCategory.DATA_STRUCTURES,
            "valid_parentheses": ConceptCategory.DATA_STRUCTURES,
            "merge_intervals": ConceptCategory.ALGORITHMS
        }
        
        for key, concept in concept_mapping.items():
            if key in problem_id.lower():
                return concept
        
        return ConceptCategory.ALGORITHMS  # Default
    
    async def _generate_ai_hints(self, request: ProgressiveHintRequest, code_analysis: Dict, concept_focus: Optional[ConceptCategory]) -> List[ProgressiveHint]:
        """Generate AI-powered progressive hints"""
        try:
            system_prompt = f"""You are an expert programming tutor. Generate {request.hint_level} progressive hints for a coding problem.
            Each hint should be more specific than the previous one, but avoid giving away the complete solution.
            Focus on the {concept_focus.value if concept_focus else 'general'} concept.
            
            Previous hints given: {request.previous_hints}
            User has been stuck for: {request.stuck_duration or 0} minutes
            """
            
            user_prompt = f"""
            Problem ID: {request.problem_id}
            User's current code:
            ```{request.language}
            {request.current_code}
            ```
            
            Code analysis: {json.dumps(code_analysis, indent=2)}
            
            Generate {request.hint_level} progressive hints as JSON array:
            [
                {{
                    "level": 1,
                    "content": "hint content",
                    "type": "conceptual|implementation|debugging",
                    "reveals_solution": false,
                    "code_snippet": "optional code example",
                    "learning_objective": "what the user should learn"
                }}
            ]
            """
            
            response = await generate_completion(
                prompt=user_prompt,
                system_prompt=system_prompt,
                max_tokens=1500,
                temperature=0.7
            )
            
            hints_data = json.loads(response)
            return [ProgressiveHint(**hint_data) for hint_data in hints_data]
            
        except Exception as e:
            logger.error(f"AI hint generation failed: {e}")
            return self._generate_fallback_hints(request.hint_level)
    
    def _generate_fallback_hints(self, hint_level: int) -> List[ProgressiveHint]:
        """Generate fallback hints when AI fails"""
        fallback_hints = [
            ProgressiveHint(
                level=1,
                content="Start by understanding the problem requirements clearly.",
                type="conceptual",
                reveals_solution=False,
                learning_objective="Problem comprehension",
                concept_focus=None,
                code_snippet=None
            ),
            ProgressiveHint(
                level=2,
                content="Think about what data structures might be helpful for this problem.",
                type="conceptual",
                reveals_solution=False,
                learning_objective="Data structure selection",
                concept_focus=None,
                code_snippet=None
            ),
            ProgressiveHint(
                level=3,
                content="Consider the time and space complexity of your approach.",
                type="implementation",
                reveals_solution=False,
                learning_objective="Complexity analysis",
                concept_focus=None,
                code_snippet=None
            ),
            ProgressiveHint(
                level=4,
                content="Look for edge cases that your solution should handle.",
                type="debugging",
                reveals_solution=False,
                learning_objective="Edge case handling",
                concept_focus=None,
                code_snippet=None
            ),
            ProgressiveHint(
                level=5,
                content="Review similar problems and their solution patterns.",
                type="conceptual",
                reveals_solution=True,
                learning_objective="Pattern recognition",
                concept_focus=None,
                code_snippet=None
            )
        ]
        
        return fallback_hints[:hint_level]
    
    def _enhance_hints_with_learning_objectives(self, hints: List[ProgressiveHint], concept_focus: Optional[ConceptCategory]) -> List[ProgressiveHint]:
        """Enhance hints with learning objectives"""
        for hint in hints:
            if not hint.learning_objective and concept_focus:
                hint.learning_objective = f"Understanding {concept_focus.value.replace('_', ' ')}"
            
            if concept_focus:
                hint.concept_focus = concept_focus
        
        return hints
    
    def _analyze_time_patterns(self, submissions: List[Dict]) -> Optional[PerformancePattern]:
        """Analyze time-based performance patterns"""
        if len(submissions) < 10:
            return None
        
        # Group by hour of day
        hour_performance = defaultdict(list)
        for submission in submissions:
            hour = submission["submitted_at"].hour
            success = submission.get("status") == "accepted"
            hour_performance[hour].append(success)
        
        # Find best and worst hours
        hour_scores = {hour: sum(successes) / len(successes) for hour, successes in hour_performance.items() if len(successes) >= 3}
        
        if not hour_scores:
            return None
        
        best_hour = max(hour_scores, key=lambda h: hour_scores[h])
        worst_hour = min(hour_scores, key=lambda h: hour_scores[h])
        
        insights = [
            f"Best performance at {best_hour}:00 ({hour_scores[best_hour]:.1%} success rate)",
            f"Lowest performance at {worst_hour}:00 ({hour_scores[worst_hour]:.1%} success rate)"
        ]
        
        recommendations = [
            f"Schedule challenging problems around {best_hour}:00",
            f"Avoid difficult problems around {worst_hour}:00"
        ]
        
        return PerformancePattern(
            user_id=submissions[0].get("user_id", "unknown"),
            pattern_type="time_of_day",
            pattern_data={"hour_scores": hour_scores},
            insights=insights,
            recommendations=recommendations,
            confidence=0.8 if len(hour_scores) >= 5 else 0.6
        )
    
    def _analyze_difficulty_patterns(self, submissions: List[Dict]) -> Optional[PerformancePattern]:
        """Analyze difficulty-based performance patterns"""
        difficulty_performance = defaultdict(list)
        
        for submission in submissions:
            difficulty = submission.get("difficulty", "unknown")
            success = submission.get("status") == "accepted"
            difficulty_performance[difficulty].append(success)
        
        difficulty_scores = {
            diff: sum(successes) / len(successes) 
            for diff, successes in difficulty_performance.items() 
            if len(successes) >= 3
        }
        
        if len(difficulty_scores) < 2:
            return None
        
        insights = []
        for difficulty, score in difficulty_scores.items():
            insights.append(f"{difficulty.title()} problems: {score:.1%} success rate")
        
        recommendations = []
        if difficulty_scores.get("easy", 0) < 0.8:
            recommendations.append("Focus on mastering easy problems first")
        elif difficulty_scores.get("medium", 0) < 0.6:
            recommendations.append("Practice more medium difficulty problems")
        elif difficulty_scores.get("hard", 0) < 0.4:
            recommendations.append("Build up to hard problems gradually")
        
        return PerformancePattern(
            user_id=submissions[0].get("user_id", "unknown"),
            pattern_type="difficulty_progression",
            pattern_data={"difficulty_scores": difficulty_scores},
            insights=insights,
            recommendations=recommendations,
            confidence=0.9
        )
    
    def _analyze_concept_patterns(self, submissions: List[Dict]) -> Optional[PerformancePattern]:
        """Analyze concept-based performance patterns"""
        concept_performance = defaultdict(list)
        
        for submission in submissions:
            concepts = submission.get("concepts", [])
            success = submission.get("status") == "accepted"
            
            for concept in concepts:
                concept_performance[concept].append(success)
        
        concept_scores = {
            concept: sum(successes) / len(successes)
            for concept, successes in concept_performance.items()
            if len(successes) >= 3
        }
        
        if len(concept_scores) < 2:
            return None
        
        best_concepts = sorted(concept_scores.items(), key=lambda x: x[1], reverse=True)[:3]
        worst_concepts = sorted(concept_scores.items(), key=lambda x: x[1])[:3]
        
        insights = []
        insights.extend([f"Strong in {concept}: {score:.1%}" for concept, score in best_concepts])
        insights.extend([f"Needs work on {concept}: {score:.1%}" for concept, score in worst_concepts])
        
        recommendations = []
        for concept, score in worst_concepts:
            if score < 0.6:
                recommendations.append(f"Focus on improving {concept.replace('_', ' ')} skills")
        
        return PerformancePattern(
            user_id=submissions[0].get("user_id", "unknown"),
            pattern_type="concept_performance",
            pattern_data={"concept_scores": concept_scores},
            insights=insights,
            recommendations=recommendations,
            confidence=0.85
        )
    
    def _determine_current_difficulty_level(self, submissions: List[Dict]) -> DifficultyLevel:
        """Determine user's current difficulty level"""
        if not submissions:
            return DifficultyLevel.EASY
        
        # Get recent successful submissions
        successful_submissions = [s for s in submissions if s.get("status") == "accepted"]
        
        if not successful_submissions:
            return DifficultyLevel.EASY
        
        # Count by difficulty
        difficulty_counts = Counter(s.get("difficulty", "easy") for s in successful_submissions)
        
        # Determine current level based on recent success
        if difficulty_counts.get("hard", 0) >= 3:
            return DifficultyLevel.HARD
        elif difficulty_counts.get("medium", 0) >= 5:
            return DifficultyLevel.MEDIUM
        else:
            return DifficultyLevel.EASY
    
    def _calculate_readiness_score(self, submissions: List[Dict], current_level: DifficultyLevel) -> float:
        """Calculate readiness score for next difficulty level"""
        if not submissions:
            return 0.0
        
        # Filter submissions by current difficulty
        current_difficulty_submissions = [
            s for s in submissions 
            if s.get("difficulty") == current_level.value
        ]
        
        if len(current_difficulty_submissions) < 5:
            return 0.3  # Not enough data
        
        # Calculate success rate
        success_rate = len([s for s in current_difficulty_submissions if s.get("status") == "accepted"]) / len(current_difficulty_submissions)
        
        # Calculate consistency (recent performance)
        recent_submissions = current_difficulty_submissions[:10]  # Last 10
        recent_success_rate = len([s for s in recent_submissions if s.get("status") == "accepted"]) / len(recent_submissions)
        
        # Combine metrics
        readiness_score = (success_rate * 0.6) + (recent_success_rate * 0.4)
        
        return min(readiness_score, 1.0)
    
    def _get_next_difficulty_level(self, current_level: DifficultyLevel) -> DifficultyLevel:
        """Get next difficulty level"""
        if current_level == DifficultyLevel.EASY:
            return DifficultyLevel.MEDIUM
        elif current_level == DifficultyLevel.MEDIUM:
            return DifficultyLevel.HARD
        else:
            return DifficultyLevel.HARD  # Already at highest
    
    def _generate_progression_evidence(self, submissions: List[Dict], readiness_score: float) -> List[str]:
        """Generate evidence for difficulty progression"""
        evidence = []
        
        successful_submissions = [s for s in submissions if s.get("status") == "accepted"]
        
        if len(successful_submissions) >= 10:
            evidence.append(f"Solved {len(successful_submissions)} problems successfully")
        
        if readiness_score >= 0.8:
            evidence.append("Consistently high performance on current difficulty")
        elif readiness_score >= 0.6:
            evidence.append("Good performance with room for improvement")
        else:
            evidence.append("Needs more practice at current difficulty")
        
        # Analyze recent trend
        recent_submissions = submissions[:10]
        recent_success_rate = len([s for s in recent_submissions if s.get("status") == "accepted"]) / len(recent_submissions) if recent_submissions else 0
        
        if recent_success_rate >= 0.8:
            evidence.append("Strong recent performance trend")
        
        return evidence
    
    def _identify_prerequisite_skills(self, difficulty_level: DifficultyLevel) -> List[ConceptCategory]:
        """Identify prerequisite skills for difficulty level"""
        if difficulty_level == DifficultyLevel.MEDIUM:
            return [
                ConceptCategory.ALGORITHMS,
                ConceptCategory.DATA_STRUCTURES,
                ConceptCategory.RECURSION
            ]
        elif difficulty_level == DifficultyLevel.HARD:
            return [
                ConceptCategory.DYNAMIC_PROGRAMMING,
                ConceptCategory.GRAPH_THEORY,
                ConceptCategory.TREE_ALGORITHMS,
                ConceptCategory.GREEDY_ALGORITHMS
            ]
        else:
            return []