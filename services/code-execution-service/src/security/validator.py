import re
import logging
from typing import List, Optional
from src.models.execution import Language

logger = logging.getLogger(__name__)


class SecurityValidator:
    """
    Security validator for code execution to prevent malicious code execution.
    Implements multiple layers of security checks.
    """
    
    def __init__(self):
        # Dangerous patterns that should be blocked
        self.dangerous_patterns = {
            'common': [
                r'import\s+os',
                r'import\s+sys',
                r'import\s+subprocess',
                r'import\s+socket',
                r'import\s+urllib',
                r'import\s+requests',
                r'import\s+http',
                r'__import__',
                r'eval\s*\(',
                r'exec\s*\(',
                r'compile\s*\(',
                r'open\s*\(',
                r'file\s*\(',
                r'input\s*\(',
                r'raw_input\s*\(',
            ],
            'python': [
                r'import\s+pickle',
                r'import\s+marshal',
                r'import\s+ctypes',
                r'import\s+multiprocessing',
                r'import\s+threading',
                r'import\s+asyncio',
                r'globals\s*\(',
                r'locals\s*\(',
                r'vars\s*\(',
                r'dir\s*\(',
                r'getattr\s*\(',
                r'setattr\s*\(',
                r'hasattr\s*\(',
                r'delattr\s*\(',
            ],
            'javascript': [
                r'require\s*\(',
                r'process\.',
                r'global\.',
                r'Buffer\.',
                r'setTimeout',
                r'setInterval',
                r'XMLHttpRequest',
                r'fetch\s*\(',
                r'import\s+',
                r'export\s+',
            ],
            'java': [
                r'Runtime\.getRuntime',
                r'ProcessBuilder',
                r'System\.exit',
                r'System\.getProperty',
                r'System\.setProperty',
                r'Class\.forName',
                r'Thread\.',
                r'Reflection',
                r'java\.io\.File',
                r'java\.net\.',
                r'java\.lang\.reflect',
            ],
            'cpp': [
                r'#include\s*<fstream>',
                r'#include\s*<iostream>',
                r'system\s*\(',
                r'popen\s*\(',
                r'fork\s*\(',
                r'exec\s*\(',
                r'pthread_',
                r'std::thread',
                r'std::async',
            ],
            'go': [
                r'import\s+"os"',
                r'import\s+"os/exec"',
                r'import\s+"net"',
                r'import\s+"net/http"',
                r'import\s+"syscall"',
                r'import\s+"unsafe"',
                r'os\.',
                r'exec\.',
                r'syscall\.',
            ],
            'rust': [
                r'use\s+std::process',
                r'use\s+std::fs',
                r'use\s+std::net',
                r'use\s+std::thread',
                r'use\s+std::sync',
                r'unsafe\s*{',
                r'std::process::',
                r'std::fs::',
                r'std::net::',
            ]
        }
        
        # Maximum code length limits
        self.max_code_length = {
            'python': 10000,
            'javascript': 10000,
            'java': 15000,
            'cpp': 15000,
            'go': 12000,
            'rust': 15000,
        }
    
    def validate_code(self, request) -> List[str]:
        """
        Validate user code for security violations.
        
        Args:
            request: ExecutionRequest object
            
        Returns:
            List of security violations (empty if valid)
        """
        violations = []
        
        try:
            # Check code length
            max_length = self.max_code_length.get(request.language.value, 10000)
            if len(request.code) > max_length:
                violations.append(f"Code exceeds maximum length of {max_length} characters")
            
            # Check for dangerous patterns
            code_violations = self._check_dangerous_patterns(
                request.code, request.language
            )
            violations.extend(code_violations)
            
            # Language-specific validations
            lang_violations = self._validate_language_specific(
                request.code, request.language
            )
            violations.extend(lang_violations)
            
            # Check test cases
            for i, test_case in enumerate(request.test_cases):
                tc_violations = self.validate_input_output(
                    test_case.input, test_case.expected_output
                )
                if tc_violations:
                    violations.extend([f"Test case {i+1}: {v}" for v in tc_violations])
            
        except Exception as e:
            logger.error(f"Error during security validation: {e}")
            violations.append("Security validation failed")
        
        return violations
    
    def _check_dangerous_patterns(self, code: str, language: Language) -> List[str]:
        """Check for dangerous code patterns."""
        violations = []
        
        # Check common dangerous patterns
        for pattern in self.dangerous_patterns['common']:
            if re.search(pattern, code, re.IGNORECASE):
                violations.append(f"Dangerous pattern detected: {pattern}")
        
        # Check language-specific patterns
        lang_patterns = self.dangerous_patterns.get(language.value, [])
        for pattern in lang_patterns:
            if re.search(pattern, code, re.IGNORECASE):
                violations.append(f"Dangerous {language.value} pattern: {pattern}")
        
        return violations
    
    def _validate_language_specific(self, code: str, language: Language) -> List[str]:
        """Perform language-specific security validations."""
        violations = []
        
        if language == Language.PYTHON:
            violations.extend(self._validate_python_specific(code))
        elif language == Language.JAVASCRIPT:
            violations.extend(self._validate_javascript_specific(code))
        elif language == Language.JAVA:
            violations.extend(self._validate_java_specific(code))
        elif language == Language.CPP:
            violations.extend(self._validate_cpp_specific(code))
        elif language == Language.GO:
            violations.extend(self._validate_go_specific(code))
        elif language == Language.RUST:
            violations.extend(self._validate_rust_specific(code))
        
        return violations
    
    def _validate_python_specific(self, code: str) -> List[str]:
        """Python-specific security validations."""
        violations = []
        
        # Check for dangerous built-ins
        dangerous_builtins = [
            '__builtins__', '__globals__', '__locals__',
            'breakpoint', 'memoryview', 'bytearray'
        ]
        
        for builtin in dangerous_builtins:
            if builtin in code:
                violations.append(f"Dangerous Python builtin: {builtin}")
        
        # Check for magic methods that could be dangerous
        if re.search(r'__\w+__', code):
            violations.append("Magic methods not allowed")
        
        return violations
    
    def _validate_javascript_specific(self, code: str) -> List[str]:
        """JavaScript-specific security validations."""
        violations = []
        
        # Check for dangerous global objects
        dangerous_globals = ['window', 'document', 'location', 'navigator']
        for global_obj in dangerous_globals:
            if global_obj in code:
                violations.append(f"Dangerous JavaScript global: {global_obj}")
        
        return violations
    
    def _validate_java_specific(self, code: str) -> List[str]:
        """Java-specific security validations."""
        violations = []
        
        # Check for dangerous Java classes
        dangerous_classes = [
            'Runtime', 'ProcessBuilder', 'ClassLoader',
            'SecurityManager', 'System'
        ]
        
        for cls in dangerous_classes:
            if cls in code:
                violations.append(f"Dangerous Java class: {cls}")
        
        return violations
    
    def _validate_cpp_specific(self, code: str) -> List[str]:
        """C++-specific security validations."""
        violations = []
        
        # Check for dangerous C++ features
        if 'asm' in code or '__asm__' in code:
            violations.append("Inline assembly not allowed")
        
        return violations
    
    def _validate_go_specific(self, code: str) -> List[str]:
        """Go-specific security validations."""
        violations = []
        
        # Check for CGO usage
        if 'import "C"' in code or '//export' in code:
            violations.append("CGO not allowed")
        
        return violations
    
    def _validate_rust_specific(self, code: str) -> List[str]:
        """Rust-specific security validations."""
        violations = []
        
        # Unsafe blocks are already checked in patterns
        # Additional Rust-specific checks can be added here
        
        return violations
    
    def validate_input_output(self, input_data: str, expected_output: str) -> List[str]:
        """
        Validate test case input and output for security issues.
        
        Args:
            input_data: Test case input
            expected_output: Expected output
            
        Returns:
            List of violations
        """
        violations = []
        
        # Check input length
        if len(input_data) > 10000:
            violations.append("Input data too large")
        
        # Check output length
        if len(expected_output) > 10000:
            violations.append("Expected output too large")
        
        # Check for suspicious patterns in input/output
        suspicious_patterns = [
            r'<script',
            r'javascript:',
            r'data:',
            r'file://',
            r'http://',
            r'https://',
        ]
        
        for pattern in suspicious_patterns:
            if re.search(pattern, input_data, re.IGNORECASE):
                violations.append(f"Suspicious pattern in input: {pattern}")
            if re.search(pattern, expected_output, re.IGNORECASE):
                violations.append(f"Suspicious pattern in output: {pattern}")
        
        return violations
    
    def sanitize_code(self, code: str, language: Language) -> str:
        """
        Sanitize code by removing or replacing dangerous elements.
        
        Args:
            code: Code to sanitize
            language: Programming language
            
        Returns:
            Sanitized code
        """
        try:
            # Remove comments that might contain dangerous instructions
            if language == Language.PYTHON:
                code = re.sub(r'#.*$', '', code, flags=re.MULTILINE)
            elif language in [Language.JAVASCRIPT, Language.JAVA, Language.CPP, Language.GO, Language.RUST]:
                code = re.sub(r'//.*$', '', code, flags=re.MULTILINE)
                code = re.sub(r'/\*.*?\*/', '', code, flags=re.DOTALL)
            
            # Remove excessive whitespace
            code = re.sub(r'\n\s*\n\s*\n', '\n\n', code)
            
            # Limit line length
            lines = code.split('\n')
            sanitized_lines = []
            for line in lines:
                if len(line) > 500:
                    sanitized_lines.append(line[:500] + '  # Line truncated')
                else:
                    sanitized_lines.append(line)
            
            return '\n'.join(sanitized_lines)
            
        except Exception as e:
            logger.error(f"Error sanitizing code: {e}")
            return code
    
    def is_safe_for_execution(self, code: str, language: Language) -> tuple[bool, List[str]]:
        """
        Final safety check before code execution.
        
        Args:
            code: Code to check
            language: Programming language
            
        Returns:
            Tuple of (is_safe, violations)
        """
        violations = []
        
        # Basic checks
        if not code or not code.strip():
            violations.append("Empty code")
            return False, violations
        
        # Check for infinite loops (basic heuristic)
        if self._has_potential_infinite_loop(code, language):
            violations.append("Potential infinite loop detected")
        
        # Check for excessive recursion patterns
        if self._has_excessive_recursion(code, language):
            violations.append("Excessive recursion detected")
        
        return len(violations) == 0, violations
    
    def _has_potential_infinite_loop(self, code: str, language: Language) -> bool:
        """Detect potential infinite loops (basic heuristic)."""
        try:
            # Look for while True or for loops without clear termination
            if language == Language.PYTHON:
                if re.search(r'while\s+True\s*:', code):
                    return True
                if re.search(r'while\s+1\s*:', code):
                    return True
            elif language == Language.JAVASCRIPT:
                if re.search(r'while\s*\(\s*true\s*\)', code):
                    return True
                if re.search(r'for\s*\(\s*;\s*;\s*\)', code):
                    return True
            elif language == Language.JAVA:
                if re.search(r'while\s*\(\s*true\s*\)', code):
                    return True
            elif language == Language.CPP:
                if re.search(r'while\s*\(\s*true\s*\)', code):
                    return True
                if re.search(r'while\s*\(\s*1\s*\)', code):
                    return True
            
            return False
        except Exception:
            return False
    
    def _has_excessive_recursion(self, code: str, language: Language) -> bool:
        """Detect excessive recursion patterns."""
        try:
            # Count function definitions and recursive calls
            if language == Language.PYTHON:
                functions = re.findall(r'def\s+(\w+)', code)
                for func in functions:
                    # Count recursive calls
                    recursive_calls = len(re.findall(rf'{func}\s*\(', code))
                    if recursive_calls > 10:  # Arbitrary threshold
                        return True
            
            return False
        except Exception:
            return False