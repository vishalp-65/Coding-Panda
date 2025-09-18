#!/usr/bin/env python3
"""
Simple unit test for AI Analysis Service components
"""
from src.services.security_analyzer import SecurityAnalyzer
from src.services.performance_analyzer import PerformanceAnalyzer
from src.services.quality_analyzer import QualityAnalyzer
from src.services.code_parser import CodeParser, ComplexityAnalyzer
from src.models.analysis import ProgrammingLanguage


def test_security_analyzer():
    """Test security analyzer"""
    print("Testing Security Analyzer...")
    
    analyzer = SecurityAnalyzer()
    
    # Test Python code with security issues
    code = """
def dangerous():
    eval("malicious_code")
    password = "hardcoded_secret"
    import subprocess
    subprocess.call("rm -rf /", shell=True)
"""
    
    issues = analyzer.analyze_security(code, ProgrammingLanguage.PYTHON)
    
    print(f"  - Found {len(issues)} security issues")
    for issue in issues:
        print(f"    - {issue.type}: {issue.description} (Severity: {issue.severity})")
    
    assert len(issues) > 0, "Should detect security issues"
    print("✓ Security analyzer working correctly!")


def test_performance_analyzer():
    """Test performance analyzer"""
    print("\nTesting Performance Analyzer...")
    
    analyzer = PerformanceAnalyzer()
    
    # Test code with performance issues
    code = """
def inefficient():
    items = [1, 2, 3, 4, 5]
    result = []
    for i in range(len(items)):  # Inefficient loop
        result += [items[i]]  # Inefficient concatenation
    return result
"""
    
    issues = analyzer.analyze_performance(code, ProgrammingLanguage.PYTHON)
    
    print(f"  - Found {len(issues)} performance issues")
    for issue in issues:
        print(f"    - {issue.type}: {issue.description}")
    
    assert len(issues) > 0, "Should detect performance issues"
    print("✓ Performance analyzer working correctly!")


def test_quality_analyzer():
    """Test quality analyzer"""
    print("\nTesting Quality Analyzer...")
    
    analyzer = QualityAnalyzer()
    
    # Test code with quality issues
    code = """
def bad_function():
    pass  # Empty function
    
print("debug statement")  # Debug print
# TODO: implement this function
"""
    
    smells = analyzer.analyze_quality(code, ProgrammingLanguage.PYTHON)
    
    print(f"  - Found {len(smells)} code smells")
    for smell in smells:
        print(f"    - {smell.type}: {smell.description}")
    
    assert len(smells) > 0, "Should detect code smells"
    print("✓ Quality analyzer working correctly!")


def test_code_parser():
    """Test code parser"""
    print("\nTesting Code Parser...")
    
    parser = CodeParser()
    
    # Test Python code parsing
    code = """
import os
import sys

def fibonacci(n):
    if n <= 1:
        return n
    return fibonacci(n-1) + fibonacci(n-2)

class Calculator:
    def add(self, a, b):
        return a + b

x = 10
y = 20
"""
    
    result = parser.parse_python_code(code)
    
    print(f"  - Functions found: {len(result.get('functions', []))}")
    print(f"  - Classes found: {len(result.get('classes', []))}")
    print(f"  - Imports found: {len(result.get('imports', []))}")
    print(f"  - Variables found: {len(result.get('variables', []))}")
    
    assert 'functions' in result, "Should parse functions"
    assert len(result['functions']) > 0, "Should find functions"
    assert len(result['classes']) > 0, "Should find classes"
    assert len(result['imports']) > 0, "Should find imports"
    
    print("✓ Code parser working correctly!")


def test_complexity_analyzer():
    """Test complexity analyzer"""
    print("\nTesting Complexity Analyzer...")
    
    analyzer = ComplexityAnalyzer()
    
    # Test complex code
    code = """
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
    
    metrics = analyzer.calculate_complexity_metrics(code, ProgrammingLanguage.PYTHON)
    
    print(f"  - Cyclomatic Complexity: {metrics.cyclomatic_complexity}")
    print(f"  - Cognitive Complexity: {metrics.cognitive_complexity}")
    print(f"  - Lines of Code: {metrics.lines_of_code}")
    print(f"  - Maintainability Index: {metrics.maintainability_index:.1f}")
    
    assert metrics.cyclomatic_complexity > 1, "Should calculate complexity"
    assert metrics.lines_of_code > 0, "Should count lines"
    assert 0 <= metrics.maintainability_index <= 100, "Maintainability should be 0-100"
    
    print("✓ Complexity analyzer working correctly!")


def main():
    """Run simple tests"""
    print("=" * 60)
    print("AI Analysis Service - Component Tests")
    print("=" * 60)
    
    try:
        test_security_analyzer()
        test_performance_analyzer()
        test_quality_analyzer()
        test_code_parser()
        test_complexity_analyzer()
        
        print("\n" + "=" * 60)
        print("✓ All component tests passed successfully!")
        print("✓ AI Analysis Service components are working correctly!")
        print("=" * 60)
        
    except Exception as e:
        print(f"\n✗ Component test failed: {e}")
        print("=" * 60)
        return 1
    
    return 0


if __name__ == "__main__":
    exit(main())