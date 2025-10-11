import re
from typing import List, Set, Dict
from src.models.execution import Language, ExecutionRequest
from src.config.settings import settings


class SecurityValidator:
    """Enhanced security validator with comprehensive protection."""
    
    # Compiled regex patterns for better performance
    BLOCKED_PATTERNS: Dict[Language, List[re.Pattern]] = {}
    
    # Extended blocked patterns with more comprehensive coverage
    _PATTERN_DEFINITIONS = {
        Language.PYTHON: [
            # Module imports
            r'import\s+(os|sys|subprocess|socket|urllib|requests|shutil|pickle|ctypes|multiprocessing|threading)',
            r'from\s+(os|sys|subprocess|socket|urllib|requests|shutil|pickle|ctypes|multiprocessing|threading)',
            r'__import__\s*\(',
            # Dangerous functions
            r'eval\s*\(',
            r'exec\s*\(',
            r'compile\s*\(',
            r'globals\s*\(',
            r'locals\s*\(',
            r'vars\s*\(',
            r'dir\s*\(',
            r'__builtins__',
            # File operations
            r'\bopen\s*\(',
            r'\bfile\s*\(',
            r'raw_input\s*\(',
            # r'input\s*\(',  # Allow input() for reading test data
            # Code execution
            r'execfile\s*\(',
            r'reload\s*\(',
            # Unsafe deserialization
            r'marshal\.',
            r'shelve\.',
            # Network and system
            r'webbrowser\.',
            r'ftplib\.',
            r'telnetlib\.',
        ],
        Language.JAVASCRIPT: [
            # Dangerous requires
            # r'require\s*\(\s*[\'"]fs[\'"]',
            r'require\s*\(\s*[\'"]child_process[\'"]',
            r'require\s*\(\s*[\'"]net[\'"]',
            r'require\s*\(\s*[\'"]http[\'"]',
            r'require\s*\(\s*[\'"]https[\'"]',
            r'require\s*\(\s*[\'"]dgram[\'"]',
            r'require\s*\(\s*[\'"]cluster[\'"]',
            r'require\s*\(\s*[\'"]worker_threads[\'"]',
            # Code execution
            r'\beval\s*\(',
            r'Function\s*\(',
            r'setTimeout\s*\(',
            r'setInterval\s*\(',
            r'setImmediate\s*\(',
            # Process manipulation
            r'process\.exit',
            r'process\.kill',
            r'process\.env',
        ],
        Language.JAVA: [
            # Dangerous imports
            r'import\s+java\.io\.',
            r'import\s+java\.net\.',
            r'import\s+java\.nio\.file\.',
            r'import\s+javax\.script\.',
            # Runtime and process
            r'Runtime\.getRuntime\s*\(',
            r'ProcessBuilder',
            r'System\.exit\s*\(',
            r'System\.getenv\s*\(',
            # Reflection
            r'Class\.forName',
            r'\.getClass\s*\(',
            r'\.getDeclaredField',
            r'\.setAccessible',
            # Native code
            r'System\.load',
            r'System\.loadLibrary',
            # Security manager
            r'SecurityManager',
            r'AccessController',
        ],
        Language.CPP: [
            # System headers
            r'#include\s*<cstdlib>',
            r'#include\s*<unistd\.h>',
            r'#include\s*<sys/.*>',
            r'#include\s*<fstream>',
            # Dangerous functions
            r'\bsystem\s*\(',
            r'\bexec[lv]?[pe]?\s*\(',
            r'\bpopen\s*\(',
            r'\bfork\s*\(',
            r'\bvfork\s*\(',
            r'\bgetenv\s*\(',
            r'\bsetenv\s*\(',
            # File operations
            r'\bfopen\s*\(',
            r'\bfreopen\s*\(',
            r'\bremove\s*\(',
            r'\brename\s*\(',
        ],
        Language.GO: [
            # Dangerous imports
            r'import\s+"os/exec"',
            r'import\s+"net"',
            r'import\s+"syscall"',
            r'import\s+"os"',
            r'import\s+"io/ioutil"',
            # Execution
            r'exec\.Command',
            r'os\.Exit\s*\(',
            r'syscall\.',
            # File operations
            r'os\.Open',
            r'os\.Create',
            r'ioutil\.ReadFile',
            r'ioutil\.WriteFile',
        ],
        Language.RUST: [
            # Dangerous uses
            r'use\s+std::process',
            r'use\s+std::net',
            r'use\s+std::fs',
            r'use\s+std::os',
            # Command execution
            r'Command::new',
            r'process::exit\s*\(',
            # File operations
            r'File::open',
            r'File::create',
            r'fs::read',
            r'fs::write',
            # Unsafe code
            r'\bunsafe\s+',
        ]
    }
    
    SUSPICIOUS_KEYWORDS = {
        'password', 'secret', 'token', 'api_key', 'credential',
        'admin', 'root', 'sudo', 'chmod', 'chown', 'rm -rf',
        'drop table', 'delete from', 'truncate', 'shutdown'
    }
    
    # Additional security patterns
    SHELL_INJECTION_PATTERNS = [
        # r'[;&|`$]',  # Shell metacharacters
        r'\$\(',     # Command substitution
        r'>\s*/dev/', # Device access
    ]
    
    def __init__(self):
        """Initialize with compiled regex patterns for performance."""
        for language, patterns in self._PATTERN_DEFINITIONS.items():
            self.BLOCKED_PATTERNS[language] = [
                re.compile(pattern, re.IGNORECASE) 
                for pattern in patterns
            ]
        
        self._shell_patterns = [
            re.compile(pattern) for pattern in self.SHELL_INJECTION_PATTERNS
        ]
    
    def validate_code(self, request: ExecutionRequest) -> List[str]:
        """Validates code for security violations with enhanced checks."""
        violations = []
        
        # Basic validation
        if len(request.code) > settings.max_code_length:
            violations.append(
                f"Code exceeds maximum length of {settings.max_code_length} characters"
            )
            return violations  # Exit early if too large
        
        if not request.code.strip():
            violations.append("Code cannot be empty")
            return violations
        
        # Check for blocked patterns
        violations.extend(self._check_blocked_patterns(request))
        
        # Check for suspicious keywords
        violations.extend(self._check_suspicious_keywords(request.code))
        
        # Check for shell injection attempts
        violations.extend(self._check_shell_injection(request.code))
        
        # Check for obfuscation attempts
        violations.extend(self._check_obfuscation(request.code))
        
        # Validate test cases
        if len(request.test_cases) > settings.max_test_cases:
            violations.append(
                f"Too many test cases: {len(request.test_cases)} > {settings.max_test_cases}"
            )
        
        # Validate resource limits
        violations.extend(self._validate_resource_limits(request))
        
        return violations
    
    def _check_blocked_patterns(self, request: ExecutionRequest) -> List[str]:
        """Check code for blocked patterns using compiled regex."""
        violations = []
        
        if request.language not in self.BLOCKED_PATTERNS:
            return violations
        
        code = request.code
        for pattern in self.BLOCKED_PATTERNS[request.language]:
            match = pattern.search(code)
            if match:
                violations.append(
                    f"Blocked operation detected: {match.group()[:50]}"
                )
        
        return violations
    
    def _check_suspicious_keywords(self, code: str) -> List[str]:
        """Check for suspicious keywords efficiently."""
        violations = []
        code_lower = code.lower()
        
        found_keywords = [
            keyword for keyword in self.SUSPICIOUS_KEYWORDS 
            if keyword in code_lower
        ]
        
        if found_keywords:
            violations.append(
                f"Suspicious keywords detected: {', '.join(found_keywords[:3])}"
            )
        
        return violations
    
    def _check_shell_injection(self, code: str) -> List[str]:
        """Check for shell injection attempts."""
        violations = []
        
        for pattern in self._shell_patterns:
            if pattern.search(code):
                violations.append("Potential shell injection pattern detected")
                break
        
        return violations
    
    def _check_obfuscation(self, code: str) -> List[str]:
        """Check for code obfuscation attempts."""
        violations = []
        
        # Check for excessive use of escape sequences
        escape_count = code.count('\\x') + code.count('\\u')
        if escape_count > 10:
            violations.append("Excessive escape sequences detected (possible obfuscation)")
        
        # Check for excessive base64-like strings
        if re.search(r'[A-Za-z0-9+/]{100,}', code):
            violations.append("Long base64-like string detected (possible obfuscation)")
        
        # Check for extreme line length (potential minified malicious code)
        lines = code.split('\n')
        if any(len(line) > 500 for line in lines):
            violations.append("Extremely long code line detected")
        
        return violations
    
    def _validate_resource_limits(self, request: ExecutionRequest) -> List[str]:
        """Validate resource limit constraints."""
        violations = []
        
        if request.time_limit > 30:
            violations.append("Time limit exceeds maximum of 30 seconds")
        
        if request.memory_limit > 512:
            violations.append("Memory limit exceeds maximum of 512MB")
        
        if request.memory_limit < 32:
            violations.append("Memory limit below minimum of 32MB")
        
        return violations
    
    def sanitize_code(self, code: str, language: Language) -> str:
        """Sanitizes code by removing comments and normalizing whitespace."""
        # Remove comments based on language
        if language == Language.PYTHON:
            # Remove single-line comments
            code = re.sub(r'#.*$', '', code, flags=re.MULTILINE)
            # Remove multi-line strings used as comments (basic)
            code = re.sub(r'""".*?"""', '', code, flags=re.DOTALL)
            code = re.sub(r"'''.*?'''", '', code, flags=re.DOTALL)
        
        elif language in [Language.JAVASCRIPT, Language.CPP, Language.JAVA, 
                          Language.GO, Language.RUST]:
            # Remove single-line comments
            code = re.sub(r'//.*$', '', code, flags=re.MULTILINE)
            # Remove multi-line comments
            code = re.sub(r'/\*.*?\*/', '', code, flags=re.DOTALL)
        
        # Normalize whitespace
        code = re.sub(r'\n\s*\n+', '\n\n', code)
        code = re.sub(r'[ \t]+', ' ', code)
        
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
        
        # Check for null bytes
        if '\x00' in input_data or '\x00' in output_data:
            violations.append("Null bytes not allowed in test data")
        
        return violations