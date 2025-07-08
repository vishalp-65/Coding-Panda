"""
Performance analysis service
"""
import logging
import ast
import re
from typing import List, Dict, Any
from ..models.analysis import PerformanceIssue, SeverityLevel, ProgrammingLanguage

logger = logging.getLogger(__name__)


class PerformanceAnalyzer:
    """Code performance analyzer"""
    
    def __init__(self):
        self.python_patterns = self._init_python_patterns()
        self.javascript_patterns = self._init_javascript_patterns()
        self.generic_patterns = self._init_generic_patterns()
    
    def _init_python_patterns(self) -> List[Dict[str, Any]]:
        """Initialize Python performance patterns"""
        return [
            {
                "pattern": r"for\s+\w+\s+in\s+range\s*\(\s*len\s*\(",
                "type": "Inefficient Loop",
                "severity": SeverityLevel.MEDIUM,
                "description": "Using range(len()) in for loop is inefficient",
                "suggestion": "Use enumerate() or iterate directly over the collection",
                "impact": "O(n) vs O(1) index access"
            },
            {
                "pattern": r"\.append\s*\([^)]*\)\s*$",
                "type": "List Concatenation",
                "severity": SeverityLevel.LOW,
                "description": "Multiple append operations in loop can be inefficient",
                "suggestion": "Consider using list comprehension or extend() for bulk operations",
                "impact": "Reduced memory allocations"
            },
            {
                "pattern": r"\+\s*=\s*\[",
                "type": "List Concatenation",
                "severity": SeverityLevel.MEDIUM,
                "description": "Using += for list concatenation creates new list objects",
                "suggestion": "Use extend() method for better performance",
                "impact": "O(n) vs O(k) where k is the length of the added list"
            },
            {
                "pattern": r"\.keys\(\)\s*\)",
                "type": "Unnecessary Keys Call",
                "severity": SeverityLevel.LOW,
                "description": "Calling .keys() when iterating over dictionary",
                "suggestion": "Iterate directly over dictionary for keys",
                "impact": "Reduced memory usage and faster iteration"
            },
            {
                "pattern": r"global\s+\w+",
                "type": "Global Variable",
                "severity": SeverityLevel.LOW,
                "description": "Global variables can impact performance and maintainability",
                "suggestion": "Consider using function parameters or class attributes",
                "impact": "Improved locality and reduced lookup time"
            }
        ]
    
    def _init_javascript_patterns(self) -> List[Dict[str, Any]]:
        """Initialize JavaScript performance patterns"""
        return [
            {
                "pattern": r"document\.getElementById",
                "type": "DOM Query",
                "severity": SeverityLevel.LOW,
                "description": "Repeated DOM queries can be expensive",
                "suggestion": "Cache DOM elements in variables",
                "impact": "Reduced DOM traversal overhead"
            },
            {
                "pattern": r"for\s*\(\s*var\s+\w+\s*=\s*0\s*;\s*\w+\s*<\s*\w+\.length",
                "type": "Length Property Access",
                "severity": SeverityLevel.LOW,
                "description": "Accessing length property in loop condition",
                "suggestion": "Cache array length in a variable",
                "impact": "Reduced property access overhead"
            },
            {
                "pattern": r"innerHTML\s*\+=",
                "type": "DOM Manipulation",
                "severity": SeverityLevel.MEDIUM,
                "description": "Using innerHTML += causes DOM reflow",
                "suggestion": "Build string first, then assign once, or use DocumentFragment",
                "impact": "Reduced DOM reflows and improved rendering performance"
            },
            {
                "pattern": r"eval\s*\(",
                "type": "Code Evaluation",
                "severity": SeverityLevel.HIGH,
                "description": "eval() is slow and prevents optimizations",
                "suggestion": "Use alternative approaches like JSON.parse() or Function constructor",
                "impact": "Significant performance improvement and better optimization"
            }
        ]
    
    def _init_generic_patterns(self) -> List[Dict[str, Any]]:
        """Initialize generic performance patterns"""
        return [
            {
                "pattern": r"(?i)sleep\s*\(",
                "type": "Blocking Operation",
                "severity": SeverityLevel.MEDIUM,
                "description": "Synchronous sleep operations block execution",
                "suggestion": "Use asynchronous alternatives or proper scheduling",
                "impact": "Improved responsiveness and resource utilization"
            },
            {
                "pattern": r"(?i)while\s+true\s*:",
                "type": "Infinite Loop",
                "severity": SeverityLevel.HIGH,
                "description": "Infinite loops without proper exit conditions",
                "suggestion": "Add proper exit conditions and consider event-driven approaches",
                "impact": "Prevents CPU spinning and resource exhaustion"
            }
        ]
    
    def analyze_performance(self, code: str, language: ProgrammingLanguage) -> List[PerformanceIssue]:
        """Analyze code for performance issues"""
        issues = []
        
        try:
            # Get language-specific patterns
            patterns = self._get_patterns_for_language(language)
            
            # Analyze with regex patterns
            issues.extend(self._analyze_with_patterns(code, patterns))
            
            # Language-specific analysis
            if language == ProgrammingLanguage.PYTHON:
                issues.extend(self._analyze_python_performance(code))
            elif language in [ProgrammingLanguage.JAVASCRIPT, ProgrammingLanguage.TYPESCRIPT]:
                issues.extend(self._analyze_javascript_performance(code))
            
            # Generic algorithmic analysis
            issues.extend(self._analyze_algorithmic_complexity(code, language))
            
        except Exception as e:
            logger.error(f"Performance analysis failed: {e}")
        
        return issues
    
    def _get_patterns_for_language(self, language: ProgrammingLanguage) -> List[Dict[str, Any]]:
        """Get performance patterns for specific language"""
        patterns = self.generic_patterns.copy()
        
        if language == ProgrammingLanguage.PYTHON:
            patterns.extend(self.python_patterns)
        elif language in [ProgrammingLanguage.JAVASCRIPT, ProgrammingLanguage.TYPESCRIPT]:
            patterns.extend(self.javascript_patterns)
        
        return patterns
    
    def _analyze_with_patterns(self, code: str, patterns: List[Dict[str, Any]]) -> List[PerformanceIssue]:
        """Analyze code using regex patterns"""
        issues = []
        lines = code.split('\n')
        
        for pattern_info in patterns:
            pattern = pattern_info["pattern"]
            
            for line_num, line in enumerate(lines, 1):
                matches = re.finditer(pattern, line, re.IGNORECASE)
                
                for match in matches:
                    issues.append(PerformanceIssue(
                        type=pattern_info["type"],
                        severity=pattern_info["severity"],
                        description=pattern_info["description"],
                        suggestion=pattern_info["suggestion"],
                        impact=pattern_info.get("impact", "Performance improvement")
                    ))
        
        return issues
    
    def _analyze_python_performance(self, code: str) -> List[PerformanceIssue]:
        """Analyze Python-specific performance issues"""
        issues = []
        
        try:
            tree = ast.parse(code)
            
            for node in ast.walk(tree):
                # Check for nested loops
                if isinstance(node, (ast.For, ast.While)):
                    nested_loops = self._count_nested_loops(node)
                    if nested_loops > 2:
                        issues.append(PerformanceIssue(
                            type="Nested Loops",
                            severity=SeverityLevel.HIGH,
                            description=f"Found {nested_loops} levels of nested loops",
                            suggestion="Consider optimizing algorithm complexity or using more efficient data structures",
                            impact=f"Potential O(n^{nested_loops}) time complexity"
                        ))
                
                # Check for string concatenation in loops
                elif isinstance(node, ast.AugAssign) and isinstance(node.op, ast.Add):
                    if self._is_in_loop(node, tree):
                        if isinstance(node.target, ast.Name):
                            issues.append(PerformanceIssue(
                                type="String Concatenation in Loop",
                                severity=SeverityLevel.MEDIUM,
                                description="String concatenation in loop creates multiple string objects",
                                suggestion="Use list and join() or StringIO for better performance",
                                impact="O(n²) vs O(n) time complexity"
                            ))
                
                # Check for inefficient data structure usage
                elif isinstance(node, ast.Call):
                    if isinstance(node.func, ast.Attribute):
                        if node.func.attr == 'append' and self._is_in_loop(node, tree):
                            # This is already covered by patterns, but we can add more context
                            pass
        
        except SyntaxError:
            # Skip AST analysis for invalid syntax
            pass
        except Exception as e:
            logger.error(f"Python performance analysis failed: {e}")
        
        return issues
    
    def _analyze_javascript_performance(self, code: str) -> List[PerformanceIssue]:
        """Analyze JavaScript-specific performance issues"""
        issues = []
        
        # Check for common JavaScript performance anti-patterns
        lines = code.split('\n')
        
        for line_num, line in enumerate(lines, 1):
            line = line.strip()
            
            # Check for jQuery-like repeated selections
            if line.count('$') > 2 or line.count('document.') > 1:
                issues.append(PerformanceIssue(
                    type="Repeated DOM Selection",
                    severity=SeverityLevel.MEDIUM,
                    description="Multiple DOM selections in single line",
                    suggestion="Cache DOM elements in variables",
                    impact="Reduced DOM query overhead"
                ))
            
            # Check for synchronous AJAX (if detectable)
            if 'async: false' in line or 'async:false' in line:
                issues.append(PerformanceIssue(
                    type="Synchronous AJAX",
                    severity=SeverityLevel.HIGH,
                    description="Synchronous AJAX blocks UI thread",
                    suggestion="Use asynchronous AJAX calls",
                    impact="Improved user experience and responsiveness"
                ))
        
        return issues
    
    def _analyze_algorithmic_complexity(self, code: str, language: ProgrammingLanguage) -> List[PerformanceIssue]:
        """Analyze algorithmic complexity patterns"""
        issues = []
        
        # Count nested loops (generic approach)
        nested_loop_count = 0
        lines = code.split('\n')
        loop_depth = 0
        max_depth = 0
        
        for line in lines:
            line = line.strip()
            
            # Count loop starts (language-agnostic patterns)
            if any(pattern in line.lower() for pattern in ['for ', 'while ', 'foreach']):
                loop_depth += 1
                max_depth = max(max_depth, loop_depth)
            
            # Count loop ends (simplified - count closing braces/dedents)
            if line in ['}', 'end'] or (line == '' and loop_depth > 0):
                loop_depth = max(0, loop_depth - 1)
        
        if max_depth > 2:
            issues.append(PerformanceIssue(
                type="High Algorithmic Complexity",
                severity=SeverityLevel.HIGH,
                description=f"Detected {max_depth} levels of nested loops",
                suggestion="Consider optimizing algorithm or using more efficient data structures",
                impact=f"Potential O(n^{max_depth}) time complexity"
            ))
        
        # Check for potential O(n²) patterns
        if 'sort' in code.lower() and max_depth > 1:
            issues.append(PerformanceIssue(
                type="Sorting in Nested Loop",
                severity=SeverityLevel.HIGH,
                description="Sorting operation inside nested structure",
                suggestion="Move sorting outside loops or use more efficient algorithms",
                impact="Potential O(n² log n) or worse time complexity"
            ))
        
        return issues
    
    def _count_nested_loops(self, node: ast.AST) -> int:
        """Count nested loops in AST node"""
        max_depth = 0
        current_depth = 0
        
        def visit_node(n, depth):
            nonlocal max_depth
            if isinstance(n, (ast.For, ast.While)):
                depth += 1
                max_depth = max(max_depth, depth)
            
            for child in ast.iter_child_nodes(n):
                visit_node(child, depth)
        
        visit_node(node, current_depth)
        return max_depth
    
    def _is_in_loop(self, node: ast.AST, tree: ast.AST) -> bool:
        """Check if a node is inside a loop"""
        # This is a simplified implementation
        # In practice, you'd need to traverse the AST to find parent nodes
        
        class LoopFinder(ast.NodeVisitor):
            def __init__(self, target_node):
                self.target_node = target_node
                self.in_loop = False
                self.loop_stack = []
            
            def visit_For(self, node):
                self.loop_stack.append(node)
                self.generic_visit(node)
                self.loop_stack.pop()
            
            def visit_While(self, node):
                self.loop_stack.append(node)
                self.generic_visit(node)
                self.loop_stack.pop()
            
            def visit(self, node):
                if node == self.target_node and self.loop_stack:
                    self.in_loop = True
                self.generic_visit(node)
        
        finder = LoopFinder(node)
        finder.visit(tree)
        return finder.in_loop