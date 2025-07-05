import pytest
from src.security.validator import SecurityValidator
from src.models.execution import ExecutionRequest, Language, TestCase


class TestSecurityValidator:
    
    def setup_method(self):
        self.validator = SecurityValidator()
    
    def test_validate_safe_python_code(self):
        """Test that safe Python code passes validation."""
        request = ExecutionRequest(
            code="def add(a, b):\n    return a + b\n\nprint(add(2, 3))",
            language=Language.PYTHON,
            test_cases=[TestCase(input="", expected_output="5")]
        )
        
        violations = self.validator.validate_code(request)
        assert len(violations) == 0
    
    def test_detect_dangerous_python_imports(self):
        """Test detection of dangerous Python imports."""
        dangerous_codes = [
            "import os\nos.system('rm -rf /')",
            "import subprocess\nsubprocess.call(['ls'])",
            "from sys import exit\nexit()",
            "__import__('os').system('ls')",
            "eval('print(1)')",
            "exec('x = 1')"
        ]
        
        for code in dangerous_codes:
            request = ExecutionRequest(
                code=code,
                language=Language.PYTHON,
                test_cases=[TestCase(input="", expected_output="")]
            )
            
            violations = self.validator.validate_code(request)
            assert len(violations) > 0, f"Should detect violation in: {code}"
    
    def test_detect_dangerous_javascript_code(self):
        """Test detection of dangerous JavaScript code."""
        dangerous_codes = [
            "require('fs').readFileSync('/etc/passwd')",
            "require('child_process').exec('ls')",
            "eval('console.log(1)')",
            "setTimeout(() => {}, 1000)"
        ]
        
        for code in dangerous_codes:
            request = ExecutionRequest(
                code=code,
                language=Language.JAVASCRIPT,
                test_cases=[TestCase(input="", expected_output="")]
            )
            
            violations = self.validator.validate_code(request)
            assert len(violations) > 0, f"Should detect violation in: {code}"
    
    def test_code_length_validation(self):
        """Test code length validation."""
        long_code = "x = 1\n" * 30000  # Exceeds max length
        
        # Test that Pydantic validation catches this
        with pytest.raises(Exception) as exc_info:
            request = ExecutionRequest(
                code=long_code,
                language=Language.PYTHON,
                test_cases=[TestCase(input="", expected_output="")]
            )
        
        assert "String should have at most" in str(exc_info.value)
    
    def test_resource_limits_validation(self):
        """Test resource limits validation."""
        # Test that Pydantic validation catches this
        with pytest.raises(Exception) as exc_info:
            request = ExecutionRequest(
                code="print('hello')",
                language=Language.PYTHON,
                test_cases=[TestCase(input="", expected_output="hello")],
                time_limit=50,  # Exceeds max
                memory_limit=1000  # Exceeds max
            )
        
        assert "Input should be less than or equal to" in str(exc_info.value)
    
    def test_too_many_test_cases(self):
        """Test validation of too many test cases."""
        test_cases = [TestCase(input=str(i), expected_output=str(i)) for i in range(150)]
        
        # Test that Pydantic validation catches this
        with pytest.raises(Exception) as exc_info:
            request = ExecutionRequest(
                code="print(input())",
                language=Language.PYTHON,
                test_cases=test_cases
            )
        
        assert "List should have at most" in str(exc_info.value)
    
    def test_sanitize_python_code(self):
        """Test Python code sanitization."""
        code_with_comments = """
# This is a comment
def add(a, b):  # Another comment
    return a + b  # Final comment
print(add(2, 3))
"""
        
        sanitized = self.validator.sanitize_code(code_with_comments, Language.PYTHON)
        assert "#" not in sanitized
        assert "def add(a, b):" in sanitized
    
    def test_sanitize_javascript_code(self):
        """Test JavaScript code sanitization."""
        code_with_comments = """
// This is a comment
function add(a, b) {  // Another comment
    return a + b;  // Final comment
}
/* Block comment */
console.log(add(2, 3));
"""
        
        sanitized = self.validator.sanitize_code(code_with_comments, Language.JAVASCRIPT)
        assert "//" not in sanitized
        assert "/*" not in sanitized
        assert "function add(a, b)" in sanitized
    
    def test_validate_input_output(self):
        """Test input/output validation."""
        # Valid input/output
        violations = self.validator.validate_input_output("1 2", "3")
        assert len(violations) == 0
        
        # Too large input
        large_input = "x" * 15000
        violations = self.validator.validate_input_output(large_input, "output")
        assert any("Input data too large" in v for v in violations)
        
        # Too large output
        large_output = "y" * 15000
        violations = self.validator.validate_input_output("input", large_output)
        assert any("Expected output too large" in v for v in violations)
    
    def test_suspicious_keywords_detection(self):
        """Test detection of suspicious keywords."""
        suspicious_codes = [
            "password = 'secret123'",
            "admin_token = 'xyz'",
            "secret_key = 'abc'"
        ]
        
        for code in suspicious_codes:
            request = ExecutionRequest(
                code=code,
                language=Language.PYTHON,
                test_cases=[TestCase(input="", expected_output="")]
            )
            
            violations = self.validator.validate_code(request)
            assert any("Suspicious keyword detected" in v for v in violations)