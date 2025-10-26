import re
import logging
from typing import Optional, Tuple
from src.models.execution import Language

logger = logging.getLogger(__name__)


class CodeMergerService:
    """
    Service responsible for merging user-editable code with hidden infrastructure code.
    This service takes user's function implementation and combines it with the hidden
    boilerplate code to create a complete, executable program.
    """ 
   
    def merge_code(self, user_code: str, hidden_code: str, language: Language) -> str:
        """
        Merge user's editable code with hidden infrastructure code.
        
        Args:
            user_code: The user's function implementation
            hidden_code: The hidden boilerplate code with placeholder
            language: Programming language
            
        Returns:
            Complete executable code
        """
        try:
            # Find the placeholder in hidden code
            placeholder = "// USER_CODE_PLACEHOLDER"
            if language == Language.PYTHON:
                placeholder = "# USER_CODE_PLACEHOLDER"
            elif language == Language.RUST:
                placeholder = "// USER_CODE_PLACEHOLDER"
            
            if placeholder not in hidden_code:
                logger.error(f"Placeholder '{placeholder}' not found in hidden code for {language}")
                raise ValueError(f"Invalid hidden code template for {language}")
            
            # Clean and format user code based on language
            formatted_user_code = self._format_user_code(user_code, language)
            
            # Replace placeholder with user code
            merged_code = hidden_code.replace(placeholder, formatted_user_code)
            
            logger.info(f"Successfully merged code for {language}")
            return merged_code
            
        except Exception as e:
            logger.error(f"Failed to merge code for {language}: {str(e)}")
            raise
    
    def _format_user_code(self, user_code: str, language: Language) -> str:
        """
        Format user code according to language-specific requirements.
        
        Args:
            user_code: Raw user code
            language: Programming language
            
        Returns:
            Formatted user code
        """
        if not user_code or not user_code.strip():
            return self._get_default_implementation(language)
        
        # Remove any potential class wrapper if user accidentally included it
        cleaned_code = self._clean_user_code(user_code, language)
        
        # Ensure proper indentation
        if language == Language.PYTHON:
            return self._format_python_code(cleaned_code)
        elif language == Language.JAVA:
            return self._format_java_code(cleaned_code)
        elif language == Language.CPP:
            return self._format_cpp_code(cleaned_code)
        elif language == Language.JAVASCRIPT:
            return self._format_javascript_code(cleaned_code)
        elif language == Language.GO:
            return self._format_go_code(cleaned_code)
        elif language == Language.RUST:
            return self._format_rust_code(cleaned_code)
        
        return cleaned_code
    
    def _remove_class_wrapper(self, code: str, language: Language) -> str:
        """Remove class wrapper if user accidentally included it."""
        if language == Language.JAVA:
            # Remove "public class Solution {" and closing brace
            code = re.sub(r'public\s+class\s+\w+\s*\{', '', code)
            code = re.sub(r'\}\s*$', '', code.rstrip())
        elif language == Language.CPP:
            # Remove "class Solution {" and closing brace
            code = re.sub(r'class\s+\w+\s*\{', '', code)
            code = re.sub(r'\}\s*;?\s*$', '', code.rstrip())
        
        return code.strip()
    
    def _clean_user_code(self, code: str, language: Language) -> str:
        """Clean user code by removing class wrappers using string operations."""
        if language == Language.JAVA:
            # Remove "public class Solution {" 
            lines = code.split('\n')
            cleaned_lines = []
            skip_class_line = False
            
            for line in lines:
                stripped = line.strip()
                if 'public class' in stripped and '{' in stripped:
                    skip_class_line = True
                    continue
                elif stripped == '}' and skip_class_line:
                    # This is likely the closing brace of the class
                    continue
                else:
                    cleaned_lines.append(line)
            
            return '\n'.join(cleaned_lines).strip()
            
        elif language == Language.CPP:
            # Remove "class Solution {" and closing brace
            lines = code.split('\n')
            cleaned_lines = []
            skip_class_line = False
            
            for line in lines:
                stripped = line.strip()
                if 'class' in stripped and '{' in stripped and not stripped.startswith('//'):
                    skip_class_line = True
                    continue
                elif (stripped == '};' or stripped == '}') and skip_class_line:
                    # This is likely the closing brace of the class
                    continue
                else:
                    cleaned_lines.append(line)
            
            return '\n'.join(cleaned_lines).strip()
        
        return code.strip()
    
    def _format_python_code(self, code: str) -> str:
        """Format Python code with proper indentation."""
        # For Python, just return the code as-is since the template handles class structure
        # The user code should be a standalone function that gets inserted into a class
        return code.strip()
    
    def _format_java_code(self, code: str) -> str:
        """Format Java code with proper indentation."""
        # For Java, just return the code as-is since the template handles class structure
        # The user code should be a standalone method that gets inserted into a class
        return code.strip()
    
    def _format_cpp_code(self, code: str) -> str:
        """Format C++ code with proper indentation."""
        # For C++, just return the code as-is since the template handles class structure
        # The user code should be a standalone method that gets inserted into a class
        return code.strip()
    
    def _format_javascript_code(self, code: str) -> str:
        """Format JavaScript code."""
        return code.strip()
    
    def _format_go_code(self, code: str) -> str:
        """Format Go code."""
        return code.strip()
    
    def _format_rust_code(self, code: str) -> str:
        """Format Rust code."""
        return code.strip()
    
    def _get_default_implementation(self, language: Language) -> str:
        """Get default implementation when user code is empty."""
        if language == Language.PYTHON:
            return "    def solution(self):\n        pass"
        elif language == Language.JAVA:
            return "    public void solution() {\n        // TODO: Implement\n    }"
        elif language == Language.CPP:
            return "    void solution() {\n        // TODO: Implement\n    }"
        elif language == Language.JAVASCRIPT:
            return "function solution() {\n    // TODO: Implement\n}"
        elif language == Language.GO:
            return "func solution() {\n    // TODO: Implement\n}"
        elif language == Language.RUST:
            return "fn solution() {\n    // TODO: Implement\n}"
        
        return "// TODO: Implement"
    
    def extract_function_name(self, code: str, language: Language) -> Optional[str]:
        """
        Extract the main function name from user code.
        
        Args:
            code: User's code
            language: Programming language
            
        Returns:
            Function name if found, None otherwise
        """
        try:
            if language == Language.PYTHON:
                match = re.search(r'def\s+(\w+)\s*\(', code)
                return match.group(1) if match else None
            elif language == Language.JAVA:
                match = re.search(r'public\s+\w+\s+(\w+)\s*\(', code)
                return match.group(1) if match else None
            elif language == Language.CPP:
                match = re.search(r'\w+\s+(\w+)\s*\(', code)
                return match.group(1) if match else None
            elif language == Language.JAVASCRIPT:
                match = re.search(r'function\s+(\w+)\s*\(', code)
                return match.group(1) if match else None
            elif language == Language.GO:
                match = re.search(r'func\s+(\w+)\s*\(', code)
                return match.group(1) if match else None
            elif language == Language.RUST:
                match = re.search(r'fn\s+(\w+)\s*\(', code)
                return match.group(1) if match else None
                
        except Exception as e:
            logger.error(f"Failed to extract function name from {language} code: {str(e)}")
            
        return None
    
    def validate_user_code(self, code: str, language: Language) -> Tuple[bool, Optional[str]]:
        """
        Validate user's code for basic syntax and structure.
        
        Args:
            code: User's code to validate
            language: Programming language
            
        Returns:
            Tuple of (is_valid, error_message)
        """
        try:
            if not code or not code.strip():
                return False, "Code cannot be empty"
            
            # Check for basic function definition
            function_name = self.extract_function_name(code, language)
            if not function_name:
                return False, f"No valid function definition found for {language}"
            
            # Language-specific validations
            if language == Language.PYTHON:
                return self._validate_python_code(code)
            elif language == Language.JAVA:
                return self._validate_java_code(code)
            elif language == Language.CPP:
                return self._validate_cpp_code(code)
            elif language == Language.JAVASCRIPT:
                return self._validate_javascript_code(code)
            elif language == Language.GO:
                return self._validate_go_code(code)
            elif language == Language.RUST:
                return self._validate_rust_code(code)
            
            return True, None
            
        except Exception as e:
            return False, f"Validation error: {str(e)}"
    
    def _validate_python_code(self, code: str) -> Tuple[bool, Optional[str]]:
        """Validate Python code."""
        try:
            compile(code, '<string>', 'exec')
            return True, None
        except SyntaxError as e:
            return False, f"Python syntax error: {str(e)}"
    
    def _validate_java_code(self, code: str) -> Tuple[bool, Optional[str]]:
        """Validate Java code structure."""
        # Basic bracket matching
        if code.count('{') != code.count('}'):
            return False, "Mismatched curly braces"
        if code.count('(') != code.count(')'):
            return False, "Mismatched parentheses"
        return True, None
    
    def _validate_cpp_code(self, code: str) -> Tuple[bool, Optional[str]]:
        """Validate C++ code structure."""
        # Basic bracket matching
        if code.count('{') != code.count('}'):
            return False, "Mismatched curly braces"
        if code.count('(') != code.count(')'):
            return False, "Mismatched parentheses"
        return True, None
    
    def _validate_javascript_code(self, code: str) -> Tuple[bool, Optional[str]]:
        """Validate JavaScript code structure."""
        # Basic bracket matching
        if code.count('{') != code.count('}'):
            return False, "Mismatched curly braces"
        if code.count('(') != code.count(')'):
            return False, "Mismatched parentheses"
        return True, None
    
    def _validate_go_code(self, code: str) -> Tuple[bool, Optional[str]]:
        """Validate Go code structure."""
        # Basic bracket matching
        if code.count('{') != code.count('}'):
            return False, "Mismatched curly braces"
        if code.count('(') != code.count(')'):
            return False, "Mismatched parentheses"
        return True, None
    
    def _validate_rust_code(self, code: str) -> Tuple[bool, Optional[str]]:
        """Validate Rust code structure."""
        # Basic bracket matching
        if code.count('{') != code.count('}'):
            return False, "Mismatched curly braces"
        if code.count('(') != code.count(')'):
            return False, "Mismatched parentheses"
        return True, None