"""
Security vulnerability detection service
"""
import logging
import re
import ast
from typing import List, Dict, Any
import subprocess
import tempfile
import os

from ..models.analysis import SecurityIssue, SeverityLevel, ProgrammingLanguage

logger = logging.getLogger(__name__)


class SecurityAnalyzer:
    """Security vulnerability analyzer"""
    
    def __init__(self):
        self.python_patterns = self._init_python_patterns()
        self.javascript_patterns = self._init_javascript_patterns()
        self.generic_patterns = self._init_generic_patterns()
    
    def _init_python_patterns(self) -> List[Dict[str, Any]]:
        """Initialize Python security patterns"""
        return [
            {
                "pattern": r"eval\s*\(",
                "type": "Code Injection",
                "severity": SeverityLevel.CRITICAL,
                "description": "Use of eval() can lead to code injection vulnerabilities",
                "cwe_id": "CWE-94",
                "recommendation": "Avoid using eval(). Use ast.literal_eval() for safe evaluation of literals."
            },
            {
                "pattern": r"exec\s*\(",
                "type": "Code Injection",
                "severity": SeverityLevel.CRITICAL,
                "description": "Use of exec() can lead to code injection vulnerabilities",
                "cwe_id": "CWE-94",
                "recommendation": "Avoid using exec(). Consider alternative approaches for dynamic code execution."
            },
            {
                "pattern": r"subprocess\.(call|run|Popen).*shell\s*=\s*True",
                "type": "Command Injection",
                "severity": SeverityLevel.HIGH,
                "description": "Using shell=True with subprocess can lead to command injection",
                "cwe_id": "CWE-78",
                "recommendation": "Use shell=False and pass arguments as a list instead of a string."
            },
            {
                "pattern": r"pickle\.loads?\s*\(",
                "type": "Deserialization",
                "severity": SeverityLevel.HIGH,
                "description": "Pickle deserialization can execute arbitrary code",
                "cwe_id": "CWE-502",
                "recommendation": "Use safer serialization formats like JSON. If pickle is necessary, validate input sources."
            },
            {
                "pattern": r"random\.random\(\)",
                "type": "Weak Random",
                "severity": SeverityLevel.MEDIUM,
                "description": "random.random() is not cryptographically secure",
                "cwe_id": "CWE-338",
                "recommendation": "Use secrets module for cryptographic purposes."
            },
            {
                "pattern": r"hashlib\.(md5|sha1)\(",
                "type": "Weak Hash",
                "severity": SeverityLevel.MEDIUM,
                "description": "MD5 and SHA1 are cryptographically weak",
                "cwe_id": "CWE-327",
                "recommendation": "Use SHA-256 or stronger hash functions."
            },
            {
                "pattern": r"password\s*=\s*['\"][^'\"]+['\"]",
                "type": "Hardcoded Password",
                "severity": SeverityLevel.HIGH,
                "description": "Hardcoded passwords in source code",
                "cwe_id": "CWE-798",
                "recommendation": "Use environment variables or secure configuration files for passwords."
            }
        ]
    
    def _init_javascript_patterns(self) -> List[Dict[str, Any]]:
        """Initialize JavaScript security patterns"""
        return [
            {
                "pattern": r"eval\s*\(",
                "type": "Code Injection",
                "severity": SeverityLevel.CRITICAL,
                "description": "Use of eval() can lead to code injection vulnerabilities",
                "cwe_id": "CWE-94",
                "recommendation": "Avoid using eval(). Use JSON.parse() for parsing JSON or other safe alternatives."
            },
            {
                "pattern": r"innerHTML\s*=",
                "type": "XSS",
                "severity": SeverityLevel.HIGH,
                "description": "Direct innerHTML assignment can lead to XSS vulnerabilities",
                "cwe_id": "CWE-79",
                "recommendation": "Use textContent or properly sanitize HTML content."
            },
            {
                "pattern": r"document\.write\s*\(",
                "type": "XSS",
                "severity": SeverityLevel.HIGH,
                "description": "document.write() can lead to XSS vulnerabilities",
                "cwe_id": "CWE-79",
                "recommendation": "Use modern DOM manipulation methods instead of document.write()."
            },
            {
                "pattern": r"Math\.random\(\)",
                "type": "Weak Random",
                "severity": SeverityLevel.MEDIUM,
                "description": "Math.random() is not cryptographically secure",
                "cwe_id": "CWE-338",
                "recommendation": "Use crypto.getRandomValues() for cryptographic purposes."
            },
            {
                "pattern": r"password\s*[:=]\s*['\"][^'\"]+['\"]",
                "type": "Hardcoded Password",
                "severity": SeverityLevel.HIGH,
                "description": "Hardcoded passwords in source code",
                "cwe_id": "CWE-798",
                "recommendation": "Use environment variables or secure configuration for passwords."
            }
        ]
    
    def _init_generic_patterns(self) -> List[Dict[str, Any]]:
        """Initialize generic security patterns"""
        return [
            {
                "pattern": r"(?i)(password|pwd|pass|secret|key|token)\s*[:=]\s*['\"][^'\"]+['\"]",
                "type": "Hardcoded Credentials",
                "severity": SeverityLevel.HIGH,
                "description": "Hardcoded credentials found in source code",
                "cwe_id": "CWE-798",
                "recommendation": "Use environment variables or secure configuration files for credentials."
            },
            {
                "pattern": r"(?i)(api_key|apikey|access_token|secret_key)\s*[:=]\s*['\"][^'\"]+['\"]",
                "type": "Hardcoded API Key",
                "severity": SeverityLevel.HIGH,
                "description": "Hardcoded API keys found in source code",
                "cwe_id": "CWE-798",
                "recommendation": "Use environment variables or secure configuration for API keys."
            },
            {
                "pattern": r"(?i)todo.*security|fixme.*security|hack.*security",
                "type": "Security TODO",
                "severity": SeverityLevel.LOW,
                "description": "Security-related TODO or FIXME comment found",
                "cwe_id": "CWE-1188",
                "recommendation": "Address security-related TODO items before production deployment."
            }
        ]
    
    def analyze_security(self, code: str, language: ProgrammingLanguage) -> List[SecurityIssue]:
        """Analyze code for security vulnerabilities"""
        issues = []
        
        try:
            # Get language-specific patterns
            patterns = self._get_patterns_for_language(language)
            
            # Analyze with regex patterns
            issues.extend(self._analyze_with_patterns(code, patterns))
            
            # Language-specific analysis
            if language == ProgrammingLanguage.PYTHON:
                issues.extend(self._analyze_python_ast(code))
            
            # Run external security tools if available
            issues.extend(self._run_external_security_tools(code, language))
            
        except Exception as e:
            logger.error(f"Security analysis failed: {e}")
        
        return issues
    
    def _get_patterns_for_language(self, language: ProgrammingLanguage) -> List[Dict[str, Any]]:
        """Get security patterns for specific language"""
        patterns = self.generic_patterns.copy()
        
        if language == ProgrammingLanguage.PYTHON:
            patterns.extend(self.python_patterns)
        elif language in [ProgrammingLanguage.JAVASCRIPT, ProgrammingLanguage.TYPESCRIPT]:
            patterns.extend(self.javascript_patterns)
        
        return patterns
    
    def _analyze_with_patterns(self, code: str, patterns: List[Dict[str, Any]]) -> List[SecurityIssue]:
        """Analyze code using regex patterns"""
        issues = []
        lines = code.split('\n')
        
        for pattern_info in patterns:
            pattern = pattern_info["pattern"]
            
            for line_num, line in enumerate(lines, 1):
                matches = re.finditer(pattern, line, re.IGNORECASE)
                
                for match in matches:
                    issues.append(SecurityIssue(
                        type=pattern_info["type"],
                        severity=pattern_info["severity"],
                        description=pattern_info["description"],
                        line=line_num,
                        cwe_id=pattern_info.get("cwe_id"),
                        recommendation=pattern_info.get("recommendation")
                    ))
        
        return issues
    
    def _analyze_python_ast(self, code: str) -> List[SecurityIssue]:
        """Analyze Python code using AST"""
        issues = []
        
        try:
            tree = ast.parse(code)
            
            for node in ast.walk(tree):
                # Check for dangerous function calls
                if isinstance(node, ast.Call):
                    if isinstance(node.func, ast.Name):
                        func_name = node.func.id
                        
                        if func_name in ['eval', 'exec']:
                            issues.append(SecurityIssue(
                                type="Code Injection",
                                severity=SeverityLevel.CRITICAL,
                                description=f"Use of {func_name}() can lead to code injection",
                                line=node.lineno,
                                cwe_id="CWE-94",
                                recommendation=f"Avoid using {func_name}(). Consider safer alternatives."
                            ))
                    
                    elif isinstance(node.func, ast.Attribute):
                        # Check for subprocess with shell=True
                        if (isinstance(node.func.value, ast.Name) and 
                            node.func.value.id == 'subprocess' and
                            node.func.attr in ['call', 'run', 'Popen']):
                            
                            for keyword in node.keywords:
                                if (keyword.arg == 'shell' and 
                                    isinstance(keyword.value, ast.Constant) and 
                                    keyword.value.value is True):
                                    
                                    issues.append(SecurityIssue(
                                        type="Command Injection",
                                        severity=SeverityLevel.HIGH,
                                        description="Using shell=True with subprocess can lead to command injection",
                                        line=node.lineno,
                                        cwe_id="CWE-78",
                                        recommendation="Use shell=False and pass arguments as a list."
                                    ))
                
                # Check for hardcoded strings that might be credentials
                elif isinstance(node, ast.Assign):
                    for target in node.targets:
                        if isinstance(target, ast.Name):
                            var_name = target.id.lower()
                            if any(keyword in var_name for keyword in ['password', 'secret', 'key', 'token']):
                                if isinstance(node.value, ast.Constant) and isinstance(node.value.value, str):
                                    issues.append(SecurityIssue(
                                        type="Hardcoded Credentials",
                                        severity=SeverityLevel.HIGH,
                                        description=f"Hardcoded credential in variable '{target.id}'",
                                        line=node.lineno,
                                        cwe_id="CWE-798",
                                        recommendation="Use environment variables for credentials."
                                    ))
        
        except SyntaxError:
            # If code has syntax errors, skip AST analysis
            pass
        except Exception as e:
            logger.error(f"AST security analysis failed: {e}")
        
        return issues
    
    def _run_external_security_tools(self, code: str, language: ProgrammingLanguage) -> List[SecurityIssue]:
        """Run external security analysis tools"""
        issues = []
        
        try:
            if language == ProgrammingLanguage.PYTHON:
                issues.extend(self._run_bandit(code))
        except Exception as e:
            logger.error(f"External security tool analysis failed: {e}")
        
        return issues
    
    def _run_bandit(self, code: str) -> List[SecurityIssue]:
        """Run Bandit security analysis for Python code"""
        issues = []
        
        try:
            # Create temporary file
            with tempfile.NamedTemporaryFile(mode='w', suffix='.py', delete=False) as f:
                f.write(code)
                temp_file = f.name
            
            try:
                # Run bandit
                result = subprocess.run(
                    ['bandit', '-f', 'json', temp_file],
                    capture_output=True,
                    text=True,
                    timeout=10
                )
                
                if result.returncode == 0 or result.returncode == 1:  # 1 means issues found
                    import json
                    try:
                        bandit_results = json.loads(result.stdout)
                        
                        for result_item in bandit_results.get('results', []):
                            severity_map = {
                                'LOW': SeverityLevel.LOW,
                                'MEDIUM': SeverityLevel.MEDIUM,
                                'HIGH': SeverityLevel.HIGH
                            }
                            
                            issues.append(SecurityIssue(
                                type=result_item.get('test_name', 'Security Issue'),
                                severity=severity_map.get(result_item.get('issue_severity', 'MEDIUM'), SeverityLevel.MEDIUM),
                                description=result_item.get('issue_text', 'Security vulnerability detected'),
                                line=result_item.get('line_number'),
                                cwe_id=result_item.get('test_id'),
                                recommendation="Review and fix the security issue identified by Bandit."
                            ))
                    
                    except json.JSONDecodeError:
                        logger.warning("Failed to parse Bandit JSON output")
            
            finally:
                # Clean up temporary file
                os.unlink(temp_file)
        
        except (subprocess.TimeoutExpired, FileNotFoundError):
            # Bandit not available or timed out
            logger.debug("Bandit analysis not available or timed out")
        except Exception as e:
            logger.error(f"Bandit analysis failed: {e}")
        
        return issues