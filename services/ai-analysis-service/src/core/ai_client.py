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