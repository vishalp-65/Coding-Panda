import re
from typing import List
from src.models.execution import Language, ExecutionRequest
from src.config.settings import settings


class SecurityValidator:
    """Validates code for security violations before execution."""
    
    BLOCKED_PATTERNS = {
        Language.PYTHON: [
            r'import\s+(os|sys|subprocess|socket|urllib|requests|shutil|pickle)',
            r'from\s+(os|sys|subprocess|socket|urllib|requests|shutil|pickle)',
            r'__import__\s*\(',
            r'eval\s*\(',
            r'exec\s*\(',
            r'compile\s*\(',
            r'open\s*\(',
            r'file\s*\(',
            r'raw_input\s*\(',
        ],
        Language.JAVASCRIPT: [
            r'require\s*\(\s*[\'"]fs[\'"]',
            r'require\s*\(\s*[\'"]child_process[\'"]',
            r'require\s*\(\s*[\'"]net[\'"]',
            r'require\s*\(\s*[\'"]http[\'"]',
            r'require\s*\(\s*[\'"]https[\'"]',
            r'eval\s*\(',
            r'setTimeout\s*\(',
            r'setInterval\s*\(',
        ],
        Language.JAVA: [
            r'import\s+java\.io\.',
            r'import\s+java\.net\.',
            r'Runtime\.getRuntime\(\)',
            r'ProcessBuilder',
            r'System\.exit\(',
            r'exec\s*\(',
            r'fork\s*\(',
            r'popen\s*\(',
            r'getRuntime\s*\(',
            r'getenv\s*\(',
            r'getenv\s*\(',
            r'getenv\s*\(',

        ],
        Language.CPP: [
            r'#include\s*<cstdlib>',
            r'system\s*\(',
            r'exec\s*\(',
            r'popen\s*\(',
            r'fork\s*\(',
            r'getchar\s*\(',
        ],
        Language.GO: [
            r'import\s+"os/exec"',
            r'import\s+"net"',
            r'import\s+"syscall"',
            r'exec\.Command',
            r'os\.Exit\(',
        ],
        Language.RUST: [
            r'use\s+std::process',
            r'use\s+std::net',
            r'use\s+std::fs',
            r'Command::new',
            r'process::exit\(',
        ]
    }
    
    SUSPICIOUS_KEYWORDS = [
        'password', 'secret', 'token', 'api_key', 'credential',
        'admin', 'root', 'sudo', 'chmod', 'chown'
    ]
    
    def validate_code(self, request: ExecutionRequest) -> List[str]:
        """Validates code for security violations."""
        violations = []
        
        # Validate code length
        if len(request.code) > settings.max_code_length:
            violations.append(
                f"Code exceeds maximum length of {settings.max_code_length} characters"
            )
        
        # Check for blocked patterns
        violations.extend(self._check_blocked_patterns(request))
        
        # Check for suspicious keywords
        violations.extend(self._check_suspicious_keywords(request.code))
        
        # Validate test cases
        if len(request.test_cases) > settings.max_test_cases:
            violations.append(
                f"Too many test cases: {len(request.test_cases)} > {settings.max_test_cases}"
            )
        
        # Validate resource limits
        violations.extend(self._validate_resource_limits(request))
        
        return violations
    
    def _check_blocked_patterns(self, request: ExecutionRequest) -> List[str]:
        """Check code for blocked patterns."""
        violations = []
        
        if request.language not in self.BLOCKED_PATTERNS:
            return violations
        
        for pattern in self.BLOCKED_PATTERNS[request.language]:
            if re.search(pattern, request.code, re.IGNORECASE):
                violations.append(f"Blocked pattern detected: {pattern}")
        
        return violations
    
    def _check_suspicious_keywords(self, code: str) -> List[str]:
        """Check for suspicious keywords in code."""
        violations = []
        code_lower = code.lower()
        
        for keyword in self.SUSPICIOUS_KEYWORDS:
            if keyword in code_lower:
                violations.append(f"Suspicious keyword detected: {keyword}")
        
        return violations
    
    def _validate_resource_limits(self, request: ExecutionRequest) -> List[str]:
        """Validate resource limit constraints."""
        violations = []
        
        if request.time_limit > 30:
            violations.append("Time limit exceeds maximum of 30 seconds")
        
        if request.memory_limit > 512:
            violations.append("Memory limit exceeds maximum of 512MB")
        
        return violations
    
    def sanitize_code(self, code: str, language: Language) -> str:
        """Sanitizes code by removing comments and excessive whitespace."""
        # Remove comments based on language
        if language == Language.PYTHON:
            code = re.sub(r'#.*$', '', code, flags=re.MULTILINE)
        elif language in [Language.JAVASCRIPT, Language.CPP, Language.JAVA, 
                          Language.GO, Language.RUST]:
            code = re.sub(r'//.*$', '', code, flags=re.MULTILINE)
            code = re.sub(r'/\*.*?\*/', '', code, flags=re.DOTALL)
        
        # Remove excessive whitespace
        code = re.sub(r'\n\s*\n+', '\n\n', code)
        return code.strip()
    
    def validate_input_output(self, input_data: str, output_data: str) -> List[str]:
        """Validates test case input and output."""
        violations = []
        
        # Check size limits
        if len(input_data) > 10000:
            violations.append("Input data exceeds 10KB limit")
        
        if len(output_data) > 10000:
            violations.append("Expected output exceeds 10KB limit")
        
        # Validate UTF-8 encoding
        try:
            input_data.encode('utf-8')
            output_data.encode('utf-8')
        except UnicodeEncodeError:
            violations.append("Invalid characters in test data")
        
        return violations