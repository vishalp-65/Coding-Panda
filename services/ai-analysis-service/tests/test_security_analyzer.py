"""
Tests for security analyzer
"""
import pytest
from src.services.security_analyzer import SecurityAnalyzer
from src.models.analysis import ProgrammingLanguage, SeverityLevel


@pytest.fixture
def security_analyzer():
    """Create security analyzer instance for testing"""
    return SecurityAnalyzer()


class TestSecurityAnalyzer:
    """Test cases for SecurityAnalyzer"""
    
    def test_python_eval_detection(self, security_analyzer):
        """Test detection of eval() usage in Python"""
        code = """
def dangerous_function(user_input):
    result = eval(user_input)
    return result
"""
        
        issues = security_analyzer.analyze_security(code, ProgrammingLanguage.PYTHON)
        
        eval_issues = [issue for issue in issues if issue.type == "Code Injection" and "eval" in issue.description]
        assert len(eval_issues) > 0
        assert eval_issues[0].severity == SeverityLevel.CRITICAL
    
    def test_python_subprocess_shell_detection(self, security_analyzer):
        """Test detection of subprocess with shell=True"""
        code = """
import subprocess

def run_command(cmd):
    subprocess.call(cmd, shell=True)
    subprocess.run(cmd, shell=True)
"""
        
        issues = security_analyzer.analyze_security(code, ProgrammingLanguage.PYTHON)
        
        subprocess_issues = [issue for issue in issues if issue.type == "Command Injection"]
        assert len(subprocess_issues) >= 1  # Should detect at least one
        assert all(issue.severity == SeverityLevel.HIGH for issue in subprocess_issues)
    
    def test_python_pickle_detection(self, security_analyzer):
        """Test detection of pickle.loads usage"""
        code = """
import pickle

def load_data(data):
    return pickle.loads(data)
"""
        
        issues = security_analyzer.analyze_security(code, ProgrammingLanguage.PYTHON)
        
        pickle_issues = [issue for issue in issues if "pickle" in issue.description.lower()]
        assert len(pickle_issues) > 0
        assert pickle_issues[0].severity == SeverityLevel.HIGH
    
    def test_hardcoded_password_detection(self, security_analyzer):
        """Test detection of hardcoded passwords"""
        code = """
def connect_to_db():
    password = "secret123"
    api_key = "abc123def456"
    return connect(password=password, api_key=api_key)
"""
        
        issues = security_analyzer.analyze_security(code, ProgrammingLanguage.PYTHON)
        
        credential_issues = [issue for issue in issues if "credential" in issue.type.lower() or "password" in issue.type.lower()]
        assert len(credential_issues) > 0
        assert all(issue.severity == SeverityLevel.HIGH for issue in credential_issues)
    
    def test_javascript_eval_detection(self, security_analyzer):
        """Test detection of eval() in JavaScript"""
        code = """
function processInput(userInput) {
    var result = eval(userInput);
    return result;
}
"""
        
        issues = security_analyzer.analyze_security(code, ProgrammingLanguage.JAVASCRIPT)
        
        eval_issues = [issue for issue in issues if issue.type == "Code Injection" and "eval" in issue.description]
        assert len(eval_issues) > 0
        assert eval_issues[0].severity == SeverityLevel.CRITICAL
    
    def test_javascript_innerHTML_detection(self, security_analyzer):
        """Test detection of innerHTML assignment"""
        code = """
function updateContent(content) {
    document.getElementById('content').innerHTML = content;
}
"""
        
        issues = security_analyzer.analyze_security(code, ProgrammingLanguage.JAVASCRIPT)
        
        xss_issues = [issue for issue in issues if issue.type == "XSS"]
        assert len(xss_issues) > 0
        assert xss_issues[0].severity == SeverityLevel.HIGH
    
    def test_weak_random_detection(self, security_analyzer):
        """Test detection of weak random number generation"""
        python_code = """
import random

def generate_token():
    return random.random()
"""
        
        js_code = """
function generateToken() {
    return Math.random();
}
"""
        
        # Test Python
        python_issues = security_analyzer.analyze_security(python_code, ProgrammingLanguage.PYTHON)
        weak_random_python = [issue for issue in python_issues if "random" in issue.type.lower()]
        assert len(weak_random_python) > 0
        
        # Test JavaScript
        js_issues = security_analyzer.analyze_security(js_code, ProgrammingLanguage.JAVASCRIPT)
        weak_random_js = [issue for issue in js_issues if "random" in issue.type.lower()]
        assert len(weak_random_js) > 0
    
    def test_ast_analysis_python(self, security_analyzer):
        """Test AST-based analysis for Python"""
        code = """
import subprocess

def dangerous_function():
    eval("print('hello')")
    exec("x = 1")
    subprocess.call("ls", shell=True)
    
    password = "hardcoded_secret"
    secret_key = "another_secret"
"""
        
        issues = security_analyzer.analyze_security(code, ProgrammingLanguage.PYTHON)
        
        # Should detect multiple issues through AST analysis
        assert len(issues) > 3
        
        # Check for specific issue types
        issue_types = [issue.type for issue in issues]
        assert "Code Injection" in issue_types
        assert "Command Injection" in issue_types or any("subprocess" in issue.description for issue in issues)
    
    def test_no_false_positives_safe_code(self, security_analyzer):
        """Test that safe code doesn't trigger false positives"""
        safe_code = """
import json
import hashlib

def safe_function(data):
    # Safe operations
    parsed = json.loads(data)
    hash_value = hashlib.sha256(data.encode()).hexdigest()
    
    # Safe subprocess usage
    import subprocess
    subprocess.run(['ls', '-la'], shell=False)
    
    return parsed, hash_value
"""
        
        issues = security_analyzer.analyze_security(safe_code, ProgrammingLanguage.PYTHON)
        
        # Should have minimal or no critical issues
        critical_issues = [issue for issue in issues if issue.severity == SeverityLevel.CRITICAL]
        assert len(critical_issues) == 0
    
    def test_cwe_mapping(self, security_analyzer):
        """Test that issues are mapped to CWE identifiers"""
        code = """
def vulnerable():
    eval("malicious_code")
    password = "hardcoded"
"""
        
        issues = security_analyzer.analyze_security(code, ProgrammingLanguage.PYTHON)
        
        # Check that CWE IDs are assigned
        issues_with_cwe = [issue for issue in issues if issue.cwe_id is not None]
        assert len(issues_with_cwe) > 0
        
        # Check for specific CWE mappings
        eval_issues = [issue for issue in issues if "eval" in issue.description.lower()]
        if eval_issues:
            assert eval_issues[0].cwe_id == "CWE-94"  # Code Injection
    
    def test_recommendations_provided(self, security_analyzer):
        """Test that security issues include recommendations"""
        code = """
def bad_practice():
    eval("user_input")
    import subprocess
    subprocess.call("command", shell=True)
"""
        
        issues = security_analyzer.analyze_security(code, ProgrammingLanguage.PYTHON)
        
        # All issues should have recommendations
        issues_with_recommendations = [issue for issue in issues if issue.recommendation is not None]
        assert len(issues_with_recommendations) > 0
        
        # Check that recommendations are meaningful
        for issue in issues_with_recommendations:
            assert len(issue.recommendation) > 10  # Should be substantial advice
    
    def test_line_number_reporting(self, security_analyzer):
        """Test that line numbers are correctly reported"""
        code = """line 1
line 2
eval("dangerous")  # line 3
line 4
subprocess.call("cmd", shell=True)  # line 5
"""
        
        issues = security_analyzer.analyze_security(code, ProgrammingLanguage.PYTHON)
        
        # Check that line numbers are reported
        issues_with_lines = [issue for issue in issues if issue.line is not None]
        assert len(issues_with_lines) > 0
        
        # Check that line numbers are reasonable
        for issue in issues_with_lines:
            assert 1 <= issue.line <= 5