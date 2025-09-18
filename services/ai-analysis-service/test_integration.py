#!/usr/bin/env python3
"""
Simple integration test for AI Analysis Service
"""
import asyncio
from src.services.analysis_service import AnalysisService
from src.models.analysis import AnalysisRequest, ProgrammingLanguage, AnalysisType


async def test_basic_analysis():
    """Test basic code analysis functionality"""
    print("Testing AI Analysis Service...")
    
    # Create analysis service
    service = AnalysisService()
    
    # Test Python code analysis
    python_code = """
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
    
    request = AnalysisRequest(
        code=python_code,
        language=ProgrammingLanguage.PYTHON,
        analysis_types=[AnalysisType.GENERAL],
        include_ai_feedback=False,  # Skip AI to avoid API key requirement
        user_id="test_user_ID",
        problem_context="Two_sum"
    )
    
    try:
        # Mock the cache and AI calls to avoid external dependencies
        import unittest.mock
        
        with unittest.mock.patch('src.core.redis_client.cache_get', return_value=None), \
             unittest.mock.patch('src.core.redis_client.cache_set'), \
             unittest.mock.patch('src.core.ai_client.analyze_code_with_ai', return_value={
                 "overall_feedback": "Good recursive implementation",
                 "security_issues": [],
                 "performance_issues": []
             }):
            
            result = await service.analyze_code(request)
            
            print(f"✓ Analysis completed successfully!")
            print(f"  - Analysis ID: {result.analysis_id}")
            print(f"  - Language: {result.language}")
            print(f"  - Quality Score: {result.quality_score:.1f}/100")
            print(f"  - Security Score: {result.security_score:.1f}/100")
            print(f"  - Performance Score: {result.performance_score:.1f}/100")
            print(f"  - Maintainability Score: {result.maintainability_score:.1f}/100")
            print(f"  - Cyclomatic Complexity: {result.complexity_metrics.cyclomatic_complexity}")
            print(f"  - Lines of Code: {result.complexity_metrics.lines_of_code}")
            print(f"  - Security Issues: {len(result.security_issues)}")
            print(f"  - Performance Issues: {len(result.performance_issues)}")
            print(f"  - Code Smells: {len(result.code_smells)}")
            print(f"  - Analysis Duration: {result.analysis_duration:.2f}s")
            
            # Verify basic expectations
            assert result.quality_score >= 0 and result.quality_score <= 100
            assert result.security_score >= 0 and result.security_score <= 100
            assert result.performance_score >= 0 and result.performance_score <= 100
            assert result.maintainability_score >= 0 and result.maintainability_score <= 100
            assert result.complexity_metrics.cyclomatic_complexity > 0
            assert result.complexity_metrics.lines_of_code > 0
            assert result.analysis_duration > 0
            
            print("✓ All assertions passed!")
            
    except Exception as e:
        print(f"✗ Analysis failed: {e}")
        raise


async def test_security_analysis():
    """Test security analysis functionality"""
    print("\nTesting security analysis...")
    
    service = AnalysisService()
    
    # Test code with security issues
    insecure_code = """
import subprocess
import pickle

def dangerous_function(user_input):
    # This should trigger security warnings
    result = eval(user_input)
    subprocess.call(user_input, shell=True)
    data = pickle.loads(user_input)
    password = "hardcoded_secret"
    return result
"""
    
    request = AnalysisRequest(
        code=insecure_code,
        language=ProgrammingLanguage.PYTHON,
        analysis_types=[AnalysisType.SECURITY],
        include_ai_feedback=False,
        problem_context="Security_test_case",
        user_id="test_user"
    )
    
    try:
        import unittest.mock
        
        with unittest.mock.patch('src.core.redis_client.cache_get', return_value=None), \
             unittest.mock.patch('src.core.redis_client.cache_set'), \
             unittest.mock.patch('src.core.ai_client.analyze_code_with_ai', return_value={
                 "overall_feedback": "Multiple security issues detected",
                 "security_issues": [],
                 "performance_issues": []
             }):
            
            result = await service.analyze_code(request)
            
            print(f"✓ Security analysis completed!")
            print(f"  - Security Issues Found: {len(result.security_issues)}")
            print(f"  - Security Score: {result.security_score:.1f}/100")
            
            # Should detect multiple security issues
            assert len(result.security_issues) > 0, "Should detect security issues in insecure code"
            assert result.security_score < 100, "Security score should be reduced due to issues"
            
            # Print detected issues
            for issue in result.security_issues[:3]:  # Show first 3 issues
                print(f"    - {issue.type}: {issue.description} (Severity: {issue.severity})")
            
            print("✓ Security analysis assertions passed!")
            
    except Exception as e:
        print(f"✗ Security analysis failed: {e}")
        raise


def main():
    """Run integration tests"""
    print("=" * 60)
    print("AI Analysis Service - Integration Test")
    print("=" * 60)
    
    try:
        # Run async tests
        asyncio.run(test_basic_analysis())
        asyncio.run(test_security_analysis())
        
        print("\n" + "=" * 60)
        print("✓ All integration tests passed successfully!")
        print("✓ AI Analysis Service is working correctly!")
        print("=" * 60)
        
    except Exception as e:
        print(f"\n✗ Integration test failed: {e}")
        print("=" * 60)
        return 1
    
    return 0


if __name__ == "__main__":
    exit(main())