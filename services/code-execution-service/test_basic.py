#!/usr/bin/env python3

import sys
import os
sys.path.append(os.path.dirname(__file__))

from src.security.validator import SecurityValidator
from src.models.execution import ExecutionRequest, Language, TestCase

def test_basic_functionality():
    print("Testing basic functionality...")
    
    # Test security validator
    validator = SecurityValidator()
    
    # Test safe code
    safe_request = ExecutionRequest(
        code='print("hello world")',
        language=Language.PYTHON,
        test_cases=[TestCase(input='', expected_output='hello world')]
    )
    
    violations = validator.validate_code(safe_request)
    print(f"Safe code violations: {len(violations)}")
    assert len(violations) == 0, f"Safe code should have no violations, got: {violations}"
    
    # Test dangerous code
    dangerous_request = ExecutionRequest(
        code='import os; os.system("ls")',
        language=Language.PYTHON,
        test_cases=[TestCase(input='', expected_output='')]
    )
    
    violations = validator.validate_code(dangerous_request)
    print(f"Dangerous code violations: {len(violations)}")
    assert len(violations) > 0, "Dangerous code should have violations"
    
    print("✅ Basic functionality tests passed!")

if __name__ == "__main__":
    test_basic_functionality()