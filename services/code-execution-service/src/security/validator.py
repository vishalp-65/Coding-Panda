import re
from typing import List, Dict, Any
from src.models.execution import Language, ExecutionRequest
from src.config.settings import settings


class SecurityValidator:
    """Validates code for security violations before execution."""
    
    def __init__(self):
        self.blocked_patterns = {
            Language.PYTHON: [
                r'import\s+(os|sys|subprocess|socket|urllib|requests)',
                r'from\s+(os|sys|subprocess|socket|urllib|requests)',
                r'__import__\s*\(',
                r'eval\s*\(',
                r'exec\s*\(',
                r'compile\s*\(',
                r'open\s*\(',
                r'file\s*\(',
                r'input\s*\(',
                r'raw_input\s*\(',
            ],
            Language.JAVASCRIPT: [
                r'require\s*\(\s*[\'"]fs[\'"]',
                r'require\s*\(\s*[\'"]child_process[\'"]',
                r'require\s*\(\s*[\'"]net[\'"]',
                r'require\s*\(\s*[\'"]http[\'"]',
                r'require\s*\(\s*[\'"]https[\'"]',
                r'eval\s*\(',
                r'Function\s*\(',
                r'setTimeout\s*\(',
                r'setInterval\s*\(',
            ],
            Language.JAVA: [
                r'import\s+java\.io\.',
                r'import\s+java\.net\.',
                r'Runtime\.getRuntime\(\)',
                r'ProcessBuilder',
                r'System\.exit\(',
                r'System\.in',
                r'Scanner\s*\(',
            ],
            Language.CPP: [
                r'#include\s*<cstdlib>',
                r'#include\s*<system>',
                r'system\s*\(',
                r'exec\s*\(',
                r'popen\s*\(',
                r'fork\s*\(',
                r'cin\s*>>',
                r'getchar\s*\(',
            ],
            Language.GO: [
                r'import\s+"os/exec"',
                r'import\s+"net"',
                r'import\s+"syscall"',
                r'exec\.Command',
                r'os\.Exit\(',
                r'fmt\.Scan',
            ],
            Language.RUST: [
                r'use\s+std::process',
                r'use\s+std::net',
                r'use\s+std::fs',
                r'Command::new',
                r'std::io::stdin\(\)',
                r'process::exit\(',
            ]
        }
    
    def validate_code(self, request: ExecutionRequest) -> List[str]:
        """
        Validates code for security violations.
        Returns list of violation messages.
        """
        violations = []
        
        # Check code length
        if len(request.code) > settings.max_code_length:
            violations.append(f"Code exceeds maximum length of {settings.max_code_length} characters")
        
        # Check for blocked patterns
        if request.language in self.blocked_patterns:
            for pattern in self.blocked_patterns[request.language]:
                if re.search(pattern, request.code, re.IGNORECASE):
                    violations.append(f"Blocked pattern detected: {pattern}")
        
        # Check for suspicious keywords
        suspicious_keywords = [
            'password', 'secret', 'token', 'key', 'credential',
            'admin', 'root', 'sudo', 'chmod', 'chown'
        ]
        
        for keyword in suspicious_keywords:
            if keyword.lower() in request.code.lower():
                violations.append(f"Suspicious keyword detected: {keyword}")
        
        # Check test cases
        if len(request.test_cases) > settings.max_test_cases:
            violations.append(f"Too many test cases: {len(request.test_cases)} > {settings.max_test_cases}")
        
        # Validate resource limits
        if request.time_limit > 30:
            violations.append("Time limit exceeds maximum of 30 seconds")
        
        if request.memory_limit > 512:
            violations.append("Memory limit exceeds maximum of 512MB")
        
        return violations
    
    def sanitize_code(self, code: str, language: Language) -> str:
        """
        Sanitizes code by removing potentially dangerous constructs.
        """
        # Remove comments that might contain malicious instructions
        if language == Language.PYTHON:
            code = re.sub(r'#.*$', '', code, flags=re.MULTILINE)
        elif language in [Language.JAVASCRIPT, Language.CPP, Language.JAVA, Language.GO, Language.RUST]:
            code = re.sub(r'//.*$', '', code, flags=re.MULTILINE)
            code = re.sub(r'/\*.*?\*/', '', code, flags=re.DOTALL)
        
        # Remove excessive whitespace
        code = re.sub(r'\n\s*\n', '\n', code)
        code = code.strip()
        
        return code
    
    def validate_input_output(self, input_data: str, output_data: str) -> List[str]:
        """
        Validates test case input and output for security issues.
        """
        violations = []
        
        # Check for excessively large inputs
        if len(input_data) > 10000:
            violations.append("Input data too large")
        
        if len(output_data) > 10000:
            violations.append("Expected output too large")
        
        # Check for binary data or control characters
        try:
            input_data.encode('utf-8')
            output_data.encode('utf-8')
        except UnicodeEncodeError:
            violations.append("Invalid characters in test data")
        
        return violations