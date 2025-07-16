"""
Tests for the main analysis service
"""
import pytest
from unittest.mock import Mock, patch, AsyncMock
from src.services.analysis_service import AnalysisService
from src.models.analysis import (
    AnalysisRequest, ProgrammingLanguage, AnalysisType,
    HintRequest, ExplanationRequest
)


@pytest.fixture
def analysis_service():
    """Create analysis service instance for testing"""
    return AnalysisService()


@pytest.fixture
def sample_python_code():
    """Sample Python code for testing"""
    return """
def fibonacci(n):
    if n <= 1:
        return n
    return fibonacci(n-1) + fibonacci(n-2)

def main():
    result = fibonacci(10)
    print(result)

if __name__ == "__main__":
    main()
"""


@pytest.fixture
def sample_javascript_code():
    """Sample JavaScript code for testing"""
    return """
function fibonacci(n) {
    if (n <= 1) {
        return n;
    }
    return fibonacci(n-1) + fibonacci(n-2);
}

function main() {
    var result = fibonacci(10);
    console.log(result);
}

main();
"""


class TestAnalysisService:
    """Test cases for AnalysisService"""
    
    @pytest.mark.asyncio
    async def test_analyze_python_code(self, analysis_service, sample_python_code):
        """Test Python code analysis"""
        request = AnalysisRequest(
            code=sample_python_code,
            language=ProgrammingLanguage.PYTHON,
            analysis_types=[AnalysisType.GENERAL]
        )
        
        with patch('src.core.redis_client.cache_get', return_value=None), \
             patch('src.core.redis_client.cache_set'), \
             patch('src.core.ai_client.analyze_code_with_ai', return_value={
                 "overall_feedback": "Good recursive implementation",
                 "security_issues": [],
                 "performance_issues": []
             }):
            
            result = await analysis_service.analyze_code(request)
            
            assert result is not None
            assert result.language == ProgrammingLanguage.PYTHON
            assert 0 <= result.quality_score <= 100
            assert 0 <= result.security_score <= 100
            assert 0 <= result.performance_score <= 100
            assert 0 <= result.maintainability_score <= 100
            assert result.complexity_metrics is not None
            assert result.analysis_duration > 0
    
    @pytest.mark.asyncio
    async def test_analyze_javascript_code(self, analysis_service, sample_javascript_code):
        """Test JavaScript code analysis"""
        request = AnalysisRequest(
            code=sample_javascript_code,
            language=ProgrammingLanguage.JAVASCRIPT,
            analysis_types=[AnalysisType.GENERAL]
        )
        
        with patch('src.core.redis_client.cache_get', return_value=None), \
             patch('src.core.redis_client.cache_set'), \
             patch('src.core.ai_client.analyze_code_with_ai', return_value={
                 "overall_feedback": "Consider using const/let instead of var",
                 "security_issues": [],
                 "performance_issues": []
             }):
            
            result = await analysis_service.analyze_code(request)
            
            assert result is not None
            assert result.language == ProgrammingLanguage.JAVASCRIPT
            assert len(result.code_smells) > 0  # Should detect 'var' usage
    
    @pytest.mark.asyncio
    async def test_cached_analysis(self, analysis_service, sample_python_code):
        """Test that cached results are returned"""
        request = AnalysisRequest(
            code=sample_python_code,
            language=ProgrammingLanguage.PYTHON
        )
        
        cached_result = {
            "analysis_id": "test-id",
            "language": "python",
            "quality_score": 85.0,
            "security_score": 90.0,
            "performance_score": 75.0,
            "maintainability_score": 80.0,
            "complexity_metrics": {
                "cyclomatic_complexity": 3,
                "cognitive_complexity": 3,
                "lines_of_code": 10,
                "maintainability_index": 80.0
            },
            "security_issues": [],
            "performance_issues": [],
            "code_smells": [],
            "suggestions": [],
            "analysis_duration": 1.5,
            "cached": False
        }
        
        with patch('src.core.redis_client.cache_get', return_value=cached_result):
            result = await analysis_service.analyze_code(request)
            
            assert result.cached is True
            assert result.quality_score == 85.0
    
    @pytest.mark.asyncio
    async def test_generate_hints(self, analysis_service):
        """Test hint generation"""
        request = HintRequest(
            problem_id="test-problem",
            user_code="def solution(): pass",
            language=ProgrammingLanguage.PYTHON,
            hint_level=2
        )
        
        with patch('src.core.redis_client.cache_get', return_value=None), \
             patch('src.core.redis_client.cache_set'), \
             patch('src.core.ai_client.generate_completion', return_value='[{"level": 1, "content": "Think about the algorithm", "type": "conceptual", "reveals_solution": false}]'):
            
            hints = await analysis_service.generate_hints(request)
            
            assert len(hints) > 0
            assert hints[0].level == 1
            assert hints[0].content is not None
            assert hints[0].reveals_solution is False
    
    @pytest.mark.asyncio
    async def test_explain_code(self, analysis_service, sample_python_code):
        """Test code explanation"""
        request = ExplanationRequest(
            code=sample_python_code,
            language=ProgrammingLanguage.PYTHON,
            detail_level="medium"
        )
        
        ai_response = """{
            "summary": "Recursive fibonacci implementation",
            "detailed_explanation": "This code implements the fibonacci sequence using recursion",
            "time_complexity": "O(2^n)",
            "space_complexity": "O(n)",
            "key_concepts": ["recursion", "fibonacci"],
            "learning_resources": ["recursion tutorial"]
        }"""
        
        with patch('src.core.redis_client.cache_get', return_value=None), \
             patch('src.core.redis_client.cache_set'), \
             patch('src.core.ai_client.generate_completion', return_value=ai_response):
            
            explanation = await analysis_service.explain_code(request)
            
            assert explanation.summary is not None
            assert explanation.detailed_explanation is not None
            assert "recursion" in explanation.key_concepts
    
    @pytest.mark.asyncio
    async def test_security_analysis(self, analysis_service):
        """Test security issue detection"""
        insecure_code = """
import subprocess
import pickle

def dangerous_function(user_input):
    # This should trigger security warnings
    result = eval(user_input)
    subprocess.call(user_input, shell=True)
    data = pickle.loads(user_input)
    return result
"""
        
        request = AnalysisRequest(
            code=insecure_code,
            language=ProgrammingLanguage.PYTHON,
            analysis_types=[AnalysisType.SECURITY]
        )
        
        with patch('src.core.redis_client.cache_get', return_value=None), \
             patch('src.core.redis_client.cache_set'), \
             patch('src.core.ai_client.analyze_code_with_ai', return_value={
                 "overall_feedback": "Multiple security issues detected",
                 "security_issues": [],
                 "performance_issues": []
             }):
            
            result = await analysis_service.analyze_code(request)
            
            # Should detect eval, subprocess with shell=True, and pickle.loads
            assert len(result.security_issues) > 0
            assert result.security_score < 100
    
    @pytest.mark.asyncio
    async def test_performance_analysis(self, analysis_service):
        """Test performance issue detection"""
        inefficient_code = """
def inefficient_function(items):
    result = []
    for i in range(len(items)):  # Inefficient loop
        result += [items[i]]  # Inefficient list concatenation
    return result

def nested_loops(matrix):
    for i in range(len(matrix)):
        for j in range(len(matrix[i])):
            for k in range(len(matrix[i][j])):
                print(matrix[i][j][k])
"""
        
        request = AnalysisRequest(
            code=inefficient_code,
            language=ProgrammingLanguage.PYTHON,
            analysis_types=[AnalysisType.PERFORMANCE]
        )
        
        with patch('src.core.redis_client.cache_get', return_value=None), \
             patch('src.core.redis_client.cache_set'), \
             patch('src.core.ai_client.analyze_code_with_ai', return_value={
                 "overall_feedback": "Performance issues detected",
                 "security_issues": [],
                 "performance_issues": []
             }):
            
            result = await analysis_service.analyze_code(request)
            
            # Should detect inefficient patterns
            assert len(result.performance_issues) > 0
            assert result.performance_score < 100
    
    @pytest.mark.asyncio
    async def test_complexity_calculation(self, analysis_service):
        """Test complexity metrics calculation"""
        complex_code = """
def complex_function(x, y, z):
    if x > 0:
        if y > 0:
            if z > 0:
                for i in range(x):
                    for j in range(y):
                        if i + j > z:
                            return True
                        elif i * j < z:
                            continue
                        else:
                            break
    return False
"""
        
        request = AnalysisRequest(
            code=complex_code,
            language=ProgrammingLanguage.PYTHON,
            analysis_types=[AnalysisType.COMPLEXITY]
        )
        
        with patch('src.core.redis_client.cache_get', return_value=None), \
             patch('src.core.redis_client.cache_set'), \
             patch('src.core.ai_client.analyze_code_with_ai', return_value={
                 "overall_feedback": "High complexity detected",
                 "security_issues": [],
                 "performance_issues": []
             }):
            
            result = await analysis_service.analyze_code(request)
            
            # Should detect high complexity
            assert result.complexity_metrics.cyclomatic_complexity > 5
            assert result.maintainability_score < 90
    
    def test_score_calculation(self, analysis_service):
        """Test score calculation logic"""
        from src.models.analysis import SecurityIssue, PerformanceIssue, CodeSmell, SeverityLevel, ComplexityMetrics
        
        complexity_metrics = ComplexityMetrics(
            cyclomatic_complexity=5,
            cognitive_complexity=6,
            lines_of_code=50,
            maintainability_index=75.0
        )
        
        security_issues = [
            SecurityIssue(
                type="Test Issue",
                severity=SeverityLevel.HIGH,
                description="Test security issue"
            )
        ]
        
        performance_issues = [
            PerformanceIssue(
                type="Test Issue",
                severity=SeverityLevel.MEDIUM,
                description="Test performance issue",
                suggestion="Fix it"
            )
        ]
        
        code_smells = [
            CodeSmell(
                type="Test Smell",
                description="Test code smell",
                suggestion="Fix it"
            )
        ]
        
        scores = analysis_service._calculate_scores(
            complexity_metrics, security_issues, performance_issues, code_smells
        )
        
        assert 0 <= scores["quality"] <= 100
        assert 0 <= scores["security"] <= 100
        assert 0 <= scores["performance"] <= 100
        assert 0 <= scores["maintainability"] <= 100
        
        # Security score should be reduced due to HIGH severity issue
        assert scores["security"] < 100
        
        # Performance score should be reduced due to MEDIUM severity issue
        assert scores["performance"] < 100