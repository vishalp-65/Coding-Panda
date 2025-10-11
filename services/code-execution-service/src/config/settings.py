from pydantic_settings import BaseSettings
from typing import Dict, Any, List
from pydantic import Field


class Settings(BaseSettings):
    """Optimized settings with minimal Docker images and enhanced security."""
    
    # Application settings
    app_name: str = "Code Execution Service"
    debug: bool = False
    
    # Docker settings
    docker_socket: str = "unix://var/run/docker.sock"
    execution_timeout: int = 30
    container_memory_limit: str = "128m"
    container_cpu_limit: str = "0.5"
    
    # Security settings
    max_code_length: int = 50000
    max_test_cases: int = 100
    allowed_file_extensions: List[str] = Field(
        default_factory=lambda: [".py", ".js", ".java", ".cpp", ".go", ".rs"]
    )
    
    # Rate limiting
    rate_limit_requests_per_minute: int = 60
    rate_limit_requests_per_hour: int = 500
    
    # Redis settings
    redis_host: str = "localhost"
    redis_port: int = 6379
    redis_db: int = 0
    redis_password: str = ""
    
    # Monitoring settings
    metrics_enabled: bool = True
    log_level: str = "INFO"
    
    # Performance settings
    max_concurrent_executions: int = 10
    container_warmup_enabled: bool = True
    
    # Language-specific configurations with optimized multi-stage images
    language_configs: Dict[str, Dict[str, Any]] = Field(default_factory=lambda: {
        "python": {
            "image": "code-exec/python:optimized",  # ~50MB optimized
            "compile_command": None,
            "run_command": "python3 -u /app/solution.py",  # -u for unbuffered
            "file_extension": ".py"
        },
        "javascript": {
            "image": "code-exec/node:optimized",  # ~180MB optimized
            "compile_command": None,
            "run_command": "node /app/solution.js",
            "file_extension": ".js"
        },
        "java": {
            # Optimized multi-stage: JDK builder for compilation, JRE executor (~170MB)
            "image": "code-exec/java:optimized",
            "builder_image": "code-exec/java-builder:optimized",
            "compile_command": "javac -d /app /app/Solution.java",
            "run_command": "java -Xmx96m -Xms32m -XX:+UseSerialGC -XX:MaxRAMPercentage=75 -XX:+UseContainerSupport -XX:TieredStopAtLevel=1 -cp /app Solution",
            "file_extension": ".java",
            "class_name": "Solution"
        },
        "cpp": {
            # Optimized multi-stage: GCC builder, minimal Alpine executor (~15MB)
            "image": "code-exec/cpp:optimized",
            "builder_image": "code-exec/cpp-builder:optimized",
            "compile_command": "g++ -O2 -o /app/solution /app/solution.cpp -std=c++17 -static",
            "run_command": "/app/solution",
            "file_extension": ".cpp"
        },
        "go": {
            # Optimized multi-stage: Go builder, scratch executor (~10MB)
            "image": "code-exec/go:optimized",
            "builder_image": "code-exec/go-builder:optimized",
            "compile_command": "go build -ldflags='-s -w' -o /app/solution /app/solution.go",
            "run_command": "/app/solution",
            "file_extension": ".go"
        },
        "rust": {
            # Optimized multi-stage: Rust builder, minimal Alpine executor (~20MB)
            "image": "code-exec/rust:optimized",
            "builder_image": "code-exec/rust-builder:optimized",
            "compile_command": "rustc --edition 2021 -C opt-level=2 -o /app/solution /app/solution.rs",
            "run_command": "/app/solution",
            "file_extension": ".rs"
        }
    })
    
    # Security whitelist for safe stdlib modules (Python example)
    python_safe_modules: List[str] = Field(default_factory=lambda: [
        'math', 'random', 'datetime', 'json', 'collections',
        'itertools', 'functools', 're', 'string', 'decimal'
    ])

    model_config = {"env_file": ".env", "extra": "ignore"}


settings = Settings()