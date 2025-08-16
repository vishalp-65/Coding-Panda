"""
Interview simulation service
"""
import asyncio
import json
import logging
from datetime import datetime, timedelta
from typing import List, Optional, Dict, Any, Tuple
from uuid import uuid4

from ..models.interview import (
    InterviewSession, InterviewQuestion, InterviewResponse, InterviewFeedback,
    QuestionEvaluation, CommunicationScore, CompanyInterviewPattern,
    InterviewAnalytics, InterviewType, InterviewStatus, QuestionType,
    CommunicationAspect, CompanyType, DifficultyLevel
)
from ..models.analysis import ProgrammingLanguage
from ..models.learning import ConceptCategory, SkillLevel
from ..core.ai_client import get_ai_client
from ..core.redis_client import get_redis_client


logger = logging.getLogger(__name__)


class InterviewService:
    """Service for managing interview simulations"""
    
    def __init__(self):
        self.redis_client = None
        self.ai_client = None
        self.company_patterns = self._load_company_patterns()
        
    async def initialize(self):
        """Initialize service dependencies"""
        self.redis_client = await get_redis_client()
        self.ai_client = await get_ai_client()
        
    def _load_company_patterns(self) -> Dict[CompanyType, CompanyInterviewPattern]:
        """Load company-specific interview patterns"""
        return {
            CompanyType.BIG_TECH: CompanyInterviewPattern(
                company_type=CompanyType.BIG_TECH,
                typical_duration=60,
                question_distribution={
                    QuestionType.CODING_PROBLEM: 0.6,
                    QuestionType.SYSTEM_DESIGN: 0.2,
                    QuestionType.BEHAVIORAL: 0.2
                },
                common_concepts=[
                    ConceptCategory.ALGORITHMS,
                    ConceptCategory.DATA_STRUCTURES,
                    ConceptCategory.SYSTEM_DESIGN,
                    ConceptCategory.DYNAMIC_PROGRAMMING
                ],
                difficulty_preference=DifficultyLevel.MEDIUM,
                communication_weight=0.4,
                technical_weight=0.6,
                behavioral_questions=[
                    "Tell me about a challenging project you worked on",
                    "How do you handle disagreements with team members?",
                    "Describe a time when you had to learn a new technology quickly"
                ],
                technical_focus_areas=[
                    "Algorithm optimization",
                    "System scalability",
                    "Code quality and maintainability"
                ],
                evaluation_criteria=[
                    "Problem-solving approach",
                    "Code correctness and efficiency",
                    "Communication clarity",
                    "Handling of edge cases"
                ]
            ),
            CompanyType.STARTUP: CompanyInterviewPattern(
                company_type=CompanyType.STARTUP,
                typical_duration=45,
                question_distribution={
                    QuestionType.CODING_PROBLEM: 0.5,
                    QuestionType.TECHNICAL_CONCEPT: 0.3,
                    QuestionType.BEHAVIORAL: 0.2
                },
                common_concepts=[
                    ConceptCategory.ALGORITHMS,
                    ConceptCategory.DATA_STRUCTURES,
                    ConceptCategory.OBJECT_ORIENTED
                ],
                difficulty_preference=DifficultyLevel.MEDIUM,
                communication_weight=0.5,
                technical_weight=0.5,
                behavioral_questions=[
                    "Why do you want to work at a startup?",
                    "How do you handle ambiguity and changing requirements?",
                    "Describe your experience working in fast-paced environments"
                ],
                technical_focus_areas=[
                    "Practical problem solving",
                    "Full-stack thinking",
                    "Adaptability to new technologies"
                ],
                evaluation_criteria=[
                    "Practical problem-solving skills",
                    "Adaptability and learning agility",
                    "Communication and collaboration",
                    "Cultural fit"
                ]
            ),
            CompanyType.FINTECH: CompanyInterviewPattern(
                company_type=CompanyType.FINTECH,
                typical_duration=60,
                question_distribution={
                    QuestionType.CODING_PROBLEM: 0.4,
                    QuestionType.SYSTEM_DESIGN: 0.3,
                    QuestionType.TECHNICAL_CONCEPT: 0.3
                },
                common_concepts=[
                    ConceptCategory.ALGORITHMS,
                    ConceptCategory.DATA_STRUCTURES,
                    ConceptCategory.SYSTEM_DESIGN,
                    ConceptCategory.MATH_NUMBER_THEORY
                ],
                difficulty_preference=DifficultyLevel.MEDIUM,
                communication_weight=0.3,
                technical_weight=0.7,
                behavioral_questions=[
                    "How do you ensure code quality in financial systems?",
                    "Describe your experience with regulatory compliance",
                    "How do you handle high-stakes, mission-critical code?"
                ],
                technical_focus_areas=[
                    "System reliability and security",
                    "Performance optimization",
                    "Data accuracy and consistency"
                ],
                evaluation_criteria=[
                    "Attention to detail",
                    "Security awareness",
                    "System reliability thinking",
                    "Mathematical problem solving"
                ]
            )
        }
    
    async def create_interview_session(
        self,
        user_id: str,
        interview_type: InterviewType,
        company_type: CompanyType = CompanyType.GENERIC,
        target_role: Optional[str] = None,
        difficulty_level: DifficultyLevel = DifficultyLevel.MEDIUM,
        max_questions: int = 5,
        time_limit: Optional[int] = None,
        scheduled_time: Optional[datetime] = None
    ) -> InterviewSession:
        """Create a new interview session"""
        
        session_id = str(uuid4())
        
        # Generate questions based on company pattern and user preferences
        questions = await self._generate_interview_questions(
            interview_type=interview_type,
            company_type=company_type,
            difficulty_level=difficulty_level,
            max_questions=max_questions,
            target_role=target_role,
            user_id=user_id
        )
        
        session = InterviewSession(
            id=session_id,
            user_id=user_id,
            interview_type=interview_type,
            company_type=company_type,
            target_role=target_role,
            difficulty_level=difficulty_level,
            status=InterviewStatus.SCHEDULED,
            questions=questions,
            max_questions=max_questions,
            time_limit=time_limit,
            scheduled_time=scheduled_time
        )
        
        # Store session in Redis
        await self._store_session(session)
        
        logger.info(f"Created interview session {session_id} for user {user_id}")
        return session
    
    async def start_interview_session(
        self,
        session_id: str,
        user_preferences: Optional[Dict[str, Any]] = None
    ) -> InterviewSession:
        """Start an interview session"""
        
        session = await self._get_session(session_id)
        if not session:
            raise ValueError(f"Interview session {session_id} not found")
        
        if session.status != InterviewStatus.SCHEDULED:
            raise ValueError(f"Cannot start session in status {session.status}")
        
        # Update session status and timing
        session.status = InterviewStatus.IN_PROGRESS
        session.start_time = datetime.utcnow()
        session.updated_at = datetime.utcnow()
        
        # Apply user preferences if provided
        if user_preferences:
            session.allow_hints = user_preferences.get('allow_hints', session.allow_hints)
        
        await self._store_session(session)
        
        logger.info(f"Started interview session {session_id}")
        return session
    
    async def get_current_question(self, session_id: str) -> Optional[InterviewQuestion]:
        """Get the current question for the session"""
        
        session = await self._get_session(session_id)
        if not session:
            raise ValueError(f"Interview session {session_id} not found")
        
        if session.current_question_index >= len(session.questions):
            return None
        
        return session.questions[session.current_question_index]
    
    async def submit_response(
        self,
        session_id: str,
        question_id: str,
        response_text: Optional[str] = None,
        code_solution: Optional[str] = None,
        language: Optional[ProgrammingLanguage] = None,
        confidence_level: Optional[int] = None,
        response_time: Optional[int] = None
    ) -> Tuple[InterviewSession, Optional[InterviewQuestion]]:
        """Submit a response to the current question"""
        
        session = await self._get_session(session_id)
        if not session:
            raise ValueError(f"Interview session {session_id} not found")
        
        if session.status != InterviewStatus.IN_PROGRESS:
            raise ValueError(f"Cannot submit response for session in status {session.status}")
        
        # Validate question ID
        current_question = await self.get_current_question(session_id)
        if not current_question or current_question.id != question_id:
            raise ValueError(f"Invalid question ID {question_id}")
        
        # Create response
        response = InterviewResponse(
            question_id=question_id,
            response_text=response_text,
            code_solution=code_solution,
            language=language,
            response_time=response_time or 0,
            confidence_level=confidence_level
        )
        
        # Add response to session
        session.responses.append(response)
        session.current_question_index += 1
        session.updated_at = datetime.utcnow()
        
        # Get next question or complete session
        next_question = None
        if session.current_question_index < len(session.questions):
            next_question = session.questions[session.current_question_index]
        else:
            # Session completed
            session.status = InterviewStatus.COMPLETED
            session.end_time = datetime.utcnow()
            if session.start_time:
                duration = session.end_time - session.start_time
                session.total_duration = int(duration.total_seconds() / 60)
        
        await self._store_session(session)
        
        logger.info(f"Submitted response for question {question_id} in session {session_id}")
        return session, next_question
    
    async def generate_follow_up_question(
        self,
        session_id: str,
        previous_response: InterviewResponse,
        context: Optional[str] = None
    ) -> InterviewQuestion:
        """Generate a contextual follow-up question"""
        
        session = await self._get_session(session_id)
        if not session:
            raise ValueError(f"Interview session {session_id} not found")
        
        # Get the original question
        original_question = None
        for q in session.questions:
            if q.id == previous_response.question_id:
                original_question = q
                break
        
        if not original_question:
            raise ValueError(f"Original question {previous_response.question_id} not found")
        
        # Generate follow-up using AI
        follow_up_content = await self._generate_ai_follow_up(
            original_question=original_question,
            user_response=previous_response,
            session_context=session,
            additional_context=context
        )
        
        follow_up_question = InterviewQuestion(
            id=str(uuid4()),
            type=QuestionType.FOLLOW_UP,
            content=follow_up_content,
            difficulty=original_question.difficulty,
            concepts=original_question.concepts,
            expected_duration=5,  # Follow-ups are typically shorter
            evaluation_criteria=["Depth of understanding", "Clarification ability"]
        )
        
        return follow_up_question
    
    async def evaluate_interview_performance(self, session_id: str) -> InterviewFeedback:
        """Generate comprehensive feedback for completed interview"""
        
        session = await self._get_session(session_id)
        if not session:
            raise ValueError(f"Interview session {session_id} not found")
        
        if session.status != InterviewStatus.COMPLETED:
            raise ValueError(f"Cannot evaluate incomplete session {session_id}")
        
        # Evaluate each question response
        question_evaluations = []
        for i, response in enumerate(session.responses):
            if i < len(session.questions):
                question = session.questions[i]
                evaluation = await self._evaluate_question_response(
                    question=question,
                    response=response,
                    session_context=session
                )
                question_evaluations.append(evaluation)
        
        # Calculate overall scores
        technical_scores = [eval.overall_score for eval in question_evaluations if eval.code_quality_score is not None]
        communication_scores = []
        problem_solving_scores = [eval.approach_score for eval in question_evaluations]
        
        for eval in question_evaluations:
            comm_scores = [cs.score for cs in eval.communication_scores]
            if comm_scores:
                communication_scores.append(sum(comm_scores) / len(comm_scores))
        
        overall_score = sum([eval.overall_score for eval in question_evaluations]) / len(question_evaluations) if question_evaluations else 0
        technical_score = sum(technical_scores) / len(technical_scores) if technical_scores else 0
        communication_score = sum(communication_scores) / len(communication_scores) if communication_scores else 0
        problem_solving_score = sum(problem_solving_scores) / len(problem_solving_scores) if problem_solving_scores else 0
        
        # Generate comprehensive feedback using AI
        ai_feedback = await self._generate_comprehensive_feedback(
            session=session,
            question_evaluations=question_evaluations,
            overall_scores={
                'overall': overall_score,
                'technical': technical_score,
                'communication': communication_score,
                'problem_solving': problem_solving_score
            }
        )
        
        feedback = InterviewFeedback(
            session_id=session_id,
            user_id=session.user_id,
            overall_score=overall_score,
            technical_score=technical_score,
            communication_score=communication_score,
            problem_solving_score=problem_solving_score,
            question_evaluations=question_evaluations,
            key_strengths=ai_feedback.get('strengths', []),
            areas_for_improvement=ai_feedback.get('improvements', []),
            specific_recommendations=ai_feedback.get('recommendations', []),
            time_management=ai_feedback.get('time_management', ''),
            communication_style=ai_feedback.get('communication_style', ''),
            technical_depth=ai_feedback.get('technical_depth', ''),
            recommended_practice_areas=ai_feedback.get('practice_areas', []),
            suggested_resources=ai_feedback.get('resources', []),
            ai_confidence=ai_feedback.get('confidence', 0.8)
        )
        
        # Store feedback
        await self._store_feedback(feedback)
        
        # Update user analytics
        await self._update_user_analytics(session.user_id, feedback)
        
        logger.info(f"Generated feedback for interview session {session_id}")
        return feedback
    
    async def get_user_analytics(
        self,
        user_id: str,
        time_range: Optional[str] = None,
        company_type: Optional[CompanyType] = None
    ) -> InterviewAnalytics:
        """Get interview analytics for a user"""
        
        # Retrieve analytics from Redis/database
        analytics_key = f"interview_analytics:{user_id}"
        analytics_data = await self.redis_client.get(analytics_key)
        
        if analytics_data:
            analytics = InterviewAnalytics.parse_raw(analytics_data)
        else:
            analytics = InterviewAnalytics(user_id=user_id)
        
        # Apply filters if specified
        if time_range or company_type:
            analytics = await self._filter_analytics(analytics, time_range, company_type)
        
        return analytics
    
    # Private helper methods
    
    async def _generate_interview_questions(
        self,
        interview_type: InterviewType,
        company_type: CompanyType,
        difficulty_level: DifficultyLevel,
        max_questions: int,
        target_role: Optional[str] = None,
        user_id: Optional[str] = None
    ) -> List[InterviewQuestion]:
        """Generate interview questions based on parameters"""
        
        pattern = self.company_patterns.get(company_type)
        if not pattern:
            pattern = self.company_patterns[CompanyType.GENERIC]
        
        questions = []
        
        # Generate questions based on distribution
        for question_type, ratio in pattern.question_distribution.items():
            num_questions = max(1, int(max_questions * ratio))
            
            for _ in range(num_questions):
                if len(questions) >= max_questions:
                    break
                
                question = await self._generate_single_question(
                    question_type=question_type,
                    difficulty=difficulty_level,
                    concepts=pattern.common_concepts,
                    company_type=company_type,
                    target_role=target_role
                )
                questions.append(question)
        
        # Ensure we have exactly max_questions
        while len(questions) < max_questions:
            question = await self._generate_single_question(
                question_type=QuestionType.CODING_PROBLEM,
                difficulty=difficulty_level,
                concepts=pattern.common_concepts,
                company_type=company_type,
                target_role=target_role
            )
            questions.append(question)
        
        return questions[:max_questions]
    
    async def _generate_single_question(
        self,
        question_type: QuestionType,
        difficulty: DifficultyLevel,
        concepts: List[ConceptCategory],
        company_type: CompanyType,
        target_role: Optional[str] = None
    ) -> InterviewQuestion:
        """Generate a single interview question using AI"""
        
        prompt = f"""
        Generate a {question_type.value} interview question with the following requirements:
        - Difficulty: {difficulty.value}
        - Concepts: {', '.join([c.value for c in concepts[:3]])}
        - Company type: {company_type.value}
        - Target role: {target_role or 'Software Engineer'}
        
        The question should be realistic, well-structured, and appropriate for a technical interview.
        Include evaluation criteria and expected duration.
        """
        
        try:
            ai_response = await self.ai_client.generate_text(prompt)
            
            # Parse AI response and create question
            question = InterviewQuestion(
                id=str(uuid4()),
                type=question_type,
                content=ai_response.get('question', 'Default question content'),
                difficulty=difficulty,
                concepts=concepts[:2],  # Limit to 2 concepts
                expected_duration=ai_response.get('duration', 15),
                evaluation_criteria=ai_response.get('criteria', ['Correctness', 'Approach']),
                company_specific=company_type != CompanyType.GENERIC
            )
            
            return question
            
        except Exception as e:
            logger.error(f"Error generating question: {e}")
            # Fallback to default question
            return self._get_default_question(question_type, difficulty)
    
    def _get_default_question(self, question_type: QuestionType, difficulty: DifficultyLevel) -> InterviewQuestion:
        """Get a default question as fallback"""
        
        default_questions = {
            QuestionType.CODING_PROBLEM: {
                DifficultyLevel.EASY: "Write a function to reverse a string.",
                DifficultyLevel.MEDIUM: "Implement a function to find the longest palindromic substring.",
                DifficultyLevel.HARD: "Design and implement a LRU cache with O(1) operations."
            },
            QuestionType.SYSTEM_DESIGN: {
                DifficultyLevel.EASY: "Design a simple URL shortener service.",
                DifficultyLevel.MEDIUM: "Design a chat application like WhatsApp.",
                DifficultyLevel.HARD: "Design a distributed cache system like Redis."
            },
            QuestionType.BEHAVIORAL: {
                DifficultyLevel.EASY: "Tell me about a challenging project you worked on.",
                DifficultyLevel.MEDIUM: "Describe a time when you had to work with a difficult team member.",
                DifficultyLevel.HARD: "How would you handle a situation where you disagree with your manager's technical decision?"
            }
        }
        
        content = default_questions.get(question_type, {}).get(
            difficulty, 
            "Describe your approach to solving complex technical problems."
        )
        
        return InterviewQuestion(
            id=str(uuid4()),
            type=question_type,
            content=content,
            difficulty=difficulty,
            concepts=[ConceptCategory.ALGORITHMS],
            expected_duration=15,
            evaluation_criteria=['Problem-solving approach', 'Communication clarity']
        )
    
    async def _evaluate_question_response(
        self,
        question: InterviewQuestion,
        response: InterviewResponse,
        session_context: InterviewSession
    ) -> QuestionEvaluation:
        """Evaluate a single question response"""
        
        # Use AI to evaluate the response
        evaluation_prompt = f"""
        Evaluate this interview response:
        
        Question: {question.content}
        Question Type: {question.type.value}
        Difficulty: {question.difficulty.value}
        
        Response Text: {response.response_text or 'No text response'}
        Code Solution: {response.code_solution or 'No code provided'}
        Response Time: {response.response_time} seconds
        
        Provide scores (0-10) for:
        1. Correctness
        2. Problem-solving approach
        3. Code quality (if applicable)
        4. Communication clarity
        5. Time efficiency
        
        Also provide detailed feedback and suggestions.
        """
        
        try:
            ai_evaluation = await self.ai_client.evaluate_response(evaluation_prompt)
            
            # Create communication scores
            communication_scores = [
                CommunicationScore(
                    aspect=CommunicationAspect.CLARITY,
                    score=ai_evaluation.get('communication_score', 7.0),
                    feedback=ai_evaluation.get('communication_feedback', 'Good communication'),
                    examples=[]
                ),
                CommunicationScore(
                    aspect=CommunicationAspect.TECHNICAL_DEPTH,
                    score=ai_evaluation.get('technical_depth_score', 7.0),
                    feedback=ai_evaluation.get('technical_feedback', 'Adequate technical depth'),
                    examples=[]
                )
            ]
            
            evaluation = QuestionEvaluation(
                question_id=question.id,
                correctness_score=ai_evaluation.get('correctness_score', 7.0),
                approach_score=ai_evaluation.get('approach_score', 7.0),
                code_quality_score=ai_evaluation.get('code_quality_score') if response.code_solution else None,
                communication_scores=communication_scores,
                time_efficiency=ai_evaluation.get('time_efficiency', 7.0),
                overall_score=ai_evaluation.get('overall_score', 7.0),
                strengths=ai_evaluation.get('strengths', []),
                areas_for_improvement=ai_evaluation.get('improvements', []),
                detailed_feedback=ai_evaluation.get('detailed_feedback', 'Good response overall')
            )
            
            return evaluation
            
        except Exception as e:
            logger.error(f"Error evaluating response: {e}")
            # Fallback evaluation
            return self._get_default_evaluation(question.id)
    
    def _get_default_evaluation(self, question_id: str) -> QuestionEvaluation:
        """Get default evaluation as fallback"""
        
        return QuestionEvaluation(
            question_id=question_id,
            correctness_score=7.0,
            approach_score=7.0,
            time_efficiency=7.0,
            overall_score=7.0,
            communication_scores=[
                CommunicationScore(
                    aspect=CommunicationAspect.CLARITY,
                    score=7.0,
                    feedback="Communication was clear and understandable",
                    examples=[]
                )
            ],
            strengths=["Good problem-solving approach"],
            areas_for_improvement=["Could provide more detailed explanations"],
            detailed_feedback="Overall good response with room for improvement in explanation depth."
        )
    
    async def _generate_ai_follow_up(
        self,
        original_question: InterviewQuestion,
        user_response: InterviewResponse,
        session_context: InterviewSession,
        additional_context: Optional[str] = None
    ) -> str:
        """Generate AI follow-up question"""
        
        prompt = f"""
        Generate a follow-up question based on:
        
        Original Question: {original_question.content}
        User Response: {user_response.response_text or 'Code-only response'}
        Code Solution: {user_response.code_solution or 'No code provided'}
        
        The follow-up should:
        1. Probe deeper into their understanding
        2. Test edge cases or optimizations
        3. Explore alternative approaches
        4. Be concise and focused
        
        Additional Context: {additional_context or 'None'}
        """
        
        try:
            ai_response = await self.ai_client.generate_text(prompt)
            return ai_response.get('follow_up_question', 'Can you explain your approach in more detail?')
        except Exception as e:
            logger.error(f"Error generating follow-up: {e}")
            return "Can you walk me through your thought process for this solution?"
    
    async def _generate_comprehensive_feedback(
        self,
        session: InterviewSession,
        question_evaluations: List[QuestionEvaluation],
        overall_scores: Dict[str, float]
    ) -> Dict[str, Any]:
        """Generate comprehensive AI feedback"""
        
        prompt = f"""
        Generate comprehensive interview feedback based on:
        
        Interview Type: {session.interview_type.value}
        Company Type: {session.company_type.value}
        Duration: {session.total_duration or 'Unknown'} minutes
        
        Overall Scores:
        - Overall: {overall_scores['overall']:.1f}/10
        - Technical: {overall_scores['technical']:.1f}/10
        - Communication: {overall_scores['communication']:.1f}/10
        - Problem Solving: {overall_scores['problem_solving']:.1f}/10
        
        Number of Questions: {len(question_evaluations)}
        
        Provide:
        1. Key strengths (3-5 points)
        2. Areas for improvement (3-5 points)
        3. Specific recommendations (5-7 actionable items)
        4. Time management feedback
        5. Communication style assessment
        6. Technical depth evaluation
        7. Recommended practice areas
        8. Learning resources
        """
        
        try:
            ai_feedback = await self.ai_client.generate_feedback(prompt)
            return ai_feedback
        except Exception as e:
            logger.error(f"Error generating comprehensive feedback: {e}")
            return {
                'strengths': ['Good problem-solving approach', 'Clear communication'],
                'improvements': ['Work on optimization', 'Practice more complex problems'],
                'recommendations': ['Practice daily coding problems', 'Focus on algorithm optimization'],
                'time_management': 'Good time management overall',
                'communication_style': 'Clear and concise communication',
                'technical_depth': 'Solid technical understanding',
                'practice_areas': [ConceptCategory.ALGORITHMS, ConceptCategory.DATA_STRUCTURES],
                'resources': ['LeetCode practice', 'Algorithm design books'],
                'confidence': 0.7
            }
    
    async def _store_session(self, session: InterviewSession):
        """Store interview session in Redis"""
        key = f"interview_session:{session.id}"
        await self.redis_client.setex(
            key, 
            86400,  # 24 hours TTL
            session.json()
        )
    
    async def _get_session(self, session_id: str) -> Optional[InterviewSession]:
        """Retrieve interview session from Redis"""
        key = f"interview_session:{session_id}"
        session_data = await self.redis_client.get(key)
        
        if session_data:
            return InterviewSession.parse_raw(session_data)
        return None
    
    async def _store_feedback(self, feedback: InterviewFeedback):
        """Store interview feedback"""
        key = f"interview_feedback:{feedback.session_id}"
        await self.redis_client.setex(
            key,
            604800,  # 7 days TTL
            feedback.json()
        )
    
    async def _update_user_analytics(self, user_id: str, feedback: InterviewFeedback):
        """Update user interview analytics"""
        analytics_key = f"interview_analytics:{user_id}"
        
        # Get existing analytics
        analytics_data = await self.redis_client.get(analytics_key)
        if analytics_data:
            analytics = InterviewAnalytics.parse_raw(analytics_data)
        else:
            analytics = InterviewAnalytics(user_id=user_id)
        
        # Update analytics
        analytics.total_interviews += 1
        analytics.technical_scores.append(feedback.technical_score)
        analytics.communication_scores.append(feedback.communication_score)
        analytics.problem_solving_scores.append(feedback.problem_solving_score)
        
        # Calculate new average
        all_scores = (analytics.technical_scores + 
                     analytics.communication_scores + 
                     analytics.problem_solving_scores)
        analytics.average_score = sum(all_scores) / len(all_scores) if all_scores else 0
        
        analytics.last_updated = datetime.utcnow()
        
        # Store updated analytics
        await self.redis_client.setex(
            analytics_key,
            2592000,  # 30 days TTL
            analytics.json()
        )
    
    async def _filter_analytics(
        self,
        analytics: InterviewAnalytics,
        time_range: Optional[str],
        company_type: Optional[CompanyType]
    ) -> InterviewAnalytics:
        """Filter analytics based on criteria"""
        # This would implement filtering logic based on time range and company type
        # For now, return the analytics as-is
        return analytics


# Global service instance
interview_service = InterviewService()


async def get_interview_service() -> InterviewService:
    """Get initialized interview service"""
    if not interview_service.redis_client:
        await interview_service.initialize()
    return interview_service