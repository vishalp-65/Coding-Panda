"""
Code parsing and AST analysis service
"""
import ast
import logging
from typing import Dict, Any, List, Optional
import tree_sitter
from tree_sitter import Language, Parser

from ..models.analysis import ProgrammingLanguage, ComplexityMetrics

logger = logging.getLogger(__name__)


class CodeParser:
    """Code parser for multiple programming languages"""
    
    def __init__(self):
        self.parsers = {}
        self._init_parsers()
    
    def _init_parsers(self):
        """Initialize tree-sitter parsers for supported languages"""
        try:
            # Note: In a real implementation, you would need to build the language libraries
            # For now, we'll use Python's AST for Python code and basic analysis for others
            pass
        except Exception as e:
            logger.warning(f"Failed to initialize some parsers: {e}")
    
    def parse_python_code(self, code: str) -> Dict[str, Any]:
        """Parse Python code using AST"""
        try:
            tree = ast.parse(code)
            
            analysis = {
                "functions": [],
                "classes": [],
                "imports": [],
                "variables": [],
                "complexity_info": {}
            }
            
            for node in ast.walk(tree):
                if isinstance(node, ast.FunctionDef):
                    analysis["functions"].append({
                        "name": node.name,
                        "line": node.lineno,
                        "args": [arg.arg for arg in node.args.args],
                        "decorators": [d.id if isinstance(d, ast.Name) else str(d) for d in node.decorator_list]
                    })
                elif isinstance(node, ast.ClassDef):
                    analysis["classes"].append({
                        "name": node.name,
                        "line": node.lineno,
                        "bases": [base.id if isinstance(base, ast.Name) else str(base) for base in node.bases]
                    })
                elif isinstance(node, (ast.Import, ast.ImportFrom)):
                    if isinstance(node, ast.Import):
                        for alias in node.names:
                            analysis["imports"].append({
                                "module": alias.name,
                                "alias": alias.asname,
                                "line": node.lineno
                            })
                    else:  # ImportFrom
                        for alias in node.names:
                            analysis["imports"].append({
                                "module": node.module,
                                "name": alias.name,
                                "alias": alias.asname,
                                "line": node.lineno
                            })
                elif isinstance(node, ast.Assign):
                    for target in node.targets:
                        if isinstance(target, ast.Name):
                            analysis["variables"].append({
                                "name": target.id,
                                "line": node.lineno
                            })
            
            return analysis
            
        except SyntaxError as e:
            logger.error(f"Python syntax error: {e}")
            return {"error": f"Syntax error: {e}"}
        except Exception as e:
            logger.error(f"Failed to parse Python code: {e}")
            return {"error": f"Parse error: {e}"}
    
    def parse_javascript_code(self, code: str) -> Dict[str, Any]:
        """Parse JavaScript code (basic implementation)"""
        # This is a simplified implementation
        # In a real scenario, you would use tree-sitter-javascript
        
        analysis = {
            "functions": [],
            "variables": [],
            "imports": [],
            "exports": []
        }
        
        lines = code.split('\n')
        for i, line in enumerate(lines, 1):
            line = line.strip()
            
            # Detect function declarations
            if line.startswith('function ') or 'function(' in line:
                func_name = self._extract_function_name(line)
                if func_name:
                    analysis["functions"].append({
                        "name": func_name,
                        "line": i,
                        "type": "function"
                    })
            
            # Detect arrow functions
            elif '=>' in line and ('const ' in line or 'let ' in line or 'var ' in line):
                var_name = self._extract_variable_name(line)
                if var_name:
                    analysis["functions"].append({
                        "name": var_name,
                        "line": i,
                        "type": "arrow_function"
                    })
            
            # Detect imports
            elif line.startswith('import ') or line.startswith('const ') and 'require(' in line:
                analysis["imports"].append({
                    "line": i,
                    "statement": line
                })
            
            # Detect exports
            elif line.startswith('export ') or line.startswith('module.exports'):
                analysis["exports"].append({
                    "line": i,
                    "statement": line
                })
        
        return analysis
    
    def _extract_function_name(self, line: str) -> Optional[str]:
        """Extract function name from JavaScript function declaration"""
        try:
            if 'function ' in line:
                start = line.find('function ') + 9
                end = line.find('(', start)
                if end > start:
                    return line[start:end].strip()
        except Exception:
            pass
        return None
    
    def _extract_variable_name(self, line: str) -> Optional[str]:
        """Extract variable name from JavaScript variable declaration"""
        try:
            for keyword in ['const ', 'let ', 'var ']:
                if line.startswith(keyword):
                    start = len(keyword)
                    end = line.find('=', start)
                    if end > start:
                        return line[start:end].strip()
        except Exception:
            pass
        return None
    
    def parse_code(self, code: str, language: ProgrammingLanguage) -> Dict[str, Any]:
        """Parse code based on language"""
        try:
            if language == ProgrammingLanguage.PYTHON:
                return self.parse_python_code(code)
            elif language in [ProgrammingLanguage.JAVASCRIPT, ProgrammingLanguage.TYPESCRIPT]:
                return self.parse_javascript_code(code)
            else:
                # Basic analysis for other languages
                return self._basic_code_analysis(code, language)
                
        except Exception as e:
            logger.error(f"Failed to parse {language} code: {e}")
            return {"error": f"Parse error: {e}"}
    
    def _basic_code_analysis(self, code: str, language: ProgrammingLanguage) -> Dict[str, Any]:
        """Basic code analysis for unsupported languages"""
        lines = code.split('\n')
        
        return {
            "total_lines": len(lines),
            "non_empty_lines": len([line for line in lines if line.strip()]),
            "comment_lines": len([line for line in lines if line.strip().startswith(('//', '#', '/*', '*'))]),
            "language": language.value,
            "basic_analysis": True
        }


class ComplexityAnalyzer:
    """Code complexity analyzer"""
    
    def calculate_cyclomatic_complexity(self, code: str, language: ProgrammingLanguage) -> int:
        """Calculate cyclomatic complexity"""
        try:
            if language == ProgrammingLanguage.PYTHON:
                return self._python_cyclomatic_complexity(code)
            else:
                return self._generic_cyclomatic_complexity(code)
        except Exception as e:
            logger.error(f"Failed to calculate cyclomatic complexity: {e}")
            return 1
    
    def _python_cyclomatic_complexity(self, code: str) -> int:
        """Calculate cyclomatic complexity for Python code"""
        try:
            tree = ast.parse(code)
            complexity = 1  # Base complexity
            
            for node in ast.walk(tree):
                if isinstance(node, (ast.If, ast.While, ast.For, ast.AsyncFor)):
                    complexity += 1
                elif isinstance(node, ast.ExceptHandler):
                    complexity += 1
                elif isinstance(node, (ast.And, ast.Or)):
                    complexity += 1
                elif isinstance(node, ast.comprehension):
                    complexity += 1
            
            return complexity
            
        except Exception as e:
            logger.error(f"Failed to calculate Python cyclomatic complexity: {e}")
            return 1
    
    def _generic_cyclomatic_complexity(self, code: str) -> int:
        """Generic cyclomatic complexity calculation"""
        complexity = 1
        
        # Count decision points
        decision_keywords = ['if', 'else', 'elif', 'while', 'for', 'switch', 'case', 'catch', '&&', '||']
        
        for keyword in decision_keywords:
            complexity += code.lower().count(keyword)
        
        return max(1, complexity)
    
    def calculate_complexity_metrics(self, code: str, language: ProgrammingLanguage) -> ComplexityMetrics:
        """Calculate comprehensive complexity metrics"""
        lines = code.split('\n')
        total_lines = len(lines)
        non_empty_lines = len([line for line in lines if line.strip()])
        
        cyclomatic = self.calculate_cyclomatic_complexity(code, language)
        
        # Simplified cognitive complexity (similar to cyclomatic for now)
        cognitive = min(cyclomatic * 1.2, 100)
        
        # Maintainability index (simplified calculation)
        # Real formula: 171 - 5.2 * ln(Halstead Volume) - 0.23 * (Cyclomatic Complexity) - 16.2 * ln(Lines of Code)
        maintainability = max(0, min(100, 100 - (cyclomatic * 2) - (total_lines * 0.1)))
        
        return ComplexityMetrics(
            cyclomatic_complexity=cyclomatic,
            cognitive_complexity=int(cognitive),
            lines_of_code=total_lines,
            maintainability_index=maintainability,
            halstead_difficulty=None,  # Would require more complex analysis
            halstead_volume=None
        )