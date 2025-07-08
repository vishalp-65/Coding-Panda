"""
Code quality analysis service
"""
import logging
import ast
import re
from typing import List, Dict, Any
from ..models.analysis import CodeSmell, SeverityLevel, ProgrammingLanguage

logger = logging.getLogger(__name__)


class QualityAnalyzer:
    """Code quality analyzer"""
    
    def __init__(self):
        self.python_patterns = self._init_python_patterns()
        self.javascript_patterns = self._init_javascript_patterns()
        self.generic_patterns = self._init_generic_patterns()
    
    def _init_python_patterns(self) -> List[Dict[str, Any]]:
        """Initialize Python code quality patterns"""
        return [
            {
                "pattern": r"def\s+\w+\s*\([^)]*\)\s*:\s*$",
                "type": "Empty Function",
                "description": "Function with empty body",
                "suggestion": "Add implementation or use 'pass' with TODO comment"
            },
            {
                "pattern": r"class\s+\w+\s*:\s*$",
                "type": "Empty Class",
                "description": "Class with empty body",
                "suggestion": "Add methods and attributes or use 'pass' with TODO comment"
            },
            {
                "pattern": r"except\s*:\s*pass",
                "type": "Bare Except",
                "description": "Bare except clause that catches all exceptions",
                "suggestion": "Catch specific exceptions and handle them appropriately"
            },
            {
                "pattern": r"print\s*\(",
                "type": "Debug Print",
                "description": "Print statement that might be debug code",
                "suggestion": "Use logging instead of print for production code"
            },
            {
                "pattern": r"TODO|FIXME|HACK|XXX",
                "type": "TODO Comment",
                "description": "TODO or FIXME comment found",
                "suggestion": "Address the TODO item before production deployment"
            }
        ]
    
    def _init_javascript_patterns(self) -> List[Dict[str, Any]]:
        """Initialize JavaScript code quality patterns"""
        return [
            {
                "pattern": r"var\s+\w+",
                "type": "Var Declaration",
                "description": "Use of 'var' instead of 'let' or 'const'",
                "suggestion": "Use 'let' for mutable variables or 'const' for constants"
            },
            {
                "pattern": r"==\s*[^=]",
                "type": "Loose Equality",
                "description": "Use of loose equality operator (==)",
                "suggestion": "Use strict equality operator (===) for better type safety"
            },
            {
                "pattern": r"console\.log\s*\(",
                "type": "Console Log",
                "description": "Console.log statement that might be debug code",
                "suggestion": "Remove console.log statements from production code"
            },
            {
                "pattern": r"function\s+\w+\s*\(\s*\)\s*\{\s*\}",
                "type": "Empty Function",
                "description": "Empty function declaration",
                "suggestion": "Add implementation or remove unused function"
            }
        ]
    
    def _init_generic_patterns(self) -> List[Dict[str, Any]]:
        """Initialize generic code quality patterns"""
        return [
            {
                "pattern": r"(?i)todo|fixme|hack|xxx|bug",
                "type": "Code Comment",
                "description": "Code comment indicating incomplete or problematic code",
                "suggestion": "Address the comment before production deployment"
            },
            {
                "pattern": r"\s{8,}",
                "type": "Deep Indentation",
                "description": "Very deep indentation detected",
                "suggestion": "Consider refactoring to reduce nesting levels"
            },
            {
                "pattern": r".{120,}",
                "type": "Long Line",
                "description": "Line exceeds recommended length",
                "suggestion": "Break long lines for better readability"
            }
        ]
    
    def analyze_quality(self, code: str, language: ProgrammingLanguage) -> List[CodeSmell]:
        """Analyze code quality and detect code smells"""
        smells = []
        
        try:
            # Get language-specific patterns
            patterns = self._get_patterns_for_language(language)
            
            # Analyze with regex patterns
            smells.extend(self._analyze_with_patterns(code, patterns))
            
            # Language-specific analysis
            if language == ProgrammingLanguage.PYTHON:
                smells.extend(self._analyze_python_quality(code))
            elif language in [ProgrammingLanguage.JAVASCRIPT, ProgrammingLanguage.TYPESCRIPT]:
                smells.extend(self._analyze_javascript_quality(code))
            
            # Generic quality analysis
            smells.extend(self._analyze_generic_quality(code))
            
        except Exception as e:
            logger.error(f"Quality analysis failed: {e}")
        
        return smells
    
    def _get_patterns_for_language(self, language: ProgrammingLanguage) -> List[Dict[str, Any]]:
        """Get quality patterns for specific language"""
        patterns = self.generic_patterns.copy()
        
        if language == ProgrammingLanguage.PYTHON:
            patterns.extend(self.python_patterns)
        elif language in [ProgrammingLanguage.JAVASCRIPT, ProgrammingLanguage.TYPESCRIPT]:
            patterns.extend(self.javascript_patterns)
        
        return patterns
    
    def _analyze_with_patterns(self, code: str, patterns: List[Dict[str, Any]]) -> List[CodeSmell]:
        """Analyze code using regex patterns"""
        smells = []
        lines = code.split('\n')
        
        for pattern_info in patterns:
            pattern = pattern_info["pattern"]
            
            for line_num, line in enumerate(lines, 1):
                matches = re.finditer(pattern, line, re.IGNORECASE)
                
                for match in matches:
                    smells.append(CodeSmell(
                        type=pattern_info["type"],
                        description=pattern_info["description"],
                        suggestion=pattern_info["suggestion"],
                        line=line_num
                    ))
        
        return smells
    
    def _analyze_python_quality(self, code: str) -> List[CodeSmell]:
        """Analyze Python-specific quality issues"""
        smells = []
        
        try:
            tree = ast.parse(code)
            
            for node in ast.walk(tree):
                # Check for long functions
                if isinstance(node, ast.FunctionDef):
                    func_lines = self._count_function_lines(node)
                    if func_lines > 50:
                        smells.append(CodeSmell(
                            type="Long Function",
                            description=f"Function '{node.name}' has {func_lines} lines",
                            suggestion="Consider breaking down into smaller functions",
                            line=node.lineno
                        ))
                    
                    # Check for too many parameters
                    param_count = len(node.args.args)
                    if param_count > 5:
                        smells.append(CodeSmell(
                            type="Too Many Parameters",
                            description=f"Function '{node.name}' has {param_count} parameters",
                            suggestion="Consider using a configuration object or breaking down the function",
                            line=node.lineno
                        ))
                
                # Check for long classes
                elif isinstance(node, ast.ClassDef):
                    class_lines = self._count_class_lines(node)
                    if class_lines > 200:
                        smells.append(CodeSmell(
                            type="Large Class",
                            description=f"Class '{node.name}' has {class_lines} lines",
                            suggestion="Consider breaking down into smaller classes",
                            line=node.lineno
                        ))
                
                # Check for magic numbers
                elif isinstance(node, ast.Constant):
                    if isinstance(node.value, (int, float)) and node.value not in [0, 1, -1]:
                        # Skip if it's in a comparison or assignment to a well-named variable
                        if not self._is_acceptable_magic_number_context(node):
                            smells.append(CodeSmell(
                                type="Magic Number",
                                description=f"Magic number {node.value} found",
                                suggestion="Consider using a named constant",
                                line=node.lineno
                            ))
                
                # Check for duplicate code patterns
                elif isinstance(node, ast.If):
                    # This would require more sophisticated analysis
                    pass
        
        except SyntaxError:
            # Skip AST analysis for invalid syntax
            pass
        except Exception as e:
            logger.error(f"Python quality analysis failed: {e}")
        
        return smells
    
    def _analyze_javascript_quality(self, code: str) -> List[CodeSmell]:
        """Analyze JavaScript-specific quality issues"""
        smells = []
        lines = code.split('\n')
        
        # Check for function length
        in_function = False
        function_start = 0
        brace_count = 0
        
        for line_num, line in enumerate(lines, 1):
            line = line.strip()
            
            # Detect function start
            if 'function' in line and '{' in line:
                in_function = True
                function_start = line_num
                brace_count = line.count('{') - line.count('}')
            elif in_function:
                brace_count += line.count('{') - line.count('}')
                
                if brace_count <= 0:
                    # Function ended
                    function_length = line_num - function_start + 1
                    if function_length > 30:
                        smells.append(CodeSmell(
                            type="Long Function",
                            description=f"Function has {function_length} lines",
                            suggestion="Consider breaking down into smaller functions",
                            line=function_start
                        ))
                    in_function = False
            
            # Check for nested callbacks (callback hell)
            if line.count('function(') > 1 or line.count('=>') > 1:
                smells.append(CodeSmell(
                    type="Callback Hell",
                    description="Multiple nested callbacks detected",
                    suggestion="Consider using Promises or async/await",
                    line=line_num
                ))
        
        return smells
    
    def _analyze_generic_quality(self, code: str) -> List[CodeSmell]:
        """Analyze generic quality issues"""
        smells = []
        lines = code.split('\n')
        
        # Check for duplicate lines
        line_counts = {}
        for line_num, line in enumerate(lines, 1):
            stripped_line = line.strip()
            if len(stripped_line) > 10:  # Only check substantial lines
                if stripped_line in line_counts:
                    line_counts[stripped_line].append(line_num)
                else:
                    line_counts[stripped_line] = [line_num]
        
        for line_content, line_numbers in line_counts.items():
            if len(line_numbers) > 2:  # More than 2 occurrences
                smells.append(CodeSmell(
                    type="Duplicate Code",
                    description=f"Line appears {len(line_numbers)} times",
                    suggestion="Consider extracting common code into a function or constant",
                    line=line_numbers[0]
                ))
        
        # Check for excessive blank lines
        blank_line_count = 0
        for line_num, line in enumerate(lines, 1):
            if not line.strip():
                blank_line_count += 1
                if blank_line_count > 3:
                    smells.append(CodeSmell(
                        type="Excessive Blank Lines",
                        description="Too many consecutive blank lines",
                        suggestion="Reduce blank lines for better readability",
                        line=line_num
                    ))
            else:
                blank_line_count = 0
        
        # Check for inconsistent indentation
        indentation_styles = set()
        for line in lines:
            if line.startswith(' ') or line.startswith('\t'):
                leading_whitespace = len(line) - len(line.lstrip())
                if line.startswith(' '):
                    indentation_styles.add(f"spaces_{leading_whitespace}")
                else:
                    indentation_styles.add("tabs")
        
        if len(indentation_styles) > 1:
            smells.append(CodeSmell(
                type="Inconsistent Indentation",
                description="Mixed indentation styles detected",
                suggestion="Use consistent indentation (either spaces or tabs)",
                line=1
            ))
        
        return smells
    
    def _count_function_lines(self, node: ast.FunctionDef) -> int:
        """Count lines in a function"""
        if hasattr(node, 'end_lineno') and node.end_lineno:
            return node.end_lineno - node.lineno + 1
        else:
            # Fallback: estimate based on body
            return len(node.body) * 2  # Rough estimate
    
    def _count_class_lines(self, node: ast.ClassDef) -> int:
        """Count lines in a class"""
        if hasattr(node, 'end_lineno') and node.end_lineno:
            return node.end_lineno - node.lineno + 1
        else:
            # Fallback: estimate based on body
            return len(node.body) * 5  # Rough estimate
    
    def _is_acceptable_magic_number_context(self, node: ast.Constant) -> bool:
        """Check if a magic number is in an acceptable context"""
        # This is a simplified check
        # In practice, you'd analyze the parent nodes more thoroughly
        return False  # For now, flag all magic numbers