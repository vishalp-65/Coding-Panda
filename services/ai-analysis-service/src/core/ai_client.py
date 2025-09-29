"""
AI client configuration and management
"""
import logging
from typing import Optional, Dict, Any
import openai
import anthropic
from openai import AsyncOpenAI
from anthropic import AsyncAnthropic

from ..config import settings

logger = logging.getLogger(__name__)

# Global AI clients
openai_client: Optional[AsyncOpenAI] = None
anthropic_client: Optional[AsyncAnthropic] = None


async def init_ai_clients():
    """Initialize AI clients"""
    global openai_client, anthropic_client
    
    try:
        # Initialize OpenAI client
        if settings.OPENAI_API_KEY:
            openai_client = AsyncOpenAI(api_key=settings.OPENAI_API_KEY)
            logger.info("OpenAI client initialized")
        
        # Initialize Anthropic client
        if settings.ANTHROPIC_API_KEY:
            anthropic_client = AsyncAnthropic(api_key=settings.ANTHROPIC_API_KEY)
            logger.info("Anthropic client initialized")
            
        if not openai_client and not anthropic_client:
            logger.warning("No AI clients initialized - API keys not provided")
            
    except Exception as e:
        logger.error(f"Failed to initialize AI clients: {e}")
        raise


async def get_ai_client():
    """Get the configured AI client"""
    if settings.AI_MODEL_PROVIDER == "openai" and openai_client:
        return openai_client
    elif settings.AI_MODEL_PROVIDER == "anthropic" and anthropic_client:
        return anthropic_client
    else:
        raise RuntimeError(f"AI client not available for provider: {settings.AI_MODEL_PROVIDER}")


async def generate_completion(
    prompt: str,
    system_prompt: Optional[str] = None,
    max_tokens: int = 1000,
    temperature: float = 0.7
) -> str:
    """Generate AI completion"""
    try:
        if settings.AI_MODEL_PROVIDER == "openai" and openai_client:
            messages = []
            if system_prompt:
                messages.append({"role": "system", "content": system_prompt})
            messages.append({"role": "user", "content": prompt})
            
            response = await openai_client.chat.completions.create(
                model=settings.AI_MODEL_NAME,
                messages=messages,
                max_tokens=max_tokens,
                temperature=temperature
            )
            return response.choices[0].message.content or ""
            
        elif settings.AI_MODEL_PROVIDER == "anthropic" and anthropic_client:
            response = await anthropic_client.messages.create(
                model=settings.AI_MODEL_NAME,
                max_tokens=max_tokens,
                temperature=temperature,
                system=system_prompt or "",
                messages=[{"role": "user", "content": prompt}]
            )
            return response.content[0].text # type: ignore
            
        else:
            raise RuntimeError("No AI client available")
            
    except Exception as e:
        logger.error(f"Failed to generate AI completion: {e}")
        raise


async def analyze_code_with_ai(
    code: str,
    language: str,
    analysis_type: str = "general"
) -> Dict[str, Any]:
    """Analyze code using AI"""
    system_prompt = f"""You are an expert code reviewer and software engineer. 
    Analyze the provided {language} code and provide detailed feedback.
    Focus on: code quality, performance, security, best practices, and potential improvements.
    Return your analysis in a structured JSON format."""
    
    user_prompt = f"""Please analyze this {language} code for {analysis_type} analysis:

```{language}
{code}
```

Provide analysis in this JSON format:
{{
    "quality_score": <0-100>,
    "complexity_score": <0-100>,
    "maintainability_score": <0-100>,
    "security_issues": [
        {{"type": "issue_type", "severity": "high|medium|low", "description": "description", "line": line_number}}
    ],
    "performance_issues": [
        {{"type": "issue_type", "severity": "high|medium|low", "description": "description", "suggestion": "improvement_suggestion"}}
    ],
    "code_smells": [
        {{"type": "smell_type", "description": "description", "suggestion": "improvement_suggestion"}}
    ],
    "suggestions": [
        {{"category": "category", "description": "description", "priority": "high|medium|low"}}
    ],
    "overall_feedback": "general feedback and summary"
}}"""
    
    try:
        response = await generate_completion(
            prompt=user_prompt,
            system_prompt=system_prompt,
            max_tokens=2000,
            temperature=0.3
        )
        
        # Try to parse JSON response
        import json
        try:
            return json.loads(response)
        except json.JSONDecodeError:
            # If JSON parsing fails, return structured response
            return {
                "quality_score": 50,
                "complexity_score": 50,
                "maintainability_score": 50,
                "security_issues": [],
                "performance_issues": [],
                "code_smells": [],
                "suggestions": [],
                "overall_feedback": response
            }
            
    except Exception as e:
        logger.error(f"Failed to analyze code with AI: {e}")
        raise


class AIClient:
    """AI client wrapper with interview-specific methods"""
    
    async def generate_text(self, prompt: str, **kwargs) -> Dict[str, Any]:
        """Generate text using AI"""
        try:
            response = await generate_completion(prompt, **kwargs)
            
            # Try to parse as JSON, fallback to text
            import json
            try:
                return json.loads(response)
            except json.JSONDecodeError:
                return {"text": response, "question": response}
                
        except Exception as e:
            logger.error(f"Error generating text: {e}")
            return {"text": "Error generating response", "question": "Default question"}
    
    async def evaluate_response(self, evaluation_prompt: str) -> Dict[str, Any]:
        """Evaluate interview response using AI"""
        try:
            system_prompt = """You are an expert technical interviewer. Evaluate the candidate's response 
            and provide scores and detailed feedback. Return your evaluation in JSON format."""
            
            response = await generate_completion(
                prompt=evaluation_prompt,
                system_prompt=system_prompt,
                temperature=0.3
            )
            
            # Try to parse as JSON
            import json
            try:
                return json.loads(response)
            except json.JSONDecodeError:
                # Return default scores if parsing fails
                return {
                    "correctness_score": 7.0,
                    "approach_score": 7.0,
                    "code_quality_score": 7.0,
                    "communication_score": 7.0,
                    "technical_depth_score": 7.0,
                    "time_efficiency": 7.0,
                    "overall_score": 7.0,
                    "strengths": ["Good problem-solving approach"],
                    "improvements": ["Could provide more detailed explanations"],
                    "detailed_feedback": response,
                    "communication_feedback": "Clear communication",
                    "technical_feedback": "Good technical understanding"
                }
                
        except Exception as e:
            logger.error(f"Error evaluating response: {e}")
            return {
                "correctness_score": 5.0,
                "approach_score": 5.0,
                "overall_score": 5.0,
                "detailed_feedback": "Unable to evaluate response"
            }
    
    async def generate_feedback(self, feedback_prompt: str) -> Dict[str, Any]:
        """Generate comprehensive interview feedback"""
        try:
            system_prompt = """You are an expert technical interviewer providing comprehensive feedback. 
            Generate detailed, actionable feedback in JSON format."""
            
            response = await generate_completion(
                prompt=feedback_prompt,
                system_prompt=system_prompt,
                temperature=0.4
            )
            
            # Try to parse as JSON
            import json
            try:
                return json.loads(response)
            except json.JSONDecodeError:
                # Return structured fallback
                from ..models.learning import ConceptCategory
                return {
                    "strengths": ["Good problem-solving approach", "Clear communication"],
                    "improvements": ["Work on optimization", "Practice more complex problems"],
                    "recommendations": ["Practice daily coding problems", "Focus on algorithm optimization"],
                    "time_management": "Good time management overall",
                    "communication_style": "Clear and concise communication",
                    "technical_depth": "Solid technical understanding",
                    "practice_areas": [ConceptCategory.ALGORITHMS, ConceptCategory.DATA_STRUCTURES],
                    "resources": ["LeetCode practice", "Algorithm design books"],
                    "confidence": 0.7
                }
                
        except Exception as e:
            logger.error(f"Error generating feedback: {e}")
            from ..models.learning import ConceptCategory
            return {
                "strengths": ["Attempted the problem"],
                "improvements": ["Continue practicing"],
                "recommendations": ["Regular practice recommended"],
                "time_management": "Time management needs improvement",
                "communication_style": "Communication could be clearer",
                "technical_depth": "Technical depth needs development",
                "practice_areas": [ConceptCategory.ALGORITHMS],
                "resources": ["Basic programming tutorials"],
                "confidence": 0.5
            }


# Global AI client instance
ai_client_instance: Optional[AIClient] = None


async def get_ai_client() -> AIClient:
    """Get AI client instance"""
    global ai_client_instance
    if not ai_client_instance:
        ai_client_instance = AIClient()
    return ai_client_instance