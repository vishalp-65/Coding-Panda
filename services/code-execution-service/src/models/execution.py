from pydantic import BaseModel, Field
from typing import List, Optional
from enum import Enum
from datetime import datetime


class ExecutionStatus(str, Enum):
    SUCCESS = "success"
    RUNTIME_ERROR = "runtime_error"
    COMPILE_ERROR = "compile_error"
    TIME_LIMIT_EXCEEDED = "time_limit_exceeded"
    MEMORY_LIMIT_EXCEEDED = "memory_limit_exceeded"
    SECURITY_VIOLATION = "security_violation"
    INTERNAL_ERROR = "internal_error"


class Language(str, Enum):
    PYTHON = "python"
    JAVASCRIPT = "javascript"
    JAVA = "java"
    CPP = "cpp"
    GO = "go"
    RUST = "rust"


class TestCase(BaseModel):
    input: str = ""
    expected_output: str
    is_hidden: bool = False


class TestResult(BaseModel):
    passed: bool
    actual_output: str
    expected_output: str
    execution_time: float
    memory_used: int
    error_message: Optional[str] = None


class ExecutionRequest(BaseModel):
    code: str = Field(..., min_length=1, max_length=50000)
    language: Language
    test_cases: List[TestCase] = Field(..., min_items=1, max_items=100) # type: ignore
    time_limit: int = Field(default=5, ge=1, le=30)
    memory_limit: int = Field(default=128, ge=32, le=512)
    problem_id: Optional[str] = None
    user_id: Optional[str] = None


class ExecutionResult(BaseModel):
    status: ExecutionStatus
    output: str
    error: Optional[str] = None
    execution_time: float
    memory_used: int
    test_results: List[TestResult]
    total_tests: int
    passed_tests: int
    compilation_output: Optional[str] = None
    security_violations: List[str] = []
    created_at: datetime = Field(default_factory=datetime.utcnow)


class ExecutionMetrics(BaseModel):
    request_id: str
    user_id: Optional[str] = None
    language: Language
    code_length: int
    execution_time: float
    memory_used: int
    status: ExecutionStatus
    test_count: int
    passed_tests: int
    timestamp: datetime = Field(default_factory=datetime.utcnow)


class ResourceLimits(BaseModel):
    cpu_limit: str = "0.5"
    memory_limit: str = "128m"
    time_limit: int = 5
    network_disabled: bool = True
    read_only_filesystem: bool = True
    max_file_size: int = 1024 * 1024