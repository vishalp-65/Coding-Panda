"""
Main analysis service that orchestrates all analysis components
"""
import logging
import time
import uuid
from typing import List, Optional
import asyncio

from ..models.analysis import (
    AnalysisRequest, AnalysisResult, HintRequest, Hint, 
    ExplanationRequest, CodeExplanation, ProgrammingLanguage,
    SecurityIssue, PerformanceIssue, CodeSmell, Suggestion, SeverityLevel
)
from ..core.ai_client import analyze_code_with_ai, generate_completion
from ..core.redis_client import cache_get, cache_set
from .code_parser import CodeParser, ComplexityAnalyzer
from .security_analyzer import SecurityAnalyzer
from .performance_analyzer import PerformanceAnalyzer
from .quality_analyzer import QualityAnalyzer

logger = logging.getLogger(__name__)


class AnalysisService:
    """Main code analysis service"""
    
    def __init__(self):
        self.code_parser = CodeParser()
        self.complexity_analyzer = ComplexityAnalyzer()
        self.security_analyzer = SecurityAnalyzer()
        self.performance_analyzer = PerformanceAnalyzer()
        self.quality_analyzer = QualityAnalyzer()
    
    async def analyze_code(self, request: AnalysisRequest) -> AnalysisResult:
        """Perform comprehensive code analysis"""
        start_time = time.time()
        analysis_id = str(uuid.uuid4())
        
        try:
            # Check cache first
            cache_key = f"analysis:{hash(request.code)}:{request.language.value}"
            cached_result = await cache_get(cache_key)
            
            if cached_result:
                logger.info(f"Returning cached analysis result for {analysis_id}")
                cached_result["cached"] = True
                return AnalysisResult(**cached_result)
            
            logger.info(f"Starting code analysis {analysis_id} for {request.language}")
            
            # Parse code structure
            parsed_code = self.code_parser.parse_code(request.code, request.language)
            
            # Calculate complexity metrics
            complexity_metrics = self.complexity_analyzer.calculate_complexity_metrics(
                request.code, request.language
            )
            
            # Run parallel analysis
            tasks = []
            
            # Security analysis
            if "security" in [t.value for t in request.analysis_types] or "general" in [t.value for t in request.analysis_types]:
                tasks.append(self._run_security_analysis(request.code, request.language))
            
            # Performance analysis
            if "performance" in [t.value for t in request.analysis_types] or "general" in [t.value for t in request.analysis_types]:
                tasks.append(self._run_performance_analysis(request.code, request.language))
            
            # Quality analysis
            if "quality" in [t.value for t in request.analysis_types] or "general" in [t.value for t in request.analysis_types]:
                tasks.append(self._run_quality_analysis(request.code, request.language))
            
            # AI analysis (if requested)
            ai_analysis_task = None
            if request.include_ai_feedback:
                ai_analysis_task = self._run_ai_analysis(request.code, request.language)
                tasks.append(ai_analysis_task)
            
            # Execute all analysis tasks
            results = await asyncio.gather(*tasks, return_exceptions=True)
            
            # Process results
            security_issues = []
            performance_issues = []
            code_smells = []
            suggestions = []
            ai_feedback = None
            
            for i, result in enumerate(results):
                if isinstance(result, Exception):
                    logger.error(f"Analysis task {i} failed: {result}")
                    continue
                
                if isinstance(result, list):
                    if result and isinstance(result[0], SecurityIssue):
                        security_issues.extend(result)
                    elif result and isinstance(result[0], PerformanceIssue):
                        performance_issues.extend(result)
                    elif result and isinstance(result[0], CodeSmell):
                        code_smells.extend(result)
                    elif result and isinstance(result[0], Suggestion):
                        suggestions.extend(result)
                elif isinstance(result, dict) and "overall_feedback" in result:
                    ai_feedback = result.get("overall_feedback")
                    # Extract AI-generated issues
                    if "security_issues" in result:
                        for issue_data in result["security_issues"]:
                            security_issues.append(SecurityIssue(**issue_data))
                    if "performance_issues" in result:
                        for issue_data in result["performance_issues"]:
                            performance_issues.append(PerformanceIssue(**issue_data))
            
            # Calculate scores
            scores = self._calculate_scores(
                complexity_metrics, security_issues, performance_issues, code_smells
            )
            
            # Create analysis result
            analysis_result = AnalysisResult(
                analysis_id=analysis_id,
                language=request.language,
                quality_score=scores["quality"],
                security_score=scores["security"],
                performance_score=scores["performance"],
                maintainability_score=scores["maintainability"],
                complexity_metrics=complexity_metrics,
                security_issues=security_issues,
                performance_issues=performance_issues,
                code_smells=code_smells,
                suggestions=suggestions,
                ai_feedback=ai_feedback,
                analysis_duration=time.time() - start_time,
                cached=False,
                explanation=None  # or provide a suitable default explanation object/value
            )
            
            # Cache result
            await cache_set(cache_key, analysis_result.dict(), expire=3600)
            
            logger.info(f"Completed analysis {analysis_id} in {analysis_result.analysis_duration:.2f}s")
            return analysis_result
            
        except Exception as e:
            logger.error(f"Analysis {analysis_id} failed: {e}")
            raise
    
    async def _run_security_analysis(self, code: str, language: ProgrammingLanguage) -> List[SecurityIssue]:
        """Run security analysis"""
        return self.security_analyzer.analyze_security(code, language)
    
    async def _run_performance_analysis(self, code: str, language: ProgrammingLanguage) -> List[PerformanceIssue]:
        """Run performance analysis"""
        return self.performance_analyzer.analyze_performance(code, language)
    
    async def _run_quality_analysis(self, code: str, language: ProgrammingLanguage) -> List[CodeSmell]:
        """Run code quality analysis"""
        return self.quality_analyzer.analyze_quality(code, language)
    
    async def _run_ai_analysis(self, code: str, language: ProgrammingLanguage) -> dict:
        """Run AI-powered analysis"""
        try:
            return await analyze_code_with_ai(code, language.value, "comprehensive")
        except Exception as e:
            logger.error(f"AI analysis failed: {e}")
            return {"overall_feedback": "AI analysis unavailable"}
    
    def _calculate_scores(
        self, 
        complexity_metrics, 
        security_issues: List[SecurityIssue],
        performance_issues: List[PerformanceIssue],
        code_smells: List[CodeSmell]
    ) -> dict:
        """Calculate quality scores"""
        
        # Base scores
        quality_score = 100.0
        security_score = 100.0
        performance_score = 100.0
        maintainability_score = complexity_metrics.maintainability_index
        
        # Deduct points for security issues
        for issue in security_issues:
            if issue.severity == SeverityLevel.CRITICAL:
                security_score -= 25
            elif issue.severity == SeverityLevel.HIGH:
                security_score -= 15
            elif issue.severity == SeverityLevel.MEDIUM:
                security_score -= 8
            elif issue.severity == SeverityLevel.LOW:
                security_score -= 3
        
        # Deduct points for performance issues
        for issue in performance_issues:
            if issue.severity == SeverityLevel.HIGH:
                performance_score -= 20
            elif issue.severity == SeverityLevel.MEDIUM:
                performance_score -= 10
            elif issue.severity == SeverityLevel.LOW:
                performance_score -= 5
        
        # Deduct points for code smells
        quality_score -= len(code_smells) * 5
        
        # Complexity penalties
        if complexity_metrics.cyclomatic_complexity > 10:
            quality_score -= (complexity_metrics.cyclomatic_complexity - 10) * 2
            maintainability_score -= (complexity_metrics.cyclomatic_complexity - 10) * 1.5
        
        # Ensure scores are within bounds
        return {
            "quality": max(0, min(100, quality_score)),
            "security": max(0, min(100, security_score)),
            "performance": max(0, min(100, performance_score)),
            "maintainability": max(0, min(100, maintainability_score))
        }
    
    async def generate_hints(self, request: HintRequest) -> List[Hint]:
        """Generate progressive hints for a coding problem"""
        try:
            cache_key = f"hints:{request.problem_id}:{hash(request.user_code)}:{request.hint_level}"
            cached_hints = await cache_get(cache_key)
            
            if cached_hints:
                return [Hint(**hint) for hint in cached_hints]
            
            # Generate hints using AI
            system_prompt = """You are a coding mentor. Generate progressive hints for a coding problem.
            Provide hints that guide the user without giving away the complete solution.
            Each hint should be more specific than the previous one."""
            
            user_prompt = f"""
            Problem ID: {request.problem_id}
            User's current code:
            ```{request.language}
            {request.user_code}
            ```
            
            Generate {request.hint_level} progressive hints. Return as JSON array:
            [
                {{
                    "level": 1,
                    "content": "hint content",
                    "type": "conceptual|implementation|debugging",
                    "reveals_solution": false
                }}
            ]
            """
            
            response = await generate_completion(
                prompt=user_prompt,
                system_prompt=system_prompt,
                max_tokens=1000,
                temperature=0.7
            )
            
            # Parse response and create hints
            import json
            try:
                hints_data = json.loads(response)
                hints = [Hint(**hint_data) for hint_data in hints_data]
            except json.JSONDecodeError:
                # Fallback to generic hints
                hints = [
                    Hint(
                        level=1,
                        content="Consider the problem requirements and think about the algorithm approach.",
                        type="conceptual",
                        reveals_solution=False
                    )
                ]
            
            # Cache hints
            await cache_set(cache_key, [hint.dict() for hint in hints], expire=1800)
            
            return hints
            
        except Exception as e:
            logger.error(f"Hint generation failed: {e}")
            return [
                Hint(
                    level=1,
                    content="Review the problem statement and consider different approaches.",
                    type="conceptual",
                    reveals_solution=False
                )
            ]
    
    async def explain_code(self, request: ExplanationRequest) -> CodeExplanation:
        """Generate code explanation"""
        try:
            cache_key = f"explanation:{hash(request.code)}:{request.language}:{request.detail_level}"
            cached_explanation = await cache_get(cache_key)
            
            if cached_explanation:
                return CodeExplanation(**cached_explanation)
            
            # Generate explanation using AI
            system_prompt = f"""You are an expert programming instructor. 
            Explain the provided {request.language} code clearly and comprehensively.
            Focus on what the code does, how it works, and key concepts involved."""
            
            user_prompt = f"""
            Explain this {request.language} code at {request.detail_level} detail level:
            
            ```{request.language}
            {request.code}
            ```
            
            Provide explanation in JSON format:
            {{
                "summary": "brief summary",
                "detailed_explanation": "detailed explanation",
                "algorithm_analysis": "algorithm analysis if applicable",
                "time_complexity": "time complexity",
                "space_complexity": "space complexity",
                "key_concepts": ["concept1", "concept2"],
                "learning_resources": ["resource1", "resource2"]
            }}
            """
            
            response = await generate_completion(
                prompt=user_prompt,
                system_prompt=system_prompt,
                max_tokens=1500,
                temperature=0.3
            )
            
            # Parse response
            import json
            try:
                explanation_data = json.loads(response)
                explanation = CodeExplanation(**explanation_data)
            except json.JSONDecodeError:
                # Fallback explanation
                explanation = CodeExplanation(
                    summary=f"This {request.language} code performs various operations.",
                    detailed_explanation="The code contains functions and logic that implement specific functionality.",
                    key_concepts=[request.language.title(), "Programming Logic"],
                    algorithm_analysis=None,
                    time_complexity=None,
                    space_complexity=None
                )
            
            # Cache explanation
            await cache_set(cache_key, explanation.dict(), expire=3600)
            
            return explanation
            
        except Exception as e:
            logger.error(f"Code explanation failed: {e}")
            return CodeExplanation(
                summary="Code explanation unavailable",
                detailed_explanation="Unable to generate explanation at this time.",
                key_concepts=[],
                algorithm_analysis=None,
                time_complexity=None,
                space_complexity=None
            )